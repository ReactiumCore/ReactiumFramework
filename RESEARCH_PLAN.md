# Reactium/Actinium Framework Research Plan

Topics for future exploration sessions with specialized agents.

## Completed Research

- ✅ **Browser SDK React Hooks & Utilities** - Cataloged 16 React hooks and 13 browser utilities from `@atomic-reactor/reactium-sdk-core/browser`
- ✅ **Hook System Domains** - Comprehensive deep dive into domain functionality, use cases, patterns, and lifecycle management (Nov 21, 2025)
- ✅ **Zone System Deep Dive** - Complete analysis of Zone architecture, filters/mappers/sorters, zone patterns from core plugins, performance optimization strategies, and best practices (Nov 22, 2025)
- ✅ **Documentation Structure Cleanup** - Resolved REACTIUM_CONTEXT.md broken references, verified documentation accuracy (Nov 22, 2025)
- ✅ **Actinium Capabilities System** - Complete deep dive into capability vs ACL architecture, role-based authorization, built-in vs custom capabilities, server/client implementation patterns, Parse Server integration, and workflow capabilities (Nov 22, 2025)
- ✅ **Routing System Architecture** - Complete lifecycle from file discovery to route registration, register-route hook modification patterns, transition state machine (EXITING→LOADING→ENTERING→READY), code splitting via dynamic imports, loadState data preloading, and Handle-based state management (Nov 22, 2025)
- ✅ **ReactiumWebpack SDK** - Hook-driven webpack configuration system, WebpackSDK class with registry-based architecture (rules, plugins, externals, ignores, aliases, transpiled dependencies), core methods (addRule, addPlugin, addIgnore, etc.), optimization helpers, property getters/setters, Hook system integration (before-config, after-config, registry hooks), DDD discovery pattern via reactium-webpack.js, migration path from webpack.override.js to Hook-based pattern, real examples from TypeScript support and core plugins, common customizations, best practices, and gotchas (Nov 22, 2025)
- ✅ **Registry System Architecture** - Foundational pattern for ordered, priority-based collections; two operational modes (CLEAN vs HISTORY); protection/banning mechanisms; subscription notifications; real-world usage in routing, webpack, middleware, gulp, babel; comparison with specialized implementations (Hook, Component, Zone use custom approaches); type-safe TypeScript implementation with deep path access; comprehensive testing patterns (Nov 23, 2025)
- ✅ **SDK Extension Pattern (Browser-Side)** - Complete pattern documentation for extending Reactium SDK via `sdk-init` hook; two approaches (Direct Extension vs APIRegistry); SDK Proxy fallback chain mechanism; all core plugins cataloged (User, API, Capability, Role, Setting, ServiceWorker, GraphQL); real examples with source references; lifecycle integration; best practices and gotchas (Nov 23, 2025)
- ✅ **AppContext Provider System** - React Context provider registration system via `app-context-provider` hook; Registry-based architecture using registryFactory; provider composition and nesting order (lower priority = outer wrapper); lifecycle integration (fires after plugin-ready, before ReactDOM render); real examples from Apollo, Redux, Material-UI; priority-based ordering; dynamic registration support; SSR compatibility; best practices and common gotchas (name collisions, ID field confusion, priority reversal, missing provider property); comprehensive use cases for integrating context-dependent libraries (Nov 23, 2025)
- ✅ **hookableComponent System** - Complete pattern for replaceable/extensible components via Component Registry; useHookComponent hook retrieves from RegisteredComponents (ReactiumSyncState singleton); hookableComponent factory creates wrapper components; registration patterns (core components on init, plugins on plugin-init); component replacement strategy (same ID, later priority wins); integration with routing (string component resolution); lifecycle timing (init→plugin-init→routes-init); real-world use cases (theming, A/B testing, feature flags, error boundaries); replacement patterns for AppParent, NotFound, Router; props forwarding; code splitting best practices; TypeScript support; critical bug fix (Enums.priority.neutral not .normal); non-reactive updates gotcha; all core components cataloged (AppParent, NotFound, RoutedContent, AppContent, Router); complete source references (Nov 23, 2025)
- ✅ **Handle System Architecture** - Global component communication registry with publish-subscribe model; singleton ReactiumHandle instance with object-path addressing; five React hooks (useHandle, useSyncHandle, useRegisterHandle, useRegisterSyncHandle, useSelectHandle); integration with ReactiumSyncState for observable state; routing data loading pattern with automatic cleanup; handle lifecycle tied to component lifecycle; performance optimization with selective subscriptions; comparison with Context/Redux/MobX; real-world patterns (global state, plugin communication, route data loading, component instance control); common gotchas (useHandle vs useSyncHandle confusion, handle not yet registered, deps array omission, direct mutation); best practices (naming conventions, type safety, documentation); debugging techniques; comprehensive source references from reactium-sdk-core/src/browser/Handle.ts and routing system (Nov 23, 2025)
- ✅ **Component Binding and DOM Integration** - Multi-root React 18 architecture using data-reactium-bind attribute; hook-driven discovery via component-bindings hook; dynamic component resolution through hookableComponent; SSR-compatible with server-rendered bind points and client hydration; plugin-extensible bind point registration; lifecycle integration (plugin-init → component-bindings → app-bindpoint → ReactDOM render); AppContexts wrapper for all bind points; main App bind point special handling; real-world use cases (DevTools, admin toolbars, embedded widgets, plugin UI injection); performance considerations (multiple reconciliation trees, isolated re-renders); comparison with Zones and Portals; common gotchas (component not registered before binding, bind point markup missing from server, dynamic bind points not discovered); best practices (use zones for in-app UI, reserve bind points for independent apps, capability-gate sensitive UI); debugging techniques; comprehensive source references from reactium-core/app/index.jsx and server/renderer (Nov 23, 2025)
- ✅ **ReactiumSyncState Deep Dive** - Foundational observable state pattern extending EventTarget; object-path addressing with get/set/del/insert API; event lifecycle (before-set → set → change, before-del → del, before-insert → insert); smart merging with hook-extensible conditions (use-sync-state-merge-conditions); extend() method for custom instance methods; integration with useSyncState hook, global State singleton, RegisteredComponents registry, Handle system, routing handles; real examples from StateLoader component, RoutedContent routing sync, State.registerDataLoader extension; comparison with useState/MobX/Redux; best practices (event selection, namespacing, batching, cleanup); common gotchas (change event not firing, array replacement, reset without events, direct mutation, noMerge scope, path confusion, listener ID collision); performance considerations (event overhead, deep equality, memory leaks); comprehensive source references from reactium-sdk-core/src/browser/ReactiumSyncState.ts:68-532 (Nov 23, 2025)
- ✅ **ComponentEvent System** - Type-safe custom event class providing payload flattening, prototype pollution protection, and framework-wide event communication backbone; extends CustomEvent with automatic property spreading (access event.prop instead of event.detail.prop); property collision resolution (prefixes with __ when property exists); reserved property removal (type/target); integration with ReactiumSyncState.dispatch(), useEventEffect hook, global State, Component registry, Handle system; real-world patterns from core plugins; common event naming conventions; comparison with native CustomEvent and React SyntheticEvent; comprehensive source references from reactium-sdk-core/src/browser/Events.ts:21-78 (Nov 23, 2025)
- ✅ **Reactium Style Partial System** - Registry-based SCSS partial discovery and aggregation system with priority-based compilation order (VARIABLES → MIXINS → BASE → ATOMS → MOLECULES → ORGANISMS → OVERRIDES); hook-driven extensibility (ddd-styles-partial, ddd-styles-partial-glob hooks); auto-discovery of _reactium-style*.scss files; Atomic Design System integration; dynamic path transformation for workspace modules (reactium_modules/ → + prefix); multi-level sorting (directory, filename, numeric, priority); plugin style injection patterns; real-world usage from core plugins; comprehensive source references from Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:559-770 and gulp.bootup.js:15-23 (Nov 23, 2025)
- ✅ **Prefs System Architecture** - Simple localStorage wrapper with object-path addressing for persistent client-side preferences; NOT reactive (manual React state sync required); NOT cross-tab synchronized (no storage events); SSR-safe with window checks; automatic JSON serialization; factory method for isolated instances; TypeScript generic support; real-world patterns: component state persistence, user preference sync with User.Pref API, sidebar/panel size persistence; integration with Hook system for lifecycle events; comparison with ReactiumSyncState/Redux/Context for appropriate use cases; comprehensive source references from reactium-sdk-core/src/browser/Prefs.ts:1-67 and admin plugin usage (Nov 26, 2025)
- ✅ **User.Pref API and Server-Side Preference Sync** - Complete server-backed preference system for cross-device sync; Parse Server `_User.pref` field with object-path addressing; server-side API (Actinium.User.Pref.update/delete) via cloud functions (user-pref-update, user-pref-delete); client-side SDK (User.Pref.update/delete); login/logout sync pattern (user.before.logout → save to server, user.auth → restore to localStorage); hook integration (user-before-pref-save, user-pref-save-response); MasterKey security for user-scoped access; real-world patterns: multi-device theme sync, component state persistence, admin dashboard settings; comparison with Prefs (local) and User.Meta (metadata); common gotchas: object-path key ambiguity, sensitive field filtering, no built-in conflict resolution, last-write-wins strategy; comprehensive source references from actinium-core/lib/user.js:617-747, actinium-users/plugin.js:203-212, reactium-user/sdk/index.js:501-557, reactium-admin-core/User/reactium-hooks.js:140-172 (Nov 26, 2025)
- ✅ **Server-Side Rendering (SSR) Architecture** - Template-driven FEO (Front-End Only) system with hook-extensible registries; request-scoped registries (AppHeaders, AppScripts, AppStyleSheets, AppBindings, AppGlobals, AppSnippets) using CLEAN mode; template discovery with semver compatibility (local override or core template); hook lifecycle (Server.beforeApp → AppGlobals → AppHeaders → AppScripts → AppStyleSheets → AppBindings → AppSnippets → Server.afterApp); webpack asset auto-discovery (dev mode from devMiddleware, prod mode from webpack-manifest.json); theme-based stylesheet selection via query param or DEFAULT_THEME env; bind point markup generation (component string, static markup, or template function); global serialization with serialize-javascript; real-world patterns: dynamic SEO meta tags, conditional analytics, user-specific initial state, theme-based loading, A/B test variants; comprehensive source references from reactium-core/server/renderer/index.mjs:1-654 and server/template/feo.js:1-26 (Nov 26, 2025)
- ✅ **Pulse System Architecture** - Registry-based recurring task scheduler for background operations; PulseTask class with retry logic, progress tracking, and lifecycle control (start, stop, reset, retry); task state machine (READY → RUNNING → STOPPED/ERROR); configurable options (attempts, autostart, delay, repeat, debug); PulseSDK singleton with object-path registry (register, unregister, get, start, stop, startAll, stopAll); async-first design with error handling (onSuccess, onError callbacks); real-world use cases: API polling, auto-save drafts, progress tracking, exponential backoff retry, conditional task control (pause on tab hidden); React hook integration patterns; TypeScript generic support for type-safe params; comparison with setInterval/setTimeout/Promises; common gotchas: parameter capture at registration, progress always 0 for infinite tasks, retry logic per-execution not task-level, stop while running waits for completion; comprehensive source references from reactium-sdk-core/src/core/Pulse/index.ts:1-644 (Nov 26, 2025)
- ✅ **Parse Server Cloud Function Patterns** - Complete cloud function anatomy and lifecycle documentation; registration pattern via Actinium.Cloud.define(); security helpers (CloudRunOptions, MasterOptions, CloudCapOptions, CloudHasCapabilities); ACL generation via CloudACL with capability-based role access; AclTargets helper for user/role selection; req object structure (params, user, master, original); session token propagation and privilege escalation (super-admin, level-based, capability-based); parameter validation patterns (required, type, object-path, entity existence); error handling patterns (throw Error, Promise.reject, conditional rejection, hook validation); hook integration (beforeSave, afterSave, beforeDelete, afterDelete, afterFind); testing strategies (manual with Cloud.run, master key, session token); real-world examples from Users, Roles, Settings, Type plugins; best practices and common gotchas (MasterOptions vs CloudRunOptions confusion, capability checks, ACL application, validation order, async hook awaiting, session token loss); comprehensive source references from actinium-core/lib/utils/options.js:1-201, actinium-core/lib/utils/acl.js:1-298, actinium-users/plugin.js, actinium-roles/plugin.js, actinium-settings/plugin.js (Nov 26, 2025)

## Pending Research Topics

### High Priority

1. Collection Registration and Schema Management

   - **Discovered during**: Cloud Function research - noticed Actinium.Collection.register() pattern in every plugin but schema management and CLP configuration never documented comprehensively
   - **Why it matters**: Collection registration defines Parse Server schema, default permissions (CLP), indexes, and capability mappings - critical for data modeling and security
   - **Current gap**: Actinium.Collection.register() API, schema field types, index configuration, CLP generation from capabilities, collection-clp hook, schema migration patterns not documented
   - **Key mechanisms**:
     - Actinium.Collection.register(name, actions, schema, indexes)
     - Action flags (create, retrieve, update, delete, addField) map to CLPs
     - Schema field definitions (type, required, default, etc.)
     - Index arrays for query optimization
     - collection-clp hook for CLP customization
     - Capability-to-CLP mapping pattern
     - Schema validation and evolution
   - **Real usage**: Every Actinium plugin registers collections (Users, Roles, Settings, Type, Content)
   - **Integration**: Works with Capability system, CloudACL, Parse Server schema API
   - **Critical for**: Data modeling, query optimization, security configuration, schema versioning

2. Webpack Manifest Generation and Asset Management

   - **Discovered during**: SSR research - noticed webpack-manifest.json critical for production but generation process undocumented
   - **Why it matters**: Understanding webpack build output, chunk splitting, and asset manifest is essential for production deployments
   - **Current gap**: How webpack-manifest.json is generated, chunk naming strategies, code splitting configuration, asset optimization not documented
   - **Key mechanisms**:
     - Webpack manifest plugin configuration
     - Chunk naming conventions
     - Code splitting strategies (route-based, vendor, common)
     - Asset hash generation for cache busting
     - webpack-server-assets hook for manifest manipulation
     - Development vs production webpack configs
     - Source maps and debugging in production
   - **Real usage**: `webpack-manifest.json` consumed in SSR renderer, webpack config in reactium-webpack.js files
   - **Integration**: Works with SSR system, routing code splitting, HMR in development
   - **Critical for**: Production builds, CDN deployment, cache invalidation, debugging
   - **Research scope**: Manifest generation, webpack config patterns, chunk optimization, real-world build configurations

3. Testing Strategies & Patterns

- Critical gap for production apps
- Need guidance on testing DDD artifacts, plugins, Handle-based state

### Medium Priority

4. **Collection Registration**

   - Identify how Parse Collections are registered
   - How collection permissions are registered
   - How capabilities are mapped
   - Actinium specific extensions to Parse collections

7. **Parse Server ACL Patterns in Actinium**

   - CloudACL utility usage patterns
   - Combining ACLs with capabilities
   - Object-level vs feature-level permissions
   - AclTargets cloud function
   - Parse CLP configuration from capabilities

8. **Actinium Roles System Deep Dive**

   - Role levels and hierarchy
   - Role relations (roles containing roles)
   - User-role assignment patterns
   - Built-in roles (super-admin, administrator, banned, anonymous)
   - Role cache management

9. **Manifest Generation Process**

   - `manifest-tools.js` internals
   - Globby patterns for DDD artifacts
   - How to extend manifest scanning
   - Custom artifact types

10. **Plugin Dependency Resolution**

- How `pluginDependencies` array works
- Order vs dependencies
- Circular dependency handling
- Plugin activation/deactivation flow

11. **Middleware Auto-Discovery (Actinium)**

- File patterns for middleware discovery
- Priority-based registration
- Express app configuration hooks
- Common middleware patterns

12. **Content Type System Architecture**

- Type registration and schema
- Field type plugins
- Dynamic capability generation
- Content UUID generation (namespace patterns)
- Type-specific routes

### Lower Priority

13. **Parse Server Integration**

    - Session management patterns (user context propagation)
    - Live Query setup and usage
    - Advanced proxy configuration patterns
    - Parse SDK initialization flow

14. **Component Registry Patterns**
    - Dynamic component replacement
    - Plugin-based component overrides
    - Versioning components
    - Component decoration

## RESEARCH MODE DIRECTIVES

### DIRECTIVE 1: Topic Selection (Pre-Research)

**BEFORE starting any research topic, evaluate it against this criterion:**

> "Will this help Claude Code assist developers more effectively?"

**✅ RESEARCH if the topic:**

- Helps understand codebase architecture deeply
- Enables more accurate guidance to developers
- Supports effective debugging of issues
- Reveals framework patterns for better code generation
- Explains complex system interactions
- Addresses critical knowledge gaps

**❌ SKIP/REMOVE if the topic:**

- Contains trivial implementation details easily found in source
- Covers rarely used edge-case features
- Is self-explanatory from API signatures
- Is better learned through experimentation than documentation

**ACTION**: If you determine a topic is trivial during evaluation, REMOVE it from the research plan immediately.

### DIRECTIVE 2: Self-Sustaining Research (Post-Research)

**IMMEDIATELY after finishing research on ANY deep dive topic:**

1. Reflect on what new questions emerged during your research
2. Identify **ONE** new Claude-relevant topic you discovered that would help Claude as a developer
3. Add that topic to this research plan under the appropriate priority level
4. Include a clear rationale: "Discovered during [previous topic] research - [why it matters]"

**RATIONALE**: This keeps the research process self-sustaining and ensures emerging knowledge gaps are captured while context is fresh.

**ACTION**: Do not mark research as "complete" until you have added the next topic.

### DIRECTIVE 3: Research Execution

**During research, you MUST:**

- Keep explorations focused and time-boxed
- Document findings concisely in CLAUDEDB/ directory
- Include real code examples from actual framework usage (not hypothetical)
- Note **patterns**, not just APIs
- Identify common pitfalls and gotchas
- Cross-reference related systems and documentation

**During research, you MUST NOT:**

- Create hypothetical examples when real ones exist
- Document every API method exhaustively
- Include trivial details that don't aid understanding
- Drift into tangential topics without adding them to the plan

### DIRECTIVE 4: Research Output Requirements

**Each research session MUST produce:**

1. **CLAUDEDB markdown file** - Concise, scannable, focused on patterns
2. **Real code examples** - From actual framework usage in core plugins
3. **Best practices section** - What Claude should recommend
4. **Common gotchas section** - What Claude should warn about
5. **Updated RESEARCH_PLAN.md** - Topic marked complete, new topic added

**File naming convention**: `CLAUDEDB/[TOPIC_NAME]_DEEP_DIVE.md` or `CLAUDEDB/[SYSTEM_NAME]_ARCHITECTURE.md`

**Quality check**: Before finishing, ask "Would this document help Claude Code write better Reactium/Actinium code?"
