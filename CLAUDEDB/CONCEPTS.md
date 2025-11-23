<!-- v1.0.0 -->
# CLAUDEDB - Concept Map

**Purpose**: Concept → multi-step implementation path
**Rule**: Each concept links to a learning path (basic → advanced)

---

## Reactium Concepts

### Component Development
**Learning Path**:
1. [Reactium: Component System](../CLAUDE/REACTIUM_FRAMEWORK.md#component-system) - Basic component creation
2. [Reactium: Component Registration](../CLAUDE/REACTIUM_FRAMEWORK.md#component-registration) - Registry pattern
3. [Patterns: Domain-Driven Organization](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-1-domain-driven-component-organization) - Best practices
4. [Gotchas: Component Registration Timing](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-9-component-registration-timing) - Common issues

**Related**: CLI Tools, DDD Structure, Hookable Components

### Routing System
**Learning Path**:
1. [Routing System: Overview](../CLAUDE/ROUTING_SYSTEM.md#overview) - Complete architecture
2. [Routing System: File Discovery & Manifest Generation](../CLAUDE/ROUTING_SYSTEM.md#file-discovery--manifest-generation) - Auto-discovery
3. [Routing System: Route Registration Lifecycle](../CLAUDE/ROUTING_SYSTEM.md#route-registration-lifecycle) - Initialization
4. [Routing System: The register-route Hook](../CLAUDE/ROUTING_SYSTEM.md#the-register-route-hook) - Hook-based modification
5. [Routing System: Transition State Machine](../CLAUDE/ROUTING_SYSTEM.md#transition-state-machine) - Page animations
6. [Routing System: Code Splitting Patterns](../CLAUDE/ROUTING_SYSTEM.md#code-splitting-patterns) - Performance
7. [Routing System: loadState Pattern](../CLAUDE/ROUTING_SYSTEM.md#loadstate-pattern-data-preloading) - Data loading
8. [Routing System: Best Practices](../CLAUDE/ROUTING_SYSTEM.md#best-practices) - Patterns
9. [Routing System: Common Gotchas](../CLAUDE/ROUTING_SYSTEM.md#common-gotchas) - Avoid mistakes

**Related**: Navigation, handleId, transitionState, React Router, Code splitting

### State Management
**Learning Path**:
1. [Reactium: State Management](../CLAUDE/REACTIUM_FRAMEWORK.md#state-management) - Overview of options
2. [Reactium: useSyncState](../CLAUDE/REACTIUM_FRAMEWORK.md#1-local-component-state-usesyncstate) - Local state
3. [Reactium: Handles](../CLAUDE/REACTIUM_FRAMEWORK.md#3-handles-shared-observable-state) - Shared state
4. [Reactium: Global State](../CLAUDE/REACTIUM_FRAMEWORK.md#2-global-state-reactiumstate) - App-wide state
5. [Patterns: Handle-Based Shared State](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-3-handle-based-shared-state) - Best practices
6. [Gotchas: useSyncState Is Not useState](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-2-usesyncstate-is-not-usestate) - Common mistakes
7. [Gotchas: useHandle vs useSyncHandle](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-11-usehandle-vs-usesynchandle) - Subscription patterns

**Related**: Observable state, Reactive programming, Pulse

### Hook System (Reactium)
**Learning Path**:
1. [Reactium: Hook System](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-system) - Basic hooks
2. [Reactium: Hook Registration](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-registration) - Register/execute
3. [Reactium: Common Framework Hooks](../CLAUDE/REACTIUM_FRAMEWORK.md#common-framework-hooks) - Lifecycle
4. [Hook Domains Deep Dive](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md#what-are-hook-domains) - Definition & purpose
5. [Hook Domains: When to Use](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md#when-should-developers-use-domains) - Use cases
6. [Hook Domains: API Reference](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md#api-reference-summary) - Functions
7. [Hook Domains: Best Practices](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md#best-practices) - Patterns
8. [Patterns: Hook-Based Plugin Architecture](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-4-hook-based-plugin-architecture) - Architecture
9. [Gotchas: Hook Registration Must Be in IIFE](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-3-hook-registration-must-be-in-iife) - Common mistakes

**Related**: Events, Lifecycle, Plugins, Priority, Domains

### Plugin System (Reactium)
**Learning Path**:
1. [Reactium: Plugin System](../CLAUDE/REACTIUM_FRAMEWORK.md#plugin-system--registration) - Overview
2. [Reactium: Plugin Lifecycle](../CLAUDE/REACTIUM_FRAMEWORK.md#plugin-lifecycle) - Initialization
3. [Reactium: Creating a Plugin](../CLAUDE/REACTIUM_FRAMEWORK.md#creating-a-plugin) - Implementation
4. [Patterns: Hook-Based Plugin Architecture](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-4-hook-based-plugin-architecture) - Architecture
5. [Gotchas: Hook Registration Must Be in IIFE](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-3-hook-registration-must-be-in-iife) - Common issues

**Related**: Hooks, DDD, Components, Priority

### Zone System
**Learning Path**:
1. [Zone System Deep Dive](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md) - Complete architecture
2. [Zone System Quick Reference](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md) - API reference
3. [Zone System: Core Architecture](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md#core-architecture) - How it works
4. [Zone System: Filters, Mappers, Sorters](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md#filters-mappers-and-sorters) - Transformations
5. [Zone System: Common Patterns](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md#common-zone-patterns) - Use cases
6. [Zone System: Performance](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md#performance-considerations) - Optimization

**Related**: Dynamic UI, Component composition, Registry

### Manifest System
**Learning Path**:
1. [Reactium: Manifest System](../CLAUDE/REACTIUM_FRAMEWORK.md#manifest-system) - What it is
2. [Reactium: DDD Structure](../CLAUDE/REACTIUM_FRAMEWORK.md#domain-driven-design-ddd-structure) - File naming
3. [Reactium: Manifest Regeneration](../CLAUDE/REACTIUM_FRAMEWORK.md#manifest-regeneration) - How to update
4. [Gotchas: The Manifest is Sacred](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-1-the-manifest-is-sacred) - Critical rules

**Related**: Auto-discovery, Convention over configuration, Build system

### Build System
**Learning Path**:
1. [Reactium: Build System](../CLAUDE/REACTIUM_FRAMEWORK.md#build-system) - Overview
2. [Reactium: Build Process](../CLAUDE/REACTIUM_FRAMEWORK.md#build-process-overview) - How it works
3. [Reactium: Webpack Configuration](../CLAUDE/REACTIUM_FRAMEWORK.md#webpack-configuration) - Customization
4. [Gotchas: Build System](../CLAUDE/FRAMEWORK_GOTCHAS.md#build-system-gotchas) - Common issues

**Related**: Gulp, Webpack, Babel, HMR, Manifest

---

## Actinium Concepts

### Plugin System (Actinium)
**Learning Path**:
1. [Actinium: Plugin System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#plugin-system) - Overview
2. [Actinium Quick Ref: Essential Plugin Structure](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#essential-plugin-structure) - Basic structure
3. [Actinium: Plugin Discovery](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#plugin-discovery) - How plugins load
4. [Actinium: Plugin Registration](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#plugin-registration) - Implementation
5. [Actinium: Plugin Gating](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#plugin-gating) - Cloud function protection
6. [Patterns: Plugin SDK Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-8-plugin-sdk-pattern) - Best practices
7. [Patterns: Plugin Dependency Management](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-12-plugin-dependency-management) - Dependencies
8. [Gotchas: Plugin Function Must Execute](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-13-plugin-function-must-execute) - Common mistakes

**Related**: Hooks, Cloud Functions, SDK pattern, Order/Priority

### Hook System (Actinium)
**Learning Path**:
1. [Actinium: Hook System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#hook-system) - Overview
2. [Actinium Quick Ref: Hook Registration Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#hook-registration-patterns) - Basic usage
3. [Actinium Quick Ref: Common Lifecycle Hooks](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#common-lifecycle-hooks) - Key hooks
4. [Hook Domains Deep Dive](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md#what-are-hook-domains) - Definition & purpose
5. [Hook Domains: Plugin Lifecycle Management](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md#use-case-1-plugin-lifecycle-management-primary-use-case) - Primary use case
6. [Hook Domains: Best Practices](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md#best-practices) - Patterns
7. [Patterns: Hook-Based Data Validation](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-9-hook-based-data-validation) - Use cases

**Related**: Events, Lifecycle, beforeSave, afterSave, Priority, Domains

### Cloud Functions
**Learning Path**:
1. [Actinium: Cloud Functions](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#cloud-functions) - Overview
2. [Actinium Quick Ref: Cloud Function Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#cloud-function-patterns) - Basic structure
3. [Actinium: Plugin Gating](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#plugin-gating) - Automatic protection
4. [Integration: Cloud Function Integration](../CLAUDE/FRAMEWORK_INTEGRATION.md#cloud-function-integration) - Frontend usage
5. [Patterns: Capability-Based Authorization](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-10-capability-based-authorization) - Security
6. [Gotchas: Master Key Usage](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-15-master-key-usage-in-cloud-functions) - Permissions

**Related**: API endpoints, Parse.Cloud.run, req.params, Capabilities

### Capabilities System
**Learning Path**:
1. [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system) - Complete guide
2. [Actinium Quick Ref: Capability Checking](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capability-checking) - Usage patterns
3. [Patterns: Capability-Based Authorization](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-10-capability-based-authorization) - Best practices
4. [Integration: Authentication](../CLAUDE/FRAMEWORK_INTEGRATION.md#authentication--session-management) - Integration

**Related**: Permissions, Roles, Authorization, CloudHasCapabilities, ACL

### Database & Schema
**Learning Path**:
1. [Actinium Quick Ref: Database Schema Definition](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#database-schema-definition) - Basic schema
2. [Actinium: Framework Architecture](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#framework-architecture) - Parse integration
3. [Patterns: Schema Initialization Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-11-schema-initialization-pattern) - Best practices
4. [Patterns: Hook-Based Data Validation](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-9-hook-based-data-validation) - Validation
5. [Gotchas: Schema Changes Require Restart](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-17-schema-changes-require-server-restart) - Common issues

**Related**: Collections, Parse.Object, Query, MongoDB

### Middleware
**Learning Path**:
1. [Actinium: Middleware System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#middleware-system) - Overview
2. [Patterns: Middleware Priority Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-13-middleware-priority-pattern) - Execution order
3. [Actinium: Framework Architecture](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#framework-architecture) - How it fits

**Related**: Express, HTTP, CORS, Body parsing, Priority

### Initialization & Lifecycle
**Learning Path**:
1. [Actinium: Initialization Sequence](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#initialization-sequence) - Complete sequence
2. [Actinium Quick Ref: Common Lifecycle Hooks](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#common-lifecycle-hooks) - Key hooks
3. [Actinium: Framework Architecture](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#framework-architecture) - Design

**Related**: init, start, running, schema, install, activate

---

## Integration Concepts

### Full-Stack Data Flow
**Learning Path**:
1. [Integration: Data Flow Patterns](../CLAUDE/FRAMEWORK_INTEGRATION.md#data-flow-patterns) - Overview
2. [Integration: Cloud Function Integration](../CLAUDE/FRAMEWORK_INTEGRATION.md#cloud-function-integration) - Backend calls
3. [Routing System: loadState Pattern](../CLAUDE/ROUTING_SYSTEM.md#loadstate-pattern-data-preloading) - Route data loading
4. [Routing System: Handle Persistence](../CLAUDE/ROUTING_SYSTEM.md#handle-persistence) - State management
5. [Patterns: Static Method Data Loading](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-2-static-method-data-loading) - Best practices
6. [Patterns: Optimistic UI Updates](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-14-optimistic-ui-updates) - UX patterns

**Related**: Parse SDK, Cloud Functions, State management, Handles

### Authentication
**Learning Path**:
1. [Integration: Authentication & Session Management](../CLAUDE/FRAMEWORK_INTEGRATION.md#authentication--session-management) - Complete guide
2. [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system) - Authorization
3. [Patterns: Capability-Based Authorization](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-10-capability-based-authorization) - Patterns
4. [Gotchas: Session Tokens](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-23-session-tokens-and-authentication) - Common issues

**Related**: Parse.User, Login, Roles, Capabilities, Session management

### Real-Time Communication
**Learning Path**:
1. [Integration: Real-Time Communication](../CLAUDE/FRAMEWORK_INTEGRATION.md#real-time-communication) - Complete guide
2. [Integration: Parse Live Query Setup](../CLAUDE/FRAMEWORK_INTEGRATION.md#parse-live-query-setup) - Configuration
3. [Actinium: Framework Architecture](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#framework-architecture) - Server setup

**Related**: Live Query, WebSocket, Subscriptions, Parse queries

### File Uploads
**Learning Path**:
1. [Integration: File Uploads](../CLAUDE/FRAMEWORK_INTEGRATION.md#file-uploads) - Complete guide
2. [Actinium: Framework Architecture](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#framework-architecture) - File handling

**Related**: Parse.File, Cloud Functions, Frontend forms

### Deployment
**Learning Path**:
1. [Integration: Deployment](../CLAUDE/FRAMEWORK_INTEGRATION.md#deployment) - Production setup
2. [Integration: Development Workflow](../CLAUDE/FRAMEWORK_INTEGRATION.md#development-workflow) - Environment config
3. [Reactium: Build System](../CLAUDE/REACTIUM_FRAMEWORK.md#build-system) - Build process

**Related**: Production, Environment variables, CORS, Build

---

## Cross-Cutting Concepts

### Priority & Execution Order
**Learning Path**:
1. [Actinium Quick Ref: Priority Constants](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#priority-constants) - Constants
2. [Gotchas: Priority Numbers Are Counterintuitive](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-6-priority-numbers-are-counterintuitive) - How it works
3. [Patterns: Middleware Priority Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-13-middleware-priority-pattern) - Use cases

**Related**: Hooks, Middleware, Plugins, Order

### Convention Over Configuration
**Learning Path**:
1. [Reactium: DDD Structure](../CLAUDE/REACTIUM_FRAMEWORK.md#domain-driven-design-ddd-structure) - File naming
2. [Reactium: Manifest System](../CLAUDE/REACTIUM_FRAMEWORK.md#manifest-system) - Auto-discovery
3. [Actinium: Plugin Discovery](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#plugin-discovery) - Backend patterns
4. [Patterns: Domain-Driven Organization](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-1-domain-driven-component-organization) - Best practices

**Related**: Manifest, Auto-discovery, DDD, File patterns

### Event-Driven Architecture
**Learning Path**:
1. [Reactium: Hook System](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-system) - Frontend hooks
2. [Actinium: Hook System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#hook-system) - Backend hooks
3. [Hook Domains Deep Dive](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md) - Advanced patterns
4. [Reactium: Pulse](../CLAUDE/REACTIUM_FRAMEWORK.md#4-pulse-pubsub-events) - Pub/sub
5. [Patterns: Hook-Based Plugin Architecture](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-4-hook-based-plugin-architecture) - Architecture

**Related**: Hooks, Events, Lifecycle, Plugins

### Performance Optimization
**Learning Path**:
1. [Patterns: Performance Patterns](../CLAUDE/FRAMEWORK_PATTERNS.md#performance-patterns) - Overview
2. [Patterns: Code Splitting](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-17-code-splitting-with-dynamic-imports) - Bundle size
3. [Patterns: Backend Caching](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-15-backend-caching-pattern) - Caching
4. [Patterns: Pagination](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-19-pagination-pattern) - Large datasets
5. [Patterns: Debounced Queries](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-18-debounced-parse-queries) - API calls
6. [Zone System: Performance](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md#performance-considerations) - Zone optimization

**Related**: Optimization, Caching, Code splitting, Lazy loading

---

**Usage**: Find concept → Follow learning path → Build understanding step-by-step
**Coverage**: 25+ major framework concepts with multi-step learning paths
