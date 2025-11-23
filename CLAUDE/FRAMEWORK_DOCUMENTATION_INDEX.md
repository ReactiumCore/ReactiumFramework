<!-- v1.0.0 -->

# Reactium & Actinium Framework Documentation Index

> **Complete documentation suite** for building full-stack applications with Reactium (frontend) and Actinium (backend) frameworks.

---

## Quick Decision Trees

### I Need To...

**Build Something**:

- Create a component → [Component Development](#component-development)
- Create a route → [Routing](#routing)
- Build a plugin (frontend) → [Plugin Development (Frontend)](#plugin-development-frontend)
- Build a plugin (backend) → [Plugin Development (Backend)](#plugin-development-backend)
- Create an API endpoint → [Cloud Functions & API](#cloud-functions--api)
- Define a database schema → [Database & Schema](#database--schema)

**Fix Something**:

- Debug an error → [Debugging & Troubleshooting](#debugging--troubleshooting)
- Check known issues → [KNOWN_ISSUES.md](KNOWN_ISSUES.md)
- Understand error messages → [Common Errors](FRAMEWORK_GOTCHAS.md#common-error-messages)
- Performance issues → [Performance](#performance)
- Build not working → [Build System Gotchas](FRAMEWORK_GOTCHAS.md#build-system)

**Understand Something**:

- How hooks work → [HOOK_DOMAINS_DEEP_DIVE.md](HOOK_DOMAINS_DEEP_DIVE.md)
- How zones work → [ZONE_SYSTEM_DEEP_DIVE.md](ZONE_SYSTEM_DEEP_DIVE.md)
- How capabilities work → [ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system](ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)
- Architecture decisions → [FRAMEWORK_PATTERNS.md](FRAMEWORK_PATTERNS.md)
- Integration patterns → [FRAMEWORK_INTEGRATION.md](FRAMEWORK_INTEGRATION.md)

**Work With Data**:

- Fetch from backend → [Integration: Data Flow](FRAMEWORK_INTEGRATION.md#data-flow-patterns)
- Real-time updates → [Real-Time Features](#real-time-features)
- Authentication → [Authentication & Security](#authentication--security)
- File uploads → [Integration: File Uploads](FRAMEWORK_INTEGRATION.md#file-uploads)

**Deploy**:

- Production setup → [Integration: Deployment](FRAMEWORK_INTEGRATION.md#deployment)
- Environment config → [Actinium: Environment](ACTINIUM_COMPLETE_REFERENCE.md#environment-configuration)

---

## Documentation Overview

This documentation suite provides comprehensive coverage of both frameworks, from foundational concepts to advanced patterns and troubleshooting.

### Documentation Structure

```
Framework Documentation
├── Core Framework Guides
│   ├── REACTIUM_FRAMEWORK.md           # Complete Reactium reference
│   ├── ACTINIUM_FRAMEWORK.md           # Actinium framework guide
│   └── ACTINIUM_COMPLETE_REFERENCE.md  # Actinium consolidated reference (NEW)
│       # Combines: Quick Ref + Framework + Capabilities + Source Analysis
│
├── Integration & Patterns
│   ├── FRAMEWORK_INTEGRATION.md    # Full-stack integration patterns
│   ├── FRAMEWORK_PATTERNS.md       # Best practices & anti-patterns
│   └── FRAMEWORK_GOTCHAS.md        # Troubleshooting & common issues
│
├── Deep Dives & Research
│   ├── HOOK_DOMAINS_DEEP_DIVE.md       # Hook domain system comprehensive guide
│   ├── ZONE_SYSTEM_DEEP_DIVE.md        # Zone system architecture & patterns
│   ├── ZONE_SYSTEM_QUICK_REFERENCE.md  # Zone API quick reference
│   ├── ROUTING_SYSTEM.md               # Routing system comprehensive guide
│   ├── REACTIUM_WEBPACK.md             # ReactiumWebpack SDK guide
│   ├── REGISTRY_SYSTEM.md              # Registry pattern deep dive (NEW)
│   └── REACTIUM_SOURCE_CODE_ANALYSIS.md # Reactium source analysis
│
├── Maintenance & Curation
│   └── KNOWN_ISSUES.md             # Known bugs & technical debt tracking
│
└── Navigation
    └── FRAMEWORK_DOCUMENTATION_INDEX.md  # You are here
```

---

## Quick Navigation

### For Beginners

If you're new to Reactium and Actinium:

1. **Start here**: [REACTIUM_FRAMEWORK.md](REACTIUM_FRAMEWORK.md#introduction)

   - Read "Introduction" and "Key Differentiators"
   - Understand the project structure
   - Learn about the manifest system

2. **Then read**: [ACTINIUM_FRAMEWORK.md](ACTINIUM_FRAMEWORK.md#introduction)

   - Understand backend architecture
   - Learn about Parse Server integration
   - Study the plugin system

3. **Next**: [FRAMEWORK_INTEGRATION.md](FRAMEWORK_INTEGRATION.md#integration-overview)

   - See how frontend and backend connect
   - Learn Parse SDK initialization
   - Study data flow patterns

4. **Finally**: [FRAMEWORK_GOTCHAS.md](FRAMEWORK_GOTCHAS.md)
   - Avoid common pitfalls
   - Know debugging strategies
   - Understand error messages

### For Experienced Developers

If you know React/Express but are new to Reactium/Actinium:

1. **[REACTIUM_FRAMEWORK.md](REACTIUM_FRAMEWORK.md)**

   - Skip to "Core Architecture"
   - Focus on "Plugin System & Registration"
   - Study "Hook System" thoroughly

2. **[ACTINIUM_COMPLETE_REFERENCE.md](ACTINIUM_COMPLETE_REFERENCE.md)** (Recommended)

   - Start with "Quick Reference" for common patterns
   - Read "Framework Architecture" for core concepts
   - Review "Plugin System" and "Cloud Functions"
   - Study "Capabilities System" for authorization

   **OR** [ACTINIUM_FRAMEWORK.md](ACTINIUM_FRAMEWORK.md) (Traditional guide)

   - Skip to "Plugin System"
   - Understand "Hook System"
   - Review "ES Module Requirements"

3. **[FRAMEWORK_PATTERNS.md](FRAMEWORK_PATTERNS.md)**
   - Learn framework-specific patterns
   - Study anti-patterns to avoid
   - Review performance patterns

### For Debugging Issues

When something isn't working:

1. **[KNOWN_ISSUES.md](KNOWN_ISSUES.md)**

   - Check if your issue is a known bug or quirk
   - Review workarounds and fix status

2. **[FRAMEWORK_GOTCHAS.md](FRAMEWORK_GOTCHAS.md)**

   - Check relevant section (Reactium/Actinium/Integration)
   - Review "Common Error Messages"
   - Try "Debugging Strategies"

3. **[FRAMEWORK_PATTERNS.md](FRAMEWORK_PATTERNS.md#anti-patterns-to-avoid)**
   - Verify you're not hitting anti-patterns
   - Compare your code to examples

### For Architecture Planning

When designing a new feature:

1. **[FRAMEWORK_PATTERNS.md](FRAMEWORK_PATTERNS.md)**

   - Review relevant patterns
   - Study real-world examples
   - Consider performance implications

2. **[FRAMEWORK_INTEGRATION.md](FRAMEWORK_INTEGRATION.md)**
   - Choose appropriate data flow pattern
   - Plan authentication strategy
   - Consider real-time requirements

---

## Core Documentation

### 1. REACTIUM_FRAMEWORK.md

**Complete frontend framework guide** covering:

#### Key Topics

- **Architecture**: SDK, Manifest System, DDD Structure
- **Component System**: Registration, Hookable Components, Props
- **Plugin System**: Lifecycle, Creation, Priority Levels
- **Routing**: Enhanced routing, Data loading, Transitions
- **State Management**: `useSyncState`, Global State, Handles, Pulse
- **Hook System**: Registration, Execution, Framework Hooks
- **Build System**: Gulp, Webpack, Manifest Generation
- **CLI Tools**: Component scaffolding, Project management

#### When to Use This Doc

- Building frontend components
- Creating Reactium plugins
- Implementing routes with data loading
- Managing application state
- Understanding build process

#### Key Sections for Quick Reference

- [Component Registration](REACTIUM_FRAMEWORK.md#component-registration)
- [Route Object Specification](REACTIUM_FRAMEWORK.md#route-object-specification)
- [Handle-Based State](REACTIUM_FRAMEWORK.md#3-handles-shared-observable-state)
- [Hook System](REACTIUM_FRAMEWORK.md#hook-system)
- [Best Practices](REACTIUM_FRAMEWORK.md#best-practices--gotchas)

---

### 2. ACTINIUM_FRAMEWORK.md

**Complete backend framework guide** covering:

#### Key Topics

- **Architecture**: Global Object, Initialization Lifecycle
- **Plugin System**: Structure, Registration, Discovery, Validation
- **Hook System**: Async/Sync Hooks, Priority, Context
- **Cloud Functions**: Definition, Gateway, Hooks, Gating
- **Middleware**: Discovery, Priority, Core Middleware
- **Parse Server**: MongoDB Integration, ACLs, Master Key
- **ES Modules**: Syntax Requirements, Import/Export
- **Database**: Schema Definition, Collections, Capabilities

#### When to Use This Doc

- Building backend plugins
- Creating Cloud Functions
- Managing database schemas
- Implementing authentication/authorization
- Adding Express middleware

#### Key Sections for Quick Reference

- [Plugin Structure](ACTINIUM_FRAMEWORK.md#plugin-structure)
- [Cloud Functions](ACTINIUM_FRAMEWORK.md#cloud-functions)
- [Hook System](ACTINIUM_FRAMEWORK.md#hook-system)
- [Parse Server Integration](ACTINIUM_FRAMEWORK.md#parse-server-integration)
- [Schema Initialization](ACTINIUM_FRAMEWORK.md#schema-definition)

---

### 2b. ACTINIUM_COMPLETE_REFERENCE.md (NEW)

**Consolidated Actinium reference** combining all Actinium documentation:

#### What's Included

- **Quick Reference**: Common patterns, code snippets, rapid lookup
- **Framework Architecture**: Core concepts, initialization, global objects
- **Plugin System**: Complete plugin development guide
- **Hook System**: Event-driven architecture, registration, execution
- **Cloud Functions**: API endpoints, capability checks, Parse triggers
- **Capabilities System**: Authorization, roles, permissions (full deep dive)
- **Source Code Insights**: Implementation details, internals, gotchas
- **Troubleshooting**: Common issues, debugging, best practices

#### When to Use This Doc

- **Quick lookup** of Actinium patterns
- **Comprehensive reference** for any Actinium topic
- **Deep dive** into capabilities system
- **Source code** implementation details
- **One-stop** Actinium documentation

#### Key Sections

- [Quick Reference](ACTINIUM_COMPLETE_REFERENCE.md#quick-reference) - Fast pattern lookup
- [Framework Architecture](ACTINIUM_COMPLETE_REFERENCE.md#framework-architecture) - Core concepts
- [Capabilities System](ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system) - Complete authorization guide
- [Source Code Insights](ACTINIUM_COMPLETE_REFERENCE.md#source-code-insights) - Internals
- [Troubleshooting](ACTINIUM_COMPLETE_REFERENCE.md#troubleshooting) - Common issues

**Consolidates**: Previously separate files for quick reference, capabilities deep dive, framework deep dive, and source analysis (now integrated into single comprehensive reference)

---

### 3. FRAMEWORK_INTEGRATION.md

**Full-stack integration patterns** covering:

#### Key Topics

- **Architecture Overview**: Communication protocol, Project structure
- **Data Flow**: Component → Cloud Function → Database patterns
- **Authentication**: Parse SDK initialization, Login, Protected routes
- **Cloud Functions**: Request/response, Error handling, Permissions
- **Real-Time**: Parse Live Query setup, Subscriptions
- **File Uploads**: Backend handling, Frontend implementation
- **Error Handling**: Centralized handlers, Logging
- **Development**: Running both frameworks, Environment config
- **Deployment**: Production setup, CORS, Build process

#### When to Use This Doc

- Connecting frontend to backend
- Implementing authentication
- Setting up real-time features
- Planning data architecture
- Deploying full-stack app

#### Key Sections for Quick Reference

- [Data Flow Patterns](FRAMEWORK_INTEGRATION.md#data-flow-patterns)
- [Authentication](FRAMEWORK_INTEGRATION.md#authentication--session-management)
- [Cloud Function Integration](FRAMEWORK_INTEGRATION.md#cloud-function-integration)
- [Real-Time Communication](FRAMEWORK_INTEGRATION.md#real-time-communication)
- [Complete CRUD Example](FRAMEWORK_INTEGRATION.md#example-1-complete-crud-feature)

---

### 4. FRAMEWORK_PATTERNS.md

**Best practices and anti-patterns** covering:

#### Key Topics

- **Reactium Patterns**: DDD, Static methods, Handles, Hooks, Transitions
- **Actinium Patterns**: SDK pattern, Validation hooks, Capabilities
- **Integration Patterns**: Optimistic UI, Caching, Webhooks
- **Anti-Patterns**: What NOT to do and why
- **Performance**: Code splitting, Debouncing, Pagination
- **Testing**: Cypress component testing

#### When to Use This Doc

- Learning best practices
- Code review
- Refactoring existing code
- Optimizing performance
- Avoiding common mistakes

#### Key Sections for Quick Reference

- [Domain-Driven Organization](FRAMEWORK_PATTERNS.md#pattern-1-domain-driven-component-organization)
- [Handle-Based Shared State](FRAMEWORK_PATTERNS.md#pattern-3-handle-based-shared-state)
- [Plugin SDK Pattern](FRAMEWORK_PATTERNS.md#pattern-8-plugin-sdk-pattern)
- [Anti-Patterns to Avoid](FRAMEWORK_PATTERNS.md#anti-patterns-to-avoid)
- [Performance Patterns](FRAMEWORK_PATTERNS.md#performance-patterns)

---

### 5. FRAMEWORK_GOTCHAS.md

**Troubleshooting and common issues** covering:

#### Key Topics

- **Reactium Gotchas**: Manifest, `useSyncState`, Hooks, Routes, Priority
- **Actinium Gotchas**: ES Modules, Plugins, Cloud Functions, Master Key
- **Integration Gotchas**: Parse SDK, CORS, Session Tokens, Environment
- **Build System**: HMR, Build artifacts, Port conflicts
- **Debugging Strategies**: Logging, Inspection, Network debugging
- **Error Messages**: Common errors and solutions

#### When to Use This Doc

- Something isn't working
- Getting cryptic error messages
- Application behaving unexpectedly
- Need debugging strategies
- Learning what to watch out for

#### Key Sections for Quick Reference

- [Manifest Issues](FRAMEWORK_GOTCHAS.md#gotcha-1-the-manifest-is-sacred)
- [ES Module Errors](FRAMEWORK_GOTCHAS.md#gotcha-11-es-module-syntax-required)
- [CORS Errors](FRAMEWORK_GOTCHAS.md#gotcha-22-cors-errors)
- [Debugging Strategies](FRAMEWORK_GOTCHAS.md#debugging-strategies)
- [Common Errors](FRAMEWORK_GOTCHAS.md#common-error-messages)

---

## Topic-Based Navigation

### Component Development

1. [Reactium: Component System](REACTIUM_FRAMEWORK.md#component-system)
2. [Patterns: Domain-Driven Organization](FRAMEWORK_PATTERNS.md#pattern-1-domain-driven-component-organization)
3. [Patterns: Component Registry](FRAMEWORK_PATTERNS.md#pattern-6-component-registry-pattern)
4. [Gotchas: Component Registration Timing](FRAMEWORK_GOTCHAS.md#gotcha-9-component-registration-timing)

### Zone System (Dynamic Component Composition)

1. [Zone System Deep Dive](ZONE_SYSTEM_DEEP_DIVE.md) - Complete architecture guide
2. [Zone System Quick Reference](ZONE_SYSTEM_QUICK_REFERENCE.md) - API reference
3. [Core Architecture](ZONE_SYSTEM_DEEP_DIVE.md#core-architecture)
4. [Filters, Mappers, Sorters](ZONE_SYSTEM_DEEP_DIVE.md#filters-mappers-and-sorters)
5. [Common Zone Patterns](ZONE_SYSTEM_DEEP_DIVE.md#common-zone-patterns)
6. [Performance Considerations](ZONE_SYSTEM_DEEP_DIVE.md#performance-considerations)

### Routing

1. [Reactium: Routing System](REACTIUM_FRAMEWORK.md#routing-system)
2. [Patterns: Static Method Data Loading](FRAMEWORK_PATTERNS.md#pattern-2-static-method-data-loading)
3. [Patterns: Transition State Management](FRAMEWORK_PATTERNS.md#pattern-5-transition-state-management)
4. [Gotchas: Route Path Syntax](FRAMEWORK_GOTCHAS.md#gotcha-4-route-path-syntax-matters)
5. [Gotchas: Transition State Progression](FRAMEWORK_GOTCHAS.md#gotcha-7-transition-state-requires-manual-progression)

### State Management

1. [Reactium: State Management](REACTIUM_FRAMEWORK.md#state-management)
2. [Patterns: Handle-Based Shared State](FRAMEWORK_PATTERNS.md#pattern-3-handle-based-shared-state)
3. [Gotchas: useSyncState vs useState](FRAMEWORK_GOTCHAS.md#gotcha-2-usesyncstate-is-not-usestate)
4. [Gotchas: useHandle vs useSyncHandle](FRAMEWORK_GOTCHAS.md#gotcha-6-usehandle-vs-usesynchandle)

### Plugin Development (Frontend)

1. [Reactium: Plugin System](REACTIUM_FRAMEWORK.md#plugin-system--registration)
2. [Patterns: Hook-Based Architecture](FRAMEWORK_PATTERNS.md#pattern-4-hook-based-plugin-architecture)
3. [Gotchas: Hook Registration IIFE](FRAMEWORK_GOTCHAS.md#gotcha-3-hook-registration-must-be-in-iife)
4. [Gotchas: Priority Numbers](FRAMEWORK_GOTCHAS.md#gotcha-5-priority-numbers-are-counterintuitive)

### Plugin Development (Backend)

1. [Actinium Complete Reference: Plugin System](ACTINIUM_COMPLETE_REFERENCE.md#plugin-system) (Recommended)
2. [Actinium: Plugin System](ACTINIUM_FRAMEWORK.md#plugin-system) (Traditional)
3. [Patterns: Plugin SDK Pattern](FRAMEWORK_PATTERNS.md#pattern-8-plugin-sdk-pattern)
4. [Patterns: Plugin Dependency Management](FRAMEWORK_PATTERNS.md#pattern-12-plugin-dependency-management)
5. [Gotchas: Plugin Function Must Execute](FRAMEWORK_GOTCHAS.md#gotcha-13-plugin-function-must-execute)
6. [Gotchas: Plugin Order Matters](FRAMEWORK_GOTCHAS.md#gotcha-18-plugin-order-matters)

### Cloud Functions & API

1. [Actinium Complete Reference: Cloud Functions](ACTINIUM_COMPLETE_REFERENCE.md#cloud-functions) (Recommended)
2. [Actinium: Cloud Functions](ACTINIUM_FRAMEWORK.md#cloud-functions) (Traditional)
3. [Integration: Cloud Function Integration](FRAMEWORK_INTEGRATION.md#cloud-function-integration)
4. [Patterns: Capability-Based Authorization](FRAMEWORK_PATTERNS.md#pattern-10-capability-based-authorization)
5. [Gotchas: Master Key Usage](FRAMEWORK_GOTCHAS.md#gotcha-15-master-key-usage-in-cloud-functions)

### Database & Schema

1. [Actinium Complete Reference: Quick Ref - Schema](ACTINIUM_COMPLETE_REFERENCE.md#database-schema-definition)
2. [Actinium: Database and Collections](ACTINIUM_FRAMEWORK.md#database-and-collections)
3. [Patterns: Schema Initialization](FRAMEWORK_PATTERNS.md#pattern-11-schema-initialization-pattern)
4. [Patterns: Hook-Based Validation](FRAMEWORK_PATTERNS.md#pattern-9-hook-based-data-validation)
5. [Gotchas: Schema Changes Require Restart](FRAMEWORK_GOTCHAS.md#gotcha-17-schema-changes-require-server-restart)

### Authentication & Security

1. [Actinium Complete Reference: Capabilities System](ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system) (Complete guide)
2. [Integration: Authentication & Session Management](FRAMEWORK_INTEGRATION.md#authentication--session-management)
3. [Actinium: Capabilities and Roles](ACTINIUM_FRAMEWORK.md#capabilities-and-roles)
4. [Patterns: Capability-Based Authorization](FRAMEWORK_PATTERNS.md#pattern-10-capability-based-authorization)
5. [Gotchas: Session Tokens](FRAMEWORK_GOTCHAS.md#gotcha-23-session-tokens-and-authentication)

### Real-Time Features

1. [Integration: Real-Time Communication](FRAMEWORK_INTEGRATION.md#real-time-communication)
2. [Actinium: Parse Server Integration](ACTINIUM_FRAMEWORK.md#parse-server-integration)

### Performance

1. [Patterns: Performance Patterns](FRAMEWORK_PATTERNS.md#performance-patterns)
2. [Patterns: Backend Caching](FRAMEWORK_PATTERNS.md#pattern-15-backend-caching-pattern)
3. [Patterns: Pagination](FRAMEWORK_PATTERNS.md#pattern-19-pagination-pattern)

### Debugging & Troubleshooting

1. [Gotchas: Debugging Strategies](FRAMEWORK_GOTCHAS.md#debugging-strategies)
2. [Gotchas: Common Error Messages](FRAMEWORK_GOTCHAS.md#common-error-messages)

---

## Code Examples by Use Case

### Building a Simple Component

**Docs to Read**:

- [Reactium: Component System](REACTIUM_FRAMEWORK.md#component-system)
- [Reactium: DDD Structure](REACTIUM_FRAMEWORK.md#domain-driven-design-ddd-structure)

**Example**: See [REACTIUM_FRAMEWORK.md - Example Complete Domain](REACTIUM_FRAMEWORK.md#example-complete-domain)

### Creating a Route with Data Loading

**Docs to Read**:

- [Reactium: Data Loading with loadState](REACTIUM_FRAMEWORK.md#data-loading-with-loadstate)
- [Patterns: Static Method Data Loading](FRAMEWORK_PATTERNS.md#pattern-2-static-method-data-loading)

**Example**: See [Integration: Pattern 2](FRAMEWORK_INTEGRATION.md#pattern-2-route-based-data-loading-with-backend)

### Building a Backend Plugin

**Docs to Read**:

- [Actinium Complete Reference: Quick Reference](ACTINIUM_COMPLETE_REFERENCE.md#quick-reference) (Start here)
- [Actinium Complete Reference: Plugin System](ACTINIUM_COMPLETE_REFERENCE.md#plugin-system)
- [Actinium: Plugin Development](ACTINIUM_FRAMEWORK.md#plugin-development) (Alternative)
- [Patterns: Plugin SDK Pattern](FRAMEWORK_PATTERNS.md#pattern-8-plugin-sdk-pattern)

**Example**: See [Actinium Complete Reference: Essential Plugin Structure](ACTINIUM_COMPLETE_REFERENCE.md#essential-plugin-structure)

### Implementing CRUD Operations

**Docs to Read**:

- [Integration: Cloud Function Integration](FRAMEWORK_INTEGRATION.md#cloud-function-integration)
- [Actinium: Cloud Functions](ACTINIUM_FRAMEWORK.md#cloud-functions)

**Example**: See [Integration: Example 1 - Complete CRUD Feature](FRAMEWORK_INTEGRATION.md#example-1-complete-crud-feature)

### Adding Real-Time Updates

**Docs to Read**:

- [Integration: Real-Time Communication](FRAMEWORK_INTEGRATION.md#real-time-communication)

**Example**: See [Integration: Parse Live Query Setup](FRAMEWORK_INTEGRATION.md#parse-live-query-setup)

---

## Framework Comparison Quick Reference

### Reactium vs Vanilla React

| Feature       | Vanilla React                    | Reactium                                     |
| ------------- | -------------------------------- | -------------------------------------------- |
| Routing       | React Router manually configured | Auto-discovered from `reactium-route-*.js`   |
| State         | `useState`, Context, Redux       | `useSyncState`, Handles, Global State, Pulse |
| Components    | Import directly                  | Component registry, dynamic resolution       |
| Extensibility | HOCs, render props               | Hook system, plugins                         |
| Data Loading  | Custom hooks, useEffect          | `loadState` static methods with Handles      |
| Build         | Manual Webpack config            | Gulp + Webpack, convention-based             |
| CLI           | create-react-app                 | Reactium CLI with scaffolding                |

### Actinium vs Vanilla Express/Parse

| Feature           | Vanilla Express/Parse  | Actinium                                     |
| ----------------- | ---------------------- | -------------------------------------------- |
| Server Setup      | Manual configuration   | Framework-managed initialization             |
| Routes/Middleware | Manual `app.use()`     | Auto-discovered, priority-based              |
| Cloud Functions   | `Parse.Cloud.define()` | `Actinium.Cloud.define()` with plugin gating |
| Extensibility     | Manual module system   | Plugin architecture with hooks               |
| Structure         | Custom organization    | Convention-based plugin structure            |
| Initialization    | Sequential, manual     | Lifecycle hooks with priorities              |
| Module System     | CommonJS or ES Modules | ES Modules required                          |

---

## Version Information

**Documentation Current As Of**: November 2025

**Framework Versions Covered**:

- Reactium Core: 5.x
- Actinium Core: Latest (check `package.json`)

**Note**: While framework versions may evolve, the core concepts and patterns documented here remain applicable. Check official framework repositories for version-specific changes.

---

## Contributing to Documentation

If you find errors, missing information, or opportunities for improvement:

1. **Document your findings**: Note the issue and potential solution
2. **Create examples**: If adding new patterns, include code examples
3. **Test thoroughly**: Verify all code examples work
4. **Update cross-references**: Maintain links between documents

---

## Additional Resources

### Official Framework Repositories

- **Reactium Core**: `reactium_modules/@atomic-reactor/reactium-core`
- **Actinium Core**: `actinium_modules/@atomic-reactor/actinium-core`

### Related Documentation

- Parse Server Documentation: https://docs.parseplatform.org/
- React Documentation: https://react.dev/
- Express Documentation: https://expressjs.com/

### This Project's Examples

- `/ui/src/app/components/` - Reactium component examples
- `/api/src/app/` - Actinium plugin examples

---

## Quick Start Checklist

### New to Both Frameworks?

- [ ] Read [REACTIUM_FRAMEWORK.md Introduction](REACTIUM_FRAMEWORK.md#introduction)
- [ ] Read [ACTINIUM_FRAMEWORK.md Introduction](ACTINIUM_FRAMEWORK.md#introduction)
- [ ] Follow [Integration: Development Workflow](FRAMEWORK_INTEGRATION.md#development-workflow)
- [ ] Review [FRAMEWORK_GOTCHAS.md](FRAMEWORK_GOTCHAS.md) top 5 gotchas
- [ ] Build a simple "Hello World" component
- [ ] Create a simple Cloud Function
- [ ] Connect component to Cloud Function

### Starting a New Feature?

- [ ] Review relevant patterns in [FRAMEWORK_PATTERNS.md](FRAMEWORK_PATTERNS.md)
- [ ] Check [FRAMEWORK_INTEGRATION.md](FRAMEWORK_INTEGRATION.md) for data flow pattern
- [ ] Plan plugin structure (frontend + backend)
- [ ] Define schemas if needed
- [ ] Implement and test incrementally

### Debugging an Issue?

- [ ] Check [FRAMEWORK_GOTCHAS.md](FRAMEWORK_GOTCHAS.md) for your specific issue
- [ ] Review console logs (browser + server)
- [ ] Verify hook/component registration
- [ ] Check Network tab for API calls
- [ ] Try debugging strategies from documentation

---

## Documentation Principles

This documentation suite follows these principles:

1. **Example-Driven**: Every concept includes working code examples
2. **Context-Aware**: Explains "why" in addition to "how"
3. **Gotcha-Aware**: Proactively warns about common pitfalls
4. **Cross-Referenced**: Documents link to related concepts
5. **Real-World**: Examples drawn from actual codebase
6. **Searchable**: Clear headings and consistent terminology
7. **Comprehensive**: Covers beginner to advanced topics

---

## Documentation Maintenance

**Last Updated**: November 21, 2025

**Maintained By**: AI Documentation Steward

**Update Frequency**: As framework evolves or gaps identified

**Recent Curation Sessions**:

- November 22, 2025 (Latest): **Documentation Consolidation & Cleanup**
  - Created `ACTINIUM_COMPLETE_REFERENCE.md` (consolidated 4 separate Actinium files)
  - Deleted redundant files: ACTINIUM_DEEP_DIVE.md, ACTINIUM_CAPABILITIES.md, ACTINIUM_QUICK_REFERENCE.md, ACTINIUM_SOURCE_ANALYSIS_SUMMARY.md
  - Removed temporary curation report references
  - Updated index cross-references
  - Improved decision-tree navigation ("I need to..." quick lookup)
- November 22, 2025: Zone System Deep Dive
  - Created comprehensive zone system documentation
  - Added `ZONE_SYSTEM_DEEP_DIVE.md` and `ZONE_SYSTEM_QUICK_REFERENCE.md`
- November 22, 2025: Routing System Deep Dive
  - Created `ROUTING_SYSTEM.md` with complete lifecycle documentation
- November 22, 2025: ReactiumWebpack Deep Dive
  - Created `REACTIUM_WEBPACK.md` with hook-driven configuration patterns
- November 21, 2025: Hook Domains Deep Dive
  - Created `HOOK_DOMAINS_DEEP_DIVE.md`
  - Source code verification and known issues tracking

**Feedback**: Document issues and gaps for future updates

---

## Summary

This documentation suite provides everything you need to build full-stack applications with Reactium and Actinium:

**Core References**:

- [REACTIUM_FRAMEWORK.md](REACTIUM_FRAMEWORK.md) - Frontend complete guide
- [ACTINIUM_FRAMEWORK.md](ACTINIUM_FRAMEWORK.md) - Backend framework guide
- [ACTINIUM_COMPLETE_REFERENCE.md](ACTINIUM_COMPLETE_REFERENCE.md) - **NEW** Consolidated Actinium reference (recommended)

**Practical Guides**:

- [FRAMEWORK_INTEGRATION.md](FRAMEWORK_INTEGRATION.md) - Full-stack patterns
- [FRAMEWORK_PATTERNS.md](FRAMEWORK_PATTERNS.md) - Best practices
- [FRAMEWORK_GOTCHAS.md](FRAMEWORK_GOTCHAS.md) - Troubleshooting

**Deep Dives**:

- [ZONE_SYSTEM_DEEP_DIVE.md](ZONE_SYSTEM_DEEP_DIVE.md) - Zone system architecture
- [HOOK_DOMAINS_DEEP_DIVE.md](HOOK_DOMAINS_DEEP_DIVE.md) - Hook system deep dive

**Quick Start**: Use the [decision tree](#quick-decision-trees) at the top to find what you need fast!

Happy coding with Reactium and Actinium!
