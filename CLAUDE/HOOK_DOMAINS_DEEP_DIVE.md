<!-- v1.0.0 -->
# Hook System Domains: Deep Dive

**Research Date:** 2025-11-21
**Researcher:** Claude (Documentation Steward)
**Source Analysis:** Reactium Framework v5+ Source Code

---

## Executive Summary

Hook domains in Reactium provide a **namespace and lifecycle management mechanism** for organizing and cleaning up groups of hook callbacks. Domains enable plugins to register multiple hooks under a common identifier and unregister all of them at once, preventing memory leaks and ensuring clean teardown during plugin deactivation or hot module replacement.

**Key Finding:** While domains appear simple on the surface (just a string parameter), they are a critical architectural pattern for plugin lifecycle management and preventing callback accumulation in long-running applications.

---

## What Are Hook Domains?

### Definition

A **domain** is a string identifier (5th parameter) passed to `Hook.register()` or `Hook.registerSync()` that groups related hook callbacks together. All hooks registered with the same domain can be unregistered in a single operation using `Hook.unregisterDomain(hookName, domain)`.

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

### Implementation Source

**File:** `/reactium-sdk-core/src/core/Hook.ts`

```typescript
interface HookDeclaration {
    id: string;
    order: number;
    callback: HookCallback;
    domain: string;  // <-- Domain is stored with each hook
}

type HookDomains = {
    [name: string]: {
        [domain: string]: string[];  // Maps domain to hook IDs
    };
};

class HookSDK {
    protected domains: HookDomains = {};

    protected _register = (type: HookType = HookType.async) => (
        name: string,
        callback: CB,
        order: number = Enums.priority.neutral,
        id: string = uuid(),
        domain: string = 'default',  // <-- Default domain
    ) => {
        // Store hook declaration with domain
        op.set<HookDeclaration>(this.action, `${type}.${name}.${id}`, {
            id,
            order,
            callback,
            domain,
        });

        // Index hook ID by domain for bulk operations
        op.set(
            this.domains,
            `${name}.${domain}`,
            _.chain([id, op.get(this.domains, `${name}.${domain}`, [])])
                .compact()
                .uniq()
                .value(),
        );

        return id;
    };

    public unregisterDomain = (name: string, domain: string) => {
        const ids: string[] = op.get(this.domains, `${name}.${domain}`, []);
        ids.forEach((id) => this.unregister(id));
        op.del(this.domains, `${name}.${domain}`);
    };
}
```

**Critical Insights:**

1. **Triple Indexing**: Each hook is stored in three data structures:
   - `action[type][name][id]` - The actual hook with callback
   - `actionIds[id]` - Reverse lookup from ID to path
   - `domains[name][domain][]` - Array of IDs grouped by domain

2. **Default Domain**: If no domain is specified, hooks use `'default'` domain

3. **Domain Scope**: Domains are scoped per hook name, not global. The same domain string can be used across different hook names.

---

## How Are Domains Used?

### API Signature

```javascript
Hook.register(name, callback, order, id, domain)
Hook.registerSync(name, callback, order, id, domain)
```

**Parameters:**
- `name` (string): Hook name to register
- `callback` (function): Function to execute when hook runs
- `order` (number): Priority order (default: `Enums.priority.neutral`)
- `id` (string): Unique identifier (default: auto-generated UUID)
- `domain` (string): **Domain namespace** (default: `'default'`)

**Returns:** The hook ID (string)

### Example: Basic Domain Usage

```javascript
import Reactium from 'reactium-core/sdk';

// Register multiple hooks in the 'MyPlugin' domain
const hookId1 = Reactium.Hook.register(
    'app-ready',
    async () => {
        console.log('MyPlugin is ready');
    },
    Reactium.Enums.priority.neutral,
    'my-plugin-app-ready',
    'MyPlugin'  // <-- Domain
);

const hookId2 = Reactium.Hook.register(
    'before-route',
    async (routeData, context) => {
        // Modify route data
        context.modified = true;
    },
    Reactium.Enums.priority.neutral,
    'my-plugin-route-handler',
    'MyPlugin'  // <-- Same domain
);

// Later: Unregister ALL hooks in the 'MyPlugin' domain for 'app-ready'
Reactium.Hook.unregisterDomain('app-ready', 'MyPlugin');

// Or unregister all 'MyPlugin' hooks for 'before-route'
Reactium.Hook.unregisterDomain('before-route', 'MyPlugin');
```

**Note:** `unregisterDomain(name, domain)` only unregisters hooks for that specific hook name, not all hooks across all hook names in that domain.

---

## When Should Developers Use Domains?

### Use Case 1: Plugin Lifecycle Management (Primary Use Case)

**Problem:** Plugins register multiple hooks during initialization. When the plugin deactivates or during HMR (Hot Module Replacement), these hooks must be cleaned up to prevent:
- Memory leaks from accumulating callbacks
- Duplicate execution of callbacks
- Stale closures referencing old code

**Solution:** Use the plugin ID or name as the domain.

**Example from Core: Media Plugin**

**File:** `/Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/Media/reactium-hooks.js`

```javascript
import domain from './domain';  // { name: 'Media' }

Reactium.Plugin.register(domain.name, 100000).then(() => {
    // Register SDK
    Reactium[domain.name] = new MediaSdk();

    // Register hooks with domain
    Reactium.Hook.register('app-ready', () => {
        Reactium.Pulse.register('MediaClear', () => Reactium.Media.clear());
    });

    // Setup cleanup on plugin unregister
    Reactium.Hook.register('plugin-unregister', ({ ID }) => {
        // Tear down when this plugin unregisters
        if (ID === domain.name) {
            delete Reactium[domain.name];
            // Hooks are automatically cleaned up by domain
        }
    });
});
```

**Best Practice:**
```javascript
// domain.js
module.exports = {
    name: 'MyPlugin',
};

// reactium-hooks.js
import domain from './domain';

Reactium.Plugin.register(domain.name).then(() => {
    // All hooks use domain.name as the domain
    Reactium.Hook.register(
        'plugin-init',
        async () => { /* ... */ },
        Reactium.Enums.priority.neutral,
        `${domain.name}-plugin-init`,
        domain.name  // <-- Domain matches plugin name
    );

    Reactium.Hook.register(
        'plugin-unregister',
        ({ ID }) => {
            if (ID === domain.name) {
                // Cleanup all hooks for this plugin
                Reactium.Hook.unregisterDomain('plugin-init', domain.name);
                Reactium.Hook.unregisterDomain('app-ready', domain.name);
                // ... unregister for each hook name used
            }
        }
    );
});
```

### Use Case 2: Feature Flagging and Temporary Functionality

**Problem:** You want to enable/disable a set of features dynamically at runtime.

**Solution:** Group feature hooks under a feature domain.

```javascript
const FEATURE_DOMAIN = 'experimental-analytics';

// Enable analytics feature
function enableAnalytics() {
    Reactium.Hook.register(
        'page-view',
        async (page) => {
            await trackPageView(page);
        },
        Reactium.Enums.priority.neutral,
        'analytics-page-view',
        FEATURE_DOMAIN
    );

    Reactium.Hook.register(
        'user-action',
        async (action) => {
            await trackUserAction(action);
        },
        Reactium.Enums.priority.neutral,
        'analytics-user-action',
        FEATURE_DOMAIN
    );
}

// Disable analytics feature
function disableAnalytics() {
    Reactium.Hook.unregisterDomain('page-view', FEATURE_DOMAIN);
    Reactium.Hook.unregisterDomain('user-action', FEATURE_DOMAIN);
}
```

### Use Case 3: Testing and Development

**Problem:** During testing, you need to mock hook behaviors and ensure clean teardown between tests.

**Solution:** Use test-specific domains.

```javascript
describe('MyComponent', () => {
    const TEST_DOMAIN = 'test-run';

    beforeEach(() => {
        // Register test hooks
        Reactium.Hook.register(
            'data-load',
            async () => ({ mock: 'data' }),
            Reactium.Enums.priority.highest,
            'mock-data-loader',
            TEST_DOMAIN
        );
    });

    afterEach(() => {
        // Clean up all test hooks
        Reactium.Hook.unregisterDomain('data-load', TEST_DOMAIN);
    });

    it('loads data', async () => {
        const result = await Reactium.Hook.run('data-load');
        expect(result['mock-data-loader']).toEqual({ mock: 'data' });
    });
});
```

**Example from Source: Hook Tests**

**File:** `/reactium-sdk-core/test/Hook.test.ts`

```typescript
test('will NOT execute when unregistered by domain', async () => {
    const cb = jest.fn();
    Hook.register('test-hook', cb, 0, 'test-id', 'testing');
    Hook.unregisterDomain('test-hook', 'testing');
    await Hook.run('test-hook');
    expect(cb).not.toHaveBeenCalled();
});
```

### Use Case 4: Multi-Tenant or Multi-Instance Scenarios

**Problem:** A single application manages multiple instances (e.g., multi-tenant SaaS) and each instance needs isolated hooks.

**Solution:** Use tenant/instance ID as domain.

```javascript
function setupTenantHooks(tenantId) {
    const domain = `tenant-${tenantId}`;

    Reactium.Hook.register(
        'tenant-data-load',
        async (data, context) => {
            context.tenant = tenantId;
            context.data = await loadTenantData(tenantId);
        },
        Reactium.Enums.priority.neutral,
        `${domain}-data-load`,
        domain
    );

    Reactium.Hook.register(
        'tenant-permissions',
        async (user, context) => {
            context.permissions = await loadTenantPermissions(tenantId, user);
        },
        Reactium.Enums.priority.neutral,
        `${domain}-permissions`,
        domain
    );
}

function teardownTenant(tenantId) {
    const domain = `tenant-${tenantId}`;
    Reactium.Hook.unregisterDomain('tenant-data-load', domain);
    Reactium.Hook.unregisterDomain('tenant-permissions', domain);
}
```

---

## When NOT to Use Domains (Use No Domain)

### Default Behavior: Core Framework Hooks

**When to omit the domain parameter:**

1. **Core application hooks** that should persist for the entire application lifetime
2. **Bootstrap hooks** that run once during initialization
3. **Singleton services** that never need unregistering

```javascript
// Core app initialization - no domain needed
Reactium.Hook.register(
    'sdk-init',
    async () => {
        // Initialize core services
        await initializeDatabase();
    },
    Reactium.Enums.priority.highest,
    'app-core-sdk-init'
    // No domain parameter - uses 'default'
);

// Application-level singleton
Reactium.Hook.register(
    'app-ready',
    async () => {
        console.log('Application is ready');
        startApplicationMonitoring();
    }
    // No domain - this hook lives for the app lifetime
);
```

**Rule of Thumb:**
- **Use domain:** When the hook has a lifecycle (can be added/removed)
- **No domain:** When the hook is permanent and part of core functionality

---

## Patterns from Core Plugins

### Pattern 1: Domain Matches Plugin Name

**Used by:** Media, Content, Dashboard plugins

```javascript
// domain.js
module.exports = { name: 'Media' };

// reactium-hooks.js
import domain from './domain';

Reactium.Plugin.register(domain.name, 100000).then(() => {
    // All hooks use domain.name
    Reactium.Hook.register('app-ready', callback, order, id, domain.name);
    Reactium.Hook.register('plugin-unregister', callback, order, id, domain.name);
});
```

**Advantage:** Clear 1:1 mapping between plugin and domain for easy cleanup.

### Pattern 2: Special Domain for Framework Internals

**Used by:** Annotation processors

```javascript
Hook.registerSync(
    '@reactium',  // <-- Hook NAME is @reactium
    (processors) => {
        // Register annotation processor
        processors.register('file-tag', { processor });
    },
    Enums.priority.highest,
    '@reactium-file-tag',  // <-- ID is descriptive
    // Domain omitted - this is framework-level
);
```

**Special Case:** The `@reactium` hook name (not domain) is used for annotation processors. This is a sync hook that runs to populate a registry.

### Pattern 3: No Domain for Simple Hooks

**Used by:** Content plugin server-side hooks

**File:** `/Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-content/plugin.js`

```javascript
// Simple lifecycle hooks - no domain needed
Actinium.Hook.register('start', async () => {
    if (Actinium.Plugin.isActive(PLUGIN.ID)) await saveRoutes();
});

Actinium.Hook.register('activate', async ({ ID }) => {
    if (ID === PLUGIN.ID) await saveRoutes();
});

Actinium.Hook.register('update', async ({ ID }) => {
    if (ID === PLUGIN.ID) await saveRoutes();
});

Actinium.Hook.register('deactivate', async ({ ID }) => {
    if (ID === PLUGIN.ID) {
        for (const route of PLUGIN_ROUTES) {
            await Actinium.Route.delete(route);
        }
    }
});
```

**Rationale:** These hooks self-manage by checking `ID === PLUGIN.ID` internally, so domain-based cleanup isn't necessary.

---

## Domain Lifecycle Management

### Complete Plugin Teardown Example

```javascript
import domain from './domain';

const HOOK_NAMES = [
    'plugin-init',
    'app-ready',
    'before-route',
    'after-route',
    'component-render',
    'data-loaded',
];

Reactium.Plugin.register(domain.name).then(() => {
    // Register all hooks with the domain
    HOOK_NAMES.forEach(hookName => {
        Reactium.Hook.register(
            hookName,
            async (...args) => {
                // Plugin-specific logic
            },
            Reactium.Enums.priority.neutral,
            `${domain.name}-${hookName}`,
            domain.name  // <-- Domain
        );
    });

    // Setup cleanup
    Reactium.Hook.register(
        'plugin-unregister',
        ({ ID }) => {
            if (ID === domain.name) {
                // Unregister all hooks by domain
                HOOK_NAMES.forEach(hookName => {
                    Reactium.Hook.unregisterDomain(hookName, domain.name);
                });

                // Additional cleanup
                delete Reactium[domain.name];
            }
        },
        Reactium.Enums.priority.neutral,
        `${domain.name}-cleanup`,
        domain.name  // <-- Even cleanup hook uses domain
    );
});
```

### HMR (Hot Module Replacement) Support

```javascript
// Check if plugin already exists (HMR scenario)
if (Reactium.Plugin.isActive(domain.name)) {
    // Clean up old hooks before re-registering
    HOOK_NAMES.forEach(hookName => {
        Reactium.Hook.unregisterDomain(hookName, domain.name);
    });
}

// Now register fresh hooks
Reactium.Plugin.register(domain.name).then(() => {
    // Register hooks...
});
```

---

## API Reference Summary

### `Hook.register(name, callback, order, id, domain)`

Registers an asynchronous hook callback.

**Parameters:**
- `name` (String): Hook name
- `callback` (Function): Async function to execute
- `order` (Number): Priority order (default: `Enums.priority.neutral`)
- `id` (String): Unique ID (default: auto-generated UUID)
- `domain` (String): Domain namespace (default: `'default'`)

**Returns:** String (hook ID)

### `Hook.registerSync(name, callback, order, id, domain)`

Registers a synchronous hook callback.

**Parameters:** Same as `Hook.register()`

**Returns:** String (hook ID)

### `Hook.unregisterDomain(name, domain)`

Unregisters all hooks for a specific hook name within a domain.

**Parameters:**
- `name` (String): Hook name
- `domain` (String): Domain to unregister

**Returns:** void

**Important:** This only affects hooks registered with the specified hook name. To clean up a domain across multiple hook names, call `unregisterDomain` for each hook name.

### `Hook.unregister(id)`

Unregisters a single hook by its ID.

**Parameters:**
- `id` (String): Hook ID returned from `register()`

**Returns:** void

### `Hook.flush(name, type)`

Removes ALL hooks for a hook name (regardless of domain).

**Parameters:**
- `name` (String): Hook name
- `type` (String): `'async'` or `'sync'` (default: `'async'`)

**Returns:** void

**Warning:** Use sparingly - this clears all hooks including those from other plugins.

### `Hook.list(type)`

Lists all registered hook names of a certain type.

**Parameters:**
- `type` (String, optional): `'async'` or `'sync'` (default: `'async'`)

**Returns:** `string[]` - Sorted array of hook names

**Example:**
```javascript
const asyncHooks = Reactium.Hook.list();
console.log(asyncHooks); // ['app-ready', 'plugin-init', 'user-login', ...]
```

### `Hook.run(name, ...params)`

Executes all registered async hooks for a given name.

**Parameters:**
- `name` (String, required): Hook name
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
- `name` (String, required): Hook name
- `...params` (any, variadic): Parameters passed to each callback

**Returns:** `object` - Context object

**Example:**
```javascript
const context = Reactium.Hook.runSync('config-init', config);
console.log(context.params); // [config]
```

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

## Common Pitfalls and Solutions

### Pitfall 1: Forgetting to Clean Up

**Problem:**
```javascript
// ❌ BAD: No cleanup mechanism
Reactium.Hook.register('app-ready', callback, order, id, 'MyPlugin');
// Plugin unloads, but hook still exists
```

**Solution:**
```javascript
// ✅ GOOD: Setup cleanup handler
Reactium.Hook.register('app-ready', callback, order, id, domain.name);

Reactium.Hook.register('plugin-unregister', ({ ID }) => {
    if (ID === domain.name) {
        Reactium.Hook.unregisterDomain('app-ready', domain.name);
    }
}, order, id, domain.name);
```

### Pitfall 2: Using Global Flush Instead of Domain

**Problem:**
```javascript
// ❌ BAD: Clears ALL app-ready hooks from all plugins
Reactium.Hook.flush('app-ready');
```

**Solution:**
```javascript
// ✅ GOOD: Only clears your plugin's hooks
Reactium.Hook.unregisterDomain('app-ready', 'MyPlugin');
```

### Pitfall 3: Inconsistent Domain Naming

**Problem:**
```javascript
// ❌ BAD: Inconsistent domain names
Reactium.Hook.register('hook-1', cb1, order, id, 'MyPlugin');
Reactium.Hook.register('hook-2', cb2, order, id, 'my-plugin');
Reactium.Hook.register('hook-3', cb3, order, id, 'myplugin');

// Later: This only clears 'hook-1'
Reactium.Hook.unregisterDomain('hook-1', 'MyPlugin');
```

**Solution:**
```javascript
// ✅ GOOD: Use a constant
const DOMAIN = 'MyPlugin';
Reactium.Hook.register('hook-1', cb1, order, id, DOMAIN);
Reactium.Hook.register('hook-2', cb2, order, id, DOMAIN);
Reactium.Hook.register('hook-3', cb3, order, id, DOMAIN);
```

### Pitfall 4: Assuming Domain is Global Across Hook Names

**Problem:**
```javascript
// ❌ BAD: Thinking this clears all hooks in 'MyPlugin' domain
Reactium.Hook.unregisterDomain('app-ready', 'MyPlugin');
// This only clears 'app-ready' hooks, not 'before-route' hooks
```

**Solution:**
```javascript
// ✅ GOOD: Unregister for each hook name
const HOOK_NAMES = ['app-ready', 'before-route', 'after-route'];
HOOK_NAMES.forEach(name => {
    Reactium.Hook.unregisterDomain(name, 'MyPlugin');
});
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

## Decision Matrix: Domain vs No Domain

| Scenario | Use Domain? | Recommended Domain Name |
|----------|-------------|------------------------|
| Plugin with lifecycle | ✅ Yes | Plugin ID or name |
| Feature flag system | ✅ Yes | Feature name |
| Testing/mocking | ✅ Yes | `'test'` or test suite name |
| Multi-tenant app | ✅ Yes | `tenant-${tenantId}` |
| Core app initialization | ❌ No | (uses `'default'`) |
| Singleton services | ❌ No | (uses `'default'`) |
| One-time bootstrap | ❌ No | (uses `'default'`) |
| Library code (no lifecycle) | ❌ No | (uses `'default'`) |

---

## Comparison: Domain vs ID vs Flush

| Operation | Scope | Use Case |
|-----------|-------|----------|
| `unregister(id)` | Single hook | Remove one specific callback |
| `unregisterDomain(name, domain)` | All hooks in domain for one hook name | Plugin cleanup for one hook |
| `flush(name)` | All hooks for one hook name | Nuclear option - clear everything |

**Example:**
```javascript
// Three different levels of granularity

// 1. Remove specific callback
const id = Reactium.Hook.register('app-ready', cb1, order, id, 'MyPlugin');
Reactium.Hook.unregister(id);  // Only removes cb1

// 2. Remove all 'MyPlugin' hooks for 'app-ready'
Reactium.Hook.register('app-ready', cb1, order, 'id1', 'MyPlugin');
Reactium.Hook.register('app-ready', cb2, order, 'id2', 'MyPlugin');
Reactium.Hook.register('app-ready', cb3, order, 'id3', 'OtherPlugin');
Reactium.Hook.unregisterDomain('app-ready', 'MyPlugin');  // Removes cb1, cb2 only

// 3. Nuclear: Remove ALL 'app-ready' hooks
Reactium.Hook.flush('app-ready');  // Removes cb1, cb2, cb3 and any others
```

---

## Implementation Notes

### Internal Data Structure

```javascript
// Simplified representation of Hook internals
{
    action: {
        async: {
            'app-ready': {
                'uuid-1': { id: 'uuid-1', order: 0, callback: fn1, domain: 'MyPlugin' },
                'uuid-2': { id: 'uuid-2', order: 0, callback: fn2, domain: 'MyPlugin' },
                'uuid-3': { id: 'uuid-3', order: 0, callback: fn3, domain: 'OtherPlugin' },
            }
        },
        sync: { /* ... */ }
    },
    actionIds: {
        'uuid-1': 'async.app-ready.uuid-1',
        'uuid-2': 'async.app-ready.uuid-2',
        'uuid-3': 'async.app-ready.uuid-3',
    },
    domains: {
        'app-ready': {
            'MyPlugin': ['uuid-1', 'uuid-2'],
            'OtherPlugin': ['uuid-3'],
        }
    }
}
```

**Key Insight:** The `domains` data structure provides an index of hook IDs grouped by domain, enabling efficient bulk unregistration without iterating over all hooks.

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

---

## Conclusion

Hook domains are a **lightweight but powerful pattern** for managing plugin lifecycles in Reactium. They provide:

1. **Namespace isolation** for hook callbacks
2. **Bulk cleanup capabilities** for plugin deactivation
3. **HMR support** through clean teardown
4. **Memory leak prevention** in long-running applications
5. **Testing support** through isolated mock hooks

**When to Use:**
- ✅ Plugins with activation/deactivation
- ✅ Feature flags and dynamic functionality
- ✅ Testing and development
- ✅ Multi-tenant scenarios

**When NOT to Use:**
- ❌ Core application hooks (permanent)
- ❌ One-time initialization
- ❌ Singleton services

**Best Practice:** Always use domains for plugin hooks and set up proper cleanup in the `plugin-unregister` hook to prevent memory leaks and ensure clean HMR cycles.

---

## References

**Source Files Analyzed:**
- `/reactium-sdk-core/src/core/Hook.ts` - Core implementation
- `/reactium-sdk-core/test/Hook.test.ts` - Test examples
- `/reactium-sdk-core/src/core/Server/annotations.ts` - Special domain usage
- `/Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/Media/reactium-hooks.js` - Real-world pattern
- `/Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-content/plugin.js` - Server-side patterns

**API Documentation:**
- `/reactium-sdk-core/src/apiDocs/Hook.js`
- `/reactium-sdk-core/apidocs/`

**Framework Version:** Reactium 5.x / Actinium 5.x
