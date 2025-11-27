# Reactium/Actinium Framework Research Plan

Topics for future exploration sessions with specialized agents.

## Completed Research

- ✅ **Collection Registration and Schema Management** - Complete Parse Server collection registration system with CLP generation from capabilities, schema field types (String, Number, Pointer, Relation, File, etc.), index configuration, hook integration (collection-clp, collection-indexes, collection-before-permissions), dynamic CLP updates on capability changes, field deletion patterns, real-world examples from Settings/Type/Content/Roles collections; discovered during Cloud Function research - critical for data modeling and security configuration (Nov 26, 2025)
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
- ✅ **Parse Server Query Patterns and Performance** - Complete query construction patterns with hookedQuery system, compound queries (Parse.Query.or), pointer optimization (include/select), pagination strategies (skip/limit vs load-all-pages), query constraints reference (25+ methods), caching strategies (Actinium.Cache pattern, roles cache, acl-targets cache), session token propagation via CloudRunOptions, sorting patterns (single/multi-field), performance best practices (avoid deep skip, cache stable data, index queried fields), common query patterns (type+slug lookup, status filter, user relation filter), relation querying (role users/roles), HookedQuery hook integration (query/output hooks), standardized queryParams declarative pattern, cache invalidation on afterSave hooks, testing with Cloud.run; discovered during research: Actinium.Cache implementation with object-path support and TTL, decorateRoles pattern for relation hydration, need for cursor-based pagination documentation; comprehensive source references from actinium-core/lib/utils/hookedQuery.js:1-167, actinium-content/sdk.js:55-145, actinium-users/plugin.js:87-102, actinium-core/lib/utils/acl.js:83-130, actinium-core/lib/cache.js:1-103, actinium-core/lib/roles.js:66-159 (Nov 26, 2025)
- ✅ **Testing Strategies and Patterns** - Complete testing architecture for Reactium/Actinium applications; Jest configuration with ts-jest, React Testing Library, jsdom; testing Hook system (register, run, unregister, domain cleanup, async execution, argument passing, return value structure); testing Registry system (registration, subscription notifications, protection/banning, deep path access, CLEAN vs HISTORY modes); testing Handle system (useRegisterHandle/useHandle communication, TypeScript generics); testing React hooks (useSyncState, custom hooks with test components); testing cloud functions (Cloud.run manual testing, master key testing, session token propagation testing); testing DDD artifacts (plugin lifecycle, component binding, route registration); integration testing (hook pipelines, cache invalidation); best practices (test isolation, TypeScript type safety, data-testid usage, async operation handling, side effect cleanup); common gotchas (not awaiting async hooks, forgetting unregister, testing implementation vs behavior, not mocking Parse Server); test infrastructure (package.json scripts, jest.config.js, coverage requirements); comprehensive source references from reactium-sdk-core/test/*.test.ts*, jest.config.js:1-8, package.json:24-72; discovered during research: need for Parse SDK mocking patterns, SSR testing environment requirements, E2E testing patterns for full user workflows (Nov 26, 2025)
- ✅ **Actinium Roles System Deep Dive** - Complete role-based access control architecture; built-in role hierarchy (banned:-1, anonymous:0, user:1, contributor:10, moderator:100, administrator:1000, super-admin:10000); role relations and inheritance (Parse.Role users/roles relations, getRoles().add() pattern); user-role assignment (role-user-add/remove cloud functions, getUsers().add/remove() API); role cache management (Actinium.Cache 'roles' key, decorateRoles pattern with user/role lists, afterSave cache invalidation); user role retrieval (Roles.User.get single user, Roles.User.getMany batch lookup, implicit anonymous role); role authorization checks (Roles.User.is by name/level, beforeLogin banned check); role ACL protection (default public read/write, role-specific restricted write via acl array, beforeSave/beforeDelete protected role enforcement for anonymous); role creation/removal (role-create/role-remove cloud functions, role initialization with DEFAULTS); collection registration (capabilities for _Role.create/retrieve/update/delete/addField); cache-first pattern for performance; level-based privilege comparison; comprehensive source references from actinium-core/lib/roles.js:1-304, actinium-roles/plugin.js:1-300; discovered during research: role ACL pattern for self-protecting roles, need for cursor-based pagination documentation for large role lists, ENV.ROLES configuration pattern for custom default roles (Nov 26, 2025)

## Completed Research

- ✅ **Cursor-Based Pagination Pattern** - Complete guide to skip-based vs cursor-based pagination strategies; skip-based framework patterns (hookedQuery, content.find, load-all with while loop); cursor-based implementation patterns (forward, bidirectional); performance comparison (skip degrades at high offsets, cursor O(1)); edge cases (duplicate timestamps with objectId tiebreaker, deletion handling, cursor encoding); integration with framework (custom cloud functions, not compatible with hookedQuery); real examples from search indexing, content pagination, recycle bin; best practices for choosing strategy based on dataset size and use case; discovered during research: Plugin dependency system does not exist (order field only), need for middleware auto-discovery documentation (Nov 26, 2025)
- ✅ **Content Type System Architecture** - Complete type-as-schema system documentation; UUID v5 namespacing for cross-environment consistency (machineName + namespace → uuid); collection auto-generation (Content_{machineName}); field structure (fieldId, fieldName, fieldType, region); pluggable field types via hooks; region-based UI layout; Type CRUD operations (create, retrieve, update, delete, list); immutable properties (uuid, machineName, collection, namespace) enforced by beforeSave hook; automatic schema creation via type-saved hook; built-in type registry (DEFAULT_TYPE_REGISTRY) for plugin-provided types; cloud functions (type-create, type-retrieve, type-update, type-delete, type-status, types); capability model (Type.* for type operations, Content_*.* for content operations registered separately); integration with Collection Registration system; hooks (type-saved, type-deleted, type-retrieved, collection-before-load); gotchas (type deletion doesn't delete content/schema, field deletion requires manual schema update, namespace immutability, machineName slugification collisions); comprehensive source references from actinium-core/lib/type/index.js, actinium-type/plugin.js; discovered during research: Need for middleware auto-discovery pattern documentation (Express middleware registration in Actinium) (Nov 26, 2025)

- ✅ **Middleware Auto-Discovery (Actinium)** - Complete Express middleware registration system with globby-based file discovery (ENV.GLOB_MIDDLEWARE patterns), priority-based sequential execution via ActionSequence, registration API (register, registerHook, replace, unregister), HookMiddleware wrapper class for hook-driven extensibility, lifecycle integration (fires after Exp.init, before Plugin.init), real-world examples from core middleware (body-parser, CORS, cookie-session, Parse Server, static assets, docs, morgan), common patterns (NPM wrapper, router-based, conditional, hook-driven, async), environment configuration, priority ordering (-100000 = early, 0 = Parse Server, 100 = default), replacement/unregister mechanisms, comprehensive source references from actinium-core/lib/middleware.js:1-133, actinium-core/actinium.js:77-87, actinium-core/globals.js:62-68, all core middleware files; discovered during research: Express Router patterns for route grouping, need for Express Settings (Actinium.Exp) documentation covering view engine, trust proxy, and other Express configuration (Nov 27, 2025)

## Pending Research Topics

### High Priority

### Medium Priority

1. **Express Settings System (Actinium.Exp)**

   - **Discovered during**: Middleware Auto-Discovery research - noticed Actinium.Exp.init() fires before middleware, need to understand Express app configuration
   - **Why it matters**: Critical for understanding Express app initialization, view engine setup, trust proxy configuration, and other Express settings that affect middleware and routing
   - **Current gap**: How Actinium.Exp configures Express app, what settings are available, how to customize Express configuration, integration with middleware system
   - **Key mechanisms**:
     - Express app configuration API
     - Default settings (views, view engine, x-powered-by)
     - Hook integration for custom settings
     - Environment-based configuration
   - **Real usage**: Custom view engines, trust proxy for load balancers, static file serving configuration, custom Express settings
   - **Integration**: Middleware system (runs before middleware), Hook system
   - **Critical for**: Building Actinium applications with custom Express configuration, understanding server initialization sequence

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
