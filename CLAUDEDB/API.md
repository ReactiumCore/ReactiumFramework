<!-- v1.23.0 -->

# CLAUDEDB - API Quick Reference

**Purpose**: Common functions/hooks with signatures + direct links
**Rule**: Function signature + link to documentation

---

## Reactium API

### Window & Breakpoint Utilities

```javascript
conditionalWindow()
// Returns window or undefined (SSR-safe)
// Returns: Window | undefined
```

→ [Window/Breakpoint: SSR-Safe Accessors](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#ssr-safe-windowdocument-access)

```javascript
conditionalDocument()
// Returns document or undefined (SSR-safe)
// Returns: Document | undefined
```

→ [Window/Breakpoint: SSR-Safe Accessors](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#ssr-safe-windowdocument-access)

```javascript
isWindow(iWindow?)
// Checks if window exists
// Returns: boolean
```

→ [Window/Breakpoint: Window Existence Check](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#core-utilities)

```javascript
isElectronWindow(iWindow?)
// Detects Electron environment
// Returns: boolean
```

→ [Window/Breakpoint: Electron Detection](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#electron-detection)

```javascript
breakpoint(width?, iWindow?, iDocument?)
// Returns current breakpoint name for given width
// width: number (optional, defaults to window.innerWidth)
// Returns: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
```

→ [Window/Breakpoint: Determine Current Breakpoint](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#determine-current-breakpoint)

```javascript
breakpoints(iWindow?)
// Returns breakpoint configuration object
// Returns: { xs: number, sm: number, md: number, lg: number, xl: number }
```

→ [Window/Breakpoint: Runtime Breakpoint Access](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#runtime-breakpoint-access)

```javascript
useWindow()
// React hook for context-aware window access
// Returns: Window | undefined
```

→ [Window/Breakpoint: useWindow Hook](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#usewindow---context-aware-window-access)

```javascript
useDocument()
// React hook for context-aware document access
// Returns: Document | undefined
```

→ [Window/Breakpoint: useDocument Hook](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#usedocument---context-aware-document-access)

```javascript
useBreakpoints()
// React hook for breakpoint configuration
// Returns: { xs: number, sm: number, md: number, lg: number, xl: number }
```

→ [Window/Breakpoint: useBreakpoints Hook](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#usebreakpoints---get-breakpoint-configuration)

```javascript
useBreakpoint(width)
// React hook to get breakpoint for specific width
// width: number
// Returns: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
```

→ [Window/Breakpoint: useBreakpoint Hook](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#usebreakpointwidth---get-breakpoint-for-specific-width)

```javascript
useWindowSize({ defaultWidth?, defaultHeight?, delay? })
// React hook for reactive window dimensions and breakpoint
// defaultWidth: number (default: 1) - Width when window undefined
// defaultHeight: number (default: 1) - Height when window undefined
// delay: number (default: 0) - Debounce delay in ms
// Returns: { width, height, breakpoint, scrollX?, scrollY? }
```

→ [Window/Breakpoint: useWindowSize Hook](../CLAUDE/REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md#usewindowsize---reactive-window-size-with-breakpoint)

### Component Registration

```javascript
Reactium.Component.register(name, component);
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
Reactium.Component.unregister(name);
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
hookableComponent(name);
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
isTarget(target);
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
useSyncState < T > (initialState, (updateEvent = 'set'));
// Returns: ReactiumSyncState<T> (with get/set methods)
```

→ [Reactium: useSyncState](../CLAUDE/REACTIUM_FRAMEWORK.md#1-local-component-state-usesyncstate)
→ [ReactiumSyncState: useSyncState Integration](../CLAUDE/REACTIUM_SYNC_STATE.md#1-usesyncstate-hook)
→ [Gotchas: useSyncState Is Not useState](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-2-usesyncstate-is-not-usestate)

```javascript
Reactium.State.get(key);
Reactium.State.set(key, value);
useGlobalState(key);
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
Reactium.Prefs.set < T > (key, value);
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
Reactium.Prefs.create < PrefsType > storageKey;
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
Reactium.Pulse.on(event, callback);
Reactium.Pulse.emit(event, data);
Reactium.Pulse.off(event, callback);
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
Reactium.Window.get('width');
Reactium.Window.get('height');
Reactium.breakpoint; // Current breakpoint name
```

→ [Reactium: The Reactium SDK](../CLAUDE/REACTIUM_FRAMEWORK.md#the-reactium-sdk)

```javascript
// cxFactory - Namespaced classname generation
const cx = Reactium.Utils.cxFactory('my-component');
cx()                         // → 'my-component'
cx('header')                 // → 'my-component-header'
cx('title', { active: true}) // → 'my-component-title my-component-active'
```

→ [Utility Helpers: cxFactory API](../CLAUDE/REACTIUM_UTILITY_HELPERS.md#api)
→ [Utility Helpers: cxFactory Usage](../CLAUDE/REACTIUM_UTILITY_HELPERS.md#usage-patterns)

```javascript
// SplitParts - Token-based string templates
const template = Reactium.Utils.splitParts('Hello %name%, you have %count% messages');
template.replace('name', 'Alice');
template.replace({ count: 5 });
template.toString();     // → 'Hello Alice, you have 5 messages'
template.value();        // → Part[] array for React rendering
template.reset();        // Reset to original
```

→ [Utility Helpers: SplitParts API](../CLAUDE/REACTIUM_UTILITY_HELPERS.md#api-1)
→ [Utility Helpers: SplitParts Usage](../CLAUDE/REACTIUM_UTILITY_HELPERS.md#usage-patterns-1)

### Utility Hooks

```javascript
// useAsyncEffect - Async side effects with mount safety
useAsyncEffect(async (isMounted) => {
    const data = await fetch('/api');
    if (!isMounted()) return;
    setData(data);
}, [deps]);
```

→ [Utility Hooks: useAsyncEffect](../CLAUDE/UTILITY_HOOKS.md#useasynceffect)

```javascript
// useEventEffect - Event listener management
useEventEffect(
    target,
    {
        click: (e) => console.log('clicked'),
        keydown: (e) => console.log('key:', e.key)
    },
    [deps]
);
```

→ [Utility Hooks: useEventEffect](../CLAUDE/UTILITY_HOOKS.md#useeventeffect)

```javascript
// useFulfilledObject - Wait for object properties
const [ready, obj, attempts] = useFulfilledObject(
    stateRef.current,
    ['user.profile', 'settings.loaded'],
    100 // poll interval ms
);
```

→ [Utility Hooks: useFulfilledObject](../CLAUDE/UTILITY_HOOKS.md#usefulfilledobject)

```javascript
// useIsContainer - DOM hierarchy checking
const isInside = useIsContainer(element, container);
if (!isInside) closePopover();
```

→ [Utility Hooks: useIsContainer](../CLAUDE/UTILITY_HOOKS.md#useiscontainer)

```javascript
// useScrollToggle - Body scroll control
const scroll = useScrollToggle();
scroll.disable(); // Freeze scroll (for modals)
scroll.enable();  // Restore scroll
scroll.toggle();  // Toggle state
```

→ [Utility Hooks: useScrollToggle](../CLAUDE/UTILITY_HOOKS.md#usescrolltoggle)

### SDK Extension

```javascript
// Pattern 1: Direct SDK extension
Reactium.Hook.register(
  'sdk-init',
  async (SDK) => {
    const { default: MyFeature } = await import('./sdk');
    Reactium.MyFeature = MyFeature;
  },
  Reactium.Enums.highest,
  'MY-SDK-EXTENSION-ID'
);
```

→ [SDK Extension: Direct Extension](../CLAUDE/SDK_EXTENSION_PATTERN.md#pattern-1-direct-sdk-extension)

```javascript
// Pattern 2: APIRegistry extension
Reactium.API.register('MyAPI', { api: apiClient, config: apiConfig });
// Access via:
Reactium.API.MyAPI; // → apiClient
Reactium.API.MyAPIConfig; // → apiConfig
Reactium.MyAPI; // → fallback via Proxy
```

→ [SDK Extension: APIRegistry Extension](../CLAUDE/SDK_EXTENSION_PATTERN.md#pattern-2-apiregistry-extension)
→ [SDK Extension: SDK Proxy Fallback Chain](../CLAUDE/SDK_EXTENSION_PATTERN.md#sdk-proxy-fallback-chain)

### Hooks

```javascript
Reactium.Hook.register(
  name, // string
  callback, // async function
  priority, // number (default: Enums.priority.neutral)
  id, // string (optional, auto-generated)
  domain // string (default: 'default')
);
// Returns: hookId (string)
```

→ [Reactium: Hook Registration](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-registration)
→ [Hook Domains Deep Dive](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md)

```javascript
Reactium.Hook.registerSync(name, callback, priority, id, domain);
```

→ [Reactium: Hook Registration](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-registration)

```javascript
await Reactium.Hook.run(name, ...args);
// Returns: context object
```

→ [Reactium: Hook Execution](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-execution)

```javascript
Reactium.Hook.runSync(name, ...args);
```

→ [Reactium: Hook Execution](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-execution)

```javascript
Reactium.Hook.unregister(hookId);
// Unregister single hook by ID

Reactium.Hook.unregisterDomain(hookName, domain);
// Unregister all hooks in domain for specific hook name

Reactium.Hook.flush(hookName, (type = 'async'));
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
await Reactium.Routing.register(routeObject, (update = true));
// Returns: routeId (string)
```

→ [Routing System: Route Registration Method](../CLAUDE/ROUTING_SYSTEM.md#4-route-registration-method)

```javascript
Reactium.Routing.unregister(routeId, (update = true));
```

→ [Routing System: Advanced Features](../CLAUDE/ROUTING_SYSTEM.md#route-unregistration)

```javascript
// Transition state management
Reactium.Routing.nextState();
Reactium.Routing.jumpCurrent();
```

→ [Routing System: Advancing States](../CLAUDE/ROUTING_SYSTEM.md#advancing-states)

```javascript
// Access routing state
const routing = useRouting();
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
};
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
  ...additionalProps,
});
```

→ [Zone System Quick Ref: Component Registration](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#component-registration)

```javascript
Reactium.Zone.updateComponent(id, updates);
Reactium.Zone.removeComponent(id);
```

→ [Zone System Quick Ref: Component Registration](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#component-registration)

```javascript
Reactium.Zone.addFilter(
  zoneName,
  filterFunction, // (component) => boolean
  priority
);
// Returns: filterId
```

→ [Zone System Quick Ref: Filters](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#filters)

```javascript
Reactium.Zone.addMapper(
  zoneName,
  mapperFunction, // (component) => transformedComponent
  priority
);
// Returns: mapperId
```

→ [Zone System Quick Ref: Mappers](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#mappers)

```javascript
Reactium.Zone.addSort(
  zoneName,
  propertyName, // default: 'order'
  reverse, // default: false
  priority
);
// Returns: sortId
```

→ [Zone System Quick Ref: Sorters](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#sorters)

```javascript
Reactium.Zone.getZoneComponents(zoneName, (raw = false));
Reactium.Zone.getZoneComponent(zoneName, componentId);
Reactium.Zone.hasZoneComponent(zoneName, componentId);
```

→ [Zone System Quick Ref: Query Functions](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#query-functions)

```javascript
const unsubscribe = Reactium.Zone.subscribe(zoneName, callback);
useZoneComponents(zoneName, (dereference = true));
```

→ [Zone System Quick Ref: Subscription](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#subscription)

### Priority Constants

```javascript
Reactium.Enums.priority.core; // -2000 (runs first)
Reactium.Enums.priority.highest; // -1000
Reactium.Enums.priority.high; // -500
Reactium.Enums.priority.neutral; // 0 (default)
Reactium.Enums.priority.low; // 500
Reactium.Enums.priority.lowest; // 1000 (runs last)
```

→ [Actinium Quick Ref: Priority Constants](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#priority-constants)
→ [Gotchas: Priority Numbers Are Counterintuitive](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-6-priority-numbers-are-counterintuitive)

**Note**: `Enums.priority.normal` does NOT exist (common bug)
→ [Gotchas: Enums.priority.normal Does Not Exist](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-5-enumsprioritynormal-does-not-exist-critical-bug)

---

### Server Hooks

```javascript
ReactiumBoot.Hook.registerSync('Server.ResponseHeaders', (responseHeaders, req, res) => {
    // Add custom HTTP headers
    responseHeaders['X-Frame-Options'] = 'SAMEORIGIN';
    responseHeaders['Cache-Control'] = 'public, max-age=3600';
});
```

→ [Server Routing: Custom Response Headers](../CLAUDE/SERVER_ROUTING.md#custom-response-headers)

```javascript
await ReactiumBoot.Hook.run('Server.ResponseHeaders', responseHeaders, req, res);
// Async version of Server.ResponseHeaders hook
// Both sync and async hooks run during SSR
```

→ [Server Routing: Server.ResponseHeaders Hook](../CLAUDE/SERVER_ROUTING.md#serverresponseheaders-hook)

---

### Content Type & Field Type APIs

```javascript
Reactium.ContentType.FieldType.register(id, definition)
// Register custom field type for Content Type Editor
// id: string (field type ID, e.g., 'Text', 'MyCustomField')
// definition: { label, icon, tooltip, component, order }
```

→ [Field Type Plugin System: Registration Pattern](../CLAUDE/FIELD_TYPE_PLUGIN_SYSTEM.md#registration-pattern)

```javascript
Reactium.ContentType.FieldType.get(id)
// Get field type definition by ID
// id: string
// Returns: FieldType definition object
```

→ [Field Type Plugin System: SDK Reference](../CLAUDE/FIELD_TYPE_PLUGIN_SYSTEM.md#contenttypefieldtype-registry)

```javascript
Reactium.ContentType.FieldType.list
// Get all registered field types
// Returns: Array of FieldType objects
```

→ [Field Type Plugin System: SDK Reference](../CLAUDE/FIELD_TYPE_PLUGIN_SYSTEM.md#contenttypefieldtype-registry)

```javascript
Reactium.Content.Editor.register(id, { component })
// Register content editor component for field type
// id: string (field type ID)
// component: React component for editing field value
```

→ [Field Type Plugin System: Editor Component](../CLAUDE/FIELD_TYPE_PLUGIN_SYSTEM.md#editor-component)

```javascript
Reactium.Component.register(componentId, Component)
// Register configuration component for field type
// componentId: string (matches fieldType.component property)
// Component: React component for field settings UI
```

→ [Field Type Plugin System: Configuration Component](../CLAUDE/FIELD_TYPE_PLUGIN_SYSTEM.md#configuration-component-fieldtype)

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
registry.register(id, item);
// id: string (unique identifier)
// item: object (must contain idField property matching id)

registry.register(item);
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
registry.unregister(id);
// Removes from active list (memory behavior depends on mode)

registry.isRegistered(id);
// Returns: boolean

registry.isUnRegistered(id);
// Returns: boolean
```

→ [Registry System: Unregistration](../CLAUDE/REGISTRY_SYSTEM.md#unregistration)

### Protection & Banning

```javascript
registry.protect(id);
// Prevents unregistration and replacement

registry.unprotect(id);
// Removes protection

registry.ban(id);
// Prevents registration (preemptive blocking)

registry.unban(id);
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
registry.cleanup(id);
// Remove item from memory (manual cleanup in HISTORY mode)

registry.flush();
// Clear entire registry
```

→ [Registry System: Cleanup & Flush](../CLAUDE/REGISTRY_SYSTEM.md#cleanup--flush)

---

## Reactium CLI (ARCLI) API

### ActionSequence - Sequential Workflow Execution

```javascript
ActionSequence({ actions, options })
// Executes actions sequentially with shared context
// actions: Object of { actionId: actionFunction }
// options: Object spread into each action parameter
// Returns: Promise<context> with all action results
```

→ [ActionSequence: Core API](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#core-api)

```javascript
// Action function signature
actionFunction({ params, props, action, context, prevAction })
// params: User parameters from options
// props: Framework properties from options
// action: String - current action ID
// context: Object - accumulated results from previous actions
// prevAction: String - previous action ID (undefined for first)
// Returns: Any value (stored in context[actionId])
```

→ [ActionSequence: Action Function Signature](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#action-function-signature)

**Common Pattern**:
```javascript
const actions = {
  init: ({ params }) => { /* setup */ },
  process: ({ params, context }) => {
    const initResult = context.init; // Access previous action
    return processedData;
  },
  finalize: ({ context }) => { /* cleanup */ }
};

await ActionSequence({ actions, options: { params, props } });
```

→ [ActionSequence: Pattern 1 - Generator Wrapper](../CLAUDE/ACTIONSEQUENCE_PATTERN.md#pattern-1-generator-wrapper-standard-cli-command-pattern)

### Command Exports

```javascript
// Root command (appears in npx reactium --help)
export const NAME = 'mycommand';
export const COMMAND = ({ program, props }) => {
  return program
    .command(NAME)
    .description('Command description')
    .action((opt) => ACTION({ opt, props }))
    .option('-f, --flag [value]', 'Flag description');
};
```

→ [CLI: Command Module Structure](../CLAUDE/CLI_COMMAND_SYSTEM.md#4-command-module-structure)

```javascript
// Subcommand (namespaced with dot notation)
export const ID = 'parent.child'; // Or 'namespace:command'
export const COMMAND = ({ program, props }) => {
  /* ... */
};
```

→ [CLI: Command Module Structure](../CLAUDE/CLI_COMMAND_SYSTEM.md#4-command-module-structure)

### Global arcli Object

```javascript
// Available utilities in all commands
const {
  chalk, // Terminal colors
  fs, // fs-extra
  path, // Node path
  globby, // Fast globbing
  inquirer, // Prompts
  Spinner, // ora spinner
  ActionSequence, // Multi-step actions
  handlebars, // Template engine
  op, // object-path
  moment, // Date utilities
  semver, // Version utilities
  props, // CLI properties (cwd, root, config)
} = arcli;
```

→ [CLI: Bootstrap Process](../CLAUDE/CLI_COMMAND_SYSTEM.md#1-bootstrap-process)

### Plugin CLI Extensibility

```javascript
// arcli-install.js - Post-install actions
module.exports = (spinner, arcli, params, props) => {
  return {
    init: async ({ params }) => {
      const dir = params.pluginDirectory; // Injected by install command
    },
    prompt: async () => {
      spinner.stop(); // MUST stop before prompts
      // Interactive setup
    },
  };
};
```

→ [Plugin CLI Extensibility: arcli-install.js Pattern](../CLAUDE/PLUGIN_CLI_EXTENSIBILITY.md#arcli-installjs-pattern)

```javascript
// arcli-publish.js - Pre-publish actions
module.exports = (spinner) => {
  return {
    compileCSS: async () => {
      spinner.text = 'Compiling...';
      await buildAssets();
    },
  };
};
```

→ [Plugin CLI Extensibility: arcli-publish.js Pattern](../CLAUDE/PLUGIN_CLI_EXTENSIBILITY.md#arcli-publishjs-pattern)

**Available in arcli-install.js**:
- `spinner` - ora spinner instance
- `arcli` - Global utilities (passed as param, but use global)
- `params` - Includes `pluginDirectory` (injected by install)
- `props` - CLI props (cwd, config)

**Available in arcli-publish.js**:
- `spinner` - ora spinner instance
- Access `arcli`, `params`, `props` via action parameters
- `props.cwd` - Plugin root directory

→ [Plugin CLI Extensibility: API Reference](../CLAUDE/PLUGIN_CLI_EXTENSIBILITY.md#api-reference)

### CLI Hooks

```javascript
// Global hooks (arcli-hooks.js)
Hook.register('arcli-before-command', async ({ command, params }) => {
  // Runs before any command
});

// Command-specific hooks (reactium-arcli.js)
Reactium.Hook.register(
  'arcli-component-input',
  async ({ inquirer, params }) => {
    // Modify component command input prompts
  }
);

Reactium.Hook.register('arcli-component-conform', async ({ params }) => {
  // Transform parameters before execution
});

Reactium.Hook.register('arcli-component-actions', ({ actions }) => {
  // Add file generation actions
  actions['my-action'] = async ({ params, props }) => {
    /* ... */
  };
});
```

→ [CLI: Hook-Driven Extensibility](../CLAUDE/CLI_COMMAND_SYSTEM.md#6-hook-driven-extensibility)

### ActionSequence Pattern

```javascript
import { ActionSequence } from 'action-sequence';

const actions = {
  'create-dir': async ({ params, props }) => {
    fs.ensureDirSync(params.destination);
  },
  'generate-files': async ({ params, props, spinner }) => {
    spinner.text = 'Generating files...';
    // File generation logic
  },
};

await ActionSequence({
  actions,
  options: { params, props, spinner },
});
```

→ [CLI: ActionSequence Pattern](../CLAUDE/CLI_COMMAND_SYSTEM.md#7-actionsequence-pattern)

### Configuration Access

```javascript
// Access CLI config
const { config } = arcli.props;
const customValue = op.get(config, 'custom.key');

// Configuration hierarchy (later overrides earlier):
// 1. CLI/config.json (base)
// 2. [cwd]/CLI/.cli/config.json (app legacy, rarely exists)
// 3. [homedir]/.arcli/config.json (user)
// 4. [cwd]/.cli/config.json (project - highest priority)
```

→ [CLI: Configuration Customization](../CLAUDE/CLI_COMMAND_SYSTEM.md#configuration-customization)

---

## ReactiumWebpack SDK

### Webpack Configuration

```javascript
const sdk = new WebpackSDK(name, dddFilename, context);
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
sdk.addPlugin(id, pluginInstance);
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
sdk.addResolveAlias(id, path);
// Example: sdk.addResolveAlias('components', './src/app/components')
```

→ [ReactiumWebpack: addResolveAlias](../CLAUDE/REACTIUM_WEBPACK.md#addresolvealiasid-alias)

```javascript
// Add external dependency
sdk.addExternal(id, config);
// Example: sdk.addExternal('react', { key: 'react', value: 'React' })
```

→ [ReactiumWebpack: addExternal](../CLAUDE/REACTIUM_WEBPACK.md#addexternalid-config)

```javascript
// Transpile node_modules package
sdk.addTranspiledDependency(moduleName);
// Example: sdk.addTranspiledDependency('my-es6-package')
```

→ [ReactiumWebpack: addTranspiledDependency](../CLAUDE/REACTIUM_WEBPACK.md#addtranspileddependencymodule)

```javascript
// Add context replacement
sdk.addContext(id, { from: RegExp, to: string });
// Example: sdk.addContext('translations', { from: /translations$/, to: './src/translations' })
```

→ [ReactiumWebpack: addContext](../CLAUDE/REACTIUM_WEBPACK.md#addcontextid-context)

### Optimization Methods

```javascript
// Enable aggressive code splitting
sdk.setCodeSplittingOptimize(env);

// Use webpack default optimization
sdk.setWebpackDefaultOptimize(env);

// Disable code splitting (single bundle)
sdk.setNoCodeSplitting(env);
```

→ [ReactiumWebpack: Optimization Methods](../CLAUDE/REACTIUM_WEBPACK.md#optimization-methods)

### Properties

```javascript
sdk.mode = 'development' | 'production' | 'none';
sdk.entry = { main: './src/index.js' };
sdk.target = 'web' | 'node';
sdk.output = { path, publicPath, filename };
sdk.devtool = 'source-map' | false;
sdk.optimization = { minimize, splitChunks };
sdk.extensions = ['.js', '.jsx', '.json'];
sdk.overrides = {
  /* direct webpack config */
};
```

→ [ReactiumWebpack: Properties](../CLAUDE/REACTIUM_WEBPACK.md#properties-getterssetters)

### Webpack Hooks

```javascript
// Modify SDK before config generation
Hook.registerSync(
  'before-config',
  (sdk) => {
    sdk.addRule('my-loader', rule);
  },
  'my-plugin-id'
);

// Modify final config after generation
Hook.registerSync(
  'after-config',
  (config, sdk) => {
    config.resolve.fallback = {
      /* ... */
    };
  },
  'my-plugin-id'
);

// Modify registries
Hook.registerSync(
  'rules',
  (rulesRegistry, name, context) => {
    // Inspect or modify rules
  },
  'my-plugin-id'
);

Hook.registerSync(
  'plugins',
  (pluginsRegistry, name, context) => {
    // Inspect or modify plugins
  },
  'my-plugin-id'
);
```

→ [ReactiumWebpack: Hook System Integration](../CLAUDE/REACTIUM_WEBPACK.md#hook-system-integration)

### DDD Pattern

```javascript
// File: src/my-feature/reactium-webpack.js
const { Hook } = require('@atomic-reactor/reactium-sdk-core/core');

Hook.registerSync(
  'before-config',
  (sdk) => {
    sdk.addRule('my-rule', {
      /* ... */
    });
  },
  'my-feature-webpack'
);
```

→ [ReactiumWebpack: DDD Discovery Pattern](../CLAUDE/REACTIUM_WEBPACK.md#reactium-webpackjs)

---

## Actinium API

### WebSocket (Socket.io)

```javascript
// Server-side: Actinium.IO object
Actinium.IO.server
// Socket.io Server instance attached to HTTP server
// Type: Server (socket.io)
```

→ [Actinium IO: Socket.io Server Configuration](../CLAUDE/ACTINIUM_IO_SYSTEM.md#socketio-server-configuration)

```javascript
Actinium.IO.clients
// Registry of connected clients (CLEAN mode)
// Type: Registry<{ id: string, client: Socket }>
```

→ [Actinium IO: Client Registry Pattern](../CLAUDE/ACTINIUM_IO_SYSTEM.md#client-registry-pattern)

```javascript
// Hooks for Socket.io lifecycle
Actinium.Hook.register('io.config', async (socketConfig) => {
    // Modify Socket.io server configuration before creation
    socketConfig.cors = { origin: allowedOrigins };
});
```

→ [Actinium IO: Server Configuration](../CLAUDE/ACTINIUM_IO_SYSTEM.md#socketio-server-configuration)

```javascript
Actinium.Hook.register('io.init', async (IO) => {
    // Runs after IO.server created
    // Add middleware, authentication, etc.
});
```

→ [Actinium IO: Lifecycle Hooks](../CLAUDE/ACTINIUM_IO_SYSTEM.md#connection-lifecycle-hooks)

```javascript
Actinium.Hook.register('io.connection', async (client) => {
    // Fires for each client connection
    // client: Socket (socket.io client object)
});
```

→ [Actinium IO: Connection Handler](../CLAUDE/ACTINIUM_IO_SYSTEM.md#connection-lifecycle-hooks)

```javascript
Actinium.Hook.register('io.disconnecting', async (client) => {
    // Fires when client disconnects
});
```

→ [Actinium IO: Disconnection Handler](../CLAUDE/ACTINIUM_IO_SYSTEM.md#connection-lifecycle-hooks)

```javascript
// Browser-side: Actinium.IO client (auto-configured)
import { api as Actinium } from '@atomic-reactor/reactium-api';

Actinium.IO.connect()
// Manually connect to Socket.io server

Actinium.IO.on(eventName, handler)
// Listen for server events

Actinium.IO.emit(eventName, data)
// Send event to server
```

→ [Actinium IO: Browser Integration](../CLAUDE/ACTINIUM_IO_SYSTEM.md#browser-side-integration)

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
Actinium.Collection.unregister(collection);
// Resets collection to default (private) permissions
// collection: String - Collection name
```

### Email (Mailer System)

```javascript
await Actinium.Mail.send(message);
// Sends email via configured transport (SMTP, Mailgun, SES, or sendmail)
// message: nodemailer.MailOptions - Standard nodemailer message object
// Returns: Promise<SentMessageInfo>
```

→ [Mailer System: Actinium.Mail.send()](../CLAUDE/MAILER_SYSTEM.md#actiniummailsend)

```javascript
// Message options (nodemailer)
{
    from: 'noreply@example.com' | { name: string, address: string },
    to: string | string[],
    cc?: string | string[],
    bcc?: string | string[],
    subject: string,
    text?: string,        // Plain text body
    html?: string,        // HTML body
    attachments?: [{
        filename: string,
        path?: string,
        content?: Buffer | string,
        contentType?: string
    }],
    replyTo?: string,
    priority?: 'high' | 'normal' | 'low'
}
```

→ [Mailer System: Message Options](../CLAUDE/MAILER_SYSTEM.md#core-api)

```javascript
// Hook: mailer-transport (choose email provider)
Actinium.Hook.register(
    'mailer-transport',
    async (context) => {
        context.transport = nodemailer.createTransport(config);
    },
    priority  // 0 = sendmail, 1+ = plugins
);
```

→ [Mailer System: Hook Integration](../CLAUDE/MAILER_SYSTEM.md#mailer-transport-hook)

→ [Collection Registration: Core API](../CLAUDE/COLLECTION_REGISTRATION.md#actiniumcollectionregister)

### Express Settings

```javascript
Actinium.Exp.init(app, options?)
// Configures Express app settings via app.set(key, value)
// app: Express.Application - Express instance
// options: Object (optional) - Settings object (overrides ENV.EXPRESS_OPTIONS)
```

→ [Express Settings: Core Implementation](../CLAUDE/EXPRESS_SETTINGS_SYSTEM.md#core-implementation)

```javascript
// Environment configuration
ENV.EXPRESS_OPTIONS = {
  'view engine': 'ejs', // Template engine
  views: '/path/to/views', // Template directory
  'trust proxy': true, // Enable proxy trust
  'x-powered-by': false, // Disable Express header
  etag: 'weak', // ETag generation
  'json spaces': 2, // JSON pretty-print
  'case sensitive routing': false,
  'strict routing': false,
};
```

→ [Express Settings: Configuration](../CLAUDE/EXPRESS_SETTINGS_SYSTEM.md#configuration)

```javascript
// Runtime configuration via Actinium.init()
await Actinium.init({
  'trust proxy': 1,
  'view engine': 'pug',
});
```

→ [Express Settings: Runtime Configuration](../CLAUDE/EXPRESS_SETTINGS_SYSTEM.md#runtime-configuration)

```javascript
// Hook integration for dynamic configuration
Actinium.Hook.register('init', async (app, options) => {
  app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
  app.set('view cache', process.env.NODE_ENV === 'production');
});
```

→ [Express Settings: Hook Integration](../CLAUDE/EXPRESS_SETTINGS_SYSTEM.md#hook-integration)

### Environment Configuration

```javascript
// Environment file resolution (priority order)
process.env.ACTINIUM_ENV_FILE; // 1. Explicit file path
process.env.ACTINIUM_ENV_ID; // 2. Environment ID → src/env.{id}.json
// Default: src/env.json        // 3. Default file
```

→ [Environment Config: File Resolution](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#three-tier-priority-system)

```javascript
// Configuration merge strategy
const ENV = {
  ...JSON.parse(fs.readFileSync(envFile)), // 1. Load JSON file
  ...process.env, // 2. process.env overrides
  PORT, // 3. Computed values
  SERVER_URI,
  PUBLIC_SERVER_URI,
};
```

→ [Environment Config: Merge Strategy](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#file--processenv-overlay)

```javascript
// PORT resolution logic (fallback chain)
// Standard mode:
// 1. process.env.APP_PORT
// 2. process.env.PORT
// 3. env.APP_PORT (from JSON)
// 4. env.PORT (from JSON)
// 5. DEFAULT_PORT (9000)

// PORT_VAR mode (cloud platforms):
const PORT_VAR = process.env.PORT_VAR || env.PORT_VAR;
const PORT = process.env[PORT_VAR] || env[PORT_VAR];
```

→ [Environment Config: PORT Resolution](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#complex-fallback-chain-with-port_var-indirection)

```javascript
// TLS/HTTPS configuration
ENV.APP_TLS_CERT_FILE = '/path/to/cert.pem'; // Certificate file path
ENV.APP_TLS_KEY_FILE = '/path/to/key.pem'; // Private key file path
// ENV.TLS_MODE auto-enabled if both files exist and readable
```

→ [Environment Config: TLS Configuration](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#file-based-certificate-loading)

```javascript
// Security: Master key IP whitelisting (CIDR notation)
ENV.MASTER_KEY_IPS = [
  '10.0.0.5', // Single IP
  '192.168.1.0/24', // IP range
  '::1', // IPv6 localhost
];
```

→ [Environment Config: Master Key IP Whitelisting](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#master-key-ip-whitelisting)

```javascript
// Feature flags
ENV.NO_PARSE = false; // Disable Parse Server entirely
ENV.NO_DOCS = false; // Disable API documentation
ENV.LIVE_QUERY_SERVER = true; // Enable Live Query subscriptions
```

→ [Environment Config: Feature Flags](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#conditional-service-enablement)

```javascript
// Common environment variables
ENV.DATABASE_URI; // MongoDB connection string
ENV.APP_ID; // Parse Server app ID
ENV.MASTER_KEY; // Parse Server master key
ENV.SERVER_URI; // Internal server URL
ENV.PUBLIC_SERVER_URI; // Public-facing URL
ENV.PARSE_MOUNT; // Parse Server mount path (e.g., "/api")
ENV.PARSE_DASHBOARD; // Enable Parse Dashboard
ENV.MAX_UPLOAD_SIZE; // File upload size limit
```

→ [Environment Config: Complete Variable Reference](../CLAUDE/ACTINIUM_ENVIRONMENT_CONFIGURATION.md#complete-environment-variable-reference)

### Content Management

```javascript
Actinium.Content.save(params, options)
// Create or update content
// params: { type, title, slug?, uuid?, status?, user?, data?, meta?, ... }
// options: Parse options (sessionToken or useMasterKey)
// Returns: Promise<Parse.Object>
```

→ [Content System: save() API](../CLAUDE/ACTINIUM_CONTENT_SYSTEM.md#actiniumcontentsaveparams-options)

```javascript
Actinium.Content.find(params, options)
// Query content with filters and pagination
// params: { uuid?, objectId?, title?, status?, user?, type?, slug?, limit?, page? }
// Returns: Promise<{ count, page, pages, limit, index, results }>
```

→ [Content System: find() API](../CLAUDE/ACTINIUM_CONTENT_SYSTEM.md#actiniumcontentfindparams-options)

```javascript
Actinium.Content.retrieve(params, options, create = false)
// Retrieve single content by uuid/objectId/type+slug
// params: { uuid?, objectId?, type?, slug? }
// create: Boolean - return new object if not found
// Returns: Promise<Parse.Object | undefined>
```

→ [Content System: retrieve() API](../CLAUDE/ACTINIUM_CONTENT_SYSTEM.md#actiniumcontentretrieveparams-options-create--false)

```javascript
Actinium.Content.delete(params, options)
// Soft delete (sets status='DELETE')
// Returns: Promise<{ items: Parse.Object[] }>
```

→ [Content System: delete() API](../CLAUDE/ACTINIUM_CONTENT_SYSTEM.md#actiniumcontentdeleteparams-options)

```javascript
Actinium.Content.purge(params, options)
// Hard delete (permanent removal)
// Returns: Promise<{ items: Parse.Object[] }>
```

→ [Content System: purge() API](../CLAUDE/ACTINIUM_CONTENT_SYSTEM.md#actiniumcontentpurgeparams-options)

```javascript
Actinium.Content.exists({ type, slug }, options)
// Check if content exists
// Returns: Promise<boolean>
```

→ [Content System: exists() API](../CLAUDE/ACTINIUM_CONTENT_SYSTEM.md#actiniumcontentexists-type-slug--options)

### Content Syndication

```javascript
Actinium.Syndicate.Client.create(req, options)
// Create syndication client with refresh token
// req.params: { client, user? }
// Returns: Promise<{ objectId, token, client, user }>
```

→ [Syndicate: Client.create()](../CLAUDE/ACTINIUM_SYNDICATE_SYSTEM.md#actiniumsyndicateclientcreatereq-options)

```javascript
Actinium.Syndicate.Client.token(req)
// Exchange refresh token for access token (60s expiration)
// req.params: { token } // refresh token
// Returns: Promise<{ token }> // access token
```

→ [Syndicate: Client.token()](../CLAUDE/ACTINIUM_SYNDICATE_SYSTEM.md#actiniumsyndicateclienttokenreq)

```javascript
Actinium.Syndicate.Client.verify(req)
// Verify access token validity
// req.params: { token } // access token
// Returns: Promise<Object | false> // JWT payload or false
```

→ [Syndicate: Client.verify()](../CLAUDE/ACTINIUM_SYNDICATE_SYSTEM.md#actiniumsyndicateclientverifyreq)

```javascript
Actinium.Syndicate.Content.list(req)
// Get syndicated content (requires valid access token)
// Auto-enriches with URLs via hook
// Returns: Promise<PaginatedResults>
```

→ [Syndicate: Content.list()](../CLAUDE/ACTINIUM_SYNDICATE_SYSTEM.md#actiniumsyndicatecontentlistreq)

```javascript
Actinium.Syndicate.Content.types(req)
// Get whitelisted content types (requires valid access token)
// Filtered by 'Syndicate.types' setting
// Returns: Promise<Type[]>
```

→ [Syndicate: Content.types()](../CLAUDE/ACTINIUM_SYNDICATE_SYSTEM.md#actiniumsyndicatecontenttypesreq)

### Parse Object Serialization

```javascript
Actinium.Utils.serialize(data)
// Convert Parse Object to plain JavaScript
// - Calls toJSON() on data and nested objects
// - Strips __type: 'Pointer' metadata
// - Preserves ACL objects
// - Null-safe (returns null/undefined/primitives as-is)
// Returns: PlainObject | null | undefined | Primitive
```

→ [Serialization: API](../CLAUDE/PARSE_OBJECT_SERIALIZATION.md#actiniumutilsserializedata)

### Middleware Registration

```javascript
Actinium.Middleware.register(id, callback, (order = 100));
// id: String - Unique middleware identifier
// callback: (app: Express.Application) => Promise<void>
// order: Number - Priority (lower = earlier, default 100)
```

→ [Actinium Middleware: register API](../CLAUDE/ACTINIUM_MIDDLEWARE.md#actiniummiddlewareregisterid-callback-order)

```javascript
Actinium.Middleware.registerHook(id, path?, order = 100)
// Creates hook-driven middleware ({id}-middleware hook)
// id: String - Hook name
// path: String (optional) - Express route path to scope middleware
// order: Number - Priority
```

→ [Actinium Middleware: registerHook API](../CLAUDE/ACTINIUM_MIDDLEWARE.md#actiniummiddlewareregisterhookid-path-order)

```javascript
Actinium.Middleware.replace(id, callback);
// Replaces previously registered middleware
// id: String - Middleware ID to replace
// callback: (app: Express.Application) => Promise<void>
```

→ [Actinium Middleware: replace API](../CLAUDE/ACTINIUM_MIDDLEWARE.md#actiniummiddlewarereplaceid-callback)

```javascript
Actinium.Middleware.unregister(id);
// Removes middleware from execution
// id: String - Middleware ID to remove
```

→ [Actinium Middleware: unregister API](../CLAUDE/ACTINIUM_MIDDLEWARE.md#actiniummiddlewareunregisterid)

```javascript
// Hook listener for hook-driven middleware
Actinium.Hook.register('{id}-middleware', async (mw) => {
  // mw.req - Express request
  // mw.res - Express response
  // mw.use(callback) - Chain middleware
  // mw.next() - Execute chain
  const router = express.Router();
  router.get('/route', (req, res) => {
    /* ... */
  });
  mw.req.app.use(router); // Access app via mw.req.app
});
```

→ [Actinium Middleware: Pattern 4 - Hook-Driven](../CLAUDE/ACTINIUM_MIDDLEWARE.md#pattern-4-hook-driven-middleware)

**Common priority values**:

```javascript
-100000; // Very early (body-parser, CORS, cookies, static)
0; // Parse Server middleware
100; // Default (most middleware)
```

→ [Actinium Middleware: Priority-Based Ordering](../CLAUDE/ACTINIUM_MIDDLEWARE.md#priority-based-ordering)

### Plugin Registration

```javascript
// info.js
const PLUGIN = {
  ID: 'PluginId',
  name: 'Plugin Name',
  description: 'Description',
  version: '1.0.0',
  order: 100,
};
export default PLUGIN;
```

→ [Actinium Quick Ref: Essential Plugin Structure](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#essential-plugin-structure)

```javascript
// plugin.js
const MOD = () => {
  Actinium.Plugin.register(PLUGIN, active);
};
export default MOD(); // Must call immediately
```

→ [Actinium: Plugin Registration](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#plugin-registration)
→ [Gotchas: Plugin Function Must Execute](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-13-plugin-function-must-execute)

### Hooks

```javascript
Actinium.Hook.register(
  name, // string
  callback, // async function
  priority, // number (default: Enums.priority.neutral)
  id // string (optional)
);
```

→ [Actinium Quick Ref: Hook Registration Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#hook-registration-patterns)

```javascript
Actinium.Hook.registerSync(name, callback, priority, id);
```

→ [Actinium Quick Ref: Hook Registration Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#hook-registration-patterns)

```javascript
await Actinium.Hook.run(name, ...args);
Actinium.Hook.runSync(name, ...args);
```

→ [Actinium Quick Ref: Hook Registration Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#hook-registration-patterns)

### Common Lifecycle Hooks

```javascript
Actinium.Hook.register('init', async (app, options) => {});
Actinium.Hook.register('start', async () => {});
Actinium.Hook.register('running', async () => {});
```

→ [Actinium Quick Ref: Common Lifecycle Hooks](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#common-lifecycle-hooks)

```javascript
Actinium.Hook.register('install', async (plugin, req) => {});
Actinium.Hook.register('activate', async (plugin, req) => {});
Actinium.Hook.register('schema', async (plugin, req) => {});
Actinium.Hook.register('update', async (plugin, req, oldPlugin) => {});
```

→ [Actinium Quick Ref: Common Lifecycle Hooks](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#common-lifecycle-hooks)

```javascript
Actinium.Hook.register('beforeSave', async (req) => {});
Actinium.Hook.register('beforeSave_Collection', async (req) => {});
Actinium.Hook.register('afterSave_Collection', async (req) => {});
```

→ [Actinium Quick Ref: Common Lifecycle Hooks](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#common-lifecycle-hooks)

### Cloud Functions

```javascript
Actinium.Cloud.define(
  PLUGIN.ID, // Plugin ID (enables plugin gating)
  'functionName', // Function name
  async (req) => {
    // req.params  - client parameters
    // req.user    - Parse.User (or undefined)
    // req.master  - boolean (master key in use)
    return result;
  }
);
```

→ [Cloud Functions: Registration Pattern](../CLAUDE/CLOUD_FUNCTIONS.md#registration-pattern)

```javascript
// Parse Server triggers
Actinium.Cloud.beforeSave(COLLECTION, async (req) => {});
Actinium.Cloud.afterSave(COLLECTION, async (req) => {});
Actinium.Cloud.beforeDelete(COLLECTION, async (req) => {});
Actinium.Cloud.afterDelete(COLLECTION, async (req) => {});
Actinium.Cloud.afterFind(COLLECTION, async (req) => {});
Actinium.Cloud.beforeLogin(async (req) => {});
```

→ [Cloud Functions: Hook Integration](../CLAUDE/CLOUD_FUNCTIONS.md#hook-integration)

```javascript
// Client-side call
const result = await Actinium.Cloud.run('functionName', params, options);
// options: { useMasterKey: boolean, sessionToken: string }
```

→ [Cloud Functions: Testing Strategies](../CLAUDE/CLOUD_FUNCTIONS.md#testing-strategies)

### Content Type System

```javascript
// Create content type
const type = await Actinium.Type.create(params, options);
// params: { type, machineName?, namespace?, fields, regions?, meta? }
// Returns: Type object with uuid, machineName, collection, fields, regions, meta
```

→ [Content Type: Create Type](../CLAUDE/CONTENT_TYPE_SYSTEM.md#create-type)

```javascript
// Retrieve content type
const type = await Actinium.Type.retrieve(params, options);
// params: { machineName | uuid | objectId | collection }
// Returns: Type object
```

→ [Content Type: Retrieve Type](../CLAUDE/CONTENT_TYPE_SYSTEM.md#retrieve-type)

```javascript
// Update content type
const updated = await Actinium.Type.update(params, options);
// params: { machineName | uuid, fields?, regions?, meta? }
// Returns: Updated type object
```

→ [Content Type: Update Type](../CLAUDE/CONTENT_TYPE_SYSTEM.md#update-type)

```javascript
// Delete content type (config only, not content)
const trash = await Actinium.Type.delete(params, options);
// params: { machineName | uuid }
// Returns: Recycle bin entry
```

→ [Content Type: Delete Type](../CLAUDE/CONTENT_TYPE_SYSTEM.md#delete-type)

```javascript
// List all types
const list = await Actinium.Type.list(params, options);
// params: { page?, limit?, refresh? }
// Returns: { timestamp, limit, page, pages, types: [...] }
```

→ [Content Type: List Types](../CLAUDE/CONTENT_TYPE_SYSTEM.md#list-types)

```javascript
// Get type status (collection, count, fields)
const status = await Actinium.Type.status(params, options);
// params: { machineName | uuid }
// Returns: { collection, count, fields: [...] }
```

→ [Content Type: Type CRUD Operations](../CLAUDE/CONTENT_TYPE_SYSTEM.md#type-crud-operations)

### Pagination Utilities

```javascript
// Skip-based pagination with hookedQuery
const result = await Actinium.Utils.hookedQuery(
  {
    page: 1, // Page number (1-indexed), or -1 for all pages
    limit: 50, // Items per page
    orderBy: 'createdAt',
    order: 'descending',
    queryParams: [
      // Declarative query constraints
      { method: 'equalTo', params: ['status', 'PUBLISHED'] },
      { method: 'greaterThan', params: ['createdAt', date] },
    ],
  },
  options,
  'Content_article', // Collection name
  'query-hook', // Hook to modify query
  'output-hook', // Hook to modify results
  'results', // Results key
  'ARRAY' // Results as ARRAY or OBJECT
);
// Returns: { count, page, pages, limit, prev?, next?, results }
```

→ [Pagination: HookedQuery Utility](../CLAUDE/PAGINATION_STRATEGIES.md#example-hookedquery-utility)

```javascript
// Load all pages (batch processing)
const allResults = await Actinium.Utils.hookedQuery(
  { page: -1, limit: 100 }, // page: -1 triggers load-all
  options,
  'MyCollection'
);
// Returns all records in result.results
```

→ [Pagination: Load-All Pattern](../CLAUDE/PAGINATION_STRATEGIES.md#2-load-all-pattern-skip-incrementation)

**Note**: For cursor-based pagination (large datasets), see manual implementation pattern:
→ [Pagination: Cursor-Based Pattern](../CLAUDE/PAGINATION_STRATEGIES.md#3-cursor-based-pagination-recommended-for-scale)

### Cloud Function Security

```javascript
const {
  CloudRunOptions,
  MasterOptions,
  CloudCapOptions,
  CloudHasCapabilities,
} = Actinium.Utils;

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
const options = CloudCapOptions(
  req,
  ['Setting.retrieve', 'setting.site-get'],
  false
);
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
    { permission: 'write', type: 'user', objectId: user.id, allow: true },
  ],
  'read-score', // Roles with this capability get read access
  'write-score' // Roles with this capability get write access
);

object.setACL(acl);
```

→ [Cloud Functions: CloudACL](../CLAUDE/CLOUD_FUNCTIONS.md#cloudacl---generate-acl-from-permissions)

```javascript
// AclTargets - Get users and roles for ACL selectors
const { AclTargets } = Actinium.Utils;

const targets = await AclTargets({
  master: true,
  params: { search: 'admin', cache: true },
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
    excluded: ['role3'],
  },
  priority
);
```

→ [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)

### Database & Schema

```javascript
Actinium.Collection.register(
  'CollectionName',
  {
    // Actions (maps to capabilities)
    create: true,
    retrieve: true,
    update: true,
    delete: true,
    addField: false,
  },
  {
    // Schema definition
    fieldName: {
      type: 'String',
      required: true,
      default: 'value',
    },
    pointerField: {
      type: 'Pointer',
      targetClass: '_User',
    },
  }
);
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
);
```

→ [Patterns: Middleware Priority Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-13-middleware-priority-pattern)

### Global Variables

```javascript
Actinium; // Main framework object
ENV; // Environment configuration
PORT; // Server port
BASE_DIR; // Project root
SRC_DIR; // src/ directory
APP_DIR; // src/app/ directory
CORE_DIR; // actinium-core directory
CLOUD_FUNCTIONS; // Cloud function registry
```

→ [Actinium Quick Ref: Global Variables Available](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#global-variables-available)

```javascript
DEBUG(...args); // Threshold: 1000
INFO(...args); // Threshold: 500
BOOT(...args); // Threshold: 0
WARN(...args); // Threshold: -500
ERROR(...args); // Threshold: -1000
LOG(...args); // Alias for BOOT
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
  param2: 'value2',
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
  const { Hook, Enums, Component } = await import(
    '@atomic-reactor/reactium-core/sdk'
  );

  Hook.register(
    'plugin-init',
    async () => {
      const { MyComponent } = await import('./MyComponent');
      Component.register('MyComponent', MyComponent);
    },
    Enums.priority.neutral,
    'plugin-init-MyComponent'
  );
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
