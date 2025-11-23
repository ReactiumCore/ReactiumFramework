<!-- v1.1.0 -->

# SDK Extension Pattern (Browser-Side)

## Overview

Browser-side plugins extend the Reactium SDK by registering on the `sdk-init` hook, which fires after all `reactium-hooks-*.js` files are loaded but before the `init` hook. This pattern allows plugins to add new namespaces, methods, and integrations to the global `Reactium` SDK object, making them available throughout the application.

**Hook Lifecycle Position:**
```
allHooks loaded → sdk-init (sync & async) → init → dependencies-load → ...
```

**Source Reference:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/index.jsx:28-29`

## The Two Extension Patterns

### Pattern 1: Direct SDK Extension

**What:** Attach a namespace directly to the `Reactium` object.

**When to use:** Simple SDK additions, utilities, or feature modules that don't need pluggable registration.

**Example - User SDK Extension:**

```javascript
// reactium-hooks.js
import Reactium from 'reactium-core/sdk';

Reactium.Hook.register(
    'sdk-init',
    async SDK => {
        const { default: User } = await import('./sdk');
        Reactium.User = User;
    },
    Reactium.Enums.highest,
    'REACTIUM-CORE-SDK-USER',
);
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-user/reactium-hooks.js:3-11`

**Result:** Access `Reactium.User.auth()`, `Reactium.User.current()`, etc. anywhere in your app.

### Pattern 2: APIRegistry Extension

**What:** Register an API with configuration through the `Reactium.API` registry, which is itself a Proxy-backed Registry.

**When to use:** External integrations (Parse, Apollo, custom backends) where you need both API client and configuration accessible, and want pluggable multi-API support.

**Example - GraphQL Integration:**

```javascript
// reactium-hooks-graphql-client.js
import { ApolloClient, InMemoryCache } from '@apollo/client';
import Reactium, { Hook, Enums } from 'reactium-core/sdk';

Hook.register(
    'sdk-init',
    async () => {
        const cache = new InMemoryCache();
        const config = {
            cache,
            uri: window.graphqlAPI || 'http://localhost:4000/graphql',
            name: 'reactium-web-client',
            version: '1.3',
            queryDeduplication: false,
        };

        await Hook.run('register-apollo-client', config);

        // Register API + config via APIRegistry
        Reactium.API.register('GraphQL', {
            api: new ApolloClient(config),
            config,
        });
    },
    Enums.highest,
    'REACTIUM-CORE-SDK-GRAPHQL',
);
```

**Source:** `Reactium-GraphQL-Plugin/reactium_modules/@reactium/graphql/reactium-hooks-graphql-client.js:4-42`

**Result:** Access via:
- `Reactium.API.GraphQL` → returns Apollo client
- `Reactium.API.GraphQLConfig` → returns configuration
- `Reactium.GraphQL` → falls through to API registry via Proxy (see below)

### APIRegistry Internals

The `Reactium.API` object is a Proxy-wrapped Registry with special behavior:

```javascript
// @atomic-reactor/reactium-api/sdk/index.js
class APIRegistry extends SDK.Registry {
    constructor() {
        super('APIRegistry', 'name', SDK.Registry.MODES.CLEAN);

        // Actinium Parse SDK registered by default
        this.register({
            name: 'Actinium',
            api: ParseSDK,
            config: ParseConfig,
        });
    }

    api(name = 'Actinium') {
        const API = op.get(this.get(name), 'api');
        SDK.Hook.runSync('sdk-get-api', name, API);
        return API;
    }

    config(name = 'Actinium') {
        const Config = op.get(this.get(name), 'config');
        SDK.Hook.runSync('sdk-get-api-config', name, Config);
        return Config;
    }
}

const handler = {
    get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop === 'string') {
            const reg = /Config$/;
            const [name] = prop.split(reg);
            // If prop ends with 'Config', return config; otherwise return api
            return reg.test(prop) ? target.config(name) : target.api(name);
        }
    },
    // ... set, has, deleteProperty handlers
};

const proxy = new Proxy(new APIRegistry(), handler);
export default proxy;
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-api/sdk/index.js:4-65`

**Access Patterns:**

```javascript
// Access API directly
Reactium.API.GraphQL           // → calls api('GraphQL')
Reactium.API.Actinium          // → calls api('Actinium') → Parse SDK
Reactium.API.GraphQLConfig     // → calls config('GraphQL')

// Register new API
Reactium.API.register('MyAPI', { api: myClient, config: myConfig });

// Hook into API access
Reactium.Hook.register('sdk-get-api', (name, API) => {
    console.log(`Accessing ${name} API`, API);
});
```

## SDK Proxy Fallback Chain

The main `Reactium` SDK object uses a Proxy to enable fallback access patterns:

```javascript
// @atomic-reactor/reactium-core/sdk/index.js
const apiHandler = {
    get(SDK, prop) {
        if (prop in SDK) return SDK[prop];           // 1. Check SDK directly
        if (SDK.API) {
            if (prop in SDK.API) return SDK.API[prop];  // 2. Fall through to API registry
            if (SDK.API.Actinium && prop in SDK.API.Actinium)
                return SDK.API.Actinium[prop];          // 3. Fall through to Actinium Parse SDK
        }
    },

    set(SDK, prop, value) {
        // Optionally protect SDK props via hook
        const { ok = true } = SDK.Hook.runSync('reactium-sdk-set-prop', prop, value);
        if (ok) {
            SDK[prop] = value;
        }
        return true;
    },
};

export const Reactium = new Proxy(SDK, apiHandler);
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/index.js:33-59`

**Fallback Example:**

```javascript
// These are equivalent due to Proxy fallback:
await Reactium.Cloud.run('myFunction', params);
await Reactium.API.Actinium.Cloud.run('myFunction', params);

// Lookup order:
// 1. Reactium.Cloud? No
// 2. Reactium.API.Cloud? No
// 3. Reactium.API.Actinium.Cloud? Yes → Parse.Cloud
```

This allows seamless frontend/backend integration without requiring full namespace paths.

## Complete Real-World Examples

### Example 1: User SDK (Direct Extension)

**File:** `@atomic-reactor/reactium-user/sdk/index.js`

```javascript
import SDK, { Hook } from 'reactium-core/sdk';

const User = { Meta: {}, Pref: {}, Role: {} };

User.auth = (username, password) =>
    SDK.API.Actinium.User.logIn(username, password)
        .then(u => u.fetch())
        .then(u => u.toJSON())
        .then(async u => {
            await Hook.run('user.auth', u);
            return u;
        });

User.current = (parseObject = false) => {
    const u = SDK.API.Actinium.User.current();
    return u ? (parseObject === true ? u : u.toJSON()) : null;
};

User.hasValidSession = async () => {
    const current = User.current(true);
    if (!current || !current.authenticated()) return false;

    return SDK.API.Actinium.Cloud.run('session-validate')
        .then(() => true)
        .catch(() => false);
};

// ... many more methods

export default User;
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-user/sdk/index.js:5-585`

**Usage in Components:**

```javascript
import Reactium from 'reactium-core/sdk';

const LoginForm = () => {
    const handleLogin = async (username, password) => {
        try {
            const user = await Reactium.User.auth(username, password);
            console.log('Logged in:', user);
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    return <form onSubmit={handleLogin}>...</form>;
};
```

### Example 2: Capability SDK (Direct Extension + Hook Integration)

**File:** `@atomic-reactor/reactium-capability/reactium-hooks.js`

```javascript
import Reactium from 'reactium-core/sdk';
import op from 'object-path';

Reactium.Hook.register(
    'sdk-init',
    async SDK => {
        const { default: Capability } = await import('./sdk');
        Reactium.Capability = Capability;
    },
    Reactium.Enums.highest,
    'REACTIUM-CORE-SDK-CAPABILITY',
);

// Hook integration: allow other plugins to extend capability checks
Reactium.Hook.register(
    'capability-check',
    async (capabilities = [], strict = true, context) => {
        const permitted = await Reactium.Capability.check(capabilities, strict);
        op.set(context, 'permitted', permitted);
    },
    Reactium.Enums.priority.highest,
);
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-capability/reactium-hooks.js:4-21`

**Usage:**

```javascript
// Direct call
const canEdit = await Reactium.Capability.check(['content.edit'], true);

// Or use User.can() which runs capability-check hook
const canEdit = await Reactium.User.can(['content.edit'], true);
```

### Example 3: Service Worker (Direct Extension + Lifecycle)

**File:** `@atomic-reactor/reactium-service-worker/reactium-hooks.js`

```javascript
import Reactium, { isBrowserWindow } from 'reactium-core/sdk';

// 1. Register SDK extension
Reactium.Hook.register(
    'sdk-init',
    async SDK => {
        const { default: ServiceWorker } = await import('./sdk');
        Reactium.ServiceWorker = ServiceWorker;
    },
    Reactium.Enums.highest,
    'REACTIUM-CORE-SDK-SERVICE-WORKER',
);

// 2. Initialize service worker instance
Reactium.Hook.register(
    'service-worker-init',
    async () => {
        if (!isBrowserWindow()) return;

        const { Workbox } = await import('workbox-window');
        const sw = new Workbox(Reactium.ServiceWorker.script, { scope: '/' });
        Reactium.ServiceWorker.worker = sw;

        sw.addEventListener('activated', event => {
            console.log(event.isUpdate ? 'SW updated' : 'SW activated');
        });

        await sw.register();
    },
    Reactium.Enums.priority.highest,
    'sw',
);

// 3. Trigger initialization at appropriate lifecycle point
Reactium.Hook.register(
    'dependencies-load',
    async () => {
        if (window.loadServiceWorker) {
            Reactium.ServiceWorker.init();
        } else {
            // Unregister in dev mode
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                registration.unregister();
            }
        }
    },
    Reactium.Enums.priority.highest,
    'service-worker-init',
);
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-service-worker/reactium-hooks.js:3-72`

**Pattern:** Multi-stage initialization using multiple hooks for different lifecycle phases.

## Core Plugins Using This Pattern

**All use `sdk-init` hook at `Enums.highest` priority:**

1. **User** (`@atomic-reactor/reactium-user`)
   - `Reactium.User` → auth, current, register, save, list, retrieve, roles, meta, prefs
   - Source: `reactium_modules/@atomic-reactor/reactium-user/reactium-hooks.js:3-11`

2. **API** (`@atomic-reactor/reactium-api`)
   - `Reactium.API` → APIRegistry with Actinium Parse SDK
   - Source: `reactium_modules/@atomic-reactor/reactium-api/reactium-hooks.js:4-15`

3. **Capability** (`@atomic-reactor/reactium-capability`)
   - `Reactium.Capability` → check capabilities, register custom checks
   - Source: `reactium_modules/@atomic-reactor/reactium-capability/reactium-hooks.js:4-12`

4. **Role** (`@atomic-reactor/reactium-role`)
   - `Reactium.Role` (alias: `Reactium.Roles`) → list, retrieve, create
   - Source: `reactium_modules/@atomic-reactor/reactium-role/reactium-hooks.js:3-14`

5. **Setting** (`@atomic-reactor/reactium-setting`)
   - `Reactium.Setting` → get, set, unset server-side settings
   - Source: `reactium_modules/@atomic-reactor/reactium-setting/reactium-hooks.js:3-11`

6. **ServiceWorker** (`@atomic-reactor/reactium-service-worker`)
   - `Reactium.ServiceWorker` → register, init, worker instance
   - Source: `reactium_modules/@atomic-reactor/reactium-service-worker/reactium-hooks.js:3-11`

7. **GraphQL** (`@reactium/graphql`)
   - `Reactium.API.GraphQL` → Apollo client (APIRegistry pattern)
   - Source: `Reactium-GraphQL-Plugin/reactium_modules/@reactium/graphql/reactium-hooks-graphql-client.js:4-42`

## Best Practices

### 1. Use `Enums.highest` Priority

**Why:** Ensures SDK extensions are available to other plugins during `init` and later hooks.

```javascript
Reactium.Hook.register(
    'sdk-init',
    async SDK => {
        // Extension code
    },
    Reactium.Enums.highest,  // ← CRITICAL
    'UNIQUE-SDK-EXTENSION-ID',
);
```

### 2. Lazy-Load Heavy Dependencies

**Why:** Reduces initial bundle size; dependencies only load when needed.

```javascript
// ✅ Good - dynamic import
Reactium.Hook.register('sdk-init', async SDK => {
    const { default: MySDK } = await import('./sdk');
    Reactium.MyFeature = MySDK;
});

// ❌ Bad - top-level import increases bundle
import MySDK from './sdk';
Reactium.Hook.register('sdk-init', async SDK => {
    Reactium.MyFeature = MySDK;
});
```

### 3. Use Unique Hook IDs

**Why:** Prevents collisions; enables debugging; allows unregistering specific extensions.

```javascript
Reactium.Hook.register(
    'sdk-init',
    async SDK => { /* ... */ },
    Reactium.Enums.highest,
    'MY-COMPANY-FEATURE-SDK',  // ← Namespaced, descriptive
);
```

### 4. Choose the Right Pattern

**Direct Extension when:**
- Simple utility or feature module
- No configuration needed
- Single responsibility
- Example: `Reactium.User`, `Reactium.Role`

**APIRegistry when:**
- External API client integration
- Configuration object needed
- Want pluggable multi-API support
- Example: `Reactium.API.GraphQL`, `Reactium.API.Actinium`

### 5. Document SDK Additions

```javascript
/**
 * @api {Object} Reactium.MyFeature MyFeature
 * @apiDescription Custom feature SDK extension
 * @apiName MyFeature
 * @apiGroup Reactium
 */
Reactium.MyFeature = {
    /**
     * @api {Function} MyFeature.doSomething() MyFeature.doSomething()
     * @apiParam {String} param Description
     * @apiSuccess {Object} result Description
     */
    doSomething: async (param) => { /* ... */ },
};
```

### 6. Protect Against Missing Dependencies

```javascript
Hook.register('sdk-init', async () => {
    if (!Reactium.API)
        throw new Error('@atomic-reactor/reactium-api module is required');

    Reactium.API.register('GraphQL', { api, config });
});
```

**Source:** `Reactium-GraphQL-Plugin/reactium_modules/@reactium/graphql/reactium-hooks-graphql-client.js:28-31`

## Common Gotchas

### 1. Wrong Priority → Extensions Not Available

**Problem:** Using default priority (`neutral`) means SDK extensions may not be ready when other plugins run during `init`.

```javascript
// ❌ Bad - other plugins won't see Reactium.MyFeature during init
Reactium.Hook.register('sdk-init', async () => {
    Reactium.MyFeature = SDK;
}, Reactium.Enums.neutral);  // ← TOO LOW

// ✅ Good - guaranteed available
Reactium.Hook.register('sdk-init', async () => {
    Reactium.MyFeature = SDK;
}, Reactium.Enums.highest);  // ← CORRECT
```

### 2. Sync vs Async Hook Execution

**Important:** `sdk-init` runs TWICE - once sync, once async:

```javascript
// @atomic-reactor/reactium-core/app/index.jsx:28-29
await Hook.run('sdk-init', Reactium);     // Async execution
Hook.runSync('sdk-init', Reactium);       // Sync execution
```

**Implication:** Your `sdk-init` handler should be idempotent or check if already initialized.

```javascript
// ✅ Safe - async import is fine, assignment is idempotent
Reactium.Hook.register('sdk-init', async SDK => {
    const { default: User } = await import('./sdk');
    Reactium.User = User;  // Same result on both calls
});
```

### 3. Proxy Fallback Confusion

**Problem:** Not understanding why `Reactium.Cloud` works when you never set it.

**Explanation:** Proxy chain:
1. `Reactium.Cloud` → not found
2. `Reactium.API.Cloud` → not found
3. `Reactium.API.Actinium.Cloud` → **found!** (Parse SDK)

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/index.js:33-41`

### 4. APIRegistry Naming Convention

**Problem:** `Reactium.API.GraphQLConfig` doesn't work.

**Cause:** The Proxy handler checks for `Config` suffix:

```javascript
const reg = /Config$/;
const [name] = prop.split(reg);  // 'GraphQLConfig' → 'GraphQL'
return reg.test(prop) ? target.config(name) : target.api(name);
```

**Solution:**
- `Reactium.API.GraphQL` → returns API
- `Reactium.API.GraphQLConfig` → returns config (note: suffix must be exactly "Config")

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-api/sdk/index.js:34-38`

### 5. Overwriting Core SDK Properties

**Protection exists but rarely used:**

```javascript
// The SDK Proxy set handler allows hook-based protection:
Reactium.Hook.register('reactium-sdk-set-prop', (prop, value) => {
    if (prop === 'Hook') {
        console.error('Cannot overwrite Reactium.Hook!');
        return { ok: false };  // Prevents assignment
    }
});
```

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/index.js:44-55`

**Best practice:** Avoid setting properties that conflict with core SDK (Hook, Enums, Component, Zone, Handle, Pulse, Prefs, Cache, Routing, State, AppContext).

## Testing SDK Extensions

```javascript
// Test that extension is registered correctly
describe('MyFeature SDK Extension', () => {
    it('should be available on Reactium object', () => {
        expect(Reactium.MyFeature).toBeDefined();
    });

    it('should have expected methods', () => {
        expect(typeof Reactium.MyFeature.doSomething).toBe('function');
    });

    it('should work through API registry', () => {
        expect(Reactium.API.MyAPI).toBeDefined();
        expect(Reactium.API.MyAPIConfig).toBeDefined();
    });
});

// Test hook registration
describe('sdk-init hook', () => {
    it('should register at highest priority', () => {
        const registrations = Reactium.Hook.list().filter(
            h => h.id === 'MY-SDK-EXTENSION'
        );
        expect(registrations[0].order).toBe(Reactium.Enums.highest);
    });
});
```

## When to Use This Pattern

**✅ Use SDK Extension Pattern when:**
- Building a plugin that provides utilities/services to other plugins
- Integrating external APIs (Parse, Apollo, REST clients)
- Creating cross-cutting concerns (auth, permissions, settings)
- Need global access without prop drilling

**❌ Don't use SDK Extension Pattern when:**
- Component-specific logic (use Component Registry instead)
- UI rendering (use Zone System instead)
- One-off utilities (just export from a module)
- Heavy dependencies that aren't always needed (lazy-load on demand, don't pollute SDK)

## Related Patterns

- **Component Registry** (`Reactium.Component.register()`) - For replaceable React components
- **Zone System** (`Reactium.Zone.addComponent()`) - For positioning UI in designated zones
- **Handle System** (`Reactium.Handle.register()`) - For observable state containers
- **Hook System** (`Reactium.Hook.register()`) - For lifecycle and event-driven extensions
- **[AppContext Provider System](APPCONTEXT_PROVIDER_SYSTEM.md)** - For registering React Context providers (commonly used with SDK extensions like Apollo, Redux)

## Summary

The SDK Extension Pattern uses the `sdk-init` hook to add namespaces, methods, and integrations to the global Reactium SDK. Two approaches exist:

1. **Direct Extension:** `Reactium.MyFeature = SDK` (simple utilities)
2. **APIRegistry:** `Reactium.API.register('Name', { api, config })` (external integrations)

The Reactium SDK uses a Proxy to enable fallback access chains, allowing seamless frontend/backend integration. All SDK extensions should register at `Enums.highest` priority to ensure availability throughout the application lifecycle.
