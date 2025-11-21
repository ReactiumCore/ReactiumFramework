# Reactium/Actinium Framework Research Plan

Topics for future exploration sessions with specialized agents.

## Completed Research

- ✅ **Browser SDK React Hooks & Utilities** - Cataloged 16 React hooks and 13 browser utilities from `@atomic-reactor/reactium-sdk-core/browser`

## Pending Research Topics

### High Priority

1. **Hook System Domains**
   - What are domains in the Hook system? (e.g., `@reactium` domain seen in code)
   - How are they used?
   - When should developers use domains vs no domain?
   - Pattern examples from core plugins

2. **Zone System Deep Dive**
   - How filters, mappers, and sorters work
   - Common zone patterns from core plugins
   - Best practices for zone component design
   - Performance considerations

3. **ReactiumWebpack SDK**
   - How to use `ReactiumWebpack.extend()`
   - Common webpack customizations
   - Migration path from `webpack.override.js`
   - Examples from core plugins

4. **Routing System Architecture**
   - Complete lifecycle from file scan to route registration
   - How `register-route` hook modifies routes
   - Transition state machine details
   - Code splitting patterns with routes

### Medium Priority

5. **Actinium Capabilities System**
   - How capabilities differ from ACLs
   - Defining custom capabilities
   - Capability checking patterns
   - Role-based vs capability-based authorization

6. **Manifest Generation Process**
   - `manifest-tools.js` internals
   - Globby patterns for DDD artifacts
   - How to extend manifest scanning
   - Custom artifact types

7. **Plugin Dependency Resolution**
   - How `pluginDependencies` array works
   - Order vs dependencies
   - Circular dependency handling
   - Plugin activation/deactivation flow

8. **Middleware Auto-Discovery (Actinium)**
   - File patterns for middleware discovery
   - Priority-based registration
   - Express app configuration hooks
   - Common middleware patterns

### Lower Priority

9. **HMR Configuration**
   - How HMR works with Reactium
   - BrowserSync integration
   - Webpack dev middleware setup
   - Custom HMR handlers

10. **Handle System Patterns**
    - `useSelectHandle` use cases
    - Performance optimization with handles
    - Handle lifecycle management
    - When to use Handle vs Context

11. **Parse Server Integration**
    - How `@atomic-reactor/reactium-api` initializes Parse
    - Session management
    - Proxy configuration for `/api`
    - Live Query setup

12. **Pulse System**
    - Recurring process patterns
    - Scheduling options
    - Pulse lifecycle
    - Use cases vs setInterval/setTimeout

13. **Prefs System**
    - LocalStorage patterns
    - Object-path notation
    - Migration patterns
    - Sync across tabs

14. **Fullscreen API Usage**
    - Component fullscreen patterns
    - Browser compatibility handling
    - Exit fullscreen edge cases

15. **Component Registry Patterns**
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
