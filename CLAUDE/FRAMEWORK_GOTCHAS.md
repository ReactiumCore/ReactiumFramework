<!-- v1.0.0 -->

# Reactium & Actinium Framework Gotchas and Troubleshooting Guide

> **Purpose**: This guide catalogs common pitfalls, confusing behaviors, debugging strategies, and solutions for issues developers encounter when working with Reactium and Actinium frameworks.

## Table of Contents

1. [Reactium Gotchas](#reactium-gotchas)
2. [Actinium Gotchas](#actinium-gotchas)
3. [Integration Gotchas](#integration-gotchas)
4. [Build System Gotchas](#build-system-gotchas)
5. [Debugging Strategies](#debugging-strategies)
6. [Common Error Messages](#common-error-messages)

---

## Reactium Gotchas

### Gotcha 1: The Manifest is Sacred

**Problem**: Changes to component/route files don't appear in the application.

**Explanation**: The manifest (`src/manifest.js`) is auto-generated at build time. It doesn't update during development unless you restart the dev server or manually regenerate it.

**Symptoms**:

- New `reactium-route-*.js` file added but route doesn't work
- New `reactium-hooks-*.js` file added but hook doesn't fire
- Renamed files still reference old paths

**Solution**:

```bash
# Option 1: Regenerate manifest manually
npx reactium manifest

# Option 2: Restart dev server (auto-regenerates)
npm run local  # Ctrl+C first to stop current server
```

**Warning**: NEVER edit `src/manifest.js` manually. Your changes will be overwritten.

---

### Gotcha 2: `useSyncState` Is Not `useState`

**Problem**: Treating `useSyncState` like React's `useState` causes confusion.

**Bad Code**:

```javascript
const [count, setCount] = useSyncState({ count: 0 }); // Wrong!
console.log(count); // Logs entire object, not 0
```

**Correct Code**:

```javascript
const state = useSyncState({ count: 0 });
console.log(state.get('count')); // Logs 0

// Setting values
state.set('count', state.get('count') + 1);

// Setting multiple values
state.set({
  count: 10,
  name: 'Updated',
});
```

**Key Differences**:

- `useSyncState` returns an observable object, not a value
- Access via `.get(key)`
- Update via `.set(key, value)` or `.set(object)`
- The state object itself remains the same reference

---

### Gotcha 3: Hook Registration Must Be in IIFE

**Problem**: Hook registration code doesn't execute.

**Bad Code**:

```javascript
// reactium-hooks-mycomponent.js
const { Hook, Component } = await import('reactium-core/sdk');

Hook.register('plugin-init', async () => {
  // This never runs!
  Component.register('MyComponent', MyComponent);
});
```

**Why It Fails**: Top-level `await` without IIFE doesn't execute on file import.

**Correct Code**:

```javascript
// reactium-hooks-mycomponent.js
(async () => {
  const { Hook, Component } = await import('reactium-core/sdk');

  Hook.register('plugin-init', async () => {
    const { MyComponent } = await import('./MyComponent');
    Component.register('MyComponent', MyComponent);
  });
})(); // Immediately invoked!
```

---

### Gotcha 4: Route Path Syntax Matters

**Problem**: Routes don't match expected URLs.

**Common Mistakes**:

```javascript
// WRONG - empty path
export default [
    {
        path: ,  // Syntax error or undefined
        component: MyComponent,
    },
];

// WRONG - missing leading slash
export default [
    {
        path: 'my-route',  // Won't match, needs leading /
        component: MyComponent,
    },
];

// WRONG - trailing slash inconsistency
export default [
    {
        path: '/my-route/',  // Exact match won't work without trailing slash
        exact: true,
        component: MyComponent,
    },
];
```

**Correct**:

```javascript
export default [
  {
    path: '/my-route', // Always start with /
    exact: true,
    component: MyComponent,
  },
  {
    path: '/user/:userId', // URL parameters
    exact: true,
    component: UserProfile,
  },
  {
    path: ['/about', '/about-us'], // Multiple paths
    component: About,
  },
];
```

---

### Gotcha 5: `Enums.priority.normal` Does Not Exist (CRITICAL BUG)

**Problem**: Code uses `Enums.priority.normal` which returns `undefined`.

**Why It Accidentally Works**: `undefined` coerces to `0` in numeric sorting, which equals `neutral = 0`.

**The Bug**: The TypeScript source (`reactium-sdk-core/src/core/enums.ts`) defines `neutral`, NOT `normal`. Using `.normal` returns `undefined`.

**Existing Application Code Has This Bug**: All component hooks in `/ui/src/` and `/learning/src/` currently use `.normal`.

**Correct Code**:

```javascript
// WRONG - returns undefined, accidentally works
Hook.register('plugin-init', callback, Enums.priority.normal);

// CORRECT - use neutral
Hook.register('plugin-init', callback, Enums.priority.neutral);
```

**Action Required**: Replace all `.normal` with `.neutral` throughout application code.

---

### Gotcha 6: Priority Numbers Are Counterintuitive

**Problem**: Higher priority numbers execute later, not earlier.

**Confusing Truth**: Lower numbers = higher priority = execute first

```javascript
Enums.priority.core = -2000; // Core framework (HIGHEST - runs first)
Enums.priority.highest = -1000; // Very high priority
Enums.priority.high = -500; // High priority
Enums.priority.neutral = 0; // Default
Enums.priority.low = 500; // Low priority
Enums.priority.lowest = 1000; // LOWEST - runs last
```

**Example**:

```javascript
// Plugin A - wants to run first
Hook.register('init', setupA, Enums.priority.high); // -500

// Plugin B - wants to run after A
Hook.register('init', setupB, Enums.priority.neutral); // 0

// Plugin C - wants to run last
Hook.register('init', setupC, Enums.priority.low); // 500

// Execution order: A → B → C
```

---

### Gotcha 11: `useHandle` vs `useSyncHandle`

**Problem**: Component doesn't re-render when Handle data changes.

**Explanation**: `useHandle` retrieves a Handle but does NOT subscribe to changes. `useSyncHandle` subscribes and triggers re-renders.

**Bad Code**:

```javascript
const ComponentA = () => {
  const handle = useHandle('MyHandle'); // No subscription!
  const data = handle?.get('data');

  // Component won't re-render when handle.set('data', newData) is called
  return <div>{data}</div>;
};
```

**Correct Code**:

```javascript
const ComponentA = () => {
  const handle = useSyncHandle('MyHandle'); // Subscribes to changes
  const data = handle?.get('data');

  // Component re-renders automatically when data changes
  return <div>{data}</div>;
};
```

**When to Use Each**:

- `useSyncHandle`: When component needs to re-render on data changes (most common)
- `useHandle`: When you only need to read/write data without re-rendering

---

### Gotcha 11: Transition State Requires Manual Progression

**Problem**: Component hangs in LOADING state forever.

**Explanation**: Reactium doesn't automatically advance transition states. Your component must call `Reactium.Routing.nextState()`.

**Bad Code**:

```javascript
export const MyPage = ({ transitionState }) => {
  // Expects automatic progression from LOADING → READY
  // Will hang in LOADING forever!

  return <div>{transitionState}</div>;
};

// Route config
export default [
  {
    path: '/my-page',
    component: MyPage,
    transitions: true,
    transitionStates: [
      { state: 'LOADING', active: 'current' },
      { state: 'READY', active: 'current' },
    ],
  },
];
```

**Correct Code**:

```javascript
import Reactium from 'reactium-core/sdk';
import { useEffect } from 'react';

export const MyPage = ({ transitionState }) => {
  useEffect(() => {
    if (transitionState === 'LOADING') {
      // Manually advance to next state
      setTimeout(() => {
        Reactium.Routing.nextState();
      }, 500);
    }
  }, [transitionState]);

  if (transitionState === 'LOADING') {
    return <div>Loading...</div>;
  }

  return <div>Page Content</div>;
};
```

---

### Gotcha 11: Handle IDs Must Be Unique (or Intentionally Shared)

**Problem**: Multiple routes/components overwrite each other's data.

**Explanation**: If multiple components use the same `handleId`, they share the same Handle instance and data.

**Symptom**:

```javascript
// Component A
ComponentA.handleId = 'DataHandle';
ComponentA.loadState = async () => ({ dataA: 'A' });

// Component B
ComponentB.handleId = 'DataHandle'; // Same handleId!
ComponentB.loadState = async () => ({ dataB: 'B' });

// When navigating between routes, data gets overwritten
```

**Solution**: Use unique Handle IDs unless you intentionally want to share state:

```javascript
ComponentA.handleId = 'ComponentAHandle';
ComponentB.handleId = 'ComponentBHandle';
```

**Intentional Sharing**:

```javascript
// If you want components to share data, use same handleId
UserProfile.handleId = 'UserData';
UserSettings.handleId = 'UserData'; // Shares user data
```

---

### Gotcha 11: Component Registration Timing

**Problem**: `useHookComponent` returns `null` even though component is registered.

**Explanation**: Component must be registered during `plugin-init` hook, before the component tries to use it.

**Bad Code**:

```javascript
// Registering too late
Hook.register(
  'routes-init',
  async () => {
    Component.register('MyComponent', MyComponent);
  },
  priority
);

// Component that tries to use it
const Container = () => {
  const MyComp = useHookComponent('MyComponent');
  // MyComp is null - not registered yet!
};
```

**Correct Code**:

```javascript
// Register during plugin-init (earlier lifecycle)
Hook.register(
  'plugin-init',
  async () => {
    const { MyComponent } = await import('./MyComponent');
    Component.register('MyComponent', MyComponent);
  },
  Enums.priority.neutral
);
```

---

### Gotcha 11: Default Props and Route Props Collision

**Problem**: Route props overwrite component's default props unexpectedly.

**Explanation**: When Reactium renders a component from a route, it passes route-specific props (`params`, `search`, `handleId`, etc.) that can overwrite default props.

**Example**:

```javascript
export const MyComponent = ({ handleId }) => {
  // If route defines handleId, it overwrites this default
  console.log(handleId);
};

MyComponent.defaultProps = {
  handleId: 'DefaultHandle',
};

// Route
export default [
  {
    path: '/my-route',
    component: MyComponent,
    handleId: 'RouteHandle', // Overwrites default!
  },
];
```

**Solution**: Be aware of this behavior and use unique prop names if you need both:

```javascript
export const MyComponent = ({ routeHandleId, componentHandleId }) => {
  const handleId = routeHandleId || componentHandleId;
};
```

---

## Actinium Gotchas

### Gotcha 11: ES Module Syntax Required

**Problem**: `require()` causes cryptic errors.

**Explanation**: Actinium requires `"type": "module"` in `package.json`. CommonJS (`require`, `module.exports`) doesn't work.

**Bad Code**:

```javascript
const Actinium = require('@atomic-reactor/actinium-core'); // Error!
module.exports = MyClass; // Error!
```

**Error Messages**:

- `ReferenceError: require is not defined`
- `ReferenceError: module is not defined`
- `ReferenceError: exports is not defined`

**Correct Code**:

```javascript
import Actinium from '@atomic-reactor/actinium-core';
export default MyClass;
```

---

### Gotcha 12: File Extensions Required for Relative Imports

**Problem**: Import statements fail even though file exists.

**Bad Code**:

```javascript
import SDK from './sdk'; // Error: Cannot find module
import config from './config'; // Error: Cannot find module
```

**Correct Code**:

```javascript
import SDK from './sdk.js'; // Must include .js
import config from './config.js';
```

**Note**: Node package imports don't need extensions:

```javascript
import express from 'express'; // OK - no extension needed for packages
```

---

### Gotcha 13: Plugin Function Must Execute

**Problem**: Plugin doesn't load even though file exists.

**Bad Code**:

```javascript
// plugin.js
const MOD = () => {
  Actinium.Plugin.register(PLUGIN, true);
  // Registration code
};

export default MOD; // Function reference, never called!
```

**Symptom**: No console logs, Cloud Functions don't register, hooks don't fire.

**Correct Code**:

```javascript
// plugin.js
const MOD = () => {
  Actinium.Plugin.register(PLUGIN, true);
  console.log('MyPlugin loaded'); // Should see this on startup
};

export default MOD(); // Execute immediately with ()
```

---

### Gotcha 14: Cloud Function Naming Conflicts

**Problem**: Cloud Function doesn't work or overwrites another function.

**Explanation**: Cloud Function names must be globally unique across all plugins. Last-registered function wins.

**Bad Code**:

```javascript
// Plugin A
Actinium.Cloud.define(PLUGIN_A.ID, 'getData', handlerA);

// Plugin B
Actinium.Cloud.define(PLUGIN_B.ID, 'getData', handlerB);
// Overwrites Plugin A's getData!
```

**Solution**: Use descriptive, namespaced names:

```javascript
// Plugin A
Actinium.Cloud.define(PLUGIN_A.ID, 'pluginA.getData', handlerA);

// Plugin B
Actinium.Cloud.define(PLUGIN_B.ID, 'pluginB.getData', handlerB);
```

---

### Gotcha 15: Master Key Usage in Cloud Functions

**Problem**: Parse queries fail with "Permission denied" even in Cloud Functions.

**Explanation**: ACLs apply even in Cloud Functions unless you use `{ useMasterKey: true }`.

**Bad Code**:

```javascript
Actinium.Cloud.define(PLUGIN.ID, 'getPrivateData', async (req) => {
  const query = new Actinium.Query('PrivateData');
  const results = await query.find(); // May fail due to ACLs
  return results;
});
```

**Correct Code**:

```javascript
Actinium.Cloud.define(PLUGIN.ID, 'getPrivateData', async (req) => {
  // Verify user authorization first
  if (!req.user) {
    throw new Error('Authentication required');
  }

  // Use master key for backend operations
  const query = new Actinium.Query('PrivateData');
  const results = await query.find({ useMasterKey: true });
  return results;
});
```

**Security Warning**: Always validate permissions before using master key. Master key bypasses ALL ACLs.

---

### Gotcha 16: Async Hook Errors Are Swallowed

**Problem**: Hook fails silently, no error visible.

**Explanation**: Actinium's hook system catches errors to prevent one plugin from crashing the app. Errors are logged but not thrown.

**Bad Code**:

```javascript
Actinium.Hook.register(
  'init',
  async () => {
    const result = await riskyOperation(); // Throws error
    // Error is logged to console but swallowed
  },
  priority
);
```

**How to Debug**:

```javascript
Actinium.Hook.register(
  'init',
  async () => {
    try {
      const result = await riskyOperation();
    } catch (error) {
      console.error('ERROR in init hook:', error);
      console.error(error.stack);
      // Re-throw if critical
      throw error;
    }
  },
  priority
);
```

**Check Logs**: Always check server console for hook errors.

---

### Gotcha 17: Schema Changes Require Server Restart

**Problem**: Schema modifications don't take effect.

**Explanation**: Parse Server caches schema definitions. Changes require restart.

**Symptom**:

- Added new field in `schema-created` hook
- Queries don't return new field
- Frontend can't save new field

**Solution**:

```bash
# Restart Actinium server
npm start  # Stop with Ctrl+C first
```

**Best Practice**: Define schemas completely upfront to avoid mid-development restarts:

```javascript
Actinium.Hook.register(
  'schema-created',
  async () => {
    const schema = new Actinium.Schema('MyClass');

    // Define ALL fields at once
    schema.addString('field1');
    schema.addString('field2');
    schema.addNumber('field3');
    // ... etc

    await schema.save(null, { useMasterKey: true });
  },
  priority
);
```

---

### Gotcha 18: Plugin Order Matters

**Problem**: Plugin B fails because Plugin A hasn't loaded yet.

**Explanation**: Plugins load in order based on the `order` property in `info.js`. If Plugin B depends on Plugin A, A must have a lower order number.

**Bad Code**:

```javascript
// Plugin A (depended upon)
const PLUGIN_A = {
  ID: 'PluginA',
  order: 200, // Loads second
};

// Plugin B (depends on A)
const PLUGIN_B = {
  ID: 'PluginB',
  order: 100, // Loads first - Plugin A not ready yet!
  pluginDependencies: ['PluginA'],
};
```

**Correct Code**:

```javascript
// Plugin A
const PLUGIN_A = {
  ID: 'PluginA',
  order: 100, // Lower number = loads first
};

// Plugin B
const PLUGIN_B = {
  ID: 'PluginB',
  order: 200, // Higher number = loads after dependencies
  pluginDependencies: ['PluginA'],
};
```

**Guideline**:

- Core plugins: `order: 100`
- Normal plugins: `order: 100-500`
- Plugins depending on many others: `order: 500+`

---

### Gotcha 19: Middleware Order Is Critical

**Problem**: Middleware doesn't work or causes errors.

**Explanation**: Middleware executes in priority order. CORS must be first, body parsers early, error handlers last.

**Bad Code**:

```javascript
// Error handler registered early - won't catch errors!
Actinium.Middleware.register(
  'error-handler',
  (app) => {
    app.use((err, req, res, next) => {
      /* ... */
    });
  },
  Actinium.Enums.priority.neutral // Too early!
);
```

**Correct Code**:

```javascript
// CORS - highest priority
Actinium.Middleware.register(
  'cors',
  (app) => app.use(cors()),
  Actinium.Enums.priority.highest
);

// Body parser - high priority
Actinium.Middleware.register(
  'body-parser',
  (app) => app.use(express.json()),
  Actinium.Enums.priority.high
);

// Custom routes - normal priority
Actinium.Middleware.register(
  'custom-routes',
  (app) => app.get('/api/custom', handler),
  Actinium.Enums.priority.neutral
);

// Error handler - lowest priority (must be last!)
Actinium.Middleware.register(
  'error-handler',
  (app) => {
    app.use((err, req, res, next) => {
      /* ... */
    });
  },
  Actinium.Enums.priority.lowest
);
```

---

### Gotcha 20: Parse Cloud Functions vs Actinium Cloud Functions

**Problem**: Using `Parse.Cloud.define()` bypasses plugin gating.

**Explanation**: `Actinium.Cloud.define()` adds plugin gating, ensuring function only works if plugin is active. `Parse.Cloud.define()` doesn't.

**Bad Code**:

```javascript
// No plugin gating!
Parse.Cloud.define('myFunction', async (req) => {
  // This runs even if plugin is deactivated
});
```

**Correct Code**:

```javascript
// Plugin gating included
Actinium.Cloud.define(PLUGIN.ID, 'myFunction', async (req) => {
  // This only runs if plugin is active
});
```

---

## Integration Gotchas

### Gotcha 21: Parse SDK Must Be Initialized

**Problem**: `Parse.Cloud.run()` returns errors like "Application ID not found".

**Explanation**: Parse SDK must be initialized with App ID and Server URL before use.

**Symptom**:

- `Parse is not configured correctly`
- `XMLHttpRequest cannot load`
- `Application ID not found`

**Solution**:

```javascript
// Frontend initialization (Reactium)
// In reactium-hooks-App.js or similar
Hook.register(
  'plugin-init',
  async () => {
    Parse.initialize(
      process.env.REACT_APP_PARSE_APP_ID,
      process.env.REACT_APP_PARSE_JS_KEY
    );
    Parse.serverURL = process.env.REACT_APP_PARSE_SERVER_URL;

    console.log('Parse SDK initialized');
  },
  Enums.priority.highest
);
```

**Environment Variables**:

```bash
# ui/.env
REACT_APP_PARSE_APP_ID=your-app-id
REACT_APP_PARSE_JS_KEY=your-js-key
REACT_APP_PARSE_SERVER_URL=http://localhost:9000/parse
```

---

### Gotcha 22: CORS Errors

**Problem**: Frontend can't communicate with backend, CORS errors in console.

**Error Messages**:

- `Access to fetch at 'http://localhost:9000/...' has been blocked by CORS policy`
- `No 'Access-Control-Allow-Origin' header is present`

**Solution**: Ensure CORS middleware is registered in Actinium with correct origins.

```javascript
// api/src/app/cors/middleware.js
import Actinium from '@atomic-reactor/actinium-core';
import cors from 'cors';

Actinium.Middleware.register(
  'cors',
  (app) => {
    const allowedOrigins = [
      'http://localhost:3000', // Reactium dev server
      'http://localhost:3030', // Alternative port
      process.env.FRONTEND_URL, // Production URL
    ].filter(Boolean);

    app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (mobile apps, Postman)
          if (!origin) return callback(null, true);

          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true, // Important for cookies/sessions
      })
    );
  },
  Actinium.Enums.priority.highest // Must be first!
);
```

---

### Gotcha 23: Session Tokens and Authentication

**Problem**: Authenticated Cloud Function calls fail with "Invalid session token".

**Explanation**: Parse session tokens must be passed explicitly or stored in browser.

**Bad Code** (Frontend):

```javascript
// User logs in
const user = await Parse.User.logIn('username', 'password');

// Later, in different component/session
// Session token not automatically sent
const result = await Parse.Cloud.run('protectedFunction');
// Error: Invalid session token
```

**Correct Code**:

```javascript
// Parse SDK automatically stores session token in browser
const user = await Parse.User.logIn('username', 'password');

// Session token automatically sent with subsequent requests
const result = await Parse.Cloud.run('protectedFunction');
// Works!

// Check current user
const currentUser = Parse.User.current();
console.log('Logged in as:', currentUser?.get('username'));

// Logout
await Parse.User.logOut();
```

**Backend Cloud Function**:

```javascript
Actinium.Cloud.define(PLUGIN.ID, 'protectedFunction', async (req) => {
  // req.user is automatically populated if valid session token sent
  if (!req.user) {
    throw new Parse.Error(
      Parse.Error.INVALID_SESSION_TOKEN,
      'Authentication required'
    );
  }

  // User is authenticated, proceed
  return { userId: req.user.id };
});
```

---

### Gotcha 24: Environment Variable Naming

**Problem**: Environment variables not accessible in code.

**Explanation**: Reactium (Webpack) only exposes variables starting with `REACT_APP_`.

**Bad Code**:

```javascript
// .env
API_URL=http://localhost:9000

// In React component
console.log(process.env.API_URL);  // undefined!
```

**Correct Code**:

```javascript
// .env
REACT_APP_API_URL=http://localhost:9000

// In React component
console.log(process.env.REACT_APP_API_URL);  // Works!
```

**Actinium** (Node.js) doesn't have this restriction:

```javascript
// api/.env
DATABASE_URI=mongodb://localhost:27017/mydb

// In Actinium code
console.log(process.env.DATABASE_URI);  // Works!
```

---

## Build System Gotchas

### Gotcha 25: Hot Module Replacement Breaks State

**Problem**: Component state resets unexpectedly during development.

**Explanation**: Webpack HMR can't preserve all state. Some state patterns break during hot reload.

**Symptom**:

- Edit component file
- Save
- Form inputs clear
- User logged out
- Handle data disappears

**Workaround**:

```javascript
// Option 1: Store critical state in localStorage
useEffect(() => {
  const savedState = localStorage.getItem('myComponentState');
  if (savedState) {
    state.set(JSON.parse(savedState));
  }
}, []);

useEffect(() => {
  localStorage.setItem('myComponentState', JSON.stringify(state.get()));
}, [state.get()]);

// Option 2: Use Reactium global state (survives HMR better)
Reactium.State.set('criticalData', data);

// Option 3: Just refresh the page manually during development
```

---

### Gotcha 26: Build Artifacts Not Cleaned

**Problem**: Stale build artifacts cause confusing errors.

**Symptom**:

- Old component still renders after deletion
- Routes don't update
- Styles from deleted files still apply

**Solution**:

```bash
# Clean build
npm run clean

# Rebuild
npm run build
# or
npm run local
```

**Reactium clean script** (if available):

```bash
cd ui
rm -rf .cli-cache .tmp public/assets
npm run local
```

---

### Gotcha 27: Port Conflicts

**Problem**: Dev server won't start, port already in use.

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:

```bash
# Option 1: Kill process on port
lsof -ti:3000 | xargs kill -9

# Option 2: Use different port
PORT=3030 npm run local
```

**Check what's using the port**:

```bash
lsof -i :3000
# or
netstat -anv | grep 3000
```

---

## Debugging Strategies

### Strategy 1: Enable Verbose Logging

**Reactium**:

```javascript
// Add to reactium-hooks file
Reactium.Hook.register(
  'plugin-init',
  async () => {
    console.log('[DEBUG] Plugin init running');

    // Log all hook executions
    Reactium.Hook.register(
      '*',
      async (hookName) => {
        console.log('[HOOK]', hookName);
      },
      Reactium.Enums.priority.lowest
    );
  },
  priority
);
```

**Actinium**:

```javascript
// In plugin.js
const MOD = () => {
  console.log('[PLUGIN] MyPlugin loading...');

  Actinium.Plugin.register(PLUGIN, true);
  console.log('[PLUGIN] MyPlugin registered');

  // Log all hooks
  Actinium.Hook.register(
    'init',
    async () => {
      console.log('[HOOK] init fired');
    },
    Actinium.Enums.priority.lowest
  );
};
```

---

### Strategy 2: Inspect Registered Components/Routes

**Reactium**:

```javascript
// In browser console
Reactium.Component.list;
// Shows all registered components

Reactium.Routing.routes;
// Shows all registered routes

Reactium.Hook.list();
// Shows all registered hooks
```

**Actinium**:

```javascript
// In server console or Cloud Function
console.log(Actinium.Plugin.list);
// Shows all plugins

console.log(Actinium.Hook.list());
// Shows all hooks
```

---

### Strategy 3: Parse Query Debugging

**Problem**: Query returns unexpected results or nothing.

**Solution**:

```javascript
const query = new Parse.Query('MyClass');
query.equalTo('field', 'value');

// Enable query logging
query
  ._getRequestTask()
  .then((task) => console.log('Query:', task.request))
  .catch((err) => console.error('Query error:', err));

// Check query JSON
console.log('Query JSON:', query.toJSON());

// Try with master key
const results = await query.find({ useMasterKey: true });
console.log('Results:', results);

// Check ACLs on results
results.forEach((obj) => {
  console.log('ACL:', obj.getACL()?.toJSON());
});
```

---

### Strategy 4: Network Inspector

**Problem**: Cloud Function calls fail, unsure why.

**Solution**: Use browser DevTools Network tab.

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Call Cloud Function
5. Inspect request/response

**Look for**:

- Request URL: Is it correct?
- Request headers: Is session token included?
- Request payload: Are parameters correct?
- Response status: 200 OK, 400 Bad Request, 401 Unauthorized, etc.
- Response body: Error message details

---

### Strategy 5: React DevTools

**Problem**: Component not rendering expected data.

**Solution**: Use React DevTools browser extension.

1. Install React DevTools
2. Open DevTools
3. Go to "Components" tab
4. Select your component
5. Inspect props, state, hooks

**Check**:

- Are props passed correctly?
- Is handle data populated?
- Is component even rendering?

---

### Strategy 6: Actinium Server Logs

**Problem**: Backend errors not visible.

**Solution**: Watch server logs in real-time.

```bash
# Run server in foreground to see logs
cd api
npm start

# Or use pm2 for persistent logging
pm2 start src/index.js --name actinium
pm2 logs actinium --lines 100
```

**Enable debug mode**:

```javascript
// api/.env
DEBUG=*
NODE_ENV=development
```

---

## Common Error Messages

### Error: "Cannot find module './xyz'"

**Cause**: Missing file extension or wrong path.

**Solution**:

```javascript
// Add .js extension
import xyz from './xyz.js';

// Check file actually exists
// Check capitalization (case-sensitive on Linux/Mac)
```

---

### Error: "Hook 'xyz' not found"

**Cause**: Typo in hook name or hook not registered yet.

**Solution**:

```javascript
// Check hook name spelling
Reactium.Hook.run('plugin-init'); // Correct
Reactium.Hook.run('plugin-initialize'); // Wrong!

// Check hook was registered
console.log(Reactium.Hook.list());
```

---

### Error: "Cannot read property 'get' of undefined"

**Cause**: Handle not initialized or `useHandle` instead of `useSyncHandle`.

**Solution**:

```javascript
// Check handle exists
const handle = useSyncHandle('MyHandle');
if (!handle) {
  console.error('Handle not registered:', 'MyHandle');
  return <div>Loading...</div>;
}

const data = handle.get('data');
```

---

### Error: "Application ID not found"

**Cause**: Parse SDK not initialized or wrong credentials.

**Solution**:

```javascript
// Check initialization
Parse.initialize(APP_ID, JS_KEY);
Parse.serverURL = 'http://localhost:9000/parse';

// Check credentials match backend
// Check .env file loaded correctly
console.log('APP_ID:', process.env.REACT_APP_PARSE_APP_ID);
```

---

### Error: "Invalid session token"

**Cause**: User not logged in or token expired.

**Solution**:

```javascript
// Check current user
const currentUser = Parse.User.current();
if (!currentUser) {
  // Redirect to login
  window.location.href = '/login';
}

// Re-login if token expired
try {
  await Parse.Cloud.run('myFunction');
} catch (error) {
  if (error.code === Parse.Error.INVALID_SESSION_TOKEN) {
    await Parse.User.logOut();
    window.location.href = '/login';
  }
}
```

---

### Error: "Permission denied"

**Cause**: ACL restrictions or missing capability.

**Solution**:

```javascript
// Backend - use master key for privileged operations
const query = new Actinium.Query('MyClass');
const results = await query.find({ useMasterKey: true });

// Frontend - ensure user logged in
const currentUser = Parse.User.current();
if (!currentUser) {
  throw new Error('Login required');
}
```

---

## Summary

Key Takeaways:

1. **Manifest is auto-generated** - Never edit manually, regenerate instead
2. **Hooks need IIFE** - Wrap with `(async () => { ... })()`
3. **ES Modules required** - Use `import`/`export`, include `.js` extensions
4. **Plugin functions must execute** - `export default MOD()`
5. **Priority numbers are inverted** - Lower = higher priority
6. **Use master key in backend** - ACLs apply even in Cloud Functions
7. **Initialize Parse SDK** - Required before any Parse operations
8. **CORS must be configured** - Allow frontend origins in Actinium
9. **Restart after schema changes** - Parse caches schemas
10. **Check logs first** - Most issues visible in console output

When debugging:

- Check console logs (browser and server)
- Inspect network requests
- Verify hook/component registration
- Test with master key to rule out ACLs
- Restart servers after config/schema changes

For more details, see:

- [REACTIUM_FRAMEWORK.md](REACTIUM_FRAMEWORK.md)
- [ACTINIUM_FRAMEWORK.md](ACTINIUM_FRAMEWORK.md)
- [FRAMEWORK_PATTERNS.md](FRAMEWORK_PATTERNS.md)
- [FRAMEWORK_INTEGRATION.md](FRAMEWORK_INTEGRATION.md)
