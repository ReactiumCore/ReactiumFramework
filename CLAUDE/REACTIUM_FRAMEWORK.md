# Reactium Framework Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Core Architecture](#core-architecture)
3. [Domain-Driven Design (DDD) Structure](#domain-driven-design-ddd-structure)
4. [Component System](#component-system)
5. [Plugin System & Registration](#plugin-system--registration)
6. [Routing System](#routing-system)
7. [State Management](#state-management)
8. [Hook System](#hook-system)
9. [Build System](#build-system)
10. [Integration with Actinium](#integration-with-actinium)
11. [CLI Tools](#cli-tools)
12. [Best Practices & Gotchas](#best-practices--gotchas)

---

## Introduction

**Reactium** is a plugin-based, convention-over-configuration React framework built by Atomic Reactor. It extends React with a powerful plugin architecture, centralized state management, advanced routing capabilities, and a sophisticated hook system.

### Key Differentiators from Vanilla React

- **Plugin Architecture**: Components and features are organized as auto-discoverable plugins
- **Convention-Based Discovery**: Files following naming conventions are automatically registered
- **Manifest System**: Build-time discovery creates a central registry of all app artifacts
- **Enhanced Routing**: Built on React Router with data loading, transitions, and Handle-based state
- **Global SDK**: Centralized `Reactium` object provides framework utilities
- **Hook System**: Event-driven architecture allows plugins to hook into lifecycle events

### Project Structure

```
project-root/
├── reactium_modules/
│   └── @atomic-reactor/
│       └── reactium-core/          # Framework core (includes build configuration)
├── src/
│   ├── app/
│   │   └── components/             # Application components (DDD domains)
│   │       └── MyComponent/
│   │           ├── MyComponent.jsx          # Component implementation
│   │           ├── reactium-hooks-*.js      # Plugin hooks
│   │           ├── reactium-route-*.js      # Route definitions
│   │           └── _reactium-style.scss     # Styles
│   └── manifest.js                 # Auto-generated registry (DO NOT EDIT)
├── babel.config.js                 # Babel configuration (imports from reactium-core)
├── webpack.override.js             # Optional webpack overrides
└── gulpfile.js                     # Build orchestration (delegates to reactium-core)
```

---

## Core Architecture

### The Reactium SDK

The Reactium SDK is a global object providing access to all framework utilities. It's implemented as a Proxy that aggregates multiple sub-systems:

**Location**: `/ui/reactium_modules/@atomic-reactor/reactium-core/sdk/index.js`

```javascript
import Reactium from '@atomic-reactor/reactium-core/sdk';

// The SDK object includes:
const SDK = {
    Hook,           // Hook registration and execution
    Enums,          // Priority levels and constants
    Component,      // Component registry
    Zone,           // Zone-based rendering (ZoneRegistry)
    Handle,         // Observable state containers
    Pulse,          // Pub/sub event system
    Prefs,          // Preference storage
    Cache,          // Caching utilities
    AppContext,     // React context providers
    State,          // Global state management
    Routing,        // Enhanced routing system
};
```

**SDK Proxy Pattern**: The SDK uses a Proxy to enable extensibility. Plugins can add properties to the SDK, and the Proxy allows fallback to `SDK.API.Actinium` for backend integration:

```javascript
// From sdk/index.js
const apiHandler = {
    get(SDK, prop) {
        if (prop in SDK) return SDK[prop];
        if (SDK.API) {
            if (prop in SDK.API) return SDK.API[prop];
            if (SDK.API.Actinium && prop in SDK.API.Actinium)
                return SDK.API.Actinium[prop];
        }
    }
};

export const Reactium = new Proxy(SDK, apiHandler);
```

### Manifest System

The manifest is the heart of Reactium's convention-based discovery. At build time, `manifest-tools.js` scans the project for specially-named files and generates `src/manifest.js`.

**Key Artifact Patterns**:
- **Routes**: `reactium-route-*.js` or `route.js`
- **Hooks**: `reactium-hooks-*.js`
- **Services**: `reactium-service-*.js` or `service.js`

**Generated Manifest Structure** (`src/manifest.js`):

```javascript
const reqs = {
    allRoutes: {
        MyComponent: {
            req: () => import('../src/app/components/MyComponent/reactium-route-mycomponent'),
            file: '../src/app/components/MyComponent/reactium-route-mycomponent',
        },
        // ... more routes
    },
    allHooks: {
        MyComponent: {
            req: () => import('../src/app/components/MyComponent/reactium-hooks-mycomponent'),
            file: '../src/app/components/MyComponent/reactium-hooks-mycomponent',
        },
        // ... more hooks
    },
    allServices: {
        // Service imports
    }
};
```

**Runtime Manifest Loading**:

```javascript
// From reactium-hooks-App.js
const allRoutes = await deps().loadAllDefaults('allRoutes');
// Returns array of all route configurations
```

---

## Domain-Driven Design (DDD) Structure

Reactium uses DDD to organize code by feature/domain rather than by technical layer. Each component is a self-contained domain.

### DDD Artifacts

Each domain directory can contain these convention-based files:

#### 1. Component File (Required)
**Pattern**: `ComponentName.jsx` or `index.js`

The primary React component:

```javascript
import { useSyncState } from '@atomic-reactor/reactium-core/sdk';
import React from 'react';

export const MyComponent = ({ className }) => {
    const state = useSyncState({ count: 0 });

    return (
        <div className={className}>
            <p>Count: {state.get('count')}</p>
            <button onClick={() => state.set('count', state.get('count') + 1)}>
                Increment
            </button>
        </div>
    );
};

MyComponent.defaultProps = {
    className: 'my-component',
};

export default MyComponent;
```

#### 2. Route Definition
**Pattern**: `reactium-route-*.js`

Defines URL routes for the component:

```javascript
import { MyComponent as component } from './MyComponent';
import { Enums } from '@atomic-reactor/reactium-core/sdk';

export default [
    {
        id: 'route-MyComponent-1',
        exact: true,
        component,
        path: '/my-component',
        order: Enums.priority.neutral,
    },
];
```

#### 3. Hooks/Plugin File
**Pattern**: `reactium-hooks-*.js`

Registers the component and hooks into framework lifecycle:

```javascript
(async () => {
    const { Hook, Enums, Component } = await import('@atomic-reactor/reactium-core/sdk');

    Hook.register('plugin-init', async () => {
        const { MyComponent } = await import('./MyComponent');
        Component.register('MyComponent', MyComponent);
    }, Enums.priority.neutral, 'plugin-init-MyComponent');
})();
```

#### 4. Styles
**Pattern**: `_reactium-style.scss`

Component-specific styles that get auto-imported into the build.

#### 5. Domain Configuration
**Pattern**: `domain.js`

Optional domain-specific configuration.

### Example Complete Domain

```
src/app/components/DataLoader/
├── DataLoader.jsx                          # Component implementation
├── reactium-hooks-dataloader.js            # Component registration
├── reactium-route-dataloader.js            # Route definition
└── _reactium-style.scss                    # Styles
```

---

## Component System

### Component Registration

Components must be registered with the Reactium Component registry to be accessible by name:

```javascript
import Reactium from '@atomic-reactor/reactium-core/sdk';

// Register a component
Reactium.Component.register('MyComponent', MyComponent);

// Retrieve a component
const MyComp = Reactium.Component.get('MyComponent');

// List all registered components
const allComponents = Reactium.Component.list;
```

### Hookable Components

Registered components can be used with the `useHookComponent` hook, enabling dynamic component resolution:

```javascript
import { useHookComponent } from '@atomic-reactor/reactium-core/sdk';

const MyContainer = () => {
    const MyComponent = useHookComponent('MyComponent');

    if (!MyComponent) return <div>Loading...</div>;

    return <MyComponent someProp="value" />;
};
```

### Component Props Auto-Injection

When a component is rendered by the Routing system, it automatically receives these props:

- **`handleId`**: If the route or component defines a `handleId`, it's passed as a prop
- **`transitionState`**: Current transition state (if transitions enabled)
- **`route`**: The matched route object
- **`params`**: URL parameters
- **`search`**: Query string parameters

---

## Plugin System & Registration

### Plugin Lifecycle

Reactium's plugin system revolves around the hook-based lifecycle:

**Key Lifecycle Hooks**:
1. **`plugin-dependencies`**: Load plugin dependencies first
2. **`plugin-init`**: Initialize plugins, register components
3. **`routes-init`**: Register routes from manifest
4. **`register-route`**: Hook fired for each route during registration
5. **`init`**: Final initialization (register Router, providers)

### Creating a Plugin

**Step 1: Create the hooks file** (`reactium-hooks-myplugin.js`):

```javascript
(async () => {
    const { Hook, Enums, Component } = await import('@atomic-reactor/reactium-core/sdk');

    // Register during plugin-init
    Hook.register('plugin-init', async () => {
        const { MyPlugin } = await import('./MyPlugin');

        // Register component
        Component.register('MyPlugin', MyPlugin);

        // Add to Reactium SDK
        Reactium.MyPlugin = {
            doSomething: () => console.log('Plugin method called!'),
        };

        console.log('MyPlugin initialized');
    }, Enums.priority.neutral, 'plugin-init-MyPlugin');

    // Hook into other lifecycle events
    Hook.register('routes-init', async () => {
        console.log('Routes are being initialized');
    }, Enums.priority.neutral, 'MyPlugin-routes-init');
})();
```

**Step 2: The manifest will auto-discover this file** if it matches the pattern `reactium-hooks-*.js`.

### Priority Levels

Use `Enums.priority` to control execution order:

```javascript
import { Enums } from '@atomic-reactor/reactium-core/sdk';

Enums.priority.highest   // -1000
Enums.priority.core      // -2000
Enums.priority.high      // -500
Enums.priority.neutral   // 0 (NOT .normal - that doesn't exist)
Enums.priority.low       // 500
Enums.priority.lowest    // 1000
```

Lower numbers execute first.

---

## Routing System

Reactium extends React Router with powerful data loading, transitions, and state management.

### Route Object Specification

**From**: `reactium_modules/@atomic-reactor/reactium-core/sdk/routing/index.js`

A Reactium route object supports:

**Standard React Router props**:
- `path`: String or array of strings (e.g., `'/users/:id'`)
- `exact`: Boolean, exact path matching
- `component`: React component or string name (resolved via Component registry)
- `strict`: Boolean (React Router)
- `sensitive`: Boolean (React Router)

**Reactium extensions**:
- `id`: Unique route identifier (auto-generated if not provided)
- `order`: Number, route matching priority (default: 0)
- `loadState`: Function for data loading (async)
- `handleId`: String, Handle ID for storing loaded data
- `persistHandle`: Boolean, keep Handle after route change
- `transitions`: Boolean, enable transition states
- `transitionStates`: Array, custom transition state sequence

### Basic Route Example

```javascript
// reactium-route-userdetail.js
import { UserDetail as component } from './UserDetail';
import { Enums } from '@atomic-reactor/reactium-core/sdk';

export default [
    {
        id: 'route-UserDetail-1',
        exact: true,
        component,
        path: '/user/:userId',
        order: Enums.priority.neutral,
    },
];
```

### Data Loading with `loadState`

Routes can define a `loadState` function (or static method on the component) for async data fetching:

**Preferred: Static method on component**:

```javascript
// DataLoader.jsx
import { useSyncHandle } from '@atomic-reactor/reactium-core/sdk';
import React from 'react';

export const DataLoader = () => {
    const handle = useSyncHandle(DataLoader.handleId);
    const data = handle ? handle.get('data') : null;
    const isLoading = handle ? handle.get('loading', true) : true;

    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            <h1>Loaded Data</h1>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
};

// Static loadState method
DataLoader.loadState = async ({ route, params, search }) => {
    // Simulate async data fetch
    const response = await fetch(`/api/data?${new URLSearchParams(search)}`);
    const data = await response.json();

    return {
        data,
        loading: false,
    };
};

// Static handleId
DataLoader.handleId = 'DataLoaderHandle';

export default DataLoader;
```

**How it works**:
1. When route is matched, Routing system detects `component.loadState`
2. Executes `loadState({ route, params, search })`
3. Stores resolved value in a Handle with `component.handleId` (or route's `handleId`)
4. Component uses `useSyncHandle(handleId)` to access the data reactively

### Route Transitions

Reactium supports animated page transitions with state management:

**Enable transitions on a route**:

```javascript
// reactium-route-transitionpage.js
import { TransitionPage as component } from './TransitionPage';
import { Enums } from '@atomic-reactor/reactium-core/sdk';

export default [
    {
        id: 'route-TransitionPage-1',
        exact: true,
        component,
        path: '/transition',
        transitions: true,
        transitionStates: [
            { state: 'LOADING', active: 'current' },
            { state: 'ENTERING', active: 'current' },
            { state: 'READY', active: 'current' },
        ],
    },
];
```

**Transition states**:
- `active: 'current'`: Applied to the incoming component
- `active: 'previous'`: Applied to the outgoing component

**Use in component**:

```javascript
import React, { useEffect } from 'react';
import Reactium from '@atomic-reactor/reactium-core/sdk';

export const TransitionPage = ({ transitionState }) => {
    useEffect(() => {
        if (transitionState === 'LOADING') {
            // Perform loading logic
            setTimeout(() => {
                Reactium.Routing.nextState(); // Advance to next state
            }, 500);
        } else if (transitionState === 'ENTERING') {
            // Perform enter animation
            setTimeout(() => {
                Reactium.Routing.nextState(); // Advance to READY
            }, 300);
        }
    }, [transitionState]);

    return (
        <div className={`transition-page transition-${transitionState}`}>
            <h1>Transition State: {transitionState}</h1>
        </div>
    );
};
```

### Routing Bootstrap Process

**Build Time**:
1. `manifest-tools.js` scans for `reactium-route-*.js` files
2. Generates `src/manifest.js` with dynamic imports under `allRoutes`

**Runtime**:
1. `reactium-hooks-App.js` registers `routes-init` hook
2. During app bootstrap, `routes-init` fires
3. Loads all route definitions from manifest: `deps().loadAllDefaults('allRoutes')`
4. For each route, fires `register-route` hook (allows route modification)
5. Calls `Reactium.Routing.register(route)` to add to routing system
6. History object listens for URL changes and matches routes

---

## State Management

Reactium provides multiple state management options:

### 1. Local Component State: `useSyncState`

A reactive alternative to React's `useState`:

```javascript
import { useSyncState } from '@atomic-reactor/reactium-core/sdk';

const MyComponent = () => {
    const state = useSyncState({
        count: 0,
        name: 'John'
    });

    // Get values
    const count = state.get('count');

    // Set values
    const increment = () => state.set('count', state.get('count') + 1);

    // Batch updates
    const updateMultiple = () => state.set({
        count: 10,
        name: 'Jane',
    });

    return (
        <div>
            <p>{count} - {state.get('name')}</p>
            <button onClick={increment}>Increment</button>
        </div>
    );
};
```

**Key Difference from `useState`**: Returns an observable object with `get()` and `set()` methods rather than a direct value and setter function.

### 2. Global State: `Reactium.State`

Framework-wide state accessible from anywhere:

```javascript
import Reactium from '@atomic-reactor/reactium-core/sdk';

// Set global state
Reactium.State.set('user', { id: 1, name: 'Alice' });

// Get global state
const user = Reactium.State.get('user');

// In a component, use the hook for reactivity
import { useGlobalState } from '@atomic-reactor/reactium-core/sdk';

const UserDisplay = () => {
    const user = useGlobalState('user');

    return <div>User: {user.name}</div>;
};
```

### 3. Handles: Shared Observable State

Handles are named, observable state containers that multiple components can subscribe to:

```javascript
import { Handle, useHandle, useSyncHandle } from '@atomic-reactor/reactium-core/sdk';

// Create a Handle
const myHandle = new Handle('MyHandleId', { data: 'initial' });

// Register it
Handle.register('MyHandleId', myHandle);

// In Component A: Write to Handle
const ComponentA = () => {
    const handle = Handle.get('MyHandleId');

    const updateData = () => {
        handle.set('data', 'updated value');
    };

    return <button onClick={updateData}>Update</button>;
};

// In Component B: Read from Handle (reactive)
const ComponentB = () => {
    const handle = useSyncHandle('MyHandleId'); // Auto-subscribes
    const data = handle ? handle.get('data') : 'loading';

    return <div>Data: {data}</div>;
};
```

**`useHandle` vs `useSyncHandle`**:
- **`useHandle`**: Retrieves Handle but does NOT subscribe to changes
- **`useSyncHandle`**: Retrieves Handle AND subscribes, causing re-renders on updates

### 4. Pulse: Pub/Sub Events

For event-driven communication:

```javascript
import Reactium from '@atomic-reactor/reactium-core/sdk';

// Subscribe to event
Reactium.Pulse.on('data-updated', (data) => {
    console.log('Received data:', data);
});

// Publish event
Reactium.Pulse.emit('data-updated', { newValue: 123 });

// Unsubscribe
Reactium.Pulse.off('data-updated', handlerFunction);
```

---

## Hook System

Reactium's hook system is event-driven and powers the entire plugin architecture.

### Hook Registration

**Async hooks** (most common):

```javascript
import Reactium, { Enums } from '@atomic-reactor/reactium-core/sdk';

Reactium.Hook.register(
    'my-custom-hook',           // Hook name
    async (arg1, arg2, context) => {  // Callback
        console.log('Hook fired with:', arg1, arg2);
        // Async operations allowed
        await someAsyncOperation();
    },
    Enums.priority.neutral,      // Execution priority
    'unique-hook-id'            // Optional unique ID
);
```

**Sync hooks**:

```javascript
Reactium.Hook.registerSync(
    'my-sync-hook',
    (arg1, arg2, context) => {
        // Synchronous only
        console.log('Sync hook:', arg1);
    },
    Enums.priority.neutral,
    'unique-sync-id'
);
```

### Hook Execution

**Run async hooks**:

```javascript
const context = await Reactium.Hook.run('my-custom-hook', 'arg1', 'arg2');
// All registered callbacks execute in priority order
// context = { hook: 'my-custom-hook', params: ['arg1', 'arg2'] }
```

**Run sync hooks**:

```javascript
const context = Reactium.Hook.runSync('my-sync-hook', 'data');
```

### Common Framework Hooks

**Lifecycle hooks** (order of execution):

1. **`plugin-dependencies`**: Load plugin dependencies
2. **`plugin-init`**: Initialize plugins, register components
3. **`routes-init`**: Load and register routes from manifest
4. **`register-route`**: Fires for each individual route before registration
   - Can modify route object
   - Can prevent registration by setting `context.route = null`
5. **`init`**: Final initialization, register Router and providers
6. **`component-bindings-{ComponentName}`**: Component-specific hooks

**Route hooks**:
- **`routes-init`**: Before any routes registered
- **`register-route`**: Per-route, allows modification
- **`history-change`**: URL navigation occurred

**Custom Application Hooks**:

You can define your own hooks for application-specific events:

```javascript
// In some initialization code
Reactium.Hook.register('app-data-loaded', async (data) => {
    console.log('App data loaded:', data);
}, Enums.priority.neutral);

// Later, trigger the hook
await Reactium.Hook.run('app-data-loaded', myData);
```

### Hook Unregistration

```javascript
const hookId = Reactium.Hook.register('my-hook', callback, priority);

// Later, unregister
Reactium.Hook.unregister(hookId);
```

---

## Build System

Reactium uses **Gulp** for task orchestration and **Webpack** for bundling.

### Build Process Overview

**Entry point**: `gulpfile.js` (in project root)

The build process:
1. **Manifest Generation**: `manifest-tools.js` scans and generates `src/manifest.js`
2. **SCSS Compilation**: Compiles SCSS files (including `_reactium-style.scss` files)
3. **Webpack Bundling**: Bundles JavaScript with Babel transpilation
4. **Asset Processing**: Images, fonts, static assets
5. **Development Server**: BrowserSync for hot reloading

### Key Build Files

```
project-root/
├── gulpfile.js                                    # Main Gulp entry (delegates to core)
├── webpack.override.js                            # Optional webpack overrides
├── babel.config.js                                # Babel config (imports from core)
└── reactium_modules/@atomic-reactor/reactium-core/
    ├── gulpfile.js                                # Core Gulp tasks
    ├── gulp.config.js                             # Gulp configuration
    ├── gulp.tasks.js                              # Task definitions
    ├── webpack.config.js                          # Webpack config
    └── reactium-config.js                         # Reactium-specific config
```

### Common Build Commands

```bash
# Development build with watch
npm run local

# Production build
npm run build

# Clean build artifacts
npm run clean

# Regenerate manifest only
npx reactium manifest
```

### Webpack Configuration

**Location**: `reactium_modules/@atomic-reactor/reactium-core/webpack.config.js`

Key features:
- **Babel transpilation**: ES6+ to browser-compatible JS
- **Hot Module Replacement (HMR)**: For development
- **Code splitting**: Dynamic imports for routes
- **Source maps**: For debugging
- **Asset loading**: Images, fonts, SCSS

### Manifest Regeneration

The manifest is auto-regenerated on build, but can be manually triggered:

```bash
npx reactium manifest
```

**When to regenerate**:
- After adding new `reactium-hooks-*.js` files
- After adding new `reactium-route-*.js` files
- After adding services
- When DDD artifacts are not being discovered

---

## Integration with Actinium

Reactium is designed to work seamlessly with Actinium (backend framework).

### SDK Integration

The Reactium SDK Proxy allows access to Actinium SDK methods:

```javascript
import Reactium from '@atomic-reactor/reactium-core/sdk';

// If SDK.API.Actinium is loaded, you can access:
const result = await Reactium.Cloud.run('myCloudFunction', { param: 'value' });
// Falls through Proxy to SDK.API.Actinium.Cloud.run()
```

### API Configuration

Set API endpoint in environment or config:

```javascript
// In reactium-config.js or environment
Reactium.API = {
    baseURL: 'http://localhost:9000/api',
};
```

### Parse Integration

Reactium typically uses Parse SDK for backend communication:

```javascript
import Parse from 'parse';

// Initialize Parse (usually in app init)
Parse.initialize('YOUR_APP_ID', 'YOUR_JS_KEY');
Parse.serverURL = 'http://localhost:9000/parse';

// Use Parse queries
const query = new Parse.Query('MyClass');
const results = await query.find();
```

### Cloud Function Calls

```javascript
// Call an Actinium Cloud Function
const result = await Parse.Cloud.run('getOHLC', {
    coinId: 'bitcoin',
    vsCurrency: 'usd',
    days: '7',
});
```

---

## CLI Tools

Reactium provides a powerful CLI for scaffolding and management.

### Available Commands

```bash
# List all commands
npx reactium --help

# Component generation
npx reactium component --help

# Create a new component with all artifacts
npx reactium component \
  -n MyComponent \
  -d src/app/components \
  -r "/my-component" \
  -H \
  -s \
  --unattended
```

### Component Creation Flags

- **`-n, --name [name]`**: Component name (required)
- **`-d, --destination [destination]`**: Parent directory (e.g., `src/app/components`)
- **`-r, --route [route]`**: Route path(s) (e.g., `"/route-1, /route-2/:param"`)
- **`-H, --hooks`**: Generate `reactium-hooks-*.js` file
- **`-s, --style [style]`**: Generate `_reactium-style.scss`
- **`-D, --domain`**: Generate `domain.js`
- **`-u, --unattended`**: Skip prompts, use defaults

### Example CLI Workflow

```bash
# Create a new component with route and hooks
npx reactium component \
  -n UserProfile \
  -d src/app/components \
  -r "/profile/:userId" \
  -H \
  -s \
  --unattended

# This generates:
# src/app/components/UserProfile/
#   ├── UserProfile.jsx
#   ├── reactium-hooks-userprofile.js
#   ├── reactium-route-userprofile.js
#   └── _reactium-style.scss

# Regenerate manifest (usually automatic, but if needed)
npx reactium manifest

# Run development build
npm run local
```

---

## Best Practices & Gotchas

### Best Practices

#### 1. Use Domain-Driven Design
Organize by feature, not by technical layer:

```
Good:
src/app/components/
  ├── UserProfile/
  │   ├── UserProfile.jsx
  │   ├── reactium-hooks-userprofile.js
  │   └── reactium-route-userprofile.js
  └── Dashboard/
      ├── Dashboard.jsx
      └── reactium-hooks-dashboard.js

Bad:
src/
  ├── components/
  │   ├── UserProfile.jsx
  │   └── Dashboard.jsx
  ├── routes/
  │   ├── userProfileRoute.js
  │   └── dashboardRoute.js
  └── hooks/
      ├── userProfileHooks.js
      └── dashboardHooks.js
```

#### 2. Leverage Static Methods for Route Data
Define `loadState` and `handleId` as static properties on components:

```javascript
MyComponent.loadState = async ({ route, params, search }) => { ... };
MyComponent.handleId = 'MyComponentHandle';
```

#### 3. Use `useSyncHandle` for Reactive Handle Access
When you need a component to re-render on Handle changes:

```javascript
const handle = useSyncHandle('MyHandleId'); // Subscribes
// NOT: const handle = useHandle('MyHandleId'); // Does NOT subscribe
```

#### 4. Prioritize Hooks Appropriately
Use priority constants for predictable execution order:

```javascript
// Core framework initialization
Hook.register('plugin-init', callback, Enums.priority.core);

// Normal plugin initialization
Hook.register('plugin-init', callback, Enums.priority.neutral);

// Late initialization (depends on others)
Hook.register('plugin-init', callback, Enums.priority.low);
```

#### 5. Name Files Correctly for Auto-Discovery
Follow exact naming conventions:
- Routes: `reactium-route-{name}.js`
- Hooks: `reactium-hooks-{name}.js`
- Services: `reactium-service-{name}.js`
- Styles: `_reactium-style.scss`

#### 6. Register Components in plugin-init Hook
Always register components during the `plugin-init` lifecycle:

```javascript
Hook.register('plugin-init', async () => {
    const { MyComponent } = await import('./MyComponent');
    Component.register('MyComponent', MyComponent);
}, Enums.priority.neutral);
```

### Gotchas

#### 1. DO NOT Edit `src/manifest.js`
This file is auto-generated. Changes will be overwritten on next build.

#### 2. `useSyncState` Returns an Object, Not a Value
```javascript
// WRONG
const [count, setCount] = useSyncState({ count: 0 });

// CORRECT
const state = useSyncState({ count: 0 });
const count = state.get('count');
state.set('count', 5);
```

#### 3. Route Path Must Be Specified
The CLI may generate routes with empty paths if you don't use the `-r` flag. Always verify:

```javascript
// WRONG (generated without -r flag)
path: ,

// CORRECT
path: '/my-component',
```

#### 4. Handle IDs Must Be Unique
If multiple routes use the same `handleId`, they'll share state. Use unique IDs or be intentional about sharing.

#### 5. Async Hook Errors Are Silently Swallowed
Errors in async hooks are logged but don't crash the app. Monitor console for hook errors:

```javascript
Hook.register('my-hook', async () => {
    try {
        await riskyOperation();
    } catch (error) {
        console.error('Error in my-hook:', error);
        throw error; // Will be logged by Hook.run()
    }
});
```

#### 6. Manifest Doesn't Update While Dev Server Runs
After adding new DDD artifact files, restart the dev server or manually regenerate manifest:

```bash
npx reactium manifest
# Then restart npm run local
```

#### 7. Priority Order Can Be Confusing
Lower numbers = higher priority (execute first):

```javascript
priority.highest = -1000000  // First
priority.core = -1000
priority.neutral = 0
priority.low = 100
priority.lowest = 1000000    // Last
```

#### 8. Transition States Require nextState() Calls
If you enable transitions but forget to call `Reactium.Routing.nextState()`, the UI will hang in the current transition state.

#### 9. IIFE Wrapper Required in Hooks Files
Hooks files use an async IIFE to enable top-level await:

```javascript
// CORRECT
(async () => {
    const { Hook } = await import('@atomic-reactor/reactium-core/sdk');
    Hook.register('plugin-init', ...);
})();

// WRONG - will not execute
const { Hook } = await import('@atomic-reactor/reactium-core/sdk');
Hook.register('plugin-init', ...);
```

#### 10. Case Sensitivity in File Names
File names are case-sensitive on Linux/macOS but not on Windows. Use consistent casing:

```javascript
// Component file: UserProfile.jsx
// Hooks file: reactium-hooks-userprofile.js (lowercase)
// Route file: reactium-route-userprofile.js (lowercase)
```

---

## Real-World Examples from This Project

### Example 1: Simple Component with Route

**File**: `/learning/src/app/components/Hello/Hello.jsx`

```javascript
import { useSyncState } from '@atomic-reactor/reactium-core/sdk';
import React from 'react';
import { Link } from 'react-router-dom';

export const Hello = ({ className }) => {
    const state = useSyncState({ content: 'Hello World' });

    return (
        <div className={className}>
            <h1>{state.get('content')}</h1>
            <nav>
                <ul>
                    <li><Link to='/data-loader'>Go to Data Loader</Link></li>
                </ul>
            </nav>
        </div>
    );
};

Hello.defaultProps = {
    className: 'hello',
};

export default Hello;
```

**Route**: `/learning/src/app/components/Hello/reactium-route-hello.js`

```javascript
import { Hello as component } from './Hello';

export default [
    {
        id: 'route-Hello-1',
        exact: true,
        component,
        path: '/',
    },
];
```

### Example 2: Component with Data Loading

**File**: `/learning/src/app/components/DataLoader/DataLoader.jsx`

```javascript
import { useSyncHandle } from '@atomic-reactor/reactium-core/sdk';
import React from 'react';

export const DataLoader = ({ className }) => {
    const handle = useSyncHandle(DataLoader.handleId);
    const loadedData = handle ? handle.get('data') : null;
    const isLoading = handle ? handle.get('loading', true) : true;

    return (
        <div className={className}>
            <h1>Data Loader</h1>
            {isLoading && <p data-cy='loading'>Loading...</p>}
            {loadedData && (
                <div>
                    <h2>Data:</h2>
                    <pre data-cy='data-loaded'>
                        {JSON.stringify(loadedData, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

// Static loadState method for route-based data fetching
DataLoader.loadState = async ({ route, params, search }) => {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log('DataLoader: loadState called for route:', route.id);
            resolve({
                data: {
                    message: 'This data was loaded from loadState!',
                    timestamp: Date.now(),
                    routeId: route.id,
                    routeParams: params,
                    queryParams: search,
                },
                loading: false,
            });
        }, 1000);
    });
};

DataLoader.handleId = 'DataLoaderHandle';

DataLoader.defaultProps = {
    className: 'data-loader',
};

export default DataLoader;
```

### Example 3: Component Registration Hook

**File**: `/learning/src/app/components/DataLoader/reactium-hooks-dataloader.js`

```javascript
(async () => {
    const { Hook, Enums, Component } = await import('@atomic-reactor/reactium-core/sdk');

    Hook.register('plugin-init', async () => {
        const { DataLoader } = await import('./DataLoader');
        Component.register('DataLoader', DataLoader);
    }, Enums.priority.neutral, 'plugin-init-DataLoader');
})();
```

---

## Summary

Reactium is a sophisticated React framework that provides:

1. **Plugin Architecture**: Auto-discoverable, convention-based plugins
2. **Manifest System**: Build-time discovery of routes, hooks, and services
3. **Enhanced Routing**: Data loading, transitions, and Handle-based state
4. **Multiple State Solutions**: `useSyncState`, global state, Handles, Pulse
5. **Hook System**: Event-driven lifecycle for extensibility
6. **Domain-Driven Design**: Organize code by feature, not layer
7. **CLI Tools**: Rapid scaffolding and code generation
8. **Seamless Backend Integration**: Works with Actinium via Parse SDK

By following Reactium's conventions and leveraging its powerful features, you can build modular, maintainable, and scalable React applications with less boilerplate and more flexibility than vanilla React.

For Actinium backend integration and plugin development, see [ACTINIUM_FRAMEWORK.md](./ACTINIUM_FRAMEWORK.md).
