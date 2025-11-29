<!-- v1.27.0 -->
# CLAUDEDB - Task-Based Index

**Purpose**: "I need to..." → implementation sections
**Rule**: Every task links directly to the most relevant implementation guide

---

## Project Initialization

### Initialize a new Reactium project
→ [CLI Commands: Init Command](../CLAUDE/CLI_COMMANDS_REFERENCE.md#npx-reactium-init)
→ [CLI Commands: Workflow 1 - Project Setup](../CLAUDE/CLI_COMMANDS_REFERENCE.md#workflow-1-creating-a-new-page)

**Quick Start**:
```bash
npx reactium init --type app
```

### Initialize a new Actinium API server
→ [CLI Commands: Init Command](../CLAUDE/CLI_COMMANDS_REFERENCE.md#npx-reactium-init)

**Quick Start**:
```bash
npx reactium init --type api
```

---

## Build Something

### Create a complete page (component + route + style)
→ [CLI Commands: Component Command](../CLAUDE/CLI_COMMANDS_REFERENCE.md#npx-reactium-component)
→ [CLI Commands: Workflow 1 - Creating a New Page](../CLAUDE/CLI_COMMANDS_REFERENCE.md#workflow-1-creating-a-new-page)

**Quick CLI**:
```bash
npx reactium component \
  --name AboutPage \
  --destination src/app/components/AboutPage \
  --route '/about' \
  --hooks \
  --domain \
  --style scss
```

### Create a component
→ [Reactium: Component System](../CLAUDE/REACTIUM_FRAMEWORK.md#component-system)
→ [Patterns: Domain-Driven Organization](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-1-domain-driven-component-organization)
→ [CLI Commands: Component Command](../CLAUDE/CLI_COMMANDS_REFERENCE.md#npx-reactium-component)

**Quick CLI**:
```bash
npx reactium component --name MyComponent --destination src/app/components
```

### Create a route
→ [Routing System: Overview](../CLAUDE/ROUTING_SYSTEM.md#overview)
→ [Routing System: File Discovery & Manifest Generation](../CLAUDE/ROUTING_SYSTEM.md#file-discovery--manifest-generation)
→ [CLI Commands: Route Command](../CLAUDE/CLI_COMMANDS_REFERENCE.md#npx-reactium-route)

**Quick CLI**:
```bash
npx reactium route --destination src/app/components/MyComponent --route '/path'
```

### Add route to existing component
→ [CLI Commands: Workflow 2 - Adding Route to Existing Component](../CLAUDE/CLI_COMMANDS_REFERENCE.md#workflow-2-adding-route-to-existing-component)
→ [CLI Commands: Route Command](../CLAUDE/CLI_COMMANDS_REFERENCE.md#npx-reactium-route)

### Create a route with data loading
→ [Routing System: loadState Pattern](../CLAUDE/ROUTING_SYSTEM.md#loadstate-pattern-data-preloading)
→ [Patterns: Static Method Data Loading](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-2-static-method-data-loading)

### Create a route with transitions
→ [Routing System: Transition State Machine](../CLAUDE/ROUTING_SYSTEM.md#transition-state-machine)
→ [Routing System: Best Practices](../CLAUDE/ROUTING_SYSTEM.md#best-practices)

### Modify routes before registration
→ [Routing System: The register-route Hook](../CLAUDE/ROUTING_SYSTEM.md#the-register-route-hook)

### Debug route matching issues
→ [Routing System: Route Sorting & Matching](../CLAUDE/ROUTING_SYSTEM.md#5-route-sorting--matching)
→ [Routing System: Common Gotchas](../CLAUDE/ROUTING_SYSTEM.md#common-gotchas)

### Create a frontend plugin
→ [Reactium: Plugin System](../CLAUDE/REACTIUM_FRAMEWORK.md#plugin-system--registration)
→ [Reactium: Creating a Plugin](../CLAUDE/REACTIUM_FRAMEWORK.md#creating-a-plugin)
→ [Patterns: Hook-Based Plugin Architecture](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-4-hook-based-plugin-architecture)

### Create a backend plugin
→ [Plugin Management System: Overview](../CLAUDE/ACTINIUM_PLUGIN_SYSTEM.md#overview)
→ [Plugin System: Plugin Registration](../CLAUDE/ACTINIUM_PLUGIN_SYSTEM.md#basic-plugin-object)
→ [Plugin System: Lifecycle Hooks](../CLAUDE/ACTINIUM_PLUGIN_SYSTEM.md#plugin-lifecycle)
→ [Patterns: Plugin SDK Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-8-plugin-sdk-pattern-server-side)

**Quick Example**:
```javascript
const PLUGIN = {
    ID: 'MY_PLUGIN',
    name: 'My Plugin',
    description: 'Plugin description',
    order: 100,
    version: {
        actinium: '>=3.2.0',
        plugin: '1.0.0',
    },
};
Actinium.Plugin.register(PLUGIN, true);
```

### Activate/deactivate an Actinium plugin
→ [Plugin System: Activation](../CLAUDE/ACTINIUM_PLUGIN_SYSTEM.md#3-activation)
→ [Plugin System: Deactivation](../CLAUDE/ACTINIUM_PLUGIN_SYSTEM.md#5-deactivation)
→ [Plugin System: Check Active Status](../CLAUDE/ACTINIUM_PLUGIN_SYSTEM.md#check-active-status)

**Programmatic Control**:
```javascript
// Activate
await Actinium.Plugin.activate('MY_PLUGIN');

// Deactivate
await Actinium.Plugin.deactivate('MY_PLUGIN');

// Check if active
if (Actinium.Plugin.isActive('MY_PLUGIN')) {
    // Plugin-specific logic
}
```

### Add plugin assets (logo, scripts, stylesheets)
→ [Plugin System: File-Based Assets](../CLAUDE/ACTINIUM_PLUGIN_SYSTEM.md#file-based-assets)
→ [Plugin System: Asset Upload Lifecycle](../CLAUDE/ACTINIUM_PLUGIN_SYSTEM.md#asset-upload-lifecycle)

**Quick Example**:
```javascript
Actinium.Plugin.addLogo(PLUGIN.ID, path.resolve(__dirname, 'logo.svg'));
Actinium.Plugin.addScript(PLUGIN.ID, path.resolve(__dirname, 'bundle.js'));
Actinium.Plugin.addStylesheet(PLUGIN.ID, path.resolve(__dirname, 'styles.css'));
```

### Create plugin version migrations
→ [Plugin System: updateHookHelper Pattern](../CLAUDE/ACTINIUM_PLUGIN_SYSTEM.md#updatehookhelper-pattern)
→ [Plugin System: Version Management](../CLAUDE/ACTINIUM_PLUGIN_SYSTEM.md#version-management-and-migrations)

**Quick Example**:
```javascript
const migrations = {
    '1.0.4': {
        migration: async (plugin, req, old) => {
            // Upgrade logic for version 1.0.4
        }
    },
    '1.0.5': {
        migration: async (plugin, req, old) => {
            // Upgrade logic for version 1.0.5
        }
    },
};
Actinium.Hook.register('update', Actinium.Plugin.updateHookHelper('MY_PLUGIN', migrations));
```

### Register admin routes for plugin
→ [Route System: Plugin Lifecycle Integration](../CLAUDE/ACTINIUM_ROUTE_SYSTEM.md#plugin-lifecycle-integration)
→ [Route System: Real-World Plugin Examples](../CLAUDE/ACTINIUM_ROUTE_SYSTEM.md#real-world-plugin-examples)

**Quick Example**:
```javascript
const PLUGIN_ROUTES = [{
  route: '/admin/my-plugin',
  blueprint: 'MyPlugin',
  capabilities: ['my-plugin.view'],
  meta: { builtIn: true, app: 'admin' },
}];

Actinium.Hook.register('start', async () => {
  if (Actinium.Plugin.isActive(PLUGIN.ID)) {
    for (const route of PLUGIN_ROUTES) {
      await Actinium.Route.save(route);
    }
  }
});
```

### Add development tests for plugin
→ [Harness Testing: Integration with Plugin Development](../CLAUDE/ACTINIUM_HARNESS_TESTING.md#integration-with-plugin-development)
→ [Harness Testing: Test Registration API](../CLAUDE/ACTINIUM_HARNESS_TESTING.md#actiniumharnesstest)

**Quick Example**:
```javascript
if (ENV.RUN_TEST === true) {
  Actinium.Harness.test('Plugin Cloud Functions', async assert => {
    const result = await Actinium.Cloud.run('my-function', {}, { useMasterKey: true });
    assert.strictEqual(result.status, 'ok', 'Should return success');
  });
}
```

### Gate cloud functions by plugin active state
→ [Plugin System: Gate Cloud Functions](../CLAUDE/ACTINIUM_PLUGIN_SYSTEM.md#gate-cloud-functions)

**Quick Example**:
```javascript
Actinium.Cloud.define(PLUGIN.ID, 'my-function', (req) => {
    return Actinium.Plugin.gate({
        req,
        ID: PLUGIN.ID,
        name: 'my-function',
        callback: async (req) => {
            // Function logic runs only if plugin is active
            return doWork(req.params);
        }
    });
});
```

### Extend the Reactium SDK (browser-side)
→ [SDK Extension Pattern: Overview](../CLAUDE/SDK_EXTENSION_PATTERN.md#overview)
→ [SDK Extension: Direct Extension](../CLAUDE/SDK_EXTENSION_PATTERN.md#pattern-1-direct-sdk-extension)
→ [SDK Extension: APIRegistry Extension](../CLAUDE/SDK_EXTENSION_PATTERN.md#pattern-2-apiregistry-extension)
→ [SDK Extension: Best Practices](../CLAUDE/SDK_EXTENSION_PATTERN.md#best-practices)

### Add React Context provider
→ [AppContext: Overview](../CLAUDE/APPCONTEXT_PROVIDER_SYSTEM.md#overview)
→ [AppContext: Registration API](../CLAUDE/APPCONTEXT_PROVIDER_SYSTEM.md#reactiumappcontextregistername-data-order)
→ [AppContext: Common Use Cases](../CLAUDE/APPCONTEXT_PROVIDER_SYSTEM.md#common-use-cases)

### Add component styles
→ [Style Partial System: Overview](../CLAUDE/REACTIUM_STYLE_PARTIAL_SYSTEM.md#overview)
→ [Style Partial System: Real-World Usage](../CLAUDE/REACTIUM_STYLE_PARTIAL_SYSTEM.md#real-world-usage)
→ [Style Partial System: Naming Patterns](../CLAUDE/REACTIUM_STYLE_PARTIAL_SYSTEM.md#naming-patterns)

### Register custom SCSS patterns
→ [Style Partial System: Hook Extension](../CLAUDE/REACTIUM_STYLE_PARTIAL_SYSTEM.md#2-pre-registration--hook-extension)
→ [Style Partial System: Pattern 4 - Custom Priority](../CLAUDE/REACTIUM_STYLE_PARTIAL_SYSTEM.md#pattern-4-custom-priority-registration)

### Create namespaced BEM-style component classnames
→ [Utility Helpers: cxFactory Overview](../CLAUDE/REACTIUM_UTILITY_HELPERS.md#cxfactory---namespaced-classname-generation)
→ [Utility Helpers: cxFactory Usage Patterns](../CLAUDE/REACTIUM_UTILITY_HELPERS.md#usage-patterns)

**Quick Pattern**:
```javascript
const MyComponent = ({ namespace = 'my-component' }) => {
    const cx = Reactium.Utils.cxFactory(namespace);
    return (
        <div className={cx()}>
            <header className={cx('header')}>
                <h1 className={cx('title')}>Title</h1>
            </header>
        </div>
    );
};
// Renders: my-component, my-component-header, my-component-title
```

### Generate dynamic internationalized UI strings
→ [Utility Helpers: SplitParts Overview](../CLAUDE/REACTIUM_UTILITY_HELPERS.md#splitparts---token-based-string-templates)
→ [Utility Helpers: SplitParts Usage Patterns](../CLAUDE/REACTIUM_UTILITY_HELPERS.md#usage-patterns-1)

**Quick Pattern**:
```javascript
const template = Reactium.Utils.splitParts(__('Welcome %username%, you have %count% messages'));
template.replace({ username: user.name, count: user.messageCount });
return <p>{template.toString()}</p>;
```

### Integrate Apollo GraphQL
→ [AppContext: Apollo GraphQL Provider](../CLAUDE/APPCONTEXT_PROVIDER_SYSTEM.md#1-apollo-graphql-client)
→ [SDK Extension: APIRegistry Extension](../CLAUDE/SDK_EXTENSION_PATTERN.md#example-graphql-integration)

### Integrate Redux
→ [AppContext: Redux Provider](../CLAUDE/APPCONTEXT_PROVIDER_SYSTEM.md#2-redux-store)

### Add Material-UI theme
→ [AppContext: Material-UI Theme](../CLAUDE/APPCONTEXT_PROVIDER_SYSTEM.md#3-material-ui-theme)

### Create a Cloud Function
→ [Cloud Functions: Overview](../CLAUDE/CLOUD_FUNCTIONS.md#overview)
→ [Cloud Functions: Registration Pattern](../CLAUDE/CLOUD_FUNCTIONS.md#registration-pattern)
→ [Cloud Functions: Real-World Examples](../CLAUDE/CLOUD_FUNCTIONS.md#real-world-examples)

### Create an API endpoint
→ [Cloud Functions: Overview](../CLAUDE/CLOUD_FUNCTIONS.md#overview)
→ [Cloud Functions: Registration Pattern](../CLAUDE/CLOUD_FUNCTIONS.md#registration-pattern)

---

## CLI & Tooling

### Build a multi-step CLI command workflow
→ [ActionSequence Pattern: Overview](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#overview)
→ [ActionSequence: Pattern 1 - Generator Wrapper](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#pattern-1-generator-wrapper-standard-cli-command-pattern)
→ [ActionSequence: Best Practices](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#best-practices)

**Quick Pattern**:
```javascript
const actions = {
  init: ({ params }) => { /* setup */ },
  fetch: ({ params, context }) => { /* use context.init */ },
  complete: ({ context }) => { /* finalize */ }
};

await ActionSequence({ actions, options: { params, props } });
```

### Execute sequential async operations with shared context
→ [ActionSequence Pattern: Overview](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#overview)
→ [ActionSequence: Action Function Signature](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#action-function-signature)
→ [ActionSequence: Return Value](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#return-value)

### Handle errors in multi-step workflows
→ [ActionSequence: Error Handling Patterns](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#error-handling-patterns)
→ [ActionSequence: Gotcha 4 - Error Stops Sequence](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#4-error-in-one-action-stops-all-subsequent-actions)

### Merge actions from multiple sources
→ [ActionSequence: Pattern 3 - Plugin Post-Install Hooks](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#pattern-3-plugin-post-install-hooks)
→ [ActionSequence: Best Practice 6 - Action Merging](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#6-action-merging-for-extensibility)

### Debug CLI command failures
→ [ActionSequence: Testing ActionSequence Workflows](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#testing-actionsequence-workflows)
→ [ActionSequence: Common Gotchas](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#common-gotchas)

### Authenticate for package publishing
→ [CLI Commands: Auth Command](../CLAUDE/CLI_COMMANDS_REFERENCE.md#npx-reactium-auth)

**Quick CLI**:
```bash
npx reactium auth --username Bob --password 'MyPassword'
```

### Label directories for CLI shortcuts
→ [CLI Commands: Label Command](../CLAUDE/CLI_COMMANDS_REFERENCE.md#npx-reactium-label)
→ [CLI Commands: Best Practice 1 - Use Labels](../CLAUDE/CLI_COMMANDS_REFERENCE.md#1-use-labels-for-common-paths)

**Quick CLI**:
```bash
npx reactium label --path src/app/components --key labels.components
npx reactium component --destination '[labels.components]/Button' --name Button
```

### Create a custom CLI command
→ [CLI: Command Module Structure](../CLAUDE/CLI_COMMAND_SYSTEM.md#4-command-module-structure)
→ [CLI: Command Structure Pattern](../CLAUDE/CLI_COMMAND_SYSTEM.md#5-command-structure-pattern)
→ [CLI: Pattern 1 - Project-Specific Command](../CLAUDE/CLI_COMMAND_SYSTEM.md#pattern-1-project-specific-command)

**Quick Example**:
```bash
npx reactium cli command --name deploy
```

### Create custom file generator with templates
→ [CLI Templates: Component Generator Pattern](../CLAUDE/CLI_TEMPLATE_SYSTEM.md#5-component-generator-pattern)
→ [CLI Templates: Template Directory Structure](../CLAUDE/CLI_TEMPLATE_SYSTEM.md#2-template-directory-structure)

**Example Template**:
```javascript
// [project]/.cli/commands/deploy/index.js
export const NAME = 'deploy';
export const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description('Deploy project')
        .action(async (opt) => { /* ... */ });
```

### Extend core CLI commands
→ [CLI: Hook-Driven Extensibility](../CLAUDE/CLI_COMMAND_SYSTEM.md#6-hook-driven-extensibility)
→ [CLI: Command-Specific Hooks](../CLAUDE/CLI_COMMAND_SYSTEM.md#command-specific-hooks-reactium-arclijs)
→ [CLI: Pattern 3 - Extending Core Commands](../CLAUDE/CLI_COMMAND_SYSTEM.md#pattern-3-extending-core-commands)

### Create reusable CLI package
→ [CLI: Pattern 2 - Reusable NPM Package Command](../CLAUDE/CLI_COMMAND_SYSTEM.md#pattern-2-reusable-npm-package-command)
→ [CLI: Command Discovery Locations](../CLAUDE/CLI_COMMAND_SYSTEM.md#2-command-discovery-locations)

### Debug CLI command discovery
→ [CLI: Debugging Command Discovery](../CLAUDE/CLI_COMMAND_SYSTEM.md#debugging-command-discovery)
→ [CLI: Common Gotchas](../CLAUDE/CLI_COMMAND_SYSTEM.md#common-gotchas)

### Add CLI hooks globally
→ [CLI: Global Hooks](../CLAUDE/CLI_COMMAND_SYSTEM.md#global-hooks-arcli-hooksjs)
→ [CLI: Hook-Driven Extensibility](../CLAUDE/CLI_COMMAND_SYSTEM.md#6-hook-driven-extensibility)

### Use ActionSequence in CLI commands
→ [CLI: ActionSequence Pattern](../CLAUDE/CLI_COMMAND_SYSTEM.md#7-actionsequence-pattern)

### Add custom setup actions during plugin installation
→ [Plugin CLI Extensibility: arcli-install.js Pattern](../CLAUDE/PLUGIN_CLI_EXTENSIBILITY.md#arcli-installjs-pattern)
→ [Plugin CLI Extensibility: Real-World Example](../CLAUDE/PLUGIN_CLI_EXTENSIBILITY.md#arcli-installjs---scss-import-integration)

**Quick Example**:
```javascript
// [plugin]/arcli-install.js
module.exports = (spinner, arcli, params, props) => {
    return {
        init: async ({ params }) => {
            // Access pluginDirectory from params
            const dir = params.pluginDirectory;
        },
        prompt: async () => {
            spinner.stop(); // Stop before prompts
            // Interactive setup
        },
        complete: () => console.log('Setup complete!')
    };
};
```

### Add build steps before plugin publishing
→ [Plugin CLI Extensibility: arcli-publish.js Pattern](../CLAUDE/PLUGIN_CLI_EXTENSIBILITY.md#arcli-publishjs-pattern)
→ [Plugin CLI Extensibility: Asset Compilation Example](../CLAUDE/PLUGIN_CLI_EXTENSIBILITY.md#arcli-publishjs---asset-compilation)

**Quick Example**:
```javascript
// [plugin]/arcli-publish.js
module.exports = spinner => {
    return {
        compileCSS: async () => {
            spinner.text = 'Compiling CSS...';
            await buildAssets();
        },
        complete: () => console.log('Build complete!')
    };
};
```

### Inject files or configuration during plugin install
→ [Plugin CLI Extensibility: Common Use Cases](../CLAUDE/PLUGIN_CLI_EXTENSIBILITY.md#common-use-cases)
→ [Plugin CLI Extensibility: Configuration File Generation](../CLAUDE/PLUGIN_CLI_EXTENSIBILITY.md#2-configuration-file-generation)

### Run database migrations during plugin installation
→ [Plugin CLI Extensibility: Database Migration](../CLAUDE/PLUGIN_CLI_EXTENSIBILITY.md#1-database-migrationinitialization)

---

### Add Express middleware
→ [Actinium Middleware: Registration API](../CLAUDE/ACTINIUM_MIDDLEWARE.md#actiniummiddlewareregisterid-callback-order)
→ [Actinium Middleware: Common Patterns](../CLAUDE/ACTINIUM_MIDDLEWARE.md#common-patterns)
→ [Actinium Middleware: Real-World Examples](../CLAUDE/ACTINIUM_MIDDLEWARE.md#real-world-examples)

### Configure Express settings (view engine, trust proxy, etc.)
→ [Express Settings: Overview](../CLAUDE/EXPRESS_SETTINGS_SYSTEM.md#overview)
→ [Express Settings: Configuration](../CLAUDE/EXPRESS_SETTINGS_SYSTEM.md#configuration)
→ [Express Settings: Common Settings Reference](../CLAUDE/EXPRESS_SETTINGS_SYSTEM.md#common-express-settings)

### Set trust proxy for load balancer
→ [Express Settings: Proxy Configuration](../CLAUDE/EXPRESS_SETTINGS_SYSTEM.md#proxy-configuration)
→ [Express Settings: Pattern 1 - Load Balancer Deployment](../CLAUDE/EXPRESS_SETTINGS_SYSTEM.md#pattern-1-load-balancer-deployment)

### Change view engine (EJS, Pug, Handlebars)
→ [Express Settings: View Engine Configuration](../CLAUDE/EXPRESS_SETTINGS_SYSTEM.md#view-engine-configuration)
→ [Express Settings: Pattern 2 - Custom Template Engine](../CLAUDE/EXPRESS_SETTINGS_SYSTEM.md#pattern-2-custom-template-engine)

### Configure CORS in Actinium
→ [Actinium Middleware: CORS Example](../CLAUDE/ACTINIUM_MIDDLEWARE.md#real-world-examples)

### Serve static files in Actinium
→ [Actinium Middleware: Static Assets Middleware](../CLAUDE/ACTINIUM_MIDDLEWARE.md#static-assets-middleware)
→ [Actinium Middleware: Pattern 2 - Router-Based](../CLAUDE/ACTINIUM_MIDDLEWARE.md#pattern-2-router-based-middleware)

### Replace core middleware
→ [Actinium Middleware: replace API](../CLAUDE/ACTINIUM_MIDDLEWARE.md#actiniummiddlewarereplaceid-callback)
→ [Actinium Middleware: Gotcha 2](../CLAUDE/ACTINIUM_MIDDLEWARE.md#gotcha-2-middleware-replacement-timing)

### Disable middleware
→ [Actinium Middleware: unregister API](../CLAUDE/ACTINIUM_MIDDLEWARE.md#actiniummiddlewareunregisterid)

### Create hook-driven middleware
→ [Actinium Middleware: registerHook API](../CLAUDE/ACTINIUM_MIDDLEWARE.md#actiniummiddlewareregisterhookid-path-order)
→ [Actinium Middleware: Pattern 4 - Hook-Driven](../CLAUDE/ACTINIUM_MIDDLEWARE.md#pattern-4-hook-driven-middleware)

### Secure a Cloud Function
→ [Cloud Functions: Security & Authorization](../CLAUDE/CLOUD_FUNCTIONS.md#security--authorization)
→ [Cloud Functions: CloudRunOptions](../CLAUDE/CLOUD_FUNCTIONS.md#cloudrunoptions---automatic-privilege-escalation)
→ [Cloud Functions: CloudCapOptions](../CLAUDE/CLOUD_FUNCTIONS.md#cloudcapoptions---capability-based-escalation)

### Check capabilities in Cloud Function
→ [Cloud Functions: CloudHasCapabilities](../CLAUDE/CLOUD_FUNCTIONS.md#cloudhascapabilities---check-without-escalation)
→ [Cloud Functions: Best Practices](../CLAUDE/CLOUD_FUNCTIONS.md#best-practices)

### Set ACL on Parse objects
→ [Cloud Functions: CloudACL](../CLAUDE/CLOUD_FUNCTIONS.md#cloudacl---generate-acl-from-permissions)
→ [Cloud Functions: Usage Pattern - Object-Level Permissions](../CLAUDE/CLOUD_FUNCTIONS.md#usage-pattern---object-level-permissions)

### Validate Cloud Function parameters
→ [Cloud Functions: Parameter Validation](../CLAUDE/CLOUD_FUNCTIONS.md#parameter-validation)
→ [Cloud Functions: Common Validation Patterns](../CLAUDE/CLOUD_FUNCTIONS.md#common-validation-patterns)

### Define a database schema
→ [Collection Registration: Core API](../CLAUDE/COLLECTION_REGISTRATION.md#actiniumcollectionregister)
→ [Collection Registration: Registration Pattern](../CLAUDE/COLLECTION_REGISTRATION.md#registration-pattern)
→ [Patterns: Schema Initialization Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-11-schema-initialization-pattern)

### Add permissions/capabilities
→ [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)
→ [Collection Registration: CLP Generation](../CLAUDE/COLLECTION_REGISTRATION.md#clp-generation-mechanism)
→ [Patterns: Capability-Based Authorization](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-10-capability-based-authorization)

### Set Class-Level Permissions (CLP)
→ [Collection Registration: CLP Generation Mechanism](../CLAUDE/COLLECTION_REGISTRATION.md#clp-generation-mechanism)
→ [Collection Registration: Dynamic CLP Updates](../CLAUDE/COLLECTION_REGISTRATION.md#dynamic-clp-updates)
→ [Collection Registration: Hook Integration](../CLAUDE/COLLECTION_REGISTRATION.md#hook-integration)

### Add database indexes
→ [Collection Registration: Schema Field Management](../CLAUDE/COLLECTION_REGISTRATION.md#schema-field-management)
→ [Collection Registration: Best Practices](../CLAUDE/COLLECTION_REGISTRATION.md#best-practices)

### Migrate database schema
→ [Collection Registration: Migration Patterns](../CLAUDE/COLLECTION_REGISTRATION.md#migration-patterns)
→ [Collection Registration: Schema Field Management](../CLAUDE/COLLECTION_REGISTRATION.md#schema-field-management)

### Add middleware
→ [Actinium: Middleware System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#middleware-system)
→ [Patterns: Middleware Priority Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-13-middleware-priority-pattern)

### Create a custom registry for plugins
→ [Registry System: Overview](../CLAUDE/REGISTRY_SYSTEM.md#overview)
→ [Registry System: Core API](../CLAUDE/REGISTRY_SYSTEM.md#core-api)
→ [Registry System: Best Practices](../CLAUDE/REGISTRY_SYSTEM.md#best-practices)

---

## Work With Data

### Fetch data from backend
→ [Integration: Data Flow Patterns](../CLAUDE/FRAMEWORK_INTEGRATION.md#data-flow-patterns)
→ [Integration: Cloud Function Integration](../CLAUDE/FRAMEWORK_INTEGRATION.md#cloud-function-integration)

### Load data on route navigation
→ [Routing System: loadState Pattern](../CLAUDE/ROUTING_SYSTEM.md#loadstate-pattern-data-preloading)
→ [Routing System: Handle Persistence](../CLAUDE/ROUTING_SYSTEM.md#handle-persistence)
→ [Patterns: Static Method Data Loading](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-2-static-method-data-loading)

### Share state between components
→ [Handle System: Overview](../CLAUDE/HANDLE_SYSTEM.md#overview)
→ [Handle System: Real-World Usage Patterns](../CLAUDE/HANDLE_SYSTEM.md#real-world-usage-patterns)
→ [Patterns: Handle-Based Shared State](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-3-handle-based-shared-state)

### Listen to state changes
→ [ComponentEvent: useEventEffect Hook](../CLAUDE/COMPONENT_EVENT_SYSTEM.md#useeventeffect-hook)
→ [ReactiumSyncState: Event Lifecycle](../CLAUDE/REACTIUM_SYNC_STATE.md#event-lifecycle)
→ [ComponentEvent: Real-World Usage Patterns](../CLAUDE/COMPONENT_EVENT_SYSTEM.md#real-world-usage-patterns)

### Dispatch custom events
→ [ComponentEvent: Overview](../CLAUDE/COMPONENT_EVENT_SYSTEM.md#overview)
→ [ReactiumSyncState: dispatch() Method](../CLAUDE/REACTIUM_SYNC_STATE.md#dispatchpayload-type-string-payload-payload--this)

### Provide an API/service globally
→ [Handle System: Provider Pattern](../CLAUDE/HANDLE_SYSTEM.md#provider-pattern-useregisterhandle)
→ [Handle System: Pattern 4 - Plugin Communication](../CLAUDE/HANDLE_SYSTEM.md#pattern-4-plugin-communication)

### Consume global state reactively
→ [Handle System: Reactive Consumer Pattern](../CLAUDE/HANDLE_SYSTEM.md#reactive-consumer-pattern-usesynchandle)
→ [Handle System: Observable State Provider](../CLAUDE/HANDLE_SYSTEM.md#observable-state-provider-useregistersynchandle)

### Manage local component state
→ [Reactium: useSyncState](../CLAUDE/REACTIUM_FRAMEWORK.md#1-local-component-state-usesyncstate)
→ [Gotchas: useSyncState Is Not useState](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-2-usesyncstate-is-not-usestate)

### Store user preferences (LocalStorage)
→ [Prefs System: Overview](../CLAUDE/PREFS_SYSTEM.md#architecture-overview)
→ [Prefs System: Common Patterns](../CLAUDE/PREFS_SYSTEM.md#common-patterns)
→ [Prefs System: Component State Persistence](../CLAUDE/PREFS_SYSTEM.md#pattern-1-component-state-persistence)

### Sync preferences to server
→ [Prefs System: User Preference Sync](../CLAUDE/PREFS_SYSTEM.md#pattern-2-user-preference-sync-serverclient)
→ [Prefs System: Integration with User.Pref API](../CLAUDE/PREFS_SYSTEM.md#with-userpref-api-server-sync)

### Persist UI state across sessions
→ [Prefs System: Sidebar/Panel Size Persistence](../CLAUDE/PREFS_SYSTEM.md#pattern-3-sidebarpanel-size-persistence)
→ [Prefs System: Best Practices](../CLAUDE/PREFS_SYSTEM.md#best-practices)

### Store application settings (server-side)
→ [Settings System: Overview](../CLAUDE/ACTINIUM_SETTINGS_SYSTEM.md#overview)
→ [Settings System: Setting.set()](../CLAUDE/ACTINIUM_SETTINGS_SYSTEM.md#settingsetkey-value-acl)
→ [Settings System: Setting.get()](../CLAUDE/ACTINIUM_SETTINGS_SYSTEM.md#settinggetkey-defaultvalue-options)

**Quick Example**:
```javascript
// Set entire group
await Actinium.Setting.set('site', {
    title: 'My Awesome Site',
    hostname: 'example.com',
});

// Set nested key
await Actinium.Setting.set('site.hostname', 'newdomain.com');

// Get value
const hostname = await Actinium.Setting.get('site.hostname');
const siteSettings = await Actinium.Setting.get('site');
```

### Configure plugin settings
→ [Settings System: Hierarchical Addressing](../CLAUDE/ACTINIUM_SETTINGS_SYSTEM.md#hierarchical-addressing)
→ [Settings System: Real-World Usage Examples](../CLAUDE/ACTINIUM_SETTINGS_SYSTEM.md#real-world-usage-examples)

**Quick Example**:
```javascript
// Plugin configuration
await Actinium.Setting.set('MyPlugin', {
    enabled: true,
    apiKey: 'secret-key',
    refreshInterval: 60,
});

// Read plugin settings
const config = await Actinium.Setting.get('MyPlugin', {
    enabled: false,  // Default if not set
});
```

### Make settings publicly readable (anonymous access)
→ [Settings System: Anonymous Group Registry](../CLAUDE/ACTINIUM_SETTINGS_SYSTEM.md#anonymous-group-registry)
→ [Settings System: Capability-Based Access Control](../CLAUDE/ACTINIUM_SETTINGS_SYSTEM.md#capability-based-access-control)

**Quick Example**:
```javascript
// Register as anonymous (during plugin init)
Actinium.Setting.anonymousGroup.register('app', { id: 'app' });

// Now 'app' settings are publicly readable
```

### Create CMS content
→ [Content System: Create/Update API](../CLAUDE/ACTINIUM_CONTENT_SYSTEM.md#actiniumcontentsaveparams-options)
→ [Content System: Real-World Pattern 1 - Create Blog Post](../CLAUDE/ACTINIUM_CONTENT_SYSTEM.md#pattern-1-create-blog-post)

**Quick Example**:
```javascript
const post = await Actinium.Content.save({
  type: 'blog',
  title: 'Getting Started',
  slug: 'getting-started',
  status: 'PUBLISHED',
  user: req.user.id,
  data: {
    body: '<p>Content here...</p>',
    excerpt: 'Summary'
  }
}, { sessionToken: req.sessionToken });
```

### Query content by type and status
→ [Content System: Query API](../CLAUDE/ACTINIUM_CONTENT_SYSTEM.md#actiniumcontentfindparams-options)
→ [Content System: Pattern 2 - Query with Filters](../CLAUDE/ACTINIUM_CONTENT_SYSTEM.md#pattern-2-query-with-type--status-filter)

**Quick Example**:
```javascript
const { results, count, pages } = await Actinium.Content.find({
  type: 'blog',
  status: 'PUBLISHED',
  limit: 20,
  page: 1
}, { useMasterKey: true });
```

### Soft delete content (recycle bin)
→ [Content System: Soft Delete Workflow](../CLAUDE/ACTINIUM_CONTENT_SYSTEM.md#actiniumcontentdeleteparams-options)
→ [Content System: Pattern 4 - Soft Delete Workflow](../CLAUDE/ACTINIUM_CONTENT_SYSTEM.md#pattern-4-soft-delete-workflow)

### Permanently delete content
→ [Content System: Hard Delete](../CLAUDE/ACTINIUM_CONTENT_SYSTEM.md#actiniumcontentpurgeparams-options)

### Serialize Parse Objects for API responses
→ [Serialization: Overview](../CLAUDE/PARSE_OBJECT_SERIALIZATION.md#api-reference)
→ [Serialization: Pattern 1 - Cloud Function Response](../CLAUDE/PARSE_OBJECT_SERIALIZATION.md#pattern-1-cloud-function-response)

**Quick Example**:
```javascript
Actinium.Cloud.define('MY_PLUGIN', 'get-data', async (req) => {
  const content = await query.include('type').include('user').first();
  return Actinium.Utils.serialize(content);  // Clean JSON response
});
```

### Syndicate content to external sites
→ [Syndicate System: Overview](../CLAUDE/ACTINIUM_SYNDICATE_SYSTEM.md#architecture-overview)
→ [Syndicate System: Client Setup Pattern](../CLAUDE/ACTINIUM_SYNDICATE_SYSTEM.md#pattern-1-initial-client-setup)

### Create syndication client
→ [Syndicate: Create Client](../CLAUDE/ACTINIUM_SYNDICATE_SYSTEM.md#actiniumsyndicateclientcreatereq-options)

**Quick Example**:
```javascript
const { token: refreshToken, objectId } = await Actinium.Cloud.run(
  'syndicate-client-create',
  { client: 'Consumer Site #1' }
);
// Store refreshToken securely on consumer site
```

### Fetch syndicated content from API
→ [Syndicate: Content List](../CLAUDE/ACTINIUM_SYNDICATE_SYSTEM.md#actiniumsyndicatecontentlistreq)
→ [Syndicate: Token Refresh Pattern](../CLAUDE/ACTINIUM_SYNDICATE_SYSTEM.md#pattern-2-token-refresh-workflow)
await Actinium.Setting.set('app', {
    name: 'My App',
    version: '1.0.0',
});

// Client can access without auth
const appSettings = await Actinium.Cloud.run('setting-get', { key: 'app' });
```

### Implement feature flags with settings
→ [Settings System: Example 2 - Feature Flag / Toggle](../CLAUDE/ACTINIUM_SETTINGS_SYSTEM.md#example-2-feature-flag--toggle)

**Quick Example**:
```javascript
const { enabled } = await Actinium.Setting.get('feature.newUI', { enabled: false });

if (enabled) {
    // Show new UI
} else {
    // Show old UI
}
```

### Control access to specific settings
→ [Settings System: Per-Group Capabilities](../CLAUDE/ACTINIUM_SETTINGS_SYSTEM.md#per-group-capabilities)
→ [Settings System: ACL Generation](../CLAUDE/ACTINIUM_SETTINGS_SYSTEM.md#acl-generation)

**Quick Example**:
```javascript
// Grant role access to setting group
await Actinium.Capability.Role.grant('editor', 'setting.theme-set');
await Actinium.Capability.Role.grant('editor', 'setting.theme-get');

// Now 'editor' role can read/write 'theme' settings
```

### Optimize Handle re-renders (select specific state)
→ [Handle System: Selective Re-rendering](../CLAUDE/HANDLE_SYSTEM.md#selective-re-rendering-useselecthandle)
→ [FAQ: useSelectHandle Performance](../FAQ.md#q-when-should-i-use-useselecthandle-instead-of-usesynchandle)

### Debug Handle issues
→ [Handle System: Debugging Handles](../CLAUDE/HANDLE_SYSTEM.md#debugging-handles)
→ [Handle System: Common Gotchas](../CLAUDE/HANDLE_SYSTEM.md#common-gotchas)

### Query database
→ [Actinium: Framework Architecture](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#framework-architecture)
→ [Integration: Data Flow Patterns](../CLAUDE/FRAMEWORK_INTEGRATION.md#data-flow-patterns)

### Validate data before saving
→ [Patterns: Hook-Based Data Validation](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-9-hook-based-data-validation)

### Cache expensive operations
→ [Patterns: Backend Caching Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-15-backend-caching-pattern)

### Paginate large datasets
→ [Pagination Strategies: Overview](../CLAUDE/PAGINATION_STRATEGIES.md#overview)
→ [Pagination: Skip-Based Pattern](../CLAUDE/PAGINATION_STRATEGIES.md#1-skip-based-pagination-framework-default)
→ [Pagination: Performance Comparison](../CLAUDE/PAGINATION_STRATEGIES.md#performance-comparison)

### Implement cursor-based pagination (scalable)
→ [Pagination: Cursor-Based Pattern](../CLAUDE/PAGINATION_STRATEGIES.md#3-cursor-based-pagination-recommended-for-scale)
→ [Pagination: Implementation Pattern Forward](../CLAUDE/PAGINATION_STRATEGIES.md#implementation-pattern-forward-pagination)
→ [Pagination: Best Practices](../CLAUDE/PAGINATION_STRATEGIES.md#best-practices)

### Load all pages of data (batch processing)
→ [Pagination: Load-All Pattern](../CLAUDE/PAGINATION_STRATEGIES.md#2-load-all-pattern-skip-incrementation)
→ [Pagination: Example Search Indexing](../CLAUDE/PAGINATION_STRATEGIES.md#example-3-search-indexing-with-load-all)

### Define a content type (Actinium CMS)
→ [Content Type: Overview](../CLAUDE/CONTENT_TYPE_SYSTEM.md#overview)
→ [Content Type: Create Type](../CLAUDE/CONTENT_TYPE_SYSTEM.md#create-type)
→ [Content Type: Field Configuration](../CLAUDE/CONTENT_TYPE_SYSTEM.md#field-configuration)

### Update content type schema
→ [Content Type: Update Type](../CLAUDE/CONTENT_TYPE_SYSTEM.md#update-type)
→ [Content Type: Schema Management](../CLAUDE/CONTENT_TYPE_SYSTEM.md#schema-management)

### Generate unique UUIDs for content types
→ [Content Type: UUID Generation](../CLAUDE/CONTENT_TYPE_SYSTEM.md#uuid-generation)
→ [Content Type: Namespace Configuration](../CLAUDE/CONTENT_TYPE_SYSTEM.md#namespace-based-uuids)

---

## Authentication & Security

### Implement user login
→ [Integration: Authentication & Session Management](../CLAUDE/FRAMEWORK_INTEGRATION.md#authentication--session-management)

### Check user permissions
→ [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)
→ [Actinium Quick Ref: Capability Checking](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capability-checking)

### Protect routes
→ [Integration: Authentication](../CLAUDE/FRAMEWORK_INTEGRATION.md#authentication--session-management)
→ [Patterns: Conditional Route Registration](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-7-conditional-route-registration)

### Protect Cloud Functions
→ [Actinium Quick Ref: Cloud Function Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#cloud-function-patterns)
→ [Actinium Quick Ref: Capability Checking](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capability-checking)

### Define custom roles
→ [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)

### Set up ACLs for objects (Parse.Object)
→ [Parse ACL Patterns: Overview](../CLAUDE/PARSE_ACL_PATTERNS.md#overview)
→ [Parse ACL Patterns: Core ACL API](../CLAUDE/PARSE_ACL_PATTERNS.md#core-acl-api)

**Quick Example**:
```javascript
const acl = new Parse.ACL();
acl.setPublicReadAccess(true);
acl.setPublicWriteAccess(false);
acl.setWriteAccess(currentUser.id, true);
object.setACL(acl);
```

### Understand ACL vs CLP
→ [Parse ACL Patterns: ACL vs CLP Decision Matrix](../CLAUDE/PARSE_ACL_PATTERNS.md#acl-vs-clp-decision-matrix)

### Generate capability-based ACLs
→ [Parse ACL Patterns: CloudACL Helper Pattern](../CLAUDE/PARSE_ACL_PATTERNS.md#cloudacl-helper-pattern)

**Quick Example**:
```javascript
const acl = await Actinium.Utils.CloudACL(
    [],
    'content.read',   // Any role with this capability gets read access
    'content.write'   // Any role with this capability gets write access
);
object.setACL(acl);
```

### Set object-level permissions (user-owned content)
→ [Parse ACL Patterns: User-Owned Content Pattern](../CLAUDE/PARSE_ACL_PATTERNS.md#1-user-owned-content-author-only)

### Set public read, restricted write
→ [Parse ACL Patterns: Public Read Restricted Write](../CLAUDE/PARSE_ACL_PATTERNS.md#2-public-read-restricted-write)

### Debug permission denied errors
→ [Parse ACL Patterns: Debugging ACL Issues](../CLAUDE/PARSE_ACL_PATTERNS.md#debugging-acl-issues)
→ [Parse ACL Patterns: Common Gotchas](../CLAUDE/PARSE_ACL_PATTERNS.md#common-gotchas)

### Get users and roles for ACL selection
→ [Parse ACL Patterns: AclTargets Helper](../CLAUDE/PARSE_ACL_PATTERNS.md#acltargets-helper)

---

## File Storage

### Set up S3 file storage
→ [FileAdapter System: S3Adapter Plugin](../CLAUDE/FILE_ADAPTER_SYSTEM.md#1-s3adapter-plugin)
→ [FileAdapter System: Production Setup S3](../CLAUDE/FILE_ADAPTER_SYSTEM.md#production-setup-s3)

**Quick Setup**:
```javascript
await Actinium.Setting.set('S3Adapter', {
    accessKey: process.env.AWS_ACCESS_KEY,
    secretKey: process.env.AWS_SECRET_KEY,
    bucket: 'my-app-files',
    region: 'us-west-2',
    directAccess: true,
    baseUrl: 'https://cdn.myapp.com'
});

await Actinium.Plugin.activate('S3Adapter');
```

### Switch file storage backend
→ [FileAdapter System: Overview](../CLAUDE/FILE_ADAPTER_SYSTEM.md#overview)
→ [FileAdapter System: Adapter Lifecycle](../CLAUDE/FILE_ADAPTER_SYSTEM.md#adapter-lifecycle)

### Use local file storage (development)
→ [FileAdapter System: FSFilesAdapter Plugin](../CLAUDE/FILE_ADAPTER_SYSTEM.md#2-fsfilesadapter-plugin)
→ [FileAdapter System: Development Setup](../CLAUDE/FILE_ADAPTER_SYSTEM.md#development-setup)

### Integrate CDN for file delivery
→ [FileAdapter System: CDN Integration](../CLAUDE/FILE_ADAPTER_SYSTEM.md#1-cdn-integration)

### Set up private file access (require authentication)
→ [FileAdapter System: Private File Access](../CLAUDE/FILE_ADAPTER_SYSTEM.md#2-private-file-access)

### Configure file upload size limits
→ [FileAdapter System: Environment Configuration](../CLAUDE/FILE_ADAPTER_SYSTEM.md#key-environment-variables)

**Quick Config**:
```javascript
ENV.MAX_UPLOAD_SIZE = 20 * 1024 * 1024;  // 20MB
```

### Debug file upload issues
→ [FileAdapter System: Debugging File Storage Issues](../CLAUDE/FILE_ADAPTER_SYSTEM.md#debugging-file-storage-issues)
→ [FileAdapter System: Common Gotchas](../CLAUDE/FILE_ADAPTER_SYSTEM.md#common-gotchas)

### Create custom file adapter
→ [FileAdapter System: Registering Custom Adapters](../CLAUDE/FILE_ADAPTER_SYSTEM.md#registering-custom-adapters)
→ [FileAdapter System: FilesAdapter.register() API](../CLAUDE/FILE_ADAPTER_SYSTEM.md#filesadapterregister-api)

---

## Real-Time Features

### Set up WebSocket communication (Socket.io)
→ [Actinium IO System: Architecture](../CLAUDE/ACTINIUM_IO_SYSTEM.md#architecture-overview)
→ [Actinium IO: Server Configuration](../CLAUDE/ACTINIUM_IO_SYSTEM.md#socketio-server-configuration)
→ [Actinium IO: Browser Integration](../CLAUDE/ACTINIUM_IO_SYSTEM.md#browser-side-integration)

**Quick Start (Server)**:
```javascript
// Configure CORS/auth in plugin
Actinium.Hook.register('io.config', (socketConfig) => {
    socketConfig.cors = { origin: process.env.ALLOWED_ORIGINS.split(',') };
});
```

**Quick Start (Browser)**:
```javascript
// Connect after auth
const { api: Actinium } = await import('@atomic-reactor/reactium-api');
Actinium.IO.auth = { token: Reactium.User.getSessionToken() };
Actinium.IO.connect();
Actinium.IO.on('content-update', (data) => console.log(data));
```

### Broadcast events to all connected clients
→ [Actinium IO: Pattern 1 - Broadcast to All](../CLAUDE/ACTINIUM_IO_SYSTEM.md#pattern-1-broadcast-to-all-clients)

### Send events to specific users/rooms
→ [Actinium IO: Pattern 2 - Room-Based Broadcasting](../CLAUDE/ACTINIUM_IO_SYSTEM.md#pattern-2-room-based-broadcasting)
→ [Actinium IO: Pattern 3 - Client-Specific Targeting](../CLAUDE/ACTINIUM_IO_SYSTEM.md#pattern-3-client-specific-targeting)

### Authenticate WebSocket connections
→ [Actinium IO: Authentication Middleware](../CLAUDE/ACTINIUM_IO_SYSTEM.md#authentication-middleware)

### Track online users (presence)
→ [Actinium IO: Presence Tracking](../CLAUDE/ACTINIUM_IO_SYSTEM.md#presence-tracking)

### Subscribe to database changes (Live Query)
→ [Integration: Real-Time Communication](../CLAUDE/FRAMEWORK_INTEGRATION.md#real-time-communication)

### Configure Live Query
→ [Integration: Real-Time Communication](../CLAUDE/FRAMEWORK_INTEGRATION.md#real-time-communication)

---

## UI & Zones

### Use fullscreen mode
→ [Reactium: The Reactium SDK](../CLAUDE/REACTIUM_FRAMEWORK.md#the-reactium-sdk)

### Check window size or breakpoint
→ [Window/Breakpoint: useWindowSize Hook](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#usewindowsize---reactive-window-size-with-breakpoint)

**Quick Example**:
```javascript
import { useWindowSize } from '@atomic-reactor/reactium-core/sdk';

const { width, height, breakpoint } = useWindowSize();
// breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
```

### Render different components for mobile vs desktop
→ [Window/Breakpoint: Pattern 1 - Responsive Rendering](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#pattern-1-responsive-component-rendering)

**Quick Example**:
```javascript
const { breakpoint } = useWindowSize();
return ['xs', 'sm'].includes(breakpoint) ? <MobileView /> : <DesktopView />;
```

### Access window/document safely (SSR-compatible)
→ [Window/Breakpoint: SSR-Safe Access](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#ssr-safe-windowdocument-access)
→ [Window/Breakpoint: useWindow Hook](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#usewindow---context-aware-window-access)

**Quick Example**:
```javascript
import { conditionalWindow, isWindow } from '@atomic-reactor/reactium-core/sdk';

const window = conditionalWindow();
if (isWindow(window)) {
    window.gtag('event', 'page_view');
}
```

### Detect Electron environment
→ [Window/Breakpoint: Electron Detection](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#electron-detection)

### Customize breakpoint thresholds
→ [Window/Breakpoint: Runtime Breakpoint Access](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#runtime-breakpoint-access)

**Quick Example**:
```javascript
// Override globally
window.breakpoints = {
    xs: 600,
    sm: 900,
    md: 1200,
    lg: 1400,
    xl: 1800,
};
```

### Debounce resize events for performance
→ [Window/Breakpoint: useWindowSize Parameters](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#usewindowsize---reactive-window-size-with-breakpoint)

**Quick Example**:
```javascript
const { breakpoint } = useWindowSize({ delay: 300 }); // 300ms debounce
```

### Add component to zone
→ [Zone System Quick Ref: Component Registration](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#component-registration)
→ [Zone System Deep Dive](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md)

### Filter zone components
→ [Zone System Quick Ref: Filters](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#filters)
→ [Zone System Deep Dive: Filters](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md#filters-mappers-and-sorters)

### Transform zone components
→ [Zone System Quick Ref: Mappers](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#mappers)

### Control render order
→ [Zone System Quick Ref: Sorters](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#sorters)

### Create dynamic UI
→ [Zone System Deep Dive](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md)
→ [Patterns: Component Registry Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-6-component-registry-pattern)

### Add independent React app to page
→ [Component Binding: Overview](../CLAUDE/COMPONENT_BINDING_SYSTEM.md#overview)
→ [Component Binding: Adding Custom Bind Points](../CLAUDE/COMPONENT_BINDING_SYSTEM.md#adding-custom-bind-points)
→ [Component Binding: Real-World Use Cases](../CLAUDE/COMPONENT_BINDING_SYSTEM.md#real-world-use-cases)

### Add dev tools outside main app
→ [Component Binding: Development Tools](../CLAUDE/COMPONENT_BINDING_SYSTEM.md#1-development-tools)

### Add admin toolbar
→ [Component Binding: Admin Toolbars](../CLAUDE/COMPONENT_BINDING_SYSTEM.md#2-admin-toolbars)

### Embed widget on marketing page
→ [Component Binding: Multi-App Portals](../CLAUDE/COMPONENT_BINDING_SYSTEM.md#3-multi-app-portals)

### Replace a core component
→ [hookableComponent: Component Replacement Strategy](../CLAUDE/HOOKABLE_COMPONENT.md#component-replacement-strategy)
→ [hookableComponent: Real-World Use Cases](../CLAUDE/HOOKABLE_COMPONENT.md#real-world-use-cases)

### Replace the NotFound component
→ [hookableComponent: Replacing Core Components](../CLAUDE/HOOKABLE_COMPONENT.md#replacing-core-components)
→ [hookableComponent: Use Case - Custom 404](../CLAUDE/HOOKABLE_COMPONENT.md#2-custom-404-pages-replace-notfound)

### Create a themeable app
→ [hookableComponent: Use Case - Theming](../CLAUDE/HOOKABLE_COMPONENT.md#1-theming-replace-appparent)
→ [AppContext: Material-UI Theme](../CLAUDE/APPCONTEXT_PROVIDER_SYSTEM.md#3-material-ui-theme)

### Implement A/B testing
→ [hookableComponent: Use Case - A/B Testing](../CLAUDE/HOOKABLE_COMPONENT.md#3-ab-testing-replace-components-conditionally)

### Use feature flags
→ [hookableComponent: Use Case - Feature Flags](../CLAUDE/HOOKABLE_COMPONENT.md#4-feature-flags-conditional-components)

### Register a replaceable component
→ [hookableComponent: Registration Pattern](../CLAUDE/HOOKABLE_COMPONENT.md#registration-pattern)
→ [hookableComponent: Plugin Registration](../CLAUDE/HOOKABLE_COMPONENT.md#plugin-registration)

---

## Hooks & Events

### Register a hook
→ [Reactium: Hook Registration](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-registration)
→ [Actinium Quick Ref: Hook Registration Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#hook-registration-patterns)

### Listen for events
→ [Reactium: Pulse - Pub/Sub Events](../CLAUDE/REACTIUM_FRAMEWORK.md#4-pulse-pubsub-events)

### Hook into lifecycle
→ [Actinium Quick Ref: Common Lifecycle Hooks](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#common-lifecycle-hooks)
→ [Reactium: Common Framework Hooks](../CLAUDE/REACTIUM_FRAMEWORK.md#common-framework-hooks)

### Manage hook domains
→ [Hook Domains Deep Dive](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md#what-are-hook-domains)
→ [Hook Domains: When to Use](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md#when-should-developers-use-domains)
→ [Hook Domains: Best Practices](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md#best-practices)

### Clean up plugin hooks
→ [Hook Domains: Plugin Lifecycle Management](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md#use-case-1-plugin-lifecycle-management-primary-use-case)
→ [Hook Domains: Complete Plugin Teardown](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md#complete-plugin-teardown-example)

### Control execution order
→ [Actinium Quick Ref: Priority Constants](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#priority-constants)
→ [Gotchas: Priority Numbers](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-6-priority-numbers-are-counterintuitive)

---

## Build & Deploy

### Run development server
→ [Integration: Development Workflow](../CLAUDE/FRAMEWORK_INTEGRATION.md#development-workflow)

### Build for production
→ [Reactium: Build System](../CLAUDE/REACTIUM_FRAMEWORK.md#build-system)
→ [Integration: Deployment](../CLAUDE/FRAMEWORK_INTEGRATION.md#deployment)

### Deploy to production
→ [Integration: Deployment](../CLAUDE/FRAMEWORK_INTEGRATION.md#deployment)

### Configure environment
→ [Environment Configuration System](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#architecture-overview)
→ [Integration: Development Workflow](../CLAUDE/FRAMEWORK_INTEGRATION.md#development-workflow)

### Set up multi-environment deployment
→ [Environment Config: Multi-Environment Workflow](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#multi-environment-workflow)
→ [Environment Config: Real-World Examples](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#real-world-configuration-examples)

### Configure MongoDB connection
→ [Environment Config: DATABASE_URI](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#environment--parse-server-mapping)
→ [Environment Config: Production Example](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#production-envprodjson)

### Configure environment-specific PORT
→ [Environment Config: PORT Resolution](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#complex-fallback-chain-with-port_var-indirection)
→ [Environment Config: PORT_VAR for Cloud Platforms](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#with-port_var-cloud-platform-mode)

### Set up TLS/HTTPS
→ [Environment Config: TLS Configuration](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#file-based-certificate-loading)
→ [Environment Config: Server Creation with TLS](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#server-creation-with-tls)

### Configure Parse Dashboard authentication
→ [Environment Config: Parse Dashboard Users](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#parse-dashboard-user-authentication)

### Secure master key access
→ [Environment Config: Master Key IP Whitelisting](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#master-key-ip-whitelisting)
→ [Environment Config: Security Best Practices](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#best-practices)

### Add basic authentication to frontend
→ [Server Routing: Basic Authentication](../CLAUDE/SERVER_ROUTING.md#basic-authentication)
→ [Server Routing: Configuration](../CLAUDE/SERVER_ROUTING.md#configuration)

**Quick Start**:
```bash
# Create .htpasswd file
htpasswd -c .htpasswd username

# Set environment variable
BASIC_AUTH_FILE=.htpasswd npm run local
```

### Add custom HTTP headers
→ [Server Routing: Custom Response Headers](../CLAUDE/SERVER_ROUTING.md#custom-response-headers)
→ [Server Routing: Real-World Examples](../CLAUDE/SERVER_ROUTING.md#real-world-examples)

**Quick Start**:
```javascript
ReactiumBoot.Hook.registerSync('Server.ResponseHeaders', (responseHeaders) => {
    responseHeaders['X-Frame-Options'] = 'SAMEORIGIN';
    responseHeaders['Cache-Control'] = 'public, max-age=3600';
});
```

### Configure health check endpoint
→ [Server Routing: Health Check Endpoint](../CLAUDE/SERVER_ROUTING.md#health-check-endpoint)
→ [Server Routing: Real-World Patterns](../CLAUDE/SERVER_ROUTING.md#real-world-patterns)

### Handle 404 errors correctly
→ [Server Routing: 404 Detection](../CLAUDE/SERVER_ROUTING.md#404-detection)
→ [Server Routing: Status Code Handling](../CLAUDE/SERVER_ROUTING.md#status-code-handling)

### Deploy with Docker
→ [Environment Config: Docker Deployment Patterns](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#dockercontainer-deployment-patterns)

### Override env vars at runtime
→ [Environment Config: Merge Strategy](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#file--processenv-overlay)

### Debug environment configuration
→ [Environment Config: Debugging](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#debugging-environment-configuration)
→ [Environment Config: Common Gotchas](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#common-gotchas)

### Build a UMD library
→ [UMD Library System: Custom UMD Library Creation](../CLAUDE/UMD_LIBRARY_SYSTEM.md#custom-umd-library-creation)

### Externalize dependencies to reduce bundle size
→ [UMD Library System: Default Library Externals](../CLAUDE/UMD_LIBRARY_SYSTEM.md#default-library-externals)

### Load a library at runtime
→ [UMD Library System: Runtime Loading Patterns](../CLAUDE/UMD_LIBRARY_SYSTEM.md#runtime-loading-patterns)

### Create a service worker UMD library
→ [UMD Library System: Service Worker Pattern](../CLAUDE/UMD_LIBRARY_SYSTEM.md#service-worker-pattern)

### Customize webpack
→ [ReactiumWebpack SDK](../CLAUDE/REACTIUM_WEBPACK.md)
→ [ReactiumWebpack: Migration Guide](../CLAUDE/REACTIUM_WEBPACK.md#migration-from-webpackoverridejs)
→ [ReactiumWebpack: Common Customizations](../CLAUDE/REACTIUM_WEBPACK.md#common-webpack-customizations)

### Add webpack loader
→ [ReactiumWebpack: Adding Custom Loader](../CLAUDE/REACTIUM_WEBPACK.md#adding-a-custom-loader)
→ [ReactiumWebpack: addRule Method](../CLAUDE/REACTIUM_WEBPACK.md#addruleid-rule-order)

### Add webpack plugin
→ [ReactiumWebpack: addPlugin Method](../CLAUDE/REACTIUM_WEBPACK.md#addpluginid-plugin)
→ [ReactiumWebpack: Environment-Specific Plugins](../CLAUDE/REACTIUM_WEBPACK.md#environment-specific-plugins)

### Configure code splitting
→ [ReactiumWebpack: Optimization Methods](../CLAUDE/REACTIUM_WEBPACK.md#optimization-methods)
→ [ReactiumWebpack: setCodeSplittingOptimize](../CLAUDE/REACTIUM_WEBPACK.md#setcodesplittingoptimizeenv)

### Add resolve aliases
→ [ReactiumWebpack: addResolveAlias](../CLAUDE/REACTIUM_WEBPACK.md#addresolvealiasid-alias)

### Transpile node_modules packages
→ [ReactiumWebpack: addTranspiledDependency](../CLAUDE/REACTIUM_WEBPACK.md#addtranspileddependencymodule)

### Regenerate manifest
→ [Reactium: Manifest System](../CLAUDE/REACTIUM_FRAMEWORK.md#manifest-regeneration)
→ [Gotchas: The Manifest is Sacred](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-1-the-manifest-is-sacred)

---

## Debug & Fix

### Debug errors
→ [Gotchas: Debugging Strategies](../CLAUDE/FRAMEWORK_GOTCHAS.md#debugging-strategies)

### Check known issues
→ [Known Issues](../CLAUDE/KNOWN_ISSUES.md)

### Fix CORS errors
→ [Gotchas: CORS Errors](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-22-cors-errors)

### Fix manifest issues
→ [Gotchas: The Manifest is Sacred](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-1-the-manifest-is-sacred)

### Fix component not rendering
→ [Gotchas: Component Registration Timing](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-9-component-registration-timing)

### Fix route not working
→ [Routing System: Common Gotchas](../CLAUDE/ROUTING_SYSTEM.md#common-gotchas)
→ [Gotchas: Route Path Syntax](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-4-route-path-syntax-matters)

### Fix hook not firing
→ [Gotchas: Hook Registration Must Be in IIFE](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-3-hook-registration-must-be-in-iife)

### Fix ES module errors
→ [Gotchas: ES Module Syntax Required](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-11-es-module-syntax-required)

### Fix session/auth issues
→ [Gotchas: Session Tokens](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-23-session-tokens-and-authentication)

### Fix build errors
→ [Gotchas: Build System](../CLAUDE/FRAMEWORK_GOTCHAS.md#build-system-gotchas)

### Fix performance issues
→ [Patterns: Performance Patterns](../CLAUDE/FRAMEWORK_PATTERNS.md#performance-patterns)

---

## Optimize

### Improve performance
→ [Patterns: Performance Patterns](../CLAUDE/FRAMEWORK_PATTERNS.md#performance-patterns)

### Reduce bundle size
→ [Routing System: Code Splitting Patterns](../CLAUDE/ROUTING_SYSTEM.md#code-splitting-patterns)
→ [Patterns: Code Splitting with Dynamic Imports](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-17-code-splitting-with-dynamic-imports)

### Optimize queries
→ [Patterns: Pagination Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-19-pagination-pattern)

### Debounce API calls
→ [Patterns: Debounced Parse Queries](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-18-debounced-parse-queries)

### Cache data
→ [Patterns: Backend Caching Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-15-backend-caching-pattern)

---

## Learn

### Understand architecture
→ [Reactium: Core Architecture](../CLAUDE/REACTIUM_FRAMEWORK.md#core-architecture)
→ [Actinium: Framework Architecture](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#framework-architecture)

### Understand hooks
→ [Reactium: Hook System](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-system)
→ [Actinium: Hook System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#hook-system)
→ [Hook Domains Deep Dive](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md)

### Understand zones
→ [Zone System Deep Dive](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md)
→ [Zone System Quick Reference](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md)

### Understand capabilities
→ [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)

### Understand integration
→ [Framework Integration](../CLAUDE/FRAMEWORK_INTEGRATION.md)

### Best practices
→ [Framework Patterns](../CLAUDE/FRAMEWORK_PATTERNS.md)

### Common mistakes
→ [Framework Gotchas](../CLAUDE/FRAMEWORK_GOTCHAS.md)

---

**Usage**: Think "I need to [task]" → Find task above → Click link → Read implementation
**Coverage**: 60+ common developer tasks organized by category
