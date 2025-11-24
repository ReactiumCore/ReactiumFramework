<!-- v1.0.0 -->

# Component Binding and DOM Integration

## Overview

Reactium's Component Binding system enables **multiple independent React applications** to mount on a single page using the `data-reactium-bind` attribute. This system supports the main app binding, plugin UI injection, development tools, and SSR hydration.

**Source:**
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/index.jsx:102-183`
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/reactium-hooks-App.js:105-132`
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/server/renderer/index.mjs:156-174`

**Key Characteristics:**
- **Multi-root architecture** - Each `data-reactium-bind` creates separate React 18 root
- **Hook-driven discovery** - `component-bindings` hook scans DOM
- **Dynamic component resolution** - Uses `hookableComponent()` for component lookup
- **SSR compatible** - Server renders bind point markup, client hydrates
- **Plugin extensible** - Plugins can add custom bind points

## Lifecycle Integration

**Hook Timeline:**

```
plugin-dependencies
  → plugin-init (plugins register hooks)
    → routes-init (routing configured)
      → plugin-ready
        → component-bindings ← DISCOVERY HAPPENS HERE
          → app-bindpoint (define main app element)
            → app-context-provider (wrap with contexts)
              → app-router (load router component)
                → app-boot-message
                  → ReactDOM render (actual DOM binding)
                    → app-ready
```

**Source:** `reactium-core/app/index.jsx:109-183`

## The `data-reactium-bind` Attribute

### Attribute Pattern

```html
<div data-reactium-bind="ComponentName"></div>
```

**How it works:**
1. DOM element has `data-reactium-bind="Type"` attribute
2. `component-bindings` hook discovers all bind elements
3. `hookableComponent(Type)` resolves component from Component Registry
4. React 18 `createRoot()` creates separate root for each element
5. Component renders inside bind point with full AppContext wrapping

### Default Bind Point: "App"

**Server-Side Generation:**

**Source:** `reactium-core/server/renderer/index.mjs:156-164`

```javascript
ReactiumBoot.Hook.registerSync('Server.AppBindings', (req, AppBindings) => {
    AppBindings.register('router', {
        template: () => {
            const binding = '<div data-reactium-bind="App"></div>';
            return binding;
        },
    });
});
```

**Client-Side Discovery:**

**Source:** `reactium-core/app/reactium-hooks-App.js:105-132`

```javascript
Hook.register('component-bindings', async context => {
    const { hookableComponent } = await import('@atomic-reactor/reactium-core/sdk');

    const bindPoints = [];
    const elements = Array.from(
        document.querySelectorAll('[data-reactium-bind]')
    );

    if (elements.length > 0) {
        for (const Element of elements) {
            const type = Element.getAttribute('data-reactium-bind');
            const Component = hookableComponent(type);
            bindPoints.push({ type, Element, Component });
        }
    }

    context.bindPoints = bindPoints;
    return Promise.resolve();
}, Enums.priority.core, 'REACTIUM_COMPONENT_BINDINGS');
```

**Client-Side Rendering:**

**Source:** `reactium-core/app/index.jsx:132-182`

```javascript
const { bindPoints } = await Hook.run('component-bindings');

if (bindPoints.length > 0) {
    const { createRoot } = await import('react-dom/client');

    for (const { type, Component, Element } of bindPoints) {
        if (!roots[type]) roots[type] = createRoot(Element);

        if (type === 'App') {
            await Hook.run('app-router');

            const AppParent = hookableComponent('AppParent');
            const AppContent = hookableComponent('AppContent');

            roots[type].render(
                <AppContexts>
                    <AppParent>
                        <AppContent />
                    </AppParent>
                </AppContexts>,
            );
        } else {
            // Other bind points
            roots[type].render(
                <AppContexts>
                    <Component />
                </AppContexts>,
            );
        }
    }

    _.defer(() => Hook.run('app-ready'));
}
```

### Special Handling for "App" Bind Point

**The "App" bind point has unique behavior:**

1. **Additional hooks fired:**
   - `app-router` - Define Router component
   - `app-boot-message` - Console boot message

2. **Nested structure:**
   ```jsx
   <AppContexts>
       <AppParent>
           <AppContent />
       </AppParent>
   </AppContexts>
   ```

3. **AppContent contains Router:**
   - `AppContent` component wraps the actual Router
   - This allows AppParent to wrap entire app with layouts/themes

**All other bind points:**
```jsx
<AppContexts>
    <Component />
</AppContexts>
```

## React 18 Multi-Root Pattern

**Source:** `reactium-core/app/index.jsx:102-182`

### Root Management

**Persistent roots object:**

```javascript
export const App = async (roots = {}) => {
    // ... framework load

    const { bindPoints } = await Hook.run('component-bindings');

    if (bindPoints.length > 0) {
        const { createRoot } = await import('react-dom/client');

        for (const { type, Component, Element } of bindPoints) {
            // Reuse existing root or create new
            if (!roots[type]) roots[type] = createRoot(Element);

            roots[type].render(<AppContexts><Component /></AppContexts>);
        }
    }
};
```

**Why persistent roots?**
- **HMR compatibility** - Roots persist across hot module replacements
- **Re-render support** - Can call `App()` again without recreating roots
- **Memory management** - Prevents root duplication

### Multiple Independent React Apps

**Example page with multiple bind points:**

```html
<html>
<body>
    <!-- Main application -->
    <div data-reactium-bind="App"></div>

    <!-- Development tools -->
    <div data-reactium-bind="DevTools"></div>

    <!-- Admin toolbar -->
    <div data-reactium-bind="AdminToolbar"></div>
</body>
</html>
```

**Each bind point:**
- ✅ Has own React 18 root
- ✅ Shares AppContext providers
- ✅ Can use different components
- ✅ Isolated React tree (separate reconciliation)

## Adding Custom Bind Points

### Server-Side: Register Bind Point Markup

**Pattern:**

```javascript
// In Actinium plugin or server bootstrap
ReactiumBoot.Hook.registerSync(
    'Server.AppBindings',
    (req, AppBindings) => {
        AppBindings.register('my-widget', {
            template: () => '<div data-reactium-bind="MyWidget"></div>',
            order: Reactium.Enums.priority.neutral
        });
    },
    Reactium.Enums.priority.neutral,
    'MY_WIDGET_BINDING'
);
```

**Where it appears:**

Server template includes all registered bindings via:

```javascript
const bindingsMarkup = renderAppBindings(req);
// Injects into HTML template
```

**Source:** `reactium-core/server/renderer/index.mjs:230-249`

### Client-Side: Register Component

**Pattern:**

```javascript
// In reactium-hooks-*.js
import { Hook, Component, Enums } from '@atomic-reactor/reactium-core/sdk';

Hook.register('plugin-init', async () => {
    const { MyWidget } = await import('./MyWidget');

    // Register component in Component Registry
    Component.register('MyWidget', MyWidget);
}, Enums.priority.neutral, 'MY_WIDGET_COMPONENT');
```

**Discovery happens automatically:**
- `component-bindings` hook finds `<div data-reactium-bind="MyWidget">`
- `hookableComponent('MyWidget')` retrieves component from registry
- React root created and component rendered

## Real-World Use Cases

### 1. Development Tools

**Redux DevTools bind point:**

```javascript
// Server
ReactiumBoot.Hook.registerSync('Server.AppBindings', (req, AppBindings) => {
    if (process.env.NODE_ENV === 'development') {
        AppBindings.register('devtools', {
            template: () => '<div data-reactium-bind="DevTools"></div>'
        });
    }
});

// Client
Hook.register('plugin-init', async () => {
    if (process.env.NODE_ENV === 'development') {
        const { DevTools } = await import('./DevTools');
        Component.register('DevTools', DevTools);
    }
}, Enums.priority.neutral);
```

**Result:** DevTools UI injected outside main app, not subject to app routing.

### 2. Admin Toolbars

**Capability-gated admin UI:**

```javascript
// Server
ReactiumBoot.Hook.register('Server.AppBindings', async (req, AppBindings) => {
    const user = await getUserFromSession(req);

    if (Actinium.Capability.check(user, 'admin-toolbar.view')) {
        AppBindings.register('admin-toolbar', {
            template: () => '<div data-reactium-bind="AdminToolbar"></div>'
        });
    }
});

// Client
Hook.register('plugin-init', async () => {
    const user = await Reactium.User.current();

    if (user?.capabilities?.includes('admin-toolbar.view')) {
        const { AdminToolbar } = await import('./AdminToolbar');
        Component.register('AdminToolbar', AdminToolbar);
    }
}, Enums.priority.neutral);
```

### 3. Multi-App Portals

**Independent widget on page:**

```javascript
// Marketing page with embedded calculator
<div id="content">
    <h1>Loan Calculator</h1>
    <div data-reactium-bind="LoanCalculator"></div>
</div>

// Client
Component.register('LoanCalculator', () => {
    const [loan, setLoan] = useState(10000);
    const [rate, setRate] = useState(5);

    return (
        <div>
            <input value={loan} onChange={e => setLoan(e.target.value)} />
            <input value={rate} onChange={e => setRate(e.target.value)} />
            <div>Monthly: ${calculatePayment(loan, rate)}</div>
        </div>
    );
});
```

**Benefits:**
- Calculator isolated from main app routing
- Own React tree (doesn't re-render with route changes)
- Can use Reactium SDK features (Hooks, State, etc.)

### 4. Plugin UI Injection

**Plugin adds UI to page footer:**

```javascript
// Plugin: reactium-hooks-FooterWidget.js
Hook.register('plugin-init', async () => {
    const { FooterWidget } = await import('./FooterWidget');
    Component.register('FooterWidget', FooterWidget);
}, Enums.priority.neutral);

// Server template customization
ReactiumBoot.Hook.registerSync('Server.AppBindings', (req, AppBindings) => {
    AppBindings.register('footer-widget', {
        template: () => '<div data-reactium-bind="FooterWidget"></div>'
    });
});
```

## SSR Hydration Pattern

### Server-Side

**Template generation:**

```javascript
// Server renders HTML with bind points
const html = `
<!DOCTYPE html>
<html>
<body>
    <div data-reactium-bind="App"></div>
    <script src="/assets/js/main.js"></script>
</body>
</html>
`;
```

**AppBindings Registry:**

```javascript
ReactiumBoot.Hook.registerSync('Server.AppBindings', (req, AppBindings) => {
    AppBindings.register('router', {
        template: () => '<div data-reactium-bind="App"></div>',
    });
});
```

### Client-Side

**Discovery and hydration:**

```javascript
// component-bindings hook finds existing DOM element
const elements = Array.from(
    document.querySelectorAll('[data-reactium-bind]')
);

// Creates React root on existing element
const root = createRoot(Element);

// Renders (React 18 auto-detects server HTML and hydrates)
root.render(<AppContexts><AppParent><AppContent /></AppParent></AppContexts>);
```

**React 18 Hydration:**
- If DOM contains server-rendered HTML, React hydrates instead of re-rendering
- Event listeners attached to existing markup
- No full re-render (performance optimization)

## Integration with app-bindpoint Hook

**The `app-bindpoint` hook defines the main app element:**

**Source:** `reactium-core/app/reactium-hooks-App.js:145-152`

```javascript
Hook.register(
    'app-bindpoint',
    context => {
        context.appElement = document.getElementById('router');
        return Promise.resolve();
    },
    Enums.priority.core,
    'REACTIUM_APP_BINDPOINT',
);
```

**Purpose:**
- Define the main app mount point
- Can be customized by plugins to change main app element
- Default: `#router` element

**Relationship to `data-reactium-bind`:**
- `app-bindpoint` hook defines the container element
- `component-bindings` discovers bind points INSIDE or ALONGSIDE that element
- Both hooks work together to enable flexible DOM binding

## AppContexts Wrapper

**All bind points wrapped with AppContexts:**

**Source:** `reactium-core/app/index.jsx:156-162`

```javascript
roots[type].render(
    <AppContexts>
        <Component />
    </AppContexts>,
);
```

**What is AppContexts?**

AppContexts is the composite provider that wraps all registered React Context providers:

```javascript
import { AppContexts } from '@atomic-reactor/reactium-core/sdk';

// AppContexts renders ALL providers registered via:
Reactium.AppContext.register('MyProvider', { provider: MyProvider });
```

**Why every bind point gets AppContexts:**
- ✅ Access to global contexts (theme, i18n, Redux, etc.)
- ✅ Consistent environment across all bind points
- ✅ Plugin-added contexts available everywhere

**See:** [CLAUDE/APPCONTEXT_PROVIDER_SYSTEM.md](/home/john/reactium-framework/CLAUDE/APPCONTEXT_PROVIDER_SYSTEM.md) for details

## Performance Considerations

### 1. Multiple React Roots

**Impact:**
- Each bind point creates separate React reconciliation tree
- Changes in one bind point don't trigger re-renders in others
- Trade-off: Isolation vs. shared state complexity

**Example - Isolated re-renders:**

```javascript
// Main app re-renders on route change
<div data-reactium-bind="App"></div> // ← Re-renders

// DevTools don't re-render (separate root)
<div data-reactium-bind="DevTools"></div> // ← Stays static
```

**Best Practice:**
- Use bind points for truly independent UI (tools, widgets)
- Don't overuse - multiple roots have overhead
- Main app should use one bind point

### 2. Component Discovery Cost

**Hook execution:**

```javascript
// Scans DOM for all bind points
const elements = Array.from(
    document.querySelectorAll('[data-reactium-bind]')
);
```

**Cost:**
- O(n) DOM query on page load
- Runs once during `component-bindings` hook
- Negligible for typical page (< 10 bind points)

**Optimization:**
- Limit number of bind points to what's needed
- Use zones for dynamic UI injection within app
- Reserve bind points for truly independent widgets

### 3. AppContexts Duplication

**Every bind point wrapped:**

```javascript
// Each creates full provider tree
<AppContexts><Component /></AppContexts>
```

**Impact:**
- Minimal - Providers are lightweight wrappers
- Context values shared (singleton pattern)
- Negligible memory/performance cost

## Common Gotchas

### 1. Component Not Registered Before Binding

**Problem:** Bind point discovered but component not in registry yet.

```javascript
// ❌ WRONG - Component not registered
<div data-reactium-bind="MyWidget"></div>

// component-bindings runs → hookableComponent('MyWidget') → undefined!
```

**Solution:** Register component during `plugin-init` (before `component-bindings`):

```javascript
// ✅ CORRECT
Hook.register('plugin-init', async () => {
    const { MyWidget } = await import('./MyWidget');
    Component.register('MyWidget', MyWidget);
}, Enums.priority.neutral);
```

**Timing:**
```
plugin-init (register component here)
  → routes-init
    → plugin-ready
      → component-bindings (discovers bind point here)
```

### 2. Bind Point Markup Not in Server Template

**Problem:** Client looks for bind point that doesn't exist in HTML.

```javascript
// Client expects this element
<div data-reactium-bind="AdminToolbar"></div>

// But server template doesn't include it → element not found
```

**Solution:** Register bind point on server:

```javascript
ReactiumBoot.Hook.registerSync('Server.AppBindings', (req, AppBindings) => {
    AppBindings.register('admin-toolbar', {
        template: () => '<div data-reactium-bind="AdminToolbar"></div>'
    });
});
```

### 3. Incorrect Attribute Name

**Problem:** Typo in attribute name.

```html
<!-- ❌ WRONG -->
<div data-react-bind="App"></div>

<!-- ✅ CORRECT -->
<div data-reactium-bind="App"></div>
```

**Detection:** No error thrown, bind point silently ignored.

### 4. Missing AppContexts Access

**Problem:** Component outside bind point can't access contexts.

```javascript
// ❌ WRONG - Component not in bind point
<div id="my-widget"></div>

const root = createRoot(document.getElementById('my-widget'));
root.render(<MyWidget />); // No access to AppContexts!
```

**Solution:** Use bind point system:

```javascript
// ✅ CORRECT
<div data-reactium-bind="MyWidget"></div>

// Automatically wrapped with AppContexts
```

### 5. Dynamic Bind Points Not Discovered

**Problem:** Adding bind points to DOM after `component-bindings` hook.

```javascript
// Page loads → component-bindings runs → finds no bind points

// Later, JavaScript adds:
document.body.innerHTML += '<div data-reactium-bind="Late"></div>';

// ❌ PROBLEM: Never bound!
```

**Solution:** Bind points must exist BEFORE `component-bindings` hook fires. Either:

1. **Include in server HTML template**
2. **Use zones for dynamic UI** (not bind points)

### 6. Root Persistence Confusion

**Problem:** Not understanding root reuse across renders.

```javascript
const App = async (roots = {}) => {
    // ...
    if (!roots[type]) roots[type] = createRoot(Element);
    roots[type].render(<Component />);
};

// First call: Creates root
await App(myRoots);

// Second call (HMR): Reuses root
await App(myRoots); // Same roots object!
```

**Impact:** HMR compatibility - roots survive hot reload.

## Best Practices

### 1. Use Zones for In-App UI Injection

```javascript
// ❌ BAD - Unnecessary bind point
<div data-reactium-bind="Sidebar"></div>

// ✅ GOOD - Use Zone system
<Zone zone="sidebar" />
Zone.addComponent({ zone: 'sidebar', component: SidebarWidget });
```

**Why zones are better for in-app UI:**
- Dynamic (can add/remove components at runtime)
- Priority-based ordering
- Filtering and mapping support
- Part of main app's React tree (no extra root)

### 2. Reserve Bind Points for Independent Apps

**Good use cases:**
- ✅ Development tools (Redux DevTools)
- ✅ Admin toolbars outside app routing
- ✅ Embedded widgets on marketing pages
- ✅ Plugin UI that shouldn't participate in routing

**Bad use cases:**
- ❌ UI that should be part of app routing
- ❌ Components that need route context
- ❌ Dynamic in-app features (use zones)

### 3. Consistent Naming Convention

```javascript
// ✅ GOOD - Clear, descriptive names
<div data-reactium-bind="AdminToolbar"></div>
<div data-reactium-bind="DevTools"></div>

// ❌ BAD - Vague names
<div data-reactium-bind="Widget"></div>
<div data-reactium-bind="Thing"></div>
```

### 4. Document Custom Bind Points

```javascript
/**
 * Admin Toolbar Bind Point
 *
 * Bind Point ID: 'AdminToolbar'
 * Component: src/app/components/AdminToolbar/index.js
 * Capability Required: admin-toolbar.view
 * SSR: Conditional (only if user has capability)
 */
ReactiumBoot.Hook.registerSync('Server.AppBindings', (req, AppBindings) => {
    // ...
});
```

### 5. Capability-Gate Sensitive UI

```javascript
// Server-side capability check before rendering bind point
ReactiumBoot.Hook.register('Server.AppBindings', async (req, AppBindings) => {
    const user = await getUserFromSession(req);

    if (Actinium.Capability.check(user, 'sensitive-ui.view')) {
        AppBindings.register('sensitive-ui', {
            template: () => '<div data-reactium-bind="SensitiveUI"></div>'
        });
    }
});
```

## Debugging Bind Points

### Inspect Discovered Bind Points

```javascript
// In component-bindings hook
Hook.register('component-bindings', async context => {
    // Core hook runs first, discovers bind points

    // Your debug hook (later priority)
}, Enums.priority.neutral);

Hook.register('component-bindings', async context => {
    console.log('Bind points discovered:', context.bindPoints);
    // [
    //   { type: 'App', Element: <div>, Component: <Function> },
    //   { type: 'DevTools', Element: <div>, Component: <Function> }
    // ]
}, Enums.priority.lowest); // Run AFTER core discovery
```

### Check Component Registry

```javascript
import { Component } from '@atomic-reactor/reactium-core/sdk';

// List all registered components
console.log('Registered components:', Component.list);

// Check specific component
const MyWidget = Component.get('MyWidget');
console.log('MyWidget registered:', !!MyWidget);
```

### Verify DOM Elements

```javascript
// Browser console
const bindPoints = document.querySelectorAll('[data-reactium-bind]');
console.log('Bind points in DOM:', Array.from(bindPoints).map(el => ({
    type: el.getAttribute('data-reactium-bind'),
    element: el
})));
```

### Monitor Root Creation

```javascript
// Modify App function to log roots
export const App = async (roots = {}) => {
    // ... framework load

    for (const { type, Component, Element } of bindPoints) {
        if (!roots[type]) {
            console.log(`Creating React root for: ${type}`);
            roots[type] = createRoot(Element);
        } else {
            console.log(`Reusing React root for: ${type}`);
        }
    }
};
```

## Comparison with Other Patterns

### Bind Points vs Zones

| Feature | Bind Points | Zones |
|---------|-------------|-------|
| **Purpose** | Independent React apps | In-app UI injection |
| **React Roots** | Separate root per bind point | Part of main app tree |
| **Discovery** | `component-bindings` hook | Component Registry |
| **Dynamic** | Static (must exist at page load) | Dynamic (add/remove runtime) |
| **Routing** | Not subject to routing | Participates in routing |
| **Performance** | Multiple reconciliation trees | Single tree |
| **Use Case** | Tools, widgets, admin UI | Pluggable app features |

**Example equivalence:**

```javascript
// Bind Point - Separate React tree
<div data-reactium-bind="Sidebar"></div>
Component.register('Sidebar', SidebarWidget);

// Zone - Part of main app tree
<Zone zone="sidebar" />
Zone.addComponent({ zone: 'sidebar', component: SidebarWidget });
```

### Bind Points vs Portals

| Feature | Bind Points | React Portals |
|---------|-------------|---------------|
| **Creation** | Automatic (hook-driven) | Manual (`createPortal`) |
| **React Root** | Separate root | Same root |
| **Context Access** | Via AppContexts wrapper | Inherits from tree |
| **Event Bubbling** | No cross-root bubbling | Bubbles through React tree |
| **Use Case** | Independent apps | Modal, tooltip outside parent |

**When to use each:**
- **Bind Points:** Truly independent React applications
- **Portals:** UI that needs to escape parent DOM hierarchy but stay in same React tree

## Summary

**Component Binding System = Multi-Root React 18 Architecture**

**Core Pattern:**
1. Server renders `<div data-reactium-bind="Type"></div>`
2. `component-bindings` hook discovers bind points
3. `hookableComponent(Type)` resolves component
4. React 18 `createRoot()` creates separate root
5. Component renders wrapped in `<AppContexts>`

**Key Hooks:**
- `component-bindings` - Discover DOM bind points
- `app-bindpoint` - Define main app element
- `app-context-provider` - Register context providers
- `app-router` - Define router component
- `app-ready` - Final hook after binding

**Use Cases:**
- ✅ Development tools (Redux DevTools)
- ✅ Admin toolbars and dashboards
- ✅ Embedded widgets on marketing pages
- ✅ Plugin UI outside main app
- ❌ NOT for in-app dynamic UI (use Zones)

**Best Practices:**
- Reserve for truly independent apps
- Use zones for in-app UI injection
- Register components during `plugin-init`
- Document custom bind points
- Capability-gate sensitive UI on server
