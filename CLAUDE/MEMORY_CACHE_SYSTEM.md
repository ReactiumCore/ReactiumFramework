<!-- v1.0.0 -->

# MemoryCache System Architecture

**Object-path addressing with subscribe/notify pattern for hierarchical in-memory caching**

---

## Overview

The MemoryCache system provides a **subscription-based in-memory cache** with **object-path addressing** for hierarchical key structures. It wraps the `memory-cache` NPM package with a **reactive publish-subscribe model** and deep path subscriptions.

**Key Design Principles:**
- Object-path key addressing (`'user.settings.theme'` not just `'theme'`)
- Deep path subscriptions (subscribe to `'a.b'` notifies on `'a.b.c'` changes)
- TTL support with expiration callbacks
- Subscriber notifications on all operations (set/del/expire/clear/merge)
- Import/export/merge for cache state management
- Used by both Reactium (browser) and Actinium (server)

---

## Architecture

### Wrapper Pattern

MemoryCache **wraps** `memory-cache` NPM package with additional features:

1. **Core Cache Engine** - `memory-cache.Cache` for actual storage
2. **Subscriber Registry** - `{ [id]: handler }` for change notifications
3. **Path Subscriptions** - `{ [path]: { [id]: id } }` for hierarchical subscriptions

**Singleton Exports:**
- `Reactium.Cache` (browser) - Singleton MemoryCache instance
- `Actinium.Cache` (server) - Singleton MemoryCache instance

**Source Reference:** `reactium-sdk-core/src/core/MemoryCache.ts:1-357`

---

## Core API

### get(key?, defaultValue?)

**Retrieve value from cache**

```javascript
// Get all cache entries
const all = Reactium.Cache.get();
// { 'user': {...}, 'settings': {...} }

// Get single root key
const user = Reactium.Cache.get('user');

// Get nested path
const theme = Reactium.Cache.get('user.settings.theme', 'light');
// Returns defaultValue if key doesn't exist

// Object-path array syntax also supported
const theme = Reactium.Cache.get(['user', 'settings', 'theme']);
```

**Return Types:**
- No key: Object with all cache entries `{ [key]: value }`
- Root key: Value at that key
- Nested path: Value at nested path (uses `object-path` library)
- Missing key: `defaultValue` or `undefined`

**Source:** `MemoryCache.ts:198-217`

---

### put(key, value, time?, timeoutCallback?)

**Set value in cache with optional TTL**

```javascript
// Simple set
Reactium.Cache.put('user', { id: 1, name: 'John' });

// Nested path set
Reactium.Cache.put('user.settings.theme', 'dark');

// With TTL (milliseconds)
Reactium.Cache.put('session', { token: 'abc' }, 60000);  // 1 minute

// With expiration callback
Reactium.Cache.put('temp', 'data', 5000, (key, value) => {
    console.log(`${key} expired with value:`, value);
});
```

**Behavior:**
- Root key: Sets value directly
- Nested path: Gets root, merges nested path, sets root
- TTL: Automatically expires and removes after `time` milliseconds
- Subscribers: Notifies all subscribers of change

**Notifications:**
- `{ op: 'set', key, value }` - Immediate notification on put
- `{ op: 'expire', key }` - Notification on TTL expiration (if TTL set)

**Source:** `MemoryCache.ts:231-269`

---

### set(key, value, time?, timeoutCallback?)

**Alias for put()**

```javascript
Reactium.Cache.set('key', 'value');  // Same as put()
```

**Source:** `MemoryCache.ts:283`

---

### del(key, ...args)

**Delete value from cache**

```javascript
// Delete root key
Reactium.Cache.del('user');

// Delete nested path
Reactium.Cache.del('user.settings.theme');
```

**Behavior:**
- Root key: Deletes entire entry
- Nested path: Gets root, deletes nested path, updates root
- Subscribers: Notifies with `{ op: 'del', key }`

**Source:** `MemoryCache.ts:295-317`

---

### clear()

**Clear entire cache**

```javascript
Reactium.Cache.clear();
```

**Behavior:**
- Deletes all cache entries
- Notifies ALL subscribers with `{ op: 'clear' }`

**Source:** `MemoryCache.ts:166-172`

---

### subscribe(key, callback)

**Subscribe to cache changes at key path**

```javascript
// Subscribe to specific key
const unsubscribe = Reactium.Cache.subscribe('user.settings', (dispatch) => {
    console.log('Operation:', dispatch.op);     // 'set', 'del', 'expire', 'clear', 'merge'
    console.log('Key:', dispatch.key);          // Changed key path
    console.log('Value:', dispatch.value);      // New value (for 'set')
});

// Unsubscribe
unsubscribe();
```

**Dispatch Object:**
```typescript
{
    op: 'set' | 'del' | 'expire' | 'clear' | 'merge';
    key?: string;    // Path that changed (except 'clear')
    value?: any;     // New value (only for 'set')
}
```

**Deep Path Subscriptions:**

Subscribing to a path notifies on changes to that path AND all child paths:

```javascript
Reactium.Cache.subscribe('user', (dispatch) => {
    // Fires on:
    // Cache.put('user', {...})
    // Cache.put('user.settings', {...})
    // Cache.put('user.settings.theme', 'dark')
    // Cache.del('user.profile')
});

Reactium.Cache.subscribe('user.settings', (dispatch) => {
    // Fires on:
    // Cache.put('user.settings', {...})
    // Cache.put('user.settings.theme', 'dark')
    // But NOT Cache.put('user', {...}) or Cache.put('user.profile', {...})
});
```

**Subscription Lifecycle:**

1. Subscription creates UUID for subscriber
2. For each path segment, stores subscriber ID in `_subscribedPaths`
3. On change, traverses path segments to find all matching subscribers
4. Calls each subscriber with dispatch object
5. Unsubscribe removes subscriber from all path segments

**Source:** `MemoryCache.ts:114-139`

---

### merge(values, options?)

**Import/merge multiple cache entries**

```javascript
// Merge values
Reactium.Cache.merge({
    user: {
        value: { id: 1, name: 'John' },
        expire: 60000  // Optional TTL in milliseconds
    },
    settings: {
        value: { theme: 'dark' }
    }
});

// Skip duplicates (don't overwrite existing keys)
Reactium.Cache.merge({
    user: { value: { id: 2 } }
}, { skipDuplicates: true });
```

**Value Structure:**
```typescript
{
    [key: string]: {
        value: any;        // Cache value
        expire?: number;   // TTL in milliseconds (optional)
    }
}
```

**TTL Handling:**
- If `expire` is provided as relative milliseconds, converts to absolute timestamp
- Uses `dayjs` to calculate expiration time

**Notifications:**
- Fires `{ op: 'merge', obj }` for each merged key
- Subscribers notified for ALL merged keys

**Source:** `MemoryCache.ts:327-353`

---

## Properties

### size

**Get number of cache entries**

```javascript
const count = Reactium.Cache.size;
// Number of root-level keys
```

**Source:** `MemoryCache.ts:174-176`

---

### memsize

**Get memory size of cache (bytes)**

```javascript
const bytes = Reactium.Cache.memsize;
// undefined if not supported by underlying cache engine
```

**Source:** `MemoryCache.ts:178-180`

---

### keys

**Get array of all root-level keys**

```javascript
const keys = Reactium.Cache.keys;
// ['user', 'settings', 'session']
```

**Source:** `MemoryCache.ts:182-184`

---

## Static Methods

### MemoryCache.sanitizeKey(key)

**Normalize key to string format**

```javascript
MemoryCache.sanitizeKey('user.settings');     // 'user.settings'
MemoryCache.sanitizeKey(['user', 'settings']); // 'user.settings'
MemoryCache.sanitizeKey(123);                  // '123'
```

**Source:** `MemoryCache.ts:70-74`

---

### MemoryCache.denormalizeKey(key)

**Convert key to array format**

```javascript
MemoryCache.denormalizeKey('user.settings');     // ['user', 'settings']
MemoryCache.denormalizeKey(['user', 'settings']); // ['user', 'settings']
MemoryCache.denormalizeKey(123);                  // ['123']
```

**Source:** `MemoryCache.ts:76-81`

---

### MemoryCache.normalizeKey(key)

**Convert key to string format**

```javascript
MemoryCache.normalizeKey(['user', 'settings']); // 'user.settings'
MemoryCache.normalizeKey('user.settings');      // 'user.settings'
```

**Source:** `MemoryCache.ts:83-85`

---

### MemoryCache.getKeyRoot(key)

**Get root key from path**

```javascript
MemoryCache.getKeyRoot('user.settings.theme'); // 'user'
MemoryCache.getKeyRoot(['user', 'settings']);  // 'user'
```

**Source:** `MemoryCache.ts:87-90`

---

## Real-World Integration Examples

### Example 1: Actinium.Cache for Roles

**Role cache with TTL and automatic invalidation**

```javascript
// Cache roles on login (actinium-core/lib/roles.js)
const cacheRoles = async () => {
    const roles = await new Parse.Query(Parse.Role)
        .limit(1000000)
        .find({ useMasterKey: true });

    const decoratedRoles = {
        byName: {},
        byLevel: {},
        byObjectId: {}
    };

    for (const role of roles) {
        const name = role.get('name');
        const level = role.get('level');
        const objectId = role.id;

        decoratedRoles.byName[name] = role;
        decoratedRoles.byLevel[level] = role;
        decoratedRoles.byObjectId[objectId] = role;
    }

    Actinium.Cache.set('roles', decoratedRoles);
    return decoratedRoles;
};

// Retrieve from cache with fallback
const getRoles = async () => {
    let roles = Actinium.Cache.get('roles');
    if (!roles) {
        roles = await cacheRoles();
    }
    return roles;
};

// Invalidate on role changes
Actinium.Cloud.afterSave(Parse.Role, async () => {
    Actinium.Cache.del('roles');  // Clear cache, next request rebuilds
});
```

**Source Reference:** `actinium-core/lib/roles.js:66-159`

---

### Example 2: Actinium.Cache for ACL Targets

**Cache user/role lookups with object-path structure**

```javascript
// Cache ACL targets for performance (actinium-core/lib/utils/acl.js)
const AclTargets = async (targets = []) => {
    const users = [];
    const roles = [];

    for (const target of targets) {
        let cached = Actinium.Cache.get(`acl-targets.${target}`);

        if (!cached) {
            // Try user lookup
            let user = await new Parse.Query(Parse.User)
                .equalTo('username', target)
                .first({ useMasterKey: true });

            if (user) {
                cached = user;
                Actinium.Cache.set(`acl-targets.${target}`, user);
            } else {
                // Try role lookup
                let role = await new Parse.Query(Parse.Role)
                    .equalTo('name', target)
                    .first({ useMasterKey: true });

                if (role) {
                    cached = role;
                    Actinium.Cache.set(`acl-targets.${target}`, role);
                }
            }
        }

        if (cached) {
            if (cached.className === '_User') users.push(cached);
            if (cached.className === '_Role') roles.push(cached);
        }
    }

    return { users, roles };
};
```

**Source Reference:** `actinium-core/lib/utils/acl.js:83-130`

---

### Example 3: React Hook with Cache Subscription

**Reactive state synchronized with cache**

```javascript
import { useState, useEffect } from 'react';
import Reactium from 'reactium-core/sdk';

const useTheme = () => {
    const [theme, setTheme] = useState(
        Reactium.Cache.get('user.settings.theme', 'light')
    );

    useEffect(() => {
        // Subscribe to theme changes
        const unsubscribe = Reactium.Cache.subscribe('user.settings.theme', ({ op, value }) => {
            if (op === 'set') {
                setTheme(value);
            } else if (op === 'del' || op === 'clear') {
                setTheme('light');  // Reset to default
            }
        });

        return unsubscribe;
    }, []);

    const updateTheme = (newTheme) => {
        Reactium.Cache.put('user.settings.theme', newTheme);
        // Subscriber automatically updates state
    };

    return [theme, updateTheme];
};

// Usage
const App = () => {
    const [theme, setTheme] = useTheme();

    return (
        <div className={theme}>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                Toggle Theme
            </button>
        </div>
    );
};
```

---

### Example 4: Plugin State with TTL

**Temporary plugin data with expiration**

```javascript
// Store plugin state with 5-minute TTL
Actinium.Cache.put('plugins.MyPlugin', {
    initialized: true,
    lastSync: Date.now(),
    data: {...}
}, 300000, (key, value) => {
    // Expiration callback
    console.log('Plugin state expired, re-initializing...');
    initializePlugin();
});

// Check if plugin needs initialization
const needsInit = !Actinium.Cache.get('plugins.MyPlugin');
```

---

## Best Practices

### Key Naming Conventions

1. **Hierarchical Paths** - Use object-path structure for related data
   ```javascript
   // Good
   Cache.put('user.123.profile', {...});
   Cache.put('user.123.preferences', {...});

   // Bad (flat, hard to invalidate)
   Cache.put('user_123_profile', {...});
   Cache.put('user_123_preferences', {...});
   ```

2. **Namespace by Feature** - Prefix keys with feature/plugin name
   ```javascript
   Cache.put('search.index.Article', {...});
   Cache.put('search.results.latest', [...]);
   ```

3. **Consistent Pluralization** - Use plural for collections
   ```javascript
   Cache.put('users', [...]); // Collection
   Cache.put('user.123', {...}); // Single item
   ```

---

### Subscription Patterns

1. **Cleanup on Unmount** - Always unsubscribe in cleanup
   ```javascript
   useEffect(() => {
       const unsubscribe = Cache.subscribe('key', handler);
       return unsubscribe;  // Cleanup
   }, []);
   ```

2. **Deep vs Shallow Subscriptions** - Choose subscription depth carefully
   ```javascript
   // Shallow (only direct changes)
   Cache.subscribe('user.settings', handler);  // Fires on user.settings only

   // Deep (all child changes)
   Cache.subscribe('user', handler);  // Fires on user.*, user.settings.*, etc.
   ```

3. **Operation Filtering** - Handle specific operations only
   ```javascript
   Cache.subscribe('key', ({ op, value }) => {
       if (op === 'set') {
           // Handle set only
       }
   });
   ```

---

### TTL Strategy

1. **Short TTL for Dynamic Data** - User sessions, API responses (minutes)
2. **Long TTL for Static Data** - Configuration, types, roles (hours/days)
3. **No TTL for Permanent Cache** - Framework metadata, constants
4. **Expiration Callbacks for Cleanup** - Re-fetch or cleanup on expire

---

### Performance

1. **Cache Frequently Accessed Data** - Roles, settings, user profiles
2. **Invalidate on Change** - Use afterSave/afterDelete hooks
3. **Batch Invalidation** - Delete root key to invalidate all children
   ```javascript
   Cache.del('user.123');  // Invalidates user.123.*
   ```
4. **Subscriber Overhead** - Don't subscribe to root keys with high churn
   ```javascript
   // Bad (fires on every user change)
   Cache.subscribe('users', handler);

   // Good (specific user)
   Cache.subscribe('users.123', handler);
   ```

---

## Common Gotchas

### 1. **Nested Path Sets Merge, Not Replace**

**Issue:** Setting a nested path merges with existing root value

```javascript
Cache.put('user', { id: 1, name: 'John', age: 30 });
Cache.put('user.name', 'Jane');

// user is now { id: 1, name: 'Jane', age: 30 }
// NOT { name: 'Jane' }
```

**Impact:** Can accumulate stale data if not careful

**Solution:** Delete root key before setting if replacement needed

```javascript
Cache.del('user');
Cache.put('user', { name: 'Jane' });  // Full replacement
```

**Source:** `MemoryCache.ts:255-264`

---

### 2. **Subscriptions Fire on All Descendant Changes**

**Issue:** Subscribing to parent path fires for ALL child changes

```javascript
Cache.subscribe('user', handler);  // Subscribes to 'user' path

// ALL of these fire handler:
Cache.put('user', {...});
Cache.put('user.settings', {...});
Cache.put('user.settings.theme', 'dark');
Cache.put('user.profile.avatar', 'url');
```

**Impact:** Handler may fire more often than expected

**Solution:** Subscribe to specific path you care about

```javascript
Cache.subscribe('user.settings.theme', handler);  // Only theme changes
```

**Source:** `MemoryCache.ts:114-139`

---

### 3. **TTL Expiration Doesn't Trigger Subscriber Notifications for Value**

**Issue:** Expiration callback gets `(key, value)`, but subscribers only get `{ op: 'expire', key }`

```javascript
Cache.put('temp', 'data', 5000, (key, value) => {
    console.log('Expired value:', value);  // 'data'
});

Cache.subscribe('temp', ({ op, key, value }) => {
    if (op === 'expire') {
        console.log('Value:', value);  // undefined (not provided)
    }
});
```

**Impact:** Subscribers can't access expired value

**Workaround:** Store value before expiration if needed

**Source:** `MemoryCache.ts:246-252`

---

### 4. **Memory Cache Lost on Server Restart**

**Issue:** All cache data stored in memory only, lost on process restart

```javascript
Actinium.Cache.put('roles', {...});  // Lost on restart
```

**Impact:** Cache must be rebuilt on server start

**Solution:** Use `start` hook to rebuild critical cache

```javascript
Actinium.Hook.register('start', async () => {
    await rebuildRolesCache();
});
```

---

### 5. **merge() Converts Relative TTL to Absolute**

**Issue:** `merge()` adds current timestamp to `expire` value

```javascript
Cache.merge({
    key: {
        value: 'data',
        expire: 60000  // 60 seconds from NOW
    }
});

// Internally converts to:
// expire: Date.now() + 60000  // Absolute timestamp
```

**Impact:** Can't merge exported cache with original TTL values

**Solution:** Export without TTL or recalculate on import

**Source:** `MemoryCache.ts:336-340`

---

### 6. **No Built-In Serialization**

**Issue:** Cache values must be serializable if used with export/import

```javascript
// This works:
Cache.put('user', { id: 1 });

// This doesn't serialize:
Cache.put('func', () => console.log('hi'));

// Export fails:
JSON.stringify(Cache.get());  // Throws on functions/circular refs
```

**Impact:** Can't export/import cache with functions or Parse Objects

**Solution:** Serialize Parse Objects before caching

```javascript
Cache.put('user', Actinium.Utils.serialize(parseObject));
```

---

### 7. **Subscriber ID Collisions (Extremely Rare)**

**Issue:** Subscriber IDs are UUIDs, collision possible but astronomically unlikely

```javascript
const id = uuid();  // v4 UUID
```

**Impact:** If collision occurs, old subscriber would be overwritten

**Mitigation:** UUIDs have 122 bits of randomness (~5.3×10³⁶ possible values)

**Source:** `MemoryCache.ts:115`

---

## Integration Points

### Reactium.Cache (Browser)

- Singleton instance exported from `reactium-sdk-core/src/browser/Cache.ts`
- Used by routing system for route caching
- Used by Prefs system as backing store (though Prefs uses localStorage, not MemoryCache directly)

**See:** `/home/john/reactium-framework/CLAUDE/PREFS_SYSTEM.md`

---

### Actinium.Cache (Server)

- Singleton instance exported from `actinium-core/lib/cache.js`
- Used extensively for roles, settings, plugin state
- Referenced in 100+ locations across Actinium plugins

**Critical Usage:**
- `Actinium.Cache.get('roles')` - Role lookup by name/level/objectId
- `Actinium.Cache.get('acl-targets.{username}')` - User/role ACL targets
- `Actinium.Cache.get('plugins.{ID}')` - Plugin state

---

### Parse Server Integration

- NOT directly integrated with Parse Server cache
- Separate in-memory cache layer above Parse Server
- Used to cache Parse Query results, not Parse Server cache itself

---

## Performance Considerations

1. **Memory Usage** - Cache grows unbounded unless TTL used
2. **Subscriber Overhead** - Each subscription adds event listener overhead
3. **Path Traversal Cost** - Deep path subscriptions require traversing path segments
4. **No Eviction Policy** - No LRU/LFU eviction, manual deletion only
5. **Single-Threaded** - Node.js event loop, no concurrent access issues

**Memory Limits:**
- No hard limit, grows until system memory exhausted
- Use TTL or manual deletion to limit growth
- Monitor `Cache.memsize` if available

---

## Testing Strategies

### Test Basic Operations

```javascript
const cache = new MemoryCache();

cache.put('key', 'value');
assert.equal(cache.get('key'), 'value');

cache.put('nested.path', 'nested');
assert.equal(cache.get('nested.path'), 'nested');

cache.del('nested.path');
assert.equal(cache.get('nested.path'), undefined);

cache.clear();
assert.equal(cache.size, 0);
```

---

### Test Subscriptions

```javascript
let notified = false;
const unsubscribe = cache.subscribe('key', ({ op }) => {
    if (op === 'set') notified = true;
});

cache.put('key', 'value');
assert(notified);

unsubscribe();
notified = false;
cache.put('key', 'value2');
assert(!notified);  // Unsubscribed
```

---

### Test TTL Expiration

```javascript
let expired = false;
cache.put('temp', 'data', 100, () => {
    expired = true;
});

await new Promise(resolve => setTimeout(resolve, 150));
assert(expired);
assert.equal(cache.get('temp'), undefined);
```

---

### Test Deep Path Subscriptions

```javascript
let count = 0;
cache.subscribe('user', () => count++);

cache.put('user', {});           // count = 1
cache.put('user.settings', {});  // count = 2
cache.put('user.settings.theme', 'dark'); // count = 3

assert.equal(count, 3);
```

---

## Comparison with Alternatives

| Feature | MemoryCache | localStorage | Redis | Parse Server Cache |
|---------|------------|--------------|-------|-------------------|
| **Server-Side** | ✓ | ✗ | ✓ | ✓ |
| **Browser-Side** | ✓ | ✓ | ✗ | ✗ |
| **Subscriptions** | ✓ | ✗ (storage event) | ✓ (pub/sub) | ✗ |
| **Object Paths** | ✓ | ✗ | ✗ | ✗ |
| **TTL** | ✓ | ✗ | ✓ | ✓ |
| **Persistence** | ✗ | ✓ | ✓ | ✓ |
| **Multi-Process** | ✗ | ✗ | ✓ | ✓ |

**When to Use MemoryCache:**
- Single-process caching (dev, small deployments)
- Reactive cache subscriptions needed
- Object-path addressing preferred
- Browser or server-side

**When to Use Redis:**
- Multi-process/multi-server deployments
- Cache persistence required
- Advanced eviction policies needed
- Very large cache sizes

---

## Summary

The MemoryCache system provides **reactive in-memory caching** with hierarchical subscriptions:

1. **Object-Path Addressing** - Nested key structures (`'user.settings.theme'`)
2. **Deep Path Subscriptions** - Subscribe to parent, get notified on children
3. **TTL Support** - Automatic expiration with callbacks
4. **Publish-Subscribe** - Reactive notifications on all operations
5. **Universal** - Same API browser and server-side

**Critical for:** Performance optimization, reactive state management, role/settings caching, temporary data storage

**Not suitable for:** Multi-process caching, persistence, large datasets (>1GB), cross-server communication
