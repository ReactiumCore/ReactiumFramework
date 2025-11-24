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

## Pending Research Topics

### High Priority

1. ReactiumSyncState Deep Dive

   - **Discovered during**: Handle System research - fundamental observable state pattern
   - **Why it matters**: Core building block for Handle system, useSyncState, and global state patterns
   - **Current gap**: While Handle system is documented, ReactiumSyncState itself needs dedicated coverage
   - **Key mechanisms**:
     - EventTarget-based observable pattern (extends native EventTarget)
     - object-path integration for nested state access
     - Event lifecycle (before-set, set, change, before-del, del, before-insert, insert)
     - Smart merging logic with Hook-based extensibility (use-sync-state-merge-conditions)
     - extend() method for adding custom methods to state instances
     - Comparison with useState/useReducer patterns
   - **Real usage**: Foundation for useSyncState, useRegisterSyncHandle, Reactium.State, routing handles
   - **Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:68-532`
   - **Integration**: Used throughout framework (State singleton, routing handles, plugin state)
   - **Critical for**: Understanding state management philosophy, building custom state patterns, debugging state issues
   - **Research scope**: Event system details, merge conditions hook, extend pattern, performance characteristics, comparison with MobX observables

1. Server-Side Rendering (SSR) Architecture

   - **Discovered during**: Component Binding research - noticed SSR template generation but never fully explored
   - **Why it matters**: Critical for understanding production builds, SEO, performance, and initial page load
   - **Current gap**: SSR workflow, template system, data serialization, hydration process not documented
   - **Key mechanisms**:
     - Template system with Server.AppBindings, Server.AppHeaders, Server.AppScripts registries
     - Server-side React rendering with renderToString (investigate if used)
     - State serialization to window object for client hydration
     - Asset injection (scripts, stylesheets) via registry pattern
     - Hook-driven extensibility (Server.beforeApp, Server.afterApp)
     - FEO (Front End Only) vs SSR rendering modes
   - **Real usage**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/server/renderer/index.mjs`
   - **Integration**: Works with component binding, AppContext system, routing
   - **Critical for**: Production deployments, performance optimization, SEO implementation
   - **Research scope**: Template generation workflow, state hydration pattern, static vs SSR builds, asset management

1a. Reactium-Style Partial System (Gulp)

- Registry-based SCSS partial discovery and aggregation system
- Priority-based compilation order (VARIABLES → MIXINS → BASE → ATOMS → MOLECULES → ORGANISMS → OVERRIDES)
- Hook-driven extensibility (`ddd-styles-partial`, `ddd-styles-partial-glob`)
- Atomic Design System integration with DDD artifacts
- Auto-discovery of `_reactium-style*.scss` files with pattern matching
- Dynamic path transformation for workspace module imports (`reactium_modules/` → `+` prefix)
- Plugin style injection patterns
- Critical for: component development, plugin authoring, debugging SCSS compilation errors
- Questions: SassPartialRegistry pattern matching, priority level purposes, custom partial registration, naming conventions, webpack integration

2. Component Event System Deep Dive

- ComponentEvent and useEventEffect are mentioned but never explored
- Essential for reactive, decoupled component patterns

3. Prefs System Architecture

- LocalStorage management with reactivity - critical gap
- Important for persistent user preferences and app state

4. Pulse System Patterns

- Recurring process scheduler - unique framework feature
- Essential for background tasks, polling, real-time updates

5. Testing Strategies & Patterns

- Critical gap for production apps
- Need guidance on testing DDD artifacts, plugins, Handle-based state

### Medium Priority

6. **Collection Registration**

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
