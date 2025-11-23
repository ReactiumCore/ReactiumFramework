<!-- v1.0.0 -->

# Registry System Architecture

## Overview

The **Registry** is the foundational pattern for managing ordered, priority-based collections of items in Reactium/Actinium. While not used by all framework systems (Hook, Component, and Zone have specialized implementations), Registry provides a reusable, battle-tested pattern for plugin-based extensibility.

**Key Capabilities:**
- Priority-based ordering (via `order` property)
- Protection (prevent unregistration)
- Banning (prevent registration)
- Subscription notifications
- Two operational modes (CLEAN vs HISTORY)
- Deep property access via object-path
- Type-safe TypeScript implementation

## Source Reference

**Implementation:** `reactium-sdk-core/src/core/Registry.ts:93-596`

**Core Exports:**
```typescript
export class Registry<ItemT extends object = object>
export const registryFactory = <ItemT>(name, idField, mode) => new Registry<ItemT>()
export const create = registryFactory  // Alias
```

## When Registry Is (and Isn't) Used

### ✅ Framework Systems Using Registry

1. **Server Middleware** (`reactium-sdk-core/src/core/Server/index.ts:5`)
   ```javascript
   Server.Middleware = registryFactory('ExpressMiddleware', 'name', Registry.MODES.CLEAN);
   ```

2. **Routing System** (`Reactium-Core-Plugins/.../routing/index.js:46-50`)
   ```javascript
   routesRegistry = new Registry('Routing', 'id', Registry.MODES.CLEAN);
   routeListeners = new Registry('RoutingListeners', 'id', Registry.MODES.CLEAN);
   ```

3. **Webpack Configuration** (`Reactium-Core-Plugins/.../webpack.sdk.js:51-64`)
   ```javascript
   this.ignores = registryFactory('ignores', 'id', Registry.MODES.CLEAN);
   this.externals = registryFactory('externals', 'id', Registry.MODES.CLEAN);
   this.rules = registryFactory('rules', 'id', Registry.MODES.CLEAN);
   this.plugins = registryFactory('plugins', 'id', Registry.MODES.CLEAN);
   ```

4. **Gulp Tasks** (`Reactium-Core-Plugins/.../gulp.bootup.js:46`)
   ```javascript
   const GulpRegistry = registryFactory('GulpTasks', 'name', Registry.MODES.CLEAN);
   ```

5. **Babel Configuration** (`Reactium-Core-Plugins/.../babel.config.js:55-123`)
   ```javascript
   ReactiumBabel.ModuleAliases = registryFactory('BabelModuleAliases', 'id', Registry.MODES.CLEAN);
   ReactiumBabel.Presets = registryFactory('BabelPresets', 'id', Registry.MODES.CLEAN);
   ReactiumBabel.Plugins = registryFactory('BabelPlugins', 'id', Registry.MODES.CLEAN);
   ```

6. **Server Rendering** (`Reactium-Core-Plugins/.../server/renderer/index.mjs:254-279`)
   ```javascript
   Server.AppHeaders = registryFactory('AppHeaders', 'key', Registry.MODES.CLEAN);
   Server.AppScripts = registryFactory('AppScripts', 'path', Registry.MODES.CLEAN);
   Server.AppStyleSheets = registryFactory('AppStyleSheets', 'path', Registry.MODES.CLEAN);
   Server.AppBindings = registryFactory('AppBindings', 'name', Registry.MODES.CLEAN);
   Server.AppGlobals = registryFactory('AppGlobals', 'name', Registry.MODES.CLEAN);
   ```

### ❌ Systems Using Custom Implementations

1. **Hook System** - Uses custom `HookActions` data structure (`reactium-sdk-core/src/core/Hook.ts:82`)
   - Manages sync/async hooks separately
   - Domain-based namespacing
   - ActionSequence integration

2. **Component Registry** - Uses `ReactiumSyncState` (`reactium-sdk-core/src/browser/RegisteredComponents.ts:18`)
   - Reactive updates for UI components
   - Simpler API (no ordering/protection needed)

3. **Zone System** - Uses custom `Zones` class (`reactium-sdk-core/src/browser/Zones.ts:158`)
   - Complex filter/mapper/sorter pipeline
   - Multi-zone subscriptions
   - Component-specific features

4. **Handle System** - Uses plain object store with Handle instances
   - Different lifecycle (state containers, not registrations)

## Registry Modes

### CLEAN Mode (Recommended Default)

**Behavior:** Immediately removes items from memory on unregister/ban
**Use when:** Memory efficiency matters, history not needed
**Default for:** All Reactium Core registries

```typescript
const registry = registryFactory('MyRegistry', 'id', Registry.MODES.CLEAN);

registry.register({ id: 'item1', order: 100 });
registry.unregister('item1');

// Item is GONE from memory
registry.isRegistered('item1'); // false
registry.registered;            // [] (empty)
```

**Auto-cleanup triggers:**
- `unregister(id)` - calls `cleanup(id)` immediately
- `ban(id)` - calls `cleanup(id)` immediately
- `register(id)` with duplicate ID - calls `cleanup(id)` first

### HISTORY Mode

**Behavior:** Keeps all registrations in memory, marks as unregistered
**Use when:** You need audit trails, undo capability, or historical tracking
**Default for:** Actinium registries (backwards compatibility)

```typescript
const registry = registryFactory('MyRegistry', 'id', Registry.MODES.HISTORY);

registry.register({ id: 'item1', order: 100 });
registry.unregister('item1');

// Item still in memory
registry.isRegistered('item1');   // true (historically registered)
registry.isUnRegistered('item1'); // true (marked as unregistered)
registry.registered;              // [{ id: 'item1', ... }]
registry.list;                    // [] (filtered out of active list)
```

**Memory implications:** Grows unbounded unless you manually call `cleanup(id)` or `flush()`

## Core API

### Constructor & Factory

```typescript
// Direct instantiation
const registry = new Registry<ItemType>('MyRegistry', 'id', Registry.MODES.CLEAN);

// Factory pattern (recommended)
const registry = registryFactory<ItemType>('MyRegistry', 'id', Registry.MODES.CLEAN);

// Minimal (defaults: idField='id', mode=CLEAN)
const registry = registryFactory('MyRegistry');
```

### Registration

```typescript
// With explicit ID
registry.register('item-id', { name: 'My Item', order: 100 });

// With ID in object (must match idField)
registry.register({ id: 'item-id', name: 'My Item', order: 100 });

// Auto-generated ID (not recommended - hard to reference later)
registry.register({ name: 'My Item', order: 100 });
```

**Order property:** Lower numbers execute/render FIRST (default: 100)

### Retrieval

```typescript
// Get full item
const item = registry.get('item-id');

// Deep path access (via object-path)
const value = registry.get('item-id.config.apiKey');
const value = registry.get(['item-id', 'config', 'apiKey']);

// With default value
const value = registry.get('item-id.config.missing', 'default-value');

// Get all active items (ordered by 'order' property)
const items = registry.list;

// Get all items indexed by ID
const itemsById = registry.listById;
```

### Unregistration

```typescript
// Remove from active list
registry.unregister('item-id');

// Check status
registry.isRegistered('item-id');   // true (in HISTORY mode) / false (in CLEAN mode)
registry.isUnRegistered('item-id'); // true
```

### Protection (Prevent Unregistration)

```typescript
// Protect critical items
registry.protect('core-item-id');

// Attempt to unregister (silently ignored)
registry.unregister('core-item-id');
registry.get('core-item-id'); // Still present

// Remove protection
registry.unprotect('core-item-id');
registry.unregister('core-item-id'); // Now works
```

**Use case:** Framework core items that plugins shouldn't remove

### Banning (Prevent Registration)

```typescript
// Ban unwanted plugin registrations preemptively
registry.ban('unwanted-plugin-id');

// Attempt to register (throws error)
registry.register({ id: 'unwanted-plugin-id', ... }); // Error: unable to register banned item

// Remove ban
registry.unban('unwanted-plugin-id');
```

**Use case:** Disable problematic plugins without modifying their code

### Notifications (Pub/Sub)

```typescript
import { NotificationTypes } from '@atomic-reactor/reactium-sdk-core';

const unsubscribe = registry.subscribe((registry, notification) => {
    console.log(notification.type); // 'register', 'unregister', 'protect', etc.
    console.log(notification.id);   // Item ID
    console.log(notification.data); // Item data (on register)
}, 'subscriber-id');

// Cleanup
unsubscribe();

// Or by ID
registry.unsubscribe('subscriber-id');

// Remove all
registry.unsubscribeAll();
```

**Notification Types:**
- `REGISTER` - Item added
- `UNREGISTER` - Item removed
- `PROTECT` - Item protected
- `UNPROTECT` - Protection removed
- `BAN` - Item banned
- `UNBAN` - Ban removed
- `CLEANUP` - Item purged from memory
- `FLUSH` - Registry cleared

### Cleanup & Flush

```typescript
// Remove specific item from memory (HISTORY mode only - automatic in CLEAN)
registry.cleanup('item-id');

// Clear everything (resets to empty state)
registry.flush();
```

## Real-World Usage Patterns

### Pattern 1: Route Registration

```javascript
// Reactium-Core-Plugins/.../routing/index.js:46-431

class RoutingFactory {
    routesRegistry = new Registry('Routing', 'id', Registry.MODES.CLEAN);

    async register(route = {}, update = true) {
        if (!route.id) route.id = uuid();
        if (!route.order) route.order = 0;

        // Hook allows plugins to modify route before registration
        await Hook.run('register-route', route);

        this.routesRegistry.register(route.id, route);
        if (update) this._update();
        return route.id;
    }

    get routes() {
        // Registry handles ordering automatically
        return _.sortBy(
            _.sortBy(this.routesRegistry.list, 'path').reverse(),
            'order'
        );
    }
}
```

**Key insights:**
- Registry handles ordering, but additional sorting may be needed
- Hooks integrate at registration time for extensibility
- CLEAN mode prevents memory leaks from dynamic routes

### Pattern 2: Webpack Plugin Registration

```javascript
// Reactium-Core-Plugins/.../webpack.sdk.js:61-64

this.plugins = registryFactory('plugins', 'id', Registry.MODES.CLEAN);

addPlugin(id, plugin, order = Enums.priority.neutral) {
    this.plugins.register({
        id,
        plugin,  // Actual webpack plugin instance
        order,
    });
}

get webpackPlugins() {
    return this.plugins.list.map(({ plugin }) => plugin);
}
```

**Key insights:**
- Registry stores metadata (id, order) alongside actual objects
- Getter extracts only the needed values for webpack config
- Priority system allows framework/plugin coordination

### Pattern 3: Middleware Registration

```javascript
// reactium-sdk-core/src/core/Server/index.ts:4-10

export const Server = {
    Middleware: registryFactory('ExpressMiddleware', 'name', Registry.MODES.CLEAN),
};

// Usage in application:
Server.Middleware.register({
    name: 'cors-middleware',
    order: Enums.priority.highest,
    middleware: (req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        next();
    },
});

// Later, in Express setup:
Server.Middleware.list.forEach(({ middleware }) => {
    app.use(middleware);
});
```

**Key insights:**
- 'name' as idField (semantic and unique)
- CLEAN mode for server restarts
- Priority controls middleware execution order

## Best Practices

### ✅ DO

1. **Use CLEAN mode by default**
   ```javascript
   registryFactory('MyRegistry', 'id', Registry.MODES.CLEAN);
   ```

2. **Include order property explicitly**
   ```javascript
   registry.register({ id: 'item', order: Enums.priority.neutral, ... });
   ```

3. **Use semantic idField when appropriate**
   ```javascript
   registryFactory('Middleware', 'name', Registry.MODES.CLEAN); // 'name' is more intuitive
   ```

4. **Protect framework core items**
   ```javascript
   registry.register({ id: 'core-feature', ... });
   registry.protect('core-feature');
   ```

5. **Subscribe for reactive updates (if needed)**
   ```javascript
   const unsub = registry.subscribe((reg, notification) => {
       if (notification.type === 'register') {
           updateUI();
       }
   });
   ```

6. **Use TypeScript generics for type safety**
   ```typescript
   interface MyItem {
       id: string;
       name: string;
       order: number;
   }
   const registry = registryFactory<MyItem>('MyRegistry');
   ```

### ❌ DON'T

1. **Don't use HISTORY mode without reason**
   - Memory grows unbounded
   - Most use cases don't need it

2. **Don't forget order property**
   - Defaults to 100 (may not be desired)
   - Explicit is better than implicit

3. **Don't rely on auto-generated IDs**
   - Hard to reference later
   - Not deterministic across restarts

4. **Don't mutate registry internals**
   ```javascript
   // BAD
   registry.__registered.push(item);

   // GOOD
   registry.register(item);
   ```

5. **Don't assume registration order = execution order**
   - Use `order` property explicitly
   - Lower numbers = higher priority (counterintuitive)

6. **Don't use Registry for state management**
   - Use Handle for reactive state
   - Use ReactiumSyncState for component state
   - Registry is for extensibility, not data

## Common Gotchas

### 1. Priority Direction (Counterintuitive!)

```javascript
// WRONG ASSUMPTION
registry.register({ id: 'high', order: 1000 }); // Actually runs LAST
registry.register({ id: 'low', order: -1000 }); // Actually runs FIRST

// CORRECT
registry.register({ id: 'first', order: Enums.priority.highest }); // -1000
registry.register({ id: 'last', order: Enums.priority.lowest });   // 1000
```

**Lower numbers = HIGHER priority = executes earlier**

### 2. CLEAN Mode Cleans on Register

```javascript
const registry = registryFactory('Test', 'id', Registry.MODES.CLEAN);

registry.register({ id: 'item', version: 1 });
registry.register({ id: 'item', version: 2 }); // Automatically cleans version 1

// Only version 2 exists in memory
```

**This is a feature, not a bug** - prevents duplicate registrations

### 3. Protection vs Replacement

```javascript
registry.register({ id: 'item', version: 1 });
registry.protect('item');

// THIS THROWS ERROR
registry.register({ id: 'item', version: 2 }); // Error: unable to replace protected item

// You must unprotect first
registry.unprotect('item');
registry.register({ id: 'item', version: 2 }); // Now works
```

**Protection blocks replacement**, not just unregistration

### 4. Ban Before Registration

```javascript
// Banning AFTER registration doesn't remove the item
registry.register({ id: 'item', ... });
registry.ban('item'); // Item still in memory (but list excludes it)

// Ban BEFORE to prevent registration
registry.ban('unwanted-plugin');
// Now plugin can't register even if it tries
```

**Ban is preemptive**, not retroactive (unless in CLEAN mode)

### 5. Deep Path Access Returns Undefined

```javascript
registry.register({ id: 'item', config: { api: { key: 'secret' } } });

const key = registry.get('item.config.api.key'); // 'secret'
const missing = registry.get('item.config.missing.path'); // undefined (no error)

// Use defaults for safety
const value = registry.get('item.config.missing.path', 'default-value');
```

**No errors on missing paths** - returns `undefined` or default value

### 6. listById vs list

```javascript
// listById returns OBJECT (for O(1) lookup)
const byId = registry.listById; // { 'item-1': {...}, 'item-2': {...} }

// list returns ARRAY (for iteration)
const arr = registry.list; // [ {...}, {...} ]

// Both exclude unregistered/banned items
// Both are sorted by 'order' property
```

**Choose based on access pattern** - object for lookup, array for iteration

## When to Create Custom Registry

Registry is overkill if you just need:
- **Simple key-value store** → Use plain object or Map
- **Reactive state** → Use Handle or ReactiumSyncState
- **Component rendering** → Use Zone system
- **Event hooks** → Use Hook system

Create custom Registry when you need:
- ✅ Priority-based ordering
- ✅ Protection/banning mechanisms
- ✅ Subscription notifications
- ✅ Plugin extensibility
- ✅ Memory management (CLEAN mode)

## Testing Your Registry

```typescript
// reactium-sdk-core/test/Registry.test.ts - comprehensive test suite

describe('MyRegistryUsage', () => {
    let registry: Registry;

    beforeEach(() => {
        registry = registryFactory('Test', 'id', Registry.MODES.CLEAN);
    });

    test('registers and retrieves items', () => {
        registry.register({ id: 'test', data: 'value', order: 100 });
        expect(registry.get('test')).toEqual({ id: 'test', data: 'value', order: 100 });
    });

    test('respects protection', () => {
        registry.register({ id: 'protected', data: 'value' });
        registry.protect('protected');

        registry.unregister('protected');
        expect(registry.get('protected')).toBeDefined(); // Still there
    });

    test('enforces banning', () => {
        registry.ban('banned');
        expect(() => registry.register({ id: 'banned', data: 'value' }))
            .toThrow('unable to register banned item');
    });
});
```

## Related Documentation

- **Hook System:** `CLAUDEDB/HOOKS_DEEP_DIVE.md` - Custom implementation, not using Registry
- **Zone System:** `CLAUDEDB/ZONE_SYSTEM.md` - Custom implementation with filters/mappers/sorters
- **Component Registry:** `CLAUDEDB/BROWSER_SDK_HOOKS_UTILITIES.md` - Uses ReactiumSyncState
- **Priority Enum:** `CLAUDE/FRAMEWORK_GOTCHAS.md` - Use `.neutral` not `.normal`
- **Routing System:** `CLAUDEDB/ROUTING_DEEP_DIVE.md` - Real-world Registry usage
- **ReactiumWebpack:** `CLAUDEDB/REACTIUM_WEBPACK.md` - Multiple Registry instances for webpack config

## Summary

**Registry is the Swiss Army knife for plugin extensibility** - when you need ordered, managed collections that plugins can extend, protect, or ban. It's not the only pattern in Reactium (Hook, Zone, Component all use different approaches), but it's the foundation for build system, middleware, and routing extensibility.

**Mental model:** Think of Registry as a priority queue with protection/banning superpowers and optional memory management.
