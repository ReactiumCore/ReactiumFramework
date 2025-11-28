<!-- v1.0.0 -->

# Blueprint System Architecture (Reactium Admin)

**Purpose**: Page layout templates for Reactium Admin routing with section/zone-based UI composition

**Source**: `Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/Blueprint/` (220 lines total)

---

## Overview

The Blueprint system provides **reusable page layout templates** for Reactium Admin applications. Each blueprint defines sections (sidebar, main, tools) containing zones where UI components render. Routes reference blueprint IDs to determine page structure.

**Key Integration**: Blueprint component is registered as the route component for all admin routes via `Reactium.Routing.register()`, providing consistent page layouts across the admin interface.

---

## Core Architecture

### Blueprint Component Flow

```
Database Route → Blueprint ID → Blueprint.get(blueprintId) → Blueprint Component Renders Sections → Zones Render Content
```

1. Route stored in database references `blueprint` field (e.g., "Admin", "Simple", "Profile")
2. `Blueprint.initRoutes()` loads routes from database on `routes-init` hook
3. Routes with capability permissions passed to `Reactium.Routing.register()` with Blueprint component
4. Blueprint component renders sections → zones → Zone components with plugins

**Source**: `Blueprint/sdk.js:112-217`, `Blueprint/index.js:53-185`

---

## Blueprint Registration API

### Reactium.Blueprint Registry

```javascript
// Built on registryFactory with CLEAN mode
const SDK = Reactium.Blueprint = Reactium.Utils.registryFactory(
    'Blueprint',
    'ID',        // Key field
    Reactium.Utils.Registry.MODES.CLEAN,
);

// Registration via blueprints hook
Reactium.Hook.register('blueprints', async (Blueprint) => {
    Blueprint.register('MyBlueprintID', {
        ID: 'MyBlueprintID',
        description: 'My custom blueprint',
        sections: {
            sidebar: {
                zones: ['admin-sidebar'],
                meta: {},
            },
            main: {
                zones: ['admin-header', 'my-custom-zone'],
                meta: {},
            },
        },
        meta: {
            builtIn: false,
            admin: true,
            namespace: 'admin-page',
            transitions: true,
        },
        className: 'MyBlueprint',
    });
});
```

**Source**: `Blueprint/sdk.js:70-107`, `Blueprint/reactium-hooks.js:77-99`

---

## Blueprint Structure

### Configuration Object

```javascript
{
    ID: 'Admin',                    // Unique blueprint identifier
    description: 'Admin blueprint', // Human-readable description
    className: 'Blueprint',         // CSS class for blueprint wrapper

    // Sections define major page areas
    sections: {
        sidebar: {
            zones: ['admin-sidebar'],           // Zones to render in section
            meta: {},                            // Section metadata
            wrapper: CustomWrapperComponent,     // Optional: custom section wrapper (default: <section>)
        },
        main: {
            zones: [
                'admin-header',
                'admin-dashboard',
                'admin-actions',
            ],
            meta: {
                refresh: true,  // Show loading state during route transitions
            },
        },
        tools: {
            zones: ['admin-tools'],  // Auto-added by sanitizeBP if missing
            meta: {},
        },
    },

    // Blueprint metadata
    meta: {
        builtIn: true,              // Prevent deletion/modification
        admin: true,                // Admin-specific blueprint
        namespace: 'admin-page',    // Body data-namespace attribute
        transitions: true,          // Enable route transition states
        transitionStates: [...],    // Custom transition states (default: EXITING→LOADING→ENTERING→READY)
    },
}
```

**Source**: `Blueprint/sdk.js:11-67`, `Blueprint/index.js:46-137`

---

## Built-In Blueprints

### DEFAULTS Array (3 blueprints)

1. **Admin** - Full admin layout with sidebar + header + dashboard + actions
2. **Simple** - Single content zone (minimal layout)
3. **Profile** - Sidebar + header + profile + actions

**Auto-sanitization**: All blueprints automatically get `tools` section with `admin-tools` zone if missing.

**Source**: `Blueprint/sdk.js:11-95`

---

## Route-Blueprint Integration

### Blueprint.initRoutes() Lifecycle

```javascript
Reactium.Blueprint.initRoutes = async () => {
    // 1. Run blueprints hook (register all blueprints)
    await Reactium.Hook.run('blueprints', Reactium.Blueprint);

    // 2. Load routes from database (10-second cache)
    let routes = Reactium.Cache.get('BLUEPRINT_ROUTES');
    if (!routes) {
        const noAppProp = new Reactium.Query('Route').doesNotExist('meta.app');
        const hasAppRoute = new Reactium.Query('Route').equalTo('meta.app', routingApp);
        const baseQuery = Reactium.Query.or(noAppProp, hasAppRoute);

        routes = (await baseQuery.find()).map(r => r.toJSON());
        Reactium.Cache.set('BLUEPRINT_ROUTES', routes, 10000); // 10s TTL
    }

    // 3. Bulk capability check for route visibility
    const capChecks = {};
    routes.forEach(route => {
        const capabilities = route.capabilities?.filter(cap => typeof cap === 'string');
        if (capabilities?.length > 0) {
            capChecks[route.objectId] = { capabilities, strict: false };
        }
    });

    const permissions = await Reactium.Cloud.run('capability-bulk-check', { checks: capChecks });

    // 4. Register routes with Blueprint component
    for (const r of routes) {
        const { objectId: id, route: path, blueprint: blueprintId, meta } = r;

        const blueprint = Reactium.Blueprint.get(blueprintId) || Reactium.Blueprint.get('Admin');

        const route = {
            id,
            path,
            order: meta.order ?? Reactium.Enums.priority.normal,
            meta,
            blueprint,
            component: Blueprint,  // All routes use Blueprint component
            transitions: blueprint.meta.transitions ?? true,
            transitionStates: blueprint.meta.transitionStates ?? Enums.transitionStates,
        };

        if (permissions[id] === true) {  // Only register if user has capabilities
            await Reactium.Routing.register(route);
        }
    }
};
```

**Source**: `Blueprint/sdk.js:112-217`

**Hook Registration**: `Reactium.Hook.register('routes-init', SDK.initRoutes, Reactium.Enums.priority.highest)`

**Source**: `Blueprint/reactium-hooks.js:33-37`

---

## Blueprint Component Rendering

### Component Props

```javascript
const Blueprint = (props) => {
    const {
        active,           // Active routing state (might be previous pathname/component)
        params,           // Route params
        search,           // URL params as object
        transitionState,  // Current state: EXITING, LOADING, ENTERING, READY
        transitionStates, // Upcoming state changes if nextState() called
    } = props;

    const route = active.match.route;
    const blueprint = route.blueprint;
    // ...
};
```

**Source**: `Blueprint/index.js:53-60`

### Rendering Pipeline

1. **Transition State Management**: Automatically calls `Reactium.Routing.nextState()` when ready
2. **Body/HTML Attributes**: Sets `data-namespace` on body, `data-theme` on html
3. **Preloader Removal**: Removes `#site-preloader` on mount
4. **Section Iteration**: Renders each section with wrapper component
5. **Zone Rendering**: Each zone renders as `<Zone>` component with blueprint props

**Source**: `Blueprint/index.js:63-184`

### Zone Props Passed to Each Zone

```javascript
const zoneProps = {
    route,              // Full route object
    params,             // Route params
    search,             // URL params
    routeProps: props,  // Original Blueprint props
    settings,           // window.settings / global.settings
    zone: 'admin-sidebar',     // Current zone name
    zones: ['admin-sidebar', 'admin-header', ...],  // All zones in blueprint
    section: 'sidebar',        // Current section name
    sections: ['sidebar', 'main', 'tools'],  // All sections
    meta: {
        blueprint: blueprintMeta,  // Blueprint metadata
        zone: zoneMeta,            // Section metadata
    },
};
```

**Source**: `Blueprint/index.js:154-163`

---

## Route Loading Lifecycle

### blueprint-route-loader Hook

```javascript
// Fires during LOADING transition state
Reactium.Hook.register('blueprint-route-loader', async (updates) => {
    // Custom data loading logic
    // Example: Fetch route-specific data before ENTERING state
});
```

**Integration**: Routing observer listens for `transitionState === 'LOADING'` and runs `blueprint-route-loader` hook before calling `nextState()`.

**Source**: `Blueprint/reactium-hooks.js:6-31`

---

## Transition States

### Default Transition Sequence

```javascript
const transitionStates = [
    { state: 'EXITING',  active: 'previous' },  // Previous route component shown
    { state: 'LOADING',  active: 'current' },   // blueprint-route-loader hook runs
    { state: 'ENTERING', active: 'current' },   // New route component mounting
    { state: 'READY',    active: 'current' },   // Route fully rendered
];
```

**Source**: `Blueprint/enums.js:1-22`

**Automatic Progression**: Blueprint component automatically calls `Reactium.Routing.nextState()` when `transitionState !== 'LOADING'` and more states remain.

**Source**: `Blueprint/index.js:63-67`

---

## Real-World Examples

### Example 1: Custom Blueprint with Content Editor

```javascript
// Content Type Editor blueprint
Reactium.Hook.register('blueprints', async (Blueprint) => {
    Blueprint.register('ContentType', {
        ID: 'ContentType',
        description: 'Content type editor',
        sections: {
            sidebar: {
                zones: ['admin-sidebar'],
                meta: {},
            },
            main: {
                zones: ['admin-header', 'admin-content-type-editor'],
                meta: {},
            },
        },
        meta: {
            admin: true,
            builtIn: true,
            namespace: 'admin-page',
        },
    });
});
```

**Source**: `Content/TypeEditor/reactium-hooks.js:77-99`

### Example 2: Login Blueprint (No Sidebar)

```javascript
const blueprint = {
    ID: 'Login',
    description: 'Login blueprint',
    sections: {
        main: {
            zones: ['admin-login'],
            meta: {},
        },
    },
    meta: {
        admin: true,
        builtIn: true,
    },
};

Reactium.Hook.register('blueprints', async (Blueprint) => {
    Blueprint.register('Login', blueprint);
});
```

**Source**: `Login/reactium-hooks.js:62`

### Example 3: Section with Custom Wrapper and Refresh

```javascript
const CustomWrapper = ({ children, ...props }) => (
    <div className="custom-section-wrapper" {...props}>
        {children}
    </div>
);

Blueprint.register('CustomBP', {
    ID: 'CustomBP',
    sections: {
        main: {
            zones: ['content'],
            wrapper: CustomWrapper,  // Custom wrapper instead of <section>
            meta: {
                refresh: true,  // Show ZoneLoading during route transitions
                className: 'my-main',
            },
        },
    },
    meta: {},
});
```

**Loading Indicator**: When `meta.refresh: true`, zones show `<ZoneLoading>` component during transitions instead of `<Zone>`.

**Source**: `Blueprint/index.js:138-176`

---

## Integration with Route System

### Database Route Object

```javascript
// Parse Server Route collection
{
    objectId: 'route123',
    route: '/admin/content',
    blueprint: 'Admin',  // References blueprint ID
    meta: {
        app: 'admin',
        order: 100,
        category: 'Content',
    },
    capabilities: ['content-ui.view'],  // Capability-based access control
    permitted: true,  // Set by route-list-output hook after capability check
}
```

**Source**: `actinium-route/plugin.js` (documented in ACTINIUM_ROUTE_SYSTEM.md)

---

## Best Practices

### Blueprint Design

1. **Use Built-Ins First**: Start with Admin/Simple/Profile before creating custom
2. **Namespace Consistency**: Use consistent `meta.namespace` for body attribute styling
3. **Zone Naming Convention**: Prefix with context (e.g., `admin-*`, `content-*`)
4. **Register on blueprints Hook**: Always register blueprints on `blueprints` hook, not earlier
5. **Capability-Gate Routes**: Use route capabilities to control blueprint visibility
6. **Minimal Zones**: Fewer zones = simpler layouts, easier maintenance
7. **Section Wrappers**: Use custom wrappers for specialized layouts only

### Performance

1. **Route Caching**: Routes cached for 10 seconds to reduce database queries
2. **Bulk Capability Checks**: All route capabilities checked in single cloud function call
3. **Lazy Zone Components**: Zones only render when permitted and active
4. **Transition States**: Use `meta.refresh: false` on sections that don't need loading indicators

---

## Common Gotchas

### 1. Blueprint Not Found Fallback

**Issue**: If route references non-existent blueprint ID, falls back to "Admin" blueprint silently.

```javascript
const blueprint = Reactium.Blueprint.get(blueprintId) || Reactium.Blueprint.get('Admin');
```

**Solution**: Always verify blueprint IDs match registered blueprints.

**Source**: `Blueprint/sdk.js:192-193`

---

### 2. Tools Section Auto-Added

**Issue**: Blueprints without `sections.tools` get it auto-added with `admin-tools` zone.

```javascript
const sanitizeBP = (bp) => {
    if (!op.has(bp, 'sections.tools')) {
        op.set(bp, 'sections.tools', { zones: ['admin-tools'] });
    }
    // ...
};
```

**Solution**: Explicitly define `sections.tools` if you want custom zones, or accept default.

**Source**: `Blueprint/sdk.js:77-94`

---

### 3. Route Component Always Blueprint

**Issue**: Cannot override component on individual routes - Blueprint component always used.

```javascript
op.set(route, 'component', Blueprint);  // Hardcoded
await Reactium.Routing.register(route);
```

**Solution**: Customize via zones and components in zones, not route component.

**Source**: `Blueprint/sdk.js:213`

---

### 4. Capability Filtering Happens at Route Registration

**Issue**: Routes without capabilities are public by default. `permitted` field added by server, but client filters before registration.

**Solution**: Always add `capabilities` array to routes requiring authentication. Unauthenticated routes won't register.

**Source**: `Blueprint/sdk.js:144-179`

---

### 5. Transition States Auto-Progress

**Issue**: Blueprint component automatically calls `nextState()` when not in LOADING state, which can cause unexpected transitions if hook doesn't complete.

```javascript
useEffect(() => {
    if (transitionState !== 'LOADING' && transitionStates.length > 0) {
        Reactium.Routing.nextState();  // Auto-called
    }
}, [transitionState]);
```

**Solution**: Ensure `blueprint-route-loader` hook completes quickly or blocks nextState manually.

**Source**: `Blueprint/index.js:63-67`

---

### 6. Section Meta Attributes as Data Attributes

**Issue**: Section `meta` object converted to `data-*` attributes, but `meta.className` removed before conversion.

```javascript
const className = op.get(value, 'meta.className');
op.del(value, 'meta.className');  // Removed before data attribute conversion
const wrapAttr = metaToDataAttributes(op.get(value, 'meta', {}));
```

**Solution**: Use `meta.className` for CSS class, other `meta` fields become `data-*` attributes.

**Source**: `Blueprint/index.js:129-136`

---

### 7. Blueprint Load Hook for Context Injection

**Issue**: `blueprint-load` hook allows injecting context into blueprintConfig, but context not documented.

```javascript
Reactium.Hook.register('blueprint-load', async (params, context) => {
    Object.entries(params).forEach(([key, value]) => op.set(context, key, value));
    op.set(blueprintConfig, 'context', context);
    if (op.has(blueprintConfig, 'update')) blueprintConfig.update();
}, Reactium.Enums.priority.lowest);
```

**Source**: `Blueprint/index.js:30-44`

**Use Case**: Unknown - appears to be unused pattern for dynamic blueprint configuration.

---

## Comparison with Other Patterns

### Blueprint vs Zone System

| Feature                 | Blueprint                  | Zone                        |
| ----------------------- | -------------------------- | --------------------------- |
| **Purpose**             | Page layout structure      | Component composition       |
| **Scope**               | Route-level                | Zone-level                  |
| **Registration**        | blueprints hook            | Zone.addComponent           |
| **Component Selection** | Single Blueprint component | Multiple components per zone|
| **Configurability**     | Sections + zones           | Filters, sorters, mappers   |

**Integration**: Blueprints **contain** zones. Each blueprint section defines which zones render.

---

## TypeScript Support

Blueprint system is JavaScript-only (no TypeScript definitions). For type safety:

```typescript
// Custom type definitions
interface BlueprintConfig {
    ID: string;
    description: string;
    className?: string;
    sections: {
        [sectionName: string]: {
            zones: string[];
            meta?: Record<string, any>;
            wrapper?: React.ComponentType<any>;
        };
    };
    meta: {
        builtIn?: boolean;
        admin?: boolean;
        namespace?: string;
        transitions?: boolean;
        transitionStates?: TransitionState[];
    };
}

interface TransitionState {
    state: 'EXITING' | 'LOADING' | 'ENTERING' | 'READY';
    active: 'previous' | 'current';
}
```

---

## Related Systems

- **[Routing System](./ROUTING_SYSTEM.md)** - Route registration and transitions
- **[Zone System](./ZONE_SYSTEM.md)** - Component composition within blueprint sections
- **[Actinium Route System](./ACTINIUM_ROUTE_SYSTEM.md)** - Database-backed route management
- **[hookableComponent System](./HOOKABLE_COMPONENT.md)** - Component replacement patterns

---

## Summary

The Blueprint system provides **reusable page layout templates** for Reactium Admin applications. Key points:

1. **Registry-Based**: Blueprints registered via `Reactium.Blueprint.register()` on `blueprints` hook
2. **Section/Zone Architecture**: Blueprints define sections (sidebar/main/tools) containing zones
3. **Route Integration**: All admin routes use Blueprint component, referencing blueprint ID for layout
4. **Capability Filtering**: Routes filtered by user capabilities before registration
5. **Transition Management**: Automatic transition state progression with hook-driven loading
6. **Built-In Defaults**: Admin/Simple/Profile blueprints for common layouts
7. **Tools Section Auto-Added**: All blueprints get admin-tools zone if missing

**Critical for**: Reactium Admin page structure, route-to-layout mapping, capability-based UI visibility, custom admin page layouts.
