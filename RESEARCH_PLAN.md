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

## Pending Research Topics

### High Priority

3. **UMD Library System and External Dependencies**

   - UMD build configuration and patterns
   - Library externalization for code splitting
   - UMD entry point discovery (reactium-umd.js files)
   - umd-config.json structure and usage
   - Default library externals (React, ReactDOM, Reactium SDK)
   - Custom UMD library registration
   - Runtime loading patterns
   - Integration with webpack externals
   - umdWebpackGenerator function implementation
   - **Why it matters**: Critical for building reusable components, plugins, and optimizing bundle size
   - **What's undocumented**: Complete UMD system architecture, config structure, library registration patterns, webpack generator
   - **Key mechanisms**: umd.webpack.config.js, defaultLibraryExternals, UMD manifest generation, umdWebpackGenerator
   - **Source files**: reactium-core/umd.webpack.config.js, reactium-config.js umd section, gulp.tasks.js:447-486
   - **Discovered during**: Manifest and Gulp research - UMD manifest generation, library build process (Nov 28, 2025)

6. **Actinium Harness Testing System**

   - Development-only test runner (ENV.RUN_TEST)
   - Test registration via Harness.test()
   - Setup and teardown lifecycle
   - Assert-based testing with node.js assert
   - Hook-based test execution (tests hook)
   - Test ordering via priority
   - Boot-time test execution
   - **Why it matters**: Enables rapid development testing without full test suite, critical for plugin development
   - **What's undocumented**: Complete Harness API, best practices, integration with plugin development
   - **Key mechanisms**: Harness.test(description, cb, setup, teardown, order), tests hook
   - **Source files**: actinium-core/lib/harness.js

7. **Actinium Route System (Admin API Routes)**

   - Route storage in Parse Server Route collection
   - Blueprint concept for frontend routing integration
   - Route CRUD operations (save, delete, retrieve)
   - Hook integration (route-saved, route-deleted)
   - Plugin lifecycle integration (activate/deactivate saves/removes routes)
   - Built-in route protection and metadata
   - **Why it matters**: Critical for Actinium Admin frontend, API documentation, dynamic routing
   - **What's undocumented**: Complete Route API, blueprint patterns, admin integration
   - **Key mechanisms**: Actinium.Route.save/delete, blueprint field, PLUGIN_ROUTES array pattern
   - **Source files**: Seen in actinium-settings/plugin.js, actinium-taxonomy/plugin.js usage patterns
   - **Discovered during**: Plugin Management research - all plugins register routes on activate/start hooks (Nov 27, 2025)

### Medium Priority

8. **Reactium Server-Side Routing and Middleware**

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

8. **Actinium Taxonomy System**

   - Hierarchical taxonomy architecture
   - Taxonomy type registration
   - Content-taxonomy relationships
   - Query patterns for taxonomized content
   - **Why it matters**: Content organization for CMS use cases
   - **What's undocumented**: Complete taxonomy API and patterns
   - **Source files**: actinium-taxonomy/plugin.js

9. **Actinium Navigation System**

   - Navigation menu structure
   - Dynamic navigation generation
   - Integration with routing
   - **Why it matters**: Dynamic navigation for CMS applications
   - **Source files**: actinium-navigation/plugin.js

10. **Actinium Shortcodes System**

    - Shortcode registration and parsing
    - Content transformation pipeline
    - Built-in vs custom shortcodes
    - **Why it matters**: Content flexibility in CMS
    - **Source files**: actinium-shortcodes/plugin.js

11. **Actinium IO System (WebSockets)**

    - Socket.io integration patterns
    - Real-time event broadcasting
    - Client-server communication
    - **Why it matters**: Real-time features, live updates
    - **Source files**: actinium-io/plugin.js

12. **Actinium Recycle System**

    - Soft delete patterns
    - Trash/restore functionality
    - Permanent deletion
    - **Why it matters**: Data safety in CMS applications
    - **Source files**: actinium-recycle/plugin.js

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
