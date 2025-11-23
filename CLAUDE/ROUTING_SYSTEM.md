<!-- v1.0.0 -->
# Reactium Routing System Architecture

**Deep Dive: Complete Lifecycle, Hooks, Transitions, and Code Splitting**

---

## Table of Contents

1. [Overview](#overview)
2. [File Discovery & Manifest Generation](#file-discovery--manifest-generation)
3. [Route Registration Lifecycle](#route-registration-lifecycle)
4. [The `register-route` Hook](#the-register-route-hook)
5. [Transition State Machine](#transition-state-machine)
6. [Code Splitting Patterns](#code-splitting-patterns)
7. [Advanced Features](#advanced-features)
8. [Best Practices](#best-practices)
9. [Common Gotchas](#common-gotchas)

---

## Overview

Reactium's routing system is built on **React Router v5** and provides:
- **Automatic route discovery** via file naming conventions
- **Hook-based route modification** before registration
- **Transition state machine** for page animations
- **Automatic code splitting** per route
- **Dynamic route registration** at runtime
- **Automatic data loading** via `loadState`

**Core Files:**
- `/home/john/reactium-framework/example-reactium-project/reactium_modules/@atomic-reactor/reactium-core/sdk/routing/index.js` - Main routing factory
- `/home/john/reactium-framework/example-reactium-project/reactium_modules/@atomic-reactor/reactium-core/app/reactium-hooks-App.js` - Route initialization hooks
- `/home/john/reactium-framework/example-reactium-framework/example-reactium-project/reactium_modules/@atomic-reactor/reactium-core/app/Router.jsx` - Router wrapper
- `/home/john/reactium-framework/example-reactium-project/reactium_modules/@atomic-reactor/reactium-core/app/RoutedContent.jsx` - Content renderer

---

## File Discovery & Manifest Generation

### Discovery Pattern

Routes are discovered during the **Gulp build process** using file naming patterns:

**Pattern Definition:**
```javascript
// reactium_modules/@atomic-reactor/reactium-core/reactium-config.js:86-92
{
    name: 'allRoutes',
    type: 'route',
    pattern: /(routes?|reactium-routes?.*?)\.jsx?$/,
}
```

**Scanned Locations:**
```javascript
// reactium-config.js:104-117
sourceMappings: [
    {
        from: 'src/app/',
        to: '../src/app/',
    },
    {
        from: 'reactium_modules/',
        to: '',
    },
    {
        node_modules: true,
        ignore: /^((?!reactium-plugin).)*$/,
    },
]
```

**Matching File Names:**
- `route.js` / `route.jsx`
- `routes.js` / `routes.jsx`
- `reactium-route-*.js` (e.g., `reactium-route-helloworld.js`)
- `reactium-routes-*.js`

### Manifest Generation Process

**Build Task:**
```javascript
// gulp.tasks.js:320-326
const manifest = gulp.series(
    gulp.parallel(
        gulp.series(task('domainsManifest'), task('mainManifest')),
        task('externalsManifest'),
        task('umdManifest'),
    ),
);
```

**File Scanning:**
```javascript
// manifest/manifest-tools.js:35-38
const sources = (sourcePath, searchParams) => {
    const t = tree(sourcePath, searchParams);
    return flattenRegistry(t);
};
```

**Generated Manifest:**
```javascript
// src/manifest.js (auto-generated)
const reqs = {
    allRoutes: {
        HelloWorld: {
            req: () => import('../src/app/components/HelloWorld/reactium-route-helloworld'),
            file: '../src/app/components/HelloWorld/reactium-route-helloworld',
        },
        // ... more routes
    }
};
```

**Watch Process:**
```javascript
// gulp.tasks.js:884-887
watchers['manifest'] = gulp.watch(
    config.watch.js,
    gulp.task('manifest'),
);
```

Any `.js` file change triggers manifest regeneration.

---

## Route Registration Lifecycle

### 1. Application Startup

**Hook Execution Order:**
```javascript
// app/index.jsx:18-92
init →
dependencies-load →
zone-defaults →
plugin-init →
plugin-dependencies →
routes-init →
plugin-ready
```

### 2. Routes Init Hook

**When:** After plugin initialization, before Router mounts

```javascript
// app/reactium-hooks-App.js:17-61
Hook.register('routes-init', async () => {
    // 1. Load route files from manifest
    const allRoutes = await deps().loadAllDefaults('allRoutes');

    // 2. Combine with global routes (SSR compatibility)
    const globalRoutes = window.routes || global.routes || [];

    // 3. Flatten and combine
    const combinedRoutes = _.chain(
        Object.values(allRoutes || {})
            .concat(globalRoutes)
            .filter(route => route)
            .map(route => _.flatten([route]))
    )
        .flatten()
        .compact()
        .value();

    // 4. Register each route (with path expansion)
    for (const route of combinedRoutes) {
        const paths = _.compact(_.flatten([route.path]));
        for (const path of paths) {
            await Reactium.Routing.register(
                { ...route, path },
                false  // Don't trigger update yet
            );
        }
    }
}, Enums.priority.core, 'REACTIUM_ROUTES_INIT');
```

### 3. Routing.load() Method

**When:** After `routes-init` hook completes

```javascript
// sdk/routing/index.js:311-340
load = async () => {
    if (this.loaded) return;

    // Run routes-init hook
    await Hook.run('routes-init', this.routesRegistry);

    // Register NotFound fallback
    this.routesRegistry.register({
        id: 'NotFound',
        exact: false,
        component: NotFound,
        order: Enums.priority.lowest,
    });

    this.loaded = true;

    // Set initial route in browser
    if (isBrowserWindow()) {
        this.setCurrentRoute(this.historyObj.location);
    }

    this._update();
    console.log('Initializing routes.');
}
```

### 4. Route Registration Method

**Core Registration:**
```javascript
// sdk/routing/index.js:417-434
async register(route = {}, update = true) {
    // Generate UUID if not provided
    if (!route.id) route.id = uuid();
    if (!route.order) route.order = 0;

    // Run register-route hook (see next section)
    await Hook.run('register-route', route);

    // Store in registry
    this.routesRegistry.register(route.id, route);

    // Notify subscribers
    if (update) this._update();

    return route.id;
}
```

### 5. Route Sorting & Matching

**Sort Strategy:**
```javascript
// sdk/routing/index.js:74-79
get routes() {
    return _.sortBy(
        _.sortBy(this.routesRegistry.list, 'path').reverse(),
        'order',
    );
}
```

**First by path (reversed), then by order** - Higher `order` values match first.

**Matching Process:**
```javascript
// sdk/routing/index.js:169-184
const matches = this.routes
    .map((route) => ({
        route,
        match: matchPath(location.pathname, route),  // React Router matchPath
    }))
    .filter(({ match }) => match);

let [match] = matches;  // First match wins

// Fallback to NotFound
if (!match) {
    match = {
        route: this.routes.find(({ id }) => id === 'NotFound'),
        match: undefined,
    };
}
```

---

## The `register-route` Hook

### Purpose

Modify route objects **before** they're registered. Used for:
- Converting string component names to actual components
- Adding authentication guards
- Injecting route-specific data
- Modifying paths dynamically

### Core Hook: String Component Resolution

```javascript
// app/reactium-hooks-App.js:63-74
Hook.register(
    'register-route',
    async route => {
        // Convert component: "MyComponent" → hookableComponent("MyComponent")
        if (typeof route.component === 'string') {
            route.component = hookableComponent(route.component);
        }
        return route;
    },
    Enums.priority.core,
    'REACTIUM_REGISTER_ROUTE_STRINGABLE',
);
```

**Enables this pattern:**
```javascript
// route.js
export default {
    path: '/admin',
    component: 'AdminPanel',  // String reference
};

// Component registration (elsewhere)
Reactium.Component.register('AdminPanel', AdminPanelComponent);
```

### Hook Invocation

```javascript
// sdk/routing/index.js:430
await Hook.run('register-route', route);
```

**Important:** The `route` object is **mutated** by hooks (passed by reference).

### Custom Hook Examples

**Authentication Guard:**
```javascript
Hook.register('register-route', async (route) => {
    if (route.requiresAuth) {
        const originalComponent = route.component;
        route.component = (props) => {
            const isAuthenticated = useAuth();
            if (!isAuthenticated) return <Redirect to="/login" />;
            return <originalComponent {...props} />;
        };
    }
}, Enums.priority.high);
```

**Route Analytics:**
```javascript
Hook.register('register-route', async (route) => {
    const originalLoadState = route.loadState;
    route.loadState = async (params) => {
        analytics.track('route-load', { path: route.path });
        return originalLoadState ? originalLoadState(params) : {};
    };
}, Enums.priority.low);
```

---

## Transition State Machine

### Overview

Reactium provides a **page transition state machine** for coordinating:
- Exit animations on the previous page
- Loading states during data fetch
- Entry animations on the new page
- Ready state when fully loaded

### Default Transition States

```javascript
// sdk/routing/index.js:24-41
const defaultTransitionStates = [
    {
        state: 'EXITING',
        active: 'previous',  // Show previous route
    },
    {
        state: 'LOADING',
        active: 'current',  // Show current route
    },
    {
        state: 'ENTERING',
        active: 'current',
    },
    {
        state: 'READY',
        active: 'current',
    },
];
```

### Enabling Transitions

**Route Configuration:**
```javascript
// reactium-route-exitingpage.js
export default [
    {
        id: 'route-ExitingPage-1',
        exact: true,
        component: ExitingPage,
        path: ['/exit-route'],
        transitions: true,  // Enable state machine
        transitionStates: [  // Optional: custom states
            { state: 'EXITING', active: 'previous' },
            { state: 'READY', active: 'current' },
        ],
    },
];
```

### Transition Setup

```javascript
// sdk/routing/index.js:242-269
setupTransitions = () => {
    const previousTransitions = op.get(this.previousRoute, 'match.route.transitions', false) === true;
    const currentTransitions = op.get(this.currentRoute, 'match.route.transitions', false) === true;
    const currentTransitionStates = op.get(
        this.currentRoute,
        'match.route.transitionStates',
        defaultTransitionStates,
    ) || [];

    // Filter states based on active route
    this.transitionStates = (
        !currentTransitions ? [] : currentTransitionStates
    ).filter(({ active = 'current' }) => {
        return (
            active === 'current' ||
            (active === 'previous' && previousTransitions)
        );
    });

    const [transition, ...transitionStates] = this.transitionStates;
    this.transitionStates = transitionStates;
    this.setTransitionState(transition);
};
```

### Advancing States

**Manual Advance:**
```javascript
// sdk/routing/index.js:276-282
nextState = () => {
    if (this.transitionStates.length > 0) {
        const [transition, ...transitionStates] = this.transitionStates;
        this.transitionStates = transitionStates;
        this.setTransitionState(transition);
    }
};

// In component:
Reactium.Routing.nextState();
```

**Skip to READY:**
```javascript
// sdk/routing/index.js:271-274
jumpCurrent = () => {
    this.transitionStates = [];
    this.setTransitionState(null);
};

// Usage:
Reactium.Routing.jumpCurrent();
```

### Component Implementation

```javascript
// example: TransitionPage.jsx
export const TransitionPage = ({ transitionState, ...props }) => {
    const routing = useRouting();

    useEffect(() => {
        if (transitionState === 'LOADING') {
            setTimeout(() => {
                Reactium.Routing.nextState();
            }, 500);
        } else if (transitionState === 'ENTERING') {
            setTimeout(() => {
                Reactium.Routing.nextState();
            }, 500);
        }
    }, [transitionState]);

    return (
        <div className={className}>
            {transitionState === 'LOADING' && <LoadingSpinner />}
            {transitionState === 'EXITING' && <ExitAnimation />}
            {transitionState === 'ENTERING' && <EnterAnimation />}
            {transitionState === 'READY' && <PageContent />}
        </div>
    );
};
```

### Listening to Transitions

**useRouting Hook:**
```javascript
// sdk/named-exports/routing.js:7-58
export const useRouting = () => {
    const routing = useSyncState({
        current: Routing.currentRoute,
        previous: Routing.previousRoute,
        active: Routing.currentRoute,
        transitionState: Routing.transitionState || 'READY',
        transitionStates: Routing.transitionStates || [],
        changes: Routing.changes || {},
    });

    const handler = (updates, forceRefresh = true) => {
        routing.set(updates, undefined, forceRefresh);
    };

    useEffect(() => {
        const id = uuid();
        Routing.routeListeners.register(id, { handler });
        refreshFromRouting();

        return () => {
            Routing.routeListeners.unregister(id);
        };
    }, []);

    return routing;
};
```

**Access Current State:**
```javascript
const routing = useRouting();
const transitionState = routing.get('transitionState');  // 'EXITING' | 'LOADING' | 'ENTERING' | 'READY'
const activeRoute = routing.get('active');  // Current or previous route
```

---

## Code Splitting Patterns

### Automatic Code Splitting

**Every route component is automatically code-split** via dynamic imports in the manifest:

```javascript
// src/manifest.js (generated)
allRoutes: {
    HelloWorld: {
        req: () => import(
            '../src/app/components/HelloWorld/reactium-route-helloworld'
        ),
        file: '../src/app/components/HelloWorld/reactium-route-helloworld',
    },
}
```

**Webpack Configuration:**
```javascript
// webpack.config.js:50-53
sdk.setCodeSplittingOptimize(env);
if (process.env.DISABLE_CODE_SPLITTING === 'true') {
    sdk.setNoCodeSplitting();
}
```

**Code Splitting Strategy:**
```javascript
// webpack.sdk.js:308-324
setCodeSplittingOptimize(env) {
    this.optimizationValue = {
        minimize: Boolean(env !== 'development'),
        chunkIds: 'named',
        splitChunks: {
            chunks: 'all',
            minSizeReduction: 500000,  // 500KB threshold
            cacheGroups: {
                main: {
                    minChunks: 1,
                    priority: -20,
                    reuseExistingChunk: true,
                },
            },
        },
    };
}
```

### loadState Pattern (Data Preloading)

**Automatic Data Loading:**

Routes can define a `loadState` function that runs **before** the component renders:

```javascript
// reactium-route-advancedloader.js
export default [
    {
        id: 'route-AdvancedLoader-1',
        component: AdvancedLoader,
        path: ['/advanced-loader/:id'],
        handleId: 'AdvancedLoaderHandle',
        persistHandle: true,
        loadState: async ({ params, search }) => {
            console.log(`loadState called for id: ${params.id}`);
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        data: {
                            message: `Data for user ${params.id}`,
                            timestamp: Date.now(),
                            params,
                            search,
                        },
                        loading: false,
                    });
                }, 1000);
            });
        },
    },
];
```

**loadState Execution:**
```javascript
// sdk/routing/index.js:81-160
handleFrontEndDataLoading = async (updates) => {
    if (pathChanged || routeChanged || searchChanged) {
        // Clean up previous route handles
        Object.entries(Handle.handles)
            .filter(([, handle]) => {
                return op.get(handle, 'routeId') === op.get(updates, 'previous.match.route.id');
            })
            .filter(([id]) => !op.get(Handle.get(id), 'persistHandle'))
            .forEach(([id]) => {
                Handle.unregister(id);
            });

        // Get loadState function
        const loadState = op.get(
            updates,
            'active.match.route.component.loadState',
            op.get(updates, 'active.match.route.loadState'),
        );

        const handleId = op.get(
            updates,
            'active.match.route.component.handleId',
            op.get(updates, 'active.match.route.handleId', uuid()),
        );

        if (typeof loadState === 'function') {
            try {
                const persistHandle = op.get(updates, 'active.match.route.persistHandle', false);

                // Create handle
                if (!persistHandle || !Handle.get(handleId)) {
                    Handle.register(handleId, {
                        routeId: op.get(updates, 'active.match.route.id'),
                        persistHandle,
                        current: new ReactiumSyncState({}),
                    });
                }

                const route = op.get(updates, 'active.match.route', {});
                op.set(route, 'handleId', handleId);

                const params = op.get(updates, 'active.params', {});
                const search = op.get(updates, 'active.search', {});

                // Execute loadState
                const content = await loadState({ route, params, search });

                // Store result in handle
                const handle = op.get(Handle.handles, [handleId, 'current']);
                if (handle) handle.set(content);
            } catch (error) {
                const handle = op.get(Handle.handles, [handleId, 'current']);
                if (handle) handle.set({ error });
                console.error('Error loading content for component', error);
            }
        }
    }
};
```

**Component Usage:**
```javascript
// DataLoader.jsx
export const DataLoader = ({ className }) => {
    const handle = useSyncHandle(DataLoader.handleId);
    const loadedData = handle ? handle.get('data') : null;
    const isLoading = handle.get('loading', true);

    return (
        <div className={className}>
            {isLoading && <p>Loading...</p>}
            {loadedData && (
                <pre>{JSON.stringify(loadedData, null, 2)}</pre>
            )}
        </div>
    );
};

DataLoader.loadState = async ({ route, params, search }) => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                data: { message: 'Data loaded!' },
                loading: false,
            });
        }, 1000);
    });
};

DataLoader.handleId = 'DataLoaderHandle';
```

### Handle Persistence

**persistHandle: true** - Handle survives route changes:

```javascript
{
    path: '/dashboard/:id',
    handleId: 'DashboardHandle',
    persistHandle: true,  // Handle not cleaned up on route change
    loadState: async ({ params }) => {
        return await fetchDashboard(params.id);
    },
}
```

---

## Advanced Features

### Dynamic Route Registration

**Add routes at runtime:**

```javascript
// In plugin or component
Reactium.Routing.register({
    id: 'my-dynamic-route',
    path: '/admin/new-feature',
    exact: true,
    component: NewFeature,
    order: Enums.priority.high,
});
```

### Route Unregistration

```javascript
// sdk/routing/index.js:446-449
unregister(id, update = true) {
    this.routesRegistry.unregister(id);
    if (update) this._update();
}

// Usage:
Reactium.Routing.unregister('my-dynamic-route');
```

**Important:** Cannot unregister 'NotFound' route.

### Multiple Paths per Route

```javascript
export default {
    path: ['/about', '/about-us', '/company'],  // All resolve to same component
    component: AboutPage,
};
```

**Expands to 3 separate registrations:**
```javascript
// app/reactium-hooks-App.js:46-56
for (const route of combinedRoutes) {
    const paths = _.compact(_.flatten([route.path]));
    for (const path of paths) {
        await Reactium.Routing.register(
            { ...route, path },
            false,
        );
    }
}
```

### SSR Route Injection

**Server-side routes:**
```javascript
// Server-side
global.routes = [
    {
        path: '/ssr-only',
        component: SSRComponent,
    },
];
```

**Client merges with manifest routes:**
```javascript
// app/reactium-hooks-App.js:26-34
let globalRoutes = [];
if (isBrowserWindow()) {
    if ('routes' in window && Array.isArray(window.routes)) {
        globalRoutes = window.routes;
    }
} else {
    if ('routes' in global && Array.isArray(global.routes)) {
        globalRoutes = global.routes;
    }
}
```

### Route Params & Search

**Automatic Parsing:**
```javascript
// sdk/routing/index.js:186-194
op.set(current, 'params', op.get(match, 'match.params', {}));
op.set(
    current,
    'search',
    queryString.parse(
        op.get(current, 'location.search', '').replace(/^\?/, ''),
    ),
);
```

**Access in Component:**
```javascript
const routing = useRouting();
const params = routing.get('active.params');  // { id: '123' }
const search = routing.get('active.search');  // { filter: 'active', page: '2' }

// Or use convenience hook:
const params = useRouteParams();
```

---

## Best Practices

### 1. File Naming Convention

**Recommended:**
```
src/app/components/Dashboard/
  ├── Dashboard.jsx              (Component)
  ├── reactium-route-dashboard.js (Route config)
  └── reactium-hooks-dashboard.js (Hooks)
```

**Why:** Clear separation of concerns, auto-discovery works, easy to locate.

### 2. Route Order

**Use semantic priorities:**
```javascript
import { Enums } from '@atomic-reactor/reactium-core/sdk';

export default {
    path: '/admin',
    order: Enums.priority.highest,  // Match before generic routes
    component: AdminPanel,
};
```

**Priority Values:**
```javascript
// From @atomic-reactor/reactium-sdk-core
Enums.priority = {
    highest: 1000,
    high: 100,
    neutral: 0,
    low: -100,
    lowest: -1000,
};
```

### 3. loadState Error Handling

**Always handle errors:**
```javascript
loadState: async ({ params }) => {
    try {
        const data = await fetchData(params.id);
        return { data, loading: false, error: null };
    } catch (error) {
        console.error('loadState error:', error);
        return { data: null, loading: false, error: error.message };
    }
}
```

### 4. Handle Cleanup

**Use persistHandle wisely:**
```javascript
// Persist across route changes (dashboard data)
{
    handleId: 'UserDashboard',
    persistHandle: true,
    loadState: fetchUserDashboard,
}

// Auto-cleanup (form data)
{
    handleId: 'ContactForm',
    persistHandle: false,  // Default
    loadState: fetchFormConfig,
}
```

### 5. Transition State Naming

**Use consistent state names:**
```javascript
transitionStates: [
    { state: 'EXITING', active: 'previous' },
    { state: 'LOADING', active: 'current' },
    { state: 'ENTERING', active: 'current' },
    { state: 'READY', active: 'current' },
]
```

### 6. Component as String

**Leverage string components for lazy loading:**
```javascript
// Route config
export default {
    path: '/settings',
    component: 'UserSettings',  // String reference
};

// Register component elsewhere (plugin)
Reactium.Component.register('UserSettings', UserSettingsComponent);
```

**Benefit:** Component can be code-split separately from route.

---

## Common Gotchas

### 1. Route Order vs Path Specificity

**GOTCHA:**
```javascript
// Route A
{ path: '/users/:id', order: 0 }

// Route B
{ path: '/users/new', order: 0 }
```

**Problem:** `/users/new` matches Route A (`id = 'new'`)

**Solution:** Use higher order for specific routes:
```javascript
// Route B (now matches first)
{ path: '/users/new', order: Enums.priority.high }

// Route A
{ path: '/users/:id', order: 0 }
```

### 2. loadState Timing

**GOTCHA:**
```javascript
const MyComponent = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchData().then(setData);  // Duplicate loading!
    }, []);

    // ...
};

MyComponent.loadState = async () => {
    return await fetchData();  // Already loaded here
};
```

**Solution:** Use the handle:
```javascript
const MyComponent = () => {
    const handle = useSyncHandle(MyComponent.handleId);
    const data = handle.get('data');

    // No useEffect needed!
};
```

### 3. Transition nextState() Not Called

**GOTCHA:**
```javascript
useEffect(() => {
    if (transitionState === 'LOADING') {
        // Forgot to call nextState()
        fetchData();
    }
}, [transitionState]);
```

**Result:** Stuck in LOADING state forever.

**Solution:** Always advance:
```javascript
useEffect(() => {
    if (transitionState === 'LOADING') {
        fetchData().then(() => {
            Reactium.Routing.nextState();
        });
    }
}, [transitionState]);
```

### 4. Handle Not Registered

**GOTCHA:**
```javascript
const handle = useSyncHandle('MyHandle');
const data = handle.get('data');  // TypeError: Cannot read property 'get' of undefined
```

**Problem:** Handle doesn't exist yet.

**Solution:** Check existence:
```javascript
const handle = useSyncHandle('MyHandle');
const data = handle ? handle.get('data') : null;
```

### 5. Route Registry Mutation

**GOTCHA:**
```javascript
Hook.register('register-route', (route) => {
    return { ...route, modified: true };  // New object returned, not mutated
});
```

**Problem:** Return value is ignored.

**Solution:** Mutate in-place:
```javascript
Hook.register('register-route', (route) => {
    route.modified = true;  // Mutate the route object
    return route;  // Return is optional but good practice
});
```

### 6. NotFound Route Override

**GOTCHA:**
```javascript
Reactium.Routing.register({
    id: 'NotFound',  // Overwrites default NotFound
    component: MyCustomNotFound,
});
```

**Problem:** Default NotFound is already registered.

**Solution:** Register component, not route:
```javascript
Reactium.Component.register('NotFound', MyCustomNotFound);
```

### 7. Async Hook Timing

**GOTCHA:**
```javascript
Hook.register('routes-init', async () => {
    const routes = await fetchRoutesFromAPI();  // Delays all route registration
    routes.forEach(route => Reactium.Routing.register(route, false));
});
```

**Problem:** Entire app waits for API.

**Solution:** Use lower priority for async routes:
```javascript
Hook.register('plugin-ready', async () => {
    const routes = await fetchRoutesFromAPI();
    routes.forEach(route => Reactium.Routing.register(route));
}, Enums.priority.low);
```

### 8. History Object Access

**GOTCHA:**
```javascript
// Server-side
const history = Routing.history;
history.push('/new-route');  // TypeError
```

**Problem:** History doesn't exist on server.

**Solution:** Check environment:
```javascript
import { isBrowserWindow } from '@atomic-reactor/reactium-core/sdk';

if (isBrowserWindow()) {
    Routing.history.push('/new-route');
}
```

---

## Summary

Reactium's routing system provides a **complete lifecycle** from file discovery to rendered content:

1. **Build Time:** Gulp scans for route files → generates manifest
2. **Startup:** `routes-init` hook loads routes → `register-route` hook modifies → Registry stores
3. **Navigation:** Browser history changes → `setCurrentRoute` → Match routes → Update listeners
4. **Transitions:** State machine advances through EXITING → LOADING → ENTERING → READY
5. **Data Loading:** `loadState` executes → Handle stores result → Component renders
6. **Code Splitting:** Each route auto-split → Lazy loaded on navigation

**Key Files:**
- `sdk/routing/index.js` - Core routing logic (469 lines)
- `app/reactium-hooks-App.js` - Initialization hooks
- `manifest/manifest-tools.js` - File discovery
- `dependencies/index.js` - Module loading

**Key Patterns:**
- Hook-based modification (`register-route`)
- Handle-based data loading (`loadState` + `useSyncHandle`)
- Transition-based animations (`nextState()` + `transitionState`)
- Priority-based ordering (`order` + `Enums.priority`)

**Common Use Cases:**
- Standard routing: File → manifest → auto-register
- Auth guards: `register-route` hook wraps component
- Page transitions: Enable `transitions: true` + custom states
- Data preloading: Define `loadState` + access via handle
- Dynamic routes: `Reactium.Routing.register()` at runtime
