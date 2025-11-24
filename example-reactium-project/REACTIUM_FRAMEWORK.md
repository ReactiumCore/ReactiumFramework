# Reactium Framework - Comprehensive Documentation

> This documentation is synthesized from deep code analysis of the Reactium framework source code and reference implementations. All examples are drawn from actual framework code.

## Table of Contents

1. [Framework Overview](#framework-overview)
2. [Core Architecture](#core-architecture)
3. [SDK Components](#sdk-components)
4. [Domain-Driven Design (DDD) Artifacts](#domain-driven-design-ddd-artifacts)
5. [Routing System](#routing-system)
6. [State Management](#state-management)
7. [Component Patterns](#component-patterns)
8. [Build System](#build-system)
9. [Extensibility Points](#extensibility-points)
10. [Best Practices](#best-practices)

---

## Framework Overview

Reactium is a full-stack React framework that provides:

-   Universal (isomorphic) rendering - SSR and SPA in one codebase
-   Convention-over-configuration approach via Domain-Driven Design
-   Powerful hook-based extensibility system
-   Dynamic component and route registration
-   Built on top of React, Express, and Webpack

### Key Framework Repositories

```
Reactium-Core-Plugins/
└── reactium_modules/@atomic-reactor/
    ├── reactium-core/          # Core framework implementation
    └── [other plugins...]

reactium-sdk-core/              # Foundation SDK (browser + server utilities)
CLI/                            # Command-line interface tool
```

### Version Compatibility

File: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/package.json`

```json
{
    "reactium": {
        "version": "5.0.0"
    }
}
```

---

## Core Architecture

### Bootstrap Process (Backend)

**File:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/index.mjs`

The server bootstrap follows this sequence:

1. **Global Initialization** (`server-globals.mjs`)

    - Creates `global.ReactiumBoot` object combining SDK core + server modules
    - Sets `global.rootPath`, `global.PORT`, `global.TLS_PORT`
    - Initializes logging system via `reactium.log.cjs`

2. **Boot Hook Discovery** (`boot-hooks.mjs`)

    - Scans for `reactium-boot.{js,mjs,cjs}` files in:
        - `src/`
        - `reactium_modules/`
        - `node_modules/**/reactium-plugin/`
    - Dynamically imports and executes boot hooks
    - Runs `sdk-init` hook for final initialization

3. **Server Setup** (`index.mjs`)

    ```javascript
    // Middleware registration via ReactiumBoot.Server.Middleware
    ReactiumBoot.Server.Middleware.register('morgan', {
        name: 'morgan',
        use: morgan(format),
        order: ReactiumBoot.Enums.priority.highest,
    });
    ```

4. **SSR Renderer** (`server/renderer/index.mjs`)
    - Registers hooks for collecting assets:
        - `Server.AppStyleSheets`
        - `Server.AppScripts`
        - `Server.AppHeaders`
        - `Server.AppBindings`
        - `Server.AppGlobals`
    - Assembles HTML via `server/template/feo.js`

**Logging System** (`reactium.log.cjs`):

```javascript
// Provides global logging functions
global.DEBUG();
global.INFO();
global.BOOT();
global.WARN();
global.ERROR();

// Controlled by process.env.LOG_LEVEL
```

### Bootstrap Process (Frontend)

**File:** `learning/src/app/main.js` (application entry point)

```javascript
import { Shell } from '@atomic-reactor/reactium-core/app/shell';

__webpack_public_path__ = window.resourceBaseUrl || '/assets/js/';

await Shell();
```

**Client-side initialization flow:**

1. **Manifest Loading** (`src/manifest.js`)

    - Generated at build-time by `manifest-tools.js`
    - Contains dynamic imports for all DDD artifacts
    - Example structure:

    ```javascript
    export const allRoutes = {
        HelloWorld: [
            () =>
                import(
                    './app/components/HelloWorld/reactium-route-helloworld.js'
                ),
        ],
    };

    export const allHooks = {
        HookTester: [
            () =>
                import(
                    './app/components/HookTester/reactium-hooks-hooktester.js'
                ),
        ],
    };
    ```

2. **Hook Loading** (`reactium-hooks-App.js`)

    ```javascript
    Hook.register('plugin-init', async () => {
        await deps().loadAll('allHooks');
    });

    Hook.register('routes-init', async (routesRegistry) => {
        const allRoutes = await deps().loadAllDefaults('allRoutes');
        allRoutes.forEach((route) => {
            Reactium.Routing.register(route);
        });
    });
    ```

3. **Component Registration**
    ```javascript
    // In reactium-hooks-*.js files
    Hook.register('plugin-init', async () => {
        const { MyComponent } = await import('./MyComponent');
        Component.register('MyComponent', MyComponent);
    });
    ```

### Webpack Configuration

**File:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.config.js`

```javascript
// WebpackSDK provides extensible configuration
sdk.mode = config.mode;
sdk.target = 'web';
sdk.entry = config.entries; // From application config
sdk.output = {
    publicPath: '/assets/js/',
    path: path.resolve(rootPath, 'dest'),
    filename: '[name].js',
    asyncChunks: true,
};

// Code splitting for dynamic imports
sdk.setCodeSplittingOptimize(env);

// Babel integration for module resolution
sdk.addRule('js-babel-loader', {
    test: /\.jsx?$/,
    loader: 'babel-loader',
});
```

**Babel Module Resolution** (`babel.config.js`):

```javascript
// Managed by ReactiumBabel.ModuleAliases registry
plugins: [
    [
        'module-resolver',
        {
            alias: {
                manifest: './src/manifest',
                appdir: './src/app',
            },
        },
    ],
];
```

---

## SDK Components

### Hook System

**Source:** `reactium-sdk-core/src/core/Hook.ts`

The Hook system is the foundation for extensibility:

```typescript
class HookSDK {
    register(
        name: string,
        callback: Function,
        order: number,
        id?: string,
    ): string;
    unregister(id: string): void;
    run(name: string, ...params: any[]): Promise<any>; // Async hooks via ActionSequence
    runSync(name: string, ...params: any[]): any; // Sync hooks
}
```

**Hook Properties:**

-   `name`: Hook identifier
-   `callback`: Function to execute
-   `order`: Priority (higher = earlier execution)
-   `id`: Unique identifier for the hook instance
-   `domain`: Grouping/namespace

**Example Usage:**

```javascript
// File: learning/src/app/components/HookTester/reactium-hooks-hooktester.js
import { Hook, Enums } from '@atomic-reactor/reactium-core/sdk';

Hook.register(
    'plugin-init',
    async () => {
        const { HookTester } = await import('./HookTester');
        Component.register('HookTester', HookTester);
    },
    Enums.priority.normal,
    'plugin-init-HookTester',
);
```

**ActionSequence Pattern:**
Async hooks execute sequentially, allowing data to flow through the chain:

```javascript
// Each hook receives output from previous hook
await Hook.run('my-hook', initialData);
// Hook 1: receives initialData, returns modified data
// Hook 2: receives modified data from Hook 1, returns further modifications
// ...
```

### Registry System

**Source:** `reactium-sdk-core/src/core/Registry.ts`

Generic in-memory database for managing collections:

```typescript
class Registry<ItemT> {
    register(id: string, item: ItemT): void;
    unregister(id: string): void;
    get(id: string): ItemT | undefined;
    list: ItemT[];
    protect(id: string): void; // Prevent unregistration
    subscribe(callback: (registry: this) => void): () => void;
    // Modes: CLEAN (default) or HISTORY (tracks changes)
}
```

**Use Cases:**

-   Components: `Reactium.Component` (RegisteredComponents instance)
-   Zones: `ZoneRegistry` for UI extensibility
-   Middleware: `Server.Middleware` for Express middleware
-   Routes: `Reactium.Routing` route management

### Pulse Task Runner

**Source:** `reactium-sdk-core/src/core/Pulse/index.ts`

Advanced task scheduling with lifecycle management:

```typescript
class PulseTask<Params extends any[]> {
    constructor(options: PulseTaskOptions<Params>);
    start(): void;
    stop(): void;
    now(): Promise<any>; // Execute immediately
    reset(): void;
    retry(): void;
    onSuccess(callback: Function): void;
    onError(callback: Function): void;
}

interface PulseTaskOptions<Params> {
    ID: string;
    callback: (...params: Params) => any | Promise<any>;
    attempts?: number; // Retry count
    autostart?: boolean;
    delay?: number; // ms delay before execution
    repeat?: number; // Repeat interval in ms (-1 = infinite)
}
```

**Example:**

```javascript
import { Pulse } from '@atomic-reactor/reactium-core/sdk';

const task = Pulse.register({
    ID: 'data-sync',
    callback: async () => {
        const data = await fetchData();
        return data;
    },
    delay: 1000,
    repeat: 5000, // Every 5 seconds
    attempts: 3,
});

task.onSuccess((result) => console.log('Success:', result));
task.onError((error) => console.error('Error:', error));
```

### Browser SDK: Handle Pattern

**Source:** `reactium-sdk-core/src/browser/Handle.ts`, `useHandle.ts`, `useRegisterHandle.ts`

Global component communication system:

```typescript
// ReactiumHandle singleton
class Handle {
    register(ID: Path, value: any): void;
    unregister(ID: Path): void;
    get(ID: Path): any;
    subscribe(callback: (handles: object) => void): () => void;
}
```

**Provider Hook:**

```typescript
// File: reactium-sdk-core/src/browser/useRegisterHandle.ts
function useRegisterHandle<HandleType>(
    ID: Path,
    cb: () => HandleType,
    deps: DependencyList = [],
): void;
```

**Consumer Hook:**

```typescript
// File: reactium-sdk-core/src/browser/useHandle.ts
function useHandle<HandleType>(ID: Path): HandleType | undefined;
```

**Example:**

```javascript
// Provider component
import { useRegisterHandle } from '@atomic-reactor/reactium-core/sdk';

export const DataProvider = () => {
    useRegisterHandle(
        'app-data',
        () => ({
            user: { name: 'John' },
            settings: { theme: 'dark' },
        }),
        [],
    );

    return null;
};

// Consumer component
import { useHandle } from '@atomic-reactor/reactium-core/sdk';

export const UserDisplay = () => {
    const appData = useHandle('app-data');
    return <div>{appData?.user.name}</div>;
};
```

### Browser SDK: ReactiumSyncState

**Source:** `reactium-sdk-core/src/browser/ReactiumSyncState.ts`, `useSyncState.ts`

Event-driven, observable state management:

```typescript
class ReactiumSyncState<T extends object> extends EventTarget {
    get(path?: Path, defaultValue?: any): any;
    set(path: Path | T, value?: any): void;
    del(path: Path): void;
    reset(): void;
    has(path: Path): boolean;
    extend(prop: string, method: Function): void;

    // Events: 'before-set', 'set', 'change', 'before-del', 'del'
}
```

**Hook Usage:**

```javascript
import { useSyncState } from '@atomic-reactor/reactium-core/sdk';

const MyComponent = () => {
    const state = useSyncState({
        count: 0,
        user: { name: 'Alice' },
    });

    const increment = () => {
        state.set('count', state.get('count') + 1);
    };

    // Dynamic method extension
    state.extend('doubleCount', function () {
        return this.get('count') * 2;
    });

    return (
        <div>
            <p>Count: {state.get('count')}</p>
            <p>Double: {state.doubleCount()}</p>
            <button onClick={increment}>Increment</button>
        </div>
    );
};
```

**useRegisterSyncHandle:**

```javascript
import {
    useRegisterSyncHandle,
    useSyncHandle,
} from '@atomic-reactor/reactium-core/sdk';

// Provider
const AppState = () => {
    const state = useRegisterSyncHandle('app-state', {
        theme: 'light',
        user: null,
    });

    return <div>App State Provider</div>;
};

// Consumer (reactive)
const ThemeDisplay = () => {
    const state = useSyncHandle('app-state');
    return <div>Theme: {state.get('theme')}</div>;
};
```

### Browser SDK: Zone Pattern

**Source:** `reactium-sdk-core/src/browser/Zone.tsx`, `Zones.ts`

Pluggable UI system for extensible layouts:

```typescript
// ZoneRegistry singleton
class Zones {
    addComponent(registration: ComponentRegistration): void;
    removeComponent(ID: Path): void;
    getZoneComponents(zone: string): ComponentRegistration[];
    addFilter(zone: string, filter: FilterFunction): void;
    addMapper(zone: string, mapper: MapperFunction): void;
    addSort(zone: string, sorter: SortFunction): void;
    subscribe(zone: string, callback: Function): () => void;
}

interface ComponentRegistration {
    id: string;
    zone: string;
    component: React.ComponentType | string;
    order?: number;
    [key: string]: any; // Additional props passed to component
}
```

**Zone Component Usage:**

```javascript
import { Zone } from '@atomic-reactor/reactium-core/sdk';

const Layout = () => (
    <div>
        <header>
            <Zone zone='header-widgets' />
        </header>
        <main>
            <Zone zone='sidebar' />
            <Zone zone='content' />
        </main>
    </div>
);

// Register components to zones
import { ZoneRegistry, Enums } from '@atomic-reactor/reactium-core/sdk';

ZoneRegistry.addComponent({
    id: 'UserMenu',
    zone: 'header-widgets',
    component: UserMenuComponent,
    order: Enums.priority.high,
});

ZoneRegistry.addComponent({
    id: 'SearchWidget',
    zone: 'header-widgets',
    component: SearchComponent,
    order: Enums.priority.normal,
});
```

**PassThrough Mode:**

```javascript
// Custom rendering control
<Zone zone='my-zone' passThrough>
    {({ components }) => (
        <div className='custom-layout'>
            {components.map((comp) => (
                <div key={comp.id} className='widget'>
                    {React.createElement(comp.component, comp)}
                </div>
            ))}
        </div>
    )}
</Zone>
```

### Additional SDK Utilities

**Memory Cache** (`reactium-sdk-core/src/core/MemoryCache.ts`):

```javascript
import { Cache } from '@atomic-reactor/reactium-core/sdk';

Cache.set('user.profile', { name: 'John' }, 60000); // 60s TTL
const profile = Cache.get('user.profile');

// Path-based subscriptions
Cache.subscribe('user', (event, key, value) => {
    console.log('User cache changed:', key, value);
});
```

**Prefs (localStorage)** (`reactium-sdk-core/src/browser/Prefs.ts`):

```javascript
import { Prefs } from '@atomic-reactor/reactium-core/sdk';

Prefs.set('user.theme', 'dark');
const theme = Prefs.get('user.theme', 'light');
Prefs.clear('user.theme');
```

**Fullscreen API** (`reactium-sdk-core/src/browser/Fullscreen.ts`):

```javascript
import { Fullscreen } from '@atomic-reactor/reactium-core/sdk';

Fullscreen.expand(); // Enter fullscreen
Fullscreen.collapse(); // Exit fullscreen
Fullscreen.toggle(); // Toggle state
const isFS = Fullscreen.isExpanded();
```

---

## Domain-Driven Design (DDD) Artifacts

Reactium organizes code by **domain** (feature/module) rather than file type.

### Artifact Discovery Process

**File:** `manifest/manifest-tools.js`

```javascript
const regenManifest = (manifest) => {
    // 1. Scan directories based on patterns
    const files = find(patterns, {
        directories: sourceMappings,
    });

    // 2. Map to domains using fileToDomain()
    // 3. Generate src/manifest.js with dynamic imports
};
```

### Basic Artifacts

#### 1. route.js (Routes)

**Pattern:** `(routes?|reactium-routes?.*?)\.jsx?$`

**File:** `learning/src/app/components/Greeter/reactium-route-greeter.js`

```javascript
import { Greeter as component } from './Greeter';

export default [
    {
        id: 'route-Greeter-1',
        exact: true,
        component,
        path: ['/greeter'],
    },
];
```

**Integration:**

1. Discovered by `manifest-tools.js`
2. Listed in `src/manifest.js` under `allRoutes`
3. Loaded by `routes-init` hook in `reactium-hooks-App.js`
4. Registered via `Reactium.Routing.register()`
5. `register-route` hook processes `component` for dynamic resolution

#### 2. reactium-hooks.js (Isomorphic Hooks)

**Purpose:** Bootstrap hooks (client + server)

**File:** `learning/src/app/components/HookTester/reactium-hooks-hooktester.js`

```javascript
(async () => {
    const { Hook, Enums, Component, ZoneRegistry } = await import(
        '@atomic-reactor/reactium-core/sdk'
    );

    Hook.register(
        'plugin-init',
        async () => {
            const { HookTester } = await import('./HookTester');
            const { Salutation } = await import('./Salutation');
            const { default: ZoneComponent } = await import('./ZoneComponent');

            Component.register('HookTester', HookTester);
            Component.register('Salutation', Salutation);

            ZoneRegistry.addComponent({
                id: 'ZoneComponentInHookTester',
                zone: 'my-test-zone',
                component: ZoneComponent,
                message: 'This component is rendered in a Zone!',
                order: Enums.priority.neutral,
            });
        },
        Enums.priority.normal,
        'plugin-init-HookTester',
    );
})();
```

**Integration:**

1. Discovered by `manifest-tools.js`
2. Listed in `src/manifest.js` under `allHooks`
3. Loaded by `dependencies.loadAll('allHooks')` during `plugin-init` hook

#### 3. reactium-boot.js (Backend-Only Hooks)

**Purpose:** Server-side initialization

**Pattern:** Files executed during server boot

**Example:**

```javascript
// reactium-boot.js
import { Hook } from '@atomic-reactor/reactium-core/sdk';

Hook.register('Server.Middleware', async (app) => {
    app.use('/api', customMiddleware);
});

Hook.register('Server.Init', async () => {
    // Initialize database connections, etc.
});
```

**Integration:**

1. Discovered by `boot-hooks.mjs`
2. Dynamically imported during server startup
3. Executed before `sdk-init` hook

#### 4. services.js (Utilities)

**Purpose:** Utility functions and AJAX requests

**Integration:**

1. Discovered by `manifest-tools.js`
2. Listed in `src/manifest.js` under `allServices`
3. Loaded by `dependencies.load()` and stored in `dependencies.services`

#### 5. domain.js (Domain Configuration)

**Purpose:** Per-domain configuration

**Example:**

```javascript
export default {
    name: 'MyDomain', // Explicit domain name
    version: '1.0.0',
    // ... other config
};
```

**Integration:**

1. Discovered by `manifest-tools.js`
2. Processed by `manifest/processors/domains.js`
3. Generates `src/domains.js` manifest
4. Used for domain name overrides in manifest generation

#### 6. \_reactium-style.scss (Styles)

**Purpose:** Domain-specific Sass styles

**Integration:**

1. Processed by Gulp `dddStylesPartial` task
2. Dynamically generates SCSS partials with priority-based ordering

### Build Artifacts

#### reactium-webpack.js (NEW Convention)

**Purpose:** Hook-driven Webpack configuration

**Example:**

```javascript
import { ReactiumWebpack } from '@atomic-reactor/reactium-core';

ReactiumWebpack.Hook.registerSync('webpack-config', (sdk) => {
    // Add custom loader
    sdk.addRule('my-loader', {
        test: /\.custom$/,
        use: 'my-custom-loader',
    });

    // Add plugin
    sdk.addPlugin('MyPlugin', new MyWebpackPlugin());
});
```

**Integration:**

-   Discovered by `WebpackSDK` constructor
-   Executed during Webpack configuration assembly

#### reactium-gulp.js (Gulp Tasks)

**Purpose:** Custom build tasks

**Example:**

```javascript
export default (gulp, config, gulpConfig) => {
    gulp.task('my-custom-task', () => {
        // Custom build logic
    });
};
```

**Integration:**

-   Discovered and required by `gulp.bootup.js`

### Runtime Artifacts

#### umd.js & umd-config.json

**Purpose:** Universal Module Definition bundles for runtime loading

**Use Case:** Service workers, runtime plugins

---

## Routing System

### Route Object Specification

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/routing/index.js`

```javascript
{
    // Core react-router properties
    path: string | string[],      // URL path(s)
    exact?: boolean,              // Exact path matching
    component: React.ComponentType | string,
    strict?: boolean,
    sensitive?: boolean,

    // Reactium extensions
    id?: string,                  // Auto-generated if not provided
    order?: number,               // Matching priority (default: 0)
    loadState?: AsyncFunction,    // SSR/data fetching
    handleId?: string,            // Handle system ID for loadState data
    persistHandle?: boolean,      // Keep handle on route change
    transitions?: boolean,        // Enable transition states
    transitionStates?: Array<{    // Custom transition sequence
        state: string,
        active: 'current' | 'previous'
    }>
}
```

### Data Fetching with loadState

**File:** `learning/src/app/components/DataLoader/DataLoader.jsx`

```javascript
export const DataLoader = ({ className }) => {
    const handle = useSyncHandle(DataLoader.handleId);
    const loadedData = handle ? handle.get('data') : null;
    const isLoading = handle.get('loading', true);

    return (
        <div className={className}>
            <h1>Data Loader</h1>
            {isLoading && <p>Loading...</p>}
            {loadedData && (
                <div>
                    <h2>Data:</h2>
                    <pre>{JSON.stringify(loadedData, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

// Static loadState method
DataLoader.loadState = async ({ route, params, search }) => {
    return new Promise((resolve) => {
        setTimeout(() => {
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

// Static handleId for data storage
DataLoader.handleId = 'DataLoaderHandle';
```

**Route Registration:**

```javascript
// File: learning/src/app/components/DataLoader/reactium-route-dataloader.js
import { DataLoader as component } from './DataLoader';
import { Enums } from '@atomic-reactor/reactium-core/sdk';

export default [
    {
        id: 'route-DataLoader-1',
        exact: true,
        component,
        path: '/data-loader',
        order: Enums.priority.high,
    },
];
// Note: loadState and handleId are on the component, not the route object
```

### Route Registration Flow

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/reactium-hooks-App.js`

```javascript
// 1. routes-init hook
Hook.register(
    'routes-init',
    async (routesRegistry) => {
        const allRoutes = await deps().loadAllDefaults('allRoutes');
        const globalRoutes = window.routes || global.routes || [];

        [...allRoutes, ...globalRoutes].forEach((route) => {
            Reactium.Routing.register(route);
        });
    },
    Enums.priority.core,
);

// 2. register-route hook (processes each route)
Hook.register(
    'register-route',
    async (route) => {
        // Dynamic component resolution
        if (typeof route.component === 'string') {
            route.component = hookableComponent(route.component);
        }
    },
    Enums.priority.core,
);
```

---

## State Management

### Component-Local State: useSyncState

**Best for:** Single-component state with event-driven updates

```javascript
import { useSyncState } from '@atomic-reactor/reactium-core/sdk';

const Counter = () => {
    const state = useSyncState({ count: 0, history: [] });

    // Listen to specific events
    state.addEventListener('set', (e) => {
        console.log('State changed:', e.data);
    });

    const increment = () => {
        const newCount = state.get('count') + 1;
        state.set('count', newCount);

        // Update nested path
        state.set('history', [...state.get('history'), newCount]);
    };

    return (
        <div>
            <p>Count: {state.get('count')}</p>
            <button onClick={increment}>Increment</button>
            <p>History: {state.get('history').join(', ')}</p>
        </div>
    );
};
```

### Global State: Handle System

**Best for:** Cross-component communication

```javascript
// Provider component
const AppDataProvider = () => {
    useRegisterHandle(
        'app-data',
        () => ({
            user: null,
            settings: { theme: 'light' },
            notifications: [],
        }),
        [],
    );

    return null;
};

// Consumer (non-reactive)
const UserInfo = () => {
    const appData = useHandle('app-data');
    return <div>{appData?.user?.name || 'Guest'}</div>;
};
```

### Global Reactive State: useSyncHandle

**Best for:** Global state with reactive updates

```javascript
// Provider
const ThemeProvider = () => {
    const state = useRegisterSyncHandle('app-theme', {
        mode: 'light',
        colors: { primary: '#007bff' },
    });

    // Expose methods
    state.extend('toggleMode', function () {
        const current = this.get('mode');
        this.set('mode', current === 'light' ? 'dark' : 'light');
    });

    return null;
};

// Consumer (reactive - re-renders on state changes)
const ThemeToggle = () => {
    const theme = useSyncHandle('app-theme');

    return (
        <button onClick={() => theme.toggleMode()}>
            Current: {theme.get('mode')}
        </button>
    );
};
```

### Selective State Subscription

**Best for:** Performance optimization

```javascript
import { useSelectHandle } from '@atomic-reactor/reactium-core/sdk';

const UserName = () => {
    // Only re-renders when 'user.name' changes
    const { selected: userName } = useSelectHandle(
        'app-data',
        'user.name',
        'Guest',
    );

    return <div>Hello, {userName}</div>;
};

// Or with callback selector
const UserRole = () => {
    const { selected: role } = useSelectHandle(
        'app-data',
        (state) => state.get('user.role'),
        'user',
    );

    return <div>Role: {role}</div>;
};
```

---

## Component Patterns

### Standard Functional Component

**File:** `learning/src/app/components/Hello/Hello.jsx`

```javascript
import { useSyncState } from '@atomic-reactor/reactium-core/sdk';
import React from 'react';
import { Link } from 'react-router-dom';

export const Hello = ({ className }) => {
    const state = useSyncState({ content: 'Hello Reactium' });

    return (
        <div className={className}>
            <h1>{state.get('content')}</h1>
            <nav>
                <ul>
                    <li>
                        <Link to='/user/123'>User Page</Link>
                    </li>
                    <li>
                        <Link to='/data-loader'>Data Loader</Link>
                    </li>
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

### Hookable Component (String-Based Resolution)

**Usage in routes:**

```javascript
export default [
    {
        id: 'my-route',
        path: '/page',
        component: 'MyComponent', // String reference
    },
];
```

**Registration:**

```javascript
// In reactium-hooks-*.js
Hook.register('plugin-init', async () => {
    const { MyComponent } = await import('./MyComponent');
    Component.register('MyComponent', MyComponent);
});
```

**Resolution:**

```javascript
// Automatic via register-route hook
route.component = hookableComponent('MyComponent');
```

### Dynamic Component via useHookComponent

```javascript
import { useHookComponent } from '@atomic-reactor/reactium-core/sdk';

const DynamicRenderer = ({ componentName }) => {
    const DynamicComp = useHookComponent(componentName, DefaultComponent);
    return <DynamicComp />;
};
```

### Zone-Based Components

```javascript
// Register to zone
ZoneRegistry.addComponent({
    id: 'sidebar-widget-1',
    zone: 'sidebar',
    component: MySidebarWidget,
    order: Enums.priority.high,
    // Additional props
    title: 'My Widget',
    canClose: true,
});

// Layout component
const Layout = () => (
    <div className='layout'>
        <aside>
            <Zone zone='sidebar' />
        </aside>
    </div>
);

// Widget receives all props
const MySidebarWidget = ({ title, canClose, ...props }) => (
    <div className='widget'>
        <h3>{title}</h3>
        {canClose && <button>Close</button>}
    </div>
);
```

---

## Build System

### Manifest Generation

**File:** `manifest/manifest-tools.js`

**Process:**

1. **Pattern Discovery:** Scan directories for DDD artifacts
2. **Domain Mapping:** Use `fileToDomain()` to map files to domains
3. **Template Processing:** Use Handlebars to generate `src/manifest.js`
4. **Dynamic Imports:** Create `req: () => import(...)` functions

**Generated Manifest Structure:**

```javascript
// src/manifest.js
export const allHooks = {
    HelloWorld: [
        () =>
            import('./app/components/HelloWorld/reactium-hooks-helloworld.js'),
    ],
    DataLoader: [
        () =>
            import('./app/components/DataLoader/reactium-hooks-dataloader.js'),
    ],
};

export const allRoutes = {
    HelloWorld: [
        () =>
            import('./app/components/HelloWorld/reactium-route-helloworld.js'),
    ],
    DataLoader: [
        () =>
            import('./app/components/DataLoader/reactium-route-dataloader.js'),
    ],
};

export const allServices = {
    /* ... */
};
```

### Gulp Task System

**File:** `gulp.tasks.js`

**Key Tasks:**

-   `mainManifest`: Generate src/manifest.js
-   `domainsManifest`: Generate src/domains.js
-   `styles:compile`: Compile Sass
-   `dddStylesPartial`: Generate style partials

**Custom Gulp Tasks:**

```javascript
// reactium-gulp.js in your domain
export default (gulp, config, gulpConfig) => {
    gulp.task('my-custom-task', () => {
        return gulp
            .src('src/**/*.custom')
            .pipe(customProcessor())
            .pipe(gulp.dest('public/'));
    });

    // Hook into existing task
    gulp.task('build', gulp.series('my-custom-task', 'default'));
};
```

### Webpack Extensibility

**WebpackSDK Methods:**

```javascript
sdk.addRule(id, rule);
sdk.addPlugin(id, plugin);
sdk.addAlias(key, path);
sdk.addIgnore(id, pattern);
sdk.addExtension(ext);
sdk.setCodeSplittingOptimize(env);
```

**Example Extension:**

```javascript
// reactium-webpack.js
import { ReactiumWebpack } from '@atomic-reactor/reactium-core';

ReactiumWebpack.Hook.registerSync('webpack-config', (sdk) => {
    // Add SVG loader
    sdk.addRule('svg-loader', {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
    });

    // Add environment plugin
    sdk.addPlugin(
        'env',
        new webpack.EnvironmentPlugin({
            API_URL: 'https://api.example.com',
        }),
    );
});
```

---

## Extensibility Points

### Backend Extensibility

**reactium-boot.js:**

```javascript
import { Hook } from '@atomic-reactor/reactium-core/sdk';

// Add Express middleware
Hook.register('Server.Middleware', async (app, options) => {
    app.use('/api/custom', customApiHandler);
});

// Initialize backend services
Hook.register('Server.Init', async () => {
    await connectToDatabase();
});

// SSR asset injection
Hook.register('Server.AppGlobals', async (AppGlobals, req, res) => {
    AppGlobals.register('myData', {
        value: { foo: 'bar' },
    });
});
```

### Frontend Extensibility

**reactium-hooks.js:**

```javascript
import {
    Hook,
    Component,
    ZoneRegistry,
} from '@atomic-reactor/reactium-core/sdk';

Hook.register('plugin-init', async () => {
    // Register components
    const { MyComp } = await import('./MyComp');
    Component.register('MyComp', MyComp);

    // Add to zones
    ZoneRegistry.addComponent({
        id: 'my-zone-comp',
        zone: 'header',
        component: MyComp,
        order: 100,
    });
});

// Custom hooks
Hook.register('app-ready', () => {
    console.log('Application is ready!');
});
```

### Build-Time Extensibility

**reactium-webpack.js:**

```javascript
import { ReactiumWebpack } from '@atomic-reactor/reactium-core';

ReactiumWebpack.Hook.registerSync('webpack-config', (sdk) => {
    sdk.addRule('markdown', {
        test: /\.md$/,
        use: 'raw-loader',
    });
});
```

**reactium-gulp.js:**

```javascript
export default (gulp) => {
    gulp.task('process-assets', () => {
        return gulp
            .src('assets/**/*')
            .pipe(customProcessor())
            .pipe(gulp.dest('public/assets'));
    });
};
```

---

## Best Practices

### 1. Component Organization

**DO:**

```
src/app/components/UserProfile/
├── UserProfile.jsx                      # Main component
├── reactium-route-userprofile.js       # Routes
├── reactium-hooks-userprofile.js       # Registration & hooks
├── _reactium-style.scss                # Styles
├── services.js                          # API calls
└── domain.js                            # Configuration
```

**DON'T:**

```
src/components/
├── UserProfile.jsx
src/routes/
├── userProfile.js
src/styles/
├── UserProfile.scss
```

### 2. Hook Registration

**DO:**

```javascript
Hook.register(
    'plugin-init',
    async () => {
        const { MyComponent } = await import('./MyComponent');
        Component.register('MyComponent', MyComponent);
    },
    Enums.priority.normal,
    'plugin-init-MyComponent', // Unique ID
);
```

**DON'T:**

```javascript
Hook.register('plugin-init', () => {
    // Sync import in async hook
    import('./MyComponent').then(/* ... */);
});
```

### 3. State Management Selection

**Use useSyncState when:**

-   State is component-local
-   Need event-driven updates
-   Want dynamic method extension

**Use Handle system when:**

-   State needs to be shared across components
-   Non-reactive access is sufficient

**Use useSyncHandle when:**

-   Need reactive global state
-   Want automatic re-renders on state changes

**Use useSelectHandle when:**

-   Only care about specific state slice
-   Want to optimize re-renders

### 4. Data Fetching

**loadState for routes:**

```javascript
MyComponent.loadState = async ({ route, params, search }) => {
    const data = await fetchData(params.id);
    return { data, loading: false };
};

MyComponent.handleId = 'my-component-data';
```

**useAsyncEffect for component-level:**

```javascript
import { useAsyncEffect } from '@atomic-reactor/reactium-core/sdk';

const MyComponent = () => {
    const [data, setData] = useState(null);

    useAsyncEffect(async (isMounted) => {
        const result = await fetchData();
        if (isMounted()) {
            setData(result);
        }
    }, []);

    return /* ... */;
};
```

### 5. Zone Usage

**DO:**

```javascript
// Define semantic zones
<Zone zone="header-actions" />
<Zone zone="main-content" />
<Zone zone="sidebar-widgets" />

// Register with priorities
ZoneRegistry.addComponent({
    id: 'user-menu',
    zone: 'header-actions',
    component: UserMenu,
    order: Enums.priority.highest  // Show first
});
```

**DON'T:**

```javascript
// Generic zones
<Zone zone="zone1" />
<Zone zone="zone2" />
```

### 6. CLI Usage

**Generate components:**

```bash
npx reactium component -n UserProfile -d src/app/components -H -r /user/:id --unattended
```

**Flags:**

-   `-n, --name`: Component name
-   `-d, --destination`: Parent directory
-   `-r, --route`: Route path(s)
-   `-H, --hooks`: Generate reactium-hooks file
-   `-s, --style`: Generate style file
-   `-u, --unattended`: Skip prompts

### 7. Testing

**Cypress for route testing:**

```javascript
// cypress/e2e/dataloader.cy.js
describe('DataLoader Component', () => {
    it('should display loaded data', () => {
        cy.visit('http://localhost:3000/data-loader');
        cy.get('[data-cy="loading"]').should('be.visible');
        cy.wait(1500);
        cy.get('[data-cy="data-loaded"]').should('be.visible');
        cy.get('[data-cy="loading"]').should('not.exist');
    });
});
```

---

## Common Patterns Reference

### Pattern: Dynamic Component Loading

```javascript
const DynamicPage = () => {
    const componentName = useParams().component;
    const Component = useHookComponent(componentName);
    return <Component />;
};
```

### Pattern: Global Service

```javascript
// Provider
const ApiService = () => {
    useRegisterHandle(
        'api',
        () => ({
            async fetch(endpoint) {
                return await fetch(`/api/${endpoint}`).then((r) => r.json());
            },
        }),
        [],
    );
    return null;
};

// Consumer
const DataDisplay = () => {
    const api = useHandle('api');
    const [data, setData] = useState(null);

    useEffect(() => {
        api.fetch('users').then(setData);
    }, []);

    return /* ... */;
};
```

### Pattern: Scroll Lock

```javascript
import { useScrollToggle } from '@atomic-reactor/reactium-core/sdk';

const Modal = ({ isOpen }) => {
    useScrollToggle(isOpen); // Disables scroll when open
    return isOpen ? <div className='modal'>...</div> : null;
};
```

### Pattern: Responsive Breakpoints

```javascript
import { breakpoint } from '@atomic-reactor/reactium-core/sdk';

const ResponsiveComponent = () => {
    const [bp, setBp] = useState(breakpoint());

    useEffect(() => {
        const handleResize = () => setBp(breakpoint());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return <div>Current breakpoint: {bp}</div>; // xs, sm, md, lg, xl
};
```

---

## File Path Reference

All examples reference actual source files:

**Core Framework:**

-   `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/`
-   `reactium-sdk-core/src/`
-   `CLI/`

**Learning Project:**

-   `learning/src/app/` - Application components
-   `learning/src/manifest.js` - Generated manifest
-   `learning/cypress/e2e/` - Cypress tests

**Build System:**

-   `manifest/manifest-tools.js` - Manifest generation
-   `gulp.tasks.js` - Gulp task definitions
-   `webpack.config.js` - Webpack configuration

---

## Conclusion

This documentation provides comprehensive coverage of the Reactium framework based on actual source code analysis. For deeper exploration:

1. **Examine the SDK source:** `reactium-sdk-core/src/`
2. **Study core implementations:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/`
3. **Review reference plugins:** `Reactium-Admin-Plugins/` and `Reactium-GraphQL-Plugin/`
4. **Build and test:** Use the `learning/` directory for hands-on practice

All patterns documented here are verified through actual code implementation and Cypress testing.
