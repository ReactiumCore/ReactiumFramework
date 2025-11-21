# Reactium Domain-Driven Design (DDD) Artifacts

This document systematically analyzes the various Domain-Driven Design (DDD) artifacts within the Reactium framework, outlining their purpose, usage, and integration into the overall architecture. This analysis is based on the official Reactium documentation from `https://docs.reactium.io/reactium/domain`.

## Core Principles of Reactium's DDD

Reactium encourages organizing projects into **domains** rather than by file type. This approach groups type-specific files within their respective domain directories, promoting modularity and maintainability.

## Artifact Types and Analysis

### 1. Basic Artifacts

These are fundamental files that enable routing, styling, and integration within a Reactium application.

*   **`route.js` (e.g., `reactium-route-greeter.js`)**
    *   **Purpose**: Configures React Router routes. Defines the path, component, and properties for a specific application route.
    *   **Usage**: Exports an array of route objects (as seen in `learning/src/app/components/Greeter/reactium-route-greeter.js`) or a single route object (as seen in `Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-content/Content/Revisions/route.js`).
    *   **Integration**: Discovered by `manifest-tools.js` (via patterns like `(routes?|reactium-routes?.*?)\.jsx?$`), listed in `learning/src/manifest.js` under `allRoutes`, and registered with `Reactium.Routing` via the `routes-init` hook. The `register-route` hook further processes its `component` property for dynamic resolution.
    *   **Code Example (from `learning/src/app/components/Greeter/reactium-route-greeter.js`)**:
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
    *   **Code Example (from `Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-content/Content/Revisions/route.js` - commented out in source but shows valid export structure)**:
        ```javascript
        export default {
            path: '/revisions',
            component: Blueprint, // Blueprint would be a React component
        };
        ```

*   **`index.js` (Main component file)**
    *   **Purpose**: Represents the main component file for a domain. Often, this is the React component itself that is rendered for a route or used within a zone.
    *   **Usage**: Exports the React component.
    *   **Integration**: Can be imported by `reactium-route-*.js` or `reactium-hooks-*.js` files. The `Component.register()` call would then make this component available for `hookableComponent` retrieval.
    *   **Code Example (Inferred from `learning/src/app/components/Greeter/reactium-route-greeter.js`)**: The `Greeter` component itself, likely in `learning/src/app/components/Greeter/Greeter.js` or `index.js`.
    *   **Code Example (from `Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/User/reactium-hooks.js`)**: Numerous components like `UserList`, `UserEditor`, `SidebarWidget` are imported from their respective `index.js` files (e.g., `import UserList from './List';`). This confirms `index.js` as a common convention for exporting the main component of a domain.
    *   **Conclusion**: Understanding is solid. `index.js` serves as a standard entry point for components within their domain folders.

*   **`_reactium-style.scss` (Sass styles)**
    *   **Purpose**: Defines Sass styles specific to a domain or component.
    *   **Usage**: Contains Sass code.
    *   **Integration**: Processed by Gulp tasks (e.g., `styles:compile`) and integrated into the overall styling of the application. The `dddStylesPartial` Gulp task dynamically generates SCSS partials that import these styles based on their priority.

*   **`reactium-hooks.js` (Isomorphic plugin bind point for app bootstrap)**
    *   **Purpose**: Provides a location for registering hooks (using `Hook.register`) that execute during various phases of the application bootstrap. "Isomorphic" means these files run on both the client (frontend) and server (for SSR).
    *   **Usage**: Contains `Hook.register()` calls to define callbacks for specific hook names (e.g., `plugin-init`, `init`). These callbacks often perform tasks like `Component.register()`, `ZoneRegistry.addComponent()`, or other SDK usage.
    *   **Integration**: Discovered by `manifest-tools.js`, listed in `learning/src/manifest.js` under `allHooks`, and loaded dynamically by `dependencies.loadAll('allHooks')` when the `plugin-init` hook executes.
    *   **Code Example (from `learning/src/app/components/HookTester/reactium-hooks-hooktester.js`)**:
        ```javascript
        (async () => {
            const { Hook, Enums, Component, ZoneRegistry } = await import('@atomic-reactor/reactium-core/sdk');

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
    *   **Code Example (from `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/reactium-hooks-App.js`)**: This file extensively defines core Reactium bootstrap hooks, including `routes-init` and `register-route`.
    *   **Code Example (from `Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/User/reactium-hooks.js`)**: This file extensively uses `Reactium.Zone.addComponent()` to place components into administrative UI zones and registers several non-routing related hooks (`user.before.logout`, `user.after.logout`, `user.auth`). It also registers the `AdminUsers` plugin itself. Notably, it does **not** contain `Reactium.Routing.register()` calls.
    *   **Conclusion**: Understanding is solid and directly verified by code examples. This artifact is crucial for the framework's extensibility.

*   **`domain.js` (Domain configuration)**
    *   **Purpose**: Provides configuration specific to a domain.
    *   **Usage**: `domain.js` files are placed within individual domain directories and are expected to export an object (which can optionally include a `name` property to explicitly declare the domain).
    *   **Integration**:
        1.  Discovered by `manifest-tools.js` (via `reactiumConfig.manifest.domains.patterns`) through patterns like `(domain|reactium-domain.*?)\.js$`.
        2.  During the build process, the `domainsManifest` Gulp task executes `regenManifest` with `manifest/processors/domains.js`.
        3.  `manifest/processors/domains.js` dynamically `require()`s each discovered `domain.js` file, aggregates its exported content, and maps its directory path to its domain name.
        4.  This processed data is used by a Handlebars template (`manifest/templates/domains.hbs`) to generate `config.src.domainManifest` (e.g., `learning/src/domains.js`), which serves as a manifest of all domain configurations.
        5.  This generated `src/domains.js` is then loaded by the main `manifestProcessor.js` (for `learning/src/manifest.js`) to provide explicit domain overrides, ensuring that domain names are correctly assigned to artifacts.
    *   **Conclusion**: Understanding is solid. `domain.js` serves as a granular, per-domain configuration mechanism, with its contents being aggregated and potentially used for manifest generation domain overrides.

*   **`services.js` (Utility functions and AJAX requests)**
    *   **Purpose**: Encapsulates utility functions and AJAX request logic for a domain.
    *   **Usage**: Exports functions or objects containing utility functions and AJAX request methods.
    *   **Integration**: Discovered by `manifest-tools.js` (via `reactiumConfig.manifest.patterns` entry for `allServices`), listed in `learning/src/manifest.js` under `allServices`. `dependencies/index.js`'s `load()` method loads these `allServices` from the manifest and stores their `module.default` in `this.services` for runtime access.
    *   **Conclusion**: Understanding is solid.

*   **`reactium-boot.js` (Node/Express (backend-only) plugin bind point for server startup)**
    *   **Purpose**: Provides a location for registering hooks and performing server-side specific setup using Node.js and Express. These are executed only on the backend.
    *   **Usage**: Contains `Hook.register()` calls for server-side hooks (e.g., `Server.*` hooks), middleware registration, or other Node.js specific initialization.
    *   **Integration**: Discovered by `boot-hooks.mjs` (server-side), and its hooks are registered and executed early in the Node.js server bootstrap.
    *   **Conclusion**: Understanding is solid.

*   **`test.js` (Jest/Enzyme test file)**
    *   **Purpose**: Contains unit or integration tests for the domain's code.
    *   **Usage**: Uses Jest and/or Enzyme syntax.
    *   **Integration**: Executed by the testing framework.
    *   **Conclusion**: Understanding is solid for its purpose within DDD.

### 2. Redux Artifacts

These are automatically added by the `@atomic-reactor/reactium-redux` plugin and are specific to Redux state management.

*   **`actions.js`**: Redux actions.
*   **`actionTypes.js`**: Redux action types.
*   **`reducers.js`**: Redux reducers.
*   **`state.js`**: Redux default state.
*   **`middleware.js`**: Redux middleware.
*   **`enhancer.js`**: Redux store enhancer.
*   **Conclusion**: Understanding of purpose is derived from documentation and confirmed by the existence of the `reactium-redux` plugin. Their integration would follow the same manifest discovery and `dependencies.loadAll()` mechanism as hooks and services.

### 3. Runtime Artifacts

These are modules designed for runtime loading and extendibility.

*   **`umd.js`**: Creates an entry point for a Universal Module Definition (UMD) bundle, useful for service workers and runtime plugins.
*   **`umd-config.json`**: Configures the manifest for a UMD module when found in a directory with `umd.js`.
*   **Conclusion**: Understanding is solid, particularly its role in generating UMD bundles for runtime.

### 4. Build Artifacts

These allow modification of Gulp tasks or Webpack compilation behavior for plugins.

*   **`reactium-gulp.js`**:
    *   **Purpose**: Used to register or unregister Gulp tasks for the build process.
    *   **Usage**: Contains Gulp task definitions or modifications.
    *   **Integration**: Discovered and `require`d by `gulp.bootup.js` during Gulp initialization, allowing for dynamic extension of the Gulp build process.
    *   **Conclusion**: Understanding is solid.

*   **`reactium-webpack.js`**:
    *   **Purpose**: Used to register or unregister Webpack configurations for the build process. This is the **new convention** for extending Webpack configuration.
    *   **Usage**: These files would typically contain `ReactiumWebpack.Hook.registerSync()` calls to modify the `WebpackSDK`'s internal registries (for rules, plugins, aliases, etc.).
    *   **Integration**: Discovered and `require()`d by the `WebpackSDK`'s constructor (`WebpackReactiumWebpack` class). The `WebpackSDK` instantiates itself with `'reactium-webpack.js'` as the `ddd` (Domain-Driven Design artifact) parameter, triggering a `globby` search for these files (`./src/**/reactium-webpack.js`, `./reactium_modules/**/reactium-webpack.js`). The `WebpackSDK` then processes these files, which in turn use `ReactiumWebpack.Hook.runSync()` to apply their configuration changes.
    *   **Contrast with `webpack.override.js`**: `webpack.override.js` is the **old convention** for Webpack configuration overrides, handled by the `overrides` function within the core `webpack.config.js`.
    *   **Conclusion**: Understanding is solid. `reactium-webpack.js` is the new, hook-driven convention for Webpack configuration extension, applied through the `WebpackSDK`.

## Summary of Understanding

The Reactium Domain Model effectively organizes code by grouping related artifacts within a domain. The framework heavily relies on convention-over-configuration and automated discovery (via manifest generation) to integrate these artifacts. The distinction between `reactium-hooks.js` (isomorphic, client/server app bootstrap) and `reactium-boot.js` (backend-only, server startup) is crucial for understanding where to place different types of hook registrations and initialization logic. Redux, Runtime, and Build artifacts provide specialized extensions to the core DDD pattern.
