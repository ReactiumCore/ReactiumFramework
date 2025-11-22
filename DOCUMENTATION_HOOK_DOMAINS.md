# Hook System Domains - Comprehensive Documentation

## Table of Contents

1. [What Are Hook Domains?](#what-are-hook-domains)
2. [Implementation Details](#implementation-details)
3. [When to Use Domains vs Default](#when-to-use-domains-vs-default)
4. [Real-World Examples from Core](#real-world-examples-from-core)
5. [Best Practices](#best-practices)
6. [Common Patterns](#common-patterns)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

---

## What Are Hook Domains?

A **domain** in the Reactium Hook system is a string identifier (the 5th parameter) that groups related hook callbacks together for organizational and lifecycle management purposes. All hooks registered with the same domain name can be unregistered collectively using a single `Hook.unregisterDomain(hookName, domain)` call.

### Purpose and Benefits

1. **Bulk Cleanup**: Remove all hooks registered by a plugin or feature in one operation
2. **Lifecycle Management**: Tie hook lifecycles to plugin activation/deactivation
3. **Namespace Organization**: Group related functionality logically
4. **Hot Module Replacement (HMR)**: Clean up hooks during development when modules reload
5. **Prevent Memory Leaks**: Ensure hooks are properly removed when components unmount or plugins unload

### Default Behavior

When no domain is specified, hooks default to the `'default'` domain. This is suitable for:
- Hooks that should persist for the entire application lifetime
- Global application-level hooks
- Hooks that don't need grouped lifecycle management

---

## Implementation Details

### Source Code Analysis

From `/home/john/reactium-framework/reactium-sdk-core/src/core/Hook.ts`:

```typescript
interface HookDeclaration {
    id: string;
    order: number;
    callback: HookCallback;
    domain: string;  // <-- Domain is stored with each hook
}

type HookDomains = {
    [name: string]: {           // Hook name
        [domain: string]: string[];  // Domain -> array of hook IDs
    };
};
```

### Registration Process

When you register a hook with a domain:

```typescript
public register<CB extends HookCallback<any[], any> = HookCallback<any[], any>>(
    name: string,
    callback: CB,
    order: number = Enums.priority.neutral,
    id: string = uuid(),
    domain: string = 'default',  // <-- 5th parameter
) {
    const path = `${type}.${name}.${id}`;

    // Store in action registry by ID
    op.set(this.actionIds, [id], path);

    // Store full hook declaration
    op.set<HookDeclaration>(this.action, `${type}.${name}.${id}`, {
        id,
        order,
        callback,
        domain,
    });

    // Track hook ID in domain registry
    op.set(
        this.domains,
        `${name}.${domain}`,
        _.chain([id, op.get(this.domains, `${name}.${domain}`, [])])
            .compact()
            .uniq()
            .value(),
    );

    return id;
}
```

### Unregistration by Domain

```typescript
public unregisterDomain = (name: string, domain: string) => {
    // Get all hook IDs registered to this domain
    const ids: string[] = op.get(this.domains, `${name}.${domain}`, []);

    // Unregister each individual hook
    ids.forEach((id) => this.unregister(id));

    // Remove domain entry
    op.del(this.domains, `${name}.${domain}`);
};
```

### Internal Data Structures

The Hook system maintains three key data structures:

1. **action**: Nested object storing hook callbacks by type > name > id
2. **actionIds**: Map of hook IDs to their paths in the action object
3. **domains**: Map of hook names > domain names > arrays of hook IDs

This triple-indexing allows efficient:
- Execution of hooks by name (via `action`)
- Individual unregistration by ID (via `actionIds`)
- Bulk unregistration by domain (via `domains`)

---

## When to Use Domains vs Default

### Use a Named Domain When:

1. **Plugin Development**: All hooks in a plugin should share the plugin's domain
   ```javascript
   import domain from './domain';

   Reactium.Plugin.register(domain.name).then(() => {
       Reactium.Hook.register(
           'app-ready',
           callback,
           Enums.priority.neutral,
           `${domain.name}-app-ready`,
           domain.name  // <-- Use plugin's domain
       );
   });
   ```

2. **Feature Flags**: Hooks that enable/disable based on feature state
   ```javascript
   const FEATURE_DOMAIN = 'analytics-tracking';

   if (featureEnabled) {
       Reactium.Hook.register('page-view', trackPageView, 0, 'track-pv', FEATURE_DOMAIN);
   } else {
       Reactium.Hook.unregisterDomain('page-view', FEATURE_DOMAIN);
   }
   ```

3. **Component Lifecycle**: Hooks registered in `useEffect` that need cleanup
   ```javascript
   useEffect(() => {
       const hookId = Reactium.Hook.register(
           'data-updated',
           handleDataUpdate,
           0,
           'my-component-hook',
           'MyComponent'  // <-- Component name as domain
       );

       return () => {
           Reactium.Hook.unregister(hookId);
           // Or unregister all component hooks:
           // Reactium.Hook.unregisterDomain('data-updated', 'MyComponent');
       };
   }, []);
   ```

4. **Multi-Tenant Applications**: Separate hook behavior by tenant
   ```javascript
   const tenantDomain = `tenant-${tenantId}`;

   Reactium.Hook.register(
       'permission-check',
       tenantPermissionCheck,
       0,
       `perm-${tenantId}`,
       tenantDomain
   );

   // When switching tenants:
   Reactium.Hook.unregisterDomain('permission-check', oldTenantDomain);
   ```

5. **Testing**: Isolate test hook registrations
   ```javascript
   const TEST_DOMAIN = 'test-suite';

   beforeEach(() => {
       Reactium.Hook.register('test-hook', mockFn, 0, 'test-1', TEST_DOMAIN);
   });

   afterEach(() => {
       Reactium.Hook.unregisterDomain('test-hook', TEST_DOMAIN);
   });
   ```

### Use Default Domain When:

1. **Core Application Hooks**: Framework-level hooks that persist throughout app lifetime
   ```javascript
   // This hook should ALWAYS be active
   Reactium.Hook.register('routing-error', handleRoutingError);
   ```

2. **Global Utilities**: Single-instance services that never unload
   ```javascript
   Reactium.Hook.register('error-logger', logToService, Enums.priority.highest);
   ```

3. **One-Time Setup**: Hooks that initialize and never need removal
   ```javascript
   Reactium.Hook.register('app-init', setupGlobalConfig, Enums.priority.core);
   ```

4. **Simple Examples/Tests**: When lifecycle management isn't a concern
   ```javascript
   // Quick test or demo code
   Reactium.Hook.register('my-test-hook', () => console.log('fired'));
   ```

---

## Real-World Examples from Core

### Example 1: Media Plugin (Full Plugin Pattern)

From `/home/john/reactium-framework/Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/Media/reactium-hooks.js`:

```javascript
import domain from './domain';  // { name: 'Media' }

Reactium.Plugin.register(domain.name, 100000).then(() => {
    // Create SDK instance
    Reactium[domain.name] = new MediaSdk();

    // Register hooks WITHOUT explicit domain (uses 'default')
    Reactium.Hook.register('app-ready', () => {
        Reactium.Pulse.register('MediaClear', () => Reactium.Media.clear());
    });

    // Cleanup hook - removes SDK when plugin unregisters
    Reactium.Hook.register('plugin-unregister', ({ ID }) => {
        if (ID === domain.name) {
            delete Reactium[domain.name];
        }
    });
});
```

**Analysis**: The Media plugin uses the default domain for its hooks but relies on the `plugin-unregister` pattern for cleanup. A more robust approach would use explicit domains:

```javascript
// Better pattern:
Reactium.Plugin.register(domain.name, 100000).then(() => {
    Reactium[domain.name] = new MediaSdk();

    Reactium.Hook.register(
        'app-ready',
        () => Reactium.Pulse.register('MediaClear', () => Reactium.Media.clear()),
        Enums.priority.neutral,
        `${domain.name}-app-ready`,
        domain.name  // <-- Explicit domain
    );

    Reactium.Hook.register(
        'plugin-unregister',
        ({ ID }) => {
            if (ID === domain.name) {
                // Cleanup all Media hooks
                Reactium.Hook.unregisterDomain('app-ready', domain.name);
                delete Reactium[domain.name];
            }
        },
        Enums.priority.neutral,
        `${domain.name}-cleanup`,
        domain.name
    );
});
```

### Example 2: Domain File Structure

From `/home/john/reactium-framework/example-reactium-project/src/app/components/Greeter/reactium-domain-greeter.js`:

```javascript
/**
 * DDD Domain Greeter - Change name to place domain artifacts in this directory
 * in a different domain.
 */
module.exports = {
    name: 'Greeter',
};
```

**Usage**: This domain file is discovered by Reactium's manifest system and used to:
1. Organize component-related code under a logical domain
2. Enable the component to use `domain.name` in hook registrations
3. Support Domain-Driven Design (DDD) architecture

The manifest system (from `/home/john/reactium-framework/Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/reactium-config.js`) scans for files matching:
```javascript
{
    name: 'allDomains',
    type: 'domain',
    pattern: /(domain|reactium-domain.*?)\.js$/,
}
```

### Example 3: Test Suite Usage

From `/home/john/reactium-framework/reactium-sdk-core/test/Hook.test.ts`:

```typescript
test('will NOT execute when run asynchronously if it has been unregistered by domain', async () => {
    const cb = jest.fn();

    // Register with explicit domain
    Hook.register('test-hook', cb, 0, 'test-id', 'testing');

    // Unregister entire domain
    Hook.unregisterDomain('test-hook', 'testing');

    await Hook.run('test-hook');

    expect(cb).not.toHaveBeenCalled();
});
```

**Analysis**: This test demonstrates the core value proposition of domains - bulk unregistration for cleanup.

### Example 4: HookTester Component (No Domain Usage)

From `/home/john/reactium-framework/example-reactium-project/src/app/components/HookTester/reactium-hooks-hooktester.js`:

```javascript
Hook.register(
    'plugin-init',
    async () => {
        const { HookTester } = await import('./HookTester');
        Component.register('HookTester', HookTester);
    },
    Enums.priority.normal,
    'plugin-init-HookTester',
    // Note: No domain specified, uses 'default'
);
```

**Analysis**: This example doesn't use a domain because it's a simple component registration that doesn't need lifecycle management. However, for consistency, it could benefit from using a domain matching the component name.

---

## Best Practices

### 1. Always Use Domains for Plugins

```javascript
// GOOD: Plugin with domain
import domain from './domain';

Reactium.Plugin.register(domain.name).then(() => {
    const hooks = [
        'app-ready',
        'plugin-init',
        'before-route',
    ];

    hooks.forEach(hookName => {
        Reactium.Hook.register(
            hookName,
            myCallback,
            Enums.priority.neutral,
            `${domain.name}-${hookName}`,
            domain.name  // <-- Consistent domain
        );
    });

    // Cleanup
    Reactium.Hook.register(
        'plugin-unregister',
        ({ ID }) => {
            if (ID === domain.name) {
                hooks.forEach(hookName => {
                    Reactium.Hook.unregisterDomain(hookName, domain.name);
                });
            }
        },
        Enums.priority.neutral,
        `${domain.name}-cleanup`,
        domain.name
    );
});
```

### 2. Match Domain to Plugin Name

```javascript
// domain.js
module.exports = {
    name: 'MyPlugin',
};

// reactium-hooks.js
Reactium.Plugin.register(domain.name).then(() => {
    // All hooks use domain.name
    Reactium.Hook.register('app-ready', callback, order, id, domain.name);
});
```

### 3. Document Your Hook Registrations

```javascript
/**
 * MyPlugin Hook Registrations
 *
 * Hooks:
 * - app-ready: Initialize plugin state
 * - user-login: Track user analytics
 * - plugin-unregister: Cleanup resources
 *
 * Domain: MyPlugin
 * Cleanup: All hooks unregistered on 'plugin-unregister'
 */
Reactium.Plugin.register(domain.name).then(() => {
    // Implementation...
});
```

### 4. Use Consistent Hook IDs

```javascript
// GOOD: Predictable, unique IDs
const hookId = `${domain.name}-${hookName}`;

// AVOID: Random or missing IDs
Hook.register('my-hook', callback); // ID will be random UUID
```

### 5. Cleanup in Plugin Unregister

```javascript
Reactium.Hook.register('plugin-unregister', ({ ID }) => {
    if (ID === domain.name) {
        // Unregister all domain hooks
        ['app-ready', 'user-login', 'data-sync'].forEach(hookName => {
            Reactium.Hook.unregisterDomain(hookName, domain.name);
        });

        // Clean up SDK additions
        if (Reactium[domain.name]) {
            delete Reactium[domain.name];
        }

        // Clean up other resources
        // - Event listeners
        // - Timers
        // - Subscriptions
    }
}, Enums.priority.neutral, `${domain.name}-cleanup`, domain.name);
```

### 6. Consider React Component Lifecycle

```javascript
import React, { useEffect } from 'react';
import Reactium from 'reactium-core/sdk';

const MyComponent = () => {
    useEffect(() => {
        // Register hooks when component mounts
        const hookId = Reactium.Hook.register(
            'data-updated',
            handleUpdate,
            0,
            'mycomponent-data-hook',
            'MyComponent'  // Component name as domain
        );

        return () => {
            // Cleanup when component unmounts
            Reactium.Hook.unregister(hookId);
        };
    }, []);

    return <div>My Component</div>;
};
```

### 7. Avoid Domain Collisions

```javascript
// GOOD: Unique, descriptive domains
'MyAwesomePlugin'
'UserManagement'
'AnalyticsDashboard'

// BAD: Generic, collision-prone domains
'plugin'
'app'
'component'
'default'
```

---

## Common Patterns

### Pattern 1: Plugin Lifecycle Management

```javascript
import domain from './domain';

Reactium.Plugin.register(domain.name).then(() => {
    // Track all registered hooks
    const registeredHooks = [];

    const registerHook = (hookName, callback, order = Enums.priority.neutral) => {
        const id = Reactium.Hook.register(
            hookName,
            callback,
            order,
            `${domain.name}-${hookName}`,
            domain.name
        );
        registeredHooks.push({ hookName, id });
        return id;
    };

    // Register all plugin hooks
    registerHook('app-ready', onAppReady);
    registerHook('user-login', onUserLogin);
    registerHook('before-route', onBeforeRoute);

    // Cleanup on plugin unregister
    registerHook('plugin-unregister', ({ ID }) => {
        if (ID === domain.name) {
            registeredHooks.forEach(({ hookName }) => {
                Reactium.Hook.unregisterDomain(hookName, domain.name);
            });
            delete Reactium[domain.name];
        }
    });
});
```

### Pattern 2: Feature Toggle with Domains

```javascript
const FEATURE_DOMAIN = 'premium-analytics';

const enableFeature = () => {
    Reactium.Hook.register(
        'page-view',
        trackPageView,
        Enums.priority.neutral,
        'premium-track-pv',
        FEATURE_DOMAIN
    );

    Reactium.Hook.register(
        'user-action',
        trackUserAction,
        Enums.priority.neutral,
        'premium-track-action',
        FEATURE_DOMAIN
    );
};

const disableFeature = () => {
    Reactium.Hook.unregisterDomain('page-view', FEATURE_DOMAIN);
    Reactium.Hook.unregisterDomain('user-action', FEATURE_DOMAIN);
};

// Toggle based on user subscription
if (user.isPremium) {
    enableFeature();
} else {
    disableFeature();
}
```

### Pattern 3: Multi-Instance with Domain Namespacing

```javascript
class FeatureManager {
    constructor(featureName) {
        this.domain = `feature-${featureName}`;
        this.hooks = [];
    }

    register(hookName, callback, order = Enums.priority.neutral) {
        const id = Reactium.Hook.register(
            hookName,
            callback,
            order,
            `${this.domain}-${hookName}`,
            this.domain
        );
        this.hooks.push({ hookName, id });
        return id;
    }

    cleanup() {
        this.hooks.forEach(({ hookName }) => {
            Reactium.Hook.unregisterDomain(hookName, this.domain);
        });
        this.hooks = [];
    }
}

// Usage
const analytics = new FeatureManager('analytics');
analytics.register('page-view', trackView);

const notifications = new FeatureManager('notifications');
notifications.register('user-action', showNotification);

// Independent cleanup
analytics.cleanup();
notifications.cleanup();
```

### Pattern 4: Tenant-Specific Hooks

```javascript
const TenantHooks = {
    current: null,

    activate(tenantId, tenantConfig) {
        // Clean up previous tenant's hooks
        if (this.current) {
            this.deactivate(this.current);
        }

        const domain = `tenant-${tenantId}`;

        // Register tenant-specific hooks
        Reactium.Hook.register(
            'data-load',
            () => loadTenantData(tenantId),
            Enums.priority.high,
            `${domain}-data-load`,
            domain
        );

        Reactium.Hook.register(
            'permissions',
            () => checkTenantPermissions(tenantId),
            Enums.priority.high,
            `${domain}-permissions`,
            domain
        );

        this.current = tenantId;
    },

    deactivate(tenantId) {
        const domain = `tenant-${tenantId}`;
        Reactium.Hook.unregisterDomain('data-load', domain);
        Reactium.Hook.unregisterDomain('permissions', domain);
    },
};

// Switch tenants
TenantHooks.activate('tenant-123', config);
```

---

## API Reference

### `Hook.register(name, callback, order, id, domain)`

Registers an asynchronous hook callback with optional domain.

**Parameters:**
- `name` (string, required): Hook name to register to
- `callback` (function, required): Async function or function returning Promise
- `order` (number, optional): Execution priority (default: `Enums.priority.neutral` = 0)
  - Lower numbers execute first
  - Use `Enums.priority.*` constants
- `id` (string, optional): Unique identifier (default: auto-generated UUID)
- `domain` (string, optional): Domain for grouping (default: `'default'`)

**Returns:** `string` - The hook ID (useful for individual unregistration)

**Example:**
```javascript
const hookId = Reactium.Hook.register(
    'app-ready',
    async (context) => {
        console.log('App is ready!');
    },
    Enums.priority.neutral,
    'my-plugin-app-ready',
    'MyPlugin'
);
```

### `Hook.registerSync(name, callback, order, id, domain)`

Registers a synchronous hook callback with optional domain.

**Parameters:** Same as `Hook.register()`

**Returns:** `string` - The hook ID

**Example:**
```javascript
const hookId = Reactium.Hook.registerSync(
    'config-init',
    (context) => {
        console.log('Config initialized');
    },
    Enums.priority.highest,
    'my-plugin-config-init',
    'MyPlugin'
);
```

### `Hook.unregister(id)`

Unregisters a single hook by its ID.

**Parameters:**
- `id` (string, required): Hook ID returned from `register()` or `registerSync()`

**Example:**
```javascript
const hookId = Reactium.Hook.register('test', callback);
Reactium.Hook.unregister(hookId);
```

### `Hook.unregisterDomain(name, domain)`

Unregisters all hooks registered to a specific domain for a given hook name.

**Parameters:**
- `name` (string, required): Hook name
- `domain` (string, required): Domain to unregister

**Example:**
```javascript
// Unregister all 'app-ready' hooks in the 'MyPlugin' domain
Reactium.Hook.unregisterDomain('app-ready', 'MyPlugin');
```

### `Hook.flush(name, type)`

Removes all registered callbacks for a hook (all domains).

**Parameters:**
- `name` (string, required): Hook name
- `type` (string, optional): `'async'` or `'sync'` (default: `'async'`)

**Example:**
```javascript
// Remove ALL 'app-ready' hooks regardless of domain
Reactium.Hook.flush('app-ready');
```

### `Hook.list(type)`

Lists all registered hook names of a certain type.

**Parameters:**
- `type` (string, optional): `'async'` or `'sync'` (default: `'async'`)

**Returns:** `string[]` - Sorted array of hook names

**Example:**
```javascript
const asyncHooks = Reactium.Hook.list();
console.log(asyncHooks); // ['app-ready', 'plugin-init', 'user-login', ...]
```

### `Hook.run(name, ...params)`

Executes all registered async hooks for a given name.

**Parameters:**
- `name` (string, required): Hook name
- `...params` (any, variadic): Parameters passed to each callback

**Returns:** `Promise<HookRunContext>` - Context object with results

**Example:**
```javascript
const context = await Reactium.Hook.run('app-ready', initialData);
console.log(context.params); // [initialData]
console.log(context.hook);   // 'app-ready'
```

### `Hook.runSync(name, ...params)`

Executes all registered sync hooks for a given name.

**Parameters:**
- `name` (string, required): Hook name
- `...params` (any, variadic): Parameters passed to each callback

**Returns:** `object` - Context object

**Example:**
```javascript
const context = Reactium.Hook.runSync('config-init', config);
console.log(context.params); // [config]
```

---

## Troubleshooting

### Issue: Hooks Not Cleaning Up on HMR

**Symptom:** During development, hooks fire multiple times after module reload.

**Cause:** Hooks registered without proper domain cleanup aren't removed on hot reload.

**Solution:**
```javascript
// Use domains and implement cleanup
if (module.hot) {
    module.hot.dispose(() => {
        // Clean up hooks on module reload
        Reactium.Hook.unregisterDomain('my-hook', domain.name);
    });
}
```

### Issue: Hook Fires After Component Unmounts

**Symptom:** React warnings about setState on unmounted component.

**Cause:** Hooks not unregistered in component cleanup.

**Solution:**
```javascript
useEffect(() => {
    const hookId = Reactium.Hook.register(
        'data-updated',
        handleUpdate,
        0,
        'component-hook',
        'MyComponent'
    );

    return () => {
        Reactium.Hook.unregister(hookId);
    };
}, []);
```

### Issue: Multiple Plugins Using Same Domain

**Symptom:** Unregistering one plugin's hooks removes another plugin's hooks.

**Cause:** Domain name collision.

**Solution:** Use unique, descriptive domain names:
```javascript
// BAD: Generic domain
const domain = { name: 'plugin' };

// GOOD: Specific domain
const domain = { name: 'UserAuthenticationPlugin' };
```

### Issue: Can't Find Hook IDs to Unregister

**Symptom:** Unable to track which hooks to clean up.

**Solution:** Store hook IDs during registration:
```javascript
const pluginHooks = {
    ids: [],

    register(hookName, callback) {
        const id = Reactium.Hook.register(
            hookName,
            callback,
            Enums.priority.neutral,
            `${domain.name}-${hookName}`,
            domain.name
        );
        this.ids.push({ hookName, id });
        return id;
    },

    cleanup() {
        this.ids.forEach(({ hookName }) => {
            Reactium.Hook.unregisterDomain(hookName, domain.name);
        });
    },
};
```

### Issue: Hooks Execute in Wrong Order

**Symptom:** Hook callbacks don't execute in expected sequence.

**Cause:** Incorrect or missing `order` parameter.

**Solution:** Use `Enums.priority` constants:
```javascript
// Execute early
Reactium.Hook.register('init', earlyCallback, Enums.priority.highest);

// Execute normally
Reactium.Hook.register('init', normalCallback, Enums.priority.neutral);

// Execute late
Reactium.Hook.register('init', lateCallback, Enums.priority.lowest);
```

Priority values:
```javascript
Enums.priority.core = -2000      // Framework internals
Enums.priority.highest = -1000   // High priority plugins
Enums.priority.high = -500       // Above normal
Enums.priority.neutral = 0       // Default (most plugins)
Enums.priority.low = 500         // Below normal
Enums.priority.lowest = 1000     // Low priority / cleanup
```

### Issue: Domain Unregistration Doesn't Work

**Symptom:** `Hook.unregisterDomain()` doesn't remove hooks.

**Cause:** Mismatch between registration and unregistration hook names or domains.

**Solution:** Use exact same hook name and domain:
```javascript
// Registration
Reactium.Hook.register('app-ready', cb, 0, 'id1', 'MyPlugin');

// Unregistration - must match exactly
Reactium.Hook.unregisterDomain('app-ready', 'MyPlugin');

// WRONG: Different hook name
Reactium.Hook.unregisterDomain('app-init', 'MyPlugin');  // Won't work

// WRONG: Different domain
Reactium.Hook.unregisterDomain('app-ready', 'my-plugin');  // Won't work
```

---

## Summary

Hook domains are a powerful organizational and lifecycle management tool in Reactium. Key takeaways:

1. **Use domains for plugins** - Essential for proper cleanup and lifecycle management
2. **Match domain to plugin name** - Consistency makes code easier to understand
3. **Default domain for globals** - Application-level hooks that never unload
4. **Implement cleanup** - Always unregister domain hooks in `plugin-unregister`
5. **Component lifecycle** - Use domains to manage component-mounted hooks
6. **Document your domains** - Help other developers understand your hook organization

By following these patterns, you'll create maintainable, memory-leak-free plugins that integrate cleanly with Reactium's hook system.
