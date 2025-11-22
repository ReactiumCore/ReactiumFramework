# CLAUDEDB - Task-Based Index

**Purpose**: "I need to..." → implementation sections
**Rule**: Every task links directly to the most relevant implementation guide

---

## Build Something

### Create a component
→ [Reactium: Component System](../CLAUDE/REACTIUM_FRAMEWORK.md#component-system)
→ [Patterns: Domain-Driven Organization](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-1-domain-driven-component-organization)
→ [Reactium: CLI Tools](../CLAUDE/REACTIUM_FRAMEWORK.md#cli-tools)

**Quick CLI**:
```bash
npx reactium component -n MyComponent -d src/app/components -r "/my-route" -H -s --unattended
```

### Create a route
→ [Reactium: Routing System](../CLAUDE/REACTIUM_FRAMEWORK.md#routing-system)
→ [Reactium: Route Object Specification](../CLAUDE/REACTIUM_FRAMEWORK.md#route-object-specification)

### Create a route with data loading
→ [Reactium: Data Loading with loadState](../CLAUDE/REACTIUM_FRAMEWORK.md#data-loading-with-loadstate)
→ [Patterns: Static Method Data Loading](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-2-static-method-data-loading)

### Create a frontend plugin
→ [Reactium: Plugin System](../CLAUDE/REACTIUM_FRAMEWORK.md#plugin-system--registration)
→ [Reactium: Creating a Plugin](../CLAUDE/REACTIUM_FRAMEWORK.md#creating-a-plugin)
→ [Patterns: Hook-Based Plugin Architecture](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-4-hook-based-plugin-architecture)

### Create a backend plugin
→ [Actinium: Plugin System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#plugin-system)
→ [Actinium Quick Ref: Essential Plugin Structure](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#essential-plugin-structure)
→ [Patterns: Plugin SDK Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-8-plugin-sdk-pattern)

### Create a Cloud Function
→ [Actinium: Cloud Functions](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#cloud-functions)
→ [Actinium Quick Ref: Cloud Function Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#cloud-function-patterns)
→ [Integration: Cloud Function Integration](../CLAUDE/FRAMEWORK_INTEGRATION.md#cloud-function-integration)

### Create an API endpoint
→ [Actinium: Cloud Functions](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#cloud-functions)
→ [Integration: Cloud Function Integration](../CLAUDE/FRAMEWORK_INTEGRATION.md#cloud-function-integration)

### Define a database schema
→ [Actinium Quick Ref: Database Schema Definition](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#database-schema-definition)
→ [Patterns: Schema Initialization Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-11-schema-initialization-pattern)

### Add permissions/capabilities
→ [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)
→ [Patterns: Capability-Based Authorization](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-10-capability-based-authorization)

### Add middleware
→ [Actinium: Middleware System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#middleware-system)
→ [Patterns: Middleware Priority Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-13-middleware-priority-pattern)

---

## Work With Data

### Fetch data from backend
→ [Integration: Data Flow Patterns](../CLAUDE/FRAMEWORK_INTEGRATION.md#data-flow-patterns)
→ [Integration: Cloud Function Integration](../CLAUDE/FRAMEWORK_INTEGRATION.md#cloud-function-integration)

### Load data on route navigation
→ [Reactium: Data Loading with loadState](../CLAUDE/REACTIUM_FRAMEWORK.md#data-loading-with-loadstate)
→ [Patterns: Static Method Data Loading](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-2-static-method-data-loading)

### Share state between components
→ [Reactium: Handles - Shared Observable State](../CLAUDE/REACTIUM_FRAMEWORK.md#3-handles-shared-observable-state)
→ [Patterns: Handle-Based Shared State](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-3-handle-based-shared-state)

### Manage local component state
→ [Reactium: useSyncState](../CLAUDE/REACTIUM_FRAMEWORK.md#1-local-component-state-usesyncstate)
→ [Gotchas: useSyncState Is Not useState](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-2-usesyncstate-is-not-usestate)

### Query database
→ [Actinium: Framework Architecture](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#framework-architecture)
→ [Integration: Data Flow Patterns](../CLAUDE/FRAMEWORK_INTEGRATION.md#data-flow-patterns)

### Validate data before saving
→ [Patterns: Hook-Based Data Validation](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-9-hook-based-data-validation)

### Cache expensive operations
→ [Patterns: Backend Caching Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-15-backend-caching-pattern)

### Paginate large datasets
→ [Patterns: Pagination Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-19-pagination-pattern)

---

## Authentication & Security

### Implement user login
→ [Integration: Authentication & Session Management](../CLAUDE/FRAMEWORK_INTEGRATION.md#authentication--session-management)

### Check user permissions
→ [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)
→ [Actinium Quick Ref: Capability Checking](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capability-checking)

### Protect routes
→ [Integration: Authentication](../CLAUDE/FRAMEWORK_INTEGRATION.md#authentication--session-management)
→ [Patterns: Conditional Route Registration](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-7-conditional-route-registration)

### Protect Cloud Functions
→ [Actinium Quick Ref: Cloud Function Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#cloud-function-patterns)
→ [Actinium Quick Ref: Capability Checking](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capability-checking)

### Define custom roles
→ [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)

### Set up ACLs
→ [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)

---

## Real-Time Features

### Set up real-time updates
→ [Integration: Real-Time Communication](../CLAUDE/FRAMEWORK_INTEGRATION.md#real-time-communication)

### Subscribe to database changes
→ [Integration: Real-Time Communication](../CLAUDE/FRAMEWORK_INTEGRATION.md#real-time-communication)

### Configure Live Query
→ [Integration: Real-Time Communication](../CLAUDE/FRAMEWORK_INTEGRATION.md#real-time-communication)

---

## UI & Zones

### Add component to zone
→ [Zone System Quick Ref: Component Registration](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#component-registration)
→ [Zone System Deep Dive](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md)

### Filter zone components
→ [Zone System Quick Ref: Filters](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#filters)
→ [Zone System Deep Dive: Filters](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md#filters-mappers-and-sorters)

### Transform zone components
→ [Zone System Quick Ref: Mappers](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#mappers)

### Control render order
→ [Zone System Quick Ref: Sorters](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md#sorters)

### Create dynamic UI
→ [Zone System Deep Dive](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md)
→ [Patterns: Component Registry Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-6-component-registry-pattern)

---

## Hooks & Events

### Register a hook
→ [Reactium: Hook Registration](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-registration)
→ [Actinium Quick Ref: Hook Registration Patterns](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#hook-registration-patterns)

### Listen for events
→ [Reactium: Pulse - Pub/Sub Events](../CLAUDE/REACTIUM_FRAMEWORK.md#4-pulse-pubsub-events)

### Hook into lifecycle
→ [Actinium Quick Ref: Common Lifecycle Hooks](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#common-lifecycle-hooks)
→ [Reactium: Common Framework Hooks](../CLAUDE/REACTIUM_FRAMEWORK.md#common-framework-hooks)

### Manage hook domains
→ [Hook Domains Deep Dive](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md)

### Control execution order
→ [Actinium Quick Ref: Priority Constants](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#priority-constants)
→ [Gotchas: Priority Numbers](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-6-priority-numbers-are-counterintuitive)

---

## Build & Deploy

### Run development server
→ [Integration: Development Workflow](../CLAUDE/FRAMEWORK_INTEGRATION.md#development-workflow)

### Build for production
→ [Reactium: Build System](../CLAUDE/REACTIUM_FRAMEWORK.md#build-system)
→ [Integration: Deployment](../CLAUDE/FRAMEWORK_INTEGRATION.md#deployment)

### Deploy to production
→ [Integration: Deployment](../CLAUDE/FRAMEWORK_INTEGRATION.md#deployment)

### Configure environment
→ [Integration: Development Workflow](../CLAUDE/FRAMEWORK_INTEGRATION.md#development-workflow)

### Customize webpack
→ [Reactium: Build System](../CLAUDE/REACTIUM_FRAMEWORK.md#build-system)

### Regenerate manifest
→ [Reactium: Manifest System](../CLAUDE/REACTIUM_FRAMEWORK.md#manifest-regeneration)
→ [Gotchas: The Manifest is Sacred](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-1-the-manifest-is-sacred)

---

## Debug & Fix

### Debug errors
→ [Gotchas: Debugging Strategies](../CLAUDE/FRAMEWORK_GOTCHAS.md#debugging-strategies)

### Check known issues
→ [Known Issues](../CLAUDE/KNOWN_ISSUES.md)

### Fix CORS errors
→ [Gotchas: CORS Errors](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-22-cors-errors)

### Fix manifest issues
→ [Gotchas: The Manifest is Sacred](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-1-the-manifest-is-sacred)

### Fix component not rendering
→ [Gotchas: Component Registration Timing](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-9-component-registration-timing)

### Fix route not working
→ [Gotchas: Route Path Syntax](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-4-route-path-syntax-matters)

### Fix hook not firing
→ [Gotchas: Hook Registration Must Be in IIFE](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-3-hook-registration-must-be-in-iife)

### Fix ES module errors
→ [Gotchas: ES Module Syntax Required](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-11-es-module-syntax-required)

### Fix session/auth issues
→ [Gotchas: Session Tokens](../CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-23-session-tokens-and-authentication)

### Fix build errors
→ [Gotchas: Build System](../CLAUDE/FRAMEWORK_GOTCHAS.md#build-system-gotchas)

### Fix performance issues
→ [Patterns: Performance Patterns](../CLAUDE/FRAMEWORK_PATTERNS.md#performance-patterns)

---

## Optimize

### Improve performance
→ [Patterns: Performance Patterns](../CLAUDE/FRAMEWORK_PATTERNS.md#performance-patterns)

### Reduce bundle size
→ [Patterns: Code Splitting with Dynamic Imports](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-17-code-splitting-with-dynamic-imports)

### Optimize queries
→ [Patterns: Pagination Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-19-pagination-pattern)

### Debounce API calls
→ [Patterns: Debounced Parse Queries](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-18-debounced-parse-queries)

### Cache data
→ [Patterns: Backend Caching Pattern](../CLAUDE/FRAMEWORK_PATTERNS.md#pattern-15-backend-caching-pattern)

---

## Learn

### Understand architecture
→ [Reactium: Core Architecture](../CLAUDE/REACTIUM_FRAMEWORK.md#core-architecture)
→ [Actinium: Framework Architecture](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#framework-architecture)

### Understand hooks
→ [Reactium: Hook System](../CLAUDE/REACTIUM_FRAMEWORK.md#hook-system)
→ [Actinium: Hook System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#hook-system)
→ [Hook Domains Deep Dive](../CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md)

### Understand zones
→ [Zone System Deep Dive](../CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md)
→ [Zone System Quick Reference](../CLAUDE/ZONE_SYSTEM_QUICK_REFERENCE.md)

### Understand capabilities
→ [Actinium: Capabilities System](../CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)

### Understand integration
→ [Framework Integration](../CLAUDE/FRAMEWORK_INTEGRATION.md)

### Best practices
→ [Framework Patterns](../CLAUDE/FRAMEWORK_PATTERNS.md)

### Common mistakes
→ [Framework Gotchas](../CLAUDE/FRAMEWORK_GOTCHAS.md)

---

**Usage**: Think "I need to [task]" → Find task above → Click link → Read implementation
**Coverage**: 60+ common developer tasks organized by category
