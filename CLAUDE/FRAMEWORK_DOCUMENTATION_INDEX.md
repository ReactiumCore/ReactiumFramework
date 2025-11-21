# Reactium & Actinium Framework Documentation Index

> **Complete documentation suite** for building full-stack applications with Reactium (frontend) and Actinium (backend) frameworks.

## Documentation Overview

This documentation suite provides comprehensive coverage of both frameworks, from foundational concepts to advanced patterns and troubleshooting.

### Documentation Structure

```
Framework Documentation
├── Core Framework Guides
│   ├── REACTIUM_FRAMEWORK.md       # Complete Reactium reference
│   └── ACTINIUM_FRAMEWORK.md       # Complete Actinium reference
│
├── Integration & Patterns
│   ├── FRAMEWORK_INTEGRATION.md    # Full-stack integration patterns
│   ├── FRAMEWORK_PATTERNS.md       # Best practices & anti-patterns
│   └── FRAMEWORK_GOTCHAS.md        # Troubleshooting & common issues
│
└── This File
    └── FRAMEWORK_DOCUMENTATION_INDEX.md  # You are here
```

---

## Quick Navigation

### For Beginners

If you're new to Reactium and Actinium:

1. **Start here**: [REACTIUM_FRAMEWORK.md](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#introduction)
   - Read "Introduction" and "Key Differentiators"
   - Understand the project structure
   - Learn about the manifest system

2. **Then read**: [ACTINIUM_FRAMEWORK.md](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#introduction)
   - Understand backend architecture
   - Learn about Parse Server integration
   - Study the plugin system

3. **Next**: [FRAMEWORK_INTEGRATION.md](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#integration-overview)
   - See how frontend and backend connect
   - Learn Parse SDK initialization
   - Study data flow patterns

4. **Finally**: [FRAMEWORK_GOTCHAS.md](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md)
   - Avoid common pitfalls
   - Know debugging strategies
   - Understand error messages

### For Experienced Developers

If you know React/Express but are new to Reactium/Actinium:

1. **[REACTIUM_FRAMEWORK.md](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md)**
   - Skip to "Core Architecture"
   - Focus on "Plugin System & Registration"
   - Study "Hook System" thoroughly

2. **[ACTINIUM_FRAMEWORK.md](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md)**
   - Skip to "Plugin System"
   - Understand "Hook System"
   - Review "ES Module Requirements"

3. **[FRAMEWORK_PATTERNS.md](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md)**
   - Learn framework-specific patterns
   - Study anti-patterns to avoid
   - Review performance patterns

### For Debugging Issues

When something isn't working:

1. **[FRAMEWORK_GOTCHAS.md](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md)**
   - Check relevant section (Reactium/Actinium/Integration)
   - Review "Common Error Messages"
   - Try "Debugging Strategies"

2. **[FRAMEWORK_PATTERNS.md](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#anti-patterns-to-avoid)**
   - Verify you're not hitting anti-patterns
   - Compare your code to examples

### For Architecture Planning

When designing a new feature:

1. **[FRAMEWORK_PATTERNS.md](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md)**
   - Review relevant patterns
   - Study real-world examples
   - Consider performance implications

2. **[FRAMEWORK_INTEGRATION.md](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md)**
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
- [Component Registration](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#component-registration)
- [Route Object Specification](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#route-object-specification)
- [Handle-Based State](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#3-handles-shared-observable-state)
- [Hook System](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#hook-system)
- [Best Practices](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#best-practices--gotchas)

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
- [Plugin Structure](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#plugin-structure)
- [Cloud Functions](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#cloud-functions)
- [Hook System](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#hook-system)
- [Parse Server Integration](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#parse-server-integration)
- [Schema Initialization](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#schema-definition)

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
- [Data Flow Patterns](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#data-flow-patterns)
- [Authentication](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#authentication--session-management)
- [Cloud Function Integration](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#cloud-function-integration)
- [Real-Time Communication](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#real-time-communication)
- [Complete CRUD Example](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#example-1-complete-crud-feature)

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
- [Domain-Driven Organization](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-1-domain-driven-component-organization)
- [Handle-Based Shared State](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-3-handle-based-shared-state)
- [Plugin SDK Pattern](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-8-plugin-sdk-pattern)
- [Anti-Patterns to Avoid](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#anti-patterns-to-avoid)
- [Performance Patterns](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#performance-patterns)

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
- [Manifest Issues](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-1-the-manifest-is-sacred)
- [ES Module Errors](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-11-es-module-syntax-required)
- [CORS Errors](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-22-cors-errors)
- [Debugging Strategies](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#debugging-strategies)
- [Common Errors](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#common-error-messages)

---

## Topic-Based Navigation

### Component Development
1. [Reactium: Component System](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#component-system)
2. [Patterns: Domain-Driven Organization](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-1-domain-driven-component-organization)
3. [Patterns: Component Registry](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-6-component-registry-pattern)
4. [Gotchas: Component Registration Timing](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-9-component-registration-timing)

### Routing
1. [Reactium: Routing System](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#routing-system)
2. [Patterns: Static Method Data Loading](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-2-static-method-data-loading)
3. [Patterns: Transition State Management](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-5-transition-state-management)
4. [Gotchas: Route Path Syntax](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-4-route-path-syntax-matters)
5. [Gotchas: Transition State Progression](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-7-transition-state-requires-manual-progression)

### State Management
1. [Reactium: State Management](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#state-management)
2. [Patterns: Handle-Based Shared State](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-3-handle-based-shared-state)
3. [Gotchas: useSyncState vs useState](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-2-usesyncstate-is-not-usestate)
4. [Gotchas: useHandle vs useSyncHandle](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-6-usehandle-vs-usesynchandle)

### Plugin Development (Frontend)
1. [Reactium: Plugin System](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#plugin-system--registration)
2. [Patterns: Hook-Based Architecture](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-4-hook-based-plugin-architecture)
3. [Gotchas: Hook Registration IIFE](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-3-hook-registration-must-be-in-iife)
4. [Gotchas: Priority Numbers](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-5-priority-numbers-are-counterintuitive)

### Plugin Development (Backend)
1. [Actinium: Plugin System](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#plugin-system)
2. [Patterns: Plugin SDK Pattern](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-8-plugin-sdk-pattern)
3. [Patterns: Plugin Dependency Management](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-12-plugin-dependency-management)
4. [Gotchas: Plugin Function Must Execute](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-13-plugin-function-must-execute)
5. [Gotchas: Plugin Order Matters](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-18-plugin-order-matters)

### Cloud Functions & API
1. [Actinium: Cloud Functions](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#cloud-functions)
2. [Integration: Cloud Function Integration](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#cloud-function-integration)
3. [Patterns: Capability-Based Authorization](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-10-capability-based-authorization)
4. [Gotchas: Master Key Usage](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-15-master-key-usage-in-cloud-functions)

### Database & Schema
1. [Actinium: Database and Collections](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#database-and-collections)
2. [Patterns: Schema Initialization](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-11-schema-initialization-pattern)
3. [Patterns: Hook-Based Validation](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-9-hook-based-data-validation)
4. [Gotchas: Schema Changes Require Restart](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-17-schema-changes-require-server-restart)

### Authentication & Security
1. [Integration: Authentication & Session Management](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#authentication--session-management)
2. [Actinium: Capabilities and Roles](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#capabilities-and-roles)
3. [Patterns: Capability-Based Authorization](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-10-capability-based-authorization)
4. [Gotchas: Session Tokens](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#gotcha-23-session-tokens-and-authentication)

### Real-Time Features
1. [Integration: Real-Time Communication](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#real-time-communication)
2. [Actinium: Parse Server Integration](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#parse-server-integration)

### Performance
1. [Patterns: Performance Patterns](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#performance-patterns)
2. [Patterns: Backend Caching](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-15-backend-caching-pattern)
3. [Patterns: Pagination](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-19-pagination-pattern)

### Debugging & Troubleshooting
1. [Gotchas: Debugging Strategies](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#debugging-strategies)
2. [Gotchas: Common Error Messages](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md#common-error-messages)

---

## Code Examples by Use Case

### Building a Simple Component

**Docs to Read**:
- [Reactium: Component System](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#component-system)
- [Reactium: DDD Structure](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#domain-driven-design-ddd-structure)

**Example**: See [REACTIUM_FRAMEWORK.md - Example Complete Domain](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#example-complete-domain)

### Creating a Route with Data Loading

**Docs to Read**:
- [Reactium: Data Loading with loadState](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#data-loading-with-loadstate)
- [Patterns: Static Method Data Loading](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-2-static-method-data-loading)

**Example**: See [Integration: Pattern 2](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#pattern-2-route-based-data-loading-with-backend)

### Building a Backend Plugin

**Docs to Read**:
- [Actinium: Plugin Development](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#plugin-development)
- [Patterns: Plugin SDK Pattern](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md#pattern-8-plugin-sdk-pattern)

**Example**: See [Actinium: Step-by-Step Plugin Creation](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#step-by-step-plugin-creation)

### Implementing CRUD Operations

**Docs to Read**:
- [Integration: Cloud Function Integration](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#cloud-function-integration)
- [Actinium: Cloud Functions](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#cloud-functions)

**Example**: See [Integration: Example 1 - Complete CRUD Feature](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#example-1-complete-crud-feature)

### Adding Real-Time Updates

**Docs to Read**:
- [Integration: Real-Time Communication](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#real-time-communication)

**Example**: See [Integration: Parse Live Query Setup](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#parse-live-query-setup)

---

## Framework Comparison Quick Reference

### Reactium vs Vanilla React

| Feature | Vanilla React | Reactium |
|---------|---------------|----------|
| Routing | React Router manually configured | Auto-discovered from `reactium-route-*.js` |
| State | `useState`, Context, Redux | `useSyncState`, Handles, Global State, Pulse |
| Components | Import directly | Component registry, dynamic resolution |
| Extensibility | HOCs, render props | Hook system, plugins |
| Data Loading | Custom hooks, useEffect | `loadState` static methods with Handles |
| Build | Manual Webpack config | Gulp + Webpack, convention-based |
| CLI | create-react-app | Reactium CLI with scaffolding |

### Actinium vs Vanilla Express/Parse

| Feature | Vanilla Express/Parse | Actinium |
|---------|----------------------|----------|
| Server Setup | Manual configuration | Framework-managed initialization |
| Routes/Middleware | Manual `app.use()` | Auto-discovered, priority-based |
| Cloud Functions | `Parse.Cloud.define()` | `Actinium.Cloud.define()` with plugin gating |
| Extensibility | Manual module system | Plugin architecture with hooks |
| Structure | Custom organization | Convention-based plugin structure |
| Initialization | Sequential, manual | Lifecycle hooks with priorities |
| Module System | CommonJS or ES Modules | ES Modules required |

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

- [ ] Read [REACTIUM_FRAMEWORK.md Introduction](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md#introduction)
- [ ] Read [ACTINIUM_FRAMEWORK.md Introduction](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md#introduction)
- [ ] Follow [Integration: Development Workflow](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md#development-workflow)
- [ ] Review [FRAMEWORK_GOTCHAS.md](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md) top 5 gotchas
- [ ] Build a simple "Hello World" component
- [ ] Create a simple Cloud Function
- [ ] Connect component to Cloud Function

### Starting a New Feature?

- [ ] Review relevant patterns in [FRAMEWORK_PATTERNS.md](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md)
- [ ] Check [FRAMEWORK_INTEGRATION.md](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md) for data flow pattern
- [ ] Plan plugin structure (frontend + backend)
- [ ] Define schemas if needed
- [ ] Implement and test incrementally

### Debugging an Issue?

- [ ] Check [FRAMEWORK_GOTCHAS.md](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md) for your specific issue
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

**Last Updated**: November 20, 2025

**Maintained By**: AI Documentation Orchestrator

**Update Frequency**: As framework evolves or gaps identified

**Feedback**: Document issues and gaps for future updates

---

## Summary

This documentation suite provides everything you need to build full-stack applications with Reactium and Actinium:

**Core References**:
- [REACTIUM_FRAMEWORK.md](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md) - Frontend complete guide
- [ACTINIUM_FRAMEWORK.md](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md) - Backend complete guide

**Practical Guides**:
- [FRAMEWORK_INTEGRATION.md](/home/john/reactium-framework/FRAMEWORK_INTEGRATION.md) - Full-stack patterns
- [FRAMEWORK_PATTERNS.md](/home/john/reactium-framework/FRAMEWORK_PATTERNS.md) - Best practices
- [FRAMEWORK_GOTCHAS.md](/home/john/reactium-framework/FRAMEWORK_GOTCHAS.md) - Troubleshooting

Use the navigation above to find exactly what you need, when you need it.

Happy coding with Reactium and Actinium!
