<!-- v1.0.0 -->

# Prefs System - LocalStorage Management

**Purpose**: Simple, type-safe localStorage wrapper with object-path addressing for persistent client-side preferences

**Source**: `reactium-sdk-core/src/browser/Prefs.ts:1-67`

---

## Architecture Overview

The Prefs system provides a lightweight localStorage abstraction with three core capabilities:

1. **Object-path addressing** - Access nested values with dot notation
2. **JSON serialization** - Automatic conversion to/from localStorage strings
3. **SSR-safe** - Window checks prevent server-side errors
4. **Type-safe** - Full TypeScript support with generics

**Key Characteristics**:
- **NOT reactive** - No automatic React re-renders (unlike ReactiumSyncState)
- **NOT cross-tab** - Changes in one tab don't sync to others
- **NOT validated** - No schema enforcement or TTL/expiration
- Singleton instance by default (`ar-prefs` key)
- Factory method available for custom storage keys

---

## Core API

### `Prefs.get(key?, defaultValue?)`

Retrieves preference value by object-path or entire preferences object.

**Signature**:
```typescript
get<T = any>(key?: Path, defaultValue?: T): T
```

**Source**: `reactium-sdk-core/src/browser/Prefs.ts:42-48`

**Examples**:
```javascript
// Get entire prefs object
const allPrefs = Reactium.Prefs.get();

// Get nested value with default
const sidebarStatus = Reactium.Prefs.get('admin.sidebar.status', 'expanded');

// Get complex object
const editorSize = Reactium.Prefs.get('content-editor-sidebar', { width: 320 });
```

**Real Usage**: `Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/Sidebar/index.js:37`
```javascript
const [status, setStatus] = useStatus(
    Reactium.Prefs.get('admin.sidebar.status', ENUMS.STATUS.EXPANDED),
);
```

---

### `Prefs.set(key, value)`

Sets preference value at object-path, automatically persisting to localStorage.

**Signature**:
```typescript
set<T = any>(key: Path, value: T): PrefsType
```

**Source**: `reactium-sdk-core/src/browser/Prefs.ts:57-64`

**Examples**:
```javascript
// Set simple value
Reactium.Prefs.set('theme', 'dark');

// Set nested value
Reactium.Prefs.set('admin.sidebar.status', 'collapsed');

// Set complex object
Reactium.Prefs.set('content-editor-sidebar', { width: 450, collapsed: false });
```

**Real Usage**: `Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/Content/Editor/index.js:351`
```javascript
const onResize = useCallback(() => {
    const container = refs.get('sidebarContainer');
    const size = state.get('sidebarSize');
    size.width = container.offsetWidth;

    Reactium.Prefs.set('content-editor-sidebar', size);
    state.set('sidebarSize', size);

    dispatch('resize', { detail: { size } });
}, []);
```

---

### `Prefs.clear(key?)`

Clears specific preference path or entire preferences object.

**Signature**:
```typescript
clear(key?: Path): PrefsType
```

**Source**: `reactium-sdk-core/src/browser/Prefs.ts:15-33`

**Examples**:
```javascript
// Clear all preferences
Reactium.Prefs.clear();

// Clear specific path
Reactium.Prefs.clear('admin.sidebar');
```

**Real Usage**: `Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/User/reactium-hooks.js:151`
```javascript
Reactium.Hook.register('user.before.logout', async () => {
    const { objectId } = Reactium.User.current();
    const prefs = Reactium.Prefs.get();

    // Save to server before clearing
    await Reactium.User.Pref.update({ objectId, ...prefs });

    Reactium.Prefs.clear();
}, Reactium.Enums.priority.lowest);
```

---

### `Prefs.create(storageKey)`

Factory method to create isolated Prefs instance with custom localStorage key.

**Signature**:
```typescript
create<PrefsType = object>(storageKey: string): PrefsClass<PrefsType>
```

**Source**: `reactium-sdk-core/src/browser/Prefs.ts:6-8`

**Use Cases**:
- Multi-tenancy (separate prefs per account)
- Plugin isolation (avoid conflicts)
- Testing (isolated test storage)

**Example**:
```javascript
// Create plugin-specific prefs
const MyPluginPrefs = Reactium.Prefs.create('my-plugin-prefs');

MyPluginPrefs.set('feature.enabled', true);
const enabled = MyPluginPrefs.get('feature.enabled');
```

---

## Common Patterns

### Pattern 1: Component State Persistence

Persist UI state across page reloads.

**Example**: `Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/reactium-ui/Dialog/index.js:32-57`
```javascript
const Dialog = ({ id, pref, ...props }) => {
    const stateRef = useRef({
        ...props,
        ...Prefs.get(pref), // Restore saved state
    });

    const [expanded, setExpanded] = useState(stateRef.current.expanded);

    const setPrefs = () => {
        const { expanded } = stateRef.current;
        if (pref) {
            Prefs.set(pref, { expanded }); // Persist on change
        }
    };

    // Called when state changes
    useEffect(setPrefs, [expanded]);
};
```

**Best Practice**: Initialize component state from Prefs, update Prefs on change.

---

### Pattern 2: User Preference Sync (Server/Client)

Synchronize localStorage preferences with server-side user preferences.

**Example**: `Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/User/reactium-hooks.js:140-154`
```javascript
// On logout: persist to server, clear localStorage
Reactium.Hook.register('user.before.logout', async () => {
    const { objectId } = Reactium.User.current();
    const prefs = Reactium.Prefs.get();

    // Flatten prefs for server storage
    const shallowPrefs = Object.keys(prefs).reduce((obj, key) => {
        obj[key] = op.get(prefs, key);
        return obj;
    }, {});

    // Save to server
    await Reactium.User.Pref.update({ objectId, ...shallowPrefs });

    // Clear local storage
    Reactium.Prefs.clear();
}, Reactium.Enums.priority.lowest);
```

**Best Practice**: Always sync to server before clearing localStorage to preserve user preferences across devices.

---

### Pattern 3: Sidebar/Panel Size Persistence

Common pattern for resizable UI elements.

**Example**: `Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/Content/Editor/index.js:755-758`
```javascript
const initialSidebarWidth = () => {
    const size = Reactium.Prefs.get('content-editor-sidebar', { width: 320 });
    const max = window.innerWidth > 990 ? window.innerWidth / 2 : window.innerWidth;

    size.width = Math.min(size.width, max);
    return size;
};

// On resize/drag end
const onDragEnd = useCallback((w) => {
    const size = state.get('sidebarSize');
    size.width = w;

    Reactium.Prefs.set('content-editor-sidebar', size);
    state.set('sidebarSize', size);
}, []);
```

**Best Practice**: Validate saved dimensions against current viewport to prevent off-screen panels.

---

## Integration Points

### With ReactiumSyncState (NOT Direct)

**Important**: Prefs does NOT extend ReactiumSyncState. Changes are NOT reactive.

**Pattern**: Manual synchronization required.

```javascript
// WRONG: Changes to Prefs won't trigger re-renders
const theme = Reactium.Prefs.get('theme');
// Component won't re-render when theme changes

// RIGHT: Use React state + Prefs
const [theme, setTheme] = useState(Reactium.Prefs.get('theme', 'light'));

const updateTheme = (newTheme) => {
    setTheme(newTheme);
    Reactium.Prefs.set('theme', newTheme);
};
```

---

### With User.Pref API (Server Sync)

**Pattern**: Synchronize client preferences with server-side user preferences.

**Hooks**:
- `user.before.logout` - Save Prefs to server, clear localStorage
- `user.after.login` - Restore Prefs from server (if implemented)

**API**: `Reactium.User.Pref.update({ objectId, ...prefs })`

**Use Case**: Cross-device preference sync, multi-session persistence

---

### With Hook System

Prefs itself doesn't emit hooks, but commonly used within hook callbacks.

**Example**: Clear preferences on app reset
```javascript
Reactium.Hook.register('app.reset', () => {
    Reactium.Prefs.clear();
}, Reactium.Enums.priority.highest);
```

---

## Best Practices

### 1. Namespace Preferences

Use object-path structure to avoid collisions.

```javascript
// GOOD: Namespaced
Reactium.Prefs.set('admin.sidebar.status', 'collapsed');
Reactium.Prefs.set('plugin.myPlugin.config.enabled', true);

// BAD: Flat structure
Reactium.Prefs.set('status', 'collapsed'); // Collision risk
```

---

### 2. Always Provide Defaults

Prevent undefined errors on first access.

```javascript
// GOOD
const status = Reactium.Prefs.get('admin.sidebar.status', 'expanded');

// BAD
const status = Reactium.Prefs.get('admin.sidebar.status'); // undefined on first run
```

---

### 3. Validate Restored Values

Saved preferences might be stale or invalid.

```javascript
const initialSize = () => {
    const saved = Reactium.Prefs.get('editor.size', { width: 320 });
    const max = window.innerWidth / 2;

    // Validate against current constraints
    return {
        width: Math.min(Math.max(saved.width, 200), max)
    };
};
```

---

### 4. Use create() for Plugin Isolation

Avoid conflicts with core or other plugins.

```javascript
// Plugin-specific instance
const MyPluginPrefs = Reactium.Prefs.create('my-plugin-v1');

MyPluginPrefs.set('config', { enabled: true });
```

---

### 5. Sync to Server Before Clearing

Preserve user preferences across sessions/devices.

```javascript
// Before logout, clear, or reset
const prefs = Reactium.Prefs.get();
await Reactium.User.Pref.update({ objectId, ...prefs });
Reactium.Prefs.clear();
```

---

## Common Gotchas

### 1. NOT Reactive

**Problem**: Prefs changes don't trigger React re-renders.

```javascript
// WRONG: Component won't update
const MyComponent = () => {
    const theme = Reactium.Prefs.get('theme');

    return <div className={theme}>Content</div>;
};

// RIGHT: Use React state
const MyComponent = () => {
    const [theme, setTheme] = useState(Reactium.Prefs.get('theme', 'light'));

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        Reactium.Prefs.set('theme', newTheme);
    };

    return <div className={theme}><button onClick={toggleTheme}>Toggle</button></div>;
};
```

---

### 2. NOT Cross-Tab Synchronized

**Problem**: Changes in one browser tab don't appear in others.

**Workaround**: Implement storage event listener manually.

```javascript
useEffect(() => {
    const handleStorageChange = (e) => {
        if (e.key === 'ar-prefs') {
            const newPrefs = JSON.parse(e.newValue || '{}');
            // Update local state
        }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

---

### 3. JSON Serialization Limits

**Problem**: Functions, Dates, RegExp, etc. don't serialize correctly.

```javascript
// WRONG: Function lost on serialization
Reactium.Prefs.set('callback', () => console.log('test'));

// RIGHT: Store serializable data only
Reactium.Prefs.set('config', { enabled: true, timeout: 5000 });
```

---

### 4. localStorage Size Limits

**Problem**: Most browsers limit localStorage to ~5-10MB per domain.

**Best Practice**: Store preferences, not data. Use IndexedDB for large datasets.

```javascript
// GOOD: Small config data
Reactium.Prefs.set('ui.theme', 'dark');

// BAD: Large data
Reactium.Prefs.set('data.cache', largeArray); // Use IndexedDB instead
```

---

### 5. SSR Window Check Bypassed

**Problem**: Server-side rendering errors if window is accessed outside Prefs methods.

```javascript
// WRONG: Direct localStorage access (SSR error)
const theme = localStorage.getItem('theme');

// RIGHT: Use Prefs (has SSR checks)
const theme = Reactium.Prefs.get('theme', 'light');
```

---

## Comparison with Other Storage Patterns

| Feature                  | Prefs            | ReactiumSyncState | Redux/MobX       | Context API      |
| ------------------------ | ---------------- | ----------------- | ---------------- | ---------------- |
| **Persistent**           | ✅ Yes           | ❌ No             | ❌ No            | ❌ No            |
| **Reactive**             | ❌ No            | ✅ Yes            | ✅ Yes           | ✅ Yes           |
| **Cross-Tab Sync**       | ❌ No (manual)   | ❌ No             | ❌ No (manual)   | ❌ No            |
| **Object-Path API**      | ✅ Yes           | ✅ Yes            | ❌ No            | ❌ No            |
| **SSR-Safe**             | ✅ Yes           | ✅ Yes            | ⚠️ Depends       | ✅ Yes           |
| **Type-Safe**            | ✅ TypeScript    | ✅ TypeScript     | ⚠️ Varies        | ⚠️ Varies        |
| **Auto Page Reload**     | ✅ Yes           | ❌ No             | ❌ No            | ❌ No            |
| **Server Sync Built-in** | ❌ No (manual)   | ❌ No             | ❌ No            | ❌ No            |
| **Use Case**             | User preferences | Component state   | Application state| Prop drilling    |

**Decision Matrix**:
- **Use Prefs when**: Need persistent, non-reactive preferences
- **Use ReactiumSyncState when**: Need reactive state within component tree
- **Use both**: Persist ReactiumSyncState to Prefs on change for best of both worlds

---

## TypeScript Usage

### Type-Safe Prefs Instance

```typescript
interface MyPrefs {
    theme: 'light' | 'dark';
    sidebar: {
        status: 'expanded' | 'collapsed';
        width: number;
    };
}

const TypedPrefs = Reactium.Prefs.create<MyPrefs>('my-app');

// Type-safe access
const theme = TypedPrefs.get('theme', 'light');
const width = TypedPrefs.get('sidebar.width', 320);

// Type errors caught
TypedPrefs.set('theme', 'blue'); // ❌ Error: "blue" not assignable to 'light' | 'dark'
```

---

### Generic Get with Type Inference

```typescript
interface EditorSize {
    width: number;
    collapsed: boolean;
}

// Type inferred from default value
const size = Reactium.Prefs.get<EditorSize>(
    'editor.size',
    { width: 320, collapsed: false }
);

// size.width is number (type-safe)
console.log(size.width + 100);
```

---

## Debugging

### Inspect Preferences

```javascript
// View all preferences
console.log(Reactium.Prefs.get());

// Direct localStorage access
console.log(localStorage.getItem('ar-prefs'));
```

---

### Track Preference Changes

```javascript
const original = Reactium.Prefs.set;
Reactium.Prefs.set = function(key, value) {
    console.log(`Prefs.set('${key}', ${JSON.stringify(value)})`);
    return original.call(this, key, value);
};
```

---

### Clear Corrupted Preferences

```javascript
// Nuclear option: clear and reload
Reactium.Prefs.clear();
window.location.reload();
```

---

## Source Reference Summary

- **Core Implementation**: `reactium-sdk-core/src/browser/Prefs.ts:1-67`
- **API Documentation**: `reactium-sdk-core/src/apiDocs/Prefs.js:1-42`
- **Export**: `reactium-sdk-core/src/browser/index.ts:5`

**Real-World Usage**:
- `Reactium-Admin-Plugins/.../Sidebar/index.js:37,114` - Sidebar status
- `Reactium-Admin-Plugins/.../Content/Editor/index.js:351,755` - Panel sizing
- `Reactium-Admin-Plugins/.../reactium-ui/Dialog/index.js:32-57` - Dialog state
- `Reactium-Admin-Plugins/.../User/reactium-hooks.js:144-151` - User pref sync

---

## Summary

**Prefs System** = Simple, type-safe localStorage wrapper with object-path addressing

**Key Strengths**:
- ✅ SSR-safe by default
- ✅ Object-path API (nested access)
- ✅ TypeScript support
- ✅ Factory method for isolation
- ✅ Automatic JSON serialization

**Key Limitations**:
- ❌ NOT reactive (manual React state sync required)
- ❌ NOT cross-tab synchronized (requires manual storage event handling)
- ❌ NO built-in validation/TTL/expiration
- ❌ NO automatic server sync (User.Pref integration is manual)

**When to Use**: Persistent user preferences, UI state across sessions, plugin configuration
**When NOT to Use**: Reactive application state (use ReactiumSyncState), large datasets (use IndexedDB), cross-tab coordination (add storage listener)
