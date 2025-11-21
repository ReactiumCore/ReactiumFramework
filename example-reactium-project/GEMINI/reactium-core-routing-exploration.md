# Reactium Core Routing Exploration

This document details a deep dive into Reactium's routing mechanism, based on direct analysis of the `@atomic-reactor/reactium-core` SDK source code and interactive testing.

## 1. Routing Bootstrap Process

The routing bootstrap process in Reactium is orchestrated through a combination of manifest generation at build-time and an intricate hook system at runtime, primarily driven by `reactium-hooks-App.js` and `Reactium.Routing` SDK.

### 1.1 Manifest Generation (Build-time Discovery)

As observed from `manifest/manifest-tools.js`:

*   **Discovery Mechanism**: The `regenManifest` function in `manifest-tools.js` is responsible for generating the `src/manifest.js` file.
*   **`find` Function**: This function searches the filesystem for specific patterns defined in `manifestConfig.patterns`. For routes, this pattern identifies files matching `(routes?|reactium-routes?.*?)\.jsx?$` (e.g., `reactium-route-helloworld.js`).
*   **`fileToDomain`**: Discovered route files are mapped to their respective domains (e.g., `HelloWorld` for `reactium-route-helloworld.js`) based on their directory structure using the `fileToDomain` function.
*   **`src/manifest.js` Output**: The discovered route files are compiled into `src/manifest.js` under the `allRoutes` section as dynamic `import()` statements, ready for runtime consumption. This serves as the central registry of all known route artifacts.

### 1.2 Runtime Initialization (`reactium-hooks-App.js`)

The `reactium-hooks-App.js` file, a core `reactium-hooks.js` DDD artifact, plays a central role in activating the routes during application bootstrap.

*   **`routes-init` Hook**:
    *   This hook is registered with `Hook.register('routes-init', ...)`. It's executed early in the application's lifecycle (priority `Enums.priority.core`).
    *   **Manifest Consumption**: Inside this hook, `const allRoutes = await deps().loadAllDefaults('allRoutes');` is called. The `deps()` utility (likely powered by `@atomic-reactor/reactium-core/dependencies`) dynamically loads the route definitions from the generated `src/manifest.js` file.
    *   **Route Combination**: It combines `allRoutes` (from the manifest) with any `globalRoutes` (e.g., `window.routes` for browser-side defined routes or `global.routes` for SSR). This ensures all potential route sources are included.
    *   **`Reactium.Routing.register()`**: For each discovered and combined route object, the `Reactium.Routing.register()` method is invoked. This is the crucial step where route objects are formally added to Reactium's routing system.

*   **`register-route` Hook**:
    *   This hook (`Hook.register('register-route', ...)`) is executed *for each individual route* just before `Reactium.Routing.register()` finalizes its registration.
    *   **Dynamic Component Resolution**: It checks if `route.component` is a string. If it is, `hookableComponent(route.component)` is used to resolve the string name to an actual React component. This enables flexible component mapping, supporting lazy loading and component registration by name.

*   **`init` Hook**:
    *   This hook registers core UI components like `Router` and `RouterProvider` (`Component.register('Router', Router)`, `AppContext.register('RouterProvider', RouterProvider, ...)`) that are responsible for rendering the matched routes.

### 1.3 `Reactium.Routing` Initialization (`sdk/routing/index.js`)

The `RoutingFactory` class within `sdk/routing/index.js` handles the overarching routing logic:

*   **History Object**: It initializes `historyObj` using `createBrowserHistory` or `createMemoryHistory` and attaches a `listen` event to `setCurrentRoute` to detect URL changes.
*   **`load()` Method**: This method orchestrates the loading of all routes. It triggers the `routes-init` hook and ensures the default `NotFound` route is registered. It also sets up the initial `currentRoute` based on the browser's location.

## 2. Reactium Route Object Features (Code-Driven Analysis)

The Reactium route object is highly configurable, building upon `react-router`'s capabilities and extending them with Reactium-specific functionalities. The `Routing.register()` method in `sdk/routing/index.js` processes the following properties:

**Core `react-router` Properties (Processed by `matchPath`):**

*   **`path`**: A `string` or `array` of `string`s specifying the URL path(s) that the route will match (e.g., `'/greeter'`, `['/users', '/users/:id']`). Supports path parameters (e.g., `':id'`).
*   **`exact`**: A `boolean`. If `true`, the route will only match if the URL path is *exactly* the same as the `path`.
*   **`component`**: The React component to render when the route matches. This can be a directly imported component or a `string` name that Reactium can resolve via `hookableComponent` within the `register-route` hook.
*   **`strict`**: A `boolean`. (Handled by `matchPath` from `react-router`).
*   **`sensitive`**: A `boolean`. (Handled by `matchPath` from `react-router`).

**Reactium-Specific Properties and Extensions (Processed by `RoutingFactory`):**

*   **`id`**: A unique `string` identifier for the route. If not provided, `uuid()` is automatically assigned by `Routing.register()`. Used for internal management and unregistration.
*   **`order`**: A `number` (defaults to `0` if not provided). This influences the priority of route matching. Routes are sorted first by `path` (reverse order) and then by `order` (ascending). A higher `order` value generally means a higher matching priority for routes that might otherwise conflict.
*   **`loadState`**: A `function` (expected to be an `async` function or a thunk returning a `Promise`). This function is executed when the route is resolved (`handleFrontEndDataLoading` method).
    *   **Location**: The SDK first looks for a static `loadState` method/property on the *component itself* (`route.component.loadState`), and then on the *route object* (`route.loadState`).
    *   **Arguments**: It receives an object `{ route, params, search }`.
    *   **Return Value**: Its `Promise` resolution value is stored in a `Handle` object.
    *   **Purpose**: Enables server-side rendering (SSR) data fetching and client-side data pre-loading.
*   **`handleId`**: An optional `string`. If provided on the *component* (`route.component.handleId`) or the *route object* (`route.handleId`), this ID is used to register and retrieve the `Handle` where the `loadState` function's data is stored. If not provided, a `uuid()` is generated. The `handleId` is also automatically propagated to the rendered `component` as a prop.
*   **`persistHandle`**: A `boolean` (defaults to `false`). If `true` (on the component or route), the `Handle` associated with this route's `loadState` data will *not* be unregistered when the route changes. Useful for caching or maintaining data across route transitions.
*   **`transitions`**: A `boolean` (defaults to `false`). If `true`, it explicitly enables the transition feature for this route. When enabled, the component rendered by the route will receive a `transitionState` prop.
*   **`transitionStates`**: An `array` of objects. Customizes the sequence of UI transition states for the route. Each object can have `state` (e.g., 'LOADING', 'ENTERING', 'READY') and `active` ('current' or 'previous') properties. (Defaults to `defaultTransitionStates` in `sdk/routing/index.js`). These states are passed as the `transitionState` prop to the component.
*   **Any other property `<Route />` component accepts**: The `Routing.register` method is designed to be flexible, allowing additional properties that `react-router`'s `<Route />` component might consume. These are passed through directly to `matchPath`.

**Example `loadState` Function (Code-Driven):**

The code confirms the `loadState` function is expected to be an `async` function (or return a `Promise`) and is passed `{ route, params, search }`.

```javascript
// Example static loadState function on a React component
MyComponent.loadState = async ({ route, params, search }) => {
    // Perform async data fetching
    const data = await new Promise(resolve => {
        setTimeout(() => {
            console.log('Load function executed for:', route.id);
            resolve({
                title: `Loaded Data for ${route.id}`,
                message: `Params: ${JSON.stringify(params)}, Search: ${JSON.stringify(search)}`,
                isLoading: false, // Explicitly set loading to false when data resolves
            });
        }, 500);
    });
    return data; // This data object will be set on the Handle
};

A concrete, working example of this pattern can be found in the `DataLoader` component (documented in [learning/GEMINI/reactium-building.md](learning/GEMINI/reactium-building.md)). The `DataLoader.jsx` component implements `DataLoader.loadState` as a static asynchronous method to fetch and provide data for its route.

// ... and then register the component with Reactium
// Component.register('MyComponent', MyComponent);
```

## 3. Integration with Application Manifest

As detailed in section 1.1, the application manifest (`src/manifest.js`) acts as the intermediary between DDD `route.js` artifacts and the runtime routing system. `manifest-tools.js` discovers `reactium-route-*.js` files and populates `src/manifest.js`. At runtime, `reactium-hooks-App.js` then loads these entries from the manifest via `deps().loadAllDefaults('allRoutes')` and uses `Reactium.Routing.register()` to activate them.

This creates a dynamic, convention-based, and extensible routing system where new routes are automatically discovered, processed, and registered, allowing for comprehensive control over their behavior and data loading.

---

# Corrected Conclusions on `FeatureTester` Component and Cypress Verification

### Component (`FeatureTester.jsx`)
The `FeatureTester.jsx` component was updated to correctly manage asynchronous data loading from a route's `loadState` function.

**Key Learnings and Corrected Understanding:**

*   **`useSyncHandle` vs. `useHandle`**: This was a critical distinction. `useHandle` retrieves a Handle but *does not* automatically subscribe the component to its state changes, while `useSyncHandle` *does*, causing the component to re-render reactively. The `FeatureTester` component now correctly uses `useSyncHandle(FeatureTester.handleId)` to ensure it updates when its `Handle`'s state changes (e.g., after `loadState` resolves).
*   **`isLoading` Management with `handle.get(key, defaultValue)`**: The pattern `handle.get('isLoading', true)` in the component's rendering logic correctly manages the initial loading state. It defaults to `true` (if the key is not yet present in the Handle) and becomes `false` once `FeatureTester.loadState` resolves with `{ isLoading: false }`.
*   **Static `loadState` and `handleId` on Component**: Defining `FeatureTester.loadState` (as an `async` function accepting `{ route, params, search }` and resolving with the data) and `FeatureTester.handleId` (e.g., `'FeatureTesterStaticHandle'`) directly as static properties on the component is a valid and preferred way for the Routing SDK to discover and utilize them. The SDK propagates `handleId` to the component's props.

### Route (`reactium-route-featuretester.js`)
The `reactium-route-featuretester.js` was modified to only set the `order: Enums.priority.highest` property. The `loadState` and `handleId` properties were correctly omitted from the route object, as they are now handled by the static properties on the `FeatureTester` component itself, which is the correct and preferred approach according to the SDK's code.

### Cypress Test (`cypress/e2e/featuretester.cy.js`)
The Cypress test successfully verified the asynchronous data loading within the `FeatureTester` component.

**Key Learnings and Corrected Understanding of Cypress Synchronicity:**

*   **Explicit `cy.wait(ms)` for `setTimeout`-based Asynchronicity**: My understanding of Cypress's `retry-ability` was insufficient. For asynchronous operations simulated with `setTimeout` (not network requests), an explicit `cy.wait(ms)` is *necessary* to ensure the operation has completed before subsequent assertions can reliably pass. This was crucial for `FeatureTester`'s 1200ms `setTimeout` in `loadState`.
*   **Sequential Assertions for State Transitions**: The test correctly sequences assertions to verify the component's state transitions:
    1.  **Assert Initial Loading State**: `cy.contains('Loading data...').should('be.visible');` This confirms the component initially renders a loading message.
    2.  **Explicit Delay**: `cy.wait(2000);` This ensures the `loadState`'s `setTimeout` has completed.
    3.  **Assert Final Loaded State**: `cy.contains('Loaded Data: ...').should('be.visible');` and `cy.contains('Query params: {}').should('be.visible');` These assertions now reliably pass after the delay.
    4.  **Confirm Loading Message Disappearance**: `cy.contains('Loading data...').should('not.exist');` This confirms the transition from loading to loaded state is complete.

This sequence of test steps is a robust way to verify asynchronous component behavior where an explicit delay is required due to the nature of the asynchronous operation (e.g., `setTimeout` without an interceptable network request).

The `FeatureTester` component, its route, and its Cypress test now collectively demonstrate a correct and verified implementation of route-based asynchronous data loading in Reactium, leveraging `useSyncHandle` and static `loadState` methods.

---

# Corrected Conclusions on Transitions (Exit-Enter Flow)

### Components (`ExitingPage.jsx`, `TransitionPage.jsx`) and Routes
The `ExitingPage.jsx` and `TransitionPage.jsx` components, along with their route definitions, now correctly implement a cross-component page transition.

**Key Learnings and Corrected Understanding:**

*   **Transition Control Scope**: Transition logic managed *within a component* (like `ExitingPage.jsx` or `TransitionPage.jsx`) can only control the portion of the transition *while that component is in context*.
*   **`transitionStates` and `active` Property**:
    *   The `transitionStates` array (defined in the route object) dictates the sequence of transition states.
    *   The `active` property within each state object (`'current'` or `'previous'`) is crucial:
        *   `active: 'previous'`: This state (e.g., `EXITING`) is applied to the component that is currently rendered and *about to leave* the DOM (`ExitingPage` in our case). This component is responsible for calling `Reactium.Routing.nextState()` when its exit logic is complete.
        *   `active: 'current'`: This state (e.g., `LOADING`, `ENTERING`, `READY`) is applied to the *new component* that is entering the DOM (`TransitionPage` in our case). This new component is responsible for calling `Reactium.Routing.nextState()` when its entry logic is complete.
*   **Correct Route Definitions for Cross-Component Transitions**:
    *   **`reactium-route-exitingpage.js`**: Its `transitionStates` correctly includes `EXITING` with `active: 'previous'` and `READY` with `active: 'current'`. This allows `ExitingPage` to handle its own exit *and* its own initial ready state when visited directly.
    *   **`reactium-hooks-transitionpage.js`**: Its `transitionStates` correctly includes `EXITING` with `active: 'previous'`, `LOADING` with `active: 'current'`, `ENTERING` with `active: 'current'`, and `READY` with `active: 'current'`. This ensures `TransitionPage` can handle both its own exit and its entry sequence.
*   **Initial `transitionState` of Directly Visited Pages**: When a page is visited directly (not as part of an ongoing transition), its `transitionState` prop is `'READY'`. This is a default behavior handled by the `Routing` SDK.
*   **Implementing `nextState()` within Components**: Both `ExitingPage.jsx` and `TransitionPage.jsx` use `useEffect` and `setTimeout` to simulate asynchronous tasks, calling `Reactium.Routing.nextState()` to advance the transition.
*   **Navigation Link**: The `ExitingPage.jsx` component correctly includes a `<Link to="/transition">` to trigger the navigation.

### Cypress Test (`cypress/e2e/exit-enter-transition.cy.js`)
The Cypress test successfully verified the complete exit-enter transition flow, demonstrating robust synchronization for multi-component asynchronous transitions.

**Key Learnings from the Fixed Test:**

*   **Verifying Initial `READY` State**: The test correctly asserts `Current Transition State: READY` for `ExitingPage` on direct visit.
*   **Sequencing Assertions for Full Choreography**: The test meticulously asserts the progression of states:
    1.  `ExitingPage` `READY` (initial state).
    2.  Click navigation link.
    3.  `ExitingPage` `EXITING`.
    4.  `cy.wait()` for `ExitingPage` to signal `nextState()`.
    5.  `ExitingPage` `not.exist`.
    6.  `TransitionPage` `LOADING`.
    7.  `cy.wait()` for `TransitionPage` to signal `nextState()`.
    8.  `TransitionPage` `ENTERING`.
    9.  `cy.wait()` for `TransitionPage` to signal `nextState()`.
    10. `TransitionPage` `READY`.

This test provides a comprehensive and verified example of how to implement and test complex page transitions in Reactium.