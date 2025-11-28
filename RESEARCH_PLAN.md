# Reactium/Actinium Framework Research Plan

Topics for future exploration sessions with specialized agents.

## Completed Research

- ✅ **CLI Command Discovery and Extensibility System** - Complete command discovery architecture with globby-based multi-location discovery (root/project/workspace modules/NPM packages), two-phase initialization (shortInit for performance vs longInit for comprehensive discovery), required command exports (NAME/COMMAND/ID), hook integration patterns (arcli-hooks.js global vs reactium-arcli.js command-specific), Commander.js registration, ActionSequence pattern, workspace module support (reactium_modules/.cli, actinium_modules/.cli, node_modules/.cli), config-driven discovery paths with depth limits, hook-driven extensibility for input/conform/confirm/actions phases, real examples from core plugins (component, route, init commands), debugging techniques, best practices; discovered during research: Template system integration for file generation (handlebars-based), Generator pattern abstraction (need to document template discovery and variable substitution), NPM package scaffolding patterns (init command downloads/extracts repos); critical for building custom tooling, reusable CLI packages, project-specific commands, debugging discovery issues (Nov 27, 2025)
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

- ✅ **Express Settings System (Actinium.Exp)** - Complete Express app configuration system documentation; initialization sequence (runs after Express app creation, before middleware); ENV.EXPRESS_OPTIONS configuration via JSON environment variable; app.set() wrapper with boot logging; default settings (view engine: ejs, views: APP_DIR/view, x-powered-by: false); runtime override via Actinium.init(options) parameter; hook integration via 'init' hook for dynamic configuration; common settings reference (trust proxy, view engine, view cache, etag, json spaces, case sensitive routing); real-world patterns (load balancer trust proxy, custom template engines, environment-specific config, multi-tenant subdomains); integration with middleware system (settings MUST apply before middleware); best practices (trust proxy behind reverse proxies, security headers, environment variables); common gotchas (settings applied too late, JSON parsing in env vars, trust proxy misconfiguration, view engine registration order); debugging techniques; comprehensive source references from actinium-core/lib/express-settings.js:1-16, actinium-core/actinium.js:77-101, actinium-core/globals.js:70-74,109-111; discovered during research: Express Router patterns for route grouping in middleware (docs/middleware.js uses express.Router()), need for API organization and versioning patterns documentation (Nov 27, 2025)

- ✅ **Actinium Environment-Specific Configuration System** - Complete environment file resolution and configuration management system; three-tier priority (ACTINIUM_ENV_FILE → ACTINIUM_ENV_ID → src/env.json); process.env overlay pattern (process.env overrides file values); complex PORT resolution with PORT_VAR indirection for cloud platforms; fallback chain (APP_PORT → PORT → env.APP_PORT → env.PORT → 9000); SERVER_URI/PUBLIC_SERVER_URI auto-generation with lazy port adjustment; development template auto-generation (env.def.json → env.dev.json); string-to-type normalization (stringToBoolean, stringToObject); Parse Server configuration integration; TLS/HTTPS file-based certificate loading (APP_TLS_CERT_FILE, APP_TLS_KEY_FILE); security patterns (MASTER_KEY_IPS CIDR whitelisting, Parse Dashboard authentication); feature flags (NO_PARSE, NO_DOCS, LIVE_QUERY_SERVER); real-world multi-environment examples (dev/staging/prod); Docker/container deployment patterns; complete ENV variable reference; comprehensive source references from actinium-core/boot.js:8-186, actinium-core/globals.js:30-148, actinium-core/middleware/parse/middleware.js:8-122; discovered during research: FileAdapter proxy pattern for Parse Server file handling (actinium-core/lib/files-adapter.js) - need to document pluggable file storage backends (S3, GridStore, GCS) and hook-driven file processing pipeline (Nov 27, 2025)

- ✅ **CLI Commands Reference and Workflow Guide** - Complete workflow-oriented command documentation with decision trees; command categories (project init, Reactium frontend, Actinium backend, config, package management); detailed documentation of 15+ commands (init, auth, component, route, style, hook, domain, label, install, update); workflow patterns for common tasks (creating pages, adding routes, plugin development, multi-route components); decision trees ("I want to create..." → command recommendation); command integration points (Hook system, Template system, DDD discovery, style partials); real-world examples from all core commands; flags and options reference; best practices (use labels for common paths, generate complete pages, organize routes); common gotchas (component name casing, route format, init overwrites, style prefix compilation order, hooks file registration, auth persistence, label scope); debugging techniques (command not found, template issues, wrong file location, route discovery); comprehensive source references from CLI/commands/*/index.js, Reactium-Core-Plugins/.cli/commands/reactium/*/reactium-arcli.js, component/route/style generators; discovered during research: ActionSequence pattern needs documentation (generator wrapper, sequential execution, error propagation), Custom handlebars helpers registration pattern for project-specific template transformations (Nov 27, 2025)

- ✅ **CLI Template System and Generator Pattern** - Complete handlebars-based template generation system documentation; template engine bootstrap (handlebars in global arcli object); template directory structure conventions (command/template/*.hbs files); variable substitution patterns ({{variable}} escaped, {{{variable}}} unescaped for JSON/arrays); generator abstraction wrapping ActionSequence with consistent error handling and spinner feedback; component generator pattern with conditional file creation (hooks/domain/route/style flags control generation); hook-driven file transformation via arcli-file-gen hook; template discovery via __dirname relative paths; real-world template examples (functional component, route definition, component registration, domain declaration, CLI command scaffolding); variable transformation helpers (CONFORM functions for name→PascalCase, className→lowercase, route formatting); init command special pattern (NPM package download/extract with decompress, not templates); overwrite protection with inquirer prompts; best practices (triple-brace for unescaped, sensible defaults, conditional generation, transform params before templates, descriptive names, organize by command, document variables, handle overwrites, hook extensibility, ensure directories exist); common gotchas (escaped vs unescaped, .hbs extension required, undefined context variables, path resolution, hook return values, conditional flags, file encoding UTF-8, ActionSequence error propagation, template variable casing, compilation caching); debugging techniques (verify template content, inspect params, test compilation, check path resolution, test hooks); integration with CLI command system (command structure, NAME/COMMAND/ID exports, actions with template generation); comprehensive source references from CLI/bootstrap.js:3,53, CLI/lib/generator.js:1-20, component/route/style generators, template directories; discovered during research: Need for ActionSequence pattern documentation (sequential action execution, error handling, options passing) - foundational to generator pattern (Nov 27, 2025)

## Completed Research

- ✅ **ActionSequence Pattern and Sequential Action Execution** - Complete NPM package documentation (action-sequence@^1.1.2); sequential async operation execution with shared context object; action function signature ({ params, props, action, context, prevAction }); return value accumulation in context object; Promise-based API with error propagation; real-world patterns: generator wrapper for CLI commands, middleware priority-based execution, plugin post-install hooks, multi-step workflows with spinner feedback; integration with CLI command system, middleware auto-discovery, plugin lifecycle; comparison with Promise.all(), async/await chains, and Hook system; best practices for action naming, spinner integration, options object pattern, error propagation, action merging; common gotchas: sequential not parallel execution, context access, return value defaults, error stopping sequence, shared closure variables, spinner state during prompts; comprehensive source references from CLI/lib/generator.js:1-20, CLI/commands/*/generator.js, actinium-core/lib/middleware.js:49-101, CLI/commands/package/install/actions.js:206-224; discovered during research: CLI command hook integration patterns (arcli-install.js, arcli-publish.js) - need to document plugin CLI extensibility pattern for custom installation/publishing workflows (Nov 27, 2025)

- ✅ **Plugin CLI Extensibility Pattern (arcli-install.js / arcli-publish.js)** - Complete plugin CLI workflow extension system documentation; arcli-install.js pattern for post-install setup (discovered via globby in plugin directory after extraction, factory signature receives spinner/arcli/params/props, actions namespaced as postinstall_{i}_{key}); arcli-publish.js pattern for pre-publish asset compilation (discovered in cwd before publish, factory receives only spinner, actions namespaced as prepublish_{i}_{key}); integration with ActionSequence for workflow merging; params.pluginDirectory injection for install, props.cwd for publish; real-world examples from reactium-admin-core (SCSS injection with user prompts, Gulp-based CSS compilation); common use cases: database migration, config generation, user onboarding, dependency verification, asset compilation; best practices: spinner state management, unattended mode support, error handling, async operation completion; common gotchas: spinner not stopped before prompts, pluginDirectory not in publish, async operations not awaited, error swallowing, not respecting unattended flag; debugging techniques with verbose logging and spinner text; comprehensive source references from CLI/commands/package/install/actions.js:206-224, CLI/commands/package/publish/actions.js:76-99, Reactium-Admin-Plugins/reactium_modules_old/reactium-admin-core/arcli-install.js:1-187, arcli-publish.js:1-77; discovered during research: Parse Server ACL patterns at collection level (need to understand ACL vs CLP differences, collection-level access control, integration with Type system for dynamic collection ACLs) (Nov 27, 2025)

## Completed Research

- ✅ **Parse Server ACL Patterns and Collection-Level Access Control** - Complete object-level security documentation; ACL vs CLP differences (object vs collection permissions), Parse.ACL API (setPublicReadAccess, setRoleReadAccess, setReadAccess), CloudACL helper pattern for capability-based ACL generation, AclTargets helper with user/role caching, six common ACL patterns (user-owned content, public read restricted write, capability-based, role-based collaboration, self-protecting roles, user profiles), ACL vs CLP decision matrix, integration with CloudRunOptions for session token propagation, hook integration (content-acl), real-world examples from Content/Settings/User/Roles plugins, default ACL configuration (public read/write via defaultRoleACL), best practices (set in beforeSave hooks, use CloudACL for complex scenarios, cache targets, test multiple contexts), common gotchas (forgetting session token, ACL vs CLP confusion, anonymous role special handling, not setting on creation, role pointer vs name), performance considerations (check overhead, storage size), testing strategies, multi-tenant SaaS and CMS examples; comprehensive source references from actinium-core/lib/utils/acl.js:5-298, actinium-content/sdk.js:311-329, actinium-settings/plugin.js:102-121, actinium-roles/plugin.js:48-93, actinium-users/plugin.js:373-396; discovered during research: Parse Server beforeSave/afterSave hook patterns for automatic ACL application, need for Express Router organization patterns documentation (Nov 27, 2025)

- ✅ **Actinium FileAdapter System and File Storage Backends** - Complete pluggable file storage architecture documentation; FilesAdapterProxy pattern for runtime adapter swapping, Parse FilesAdapter interface (createFile, deleteFile, getFileData, getFileLocation, validateFilename, handleFileStream), default GridFS adapter (MongoDB-based storage), Parse Server integration via filesAdapter config, environment variables (PARSE_FILES_DIRECT_ACCESS, PARSE_PRESERVE_FILENAME, MAX_UPLOAD_SIZE, PARSE_FS_FILES_SUB_DIRECTORY), FilesAdapter.register() API for plugin registration, installer function signature, built-in adapters (S3Adapter with AWS/Digital Ocean Spaces support, FSFilesAdapter for local filesystem), hook-driven extensibility (files-adapter hook), activation/deactivation lifecycle with graceful GridFS fallback, priority-based selection for multiple active adapters, real-world deployment patterns (dev GridFS/FS, prod S3+CDN), CDN integration with baseUrl configuration, direct access vs proxied serving trade-offs (performance vs security), filename validation patterns with custom logic support, debugging techniques, performance considerations (direct access offloads Parse Server, GridFS vs S3 scalability), common gotchas (adapter not switching, direct access config, S3 permissions, no automatic file migration, filename sanitization), best practices (direct access in prod, don't preserve filenames for security, reasonable upload limits, CDN for public files, separate buckets by environment); comprehensive source references from actinium-core/lib/files-adapter.js:1-193, actinium-fs-adapter/s3-plugin.js:1-65, actinium-fs-adapter/fs-plugin.js:1-58, actinium-core/middleware/parse/middleware.js:8-27; discovered during research: Potential for file processing hooks (image optimization, virus scanning, metadata extraction) - proxy pattern enables future extensibility, Parse Server file ACL integration for authenticated file access (Nov 27, 2025)

## Completed Research

- ✅ **Actinium Plugin Management System** - Complete plugin lifecycle documentation with discovery (globby-based ENV.GLOB_PLUGINS), registration (Plugin.register with semver validation), database storage (Parse Plugin collection), lifecycle hooks (install, schema, activate, update, deactivate, uninstall), built-in detection (.core directory auto-flagging), version management (updateHookHelper for migrations with test functions), metadata handling (file-based assets with addLogo/addScript/addStylesheet), hook-driven extensibility (plugin-before-save, activate, update), gating pattern (Plugin.gate for cloud function protection), capability-based security (Plugin.* collection + plugin.view/activate capabilities), cache management (Actinium.Cache plugins.{ID}), active state queries (isActive, isValid), cloud function integration (plugin-activate, plugin-deactivate, plugin-uninstall, plugins list); real-world examples from Settings/Taxonomy/Type plugins; comprehensive source references from actinium-core/lib/plugable.js:1-731, actinium-core/cloud/actinium-plugin.js:1-292; best practices (check active state in hooks, lifecycle setup/teardown, schema on schema hook, updateHookHelper migrations, ID filtering, semver ranges, built-in protection); common gotchas (database active overrides default, schema hook timing, update only for active plugins, asset upload requires activation, order doesn't control hook priority, cache vs database inconsistency, built-in can't be deleted); discovered during research: Collection registration integration, capability registration patterns, route system integration for admin UI; critical for plugin development and Actinium extensibility (Nov 27, 2025)

- ✅ **Actinium Settings System Architecture** - Complete hierarchical settings management with object-path addressing (group.subkey.leaf), database storage (Setting collection with double-nesting value.value), capability-based access control (per-group setting.{group}-get/set/delete), anonymous group registry (whitelist non-sensitive groups for public access), cache-first strategy (Actinium.Cache with dataLoading TTL), hook integration (setting-set, setting-change, setting-unset, settings-sync), ENV.SETTINGS bootstrap initialization, cloud functions (settings list, setting-get, setting-set/save, setting-unset/del/rm), Pulse-based periodic sync (SETTINGS_SYNC_SCHEDULE cron), type validation (string/number/boolean/date/array/object), ACL generation with CloudACL helper, settings-acl-roles hook for customization; real-world examples from S3Adapter (config storage), Mailer (feature flags), Search (cron schedule), Syndicate (multi-tenant config), Shortcodes (anonymous access); comprehensive source references from actinium-core/lib/setting.js:1-175, actinium-settings/plugin.js:1-429; best practices (hierarchical keys, anonymous groups for non-sensitive, defaults, ENV bootstrap, cache-bust on change, capability checks, group related settings); common gotchas (double-nesting value structure, nested key creates intermediates, unset sets undefined not delete, anonymous registration timing, cached values, capability uses group only, ENV overridden by database); integration with Pulse, Capability, Parse ACL systems; critical for application configuration and feature flags (Nov 27, 2025)

- ✅ **Manifest System and Dependency Loading** - Complete documentation of manifest generation (DDD file discovery via globby + directory-tree, pattern matching with sourceMappings/searchParams, path transformation for imports, domain resolution system), ReactiumDependencies class architecture (loadAll/load methods, caching strategy, core type mapping), generated manifest structure (dynamic import() loaders for code-splitting, domain-keyed organization), load-dependency hook for conditional loading, NPM package discovery with reactiumDependencies support, four manifest types (domains.js, manifest.js, externals-manifest.js, umd-manifest.json), processors (domains/manifest/externals/umd), Handlebars template system, Gulp integration (parallel generation with dependency ordering), webpack integration (dynamic imports create split points), configuration override pattern (manifest.config.override.js), best practices (file naming, domain organization, performance optimization), common gotchas (manifest not regenerating, incorrect import paths, domain collisions, hook filtering timing, cache staleness); discovered during research: UMD system integration (defaultLibraryExternals, library externalization pattern) - already on list; Gulp watch process architecture (forked process for isolation) - documented in Gulp research; reactiumDependencies vs dependencies naming inconsistency - minor; comprehensive source references from manifest-tools.js:1-242, dependencies/index.js:1-153, reactium-config.js:86-188, gulp.tasks.js:320-388, manifest processors and templates (Nov 28, 2025)

- ✅ **Gulp Build System and Asset Pipeline** - Complete build orchestration documentation (production vs development flow, 11-stage build pipeline with preBuild/postBuild hooks, task series/parallel composition), gulp.config.js structure (port configuration, source/dest paths, UMD config, BrowserSync settings), core tasks (clean, manifest generation, styles with SCSS compilation, scripts with webpack integration, umdLibraries, assets/markup/json copying, compress with gzip, serviceWorker stub), SCSS system (plugin-assets.json for base64 embedding, DDD style partial discovery with Registry-based priority, multi-level sort algorithm for Atomic Design, Handlebars template aggregation, reactiumImporter for "+" prefix resolution, seven priority tiers: VARIABLES→MIXINS→BASE→ATOMS→MOLECULES→ORGANISMS→OVERRIDES), development mode (watch task with forked process, file watchers for manifest/styles/assets/markup, BrowserSync proxy integration with WebSocket live reload), hook integration (preBuild, postBuild, build-series, main-webpack-assets, ddd-styles-partial, ddd-styles-partial-glob), configuration override pattern (gulp.config.override.js), environment variables (PORT/APP_PORT, BROWSERSYNC_PORT, NODE_ENV, MANUAL_DEV_BUILD, DEBUG, BROWERSYNC_OPEN_BROWSER), task composition helpers (generateSeries/generateParallel for declarative orchestration), CLI commands, best practices (hook registration timing, style partial naming conventions, asset organization, custom build tasks via hooks not file edits, watch performance optimization), common gotchas (manifest not regenerating, SCSS partial not included, asset not copied, webpack bundle not updating in dev, BrowserSync not reloading, styles compiled in wrong order, UMD build failures, compress task errors), performance optimization strategies, debugging techniques, integration with manifest/webpack/service worker/SSR systems; discovered during research: UMD webpack configuration (umdWebpackGenerator function, library externalization) - next topic to research; Service Worker plugin implementation patterns - lower priority; gulp.watch.js forked process implementation details - sufficient coverage; webpack-manifest.json SSR integration - already documented in SSR_ARCHITECTURE.md; comprehensive source references from gulp.tasks.js:1-824, gulp.config.js:30-128, reactium-config.js:9-84, manifest templates and processors (Nov 28, 2025)

- ✅ **UMD Library System and External Dependencies** - Complete UMD build architecture with manifest-based discovery (umd.js pattern, umd-config.json configuration), webpack config generation via umdWebpackGenerator factory function, WebpackSDK integration for consistent configuration, default library externals (React/ReactDOM/Reactium SDK/14 common libraries with externalName/requirePath/defaultAlias structure), library externalization preventing dependency duplication, babel-loader configuration (preset-env/react/class-properties), output configuration (UMD library target, globalObject selection), production compression with gzip, service worker patterns (globalObject this, babel disabled, workerRestAPI define), runtime loading patterns (dynamic import, script tag, worker context), Gulp task integration (sequential webpack builds per library, error handling), real-world examples from service worker and admin plugins; discovered during research: UMD webpack override pattern (umd.webpack.override.js for per-library customization), DefinePlugin workerRestAPIConfig injection for Parse Server access in workers; comprehensive source references from umd.webpack.config.js:1-122, reactium-config.js:9-84,119-150, manifest/processors/umd.js:1-77, gulp.tasks.js:447-486; best practices (externalize React/Reactium, minimal entry points, proper globalObject, source maps dev only); common gotchas (missing umd-config.json, external reference mismatch, service worker babel config, manifest not regenerating, circular UMD dependencies, missing runtime dependencies, compression errors); critical for plugin distribution, service worker implementation, code splitting, bundle size optimization (Nov 28, 2025)

- ✅ **Actinium Harness Testing System** - Development-only test runner with boot-time execution (ENV.RUN_TEST gated), Hook-based registration on tests domain with priority ordering, Node.js assert module integration for assertions, optional setup/teardown lifecycle (always runs teardown even on failure), test context with slugified keys, real-world examples from actinium-features plugin (core SDK validation), integration patterns for plugin self-testing (cloud functions, schema validation, capability checks); comprehensive source references from actinium-core/lib/harness.js:1-101, actinium-features/plugin.js:4-28; best practices (environment gating, descriptive test names, cleanup in teardown, master key usage, async/await patterns, priority ordering for dependencies, scope test data); common gotchas (missing ENV.RUN_TEST check, teardown not cleaning up, async not awaited, forgetting master key, test order dependencies, teardown errors silent, priority confusion, hook context conflicts, not checking plugin active state, unclear assertion messages); critical for rapid plugin development validation, core API smoke tests, database schema verification without full test suite overhead (Nov 28, 2025)

- ✅ **Actinium Route System (Admin API Routes)** - Database-backed route management with Parse Server Route collection storage, blueprint-based frontend integration (route references blueprint component ID for rendering), CRUD operations (save with upsert logic, retrieve by path/objectId, list with pagination, delete with built-in protection), plugin lifecycle integration pattern (save on start/activate/update hooks, delete on deactivate hook), capability-based access control (capabilities array with CloudHasCapabilities check, route-list-output hook adds permitted field), hook-extensible validation (route-before-save, route-saved, beforeSave-route, beforeDelete-route), cloud functions API (route-save, route-retrieve, routes, route-delete), built-in route protection (meta.builtIn prevents deletion), metadata support (meta.app for multi-app organization, meta.category, custom fields), real-world examples from Settings/Admin/Route plugins (PLUGIN_ROUTES array pattern); comprehensive source references from actinium-route/plugin.js:1-288, sdk.js:1-94, schema.js:1-28, routes.js:1-12; best practices (always use meta.builtIn, register capability before route, use meta.app, clean up on deactivate, use order for grouping, validate blueprint exists); common gotchas (forgetting blueprint field, built-in routes not deleting, route not showing in UI, duplicate routes on restart, capability not registered, routes not cleaning up, hook order confusion, frontend blueprint mismatch, missing meta fields, query performance); discovered during research: Blueprint registration pattern in Reactium Admin (component registry integration), route-list-output permission filtering mechanism; critical for Actinium Admin navigation, dynamic route lists, plugin-specific admin pages, capability-based UI visibility (Nov 28, 2025)

- ✅ **Reactium Blueprint System (Frontend Component Registry)** - Complete page layout template system for Reactium Admin; Registry-based architecture with CLEAN mode; three built-in blueprints (Admin, Simple, Profile); section-zone architecture (sidebar/main/tools sections containing zones); Blueprint component renderer with automatic transition state management; route integration via Blueprint.initRoutes() with capability-based filtering; tools section auto-injection (admin-tools zone added if missing); blueprint-route-loader hook for data loading during LOADING transition; route-to-blueprint mapping via database Route collection blueprint field; section metadata to data-attributes conversion; ZoneLoading component for loading states; hookableComponent integration; body/HTML namespace attributes; preloader removal; real-world examples from Content Type Editor (multi-blueprint variants), Login (minimal single-section layout); comprehensive source references from Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/Blueprint/sdk.js:1-220, index.js:1-188, reactium-hooks.js:1-99, enums.js:1-22; best practices (use built-ins first, namespace consistency, zone naming convention, register on blueprints hook); common gotchas (blueprint not found fallback to Admin, tools section auto-added, route component always Blueprint, capability filtering at registration, transition states auto-progress, section meta className removed before data attributes, blueprint-load hook unused pattern); discovered during research: ZoneLoading hookable component pattern (loading state component registry), Route meta.app filtering pattern (noAppProp vs hasAppRoute query), Transition state management patterns (automatic nextState progression); critical for Reactium Admin page structure, route-to-layout mapping, capability-based UI visibility, custom admin page layouts (Nov 28, 2025)

## Pending Research Topics

### High Priority

2. ✅ **Actinium Search and Indexing System** - Complete hook-driven search architecture with pluggable indexers; two-plugin pattern (core search framework + Lunr.js implementation); three-phase workflow (config → normalize → index); `search-index-config` hook for indexing control, `search-index-item-normalize` hook for RichText plaintext extraction via tree-flatten, `search-index` hook for actual indexing (Lunr.js builder pattern with ref/fields), `search` hook for query execution with scoring; automatic reindexing via Pulse cron schedule (default midnight, configurable via `index-frequency` setting); threshold-based result filtering (min score cutoff); cloud functions (search-index requires Search.index capability, search public); real-world Lunr.js implementation with in-memory indexes (not persisted), pagination support, Parse Query for full content fetch; discovered during research: Custom search backend patterns (Elasticsearch example), cursor-based pagination for large collections, type-specific filtering strategies; comprehensive source references from actinium-search/sdk.js:1-130, search-plugin.js:1-126, search-lunr-plugin.js:1-96; best practices (cron scheduling, early filtering, field normalization, pagination); common gotchas (empty permittedFields param, no auto-index on content save, threshold filtering after search hook, in-memory loss on restart, no autocomplete); critical for CMS search, content discovery, full-text search implementation (Nov 28, 2025)

3. **Actinium Syndicate Multi-Tenant Content Distribution**

   - JWT-based client authentication (refresh + access tokens)
   - SyndicateClient collection and token management
   - Content API for cross-site content serving
   - Media directory and file syndication
   - Taxonomy syndication
   - Security model (ENV.ACCESS_SECRET, ENV.REFRESH_SECRET)
   - Client CRUD operations
   - Token verification and refresh patterns
   - **Why it matters**: Critical for multi-site Actinium deployments, headless CMS use cases, content distribution networks
   - **What's undocumented**: Complete syndication architecture, token lifecycle, client setup workflow, security best practices, API integration patterns
   - **Key mechanisms**: Actinium.Syndicate.Client.create/token/verify, jwt.sign/verify, SyndicateClient collection, syndicate-* cloud functions
   - **Source files**: actinium-syndicate/sdk.js (1-200+ lines), actinium-syndicate/plugin.js (1-185 lines)
   - **Discovered during**: Settings system research - complex multi-tenant config use case (Nov 28, 2025)

4. **Reactium Utility Hooks Collection**

   - useAsyncEffect - async side effects with isMounted pattern
   - useDerivedState - prop-to-state derivation with selective subscriptions
   - useStatus - type-safe status management
   - useEventEffect - ComponentEvent subscription hook
   - useFocusEffect - focus state management
   - useFullfilledObject - promise resolution tracking
   - useScrollToggle - scroll-based state toggling
   - useIsContainer - DOM hierarchy checking
   - cxFactory - namespaced classname generation
   - **Why it matters**: Essential patterns for Reactium development, common use cases, type-safe state management
   - **What's undocumented**: Complete hooks reference with real-world usage patterns, best practices, comparison with standard hooks
   - **Key mechanisms**: Each hook's signature, use cases, gotchas, integration patterns
   - **Source files**: reactium-sdk-core/src/browser/*.ts (useAsyncEffect.ts:1-72, useDerivedState.ts:1-180, useStatus.ts:1-58, etc.)
   - **Discovered during**: Codebase exploration - substantial utility hook library beyond documented hooks (Nov 28, 2025)

### Medium Priority

5. **Actinium Mailer System (Email Integration)**

   - Pluggable transport architecture (SMTP, Mailgun, SES)
   - Hook-driven transport configuration (mailer-transport hook)
   - Actinium.Mail.send API with nodemailer integration
   - Settings-based configuration (mailer settings group)
   - Multiple provider patterns (default sendmail, SMTP, Mailgun, AWS SES)
   - Environment variable configuration (SENDMAIL_BIN, SENDMAIL_NEWLINE_STYLE)
   - **Why it matters**: Essential for user notifications, password resets, transactional emails in Actinium apps
   - **What's undocumented**: Complete mailer architecture, transport plugin pattern, provider comparison, configuration best practices
   - **Key mechanisms**: Actinium.Mail.send(), mailer-transport hook, nodemailer.createTransport(), Settings integration
   - **Source files**: actinium-mailer/mailer-plugin.js (1-63 lines), smtp-plugin.js, mailgun-plugin.js, actinium-ses-mailer plugin
   - **Discovered during**: Codebase exploration - hook-driven email system with multiple provider support (Nov 28, 2025)

6. **Actinium IO WebSocket System (Real-Time Communication)**

   - Socket.io server integration with Actinium HTTP server
   - Client registry pattern (Actinium.IO.clients Registry)
   - Hook-driven lifecycle (io.config, io.init, io.connection, io.disconnecting)
   - Connection/disconnection event handling
   - CORS configuration patterns
   - Custom socket path (/actinium.io)
   - Real-time event broadcasting patterns
   - **Why it matters**: Critical for real-time features, live updates, collaborative editing, notifications
   - **What's undocumented**: Complete IO architecture, client management patterns, room/namespace usage, real-world integration examples
   - **Key mechanisms**: Actinium.IO.server, io.connection hook, client registry, Socket.io Server configuration
   - **Source files**: actinium-io/plugin.js (1-104 lines)
   - **Discovered during**: Codebase exploration - simple but critical real-time infrastructure (Nov 28, 2025)

7. **Reactium Window and Breakpoint Utilities**

   - SSR-safe window/document access (conditionalWindow, conditionalDocument)
   - Breakpoint system (xs/sm/md/lg/xl with custom thresholds)
   - Dynamic breakpoint detection (window.innerWidth based)
   - Electron detection (isElectronWindow)
   - Window.breakpoints customization pattern
   - **Why it matters**: Responsive design patterns, SSR compatibility, cross-platform support
   - **What's undocumented**: Breakpoint customization guide, responsive hook patterns, integration with Reactium components
   - **Key mechanisms**: breakpoint(), breakpoints(), isWindow(), BREAKPOINTS_DEFAULT
   - **Source files**: reactium-sdk-core/src/browser/window.ts (1-70 lines)
   - **Discovered during**: Codebase exploration - foundational responsive utilities (Nov 28, 2025)

8. **Reactium Fullscreen API**

   - Fullscreen class with expand/collapse/toggle methods
   - Body class toggling (.fullscreen)
   - Fullscreen change event handling
   - Element-specific fullscreen (not just documentElement)
   - **Why it matters**: Media viewers, presentations, immersive experiences
   - **What's undocumented**: Usage patterns, integration with components, browser compatibility handling
   - **Key mechanisms**: Fullscreen.expand/collapse/toggle, isExpanded/isCollapsed, fullscreenchange event
   - **Source files**: reactium-sdk-core/src/browser/Fullscreen.ts (1-61 lines)
   - **Discovered during**: Codebase exploration - simple but useful browser API wrapper (Nov 28, 2025)

9. **Reactium Server-Side Routing and Middleware**

   - Express router configuration in Reactium
   - Basic auth integration (.htpasswd pattern)
   - Health check endpoints
   - Server.ResponseHeaders hook for custom headers
   - SSR vs static file handling
   - Redirect handling from React Router
   - Error handling patterns
   - **Why it matters**: Understanding server-side request handling, SSR integration, deployment patterns
   - **What's undocumented**: Complete router architecture, middleware integration, hook patterns
   - **Key mechanisms**: Server.ResponseHeaders hook, renderer integration, basic auth middleware
   - **Source files**: reactium-core/server/router.mjs

### Lower Priority

11. **Actinium Navigation System**

    - Navigation menu structure (MenuBuilder field type)
    - Type registration pattern for Navigation content type
    - RichText integration for additional content
    - Publisher workflow integration
    - **Why it matters**: Dynamic navigation for CMS applications
    - **What's undocumented**: MenuBuilder field type usage, navigation rendering patterns
    - **Source files**: actinium-navigation/plugin.js (1-89 lines)
    - **Evaluation**: Lower priority - appears to be simple type registration, MenuBuilder field type might warrant documentation if complex

12. **Actinium Shortcodes System**

    - Shortcode registration and parsing
    - Content transformation pipeline
    - Built-in vs custom shortcodes
    - **Why it matters**: Content flexibility in CMS
    - **What's undocumented**: Shortcode registration API, parsing mechanism, transformation hooks
    - **Source files**: actinium-shortcodes/plugin.js
    - **Evaluation**: Medium-low priority - useful for CMS content, but may be straightforward pattern

13. **Actinium Recycle System**

    - Soft delete patterns
    - Trash/restore functionality
    - Permanent deletion
    - Parse Server beforeDelete hook integration
    - **Why it matters**: Data safety in CMS applications
    - **What's undocumented**: Recycle bin architecture, restore workflow, collection-specific recycling
    - **Source files**: actinium-recycle/plugin.js
    - **Evaluation**: Lower priority - useful but may follow standard soft-delete pattern

14. **Parse Server Integration Deep Dive**

    - Session management patterns (user context propagation)
    - Live Query setup and usage
    - Advanced proxy configuration patterns
    - Parse SDK initialization flow
    - **Evaluation**: Lower priority - mostly standard Parse Server usage, not framework-specific

## NEW RESEARCH TOPICS (Nov 28, 2025 - Third Exploration)

### High Priority (New - Nov 28 Evening)

- ✅ **Reactium Utility Hooks Collection (Phase 2: Advanced Hooks)** - Complete collection of 7 specialized React hooks for advanced patterns; useAsyncEffect for async side effects with AsyncUpdate class for mount safety (isMounted check prevents state updates on unmounted components), cleanup function support; useDerivedState for prop-to-state derivation with selective subscriptions (shallow comparison per object-path, updateAll flag for imprinting all props on ANY subscribed prop change, forceRefresh method, non-reactive derivedStateRef with opt-in re-renders); useStatus for type-safe status management (ref-based non-reactive storage with opt-in forceRender flag, isStatus array checking, TypeScript literal type support); useFocusEffect for auto-focus on render (data-focus attribute default, custom selector support, container ref or element, focus-once behavior); useScrollToggle for body scroll control (fixed position with negative margin trick, position preservation via window._scrollTogglePosition, global BodyScroll handle registration, enable/disable/toggle methods, ReactiumSyncState integration); useIsContainer for DOM hierarchy checking (parent node traversal, strict equality comparison, null-safe); useFulfilledObject for promise fulfillment tracking (polling-based object-path checking with configurable delay, ready/obj/count tuple return, useful for complex async initialization); comprehensive source references from reactium-sdk-core/src/browser/use*.ts files; comparison tables with standard hooks (useEffect, useState, etc.); real-world examples (data fetching, controlled components, modal scroll prevention, click-outside detection); best practices (mount checking, subscription optimization, type safety, cleanup patterns); common gotchas (useAsyncEffect cleanup timing after async completes, useDerivedState empty subscriptions never update from props, useStatus no auto-rerender without forceRender, useScrollToggle global handle affects all components, useIsContainer not actually a hook internally, useFulfilledObject infinite polling if keys never fulfilled); discovered during research: AsyncUpdate mount tracking pattern (class-based isMounted flag), ReactiumSyncState.extend() pattern for handle methods (useScrollToggle uses extend for enable/disable/toggle), Object-path subscription patterns (useDerivedState selective prop watching); critical for async data loading, controlled components, status-driven UI, form auto-focus, modal scroll prevention, click-outside detection, complex async state initialization (Nov 28, 2025)

- ✅ **Actinium Recycle System Architecture** - Complete soft delete and object archiving system with three-tier type system (delete for trash/30-day retention, archive for inactive records, revision for version snapshots); Recycle collection structure (type/collection/object/user/ACL fields, double-nested object preservation); SDK API (trash/archive/revision for creation, retrieve/retrieveAll for querying with pagination, restore/restoreAll for object restoration, purge for permanent deletion); restore creates NEW objectId (original ID discarded); ACL preservation from original object restored on restoration; Pointer field restoration (__type: 'Pointer' re-added); cloud function API (recycle, recycle-archive, recycle-revision, recycled, recycle-archived, recycle-revisions, recycle-restore, recycle-purge); capability-based access control (Recycle.create/retrieve/update/delete/addField capabilities, settings override via recycle.capabilities.create/retrieve); recycle-query hook for custom filtering; pagination support (page/limit with count/pages/next/prev metadata); capability settings only checked in cloud functions not SDK methods; real-world patterns: content soft delete with auto-purge cron (beforeDelete hook interception), revision history (beforeSave snapshot), user archive on deactivation; comprehensive source references from Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-recycle/sdk.js:1-267, plugin.js:1-237, schema.js, enums.js; best practices (use correct type for intent, verify ACL preserved, implement retention policies with cron, confirm before restore creates new ID, use pagination for large datasets); common gotchas (restored object gets new objectId breaking references, recycle NOT version control system with no diff/merge tools, type field accepts any string with no validation, purge only deletes Recycle records not original objects, capability settings bypassed by SDK direct calls, restore without items parameter fetches most recent which may be wrong version); discovered during research: Parse Object serialization patterns (toJSON with ACL extraction), Actinium.Cache integration for query results, ENV-based retention period configuration patterns, Hook-driven query modification for date range filtering; critical for content management systems, user management, audit trails, undo workflows, data retention policies, archival strategies (Nov 28, 2025)

23. **Actinium Taxonomy System Architecture**
    - Hierarchical taxonomy structure (parent/child relationships)
    - Taxonomy-content relationships (many-to-many)
    - Taxonomy type registration and CRUD
    - Content-taxonomy linking patterns
    - Query patterns for taxonomized content
    - Slug-based taxonomy lookup
    - Hook integration (taxonomy-saved, taxonomy-deleted)
    - Cloud functions API (taxonomy-create, taxonomy-retrieve, taxonomy-update, taxonomy-delete, taxonomies)
    - **Why it matters**: Content organization for CMS use cases, category/tag systems, hierarchical navigation, SEO-friendly content structure
    - **What's undocumented**: Complete Taxonomy SDK (336 lines), hierarchical parent/child mechanics, content linking patterns, query strategies for taxonomized content
    - **Key mechanisms**: Actinium.Taxonomy CRUD operations, parent relation handling, content-taxonomy many-to-many relationships
    - **Source files**: actinium-taxonomy/sdk.js (336 lines), plugin.js (583 lines)
    - **Discovered during**: Third exploration - substantial SDK with hierarchical relationship management (Nov 28, 2025)

- ✅ **Actinium Taxonomy System** - Two-level hierarchical classification with Type_taxonomy → Taxonomy → Content structure; many-to-many Parse Relation architecture; complete CRUD SDK (Taxonomy.create/update/delete/retrieve/list, Taxonomy.Type CRUD, Taxonomy.Content attach/detach/retrieve/fields); hook-extensible operations (taxonomy-save, taxonomy-after-save, taxonomy-type-save, taxonomy-type-after-delete with cascade, beforeSave_content unsets taxonomy fields, content-retrieve auto-populates taxonomies, content-saved processes pending/deleted attachments); default installation (Category/Tag types with Blog/Featured taxonomies on first start); Taxonomy field type integration (Relation<Taxonomy> schema, region-based UI); cloud functions (taxonomy-* and taxonomy-type-* operations, taxonomy-content-attach/detach/retrieve); slug validation (type slugs must be unique, taxonomy slugs not enforced); relation-based content linking (contentObj.relation(field).add/remove); complete content retrieval with type pointer inclusion; comprehensive source references from actinium-taxonomy/sdk.js:1-336, plugin.js:1-584; discovered during research: No native parent-child hierarchy support (flat structure only, requires custom parent field), relation count before fetch creates N+1 query problem, outputType parameter inconsistency (can be set on Type/Taxonomy/query params with unclear precedence); best practices (hierarchical keys, field name matches type slug, cache taxonomy lists, limit taxonomy fields, use pointers for queries); common gotchas (taxonomy fields can't be saved directly, content-retrieve auto-adds taxonomies causing extra queries, type deletion cascades to all taxonomies, slug uniqueness not enforced for taxonomies, relation count queries twice per field); critical for content organization, categorization, tagging, SEO-friendly URLs, navigation systems; comparison with WordPress taxonomies (missing: hierarchical categories, term metadata, slug enforcement; has: Parse Relation flexibility, hook extensibility, auto-populate) (Nov 28, 2025)

- ✅ **MemoryCache System Architecture** - Object-path addressing with subscribe/notify pattern wrapping memory-cache NPM package; singleton exports (Reactium.Cache browser, Actinium.Cache server); core API (get/put/set/del/clear with nested path support, subscribe with deep path notifications, merge for import/export); TTL support with expiration callbacks (auto-delete after milliseconds); subscriber registry with UUID-based IDs and hierarchical path tracking; deep path subscriptions (subscribe to 'a.b' fires on 'a.b.c' changes); dispatch notifications (op: set/del/expire/clear/merge with key/value); properties (size, memsize, keys); static helpers (sanitizeKey, denormalizeKey, normalizeKey, getKeyRoot); comprehensive source references from reactium-sdk-core/src/core/MemoryCache.ts:1-357; real-world integration: Actinium.Cache for roles (byName/byLevel/byObjectId with decorateRoles pattern, afterSave invalidation), ACL targets caching (user/role lookups with object-path keys), React hooks with subscriptions (reactive state sync); discovered during research: Nested path sets MERGE not replace (can accumulate stale data), subscriptions fire on ALL descendant changes (parent subscription gets child notifications), TTL expiration callbacks get value but subscribers don't, memory-only cache lost on restart (requires start hook rebuild), merge() converts relative TTL to absolute timestamp, no built-in serialization (must serialize Parse Objects); best practices (hierarchical key naming with namespaces, cleanup subscriptions on unmount, choose deep vs shallow carefully, TTL strategy by data volatility, cache frequently accessed data, batch invalidation via root key deletion); common gotchas (merged nested paths don't replace, subscriber overhead on root keys with high churn, no eviction policy without TTL, single-threaded but no concurrent access issues); critical for performance optimization, reactive state management, role/settings caching, temporary data storage; not suitable for multi-process caching, persistence, large datasets >1GB, cross-server communication (Nov 28, 2025)

### Medium Priority (Re-evaluated)

**REMOVED (Trivial):**
- ❌ Shortcodes System - 102-line plugin, simple registration pattern, no substantial SDK, settings-based config only
- ❌ Navigation System - 88-line plugin, simple type registration, MenuBuilder field type is RichText editor config not framework pattern
- ❌ Parse Server Integration Deep Dive - Standard Parse Server usage, not framework-specific

## NEW RESEARCH TOPICS (Nov 28, 2025 - Second Exploration)

### High Priority (New)

15. **Actinium Content System Deep Dive**
    - Complete Content CRUD API (find, retrieve, save, delete, purge)
    - Content-Type relationship patterns
    - UUID-based content identification (type + slug → uuid)
    - Content query patterns (status, user, type+slug filters)
    - Content utilities (slug generation, search length validation, type resolution)
    - Content ACL integration
    - Hook-driven extensibility (content-before-save, content-saved, content-deleted)
    - Real-world patterns from actinium-content plugin
    - **Why it matters**: Core CMS functionality, central to Actinium applications, complex Content SDK with 500+ lines
    - **What's undocumented**: Complete Content API reference, uuid generation patterns, content query strategies, integration with Type system
    - **Key mechanisms**: Actinium.Content.find/retrieve/save/delete, genUUID pattern, content utilities, beforeSave hooks
    - **Source files**: actinium-content/sdk.js (1-530 lines), plugin.js (1-179 lines), schema.js
    - **Discovered during**: Exploration of Actinium core plugins - largest SDK after actinium-core itself (Nov 28, 2025)

16. **MemoryCache System Architecture**
    - Object-path addressing for hierarchical cache keys
    - Subscribe/notify pattern for cache change events
    - TTL support with expiration callbacks
    - Import/export/merge operations
    - Deep path subscriptions (subscribe to 'a.b' triggers on 'a.b.c' changes)
    - Integration with Reactium.Cache and Actinium.Cache
    - Comparison with browser Cache API and localStorage
    - Real-world patterns: route caching, role caching, settings caching
    - **Why it matters**: Foundational caching system used throughout framework, performance optimization patterns, real-time cache invalidation
    - **What's undocumented**: Complete MemoryCache API, subscription patterns, hierarchical key addressing, TTL strategies, cache invalidation patterns
    - **Key mechanisms**: Cache.get/set/del/subscribe, object-path support, expiration callbacks, subscriber notifications
    - **Source files**: reactium-sdk-core/src/core/MemoryCache.ts (1-357 lines)
    - **Discovered during**: SDK exploration - substantial TypeScript implementation with event-driven architecture (Nov 28, 2025)

17. **Reactium SplitParts String Template System**
    - Token-based string splitting (%key% replacement syntax)
    - Progressive replacement with .replace() chaining
    - Part/replacement type tracking
    - Integration with component rendering (dynamic content injection)
    - Comparison with template literals and handlebars
    - Real-world use cases in admin UI
    - **Why it matters**: Enables dynamic string templating beyond template literals, useful for plugin-extensible UI strings, email templates, dynamic content
    - **What's undocumented**: SplitParts API, replacement patterns, integration with framework components, use cases vs alternatives
    - **Key mechanisms**: SplitParts class, replace() method, value()/toString() output, token syntax
    - **Source files**: reactium-sdk-core/src/browser/splitter.ts (1-163 lines)
    - **Discovered during**: Browser SDK exploration - specialized string manipulation utility (Nov 28, 2025)

18. **Reactium Classnames Factory (cxFactory)**
    - Namespace-based classname generation
    - Integration with classnames library
    - Consistent component styling patterns
    - BEM-style naming conventions
    - Real-world usage in core components
    - **Why it matters**: Essential for component library development, consistent CSS naming, plugin-based theming
    - **What's undocumented**: cxFactory usage patterns, integration with component development, naming conventions
    - **Key mechanisms**: cxFactory(namespace) factory function, automatic prefix application
    - **Source files**: reactium-sdk-core/src/browser/classnames.ts (1-21 lines)
    - **Discovered during**: Browser SDK exploration - small but framework-critical styling utility (Nov 28, 2025)

### Medium Priority (New)

19. **Server Template System and Custom Templates**
    - Template discovery pattern (local override vs core template)
    - Template structure (version, template function)
    - req object properties (headTags, styles, scripts, appBindings, appGlobals)
    - defines object serialization
    - Custom template creation patterns
    - Template versioning and compatibility
    - Integration with SSR renderer
    - **Why it matters**: Enables custom HTML structure, multi-app deployments, specialized SSR scenarios, progressive enhancement
    - **What's undocumented**: Template creation guide, req object complete reference, versioning strategy, override patterns
    - **Key mechanisms**: Template file structure, req property injection points, serialize-javascript usage
    - **Source files**: reactium-core/server/template/feo.js (1-26 lines), server/renderer/index.mjs template discovery
    - **Discovered during**: Server-side exploration - simple but enables advanced customization (Nov 28, 2025)

20. **Actinium File Creation API**
    - ActiniumFile class extending Parse.File
    - File.create() pattern for disk-to-Parse conversion
    - mediaURL() transformation for frontend access
    - File path transformation (targetPath parameter)
    - MIME type detection and handling
    - Base64 encoding for Parse Server storage
    - Integration with FileAdapter system
    - **Why it matters**: Essential for programmatic file uploads, content management, media handling in cloud functions
    - **What's undocumented**: Complete File API, file creation patterns from disk, mediaURL usage, integration with syndication/media systems
    - **Key mechanisms**: ActiniumFile class, File.create(filePath, targetPath), mediaURL() method, getArrayBuffer utility
    - **Source files**: actinium-core/lib/file.js (1-53 lines), lib/utils/file-api.js (1-36 lines)
    - **Discovered during**: Actinium core lib exploration - critical for file handling workflows (Nov 28, 2025)

## NEW RESEARCH TOPICS (Nov 28, 2025 - Fourth Cycle)

### High Priority (New - Nov 28 Evening)

25. **Parse Object Serialization Patterns (Actinium.Utils.serialize)**
    - Complete serialization of Parse Objects to JSON
    - Pointer field preservation vs resolution
    - Relation field handling
    - ACL extraction patterns
    - Deep object traversal for nested Parse Objects
    - Integration with toJSON() method
    - **Why it matters**: Critical for cache storage, API responses, search indexing, cross-system data transfer
    - **What's undocumented**: Complete serialization algorithm, pointer handling strategies, relation serialization, ACL preservation patterns
    - **Key mechanisms**: Actinium.Utils.serialize(), Parse.Object.toJSON(), pointer/relation detection
    - **Source files**: actinium-core/lib/utils/*.js
    - **Discovered during**: Search and Taxonomy research - serialize() used extensively for cache storage and API responses, but implementation not documented (Nov 28, 2025)

### Medium Priority (New - Nov 28 Evening)

24. **ZoneLoading hookableComponent Pattern and Loading States**
    - ZoneLoading hookable component for zone loading indicators
    - Integration with Blueprint section refresh pattern (meta.refresh: true)
    - Blueprint component loading state rendering (loading vs ready zones)
    - useHookComponent('ZoneLoading') retrieval pattern
    - Custom loading components per zone or section
    - Transition state integration (LOADING → ENTERING → READY)
    - **Why it matters**: Understanding loading state patterns in Reactium Admin, custom loading indicators, transition state UI feedback
    - **What's undocumented**: ZoneLoading component registration, customization patterns, integration with transition states, per-zone loading indicators
    - **Key mechanisms**: useHookComponent hookable retrieval, Blueprint section meta.refresh flag, transitionState !== 'READY' conditional rendering
    - **Source files**: Blueprint component (index.js:138-176 uses ZoneLoading), core ZoneLoading component registration
    - **Discovered during**: Blueprint System research - ZoneLoading used for section refresh states (Nov 28, 2025)

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
