<!-- v1.20.0 -->
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
→ [Actinium: Plugin System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#plugin-system)
→ [Actinium Quick Ref: Essential Plugin Structure](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#essential-plugin-structure)
→ [Patterns: Plugin SDK Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-8-plugin-sdk-pattern-server-side)

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

### Set up ACLs
→ [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)

---

## Real-Time Features

### Set up real-time updates
→ [Integration: Real-Time Communication](../CLAUDE/FRAMEWORK_INTEGRATION.md#real-time-communication)

### Subscribe to database changes
→ [Integration: Real-Time Communication](../CLAUDE/FRAMEWORK_INTEGRATION.md#real-time-communication)

### Configure Live Query
→ [Integration: Real-Time Communication](../CLAUDE/FRAMEWORK_INTEGRATION.md#real-time-communication)

---

## UI & Zones

### Use fullscreen mode
→ [Reactium: The Reactium SDK](../CLAUDE/REACTIUM_FRAMEWORK.md#the-reactium-sdk)

### Check window size or breakpoint
→ [Reactium: The Reactium SDK](../CLAUDE/REACTIUM_FRAMEWORK.md#the-reactium-sdk)

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

### Deploy with Docker
→ [Environment Config: Docker Deployment Patterns](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#dockercontainer-deployment-patterns)

### Override env vars at runtime
→ [Environment Config: Merge Strategy](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#file--processenv-overlay)

### Debug environment configuration
→ [Environment Config: Debugging](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#debugging-environment-configuration)
→ [Environment Config: Common Gotchas](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#common-gotchas)

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
