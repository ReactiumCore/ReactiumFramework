<!-- v1.9.0 -->
# CLAUDEDB - API Quick Reference

**Purpose**: Common functions/hooks with signatures + direct links
**Rule**: Function signature + link to documentation

---

## Reactium API

### Component Registration

```javascript
Reactium.Component.register(name, component)
// Registers component in global Component Registry
```
→ [hookableComponent: Registration Pattern](../CLAUDE/HOOKABLE_COMPONENT.md#registration-pattern)

```javascript
Reactium.Component.get(name, defaultComponent?)
// Retrieves component from registry
// Returns: Component or defaultComponent
```
→ [hookableComponent: Component Registry](../CLAUDE/HOOKABLE_COMPONENT.md#component-registry)

```javascript
Reactium.Component.unregister(name)
// Removes component from registry
```
→ [hookableComponent: Component Registry](../CLAUDE/HOOKABLE_COMPONENT.md#component-registry)

```javascript
useHookComponent(name, defaultComponent?)
// Hook that retrieves component (non-reactive)
// Returns: Component from registry or defaultComponent
```
→ [hookableComponent: useHookComponent Hook](../CLAUDE/HOOKABLE_COMPONENT.md#usehookcomponent-hook)

```javascript
hookableComponent(name)
// Factory that creates wrapper component
// Returns: Component that dynamically retrieves from registry
```
→ [hookableComponent: hookableComponent Factory](../CLAUDE/HOOKABLE_COMPONENT.md#hookablecomponent-factory)

### Events & Communication

```javascript
// ComponentEvent - Type-safe custom event with payload flattening
new ComponentEvent<T>(type, payload?)
// Creates CustomEvent where payload properties are flattened onto event
// Access: event.myProp instead of event.detail.myProp
// Prototype pollution protection: filters __proto__ and proto__
// Property collision: prefixes conflicting keys with __
```
→ [ComponentEvent System: Overview](../CLAUDE/COMPONENT_EVENT_SYSTEM.md#overview)

```javascript
useEventEffect<Target>(target, handlers, deps?)
// Manages addEventListener/removeEventListener with automatic cleanup
// handlers: { eventName: callback, ... }
// Returns: void
```
→ [ComponentEvent: useEventEffect Hook](../CLAUDE/COMPONENT_EVENT_SYSTEM.md#useeventeffect-hook)

```javascript
isTarget(target)
// Checks if target has addEventListener/removeEventListener
// Returns: boolean
```
→ [ComponentEvent: isTarget Helper](../CLAUDE/COMPONENT_EVENT_SYSTEM.md#istarget-helper)

### State Management

```javascript
// ReactiumSyncState - Observable state (EventTarget-based)
new ReactiumSyncState<T>(initialState, options?)
state.get<T>(path, defaultValue?)        // Get value at path
state.set(path, value, update?, forceMerge?)  // Set value with merge
state.del(path, update?)                 // Delete path
state.insert(path, value, index, update?)     // Array insertion
state.reset()                            // Reset to initial
state.extend(prop, method)               // Add custom method
state.dispatch(type, payload?)           // Manual event dispatch (uses ComponentEvent)
state.addEventListener(type, listener, options?, id?)  // Subscribe
state.removeEventListenerById(type, id)  // Unsubscribe by ID
// Events: before-set, set, change, before-del, del, before-insert, insert
```
→ [ReactiumSyncState Architecture](../CLAUDE/REACTIUM_SYNC_STATE.md#core-concept)
→ [ReactiumSyncState: Core API](../CLAUDE/REACTIUM_SYNC_STATE.md#core-api)
→ [ReactiumSyncState: Event System](../CLAUDE/REACTIUM_SYNC_STATE.md#event-system)

```javascript
useSyncState<T>(initialState, updateEvent = 'set')
// Returns: ReactiumSyncState<T> (with get/set methods)
```
→ [Reactium: useSyncState](../CLAUDE/REACTIUM_FRAMEWORK.md#1-local-component-state-usesyncstate)
→ [ReactiumSyncState: useSyncState Integration](../CLAUDE/REACTIUM_SYNC_STATE.md#1-usesyncstate-hook)
→ [Gotchas: useSyncState Is Not useState](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-2-usesyncstate-is-not-usestate)

```javascript
Reactium.State.get(key)
Reactium.State.set(key, value)
useGlobalState(key)
```
→ [Reactium: Global State](../CLAUDE/REACTIUM_FRAMEWORK.md#2-global-state-reactiumstate)
→ [ReactiumSyncState: Global State Singleton](../CLAUDE/REACTIUM_SYNC_STATE.md#2-global-state-singleton)

### Preferences (LocalStorage)

```javascript
// Prefs - Simple localStorage wrapper with object-path addressing
Reactium.Prefs.get<T>(key?, defaultValue?)
// Get preference by object-path or all prefs
// key: 'admin.sidebar.status' or 'my.nested.value'
// Returns: T (preference value or defaultValue)
```
→ [Prefs System: get() method](../CLAUDE/PREFS_SYSTEM.md#prefsgetkey-defaultvalue)

```javascript
Reactium.Prefs.set<T>(key, value)
// Set preference at object-path, persists to localStorage
// key: 'admin.sidebar.status' or 'my.nested.value'
// Returns: PrefsType (entire prefs object)
```
→ [Prefs System: set() method](../CLAUDE/PREFS_SYSTEM.md#prefssetkey-value)

```javascript
Reactium.Prefs.clear(key?)
// Clear specific path or entire prefs
// key?: Optional object-path to clear
// Returns: PrefsType (updated prefs object)
```
→ [Prefs System: clear() method](../CLAUDE/PREFS_SYSTEM.md#prefsclearkey)

```javascript
Reactium.Prefs.create<PrefsType>(storageKey)
// Factory for isolated Prefs instance with custom localStorage key
// Returns: PrefsClass<PrefsType>
```
→ [Prefs System: create() method](../CLAUDE/PREFS_SYSTEM.md#prefscreatestoragekey)

**Important**: Prefs is NOT reactive. Changes don't trigger React re-renders.
→ [Prefs System: Common Gotchas](../CLAUDE/PREFS_SYSTEM.md#common-gotchas)

### Handle System

```javascript
new Handle(id, initialState)
Handle.register(id, handle)
Handle.get(id)
useHandle(id)  // No subscription
useSyncHandle(id)  // With subscription
useSelectHandle(id, selector, defaultValue?)  // Optimized - only re-renders on selected value change
// Returns: { handle, selected }
```
→ [Reactium: Handles](../CLAUDE/REACTIUM_FRAMEWORK.md#3-handles-shared-observable-state)
→ [Gotchas: useHandle vs useSyncHandle](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-11-usehandle-vs-usesynchandle)
→ [FAQ: useSelectHandle Performance](../FAQ.md#q-when-should-i-use-useselecthandle-instead-of-usesynchandle)

```javascript
Reactium.Pulse.on(event, callback)
Reactium.Pulse.emit(event, data)
Reactium.Pulse.off(event, callback)
```
→ [Reactium: Pulse](../CLAUDE/REACTIUM_FRAMEWORK.md#4-pulse-pubsub-events)

### Browser Utilities

```javascript
Reactium.Prefs.get(key, defaultValue?)
Reactium.Prefs.set(key, value)
Reactium.Prefs.clear(key)
// LocalStorage wrapper with reactivity
```
→ [Reactium: The Reactium SDK](../CLAUDE/REACTIUM_FRAMEWORK.md#the-reactium-sdk)

```javascript
Reactium.Fullscreen.isFullScreen()
Reactium.Fullscreen.enter(element?)
Reactium.Fullscreen.exit()
Reactium.Fullscreen.toggle(element?)
```
→ [Reactium: The Reactium SDK](../CLAUDE/REACTIUM_FRAMEWORK.md#the-reactium-sdk)

```javascript
// Window size & breakpoint utilities
Reactium.Window.get('width')
Reactium.Window.get('height')
Reactium.breakpoint      // Current breakpoint name
```
→ [Reactium: The Reactium SDK](../CLAUDE/REACTIUM_FRAMEWORK.md#the-reactium-sdk)

### SDK Extension

```javascript
// Pattern 1: Direct SDK extension
Reactium.Hook.register('sdk-init', async (SDK) => {
    const { default: MyFeature } = await import('./sdk');
    Reactium.MyFeature = MyFeature;
}, Reactium.Enums.highest, 'MY-SDK-EXTENSION-ID');
```
→ [SDK Extension: Direct Extension](../CLAUDE/SDK_EXTENSION_PATTERN.md#pattern-1-direct-sdk-extension)

```javascript
// Pattern 2: APIRegistry extension
Reactium.API.register('MyAPI', { api: apiClient, config: apiConfig });
// Access via:
Reactium.API.MyAPI        // → apiClient
Reactium.API.MyAPIConfig  // → apiConfig
Reactium.MyAPI            // → fallback via Proxy
```
→ [SDK Extension: APIRegistry Extension](../CLAUDE/SDK_EXTENSION_PATTERN.md#pattern-2-apiregistry-extension)
→ [SDK Extension: SDK Proxy Fallback Chain](../CLAUDE/SDK_EXTENSION_PATTERN.md#sdk-proxy-fallback-chain)

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

## Registry API

### Factory & Constructor

```javascript
import { registryFactory } from '@atomic-reactor/reactium-sdk-core';

const registry = registryFactory(name, idField?, mode?)
// name: string (registry name)
// idField: string (default: 'id')
// mode: Registry.MODES.CLEAN | Registry.MODES.HISTORY (default: CLEAN)
```
→ [Registry System: Constructor & Factory](../CLAUDE/REGISTRY_SYSTEM.md#constructor--factory)

### Registration

```javascript
registry.register(id, item)
// id: string (unique identifier)
// item: object (must contain idField property matching id)

registry.register(item)
// Auto-uses item[idField] as id
```
→ [Registry System: Registration](../CLAUDE/REGISTRY_SYSTEM.md#registration)

### Retrieval

```javascript
registry.get(path, defaultValue?)
// path: string (id or 'id.nested.property') | array
// Returns: item or property value

registry.list
// Returns: Array (all active items, sorted by 'order' property)

registry.listById
// Returns: Object (items indexed by ID)
```
→ [Registry System: Retrieval](../CLAUDE/REGISTRY_SYSTEM.md#retrieval)

### Unregistration

```javascript
registry.unregister(id)
// Removes from active list (memory behavior depends on mode)

registry.isRegistered(id)
// Returns: boolean

registry.isUnRegistered(id)
// Returns: boolean
```
→ [Registry System: Unregistration](../CLAUDE/REGISTRY_SYSTEM.md#unregistration)

### Protection & Banning

```javascript
registry.protect(id)
// Prevents unregistration and replacement

registry.unprotect(id)
// Removes protection

registry.ban(id)
// Prevents registration (preemptive blocking)

registry.unban(id)
// Removes ban
```
→ [Registry System: Protection](../CLAUDE/REGISTRY_SYSTEM.md#protection-prevent-unregistration)
→ [Registry System: Banning](../CLAUDE/REGISTRY_SYSTEM.md#banning-prevent-registration)

### Subscriptions

```javascript
const unsubscribe = registry.subscribe((registry, notification) => {
    // notification.type: 'register' | 'unregister' | 'protect' | 'ban' | etc.
    // notification.id: item ID
    // notification.data: item data (on register)
}, subscriberId?)
// Returns: unsubscribe function
```
→ [Registry System: Notifications](../CLAUDE/REGISTRY_SYSTEM.md#notifications-pubsub)

### Memory Management

```javascript
registry.cleanup(id)
// Remove item from memory (manual cleanup in HISTORY mode)

registry.flush()
// Clear entire registry
```
→ [Registry System: Cleanup & Flush](../CLAUDE/REGISTRY_SYSTEM.md#cleanup--flush)

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

### Collection Registration

```javascript
Actinium.Collection.register(collection, publicSetting, schema?, indexes?)
// Registers Parse collection with CLP, schema, and indexes
// collection: String - Collection name
// publicSetting: { create, retrieve, update, delete, addField } - Boolean flags
// schema: Object - Parse field definitions (optional)
// indexes: Array<string> - Fields to index (optional)
```
→ [Collection Registration: Core API](../CLAUDE/COLLECTION_REGISTRATION.md#actiniumcollectionregister)

```javascript
// Schema field types
{
    fieldName: {
        type: 'String' | 'Number' | 'Boolean' | 'Date' | 'Array' | 'Object' |
              'Pointer' | 'Relation' | 'File' | 'GeoPoint' | 'Polygon',
        targetClass?: string,    // Required for Pointer/Relation
        required?: boolean,
        defaultValue?: any,
        delete?: boolean         // Mark for deletion
    }
}
```
→ [Collection Registration: Schema Field Management](../CLAUDE/COLLECTION_REGISTRATION.md#schema-field-management)

```javascript
Actinium.Collection.load(collection?)
// Loads/reloads schema and CLPs for collection(s)
// collection: String (optional) - Specific collection, or all if omitted
```
→ [Collection Registration: Collection Lifecycle](../CLAUDE/COLLECTION_REGISTRATION.md#collection-lifecycle)

```javascript
Actinium.Collection.unregister(collection)
// Resets collection to default (private) permissions
// collection: String - Collection name
```
→ [Collection Registration: Core API](../CLAUDE/COLLECTION_REGISTRATION.md#actiniumcollectionregister)

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
        // req.params  - client parameters
        // req.user    - Parse.User (or undefined)
        // req.master  - boolean (master key in use)
        return result;
    }
)
```
→ [Cloud Functions: Registration Pattern](../CLAUDE/CLOUD_FUNCTIONS.md#registration-pattern)

```javascript
// Parse Server triggers
Actinium.Cloud.beforeSave(COLLECTION, async (req) => {})
Actinium.Cloud.afterSave(COLLECTION, async (req) => {})
Actinium.Cloud.beforeDelete(COLLECTION, async (req) => {})
Actinium.Cloud.afterDelete(COLLECTION, async (req) => {})
Actinium.Cloud.afterFind(COLLECTION, async (req) => {})
Actinium.Cloud.beforeLogin(async (req) => {})
```
→ [Cloud Functions: Hook Integration](../CLAUDE/CLOUD_FUNCTIONS.md#hook-integration)

```javascript
// Client-side call
const result = await Actinium.Cloud.run('functionName', params, options);
// options: { useMasterKey: boolean, sessionToken: string }
```
→ [Cloud Functions: Testing Strategies](../CLAUDE/CLOUD_FUNCTIONS.md#testing-strategies)

### Cloud Function Security

```javascript
const { CloudRunOptions, MasterOptions, CloudCapOptions, CloudHasCapabilities } = Actinium.Utils;

// CloudRunOptions - Use session token, escalate for super-admin
const options = CloudRunOptions(req);
// options = { sessionToken: 'xxx' } OR { useMasterKey: true }

// CloudRunOptions with level requirement
const options = CloudRunOptions(req, '>1000');
// Escalates if user level > 1000

// MasterOptions - Force master key (use sparingly)
const options = MasterOptions();
// options = { useMasterKey: true }

// CloudCapOptions - Escalate if user has capabilities
const options = CloudCapOptions(req, ['Setting.retrieve', 'setting.site-get'], false);
// Escalates if user has EITHER capability (false = OR logic)

// CloudHasCapabilities - Check without escalation (permission gate)
if (!CloudHasCapabilities(req, ['Setting.update'], false)) {
    return Promise.reject('Permission denied.');
}
```
→ [Cloud Functions: Security & Authorization](../CLAUDE/CLOUD_FUNCTIONS.md#security--authorization)
→ [Actinium Quick Ref: Capability Checking](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capability-checking)

```javascript
// CloudACL - Generate ACL with capability-based role access
const { CloudACL } = Actinium.Utils;

const acl = await CloudACL(
    [
        { permission: 'read', type: 'public', allow: true },
        { permission: 'write', type: 'user', objectId: user.id, allow: true }
    ],
    'read-score',   // Roles with this capability get read access
    'write-score'   // Roles with this capability get write access
);

object.setACL(acl);
```
→ [Cloud Functions: CloudACL](../CLAUDE/CLOUD_FUNCTIONS.md#cloudacl---generate-acl-from-permissions)

```javascript
// AclTargets - Get users and roles for ACL selectors
const { AclTargets } = Actinium.Utils;

const targets = await AclTargets({
    master: true,
    params: { search: 'admin', cache: true }
});
// Returns: { roles: [...], users: [...] }
```
→ [Cloud Functions: AclTargets](../CLAUDE/CLOUD_FUNCTIONS.md#acltargets---get-users-and-roles-for-acls)

```javascript
// Capability Registration
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
