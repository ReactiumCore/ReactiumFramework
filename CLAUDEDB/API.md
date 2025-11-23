<!-- v1.0.0 -->
# CLAUDEDB - API Quick Reference

**Purpose**: Common functions/hooks with signatures + direct links
**Rule**: Function signature + link to documentation

---

## Reactium API

### Component Registration

```javascript
Reactium.Component.register(name, component)
```
→ [Reactium: Component Registration](../CLAUDE/REACTIUM_FRAMEWORK.md#component-registration)

```javascript
Reactium.Component.get(name)
```
→ [Reactium: Component Registration](../CLAUDE/REACTIUM_FRAMEWORK.md#component-registration)

```javascript
useHookComponent(name)
```
→ [Reactium: Hookable Components](../CLAUDE/REACTIUM_FRAMEWORK.md#hookable-components)

### State Management

```javascript
useSyncState(initialState)
// Returns: { get(key), set(key, value) | set(object) }
```
→ [Reactium: useSyncState](../CLAUDE/REACTIUM_FRAMEWORK.md#1-local-component-state-usesyncstate)
→ [Gotchas: useSyncState Is Not useState](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-2-usesyncstate-is-not-usestate)

```javascript
Reactium.State.get(key)
Reactium.State.set(key, value)
useGlobalState(key)
```
→ [Reactium: Global State](../CLAUDE/REACTIUM_FRAMEWORK.md#2-global-state-reactiumstate)

```javascript
new Handle(id, initialState)
Handle.register(id, handle)
Handle.get(id)
useHandle(id)  // No subscription
useSyncHandle(id)  // With subscription
```
→ [Reactium: Handles](../CLAUDE/REACTIUM_FRAMEWORK.md#3-handles-shared-observable-state)
→ [Gotchas: useHandle vs useSyncHandle](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-11-usehandle-vs-usesynchandle)

```javascript
Reactium.Pulse.on(event, callback)
Reactium.Pulse.emit(event, data)
Reactium.Pulse.off(event, callback)
```
→ [Reactium: Pulse](../CLAUDE/REACTIUM_FRAMEWORK.md#4-pulse-pubsub-events)

### Hooks

```javascript
Reactium.Hook.register(
    name,           // string
    callback,       // async function
    priority,       // number (default: Enums.priority.neutral)
    id,             // string (optional, auto-generated)
    domain          // string (default: 'default')
)
// Returns: hookId (string)
```
→ [Reactium: Hook Registration](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-registration)
→ [Hook Domains Deep Dive](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md)

```javascript
Reactium.Hook.registerSync(name, callback, priority, id, domain)
```
→ [Reactium: Hook Registration](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-registration)

```javascript
await Reactium.Hook.run(name, ...args)
// Returns: context object
```
→ [Reactium: Hook Execution](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-execution)

```javascript
Reactium.Hook.runSync(name, ...args)
```
→ [Reactium: Hook Execution](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-execution)

```javascript
Reactium.Hook.unregister(hookId)
// Unregister single hook by ID

Reactium.Hook.unregisterDomain(hookName, domain)
// Unregister all hooks in domain for specific hook name

Reactium.Hook.flush(hookName, type = 'async')
// Remove ALL hooks for a hook name (use sparingly)
```
→ [Hook Domains Deep Dive: API Reference](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md#api-reference-summary)

### Routing

```javascript
// Route object specification
{
    id: 'unique-route-id',
    path: '/path/:param',
    exact: true,
    component: MyComponent,
    order: Enums.priority.neutral,
    loadState: async ({ route, params, search }) => ({ data }),
    handleId: 'MyHandleId',
    persistHandle: false,
    transitions: true,
    transitionStates: [
        { state: 'EXITING', active: 'previous' },
        { state: 'LOADING', active: 'current' },
        { state: 'ENTERING', active: 'current' },
        { state: 'READY', active: 'current' }
    ]
}
```
→ [Reactium: Route Object Specification](../CLAUDE/REACTIUM_FRAMEWORK.md#route-object-specification)
→ [Routing System: Overview](../CLAUDE/ROUTING_SYSTEM.md#overview)

```javascript
await Reactium.Routing.register(routeObject, update = true)
// Returns: routeId (string)
```
→ [Routing System: Route Registration Method](../CLAUDE/ROUTING_SYSTEM.md#4-route-registration-method)

```javascript
Reactium.Routing.unregister(routeId, update = true)
```
→ [Routing System: Advanced Features](../CLAUDE/ROUTING_SYSTEM.md#route-unregistration)

```javascript
// Transition state management
Reactium.Routing.nextState()
Reactium.Routing.jumpCurrent()
```
→ [Routing System: Advancing States](../CLAUDE/ROUTING_SYSTEM.md#advancing-states)

```javascript
// Access routing state
const routing = useRouting()
// Returns: {
//   current: currentRoute,
//   previous: previousRoute,
//   active: activeRoute,
//   transitionState: 'EXITING' | 'LOADING' | 'ENTERING' | 'READY',
//   transitionStates: [],
//   changes: {}
// }
```
→ [Routing System: Listening to Transitions](../CLAUDE/ROUTING_SYSTEM.md#listening-to-transitions)

```javascript
// Data loading pattern
Component.loadState = async ({ route, params, search }) => {
    return { data, loading: false };
}
Component.handleId = 'HandleId';
```
→ [Routing System: loadState Pattern](../CLAUDE/ROUTING_SYSTEM.md#loadstate-pattern-data-preloading)

### Zone System

```javascript
<Zone zone="zone-name" prop1={value} />
```
→ [Zone System Quick Ref](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#zone-component)

```javascript
Reactium.Zone.addComponent({
    id: 'COMPONENT-ID',
    zone: 'zone-name' | ['zone1', 'zone2'],
    component: MyComponent | 'ComponentName',
    order: 100,
    ...additionalProps
})
```
→ [Zone System Quick Ref: Component Registration](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#component-registration)

```javascript
Reactium.Zone.updateComponent(id, updates)
Reactium.Zone.removeComponent(id)
```
→ [Zone System Quick Ref: Component Registration](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#component-registration)

```javascript
Reactium.Zone.addFilter(
    zoneName,
    filterFunction,  // (component) => boolean
    priority
)
// Returns: filterId
```
→ [Zone System Quick Ref: Filters](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#filters)

```javascript
Reactium.Zone.addMapper(
    zoneName,
    mapperFunction,  // (component) => transformedComponent
    priority
)
// Returns: mapperId
```
→ [Zone System Quick Ref: Mappers](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#mappers)

```javascript
Reactium.Zone.addSort(
    zoneName,
    propertyName,  // default: 'order'
    reverse,       // default: false
    priority
)
// Returns: sortId
```
→ [Zone System Quick Ref: Sorters](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#sorters)

```javascript
Reactium.Zone.getZoneComponents(zoneName, raw = false)
Reactium.Zone.getZoneComponent(zoneName, componentId)
Reactium.Zone.hasZoneComponent(zoneName, componentId)
```
→ [Zone System Quick Ref: Query Functions](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#query-functions)

```javascript
const unsubscribe = Reactium.Zone.subscribe(zoneName, callback)
useZoneComponents(zoneName, dereference = true)
```
→ [Zone System Quick Ref: Subscription](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#subscription)

### Priority Constants

```javascript
Reactium.Enums.priority.core      // -2000 (runs first)
Reactium.Enums.priority.highest   // -1000
Reactium.Enums.priority.high      // -500
Reactium.Enums.priority.neutral   // 0 (default)
Reactium.Enums.priority.low       // 500
Reactium.Enums.priority.lowest    // 1000 (runs last)
```
→ [Actinium Quick Ref: Priority Constants](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#priority-constants)
→ [Gotchas: Priority Numbers Are Counterintuitive](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-6-priority-numbers-are-counterintuitive)

**Note**: `Enums.priority.normal` does NOT exist (common bug)
→ [Gotchas: Enums.priority.normal Does Not Exist](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-5-enumsprioritynormal-does-not-exist-critical-bug)

---

## ReactiumWebpack SDK

### Webpack Configuration

```javascript
const sdk = new WebpackSDK(name, dddFilename, context)
// name: 'reactium'
// dddFilename: 'reactium-webpack.js'
// context: config object from webpack.config.js
```
→ [ReactiumWebpack: WebpackSDK Class](../CLAUDE/REACTIUM_WEBPACK.md#webpacksdk-class)

### Core Methods

```javascript
// Add module rule (loader)
sdk.addRule(id, rule, order?)
// Example: sdk.addRule('sass-loader', { test: /\.scss$/, use: ['sass-loader'] }, 100)
```
→ [ReactiumWebpack: addRule](../CLAUDE/REACTIUM_WEBPACK.md#addruleid-rule-order)

```javascript
// Add webpack plugin
sdk.addPlugin(id, pluginInstance)
// Example: sdk.addPlugin('compression', new CompressionPlugin())
```
→ [ReactiumWebpack: addPlugin](../CLAUDE/REACTIUM_WEBPACK.md#addpluginid-plugin)

```javascript
// Ignore files
sdk.addIgnore(id, resourceRegExp, contextRegExp?)
// Example: sdk.addIgnore('test-files', /\.test\.js$/)
```
→ [ReactiumWebpack: addIgnore](../CLAUDE/REACTIUM_WEBPACK.md#addignoreid-resourceregexp-contextregexp)

```javascript
// Add module alias
sdk.addResolveAlias(id, path)
// Example: sdk.addResolveAlias('components', './src/app/components')
```
→ [ReactiumWebpack: addResolveAlias](../CLAUDE/REACTIUM_WEBPACK.md#addresolvealiasid-alias)

```javascript
// Add external dependency
sdk.addExternal(id, config)
// Example: sdk.addExternal('react', { key: 'react', value: 'React' })
```
→ [ReactiumWebpack: addExternal](../CLAUDE/REACTIUM_WEBPACK.md#addexternalid-config)

```javascript
// Transpile node_modules package
sdk.addTranspiledDependency(moduleName)
// Example: sdk.addTranspiledDependency('my-es6-package')
```
→ [ReactiumWebpack: addTranspiledDependency](../CLAUDE/REACTIUM_WEBPACK.md#addtranspileddependencymodule)

```javascript
// Add context replacement
sdk.addContext(id, { from: RegExp, to: string })
// Example: sdk.addContext('translations', { from: /translations$/, to: './src/translations' })
```
→ [ReactiumWebpack: addContext](../CLAUDE/REACTIUM_WEBPACK.md#addcontextid-context)

### Optimization Methods

```javascript
// Enable aggressive code splitting
sdk.setCodeSplittingOptimize(env)

// Use webpack default optimization
sdk.setWebpackDefaultOptimize(env)

// Disable code splitting (single bundle)
sdk.setNoCodeSplitting(env)
```
→ [ReactiumWebpack: Optimization Methods](../CLAUDE/REACTIUM_WEBPACK.md#optimization-methods)

### Properties

```javascript
sdk.mode = 'development' | 'production' | 'none'
sdk.entry = { main: './src/index.js' }
sdk.target = 'web' | 'node'
sdk.output = { path, publicPath, filename }
sdk.devtool = 'source-map' | false
sdk.optimization = { minimize, splitChunks }
sdk.extensions = ['.js', '.jsx', '.json']
sdk.overrides = { /* direct webpack config */ }
```
→ [ReactiumWebpack: Properties](../CLAUDE/REACTIUM_WEBPACK.md#properties-getterssetters)

### Webpack Hooks

```javascript
// Modify SDK before config generation
Hook.registerSync('before-config', (sdk) => {
    sdk.addRule('my-loader', rule);
}, 'my-plugin-id');

// Modify final config after generation
Hook.registerSync('after-config', (config, sdk) => {
    config.resolve.fallback = { /* ... */ };
}, 'my-plugin-id');

// Modify registries
Hook.registerSync('rules', (rulesRegistry, name, context) => {
    // Inspect or modify rules
}, 'my-plugin-id');

Hook.registerSync('plugins', (pluginsRegistry, name, context) => {
    // Inspect or modify plugins
}, 'my-plugin-id');
```
→ [ReactiumWebpack: Hook System Integration](../CLAUDE/REACTIUM_WEBPACK.md#hook-system-integration)

### DDD Pattern

```javascript
// File: src/my-feature/reactium-webpack.js
const { Hook } = require('@atomic-reactor/reactium-sdk-core/core');

Hook.registerSync('before-config', sdk => {
    sdk.addRule('my-rule', { /* ... */ });
}, 'my-feature-webpack');
```
→ [ReactiumWebpack: DDD Discovery Pattern](../CLAUDE/REACTIUM_WEBPACK.md#reactium-webpackjs)

---

## Actinium API

### Plugin Registration

```javascript
// info.js
const PLUGIN = {
    ID: 'PluginId',
    name: 'Plugin Name',
    description: 'Description',
    version: '1.0.0',
    order: 100
};
export default PLUGIN;
```
→ [Actinium Quick Ref: Essential Plugin Structure](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#essential-plugin-structure)

```javascript
// plugin.js
const MOD = () => {
    Actinium.Plugin.register(PLUGIN, active);
};
export default MOD();  // Must call immediately
```
→ [Actinium: Plugin Registration](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#plugin-registration)
→ [Gotchas: Plugin Function Must Execute](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-13-plugin-function-must-execute)

### Hooks

```javascript
Actinium.Hook.register(
    name,           // string
    callback,       // async function
    priority,       // number (default: Enums.priority.neutral)
    id              // string (optional)
)
```
→ [Actinium Quick Ref: Hook Registration Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#hook-registration-patterns)

```javascript
Actinium.Hook.registerSync(name, callback, priority, id)
```
→ [Actinium Quick Ref: Hook Registration Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#hook-registration-patterns)

```javascript
await Actinium.Hook.run(name, ...args)
Actinium.Hook.runSync(name, ...args)
```
→ [Actinium Quick Ref: Hook Registration Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#hook-registration-patterns)

### Common Lifecycle Hooks

```javascript
Actinium.Hook.register('init', async (app, options) => {})
Actinium.Hook.register('start', async () => {})
Actinium.Hook.register('running', async () => {})
```
→ [Actinium Quick Ref: Common Lifecycle Hooks](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#common-lifecycle-hooks)

```javascript
Actinium.Hook.register('install', async (plugin, req) => {})
Actinium.Hook.register('activate', async (plugin, req) => {})
Actinium.Hook.register('schema', async (plugin, req) => {})
Actinium.Hook.register('update', async (plugin, req, oldPlugin) => {})
```
→ [Actinium Quick Ref: Common Lifecycle Hooks](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#common-lifecycle-hooks)

```javascript
Actinium.Hook.register('beforeSave', async (req) => {})
Actinium.Hook.register('beforeSave_Collection', async (req) => {})
Actinium.Hook.register('afterSave_Collection', async (req) => {})
```
→ [Actinium Quick Ref: Common Lifecycle Hooks](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#common-lifecycle-hooks)

### Cloud Functions

```javascript
Actinium.Cloud.define(
    PLUGIN.ID,      // Plugin ID (enables plugin gating)
    'functionName', // Function name
    async (req) => {
        const { param1, param2 } = req.params;
        const user = req.user;
        const master = req.master;

        return result;
    }
)
```
→ [Actinium Quick Ref: Cloud Function Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#cloud-function-patterns)
→ [Actinium: Cloud Functions](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#cloud-functions)

```javascript
// Frontend call
const result = await Parse.Cloud.run('functionName', { param1, param2 });
```
→ [Integration: Cloud Function Integration](../CLAUDE/FRAMEWORK_INTEGRATION.md#cloud-function-integration)

### Capability Checking

```javascript
const { CloudHasCapabilities } = Actinium.Utils;

// Single capability
if (!CloudHasCapabilities(req, 'feature.use')) {
    throw new Error('Permission denied');
}

// Multiple (strict - ALL required)
if (!CloudHasCapabilities(req, ['admin.users', 'admin.roles'], true)) {
    throw new Error('Requires both capabilities');
}

// Multiple (permissive - ANY required)
if (!CloudHasCapabilities(req, ['content.edit', 'content.review'], false)) {
    throw new Error('Requires edit or review');
}
```
→ [Actinium Quick Ref: Capability Checking](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capability-checking)

```javascript
const options = Actinium.Utils.CloudCapOptions(
    req,
    ['admin.capability'],  // Capabilities that grant master key
    false                   // strict mode
);
// Returns: { useMasterKey: true/false, sessionToken }
```
→ [Actinium Quick Ref: Capability Checking](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capability-checking)

```javascript
Actinium.Capability.register(
    'capability.name',
    {
        allowed: ['role1', 'role2'],
        excluded: ['role3']
    },
    priority
)
```
→ [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)

### Database & Schema

```javascript
Actinium.Collection.register(
    'CollectionName',
    {                       // Actions (maps to capabilities)
        create: true,
        retrieve: true,
        update: true,
        delete: true,
        addField: false
    },
    {                       // Schema definition
        fieldName: {
            type: 'String',
            required: true,
            default: 'value'
        },
        pointerField: {
            type: 'Pointer',
            targetClass: '_User'
        }
    }
)
```
→ [Actinium Quick Ref: Database Schema Definition](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#database-schema-definition)

```javascript
const query = new Actinium.Query('CollectionName');
query.equalTo('field', value);
query.limit(10);
const results = await query.find({ useMasterKey: true });
```
→ [Actinium: Framework Architecture](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#framework-architecture)

```javascript
const MyClass = Actinium.Object.extend('ClassName');
const obj = new MyClass();
obj.set('field', value);
await obj.save(null, { useMasterKey: true });
```
→ [Actinium: Framework Architecture](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#framework-architecture)

### Middleware

```javascript
Actinium.Middleware.register(
    'middleware-name',
    (app) => {
        app.use(middlewareFunction);
    },
    priority,
    'unique-id'
)
```
→ [Patterns: Middleware Priority Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-13-middleware-priority-pattern)

### Global Variables

```javascript
Actinium        // Main framework object
ENV             // Environment configuration
PORT            // Server port
BASE_DIR        // Project root
SRC_DIR         // src/ directory
APP_DIR         // src/app/ directory
CORE_DIR        // actinium-core directory
CLOUD_FUNCTIONS // Cloud function registry
```
→ [Actinium Quick Ref: Global Variables Available](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#global-variables-available)

```javascript
DEBUG(...args)  // Threshold: 1000
INFO(...args)   // Threshold: 500
BOOT(...args)   // Threshold: 0
WARN(...args)   // Threshold: -500
ERROR(...args)  // Threshold: -1000
LOG(...args)    // Alias for BOOT
```
→ [Actinium Quick Ref: Global Variables Available](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#global-variables-available)

---

## Integration API

### Parse SDK (Frontend)

```javascript
// Initialize Parse
Parse.initialize(APP_ID, JS_KEY);
Parse.serverURL = 'http://localhost:9000/parse';
```
→ [Integration: Authentication](../CLAUDE/FRAMEWORK_INTEGRATION.md#authentication--session-management)

```javascript
// Login
const user = await Parse.User.logIn(username, password);

// Signup
const user = new Parse.User();
user.set('username', username);
user.set('password', password);
await user.signUp();

// Current user
const currentUser = Parse.User.current();

// Logout
await Parse.User.logOut();
```
→ [Integration: Authentication](../CLAUDE/FRAMEWORK_INTEGRATION.md#authentication--session-management)

```javascript
// Query
const query = new Parse.Query('ClassName');
query.equalTo('field', value);
query.limit(20);
const results = await query.find();

// Get by ID
const obj = await query.get(objectId);

// First match
const first = await query.first();

// Count
const count = await query.count();
```
→ [Integration: Data Flow Patterns](../CLAUDE/FRAMEWORK_INTEGRATION.md#data-flow-patterns)

```javascript
// Save object
const MyClass = Parse.Object.extend('ClassName');
const obj = new MyClass();
obj.set('field', value);
await obj.save();

// Update
obj.set('field', newValue);
await obj.save();

// Delete
await obj.destroy();
```
→ [Integration: Data Flow Patterns](../CLAUDE/FRAMEWORK_INTEGRATION.md#data-flow-patterns)

```javascript
// Cloud function call
const result = await Parse.Cloud.run('functionName', {
    param1: 'value1',
    param2: 'value2'
});
```
→ [Integration: Cloud Function Integration](../CLAUDE/FRAMEWORK_INTEGRATION.md#cloud-function-integration)

### Parse Live Query (Real-Time)

```javascript
// Enable Live Query (backend)
Actinium.Hook.register('live-query-classnames', (context) => {
    context.classNames.push('MyCollection');
});
```
→ [Integration: Real-Time Communication](../CLAUDE/FRAMEWORK_INTEGRATION.md#real-time-communication)

```javascript
// Subscribe to changes (frontend)
const query = new Parse.Query('MyCollection');
const subscription = await query.subscribe();

subscription.on('create', (object) => {
    console.log('Created:', object);
});

subscription.on('update', (object) => {
    console.log('Updated:', object);
});

subscription.on('delete', (object) => {
    console.log('Deleted:', object);
});

// Unsubscribe
subscription.unsubscribe();
```
→ [Integration: Real-Time Communication](../CLAUDE/FRAMEWORK_INTEGRATION.md#real-time-communication)

---

## Common Patterns

### Component with Data Loading

```javascript
// Component
export const MyComponent = () => {
    const handle = useSyncHandle(MyComponent.handleId);
    const data = handle?.get('data');

    return <div>{data}</div>;
};

MyComponent.loadState = async ({ route, params, search }) => {
    const data = await fetchData(params);
    return { data, loading: false };
};

MyComponent.handleId = 'MyComponentHandle';

export default MyComponent;
```
→ [Reactium: Data Loading with loadState](../CLAUDE/REACTIUM_FRAMEWORK.md#data-loading-with-loadstate)
→ [Patterns: Static Method Data Loading](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-2-static-method-data-loading)

### Plugin Registration (Reactium)

```javascript
(async () => {
    const { Hook, Enums, Component } = await import('@atomic-reactor/reactium-core/sdk');

    Hook.register('plugin-init', async () => {
        const { MyComponent } = await import('./MyComponent');
        Component.register('MyComponent', MyComponent);
    }, Enums.priority.neutral, 'plugin-init-MyComponent');
})();
```
→ [Reactium: Creating a Plugin](../CLAUDE/REACTIUM_FRAMEWORK.md#creating-a-plugin)

### Plugin with SDK (Actinium)

```javascript
// sdk.js
export default {
    doSomething: async (param) => { /* ... */ }
};

// plugin.js
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';
import SDK from './sdk.js';

const MOD = () => {
    Actinium.Plugin.register(PLUGIN, true);
    Actinium.MyPlugin = SDK;

    Actinium.Cloud.define(PLUGIN.ID, 'myFunction', async (req) => {
        return SDK.doSomething(req.params.param);
    });
};

export default MOD();
```
→ [Patterns: Plugin SDK Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-8-plugin-sdk-pattern)

---

**Usage**: Find function → Check signature → Click link for details
**Coverage**: 60+ most commonly used API functions with signatures
