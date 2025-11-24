# Reactium Framework

A full-stack React/Node.js framework combining frontend components (Reactium) with a Parse Server backend (Actinium) for building modern web applications.

## 🚀 What is Reactium Framework?

Reactium Framework is a comprehensive full-stack development platform that unifies:

- **Reactium** - Frontend React framework with advanced state management, routing, and component architecture
- **Actinium** - Backend Parse Server framework with plugins, cloud functions, and database management
- **Seamless Integration** - Built-in patterns for connecting frontend and backend with real-time capabilities

### Key Features

- 🎯 **Domain-Driven Design** - Convention-over-configuration file structure
- 🔌 **Plugin Architecture** - Extend both frontend and backend with modular plugins
- 🎨 **Component System** - Hookable, replaceable components with dynamic registration
- 🌐 **Zone System** - Dynamic UI composition without prop drilling
- ⚡ **Observable State** - Event-driven state management with ReactiumSyncState
- 🔐 **Capabilities System** - Granular permission control and authorization
- 🚦 **Route Management** - Advanced routing with transitions and data preloading
- 📡 **Real-Time Updates** - Built-in Parse Live Query support
- 🛠️ **Extensible SDK** - Framework APIs available throughout the stack
- 📦 **Build System** - Webpack/Gulp-based build with manifest auto-discovery

---

## 📂 Repository Structure

This monorepo contains:

```
reactium-framework/
├── Actinium-Plugins/          # Backend plugins for Actinium
├── Reactium-Core-Plugins/     # Core frontend plugins for Reactium
├── Reactium-Admin-Plugins/    # Admin UI plugins
├── Reactium-GraphQL-Plugin/   # GraphQL integration
├── CLI/                       # Reactium CLI tools (arcli)
├── reactium-sdk-core/         # Core SDK package
├── example-reactium-project/  # Reference implementation
├── CLAUDE/                    # Framework documentation
├── CLAUDEDB/                  # Documentation navigation system
└── cypress/                   # E2E testing
```

### Core Packages

- **Actinium-Plugins** - Server-side plugins, cloud functions, and backend features
- **Reactium-Core-Plugins** - Essential frontend plugins (routing, components, zones)
- **reactium-sdk-core** - Shared SDK for hooks, registries, and utilities
- **CLI** - Command-line tools for scaffolding and development

### Documentation

- **CLAUDE/** - Comprehensive framework documentation (20+ guides)
- **CLAUDEDB/** - Quick navigation system for documentation
- **example-reactium-project/** - Working example with best practices

---

## 📚 Documentation

### Quick Start Guides

**For AI Assistants & Developers**: Start with [CLAUDEDB/](./CLAUDEDB/) for instant navigation:

- **[INDEX.md](./CLAUDEDB/INDEX.md)** - Keyword lookup (100+ terms)
- **[TASKS.md](./CLAUDEDB/TASKS.md)** - "How do I..." task-based navigation (60+ tasks)
- **[CONCEPTS.md](./CLAUDEDB/CONCEPTS.md)** - Learning paths for major concepts (25+ topics)
- **[API.md](./CLAUDEDB/API.md)** - Function signatures and API reference (60+ functions)

### Complete Framework Documentation

The [CLAUDE/](./CLAUDE/) directory contains comprehensive guides:

#### Getting Started

- [REACTIUM_FRAMEWORK.md](./CLAUDE/REACTIUM_FRAMEWORK.md) - Frontend framework overview
- [ACTINIUM_COMPLETE_REFERENCE.md](./CLAUDE/ACTINIUM_COMPLETE_REFERENCE.md) - Backend complete reference
- [FRAMEWORK_INTEGRATION.md](./CLAUDE/FRAMEWORK_INTEGRATION.md) - Connecting frontend & backend

#### Core Systems

- [ROUTING_SYSTEM.md](./CLAUDE/ROUTING_SYSTEM.md) - Advanced routing with transitions
- [ZONE_SYSTEM_DEEP_DIVE.md](./CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md) - Dynamic UI composition
- [HOOK_DOMAINS_DEEP_DIVE.md](./CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md) - Event-driven architecture
- [HANDLE_SYSTEM.md](./CLAUDE/HANDLE_SYSTEM.md) - Shared observable state
- [REGISTRY_SYSTEM.md](./CLAUDE/REGISTRY_SYSTEM.md) - Plugin extensibility pattern
- [HOOKABLE_COMPONENT.md](./CLAUDE/HOOKABLE_COMPONENT.md) - Replaceable components
- [REACTIUM_SYNC_STATE.md](./CLAUDE/REACTIUM_SYNC_STATE.md) - Observable state architecture
- [COMPONENT_EVENT_SYSTEM.md](./CLAUDE/COMPONENT_EVENT_SYSTEM.md) - Custom events
- [APPCONTEXT_PROVIDER_SYSTEM.md](./CLAUDE/APPCONTEXT_PROVIDER_SYSTEM.md) - React Context integration

#### Advanced Topics

- [REACTIUM_WEBPACK.md](./CLAUDE/REACTIUM_WEBPACK.md) - Build system customization
- [SDK_EXTENSION_PATTERN.md](./CLAUDE/SDK_EXTENSION_PATTERN.md) - Extending the framework
- [FRAMEWORK_PATTERNS.md](./CLAUDE/FRAMEWORK_PATTERNS.md) - Best practices
- [FRAMEWORK_GOTCHAS.md](./CLAUDE/FRAMEWORK_GOTCHAS.md) - Common mistakes & solutions
- [KNOWN_ISSUES.md](./CLAUDE/KNOWN_ISSUES.md) - Known limitations

---

## 🎯 Common Tasks

### I want to...

**Build a component**

```bash
npx reactium component -n MyComponent -d src/app/components -r "/my-route"
```

→ See [TASKS.md - Create a component](./CLAUDEDB/TASKS.md#create-a-component)

**Create a backend API endpoint**

```javascript
Actinium.Cloud.define('my-function', async (req) => {
  return { success: true };
});
```

→ See [TASKS.md - Create a Cloud Function](./CLAUDEDB/TASKS.md#create-a-cloud-function)

**Share state between components**

```javascript
// Provider
useRegisterSyncHandle('myHandle', () => new ReactiumSyncState({ count: 0 }));

// Consumer
const handle = useSyncHandle('myHandle');
```

→ See [TASKS.md - Share state between components](./CLAUDEDB/TASKS.md#share-state-between-components)

**Add dynamic UI to a zone**

```javascript
Reactium.Zone.addComponent({
  id: 'my-widget',
  zone: 'sidebar',
  component: MyWidget,
  order: 100,
});
```

→ See [TASKS.md - Add component to zone](./CLAUDEDB/TASKS.md#add-component-to-zone)

**More tasks**: See [CLAUDEDB/TASKS.md](./CLAUDEDB/TASKS.md) for 60+ common development tasks

---

## 🏗️ Architecture

### Frontend (Reactium)

```
reactium-core/
└── src/
   ├── app/               # Application code (DDD structure)
    │   ├── components/    # Shared components
    │   ├── api/          # API integrations
    │   └── main/         # Entry points
    └── reactium_modules/ # Plugins
        ├── @reactium/
        │   ├── reactium-routing/  # Core routing
        │   ├── reactium-zone/     # Zone system
        │   └── ...
        └── my-plugin/    # Custom plugins
```

### Backend (Actinium)

```
actinium-server/
└── src/
    ├── app/              # Application code
    │   ├── cloud/       # Cloud functions
    │   └── schema/      # Database schemas
    └── actinium_modules/ # Backend plugins
        ├── @atomic-reactor/
        │   ├── actinium-capability/
        │   └── actinium-user/
        └── my-plugin/
```

### Key Patterns

1. **Domain-Driven Design** - Features organized by domain, not technical role
2. **Plugin Architecture** - Everything is extensible via plugins
3. **Hook System** - Event-driven lifecycle with priority-based execution
4. **Registry Pattern** - Centralized registration for components, routes, capabilities
5. **Observable State** - ReactiumSyncState with EventTarget-based reactivity
6. **Handle Pattern** - Global component communication via registered handles

---

## 🚦 Getting Started

### Prerequisites

- Node.js 14+
- npm or yarn
- MongoDB (for Actinium backend)

### Quick Start

1. **Clone example project**

   ```bash
   cd example-reactium-project
   npm install
   ```

2. **Start development**

   ```bash
   npm run local  # Starts both frontend and backend
   ```

3. **Access application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:9000/parse
   - Admin Dashboard: http://localhost:9000/admin

### Project Structure (New Project)

```bash
my-app/
├── package.json
├── reactium-webpack.js    # Webpack customization
├── src/
│   ├── index.js          # Frontend entry
│   ├── server.js         # Backend entry
│   ├── app/              # Your application code
│   │   ├── components/   # React components
│   │   ├── api/         # API integrations
│   │   └── main/        # Root component
│   └── reactium_modules/ # Plugins
└── public/               # Static assets
```

---

## 🔌 Plugin Development

### Frontend Plugin Example

```javascript
// src/reactium_modules/my-plugin/reactium-hooks.js
(async () => {
  const { Hook, Component, Enums } = await import(
    '@atomic-reactor/reactium-core/sdk'
  );

  Hook.register(
    'plugin-init',
    async () => {
      const MyComponent = await import('./MyComponent');
      Component.register('MyComponent', MyComponent.default);
    },
    Enums.priority.neutral,
    'my-plugin'
  );
})();
```

### Backend Plugin Example

```javascript
// src/actinium_modules/my-plugin/plugin.js
import Actinium from '@atomic-reactor/actinium-core';

const PLUGIN = {
  ID: 'MyPlugin',
  name: 'My Plugin',
  version: '1.0.0',
};

const MOD = () => {
  Actinium.Plugin.register(PLUGIN, true);

  Actinium.Cloud.define(PLUGIN.ID, 'myFunction', async (req) => {
    return { success: true };
  });
};

export default MOD();
```

---

## 🔍 Find What You Need

### By Keyword

> "What are Capabilities?"

→ Open [CLAUDEDB/INDEX.md](./CLAUDEDB/INDEX.md), search "Capabilities", click direct link

### By Task

> "I need to create a route with data loading"

→ Open [CLAUDEDB/TASKS.md](./CLAUDEDB/TASKS.md), find task, follow implementation links

### By Concept

> "How does the Zone System work?"

→ Open [CLAUDEDB/CONCEPTS.md](./CLAUDEDB/CONCEPTS.md), follow step-by-step learning path

### By API

> "What's the signature for Hook.register?"

→ Open [CLAUDEDB/API.md](./CLAUDEDB/API.md), find function, see signature + docs

---

## 🤝 Contributing

This is a monorepo containing the Reactium Framework ecosystem. Key areas:

- **Core Framework** - SDK, routing, zones, state management
- **Plugins** - Extend functionality for common use cases
- **Documentation** - Help developers understand the framework
- **CLI Tools** - Developer experience improvements
- **Examples** - Reference implementations

---

## 📖 Learning Resources

### Start Here (New Developers)

1. [Reactium Framework Overview](./CLAUDE/REACTIUM_FRAMEWORK.md)
2. [Creating Your First Component](./CLAUDEDB/TASKS.md#create-a-component)
3. [Understanding Hooks](./CLAUDE/REACTIUM_FRAMEWORK.md#hook-system)
4. [State Management Options](./CLAUDE/REACTIUM_FRAMEWORK.md#state-management)

### Common Use Cases

- [Full-Stack Data Flow](./CLAUDE/FRAMEWORK_INTEGRATION.md#data-flow-patterns)
- [Authentication & Authorization](./CLAUDE/FRAMEWORK_INTEGRATION.md#authentication--session-management)
- [Real-Time Updates](./CLAUDE/FRAMEWORK_INTEGRATION.md#real-time-communication)
- [Dynamic UI with Zones](./CLAUDE/ZONE_SYSTEM_DEEP_DIVE.md)

### Advanced Topics

- [Component Replacement System](./CLAUDE/HOOKABLE_COMPONENT.md)
- [Observable State Architecture](./CLAUDE/REACTIUM_SYNC_STATE.md)
- [Webpack Customization](./CLAUDE/REACTIUM_WEBPACK.md)
- [Plugin Development Patterns](./CLAUDE/FRAMEWORK_PATTERNS.md)

---

## 🐛 Troubleshooting

### Common Issues

**Build errors after adding a file?**
→ See [Manifest is Sacred](./CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-1-the-manifest-is-sacred)

**Component not rendering?**
→ See [Component Registration Timing](./CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-9-component-registration-timing)

**Hook not firing?**
→ See [Hook Registration IIFE](./CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-3-hook-registration-must-be-in-iife)

**CORS errors?**
→ See [CORS Configuration](./CLAUDE/FRAMEWORK_GOTCHAS.md#gotcha-22-cors-errors)

**More solutions**: See [FRAMEWORK_GOTCHAS.md](./CLAUDE/FRAMEWORK_GOTCHAS.md) for 20+ common issues

---

## 📜 License

See LICENSE files in individual packages.

---

## 🙏 Acknowledgments

Reactium Framework combines best practices from React, Parse Server, and modern web development to create a cohesive full-stack platform.

---

**Quick Links**

- 📖 [Documentation Index](./CLAUDEDB/INDEX.md)
- 🎯 [Task-Based Guide](./CLAUDEDB/TASKS.md)
- 🧠 [Concept Learning Paths](./CLAUDEDB/CONCEPTS.md)
- ⚙️ [API Reference](./CLAUDEDB/API.md)
- 🔧 [Example Project](./example-reactium-project/)
- ❓ [FAQ](./FAQ.md)

**Questions?** Start with [CLAUDEDB/](./CLAUDEDB/) for instant answers.
