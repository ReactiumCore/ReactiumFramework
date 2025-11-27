<!-- v1.1.0 -->

# CLI Commands Reference and Workflow Guide

**Purpose**: Document all Reactium CLI commands with workflow-oriented guidance on WHEN and WHY to use each command, command combinations, and decision trees for common development tasks.

**Target Audience**: Claude Code assisting developers to recommend proper CLI usage, workflow patterns, and command combinations for efficient Reactium/Actinium development.

---

## Overview

The Reactium CLI (`npx reactium`) provides 30+ commands for project initialization, code generation, plugin development, backend operations, and package management. Commands are organized by context (Reactium frontend vs Actinium backend) and purpose.

**Key Concepts**:

- **Reactium commands**: Frontend development (components, routes, styles, hooks)
- **Actinium commands**: Backend development (cloud functions, collections, middleware)
- **Core commands**: Project management (init, auth, update, install)
- **Workflow combinations**: Common multi-command patterns for complete features

---

## Command Categories

### 1. Project Initialization Commands

#### `npx reactium init`

**Purpose**: Initialize a new Reactium (frontend) or Actinium (backend) project

**Source**: `CLI/commands/init/index.js:1-104`, `CLI/commands/init/actions.js:1-114`

**When to use**:
- Starting a new Reactium web application
- Starting a new Actinium API server
- Evaluating the framework (quick start)

**How it works**:
1. Prompts for project type: `app` (Reactium) or `api` (Actinium)
2. Downloads GitHub repo archive (master.zip or tagged release)
3. Extracts to current directory with strip=1 (removes top-level folder)
4. Optionally runs `npm install` for dependencies

**Flags**:
- `-t, --type [flavor]` - Project type: `app` or `api`
- `--quick` - Skip dependency installation

**Example workflows**:
```bash
# Initialize Reactium application
npx reactium init --type app

# Initialize Actinium API server
npx reactium init --type api

# Quick init without installing deps (faster evaluation)
npx reactium init --type app --quick
```

**Integration**: Downloads from GitHub repos configured in `config.reactium.repo` and `config.actinium.repo`

**Common gotchas**:
- Must be run in empty directory or will overwrite files
- Uses `decompress` with strip:1, so repo structure flattens
- `--quick` flag skips `npm install`, must run manually later

---

### 2. Authentication Commands

#### `npx reactium auth`

**Purpose**: Authenticate against Actinium registry or custom Actinium server for publishing plugins/packages

**Source**: `CLI/commands/auth/index.js:1-149`

**When to use**:
- Before publishing plugins to Reactium registry
- Setting up authentication for custom Actinium server
- Validating existing session
- Clearing stale authentication

**How it works**:
1. Prompts for username/password (or accepts via flags)
2. Authenticates against Actinium Parse Server
3. Stores session token in CLI config for subsequent commands
4. Supports custom server/app configuration

**Flags**:
- `-u, --username [username]` - Username
- `-p, --password [password]` - Password
- `-a, --app [app]` - Actinium app ID
- `-s, --server [server]` - Actinium server URL
- `-V, --validate [validate]` - Validate existing session
- `-r, --restore [restore]` - Restore default app/server values
- `-c, --clear [clear]` - Clear existing session

**Example workflows**:
```bash
# Authenticate with prompts
npx reactium auth

# Authenticate with credentials
npx reactium auth -u Bob -p 'MyP455VV0RD!'

# Authenticate against custom server
npx reactium auth -s 'https://my-actinium/api' -a 'MyActinium'

# Validate existing session
npx reactium auth -v

# Clear session (logout)
npx reactium auth -c

# Restore default registry settings
npx reactium auth -r
```

**Integration**: Saves credentials to `.arcli/config.json` for use by `package publish` and other registry commands

**Common gotchas**:
- Custom server/app values persist in config.json
- Use `-r` to restore defaults before publishing to public registry
- Session validation doesn't prompt for credentials if invalid

---

### 3. Reactium Frontend Commands

These commands generate Reactium frontend code (components, routes, styles, hooks, domains).

#### `npx reactium component`

**Purpose**: Generate React component with optional route, hooks, domain, and stylesheet

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/component/reactium-arcli.js:1-159`

**When to use**:
- Creating new page components
- Creating reusable UI components
- Building feature components with full architecture (hooks + domain + route)

**How it works**:
1. Prompts for destination, component name, route path
2. Prompts for optional: Reactium hooks file, domain file, stylesheet
3. Generates component file + optional supporting files
4. Hook-driven extensibility via `arcli-component-*` hooks

**Flags**:
- `-d, --destination [path]` - Component directory location
- `-n, --name [name]` - Component name (PascalCase)
- `-r, --route [route]` - Route path (e.g., `/about`, `['/page-1', '/page-2']`)
- `--hooks` - Generate `reactium-hooks-*.js` file for plugin registration
- `--domain` - Generate `reactium-domain-*.js` file for DDD domain
- `--style [type]` - Generate style partial file with prefix: `default`, `mixins`, `variables`, `base`, `atoms`, `molecules`, `organisms`, `overrides`
- `--unattended` - Skip confirmation prompts

**Generated files**:
- `ComponentName.jsx` - Functional component with useSyncState
- `reactium-hooks-componentname.js` - Component registration hook (if `--hooks` flag used)
- `reactium-route-componentname.js` - Route definition array (if `--route` specified)
- `reactium-domain-componentname.js` - DDD domain declaration (if `--domain` flag used)
- `[prefix]-ComponentName.scss` - Style partial file (if `--style` flag used, e.g., `_reactium-style-ComponentName.scss`)

**Example workflows**:
```bash
# Create full page component with all features
npx reactium component \
  --destination src/app/components/AboutPage \
  --name AboutPage \
  --route '/about' \
  --hooks \
  --domain \
  --style default

# Create simple reusable component (no route)
npx reactium component \
  --destination src/app/components/Button \
  --name Button

# Create component at labeled path
npx reactium label --path src/app/pages --key labels.pages
npx reactium component --destination '[labels.pages]/Home' --name HomePage
```

**Hook integration**: Fires `arcli-component-input`, `arcli-component-confirm`, `arcli-component-conform`, `arcli-component-preflight`, `arcli-component-actions` hooks for customization

**Common gotchas**:
- Route format must be string `'/path'` or array `['/path-1', '/path-2']`
- Component name auto-converted to PascalCase
- `--style` flag accepts prefix types (`default`, `variables`, etc.), NOT file extensions (`scss`, `less`, `css`)
- Style files are always `.scss` extension, regardless of type (type controls prefix/compilation order)
- Hooks file registers component in Component registry on `plugin-init`
- Generated route uses dynamic import for code splitting

---

#### `npx reactium route`

**Purpose**: Generate standalone route file without component (for existing components)

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/route/reactium-arcli.js:1-94`

**When to use**:
- Adding routes to existing components
- Creating multiple routes for same component
- Organizing routes separately from components

**How it works**:
1. Prompts for destination and route path
2. Generates route definition file
3. Uses same generator as component command

**Flags**:
- `-d, --destination [path]` - Route file directory
- `-r, --route [route]` - Route path

**Example workflows**:
```bash
# Add route to existing component directory
npx reactium route \
  --destination src/app/components/AboutPage \
  --route '/about'

# Create multi-route file
npx reactium route \
  --destination src/app/components/HomePage \
  --route '["/", "/home"]'
```

**Integration**: Route files auto-discovered by routing system via `routes-init` hook

---

#### `npx reactium style`

**Purpose**: Generate DDD style partial file with configurable prefix for compilation order control

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/style/index.js:1-154`, `reactium-arcli.js:1-91`, `styleTypes.cjs:1-34`

**When to use**:
- Adding style partials to existing components
- Creating variables, mixins, or override files with correct compilation order
- Organizing component styles by atomic design levels (atoms, molecules, organisms)

**How it works**:
1. Prompts for destination (fuzzypath selector, default: `src/app/components`)
2. Prompts for style type (8 prefix options that control compilation order)
3. Sets `params.style = true` and calls `componentGen` (same generator as component command)
4. Generates `.scss` file with selected prefix + component name from directory basename
5. Auto-discovered by DDD style partial system via `_reactium-style-*` pattern

**Flags**:
- `-d, --destination [path]` - Component directory location
- `-t, --type [type]` - Style prefix type (controls compilation order):
  - `default` → `_reactium-style-ComponentName.scss`
  - `mixins` → `_reactium-style-mixins-ComponentName.scss`
  - `variables` → `_reactium-style-variables-ComponentName.scss`
  - `base` → `_reactium-style-base-ComponentName.scss`
  - `atoms` → `_reactium-style-atoms-ComponentName.scss`
  - `molecules` → `_reactium-style-molecules-ComponentName.scss`
  - `organisms` → `_reactium-style-organisms-ComponentName.scss`
  - `overrides` → `_reactium-style-overrides-ComponentName.scss`
- `-u, --unattended [unattended]` - Skip confirmation prompts

**Generated files**:
- `[prefix]-ComponentName.scss` - Style partial file (always `.scss` extension)
- Examples:
  - Type `variables` → `_reactium-style-variables-Button.scss`
  - Type `default` → `_reactium-style-Button.scss`
  - Type `overrides` → `_reactium-style-overrides-Modal.scss`

**Example workflows**:
```bash
# Create default style partial (prompts for type)
npx reactium style --destination src/app/components/Button

# Create variables partial (compiles early in order)
npx reactium style \
  --destination src/app/components/Button \
  --type variables

# Create overrides partial (compiles late in order)
npx reactium style \
  --destination src/app/components/Modal \
  --type overrides

# Create atomic design level partial
npx reactium style \
  --destination src/app/components/ui/InputField \
  --type atoms

# Unattended mode (skip prompts)
npx reactium style \
  --destination src/app/components/Modal \
  --type default \
  --unattended
```

**Integration**: Auto-discovered by `ddd-styles-partial` hook via `_reactium-style-*` filename pattern. Prefix determines compilation order in final CSS bundle.

**Compilation Order** (from styleTypes.cjs):
1. `variables` - Compiled first (for SCSS variables)
2. `mixins` - Compiled second (for SCSS mixins)
3. `base` - Base styles
4. `atoms` - Atomic design atoms
5. `molecules` - Atomic design molecules
6. `organisms` - Atomic design organisms
7. `default` - Default component styles
8. `overrides` - Compiled last (for overriding other styles)

**Common gotchas**:
- **Type is NOT file extension** - All files are `.scss`, type controls prefix/order
- **Invalid types**: `scss`, `less`, `css` are NOT valid type values
- **Valid types**: `default`, `mixins`, `variables`, `base`, `atoms`, `molecules`, `organisms`, `overrides`
- Stylesheet name always derived from directory basename (e.g., `Button` directory → `*-Button.scss`)
- Files with `_reactium-style-*` prefix are auto-discovered - manual import NOT required

---

#### `npx reactium hook`

**Purpose**: Generate Reactium plugin hook file

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/hook/reactium-arcli.js`

**When to use**:
- Adding plugin lifecycle hooks
- Integrating with Reactium systems (routing, components, etc.)
- Creating extensible plugin patterns

**Generated**: `reactium-hooks-*.js` file with Hook.register pattern

**Example workflows**:
```bash
# Add hook file to component directory
npx reactium hook --destination src/app/components/MyComponent
```

---

#### `npx reactium domain`

**Purpose**: Generate DDD domain file

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/domain/index.js:1-150`, `reactium-arcli.js:1-78`

**When to use**:
- Organizing code by domain-driven design principles
- Grouping related DDD artifacts in specific domains

**How it works**:
1. Prompts for destination directory
2. Derives domain name from directory basename
3. Uses same `componentGen` as component command with `params.domain = true`

**Flags**:
- `-d, --destination [path]` - Directory to save the domain file
- `-u, --unattended [unattended]` - Skip confirmation prompts

**Generated**: `reactium-domain-*.js` file with domain name declaration

**Example workflows**:
```bash
# Create domain file (name derived from directory basename)
npx reactium domain --destination src/app/components/UserProfile

# Unattended mode
npx reactium domain --destination src/app/components/Checkout --unattended
```

**Note**: Domain name is automatically derived from the basename of the destination path (e.g., `UserProfile` directory → domain name `UserProfile`)

---

### 4. Configuration Commands

#### `npx reactium label`

**Purpose**: Label a directory path for reuse in other commands

**Source**: `CLI/commands/label/index.js:1-249`

**When to use**:
- Creating shortcuts to frequently used directories
- Standardizing component locations across team
- Simplifying command flags with labeled paths

**How it works**:
1. Prompts for path and label key
2. Saves to CLI config.json as object path
3. Other commands resolve `[label]` syntax to actual path

**Flags**:
- `-p, --path [path]` - Path to label (supports `[root]`, `[cwd]` aliases)
- `-k, --key [key]` - Config key (e.g., `labels.components`)

**Example workflows**:
```bash
# Label components directory
npx reactium label \
  --path '[cwd]/src/app/components' \
  --key 'labels.components'

# Use label in component command
npx reactium component \
  --destination '[labels.components]/Button' \
  --name Button

# Label pages directory
npx reactium label --path src/app/pages --key labels.pages
```

**Integration**: Path aliases resolved by CLI commands during parameter processing

**Common gotchas**:
- Labels stored in `.cli/config.json` (not version controlled by default)
- Use object-path format for keys (e.g., `labels.my-path`)
- `[root]` = CLI install directory, `[cwd]` = current working directory

---

### 5. Package Management Commands

#### `npx reactium install`

**Purpose**: Install NPM dependencies (wrapper for `npm install`)

**When to use**:
- After `npx reactium init --quick`
- Installing dependencies after cloning repo
- Refreshing node_modules

**Example workflows**:
```bash
# Install all dependencies
npx reactium install

# Install after init
npx reactium init --type app --quick
npx reactium install
```

---

#### `npx reactium update`

**Purpose**: Update Reactium CLI and framework dependencies

**Source**: `CLI/commands/update/index.js`

**When to use**:
- Updating to latest Reactium CLI version
- Updating framework after new releases
- Checking for available updates

**Example workflows**:
```bash
# Update CLI and framework
npx reactium update
```

---

### 6. Custom Command Development

#### `npx reactium cli command`

**Purpose**: Generate new CLI command with template structure

**Source**: `CLI/commands/cli/command/` (template-based generator)

**When to use**:
- Creating project-specific CLI commands
- Building reusable command packages
- Extending CLI with custom workflows

**Generated files**:
- `index.js` - Command registration (NAME, COMMAND, ID exports)
- `actions.js` - Action sequence steps
- `generator.js` - Generator wrapper

**Template**: Uses handlebars templates from `CLI/commands/cli/command/template/`

**Example workflows**:
```bash
# Generate custom command
npx reactium cli command --name deploy

# Creates structure:
# .cli/commands/deploy/
#   ├── index.js (command registration)
#   ├── actions.js (action sequence)
#   └── generator.js (generator wrapper)
```

---

## Command Workflows and Decision Trees

### Workflow 1: Creating a New Page

**Goal**: Add a complete page with route, component, styles

**Commands**:
```bash
# Single command approach (recommended)
npx reactium component \
  --destination src/app/components/AboutPage \
  --name AboutPage \
  --route '/about' \
  --hooks \
  --domain \
  --style default
```

**Generates**:
- `AboutPage.jsx` - React component
- `reactium-hooks-aboutpage.js` - Component registration
- `reactium-route-aboutpage.js` - Route definition
- `reactium-domain-aboutpage.js` - Domain declaration
- `_reactium-style-AboutPage.scss` - Style partial file (default type)

**Result**: Fully functional page accessible at `/about`

---

### Workflow 2: Adding Route to Existing Component

**Goal**: Route to component that already exists

**Commands**:
```bash
# Generate route file only
npx reactium route \
  --destination src/app/components/ExistingComponent \
  --route '/new-path'
```

**Manual step**: Update route file to import existing component

---

### Workflow 3: Creating Reusable Component Library

**Goal**: Build shared component library with consistent structure

**Commands**:
```bash
# Label components directory
npx reactium label \
  --path src/app/components/common \
  --key labels.common

# Generate components with label
npx reactium component --destination '[labels.common]/Button' --name Button
npx reactium component --destination '[labels.common]/Input' --name Input
npx reactium component --destination '[labels.common]/Modal' --name Modal
```

---

### Workflow 4: Plugin Development Workflow

**Goal**: Develop, test, and publish a Reactium plugin

**Commands**:
```bash
# 1. Create plugin as workspace module
mkdir -p reactium_modules/@myorg/my-plugin
cd reactium_modules/@myorg/my-plugin
npm init -y

# 2. Generate CLI commands (optional)
mkdir -p .cli/commands/my-command
npx reactium cli command --name my-command

# 3. Develop plugin with local testing
# (code your plugin with reactium-hooks.js, etc.)

# 4. Test plugin in local project
# (Reactium auto-discovers workspace modules)

# 5. Publish to NPM
npm publish

# 6. Publish to Reactium registry (optional)
npx reactium auth
npx reactium package publish
```

---

### Workflow 5: Multi-Route Page (Alternative URLs)

**Goal**: Same component accessible via multiple routes

**Commands**:
```bash
# Create component with array route
npx reactium component \
  --destination src/app/components/Profile \
  --name Profile \
  --route '["/profile", "/user", "/account"]' \
  --hooks
```

**Generated route**:
```javascript
export default [
  { id: 'route-Profile-1', exact: true, component, path: ["/profile", "/user", "/account"] }
];
```

---

## Decision Trees

### "I want to create..."

#### A new page
→ `npx reactium component --route '/path' --hooks --style default`

#### A reusable component (no route)
→ `npx reactium component --name MyComponent`

#### Just a route (component exists)
→ `npx reactium route --route '/path'`

#### Just styles (component exists)
→ `npx reactium style --destination src/app/components/MyComponent --type default`

#### A custom CLI command
→ `npx reactium cli command --name my-command`

---

### "I want to initialize..."

#### A new Reactium app
→ `npx reactium init --type app`

#### A new Actinium server
→ `npx reactium init --type api`

#### Quick evaluation (skip deps)
→ `npx reactium init --type app --quick`

---

### "I want to manage..."

#### Dependencies
→ `npx reactium install`

#### Updates
→ `npx reactium update`

#### Authentication
→ `npx reactium auth`

#### Directory labels
→ `npx reactium label --path [path] --key [key]`

---

## Command Integration Points

### Hook System Integration

Commands fire hooks for extensibility:

**Component command hooks**:
- `arcli-component-input` - Customize prompts
- `arcli-component-confirm` - Custom confirmation
- `arcli-component-conform` - Transform parameters
- `arcli-component-preflight` - Pre-generation checks
- `arcli-component-actions` - Modify action sequence
- `arcli-file-gen` - Transform generated file content

**Route command hooks**:
- `arcli-route-input`
- `arcli-route-confirm`
- `arcli-route-conform`
- `arcli-route-preflight`
- `arcli-route-actions`

**Global hooks** (`arcli-hooks.js` files):
- Loaded from all `**/arcli-hooks.js` files during bootstrap
- Can register hooks for any command
- Useful for organization-wide CLI customizations

---

### Template System Integration

Commands use handlebars templates from `template/` directories:

**Component templates**:
- `index-functional.hbs` - Functional component
- `route.hbs` - Route definition
- `domain.hbs` - Domain declaration
- `reactium-hooks.hbs` - Component registration
- `reactium-style.hbs` - Stylesheet

**CLI command templates**:
- `index.js.hbs` - Command structure
- `actions.js.hbs` - Action sequence
- `generator.js.hbs` - Generator wrapper

---

### DDD Discovery Integration

Generated files auto-discovered by framework:

- `reactium-hooks-*.js` → Loaded on plugin init
- `reactium-route-*.js` → Discovered by routing system
- `reactium-domain-*.js` → Domain artifact placement
- `_reactium-style-*.scss` → Style partial compilation

---

## Best Practices

### 1. Use Labels for Common Paths

Instead of repeating long paths, label them:
```bash
npx reactium label --path src/app/components --key labels.components
npx reactium component --destination '[labels.components]/Button' --name Button
```

### 2. Generate Complete Pages with Single Command

Use all flags for full-featured pages:
```bash
npx reactium component \
  --destination src/app/pages/About \
  --name AboutPage \
  --route '/about' \
  --hooks \
  --domain \
  --style default
```

### 3. Organize Routes in Route Files

Keep routes separate from components for flexibility:
```bash
# Component without route
npx reactium component --name Profile

# Add routes later
npx reactium route --destination src/app/components/Profile --route '["/profile", "/user"]'
```

### 4. Use Unattended Mode for Scripts

Skip prompts in automation:
```bash
npx reactium component \
  --destination src/app/components/Button \
  --name Button \
  --unattended
```

### 5. Authenticate Before Publishing

Always auth before registry operations:
```bash
npx reactium auth
npx reactium package publish
```

---

## Common Gotchas

### 1. Component Name Casing

- Input: `my-component` → Output: `MyComponent` (PascalCase)
- className: Auto-generated as lowercase `my-component`

### 2. Route Format

- String: `'/path'` for single route
- Array: `['/path-1', '/path-2']` for multiple routes
- Invalid: `'/path-1', '/path-2'` (not an array)

### 3. Init Overwrites Files

`npx reactium init` extracts to current directory and will overwrite existing files. Always run in empty directory.

### 4. Style Type Controls Prefix and Compilation Order

The `--type` flag on `npx reactium style` controls the **prefix**, not the file extension:
- Type `default` → `_reactium-style-MyComponent.scss` (default compilation order)
- Type `variables` → `_reactium-style-variables-MyComponent.scss` (compiled first)
- Type `overrides` → `_reactium-style-overrides-MyComponent.scss` (compiled last)
- All files are `.scss` extension regardless of type
- **Invalid**: `--type scss` (not a valid type)
- **Valid**: `--type default`, `--type variables`, `--type atoms`, etc.

### 5. Hooks File Component Registration

Generated `reactium-hooks-*.js` registers component in Component registry. Without this, hookableComponent won't find it.

### 6. Auth Persistence

`npx reactium auth` saves session to `.arcli/config.json`. Use `--clear` or `--restore` to reset.

### 7. Label Scope

Labels saved to `.cli/config.json` in current working directory. Not global unless saved to `~/.arcli/config.json`.

---

## Debugging Command Issues

### Command Not Found

**Problem**: `Command not found: my-command`

**Solutions**:
1. Check command discovery locations in `.cli/config.json`
2. Verify `index.js` exports `NAME`, `COMMAND`, `ID`
3. Run `npx reactium --help` to see discovered commands
4. Check globby depth limit (default: 25)

### Template Not Generating

**Problem**: Template variables not substituted

**Solutions**:
1. Verify handlebars syntax: `{{variable}}` not `{variable}`
2. Check params object contains expected keys
3. Ensure template file has `.hbs` extension
4. Check template directory location matches componentGen path

### Generated Files Wrong Location

**Problem**: Files generated in unexpected directory

**Solutions**:
1. Check `destination` parameter after `formatDestination()` transform
2. Verify path aliases resolved correctly (`[root]`, `[cwd]`, `[labels.x]`)
3. Use absolute paths for debugging

### Route Not Discovered

**Problem**: Generated route doesn't appear in app

**Solutions**:
1. Verify file named `reactium-route-*.js`
2. Check file exports default array of route objects
3. Restart dev server (routes discovered on init)
4. Check `routes-init` hook not filtering route

---

## Command Reference Summary

### Core Commands
- `init` - Initialize Reactium/Actinium project
- `auth` - Authenticate for registry
- `install` - Install dependencies
- `update` - Update CLI and framework

### Reactium Frontend Commands
- `component` - Generate component + optional route/hooks/domain/style
- `route` - Generate standalone route file
- `style` - Generate stylesheet partial
- `hook` - Generate Reactium hook file
- `domain` - Generate domain file

### Configuration Commands
- `label` - Label directory paths
- `config` - Manage CLI configuration

### Development Commands
- `cli command` - Generate custom CLI command

### Package Commands
- `package publish` - Publish to registry
- `package install` - Install from registry

---

## Source Reference Index

- **Bootstrap**: `CLI/bootstrap.js:1-247`
- **Command Discovery**: `CLI/arcli-node.js:111-194`
- **Init Command**: `CLI/commands/init/index.js:1-104`, `actions.js:1-114`
- **Auth Command**: `CLI/commands/auth/index.js:1-149`
- **Label Command**: `CLI/commands/label/index.js:1-249`
- **Component Command**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/component/reactium-arcli.js:1-159`
- **Route Command**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/route/reactium-arcli.js:1-94`
- **Component Generator**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/component/componentGen.cjs:1-86`
- **Generator Wrapper**: `CLI/lib/generator.js:1-20`
- **CLI Command System**: `CLAUDE/CLI_COMMAND_SYSTEM.md`

---

## Related Documentation

- [CLI Command Discovery and Extensibility](./CLI_COMMAND_SYSTEM.md) - Deep dive on command discovery architecture
- [CLI Template System](./CLI_TEMPLATE_SYSTEM.md) - Template generation patterns
- [Hook System](./HOOK_SYSTEM.md) - Hook integration for CLI extensibility
- [DDD Discovery](./DDD_DISCOVERY.md) - Auto-discovery of generated artifacts
- [Style Partial System](./STYLE_PARTIAL_SYSTEM.md) - Stylesheet compilation
