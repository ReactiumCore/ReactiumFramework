<!-- v1.0.0 -->

# hookableComponent System

## Overview

The `hookableComponent` system is Reactium's pattern for creating **replaceable** and **extensible** React components via the Component Registry. It enables plugins to override core components or replace application components without touching source files - a critical pattern for theming, A/B testing, feature flags, and plugin-based customization.

**Key Concept**: Components registered with `Component.register()` can be retrieved and dynamically rendered using `hookableComponent()` or `useHookComponent()`, allowing runtime component replacement.

## Core Architecture

### Component Registry

The Component Registry is a reactive state container (extends `ReactiumSyncState`) that stores component references by string ID:

**Source**: `reactium-sdk-core/src/browser/RegisteredComponents.ts:18-71`

```typescript
// Simplified conceptual structure
class RegisteredComponents extends ReactiumSyncState<ComponentRegistry> {
    register(id: string, component: ComponentType) {
        this.set(id, component);
    }

    unregister(id: string) {
        this.del(id);
    }

    get list() {
        return Object.values(this.state);
    }
}

export const Component = new RegisteredComponents();
```

**Key Properties**:
- **Singleton**: Exported as `Component` - shared across entire application
- **Reactive**: Changes trigger subscriptions (via ReactiumSyncState)
- **Type-safe**: TypeScript generics support typed component retrieval
- **No merge**: Constructor uses `{ noMerge: true }` - full replacement on set

### useHookComponent Hook

React hook that retrieves a component from the registry:

**Source**: `reactium-sdk-core/src/browser/useHookComponent.ts:14-20`

```typescript
export const useHookComponent = <N extends string = string, C = ComponentType>(
    hook: N,
    defaultComponent?: ComponentType,
): C => {
    if (!defaultComponent) defaultComponent = forwardRefNoop;
    return Component.get<C>(hook, defaultComponent)
};
```

**Parameters**:
- `hook` - String ID of registered component
- `defaultComponent` - Fallback if component not found (defaults to empty forwardRef)

**Returns**: Component from registry or default

**Important**: This is NOT a reactive hook - it only retrieves the current component. If the registry changes after render, component won't update. For most use cases this is fine because component registration happens during app initialization.

### hookableComponent Factory

Higher-order function that creates a wrapper component using `useHookComponent`:

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/named-exports/hookable-component.js:3-6`

```javascript
export const hookableComponent = name => props => {
    const Component = useHookComponent(name);
    return <Component {...props} />;
};
```

**Conceptual Pattern**:
```javascript
// hookableComponent('MyComponent') returns a component that:
// 1. Looks up 'MyComponent' in Component Registry
// 2. Returns the registered component (or default)
// 3. Renders it with all props passed through

const DynamicComponent = hookableComponent('MyComponent');
<DynamicComponent foo="bar" /> // renders Component.get('MyComponent') with props
```

## Registration Pattern

### Standard Registration (Core Components)

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/reactium-hooks-App.js:86-90`

```javascript
Hook.register(
    'init',
    async () => {
        const { AppParent } = await import('./AppParent');
        const { NotFound } = await import('./NotFound');
        const { RoutedContent, AppContent } = await import('./RoutedContent');
        const { Router } = await import('./Router');

        console.log('Initializing Core Components');
        Component.register('AppParent', AppParent);
        Component.register('NotFound', NotFound);
        Component.register('RoutedContent', RoutedContent);
        Component.register('AppContent', AppContent);
        Component.register('Router', Router);
    },
    Enums.priority.core,
    'REACTIUM_INIT_CORE_COMPONENTS',
);
```

**Pattern**:
1. Register on `init` hook (or `plugin-init` for plugins)
2. Use dynamic imports for code splitting
3. Register with descriptive string ID
4. Use priority to control load order (core = -2000, earliest)

### Plugin Registration

**Source**: `Reactium-Core-Plugins/src/app/components/Test/StateLoader/reactium-hooks-stateloader.js:47-55`

```javascript
Hook.register(
    'plugin-init',
    async () => {
        const { StateLoader } = await import('./StateLoader');
        Component.register('StateLoader', StateLoader);
    },
    Enums.priority.neutral, // Should be .neutral, not .normal
    'plugin-init-StateLoader',
);
```

**Best Practice**:
- Use `plugin-init` hook for plugin components
- Use `Enums.priority.neutral` (NOT `.normal` - that's undefined!)
- Provide unique hook ID (e.g., 'plugin-init-ComponentName')

## Usage Patterns

### 1. Direct Usage in JSX

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/index.jsx:150-151`

```javascript
const AppParent = hookableComponent('AppParent');
const AppContent = hookableComponent('AppContent');

// Later in render:
roots[type].render(
    <AppContexts>
        <AppParent>
            <AppContent />
        </AppParent>
    </AppContexts>,
);
```

**Pattern**: Create hookable component reference, then use it like any React component.

### 2. Dynamic Component Binding

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/dependencies/getComponents.js:3-8`

```javascript
export default (elms = []) =>
    elms.reduce((cmps, { type, path }) => {
        cmps[type] = hookableComponent(type);
        return cmps;
    }, {});
```

**Pattern**: Map element binding types to hookable components for dynamic DOM binding.

### 3. Route Component Resolution

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/reactium-hooks-App.js:63-74`

```javascript
Hook.register(
    'register-route',
    async route => {
        // Allow routes to specify components as strings
        if (typeof route.component === 'string') {
            route.component = hookableComponent(route.component);
        }
        return route;
    },
    Enums.priority.core,
    'REACTIUM_REGISTER_ROUTE_STRINGABLE',
);
```

**Pattern**: Routes can specify `component: 'MyComponent'` as a string, which gets resolved to the registered component at registration time.

**Example Route**:
```javascript
export default {
    id: 'my-route',
    path: '/my-path',
    component: 'MyComponent', // String reference to Component Registry
    exact: true,
};
```

### 4. Provider Wrapping Pattern

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/Router.jsx:9-12`

```javascript
export const RouterProvider = ({ children, ...props }) => {
    const Router = useHookComponent('Router');
    return <Router {...props}>{children}</Router>;
};
```

**Pattern**: Context providers that wrap dynamically resolved components - enables replacing both provider AND wrapped component.

## Component Replacement Strategy

### Replacing Core Components

To replace a core component like `NotFound`:

```javascript
// In your plugin's reactium-hooks.js
Hook.register(
    'init', // MUST be on same or higher priority hook
    async () => {
        const { CustomNotFound } = await import('./CustomNotFound');

        // Re-register with same ID
        Component.register('NotFound', CustomNotFound);
    },
    Enums.priority.neutral, // AFTER core registration (priority.core = -2000)
    'custom-not-found',
);
```

**Critical Rules**:
1. Register AFTER the original (use lower priority number or later hook)
2. Use exact same component ID
3. Component.register() **replaces** existing registration (no merge)
4. Later registrations win (last registration is what's used)

### Original Component Implementation

**NotFound** (replaceable):

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/NotFound.jsx:3-13`

```javascript
export const NotFound = () => {
    return (
        <main className='not-found'>
            <header>
                <div className='reactium-logo'></div>
                <h1>Page Not Found</h1>
            </header>
            <p>This is not the page you were looking for...</p>
        </main>
    );
};
```

**AppParent** (replaceable wrapper):

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/AppParent.jsx:1`

```javascript
export const AppParent = ({children}) => children;
```

**Pattern**: Minimal default implementation - designed to be replaced with layout wrappers, theme providers, error boundaries, etc.

## Integration with Routing

The routing system uses hookableComponent for dynamic route component resolution:

**RoutedContent Component** (uses registered components):

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/RoutedContent.jsx:24-40`

```javascript
export const RoutedContent = () => {
    useRoutes(); // Reactive route subscription
    const routing = useRouting();
    const route = routing.get('active.match.route');
    const Component = routing.get('active.match.route.component');

    // Component is already resolved via hookableComponent
    return Component ? (
        <Component
            staticContext={{ handleId: op.get(route, 'handleId') }}
            {...routing.get()}
        />
    ) : (
        <Route {...route} />
    );
};
```

**Flow**:
1. Route defined with `component: 'MyComponent'` or `component: MyComponent`
2. `register-route` hook converts strings to `hookableComponent('MyComponent')`
3. RoutedContent renders the resolved component
4. If component was replaced in registry, replacement renders

## Lifecycle Integration

**Hook Execution Order** (relevant to component registration):

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/index.jsx:38-148`

```
init                     → Core components registered here (AppParent, NotFound, Router, etc.)
  ↓
dependencies-load        → DDD artifacts loaded
  ↓
zone-defaults           → Zone components initialized
  ↓
plugin-init             → Plugin components registered here
  ↓
plugin-dependencies     → Plugin dependencies resolved
  ↓
routes-init             → Routes loaded (string components converted to hookableComponent)
  ↓
plugin-ready            → All plugins initialized
  ↓
component-bindings      → Dynamic DOM bindings created
  ↓
app-context-provider    → Context providers registered
  ↓
app-router              → Router component finalized
  ↓
[ReactDOM render]       → hookableComponent('AppParent') and hookableComponent('AppContent') rendered
```

**Best Practices**:
- Register core replacements on `init` with `priority.neutral` (runs after core's `priority.core`)
- Register plugin components on `plugin-init`
- Never register after `component-bindings` - components won't be available for initial render

## Real-World Use Cases

### 1. Theming (Replace AppParent)

```javascript
// Wrap entire app with theme provider
const ThemedAppParent = ({ children }) => (
    <ThemeProvider theme={customTheme}>
        <GlobalStyles />
        {children}
    </ThemeProvider>
);

Component.register('AppParent', ThemedAppParent);
```

### 2. Custom 404 Pages (Replace NotFound)

```javascript
const BrandedNotFound = () => (
    <div className="custom-404">
        <Logo />
        <h1>Oops! Page not found</h1>
        <SearchBar />
        <PopularLinks />
    </div>
);

Component.register('NotFound', BrandedNotFound);
```

### 3. A/B Testing (Replace Components Conditionally)

```javascript
Hook.register('plugin-init', async () => {
    const variant = getABTestVariant('homepage-hero');

    if (variant === 'B') {
        const { HeroVariantB } = await import('./HeroVariantB');
        Component.register('Hero', HeroVariantB);
    } else {
        const { HeroVariantA } = await import('./HeroVariantA');
        Component.register('Hero', HeroVariantA);
    }
}, Enums.priority.neutral);
```

### 4. Feature Flags (Conditional Components)

```javascript
Hook.register('plugin-init', async () => {
    if (featureFlags.newCheckout) {
        const { CheckoutV2 } = await import('./CheckoutV2');
        Component.register('Checkout', CheckoutV2);
    } else {
        const { CheckoutV1 } = await import('./CheckoutV1');
        Component.register('Checkout', CheckoutV1);
    }
}, Enums.priority.neutral);
```

### 5. Error Boundaries (Wrap AppParent)

```javascript
const AppParentWithErrorBoundary = ({ children }) => (
    <ErrorBoundary fallback={<ErrorFallback />}>
        {children}
    </ErrorBoundary>
);

Component.register('AppParent', AppParentWithErrorBoundary);
```

## Best Practices

### 1. Naming Conventions

- **PascalCase** for component IDs: `'MyComponent'`, not `'my-component'`
- **Descriptive names**: `'UserProfileCard'` not `'Card'`
- **Avoid collisions**: Use prefixes for plugin components: `'MyPlugin.Dashboard'`

### 2. Registration Timing

- **Core replacements**: `init` hook with `priority.neutral`
- **Plugin components**: `plugin-init` hook
- **Never late-register**: Don't register after initial render - won't update existing instances

### 3. Priority Usage

```javascript
// ✅ CORRECT - Replace core component
Hook.register('init', async () => {
    Component.register('NotFound', CustomNotFound);
}, Enums.priority.neutral); // Runs AFTER core's priority.core (-2000)

// ❌ WRONG - Won't work, runs before core registration
Hook.register('init', async () => {
    Component.register('NotFound', CustomNotFound);
}, Enums.priority.core); // Runs at same time, order undefined
```

### 4. Code Splitting

Always use dynamic imports for component registration:

```javascript
// ✅ CORRECT - Code splitting
Hook.register('plugin-init', async () => {
    const { MyComponent } = await import('./MyComponent');
    Component.register('MyComponent', MyComponent);
});

// ❌ WRONG - Loads component at parse time
import { MyComponent } from './MyComponent';
Hook.register('plugin-init', async () => {
    Component.register('MyComponent', MyComponent);
});
```

### 5. Default Components

Provide defaults when using `useHookComponent` in library code:

```javascript
// ✅ CORRECT - Graceful degradation
const Component = useHookComponent('CustomButton', DefaultButton);

// ⚠️ RISKY - Returns empty forwardRef if not registered
const Component = useHookComponent('CustomButton');
```

## Common Gotchas

### 1. `.normal` vs `.neutral` Priority Bug

**CRITICAL BUG FOUND**:

**Source**: `Reactium-Core-Plugins/src/app/components/Test/StateLoader/reactium-hooks-stateloader.js:53`

```javascript
// ❌ WRONG - .normal does NOT exist, returns undefined
Enums.priority.normal

// ✅ CORRECT - .neutral is the actual enum value
Enums.priority.neutral
```

**Why it matters**: `Enums.priority.normal` returns `undefined`, which evaluates to `0` in numeric sorting, coincidentally same as `.neutral`. This works by accident but is technically wrong and fragile.

**Available priority values**:
```javascript
Enums.priority.core      // -2000
Enums.priority.highest   // -1000
Enums.priority.high      // -500
Enums.priority.neutral   // 0 (default)
Enums.priority.low       // 500
Enums.priority.lowest    // 1000
```

### 2. Non-Reactive Updates

`useHookComponent` and `hookableComponent` do NOT re-render when registry changes:

```javascript
// Component retrieved ONCE at render time
const MyComp = hookableComponent('MyComp');

// Later registration won't update existing renders
Component.register('MyComp', NewVersion); // Existing <MyComp /> still uses old version
```

**Solution**: Register all components during initialization (before first render).

### 3. String Component Resolution Timing

Route components specified as strings are resolved during `register-route` hook:

```javascript
// Route definition
{ component: 'MyComponent' }

// Resolved to:
{ component: hookableComponent('MyComponent') }
```

**Gotcha**: If `MyComponent` isn't registered yet, `hookableComponent` returns `forwardRefNoop` (empty component). Registration must happen on `init` or `plugin-init`, before `routes-init`.

### 4. Missing Component Silent Failure

If a component isn't registered, `useHookComponent` returns `forwardRefNoop` (renders nothing):

```javascript
const MissingComp = useHookComponent('DoesNotExist');
<MissingComp /> // Renders nothing, no error
```

**Solution**: Check console during development, or provide explicit defaults.

### 5. Props Forwarding

`hookableComponent` forwards ALL props - be careful with prop name collisions:

```javascript
const MyComp = hookableComponent('MyComp');
<MyComp foo="bar" internal="data" /> // Both props passed to registered component
```

**Best practice**: Document expected props for registered components.

### 6. Registration Order Matters

Last registration wins (simple replacement, no merge):

```javascript
Component.register('MyComp', VersionA);
Component.register('MyComp', VersionB); // VersionB wins, VersionA discarded
```

**Use priority system** to control registration order across plugins.

## TypeScript Support

Component Registry is fully typed:

```typescript
import { Component, ComponentType } from '@atomic-reactor/reactium-sdk-core';

// Type-safe registration
Component.register<React.FC<{ name: string }>>('Greeting', GreetingComponent);

// Type-safe retrieval
const Greeting = Component.get<React.FC<{ name: string }>>('Greeting');
```

## Comparison to Other Patterns

### vs Direct Imports

```javascript
// Direct import - not replaceable
import { MyComponent } from './MyComponent';
<MyComponent />

// hookableComponent - replaceable
const MyComponent = hookableComponent('MyComponent');
<MyComponent />
```

### vs React Context

```javascript
// Context - requires provider wrapper
<MyComponentContext.Provider value={MyComponent}>
    <App />
</MyComponentContext.Provider>

// hookableComponent - no wrapper needed, global registry
Component.register('MyComponent', MyComponent);
const Comp = hookableComponent('MyComponent');
```

### vs Component Props

```javascript
// Props - explicit drilling
<Parent componentToRender={MyComponent} />

// hookableComponent - implicit registry lookup
<Parent /> // Internally uses hookableComponent('ChildComponent')
```

## Summary

The `hookableComponent` system provides:

- ✅ **Runtime component replacement** without source file edits
- ✅ **Plugin-based extensibility** via Component Registry
- ✅ **Code splitting** through dynamic imports
- ✅ **Type safety** via TypeScript generics
- ✅ **Simple API** - register, retrieve, render
- ✅ **Framework integration** - routes, zones, contexts

**Core Pattern**:
1. Register: `Component.register('MyComponent', MyComponent)`
2. Retrieve: `hookableComponent('MyComponent')` or `useHookComponent('MyComponent')`
3. Render: `<DynamicComponent />` renders currently registered version

This is THE pattern for creating extensible, themeable, and plugin-friendly Reactium applications.
