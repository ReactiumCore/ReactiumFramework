# Reactium Extensibility Overview: Backend vs. Frontend, Build-time vs. Runtime

This document clarifies the architectural partitioning of Reactium's extensibility points, distinguishing between backend and frontend concerns, and further categorizing them by build-time tooling and runtime execution. This framework is crucial for understanding where to place different types of custom logic and how they integrate into the Reactium ecosystem.

## Core Concepts

Reactium leverages a "convention-over-configuration" approach and a sophisticated manifest generation system to discover and integrate extensibility artifacts. The key distinctions lie in *when* and *where* these artifacts are processed and executed.

*   **Backend:** Refers to the Node.js server environment, responsible for SSR, API handling, and server-specific logic.
*   **Frontend:** Refers to the client-side (browser) environment, responsible for the Single Page Application (SPA), UI rendering, and client-side interactions.
*   **Build-time:** Processes and tasks that occur during the application's build phase (e.g., Webpack compilation, Gulp tasks for asset processing). These generate the deployable assets.
*   **Runtime:** Logic that executes when the application is actually running (either on the server or in the browser).

## Extensibility Partitions

### 1. Backend Extensibility

Extensibility points primarily affecting the Node.js server environment.

#### 1.1 Backend Runtime Extensibility

These artifacts and mechanisms allow you to extend the server's behavior when the application is running.

*   **`reactium-boot.js`**:
    *   **Purpose**: Node.js/Express (backend-only) plugin bind point for server startup.
    *   **Functionality**: Used to register server-side specific hooks (e.g., `Server.Middleware`, `Server.Proxy`, `Server.Init`), register Express middleware, configure server routes, or perform other Node.js specific initializations. These files are *only* executed on the server.
    *   **Mechanism**: Discovered by `boot-hooks.mjs` (server-side) and processed early in the Node.js server bootstrap process.
    *   **Example Use Case**: Adding custom API endpoints, modifying Express middleware stack, setting up server-side data fetching logic.

*   **`services.js`**:
    *   **Purpose**: While technically isomorphic and loadable on both client and server, `services.js` can contain backend-specific utility functions or logic when accessed in the Node.js context (e.g., interacting with a database directly if the `services.js` is part of a backend-specific domain).
    *   **Functionality**: Provides encapsulated utility functions and AJAX request logic. In a backend context, these could be functions that perform database operations or interact with other internal services.

#### 1.2 Backend Build-time/Tooling Extensibility

While Reactium's Gulp and Webpack tooling primarily focus on frontend assets, custom Gulp tasks can be created that affect backend processes, suchando such as copying server-side assets or generating server-side configuration files.

*   **Custom Gulp Tasks**: Can be defined in a `gulpfile.js` within the project root or potentially within a plugin's `reactium-gulp.js` (see Frontend Build-time below) to manage backend-specific build concerns, though this is less common than frontend asset management.

### 2. Frontend Extensibility

Extensibility points primarily affecting the client-side (browser) application.

#### 2.1 Frontend Runtime Extensibility (Browser SDK)

These artifacts and mechanisms allow you to extend the client-side application's behavior when it's running in the browser.

*   **`reactium-hooks.js`**:
    *   **Purpose**: Isomorphic plugin bind point for application bootstrap.
    *   **Functionality**: Registers hooks that execute on *both* the client and server during application bootstrap. This is where client-side components are registered (`Component.register()`), components are added to zones (`ZoneRegistry.addComponent()`), and client-side SDK features are initialized.
    *   **Mechanism**: Discovered by `manifest-tools.js`, listed in the `manifest.js`, and dynamically loaded by `dependencies.loadAll('allHooks')` during the `plugin-init` hook.
    *   **Example Use Case**: Registering custom React components, defining client-side routing logic, initializing client-side state management, integrating third-party client-side libraries.

*   **`route.js`**:
    *   **Purpose**: Configures React Router routes for the client-side application.
    *   **Functionality**: Defines the path, component, and properties for a specific client-side route. These components are then rendered in the browser.
    *   **Mechanism**: Discovered by `manifest-tools.js`, listed in `manifest.js` under `allRoutes`, and registered with `Reactium.Routing` via the `routes-init` hook.

*   **`index.js` (Main Component File)**:
    *   **Purpose**: Represents the main React component for a domain, intended for client-side rendering.
    *   **Functionality**: Exports the React component that will be rendered when its associated route is active or when placed in a `Zone`.

*   **`_reactium-style.scss`**:
    *   **Purpose**: Defines Sass styles specific to a domain or component, primarily for the frontend UI.
    *   **Functionality**: Contains Sass code that is compiled and applied to the client-side application.
    *   **Mechanism**: Processed by Gulp tasks, dynamically generating SCSS partials for inclusion in the main stylesheet.

*   **Redux Artifacts (`actions.js`, `actionTypes.js`, `reducers.js`, `state.js`, `middleware.js`, `enhancer.js`)**:
    *   **Purpose**: Standard Redux patterns for managing client-side application state.
    *   **Functionality**: Define actions, reducers, and initial state for Redux stores, primarily active in the browser environment.
    *   **Mechanism**: Automatically integrated by the `@atomic-reactor/reactium-redux` plugin, following manifest discovery patterns.

*   **`umd.js` and `umd-config.json`**:
    *   **Purpose**: Enable runtime loading of Universal Module Definition (UMD) bundles, especially useful for service workers or client-side plugin systems that load modules dynamically in the browser.

#### 2.2 Frontend Build-time/Tooling Extensibility

These artifacts and mechanisms allow you to extend the processes that build the client-side application assets.

*   **`reactium-webpack.js`**:
    *   **Purpose**: The **new convention** for extending Webpack configuration for frontend builds.
    *   **Functionality**: Contains `ReactiumWebpack.Hook.registerSync()` calls to modify the `WebpackSDK`'s internal registries for rules, plugins, aliases, etc., thereby customizing how frontend assets are bundled and processed.
    *   **Mechanism**: Discovered by `WebpackSDK` during its instantiation, which then processes these files to apply configuration changes.
    *   **Example Use Case**: Adding new Webpack loaders, configuring asset optimization, modifying build output.

*   **`reactium-gulp.js`**:
    *   **Purpose**: Used to register or unregister Gulp tasks for the build process, specifically relevant for frontend asset pipeline management.
    *   **Functionality**: Allows for dynamic extension of the Gulp build process, including tasks for compiling Sass, optimizing images, minifying JavaScript, or managing other frontend assets.
    *   **Mechanism**: Discovered and `require`d by `gulp.bootup.js` during Gulp initialization, enabling dynamic modification of the frontend build pipeline.
    *   **Example Use Case**: Customizing CSS preprocessing, setting up sprite generation, integrating specific frontend asset optimization tools.

### 3. Cross-Cutting Artifacts

Some artifacts serve purposes that can span both backend and frontend, or are primarily for organization and testing.

*   **`domain.js`**:
    *   **Purpose**: Provides configuration specific to a domain.
    *   **Functionality**: Can define metadata, default settings, or other configurations that might be consumed by both backend and frontend components, often used for manifest generation domain overrides.
    *   **Mechanism**: Discovered by `manifest-tools.js` and processed to generate `domains.js` for use in the overall application manifest.

*   **`test.js`**:
    *   **Purpose**: Contains unit or integration tests for the domain's code.
    *   **Functionality**: Can test both backend logic (e.g., API routes, server-side functions) and frontend logic (e.g., React components, Redux reducers).
    *   **Mechanism**: Executed by the testing framework (e.g., Jest, Cypress).

## Summary of Partitions

| Category                | Backend (Node.js Server)         | Frontend (Browser SPA)           |
| :---------------------- | :------------------------------- | :------------------------------- |
| **Runtime Extensibility** | `reactium-boot.js` (hooks, middleware) | `reactium-hooks.js` (isomorphic hooks), `route.js`, `index.js`, Redux artifacts, `services.js`, `umd.js` |
| **Build-time/Tooling**  | Custom Gulp tasks (less common)  | `reactium-webpack.js`, `reactium-gulp.js` |
| **Cross-Cutting**       | `domain.js`, `test.js`           | `domain.js`, `test.js`           |

This structured view highlights how Reactium provides distinct, yet interconnected, mechanisms for extending various parts of the application, ensuring a clear separation of concerns while maintaining a unified development experience.