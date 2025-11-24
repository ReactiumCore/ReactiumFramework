# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the Reactium Framework monorepo containing multiple interconnected packages:

- **CLI**: The `reactium` command-line tool (`npx reactium`)
- **reactium-sdk-core**: Core SDK library with hooks, registries, and utilities (used by both Reactium and Actinium)
- **example-reactium-project**: Example Reactium application
- **Reactium-Core-Plugins**: Core plugins for Reactium applications
- **Reactium-Admin-Plugins**: Admin UI plugins for Reactium
- **Reactium-GraphQL-Plugin**: GraphQL integration plugin
- **Actinium-Plugins**: Plugins for the Actinium CMS backend

## Core Architecture Concepts

### The Two Frameworks

**Reactium** (Frontend): Plugin-based React framework with convention-based discovery, enhanced routing, and sophisticated state management.

**Actinium** (Backend): Plugin-based Node.js framework built on Parse Server and Express with hook-driven extensibility.

### Plugin System

Both frameworks use a hook-based plugin architecture where plugins are auto-discovered from workspace directories.

**Reactium Plugins** live in `reactium_modules/@atomic-reactor/*`
**Actinium Plugins** live in `actinium_modules/@atomic-reactor/*`

These are **npm workspaces** - any `@<realm>/<package-name>` in these directories becomes importable.

### Domain-Driven Design (DDD) Artifacts

Reactium organizes code by feature/domain rather than technical layer. Each component directory can contain:

**Browser-Side Files** (Reactium):
- `ComponentName.jsx` - React component
- `reactium-hooks-*.js` - Hook registrations (runs in browser during bootstrap)
- `reactium-route-*.js` or `route.js` - Route definitions (pattern: `/(routes?|reactium-routes?.*?)\.jsx?$/`)
- `_reactium-style.scss` - Component styles
- `reactium-webpack-*.js` - Webpack configuration extensions (modern pattern)

**Server-Side Files** (Reactium/Actinium):
- `reactium-boot.js` - Server bootstrap code (runs in Node/Express)

**Actinium Plugin Files**:
- `plugin.js` - Plugin registration (MUST execute immediately: `export default MOD()`)
- `info.js` - Plugin metadata (ID, version, dependencies, order)
- `sdk.js` - Plugin SDK methods (optional)

### Important: `@atomic-reactor/reactium-core` Replaces `.core`

The `@atomic-reactor/reactium-core` plugin provides core framework functionality. There is no `.core` directory in modern Reactium - this was replaced by the workspace plugin pattern. Same applies to `@atomic-reactor/actinium-core` for Actinium.

## SDK Architecture

### Reactium SDK

**Three import paths**:

1. `@atomic-reactor/reactium-sdk-core` - Standalone SDK (used by CLI, Actinium, Reactium)
   - `/core` - Server-safe utilities (Hook, Cache, Registry, Pulse, Enums)
   - `/browser` - Browser-only (Component, Zone, Handles, React hooks, Prefs)
   - Default import includes both

2. `@atomic-reactor/reactium-core/sdk` - Decorated SDK with additional singletons, hooks, utilities, and the full Routing system

3. `reactium-core/sdk` - Webpack alias to `@atomic-reactor/reactium-core/sdk`

**Recommendation**: In Reactium projects, import from `@atomic-reactor/reactium-core/sdk` or use the `reactium-core/sdk` alias.

### React Hooks from SDK

The SDK provides 16 React hooks in `/browser`:

**State Management**:
- `useSyncState` - Observable local state (alternative to useState)
- `useDerivedState` - Derived values from other state
- `useStatus` - Component lifecycle status tracking

**Handle System**:
- `useHandle` - Retrieve handle without subscribing (no re-render)
- `useSyncHandle` - Retrieve handle WITH subscription (re-renders on change)
- `useRegisterHandle` - Register a handle from a component
- `useRegisterSyncHandle` - Register handle with sync subscription
- `useSelectHandle` - Select specific properties from a handle

**Component Utilities**:
- `useRefs` - Manage multiple refs
- `useFocusEffect` - Execute callback when element gains focus
- `useScrollToggle` - Toggle behavior on scroll
- `useIsContainer` - Check if element contains another element
- `useHookComponent` - Dynamic component loading via hooks

**Effects**:
- `useAsyncEffect` - useEffect with async support
- `useEventEffect` - Subscribe to events with cleanup
- `useFullfilledObject` - Wait for object properties to be fulfilled

**Best Practice**: Use `useSyncHandle` (not `useHandle`) when you want component updates on state changes.

### Browser Utilities from SDK

**Component System**:
- `Component` registry - Register/retrieve replaceable components by string token
- `ComponentEvent` - Event system for component communication

**Zone System**:
- `Zone` - Render components in designated zones
- `Zones` - Multi-zone management
- `SimpleZone` - Basic zone implementation
- `PassThroughZone` - Zone that passes through to children

**State & Handles**:
- `Handle` - Observable state containers (like Redux store but simpler)
- `ReactiumSyncState` - Synchronous state object backing useSyncState

**UI Utilities**:
- `Fullscreen` - Fullscreen API wrapper
- `Prefs` - LocalStorage management with reactivity
- `cxFactory` - ClassNames utility factory
- `splitParts` - String parsing utility
- Window utilities - Window size, breakpoints, responsive helpers
- Breakpoint utilities - Media query helpers for responsive design

### Key SDK Registries

- **Hook** - Async/sync callbacks for lifecycle hooks
- **Component** - Registry for replaceable React components (string tokens)
- **Zone** - Registry for rendering components in designated zones via `<Zone />`
- **Handle** - Global component communication registry (see [CLAUDE/HANDLE_SYSTEM.md](/home/john/reactium-framework/CLAUDE/HANDLE_SYSTEM.md))
- **Pulse** - Recurring processes (like cron for React)
- **Prefs** - Local storage management
- **Cache** - Runtime object cache
- **Routing** - Enhanced routing system
- **State** - Global state handle (free global state with special React hook)

### SDK Proxy Pattern

The Reactium SDK uses a Proxy to enable fallback access to backend integration:

```javascript
// If Reactium.Cloud doesn't exist on SDK, falls through to:
// SDK.API.Actinium.Cloud
const result = await Reactium.Cloud.run('functionName', params);
```

This is an advanced detail - the proxy allows seamless frontend/backend integration.

## Development Commands

### Reactium Project Commands

```bash
# Development mode - runs Express with nodemon, webpack middleware with HMR, and BrowserSync
npm run local          # gulp local

# Production server (requires build first)
npm start              # node src/index.mjs

# Production build
npm run build          # cross-env NODE_ENV=production gulp

# Static site generation (exports front-end assets without Express instance)
npm run static         # gulp static

# Clean build artifacts
npm run clean          # gulp clean
```

**Key Difference**: `npm run local` provides full dev environment with hot reloading and watch tasks. `npm start` only runs the production server.

### Actinium Project Commands

Same as Reactium - both use `npm run local` for development with nodemon.

### CLI Commands

```bash
# Component scaffolding
npx reactium component

# Plugin installation from Reactium registry (NOT npm)
npx reactium install                    # Installs all reactiumDependencies/actiniumDependencies
npx reactium install @realm/package     # Installs specific module, updates package.json

# Plugin publishing to Reactium registry
npx reactium publish                    # From plugin root directory
```

**Important**: `npx reactium install` uses the **Reactium registry**, not npm. Plugins are installed to `reactium_modules/` or `actinium_modules/` as npm workspaces.

## Build System

### Manifest System

The manifest (`src/manifest.js`) is **auto-generated** at build time and scanned for DDD artifacts:

- **`allRoutes`** - From files matching `/(routes?|reactium-routes?.*?)\.jsx?$/`
- **`allHooks`** - From `reactium-hooks-*.js` files
- **`allServices`** - From service files (less common now)

**Manifest Auto-Updates**: During `npm run local`, Gulp **watches and regenerates** the manifest automatically when DDD artifact files are added/changed. You do NOT need to restart the server.

**Never Edit**: `src/manifest.js` is auto-generated. Changes will be overwritten.

### Gulpfile Delegation

Project gulpfiles delegate to core:

```javascript
// example-reactium-project/gulpfile.js
require('@atomic-reactor/reactium-core/gulpfile');
```

### Webpack Configuration

**Modern Pattern**: Use `reactium-webpack-*.js` files and the `ReactiumWebpack` SDK to extend webpack configuration.

**Legacy Pattern**: `webpack.override.js` still works but is deprecated.

## State Management

### 1. `useSyncState` - Local Component State

**Not the same as `useState`** - returns an observable object:

```javascript
const state = useSyncState({ count: 0 });

// Get values
const count = state.get('count');

// Set values
state.set('count', count + 1);

// Set multiple
state.set({ count: 10, name: 'Alice' });
```

**Why use it**: Synchronous (unlike `useState`), easier to pass around, integrates with Reactium's reactive systems.

### 2. `useHandle` vs `useSyncHandle` - Critical Difference

```javascript
// useHandle - retrieves but does NOT subscribe (no re-render on changes)
const handle = useHandle('MyHandleId');

// useSyncHandle - retrieves AND subscribes (component re-renders on changes)
const handle = useSyncHandle('MyHandleId');
```

**Use `useSyncHandle`** when you want reactive updates. You can manually subscribe with `useEventEffect` if using `useHandle`.

**For comprehensive details**, see [CLAUDE/HANDLE_SYSTEM.md](/home/john/reactium-framework/CLAUDE/HANDLE_SYSTEM.md).

### 3. Global State

`Reactium.State` is a free global state Handle with a special React hook to subscribe to it.

## Priority System (CRITICAL)

**Use `Enums.priority.neutral`, NOT `.normal`**

```javascript
import { Enums } from '@atomic-reactor/reactium-core/sdk';

// Correct priority values (from reactium-sdk-core/src/core/enums.ts)
Enums.priority.core      // -2000 (executes FIRST - framework core)
Enums.priority.highest   // -1000 (very high priority)
Enums.priority.high      // -500  (high priority)
Enums.priority.neutral   // 0     (default - NOT .normal, that doesn't exist!)
Enums.priority.low       // 500   (low priority)
Enums.priority.lowest    // 1000  (executes LAST)
```

**Lower numbers = HIGHER priority** (executes earlier). This is counterintuitive.

**CRITICAL BUG IN EXAMPLE CODE**: Many example files incorrectly use `Enums.priority.normal`, which does not exist in the source code. The actual enum defines `Enums.priority.neutral`. Using `.normal` returns `undefined`, which coincidentally evaluates to 0 in numeric sorting but is technically incorrect and could break in future versions.

**Always use `.neutral`** in your code. See CLAUDE/FRAMEWORK_GOTCHAS.md for detailed explanation.

## Hook System

### Browser-Side Hooks (Reactium)

Registered in `reactium-hooks-*.js` files during browser bootstrap:

```javascript
// Runs in browser during app initialization
const { Hook, Enums } = await import('@atomic-reactor/reactium-core/sdk');

Hook.register('plugin-init', async () => {
    // Plugin initialization
}, Enums.priority.neutral, 'my-plugin-id');
```

**Lifecycle Order** (browser-side - partial list):
```
plugin-dependencies → plugin-init → routes-init → register-route → init
```

### Server-Side Hooks (Reactium/Actinium)

Registered in `reactium-boot.js` (Reactium server) or `plugin.js` (Actinium):

```javascript
// Actinium example
Actinium.Hook.register('init', async (app, options) => {
    console.log('Actinium initialized');
}, Actinium.Enums.priority.neutral);
```

**Actinium-Specific Hooks**:
- `before-save-{ClassName}`, `after-save-{ClassName}` - Parse triggers
- `before-cloud-{functionName}`, `after-cloud-{functionName}` - Cloud function hooks
- `schema-created` - After database schemas initialized

## Routing System

### Route Object

```javascript
import { MyComponent as component } from './MyComponent';
import { Enums } from '@atomic-reactor/reactium-core/sdk';

export default [
    {
        id: 'route-MyComponent-1',
        exact: true,
        component,                    // Or string: 'MyComponent' (resolved via registry)
        path: '/my-path',
        order: Enums.priority.neutral,

        // Optional: data loading
        loadState: async ({ route, params, search }) => {
            return { data: await fetchData() };
        },
        handleId: 'MyHandle',         // Where loadState result is stored

        // Optional: transitions
        transitions: true,
        transitionStates: [
            { state: 'LOADING', active: 'current' },
            { state: 'READY', active: 'current' },
        ],
    },
];
```

### Route Discovery Process

1. **Build Time**: Gulp scans for files matching `/(routes?|reactium-routes?.*?)\.jsx?$/`
2. **Runtime**: Core fires `routes-init` hook, loads routes from manifest
3. **Per-Route**: Core fires `register-route` hook for each route (can modify/cancel)
4. **Registration**: Core calls `Reactium.Routing.register(route)`

### Data Loading with Static Methods

**Preferred pattern** - colocate loadState with component:

```javascript
export const MyComponent = () => {
    const handle = useSyncHandle(MyComponent.handleId);
    const data = handle?.get('data');

    return <div>{JSON.stringify(data)}</div>;
};

MyComponent.loadState = async ({ route, params, search }) => {
    const data = await fetchData(params);
    return { data, loading: false };
};

MyComponent.handleId = 'MyComponentHandle';
```

### Transition States

Transitions require **manual progression** - they don't auto-advance:

```javascript
import Reactium from '@atomic-reactor/reactium-core/sdk';
import { useEffect } from 'react';

export const MyPage = ({ transitionState }) => {
    useEffect(() => {
        if (transitionState === 'LOADING') {
            // Do loading work, then advance
            setTimeout(() => {
                Reactium.Routing.nextState();
            }, 500);
        }
    }, [transitionState]);

    return <div className={`state-${transitionState}`}>Content</div>;
};
```

## Actinium Backend

### ES Module Requirements

**Critical**: Actinium requires ES modules:
- `"type": "module"` in package.json
- Use `import`/`export`, not `require`/`module.exports`
- **File extensions required** for relative imports: `import './sdk.js'`

### Plugin Structure

```javascript
// plugin.js
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';
import SDK from './sdk.js';

const MOD = () => {
    // Optional: attach SDK to global Actinium object
    Actinium.MyPlugin = Actinium.MyPlugin || SDK;

    // Register plugin
    Actinium.Plugin.register(PLUGIN, true);  // true = activate immediately

    // Define Cloud Functions
    Actinium.Cloud.define(PLUGIN.ID, 'myFunction', async (req) => {
        const { param } = req.params;
        return SDK.doSomething(param);
    });
};

export default MOD();  // MUST execute immediately
```

```javascript
// info.js
export default {
    ID: 'MyPlugin',
    name: 'My Plugin',
    description: 'Plugin description',
    version: '1.0.0',
    pluginDependencies: [],    // Array of plugin IDs this depends on
    order: 100,                // Load order (lower = earlier)
    meta: {
        group: 'MyGroup',
        builtIn: false,
    },
};
```

### Master Key & Capabilities

Actinium has a full capabilities system in addition to Parse ACLs. You may need to:
- Use `{ useMasterKey: true }` for privileged operations
- Create user sessions for specific permissions
- Pass along request user sessions

Scan the Actinium core code for capability patterns.

### Middleware System

Middleware files are auto-discovered and registered with priority-based execution:

```javascript
Actinium.Middleware.register(
    'my-middleware',
    (app) => {
        app.use((req, res, next) => {
            // Middleware logic
            next();
        });
    },
    Actinium.Enums.priority.neutral,
    'middleware-id'
);
```

## Frontend/Backend Integration

### Parse SDK Initialization

**Don't initialize manually** - the `@atomic-reactor/reactium-api` module handles this for you.

### API Communication

**CORS Not Required by Default**: Reactium sets up an Express proxy to `REST_API_URL` on `/api` to avoid CORS issues. If you bypass the proxy, you'll need CORS configuration.

### Cloud Function Calls

In Actinium, use `Actinium.Cloud.define()` (not `Parse.Cloud.define()`) to get Actinium hook integration:

```javascript
// Frontend
const result = await Parse.Cloud.run('myFunction', { param: 'value' });

// Backend (Actinium)
Actinium.Cloud.define(PLUGIN.ID, 'myFunction', async (req) => {
    // req.params, req.user, req.master
    return { result: 'success' };
});
```

## Testing

This monorepo includes Cypress tests in the `cypress/` directory at the root. These are specific to testing this repository structure, not general framework testing guidance.

## Key Patterns

### Component Registration

```javascript
const { Hook, Component, Enums } = await import('@atomic-reactor/reactium-core/sdk');

Hook.register('plugin-init', async () => {
    const { MyComponent } = await import('./MyComponent');
    Component.register('MyComponent', MyComponent);
}, Enums.priority.neutral, 'my-component-init');
```

### Handle-Based Shared State

```javascript
import { Handle } from '@atomic-reactor/reactium-core/sdk';

const myHandle = new Handle('CartHandle', { items: [], total: 0 });
Handle.register('CartHandle', myHandle);

// Component A
const cartHandle = Handle.get('CartHandle');
cartHandle.set('items', [...items, newItem]);

// Component B (reactive)
const cartHandle = useSyncHandle('CartHandle');
const items = cartHandle?.get('items') || [];
```

### Hook-Based Plugin Architecture

```javascript
// Core feature provides hook
const context = await Reactium.Hook.run('before-checkout', cartData);

// Plugin extends behavior
Reactium.Hook.register('before-checkout', async (cartData, context) => {
    // Modify cart, add discount, validate, etc.
    context.discount = await calculateDiscount(cartData);
}, Enums.priority.neutral);
```

## Common Gotchas

1. **Priority Enum**: Use `.neutral` not `.normal` (`.normal` returns `undefined`)
2. **Manifest Updates**: Auto-regenerated during `npm run local` via Gulp watch
3. **`useSyncState`**: Returns object with `.get()`/`.set()`, not array like `useState`
4. **`useHandle` vs `useSyncHandle`**: Only `useSyncHandle` triggers re-renders
5. **Actinium ES Modules**: File extensions required for relative imports
6. **Plugin Execution**: `export default MOD()` - must execute immediately
7. **Transition States**: Require manual `Reactium.Routing.nextState()` calls
8. **CORS**: Usually not needed - Reactium proxies through `/api`
9. **Hook Naming**: Hooks follow React conventions - all start with `use`, only call from components/hooks
10. **Zone vs Component Registry**: Zones are for positioning UI, Component registry is for replaceable components

## Development Workflow

1. **Frontend Development**:
   - `cd example-reactium-project`
   - `npm run local` (starts dev server with HMR and BrowserSync)
   - Manifest auto-regenerates on file changes
   - Edit components in `src/app/components/`

2. **Backend Development** (if using Actinium):
   - `cd api` (or equivalent Actinium project)
   - `npm run local` (starts server with nodemon)
   - Edit plugins in `src/app/`

3. **Production Build**:
   - `npm run build` (creates production assets)
   - `npm start` (runs production server)

## Node/NPM Version Requirements

- **Example Reactium Project**: Node 18.x, NPM 9.x
- **CLI**: Node >=18.12.1, NPM >=9.1.1
- **Actinium**: Node 20.0.0, NPM 9.6.4

## Additional Resources

For comprehensive framework documentation, see the `CLAUDE/` directory which contains detailed guides on:
- REACTIUM_FRAMEWORK.md
- ACTINIUM_FRAMEWORK.md
- FRAMEWORK_PATTERNS.md
- FRAMEWORK_INTEGRATION.md
- FRAMEWORK_GOTCHAS.md
