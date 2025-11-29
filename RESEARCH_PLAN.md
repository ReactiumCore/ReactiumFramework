# Reactium/Actinium Framework Research Plan

Topics for future exploration sessions with specialized agents.

## Pending Research Topics

### High Priority

1. ✅ **Reactium Utility Hooks Collection** - Complete collection of 8 specialized React hooks for common patterns; useAsyncEffect for async side effects with AsyncUpdate mount safety (isMounted check prevents state updates on unmounted components), cleanup function support after async completes; useEventEffect for event listener lifecycle management with automatic cleanup (multiple events on same target, sanitized handlers); useFulfilledObject for promise fulfillment tracking via polling (object-path key checking with configurable delay); useIsContainer for DOM hierarchy checking (parent node traversal with strict equality); useScrollToggle for body scroll control (fixed position with negative margin trick, position preservation via window.\_scrollTogglePosition, global BodyScroll handle registration); useDerivedState already documented in Phase 2; useStatus already documented in Phase 2; useFocusEffect already documented in Phase 2; comprehensive source references from reactium-sdk-core/src/browser/use\*.ts files; real-world examples from admin plugins (EventForm, User editor, Media tools); comparison with standard React hooks (useEffect, useState); best practices (mount checking, event management, polling optimization); common gotchas (cleanup timing after async completes, useEventEffect target null on first render, useFulfilledObject infinite polling, useIsContainer not actually a hook, useScrollToggle global handle affects all components); discovered during research: FormEvent pattern in EventForm extends CustomEvent with property flattening (similar to ComponentEvent); critical for async data loading, event management, scroll control, DOM utilities, controlled components (Nov 28, 2025)

2. ✅ **Actinium Mailer System** - Hook-driven email transport architecture with pluggable backends; core API Actinium.Mail.send(nodemailer.MailOptions) runs mailer-transport hook; default sendmail transport (priority 0) with ENV.SENDMAIL_BIN/SENDMAIL_NEWLINE_STYLE configuration; SMTP plugin transport (priority 1) with host/port/user/pass from Settings API or ENV variables or JSON file (SMTP_MAILER_SETTINGS_FILE); Mailgun plugin transport (priority 1) with api_key/domain/proxy from Settings or ENV (MAILGUN_API_KEY/MAILGUN_DOMAIN/MAILGUN_PROXY); AWS SES plugin pattern; hook priority determines transport (last registered wins, only activate ONE transport plugin); warning hook validates configuration on startup (missing credentials fall back to sendmail); real-world patterns: password reset emails, welcome emails, notifications with attachments, cloud function integration with error handling; environment strategies: dev uses sendmail, staging uses SMTP (Mailtrap), production uses Mailgun/SES, multi-tenant uses Settings-driven config; comprehensive source references from actinium-mailer/mailer-plugin.js:1-63, smtp-plugin.js:1-137, mailgun-plugin.js:1-106; best practices: ENV for secrets, Settings for runtime config, enable only one transport, don't block user operations on email failure, validate email addresses, rate limiting; common gotchas: multiple active transports undefined behavior, Gmail requires App Password not regular password, hardcoded from address rejected by SMTP, missing config falls back silently; discovered during research: nodemailer.createTransport() pattern, Settings.get() fallback to ENV variables, Plugin.isActive() gating; critical for transactional emails, user notifications, password resets, system alerts (Nov 28, 2025)

3. ✅ **Actinium Search and Indexing System** - Complete hook-driven search architecture with pluggable indexers; two-plugin pattern (core search framework + Lunr.js implementation); three-phase workflow (config → normalize → index); `search-index-config` hook for indexing control, `search-index-item-normalize` hook for RichText plaintext extraction via tree-flatten, `search-index` hook for actual indexing (Lunr.js builder pattern with ref/fields), `search` hook for query execution with scoring; automatic reindexing via Pulse cron schedule (default midnight, configurable via `index-frequency` setting); threshold-based result filtering (min score cutoff); cloud functions (search-index requires Search.index capability, search public); real-world Lunr.js implementation with in-memory indexes (not persisted), pagination support, Parse Query for full content fetch; discovered during research: Custom search backend patterns (Elasticsearch example), cursor-based pagination for large collections, type-specific filtering strategies; comprehensive source references from actinium-search/sdk.js:1-130, search-plugin.js:1-126, search-lunr-plugin.js:1-96; best practices (cron scheduling, early filtering, field normalization, pagination); common gotchas (empty permittedFields param, no auto-index on content save, threshold filtering after search hook, in-memory loss on restart, no autocomplete); critical for CMS search, content discovery, full-text search implementation (Nov 28, 2025)

4. ✅ **Actinium Syndicate Multi-Tenant Content Distribution** - Complete JWT-based authentication system for multi-site content distribution; two-token architecture (refresh token permanent, access token 60-second expiration); SyndicateClient collection with user/client/token fields; client management API (create/retrieve/delete/list/token/verify); content syndication API (types/list/media/mediaDirectories/taxonomies/taxonomyTypes/taxonomiesAttached); ENV-based secrets (ACCESS_SECRET, REFRESH_SECRET with default warning hook); capability-based security (SyndicateClient._/setting.Syndicate-_/Syndicate.Client); Settings-driven type filtering (Syndicate.types whitelist); hook integration (syndicate-content-list auto-enriches with URLs, syndicate-\* hooks for extensibility); cloud function API (13 endpoints); real-world patterns (client setup, token refresh workflow, multi-tenant config); comprehensive source references from actinium-syndicate/sdk.js:1-478, plugin.js:1-185, schema.js:1-24, enums.js:1-7; best practices (change default secrets, cache access tokens, settings-driven config); common gotchas (default secrets warning, token expiration handling, refresh token exposure, missing type config, capability misconfiguration); discovered during research: URL plugin integration for content enrichment, Settings system for type whitelisting; critical for headless CMS, multi-site deployments, content distribution networks (Nov 28, 2025)

### Medium Priority

4. ✅ **Actinium IO WebSocket System** - Complete Socket.io integration with Actinium HTTP server; Registry-based client tracking (Actinium.IO.clients with CLEAN mode); hook-driven lifecycle (io.config for server configuration before creation, io.init after server created, io.connection per client, io.disconnecting on disconnect); custom socket path `/actinium.io` (MUST match client path); CORS configuration via io.config hook (default origin: '\*'); browser SDK auto-configuration in @atomic-reactor/reactium-api (autoConnect: false for manual auth-first pattern, polling transport); real-world patterns: broadcast to all clients (Actinium.IO.clients.list iteration), room-based broadcasting (client.join/to pattern), client-specific targeting (custom userId tracking), manual connection after auth (Actinium.IO.connect() with session token); hook integration (io.config for CORS/auth middleware, io.connection for presence tracking); authentication middleware pattern (io.init hook with Socket.io use() middleware); comprehensive source references from actinium-io/plugin.js:1-104, reactium-api/sdk/actinium/index.js:19-48; discovered during research: Socket.io namespaces for feature isolation (not used in core but extensible via io.init hook), Parse LiveQuery coexists with IO (different systems - IO for custom events, LiveQuery for database subscriptions), need for advanced room/namespace organization patterns documentation; critical for real-time features, live updates, collaborative editing, notifications, presence tracking, chat systems (Nov 29, 2025)

5. ✅ **Reactium Window and Breakpoint Utilities** - Complete SSR-safe window/document access and responsive breakpoint system; core utilities (conditionalWindow/conditionalDocument return undefined on server never crash, isWindow/isBrowserWindow for existence checks, isElectronWindow for desktop detection); breakpoint system (BREAKPOINTS*DEFAULT: xs=640/sm=990/md=1280/lg=1440/xl=1600 matches SCSS $breakpoints-max); SCSS integration (breakpoint values encoded in CSS :after pseudo-element content for single source of truth); runtime access (breakpoints() reads window.breakpoints or CSS or defaults, breakpoint(width) binary search O(log n) via *.sortedIndex returns current breakpoint); React hooks (useWindow/useDocument context-aware via WindowProvider for frame support, useBreakpoints/useBreakpoint for config/calculation, useWindowSize for reactive width/height/breakpoint with debounce and scroll tracking); real-world patterns: responsive component rendering (switch on breakpoint), conditional feature loading (lazy import for desktop), dynamic columns (breakpoint → grid-template-columns), debounced updates for performance (delay parameter prevents excessive re-renders); WindowProvider Context for react-frame-component toolkit support; mobile-first SCSS patterns (@include breakpoint(sm) for progressive enhancement); comprehensive source references from reactium-sdk-core/src/browser/window.ts:1-70, reactium-core/sdk/named-exports/window.js:1-221; discovered during research: useWindowSize includes scrollX/scrollY tracking (not just dimensions), SCSS breakpoint mixin usage throughout admin UI (30+ files), need for advanced responsive pattern documentation (component composition strategies, performance optimization for high-frequency resize); critical for responsive design, SSR-safe window access, adaptive component rendering, cross-platform Electron support, Reactium Toolkit development (Nov 29, 2025)

- ✅ **Reactium Server-Side Routing and Middleware** - Complete Express router architecture with file-based basic authentication (.htpasswd via http-auth NPM), load balancer health check endpoint (/elb-healthcheck skips auth), extension-based SSR triggering (['', 'htm', 'html'] extensions invoke renderer, others next() to static middleware), React Router redirect handling (context.url → res.redirect 302), Server.ResponseHeaders hook for custom HTTP headers (mutation-based with sync+async support), status code determination (404 for /404 path or context.notFound, 500 for errors), error handling (unhandledRejection listener, try/catch around renderer), integration with SSR renderer lifecycle (beforeApp → AppGlobals → AppHeaders → AppScripts → AppStyleSheets → AppBindings → AppSnippets → afterApp → ResponseHeaders), real-world patterns for security headers (X-Frame-Options, CSP, HSTS), cache control, CORS, monitoring headers, deployment configurations (staging with auth, production without, PM2/Docker restart strategies), common gotchas (health check auth bypass, extension check preventing asset SSR, context.notFound for proper 404s, headers after send, stack trace exposure in production); comprehensive source references from router.mjs:1-94; discovered during research: Server hook integration with renderer lifecycle, basic auth conditional on file existence pattern, unhandledRejection as router-level concern (not app-level); critical for server deployment, SSR integration, security configuration, load balancer health checks, authentication strategies (Nov 29, 2025)

### Medium Priority (New - Nov 29, 2025)

6. ✅ **Reactium Development Server and Hot Module Reloading** - Complete multi-layer development system with webpack-dev-middleware (memory filesystem for JS bundles, res.locals.webpack.devMiddleware stats injection for SSR), webpack-hot-middleware (EventStream at /__webpack_hmr, HotModuleReplacementPlugin, reload=true fallback), BrowserSync proxy (port 3000 proxy to Express 3030, WebSocket live reload, CSS/HTML/asset reload trigger), Gulp file watchers (forked child process for isolation, manifest→mainManifest, styles→recompile, partials→regenerate, markup/assets→copy, critical files→full restart), three-tier reload system (HMR for React no-reload, SCSS Gulp compile+BrowserSync, HTML/assets copy+BrowserSync); development vs production (dev: memory filesystem + HMR + BrowserSync + source maps + res.locals stats, prod: disk + webpack-manifest.json + gzip + no HMR); port configuration (3000 BrowserSync, 3001 UI, 3030 Express); watch process architecture (IPC messages build-started/restart-watches, asyncBuild series, serve vs serve-restart); SSR integration (reads res.locals.webpack.devMiddleware.stats in dev, webpack-manifest.json in prod); environment variables (BROWSERSYNC_PORT, DISABLE_HMR, BROWERSYNC_OPEN_BROWSER); comprehensive source references from index.mjs:189-416, webpack.config.js:46-48, gulp.tasks.js:74-970, gulp.watch.js:1-28, gulp.config.js:19-56, server/router.mjs:88-91, server/renderer/index.mjs:78-99; discovered during research: Forked watch process pattern (isolation + clean restart), res.locals.webpack injection critical for SSR, BrowserSync auto-detects public/ changes (no explicit reload call), entry style file changes trigger full watch restart (not partial compile), memory filesystem all JS bundles never touch disk, three different reload mechanisms for different file types; best practices (use HMR for components, create partials not entry SCSS, check HMR vs BrowserSync behavior, monitor webpack compilation, disable HMR if infinite loops); common gotchas (changes not appearing from HMR fail/wrong glob/build error, full reload instead of HMR from CSS/disabled/client error, infinite reload from circular writes/HMR triggers, middleware 404 from publicPath mismatch/order/compilation fail, BrowserSync proxy error from Express not running/port conflict, SCSS not compiling from syntax error/glob mismatch, server restart loop from entry file changes/nodemon detect); critical for development workflow, debugging build issues, understanding why changes don't appear, configuring dev environment properly (Nov 29, 2025)

7. ✅ ❌ **Socket.io Room and Namespace Organization Patterns** - REMOVED (Trivial - Nov 29, 2025)
   - **Evaluation**: Standard Socket.io patterns with NO framework-specific abstractions
   - **Reality**: Actinium IO only exposes raw Socket.io server - no helpers, no patterns, no examples in codebase
   - **Directive 1 Assessment**: Does not help Claude understand Reactium/Actinium framework better - this is Socket.io documentation, not framework documentation
   - **Decision**: Removed - developers should reference Socket.io official docs for rooms/namespaces

8. ✅ ❌ **Responsive Component Composition and Performance Patterns** - REMOVED (Trivial - Nov 29, 2025)
   - **Evaluation**: 80% standard React/HTML/CSS patterns, 20% already documented framework features
   - **Reality**: useWindowSize with breakpoint/debounce already comprehensively documented in REACTIUM_WINDOW_BREAKPOINT_SYSTEM.md; React.lazy, component composition, srcset, IntersectionObserver are standard web development patterns, not framework-specific
   - **Directive 1 Assessment**: Does not help Claude understand Reactium framework better - these are general React best practices found in React/MDN docs
   - **Decision**: Removed - framework-specific responsive utilities already documented, rest is standard React/web development

9. ✅ ❌ **Express res.locals Middleware Communication Pattern** - REMOVED (Trivial + Already Documented - Nov 29, 2025)
   - **Evaluation**: Only ONE usage (res.locals.webpack.devMiddleware) already documented in DEV_SERVER_ARCHITECTURE.md and SSR_ARCHITECTURE.md
   - **Reality**: Standard Express pattern, not framework-specific; no other middleware uses res.locals in codebase; no framework abstractions or helpers exist
   - **Directive 1 Assessment**: Does not help Claude understand Reactium better - the one instance is already documented, rest would be hypothetical Express patterns
   - **Decision**: Removed - existing usage already documented, no framework-specific patterns to teach

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

- ✅ **Reactium Utility Hooks Collection (Phase 2: Advanced Hooks)** - Complete collection of 7 specialized React hooks for advanced patterns; useAsyncEffect for async side effects with AsyncUpdate class for mount safety (isMounted check prevents state updates on unmounted components), cleanup function support; useDerivedState for prop-to-state derivation with selective subscriptions (shallow comparison per object-path, updateAll flag for imprinting all props on ANY subscribed prop change, forceRefresh method, non-reactive derivedStateRef with opt-in re-renders); useStatus for type-safe status management (ref-based non-reactive storage with opt-in forceRender flag, isStatus array checking, TypeScript literal type support); useFocusEffect for auto-focus on render (data-focus attribute default, custom selector support, container ref or element, focus-once behavior); useScrollToggle for body scroll control (fixed position with negative margin trick, position preservation via window.\_scrollTogglePosition, global BodyScroll handle registration, enable/disable/toggle methods, ReactiumSyncState integration); useIsContainer for DOM hierarchy checking (parent node traversal, strict equality comparison, null-safe); useFulfilledObject for promise fulfillment tracking (polling-based object-path checking with configurable delay, ready/obj/count tuple return, useful for complex async initialization); comprehensive source references from reactium-sdk-core/src/browser/use\*.ts files; comparison tables with standard hooks (useEffect, useState, etc.); real-world examples (data fetching, controlled components, modal scroll prevention, click-outside detection); best practices (mount checking, subscription optimization, type safety, cleanup patterns); common gotchas (useAsyncEffect cleanup timing after async completes, useDerivedState empty subscriptions never update from props, useStatus no auto-rerender without forceRender, useScrollToggle global handle affects all components, useIsContainer not actually a hook internally, useFulfilledObject infinite polling if keys never fulfilled); discovered during research: AsyncUpdate mount tracking pattern (class-based isMounted flag), ReactiumSyncState.extend() pattern for handle methods (useScrollToggle uses extend for enable/disable/toggle), Object-path subscription patterns (useDerivedState selective prop watching); critical for async data loading, controlled components, status-driven UI, form auto-focus, modal scroll prevention, click-outside detection, complex async state initialization (Nov 28, 2025)

- ✅ **Actinium Recycle System Architecture** - Complete soft delete and object archiving system with three-tier type system (delete for trash/30-day retention, archive for inactive records, revision for version snapshots); Recycle collection structure (type/collection/object/user/ACL fields, double-nested object preservation); SDK API (trash/archive/revision for creation, retrieve/retrieveAll for querying with pagination, restore/restoreAll for object restoration, purge for permanent deletion); restore creates NEW objectId (original ID discarded); ACL preservation from original object restored on restoration; Pointer field restoration (\_\_type: 'Pointer' re-added); cloud function API (recycle, recycle-archive, recycle-revision, recycled, recycle-archived, recycle-revisions, recycle-restore, recycle-purge); capability-based access control (Recycle.create/retrieve/update/delete/addField capabilities, settings override via recycle.capabilities.create/retrieve); recycle-query hook for custom filtering; pagination support (page/limit with count/pages/next/prev metadata); capability settings only checked in cloud functions not SDK methods; real-world patterns: content soft delete with auto-purge cron (beforeDelete hook interception), revision history (beforeSave snapshot), user archive on deactivation; comprehensive source references from Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-recycle/sdk.js:1-267, plugin.js:1-237, schema.js, enums.js; best practices (use correct type for intent, verify ACL preserved, implement retention policies with cron, confirm before restore creates new ID, use pagination for large datasets); common gotchas (restored object gets new objectId breaking references, recycle NOT version control system with no diff/merge tools, type field accepts any string with no validation, purge only deletes Recycle records not original objects, capability settings bypassed by SDK direct calls, restore without items parameter fetches most recent which may be wrong version); discovered during research: Parse Object serialization patterns (toJSON with ACL extraction), Actinium.Cache integration for query results, ENV-based retention period configuration patterns, Hook-driven query modification for date range filtering; critical for content management systems, user management, audit trails, undo workflows, data retention policies, archival strategies (Nov 28, 2025)

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

- ✅ **Actinium Taxonomy System** - Two-level hierarchical classification with Type_taxonomy → Taxonomy → Content structure; many-to-many Parse Relation architecture; complete CRUD SDK (Taxonomy.create/update/delete/retrieve/list, Taxonomy.Type CRUD, Taxonomy.Content attach/detach/retrieve/fields); hook-extensible operations (taxonomy-save, taxonomy-after-save, taxonomy-type-save, taxonomy-type-after-delete with cascade, beforeSave_content unsets taxonomy fields, content-retrieve auto-populates taxonomies, content-saved processes pending/deleted attachments); default installation (Category/Tag types with Blog/Featured taxonomies on first start); Taxonomy field type integration (Relation<Taxonomy> schema, region-based UI); cloud functions (taxonomy-_ and taxonomy-type-_ operations, taxonomy-content-attach/detach/retrieve); slug validation (type slugs must be unique, taxonomy slugs not enforced); relation-based content linking (contentObj.relation(field).add/remove); complete content retrieval with type pointer inclusion; comprehensive source references from actinium-taxonomy/sdk.js:1-336, plugin.js:1-584; discovered during research: No native parent-child hierarchy support (flat structure only, requires custom parent field), relation count before fetch creates N+1 query problem, outputType parameter inconsistency (can be set on Type/Taxonomy/query params with unclear precedence); best practices (hierarchical keys, field name matches type slug, cache taxonomy lists, limit taxonomy fields, use pointers for queries); common gotchas (taxonomy fields can't be saved directly, content-retrieve auto-adds taxonomies causing extra queries, type deletion cascades to all taxonomies, slug uniqueness not enforced for taxonomies, relation count queries twice per field); critical for content organization, categorization, tagging, SEO-friendly URLs, navigation systems; comparison with WordPress taxonomies (missing: hierarchical categories, term metadata, slug enforcement; has: Parse Relation flexibility, hook extensibility, auto-populate) (Nov 28, 2025)

- ✅ **MemoryCache System Architecture** - Object-path addressing with subscribe/notify pattern wrapping memory-cache NPM package; singleton exports (Reactium.Cache browser, Actinium.Cache server); core API (get/put/set/del/clear with nested path support, subscribe with deep path notifications, merge for import/export); TTL support with expiration callbacks (auto-delete after milliseconds); subscriber registry with UUID-based IDs and hierarchical path tracking; deep path subscriptions (subscribe to 'a.b' fires on 'a.b.c' changes); dispatch notifications (op: set/del/expire/clear/merge with key/value); properties (size, memsize, keys); static helpers (sanitizeKey, denormalizeKey, normalizeKey, getKeyRoot); comprehensive source references from reactium-sdk-core/src/core/MemoryCache.ts:1-357; real-world integration: Actinium.Cache for roles (byName/byLevel/byObjectId with decorateRoles pattern, afterSave invalidation), ACL targets caching (user/role lookups with object-path keys), React hooks with subscriptions (reactive state sync); discovered during research: Nested path sets MERGE not replace (can accumulate stale data), subscriptions fire on ALL descendant changes (parent subscription gets child notifications), TTL expiration callbacks get value but subscribers don't, memory-only cache lost on restart (requires start hook rebuild), merge() converts relative TTL to absolute timestamp, no built-in serialization (must serialize Parse Objects); best practices (hierarchical key naming with namespaces, cleanup subscriptions on unmount, choose deep vs shallow carefully, TTL strategy by data volatility, cache frequently accessed data, batch invalidation via root key deletion); common gotchas (merged nested paths don't replace, subscriber overhead on root keys with high churn, no eviction policy without TTL, single-threaded but no concurrent access issues); critical for performance optimization, reactive state management, role/settings caching, temporary data storage; not suitable for multi-process caching, persistence, large datasets >1GB, cross-server communication (Nov 28, 2025)

### Medium Priority (Re-evaluated)

**REMOVED (Trivial):**

- ❌ Shortcodes System - 102-line plugin, simple registration pattern, no substantial SDK, settings-based config only
- ❌ Navigation System - 88-line plugin, simple type registration, MenuBuilder field type is RichText editor config not framework pattern
- ❌ Parse Server Integration Deep Dive - Standard Parse Server usage, not framework-specific

## NEW RESEARCH TOPICS (Nov 28, 2025 - Second Exploration)

### High Priority (New)

15. ✅ **Actinium Content System Deep Dive** - Complete type-based content management with UUID v5 namespacing for cross-environment consistency; class-based SDK singleton with property getters; Content collection schema (title/meta/data/slug/uuid/taxonomy/type/status/user/parent/children/file fields); CRUD API (find with filtering/pagination, retrieve by uuid/objectId/type+slug, save with validation, delete soft-delete, purge hard-delete, exists check); UUID generation (type+slug→deterministic hash with ENV.CONTENT_NAMESPACE); query parameters (uuid/objectId/title/status/user/type/slug/limit/page); content-query hook for Parse.Query modification; beforeSave hook handler (type/user resolution, ACL generation, status/uuid/slug/data/meta initialization, validation); ACL pattern (private by default, user read/write, super-admin/administrator roles); utility methods (genUUID, genSlug, type resolution, userFromString, stringToArray, assertions); cloud functions (content-save/list/delete/purge/retrieve/exists); Parse Server hooks (beforeFind/afterFind/beforeSave/afterSave/beforeDelete/afterDelete); hook integration (content-save-sanitize, content-before-save, content-validate, content-acl, content-save lifecycle); real-world patterns (blog post creation, type+status filtering, update workflow, soft delete with purge, search by title, hierarchical content, custom validation); comprehensive source references from actinium-content/sdk.js:1-531, plugin.js:1-180, schema.js:1-57; best practices (always provide type, use UUID for sync, structure data/meta appropriately, pagination for large datasets, soft delete workflow, validate in hooks not cloud functions, master key for internal operations); common gotchas (title search min 4 chars, slug defaults to UUID not title, status from type's first value, type resolution performance, pagination limit capped at 100, required fields hardcoded, delete is soft not hard, ACL prevents user access without session, sanitize removes unknown fields, user string not auto-fetched); discovered during research: Taxonomy relation integration, URL plugin integration, Syndicate content enrichment patterns; critical for CMS content management, type-safe content creation, cross-environment sync (Nov 28, 2025)

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

- ✅ **Reactium Utility Helpers (SplitParts & cxFactory)** - Complete documentation of two essential browser utilities; SplitParts class for token-based string template replacement (%key% syntax), progressive .replace() chaining, .value()/.toString() output, Part type with 'part'/'replacement' distinction, React component integration patterns, i18n usage with \_\_() strings, real-world activity log example with conditional templates; cxFactory for namespace-based classname generation, automatic prefix application to all classnames, integration with classnames NPM library for conditional/array/object syntax, BEM-style component naming patterns, real-world usage in AdminSidebar/Dashboard/EventForm with cx() function prop passing, body class management patterns; comparison with alternatives (template literals, Handlebars, CSS Modules, manual concatenation); TypeScript generic support; comprehensive source references from reactium-sdk-core/src/browser/splitter.ts:1-163, classnames.ts:1-21, reactium-admin-content/Content/ActivityLog/ActivityUpdates.js:30-82, reactium-admin-core/Sidebar/index.js:46-169; best practices (i18n templates, namespace conventions, cx prop passing, BEM element naming); common gotchas (SplitParts token format exact match, empty cx() returns namespace, double namespacing, non-string value toString(), React component rendering needs .value() not .toString(), cxFactory not reactive to namespace changes); discovered during research: Activity log ENUMS pattern for scope-based template selection (general vs specific), Handle system exposes cx function for external styling control, useWindowSize/breakpoint integration for responsive class management; critical for component library development, internationalized dynamic content, consistent BEM naming, plugin-extensible UI strings (Nov 28, 2025)

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

25. ✅ **Parse Object Serialization Patterns (Actinium.Utils.serialize)** - Complete utility for converting Parse Objects to plain JavaScript with automatic pointer cleanup; null-safe pass-through (returns null/undefined/primitives as-is); calls toJSON() on data and nested objects; strips **type: 'Pointer' metadata from all pointer fields; preserves ACL objects unchanged; does NOT auto-fetch relations (shows metadata only); handles nested Parse Objects recursively (one serialize call resolves all levels); comparison with alternatives (.toJSON() preserves **type and doesn't resolve nested, JSON.stringify() throws on Parse Objects); real-world usage patterns (cloud function responses, array mapping, cache storage, search indexing, API pagination, nested object resolution, plugin registration); extensive framework usage (20+ files, 40+ direct calls in syndicate/route/user/plugin/search systems); comprehensive source references from actinium-core/lib/utils/serialize.js:19-35; best practices (serialize before cloud function returns, use .map() for arrays, include pointers before serializing, don't serialize twice, cache serialized not Parse Objects, null-safe by design); common gotchas (relations not auto-fetched, pointers not included without .include(), array not auto-mapped, circular references not handled, custom toJSON may not handle nesting, File objects preserve \_\_type, ACL becomes plain object not Parse.ACL instance); performance considerations (lightweight O(n) operation, include vs serialize efficiency, bulk map vs loop); TypeScript integration patterns for type safety; discovered during research: serialize() used in 15+ cloud functions for clean API responses, critical for cache storage to avoid Parse Object issues, required pattern for search indexing with Lunr.js; critical for API responses, cache storage, search indexing, cross-system data transfer (Nov 28, 2025)

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

## NEW RESEARCH TOPICS (Nov 28, 2025 - Full Cycle Research)

### High Priority (Discovered during Syndicate/Content/Serialization research)

26. **Reactium Activity Log and Change Tracking Patterns**

    - Activity log event structure (changeType, meta, user, timestamp)
    - ENUMS-based template selection (general vs specific scope)
    - Change type categories (CREATED, REVISED, CREATED_BRANCH, DELETED_BRANCH, LABELED_BRANCH, SLUG_CHANGED, SET_REVISION, SET_ACL, SET_STATUS)
    - SplitParts integration for dynamic message generation
    - User lookup via acl-targets cache
    - Real-time activity feed rendering
    - History metadata structure (branch, revision, version labeling)
    - **Why it matters**: Critical pattern for audit trails, content management UX, user activity tracking, version history UI
    - **What's undocumented**: Activity log data structure, change event types, template selection patterns, metadata conventions
    - **Key mechanisms**: ChangeItem component pattern, ENUMS.CHANGES template registry, Cache.get('acl-targets') user resolution
    - **Source files**: reactium-admin-content/Content/ActivityLog/ActivityUpdates.js:19-82, enums.js:2-60
    - **Discovered during**: SplitParts/cxFactory research - real-world example of template-based UI messaging (Nov 28, 2025)

27. **Nodemailer Message Options Deep Dive**
    - Complete message options reference (from/to/cc/bcc/subject/text/html/attachments)
    - Attachment patterns (file path, buffer, stream, content types)
    - Email headers customization (replyTo, inReplyTo, headers object, priority)
    - Template integration patterns (Handlebars, EJS, React Email)
    - Inline images and embedded content (cid: references)
    - Multi-part email structure (text + HTML alternatives)
    - Email address formats (string vs object with name/address)
    - Bulk email patterns and rate limiting
    - Email queue systems for reliability
    - Testing strategies (Mailtrap, MailHog, test accounts)
    - **Why it matters**: Claude needs to generate correct email code for password resets, notifications, marketing emails, transactional workflows
    - **What's undocumented**: Complete nodemailer options reference in Actinium context, real-world email patterns, template integration, testing strategies
    - **Key mechanisms**: Actinium.Mail.send() message object structure, nodemailer.MailOptions interface, attachment handling, template rendering
    - **Source files**: nodemailer documentation + actinium-mailer integration patterns
    - **Discovered during**: Mailer System research - realized nodemailer message options are extensive and critical for proper email generation, but not documented in framework context (Nov 28, 2025)

## NEW RESEARCH TOPICS (Nov 29, 2025 - Development Server Exploration)

### High Priority (New - Nov 29, 2025)

28. ✅ ❌ **Hooked CRUD Pattern (hookedRetrieve/hookedSave)** - REMOVED (Trivial + Already Documented - Nov 29, 2025)
    - **Evaluation**: hookedSave is trivial 12-line wrapper (just outputType), hookedRetrieve adds 2 hooks + default sorting (50 lines), hookedQuery already documented
    - **Reality**: Actual "hooked CRUD" pattern (beforeSave/afterSave/beforeDelete hooks with validation/ACL/enrichment) already comprehensively documented in CONTENT_SYSTEM.md, CLOUD_FUNCTION_PATTERNS.md, TAXONOMY_SYSTEM.md
    - **Directive 1 Assessment**: Does not add value - these are thin convenience wrappers around Parse SDK, real extensibility hooks already documented
    - **Decision**: Removed - hookedQuery documented in PARSE_QUERY_PATTERNS.md, Parse Server hooks documented in CLOUD_FUNCTION_PATTERNS.md, hookedSave/hookedRetrieve too trivial

29. ✅ **Field Type Plugin System and Content Type Field Architecture** - COMPLETED (Nov 29, 2025 - Cycle #25)
    - **Research Summary**: Three-registry plugin architecture (ContentType.FieldType for metadata, Component for configuration UI, Content.Editor for editor UI); 20+ built-in field types (Text, Number, Boolean, Date, Select, Array, Object, Pointer, File, URL, RichText, Taxonomy, Publisher, Status); complete registration pattern with FieldType.register(), Component.register(), Content.Editor.register(); configuration component contract (settings via input name attributes), editor component contract (value/onChange/settings props); FieldTypeDialog wrapper for consistent UI; settings flow from config to editor; hookableComponent pattern for extensibility; field-to-schema mapping for Parse Server; priority-based ordering with Enums.priority values
    - **Documentation Created**: FIELD_TYPE_PLUGIN_SYSTEM.md (v1.0.0) with complete registration examples, component contracts, 20+ built-in field types catalog, configuration/editor patterns, best practices, common gotchas
    - **CLAUDEDB Updated**: INDEX.md v1.34.0 (+7 keywords), TASKS.md v1.29.0 (+2 tasks with examples), API.md v1.23.0 (+5 APIs with signatures)
    - **Source References**: reactium-admin-core/Content/TypeEditor/sdk/index.js:141 (FieldType registry), Content/Editor/sdk.js:30-32 (Editor registry), Plugins/FieldTypeText/reactium-hooks.js:1-25 (registration pattern), 20+ field type implementations
    - **Discovered During Research**: FieldTypeDialog hookable component for consistent field config UI, MediaPicker integration patterns for file fields, Content.QuickEditor and Content.Comparison registries (currently TODO in codebase for quick edit/comparison components)
    - **Critical For**: Custom CMS field types, domain-specific content modeling, third-party integrations, workflow-specific fields

### Medium Priority (New - Nov 29, 2025)

30. **FieldTypeDialog Hookable Component and Field Config UI Patterns**
    - FieldTypeDialog hookable component providing consistent field configuration wrapper
    - Drag handle integration for field reordering in Content Type Editor
    - Field name/label standard UI elements (common across all field types)
    - Delete button with confirmation
    - Collapse/expand behavior for field settings
    - Styling conventions and CSS class patterns
    - Props contract for field configuration components
    - Integration with Content Type Editor state management
    - **Why it matters**: Essential for creating custom field types with consistent UX, understanding field config UI architecture, proper integration with Content Type Editor
    - **What's undocumented**: FieldTypeDialog component API and props contract, field configuration lifecycle, drag handle integration patterns, state management for field settings
    - **Key mechanisms**: useHookComponent('FieldTypeDialog', DragHandle) pattern, children render prop for custom settings UI, automatic name/label/delete UI injection
    - **Source files**: reactium-admin-core registered-components/FieldTypeDialog implementation (need to locate), field type plugin implementations using FieldTypeDialog
    - **Discovered during**: Field Type Plugin System research - realized FieldTypeDialog is critical wrapper but not documented, all 20+ field types use it (Nov 29, 2025 - Cycle #25)

31. **Admin Registered Components Pattern**
    - AdminTools.Component.register() pattern for admin UI extensibility
    - Component ID-based retrieval (Component.get('MyComponent'))
    - Integration with admin sections (Dashboard, Content, User, Media)
    - Component lifecycle within admin context
    - Props injection patterns for admin components
    - Real-world examples (custom widgets, content editor extensions, dashboard cards)
    - Comparison with hookable components vs registered components
    - **Why it matters**: Understanding admin plugin architecture, custom admin UI development, component registration patterns
    - **What's undocumented**: AdminTools.Component registration API, component lifecycle, props contract, retrieval patterns
    - **Key mechanisms**: AdminTools.Component.register/get, component ID namespace, admin context injection
    - **Source files**: reactium-admin-core AdminTools implementation, admin plugin component registrations
    - **Discovered during**: Development Server research - admin component registry used throughout but not documented (Nov 29, 2025)

31. **Warning Hook System and Boot-Time Validation**
    - warning hook pattern for startup validation messages
    - ENV variable validation patterns (missing secrets, default values)
    - Configuration validation best practices
    - Warning message formatting and display
    - Integration with development vs production environments
    - Boot-time health checks and diagnostics
    - **Why it matters**: Plugin quality standards, configuration validation, developer experience improvements
    - **What's undocumented**: warning hook usage patterns, validation strategies, message formatting conventions
    - **Key mechanisms**: Hook.register('warning', ...), console.warn() output, ENV validation checks
    - **Source files**: Multiple plugins with warning hooks (mailer, syndicate, etc.)
    - **Discovered during**: Development Server research - warning hooks used for config validation but pattern not documented (Nov 29, 2025)

### Lower Priority (New - Nov 29, 2025)

32. **Fullscreen API Wrapper and Browser API Patterns**
    - Fullscreen API cross-browser wrapper (reactium-sdk-core/src/browser/fullscreen.ts)
    - Browser API abstraction patterns (vendor prefixes, feature detection)
    - Real-world usage in media components
    - Fullscreen state management
    - Exit fullscreen cleanup patterns
    - **Why it matters**: Example of browser API abstraction pattern, useful for media-heavy applications
    - **What's undocumented**: Fullscreen API wrapper usage, browser API abstraction best practices
    - **Key mechanisms**: Vendor prefix handling, feature detection, state management
    - **Source files**: reactium-sdk-core/src/browser/fullscreen.ts
    - **Discovered during**: Development Server research - fullscreen wrapper exists but lower priority utility (Nov 29, 2025)

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
