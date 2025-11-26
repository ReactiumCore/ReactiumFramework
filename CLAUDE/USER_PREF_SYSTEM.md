<!-- v1.0.0 -->
# User Preference System Architecture

Complete documentation of server-side and client-side user preference persistence patterns in Reactium/Actinium.

---

## Overview

The **User.Pref** system provides persistent, server-backed user preference storage that syncs across devices and sessions. It complements the client-side `Prefs` system (localStorage-only) by persisting preferences to the Parse Server `_User` collection.

**Key Distinction**:
- **Prefs** (client): localStorage wrapper, local-only, not synced across devices
- **User.Pref** (server): Parse Server backed, synchronized across devices, requires authentication

---

## Architecture

### Server-Side Implementation

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/user.js:617-747`

#### Parse Server Schema

User preferences stored in `_User.pref` field as JSON object with object-path addressing:

```javascript
{
  objectId: "abc123",
  username: "john",
  pref: {
    theme: "dark",
    sidebar: {
      width: 250,
      collapsed: false
    },
    notifications: {
      email: true,
      push: false
    }
  }
}
```

#### Server-Side API Methods

**1. Actinium.User.Pref.update(params, options)**

**Source**: `lib/user.js:707-745`

Updates user preference fields using object-path syntax:

```javascript
// Server-side usage
await Actinium.User.Pref.update(
  {
    objectId: 'abc123',
    'sidebar.width': 300,           // Object path notation
    'theme': 'light'
  },
  { useMasterKey: true }
);
```

**Implementation Details**:
- Retrieves user via `User.retrieve()`
- Removes sensitive fields (objectId, username, email, fname, lname)
- Merges new preferences with existing `user.pref` object
- Supports object-path key notation (e.g., `sidebar.width` or comma-separated `sidebar,width`)
- Fires hooks: `user-before-pref-save`, `user-pref-save-response`
- Returns updated user object with merged preferences

**2. Actinium.User.Pref.delete(params, options)**

**Source**: `lib/user.js:645-679`

Deletes specific preference keys:

```javascript
await Actinium.User.Pref.delete(
  {
    objectId: 'abc123',
    keys: ['sidebar.collapsed', 'theme']
  },
  { useMasterKey: true }
);
```

**Implementation Details**:
- Accepts `keys` parameter as string or array
- Supports object-path key deletion
- Fires same hooks as update
- Returns updated user object

#### Cloud Functions

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-users/plugin.js:203-212, 280-283`

```javascript
// Registered cloud functions
Actinium.Cloud.define(PLUGIN.ID, 'user-pref-update', pref.update);
Actinium.Cloud.define(PLUGIN.ID, 'user-pref-delete', pref.delete);

// Cloud function implementation
const pref = {
    update: (req) => {
        const options = MasterOptions(req);
        return Actinium.User.Pref.update(req.params, options);
    },
    delete: (req) => {
        const options = MasterOptions(req);
        return Actinium.User.Pref.delete(req.params, options);
    },
};
```

**Note**: Both operations use `MasterOptions` for security - bypasses ACL restrictions.

---

### Client-Side SDK

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-user/sdk/index.js:501-557`

#### Client API Methods

**1. User.Pref.update(params)**

```javascript
// Client-side usage
const updatedUser = await Reactium.User.Pref.update({
  objectId: 'slertjt5wzb',
  'sidebar.width': 300,
  theme: 'dark'
});
```

**Implementation Details** (`index.js:521-528`):
- Fires `before-user-pref-update` hook
- Calls `user-pref-update` cloud function
- Fires `user-pref-update-response` hook
- Returns updated user object

**2. User.Pref.delete(params)**

```javascript
await Reactium.User.Pref.delete({
  objectId: 'slertjt5wzb',
  keys: ['sidebar.collapsed']
});
```

**Implementation Details** (`index.js:549-556`):
- Fires `before-user-pref-delete` hook
- Calls `user-pref-delete` cloud function
- Fires `user-pref-delete-response` hook

---

## Integration Pattern: Prefs ↔ User.Pref Sync

**Source**: `Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/User/reactium-hooks.js:140-172`

### Real-World Pattern: Logout Sync

**Save to Server Before Logout** (`reactium-hooks.js:140-154`):

```javascript
Reactium.Hook.register(
    'user.before.logout',
    async () => {
        const { objectId } = Reactium.User.current();
        const prefs = Reactium.Prefs.get();

        // Flatten all localStorage prefs
        const shallowPrefs = Object.keys(prefs).reduce((obj, key) => {
            obj[key] = op.get(prefs, key);
            return obj;
        }, {});

        // Sync to server
        await Reactium.User.Pref.update({ objectId, ...shallowPrefs });

        // Clear local storage
        Reactium.Prefs.clear();
    },
    Reactium.Enums.priority.lowest,
);
```

**Why This Pattern Works**:
- Captures all client-side preference changes before logout
- Ensures preferences persist across devices
- Clears localStorage to prevent stale data
- Uses `priority.lowest` to run after other logout hooks

### Real-World Pattern: Login Restore

**Restore from Server After Login** (`reactium-hooks.js:164-171`):

```javascript
Reactium.Hook.register(
    'user.auth',
    async (u) => {
        const prefs = op.get(u, 'pref', {}) || {};
        localStorage.setItem('ar-prefs', JSON.stringify(prefs));
    },
    Reactium.Enums.priority.lowest,
);
```

**Why This Pattern Works**:
- Populates localStorage with server-backed preferences
- User's preferences available immediately after login
- Works seamlessly with `Prefs.get()` API

---

## Lifecycle Integration

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOGIN SEQUENCE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User.auth(username, password)                                  │
│         │                                                       │
│         ├─→ Parse.User.logIn()                                 │
│         │                                                       │
│         ├─→ Hook: 'user.auth'                                  │
│         │      │                                                │
│         │      └─→ Load user.pref → localStorage               │
│         │                                                       │
│         └─→ Return user object                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                        LOGOUT SEQUENCE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User.logOut()                                                  │
│         │                                                       │
│         ├─→ Hook: 'user.before.logout'                         │
│         │      │                                                │
│         │      ├─→ Prefs.get() → flatten                       │
│         │      ├─→ User.Pref.update() → server                 │
│         │      └─→ Prefs.clear()                               │
│         │                                                       │
│         ├─→ Parse.User.logOut()                                │
│         │                                                       │
│         └─→ Hook: 'user.after.logout'                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hook System Integration

### Server-Side Hooks

**user-before-pref-save** (`lib/user.js:659-666, 725-732`):
```javascript
await Actinium.Hook.run(
    'user-before-pref-save',
    newPref,      // New preference object
    currentPref,  // Current preference object
    user,         // Parse.User object
    params,       // Request parameters
    options       // Parse options
);
```

**Use Case**: Validate preference changes, enforce schema, modify preferences before save

**user-pref-save-response** (`lib/user.js:670-677, 736-743`):
```javascript
await Actinium.Hook.run(
    'user-pref-save-response',
    newPref,
    currentPref,
    user,
    params,
    options
);
```

**Use Case**: Post-save actions, cache invalidation, notifications

### Client-Side Hooks

**before-user-pref-update** (`sdk/index.js:522`):
```javascript
await Hook.run('before-user-pref-update', params);
```

**user-pref-update-response** (`sdk/index.js:527`):
```javascript
await Hook.run('user-pref-update-response', response, params);
```

**before-user-pref-delete** (`sdk/index.js:550`):
```javascript
await Hook.run('before-user-pref-delete', params);
```

**user-pref-delete-response** (`sdk/index.js:555`):
```javascript
await Hook.run('user-pref-delete-response');
```

---

## Real-World Use Cases

### 1. Component State Persistence

```javascript
// In a component
const SidebarPanel = () => {
  const [width, setWidth] = useState(250);
  const user = Reactium.User.current();

  // Load from server on mount
  useEffect(() => {
    const serverWidth = op.get(user, 'pref.sidebar.width', 250);
    setWidth(serverWidth);
  }, []);

  // Save to server on change
  const handleResize = async (newWidth) => {
    setWidth(newWidth);

    // Immediate local save
    Reactium.Prefs.set('sidebar.width', newWidth);

    // Background server sync
    await Reactium.User.Pref.update({
      objectId: user.objectId,
      'sidebar.width': newWidth
    });
  };

  return <Panel width={width} onResize={handleResize} />;
};
```

### 2. Multi-Device Theme Sync

```javascript
// Theme switching with cross-device sync
const ThemeSwitcher = () => {
  const setTheme = async (theme) => {
    const user = Reactium.User.current();

    // Update local immediately
    Reactium.Prefs.set('theme', theme);
    document.body.className = theme;

    // Sync to server
    await Reactium.User.Pref.update({
      objectId: user.objectId,
      theme
    });
  };

  return (
    <button onClick={() => setTheme('dark')}>
      Dark Mode
    </button>
  );
};
```

### 3. Admin Dashboard Preferences

```javascript
// Complex nested preferences
const DashboardSettings = () => {
  const saveSettings = async (settings) => {
    const user = Reactium.User.current();

    await Reactium.User.Pref.update({
      objectId: user.objectId,
      'dashboard.layout': settings.layout,
      'dashboard.widgets': settings.widgets,
      'dashboard.notifications.email': settings.notifications.email,
      'dashboard.notifications.push': settings.notifications.push
    });
  };
};
```

---

## Best Practices

### ✅ DO

1. **Sync on Logout**: Always save local preferences before logout
   ```javascript
   Hook.register('user.before.logout', async () => {
     const prefs = Prefs.get();
     await User.Pref.update({ objectId, ...prefs });
   });
   ```

2. **Restore on Login**: Load server preferences to localStorage after authentication
   ```javascript
   Hook.register('user.auth', async (user) => {
     const prefs = op.get(user, 'pref', {});
     localStorage.setItem('ar-prefs', JSON.stringify(prefs));
   });
   ```

3. **Use Object-Path Keys**: Leverage nested preference structure
   ```javascript
   User.Pref.update({
     objectId,
     'ui.sidebar.width': 300,
     'ui.theme': 'dark'
   });
   ```

4. **Background Sync**: Don't block UI for preference saves
   ```javascript
   // Fire and forget (with error handling)
   User.Pref.update(params).catch(console.error);
   ```

5. **Validate Preferences**: Use hooks for schema validation
   ```javascript
   Hook.register('user-before-pref-save', (newPref, currentPref) => {
     if (newPref.theme && !['light', 'dark'].includes(newPref.theme)) {
       throw new Error('Invalid theme');
     }
   });
   ```

### ❌ DON'T

1. **Don't Mix Systems**: Keep preferences in one system
   ```javascript
   // BAD: Same preference in both systems
   Prefs.set('theme', 'dark');
   User.Pref.update({ theme: 'dark' }); // Redundant

   // GOOD: Use sync pattern
   Prefs.set('theme', 'dark');
   // Synced automatically on logout
   ```

2. **Don't Store Sensitive Data**: Use `User.Meta` for sensitive data
   ```javascript
   // BAD: Preferences are not encrypted
   User.Pref.update({ creditCard: '1234...' });

   // GOOD: Use meta for sensitive data
   User.Meta.update({ paymentInfo: encrypted });
   ```

3. **Don't Sync Too Frequently**: Debounce rapid changes
   ```javascript
   // BAD: Sync on every keystroke
   onChange={(e) => User.Pref.update({ draft: e.target.value })}

   // GOOD: Debounce or sync on blur
   const debouncedSync = debounce((val) =>
     User.Pref.update({ draft: val }), 1000
   );
   ```

4. **Don't Assume Immediate Sync**: Preferences are async
   ```javascript
   // BAD: Assuming immediate update
   await User.Pref.update({ theme: 'dark' });
   console.log(Prefs.get('theme')); // Still 'light'

   // GOOD: Update both systems
   Prefs.set('theme', 'dark');
   await User.Pref.update({ theme: 'dark' });
   ```

5. **Don't Ignore Error Handling**: Network can fail
   ```javascript
   // BAD: No error handling
   User.Pref.update(params);

   // GOOD: Handle failures
   try {
     await User.Pref.update(params);
   } catch (err) {
     console.error('Pref sync failed:', err);
     // Maybe retry or notify user
   }
   ```

---

## Common Gotchas

### 1. Object-Path Key Ambiguity

**Problem**: Comma in key name vs object-path separator

```javascript
// Server implementation uses both:
key.split(',').join('.')  // Converts comma to dot

// This is ambiguous:
User.Pref.update({ 'a,b,c': 123 });
// Becomes: { a: { b: { c: 123 } } }
```

**Solution**: Use dot notation consistently on client

### 2. Sensitive Field Filtering

**Problem**: Server strips objectId from update params

```javascript
// Server code (lib/user.js:713-715)
let fields = ['objectId', 'username', 'email', 'fname', 'lname'];
await Actinium.Hook.run('user-sensative-fields', fields, params, options);
fields.forEach(fld => op.del(params, fld));
```

**Solution**: Always include objectId for lookup, but don't expect it in preferences

### 3. Preference Not Immediately Available

**Problem**: `User.Pref.update()` is async, localStorage not updated automatically

```javascript
await User.Pref.update({ theme: 'dark' });
Prefs.get('theme'); // Still 'light' until next login
```

**Solution**: Update both systems manually

```javascript
Prefs.set('theme', 'dark');
await User.Pref.update({ objectId, theme: 'dark' });
```

### 4. MasterKey Required

**Problem**: User.Pref operations use MasterKey by default

```javascript
// Server implementation uses MasterOptions
const options = MasterOptions(req);
return Actinium.User.Pref.update(req.params, options);
```

**Implication**: Users can update their own preferences without explicit permission checks

### 5. No Built-in Conflict Resolution

**Problem**: Last write wins - no merge strategy

```javascript
// Device A
User.Pref.update({ theme: 'dark', sidebar: { width: 200 } });

// Device B (at same time)
User.Pref.update({ theme: 'light', sidebar: { collapsed: true } });

// Result: Second update overwrites entire object
```

**Solution**: Use specific object paths or implement custom merge logic via hooks

---

## Comparison with Related Systems

| Feature | Prefs | User.Pref | User.Meta |
|---------|-------|-----------|-----------|
| **Storage** | localStorage | Parse Server | Parse Server |
| **Sync** | No | Yes | Yes |
| **Auth Required** | No | Yes | Yes |
| **Use Case** | Local UI state | Cross-device prefs | App metadata |
| **Reactive** | No | No | No |
| **Permissions** | Public | User-scoped | User-scoped |

**When to Use Each**:
- **Prefs**: Anonymous users, local-only settings, no sync needed
- **User.Pref**: Authenticated users, cross-device settings, user experience preferences
- **User.Meta**: Application metadata, admin-controlled data, sensitive but non-preference data

---

## TypeScript Patterns

```typescript
interface UserPreferences {
  theme: 'light' | 'dark';
  sidebar: {
    width: number;
    collapsed: boolean;
  };
  notifications: {
    email: boolean;
    push: boolean;
  };
}

// Type-safe preference updates
const updateTheme = async (theme: UserPreferences['theme']) => {
  const user = Reactium.User.current();
  await Reactium.User.Pref.update({
    objectId: user.objectId,
    theme
  });
};

// Type-safe preference access
const getPreference = <K extends keyof UserPreferences>(
  key: K
): UserPreferences[K] | undefined => {
  const user = Reactium.User.current();
  return op.get(user, `pref.${key}`);
};
```

---

## Summary

The **User.Pref** system provides:
- ✅ Server-backed preference storage in Parse `_User` collection
- ✅ Object-path addressing for nested preferences
- ✅ Hook-driven extensibility for validation and side effects
- ✅ Integration pattern with client-side `Prefs` system
- ✅ Automatic sync on login/logout via hooks
- ✅ Cross-device preference synchronization

**Critical Pattern**: Always sync localStorage (`Prefs`) with server (`User.Pref`) during login/logout flow to maintain consistency across sessions and devices.
