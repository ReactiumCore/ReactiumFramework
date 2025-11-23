# Reactium/Actinium Framework Research Plan

Topics for future exploration sessions with specialized agents.

## Completed Research

- ✅ **Browser SDK React Hooks & Utilities** - Cataloged 16 React hooks and 13 browser utilities from `@atomic-reactor/reactium-sdk-core/browser`
- ✅ **Hook System Domains** - Comprehensive deep dive into domain functionality, use cases, patterns, and lifecycle management (Nov 21, 2025)
- ✅ **Zone System Deep Dive** - Complete analysis of Zone architecture, filters/mappers/sorters, zone patterns from core plugins, performance optimization strategies, and best practices (Nov 22, 2025)
- ✅ **Documentation Structure Cleanup** - Resolved REACTIUM_CONTEXT.md broken references, verified documentation accuracy (Nov 22, 2025)
- ✅ **Actinium Capabilities System** - Complete deep dive into capability vs ACL architecture, role-based authorization, built-in vs custom capabilities, server/client implementation patterns, Parse Server integration, and workflow capabilities (Nov 22, 2025)
- ✅ **Routing System Architecture** - Complete lifecycle from file discovery to route registration, register-route hook modification patterns, transition state machine (EXITING→LOADING→ENTERING→READY), code splitting via dynamic imports, loadState data preloading, and Handle-based state management (Nov 22, 2025)

## Pending Research Topics

### High Priority

2. **ReactiumWebpack SDK**
   - How to use `ReactiumWebpack.extend()`
   - Common webpack customizations
   - Migration path from `webpack.override.js`
   - Examples from core plugins


### High Priority (Newly Identified)

1. **Example Code Audit & Correction**
   - Document known bugs in example code (`Enums.priority.normal`)
   - Create issue list for example code corrections
   - Verify all example code matches current framework version
   - Update templates in CLI to use correct patterns

### Medium Priority

6. **Parse Server ACL Patterns in Actinium**
   - CloudACL utility usage patterns
   - Combining ACLs with capabilities
   - Object-level vs feature-level permissions
   - AclTargets cloud function
   - Parse CLP configuration from capabilities

7. **Actinium Roles System Deep Dive**
   - Role levels and hierarchy
   - Role relations (roles containing roles)
   - User-role assignment patterns
   - Built-in roles (super-admin, administrator, banned, anonymous)
   - Role cache management

8. **Manifest Generation Process**
   - `manifest-tools.js` internals
   - Globby patterns for DDD artifacts
   - How to extend manifest scanning
   - Custom artifact types

9. **Plugin Dependency Resolution**
   - How `pluginDependencies` array works
   - Order vs dependencies
   - Circular dependency handling
   - Plugin activation/deactivation flow

10. **Middleware Auto-Discovery (Actinium)**
   - File patterns for middleware discovery
   - Priority-based registration
   - Express app configuration hooks
   - Common middleware patterns

11. **Content Type System Architecture**
   - Type registration and schema
   - Field type plugins
   - Dynamic capability generation
   - Content UUID generation (namespace patterns)
   - Type-specific routes

### Lower Priority

12. **HMR Configuration**
   - How HMR works with Reactium
   - BrowserSync integration
   - Webpack dev middleware setup
   - Custom HMR handlers

13. **Handle System Patterns**
    - `useSelectHandle` use cases
    - Performance optimization with handles
    - Handle lifecycle management
    - When to use Handle vs Context

14. **Parse Server Integration**
    - How `@atomic-reactor/reactium-api` initializes Parse
    - Session management
    - Proxy configuration for `/api`
    - Live Query setup

15. **Pulse System**
    - Recurring process patterns
    - Scheduling options
    - Pulse lifecycle
    - Use cases vs setInterval/setTimeout

16. **Prefs System**
    - LocalStorage patterns
    - Object-path notation
    - Migration patterns
    - Sync across tabs

17. **Fullscreen API Usage**
    - Component fullscreen patterns
    - Browser compatibility handling
    - Exit fullscreen edge cases

18. **Component Registry Patterns**
    - Dynamic component replacement
    - Plugin-based component overrides
    - Versioning components
    - Component decoration

## Research Guidelines

- Keep explorations focused and time-boxed
- Document findings concisely
- Include real examples from core plugins
- Note patterns, not just APIs
- Identify common pitfalls

## Output Goals

Each research session should produce:
1. Concise summary document
2. Code examples from actual framework usage
3. Best practices identified
4. Common gotchas documented
