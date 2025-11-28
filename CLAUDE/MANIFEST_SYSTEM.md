<!-- v1.0.0 -->

# Manifest System and Dependency Loading

**Purpose**: Auto-generate dynamic import loaders for DDD (Domain-Driven Development) artifacts discovered throughout the codebase.

**Core Concept**: The manifest system discovers files matching specific patterns, transforms their paths for consumption, and generates manifest.js files with dynamic import() loaders. This enables code-splitting, lazy-loading, and plugin-based extensibility.

---

## System Architecture

### 1. Discovery → Generation → Loading Flow

```
1. DDD File Discovery (globby-based)
   ↓
2. Pattern Matching & Path Transformation (manifest-tools.js)
   ↓
3. Template Generation (Handlebars)
   ↓
4. Manifest Files (manifest.js, domains.js, externals-manifest.js, umd-manifest.json)
   ↓
5. Runtime Loading (ReactiumDependencies class)
   ↓
6. Hook-Driven Filtering (load-dependency hook)
```

**Source References**:
- Discovery engine: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/manifest/manifest-tools.js:1-242`
- Runtime loader: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/dependencies/index.js:1-153`
- Gulp integration: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:332-388`

---

## Manifest Configuration

### Default Patterns (reactium-config.js)

```javascript
const defaultManifestConfig = {
    patterns: [
        {
            name: 'allRoutes',
            type: 'route',
            pattern: /(routes?|reactium-routes?.*?)\.jsx?$/,
        },
        {
            name: 'allServices',
            type: 'services',
            pattern: /(services?|reactium-services?(?!-worker).*?)\.jsx?$/,
        },
        {
            name: 'allHooks',
            type: 'hooks',
            pattern: /reactium-hooks?.*?\.js$/,
        },
    ],
    sourceMappings: [
        {
            from: 'src/app/',
            to: '../src/app/',
        },
        {
            from: 'reactium_modules/',
            to: '',
        },
        {
            node_modules: true,
            ignore: /^((?!reactium-plugin).)*$/,  // Only NPM packages with "reactium-plugin" in name
        },
    ],
    searchParams: {
        extensions: /\.jsx?$/,
        exclude: [/.ds_store/i, /.core/i, /.cli\//i],
    },
};
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/reactium-config.js:86-174`

### Configuration Elements

**patterns**: Array of file discovery patterns
- `name`: Type identifier (becomes key in manifest, e.g., 'allRoutes')
- `type`: Category label (used in logging/debugging)
- `pattern`: RegExp to match file names
- `ignore` (optional): RegExp to exclude specific matches
- `stripExtension` (optional, default `true`): Remove file extension from paths

**sourceMappings**: Where to search for files
- `from`: Source directory path (relative to project root)
- `to`: Replacement path in generated manifest (for import resolution)
- `node_modules: true`: Search NPM packages with optional `ignore` RegExp filter
- `exclude`: Additional exclusion patterns for this source

**searchParams**: Global search configuration
- `extensions`: RegExp for file extensions to include
- `exclude`: Array of RegExp patterns to globally exclude

---

## Discovery Process (manifest-tools.js)

### File Discovery Algorithm

```javascript
// 1. For each sourceMapping:
sources(sourceMapping.from, searchParams)  // Uses directory-tree module

// 2. Flatten directory tree into file list
flattenRegistry(tree)

// 3. Match each file against all patterns:
patterns.forEach(({ name, pattern, ignore }) => {
    if (pattern.test(file) && !ignore.test(file)) {
        // 4. Transform file path:
        let normalized = file.replace(/\\/g, '/');
        normalized = normalized.replace(sourceMapping.from, sourceMapping.to);

        if (stripExtension) {
            normalized = normalized.replace(fileExtension, '');
        }

        // 5. Store in manifest under pattern name:
        manifest[name].imports.push(normalized);
        manifest[name].originals[normalized] = originalFilePath;
    }
});
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/manifest/manifest-tools.js:43-174`

### NPM Package Discovery

When `node_modules: true` in sourceMapping:

```javascript
// 1. Read project package.json dependencies
const modules = Object.keys(require('./package.json').dependencies);

// 2. Apply ignore filter (e.g., only "reactium-plugin-*" packages)
const filtered = modules.filter(mod => !ignore.test(mod));

// 3. Resolve each module and search its directory
filtered.forEach(mod => {
    const from = path.dirname(require.resolve(mod));
    sources(from, searchParams).forEach(file => {
        // Normalize: /path/to/node_modules/my-package/foo.js → my-package/foo.js
        file.path.replace(/.*node_modules\//, '');
    });
});
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/manifest/manifest-tools.js:67-123`

### reactiumDependencies Support

Special handling for packages in `reactium_modules/` listed in `package.json`:

```json
{
  "reactiumDependencies": {
    "@atomic-reactor/reactium-core": "*",
    "my-local-plugin": "file:./path/to/plugin"
  }
}
```

The system searches these packages' dependencies too, enabling nested plugin dependencies.

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/manifest/manifest-tools.js:79-109`

---

## Manifest Generation

### Four Generated Manifests

1. **domains.js** - Domain name resolution
2. **manifest.js** - Primary dependency loader (routes, services, hooks)
3. **externals-manifest.js** - Webpack externals configuration
4. **umd-manifest.json** - UMD library build configuration

### Generation Flow (regenManifest function)

```javascript
regenManifest({
    manifestFilePath: 'src/manifest.js',
    manifestConfig: reactiumConfig.manifest,
    manifestTemplateFilePath: 'manifest/templates/manifest.hbs',
    manifestProcessor: require('./manifest/processors/manifest'),
});

// Steps:
// 1. Run discovery: find(patterns, sourceMappings, searchParams)
// 2. Run processor: manifestProcessor({ manifest, manifestConfig })
// 3. Compile Handlebars template with processed data
// 4. Format with Prettier
// 5. Write to disk (only if changed - uses fast-diff)
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/manifest/manifest-tools.js:176-227`

---

## Domain System

### Domain Discovery (domains.js)

Domains provide namespacing for manifest entries. Discovery pattern:

```javascript
{
    name: 'allDomains',
    type: 'domain',
    pattern: /(domain|reactium-domain.*?)\.js$/,
}
```

**Domain File Structure**:

```javascript
// src/app/MyFeature/domain.js
export default {
    name: 'MyFeature',  // Explicit domain name
    // ... other domain config
};
```

**Implied Domain**: If no explicit `name` field, domain is inferred from directory:
- File: `src/app/MyFeature/route.js`
- Implied domain: `MyFeature` (from parent directory name)

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/manifest/processors/domains.js:1-28`

### Domain Processor

```javascript
// domains.js output structure:
{
    domains: {
        "MyFeature": {
            name: "MyFeature",
            implied: "MyFeature",
            original: "/absolute/path/to/src/app/MyFeature/domain.js"
        }
    },
    relative: {
        "/absolute/path/to/src/app/MyFeature": "MyFeature"  // Directory → domain mapping
    }
}
```

This enables path-based domain resolution: given any file path, look up its directory in `relative` to find its domain.

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/manifest/processors/domains.js:6-28`

---

## Generated Manifest Structure (manifest.js)

### Template Output

```javascript
/**
 * Generated by Reactium
 * DO NOT directly edit this file !!!!!!
 */
import op from 'object-path';
import _ from 'underscore';
import { isBrowserWindow } from '@atomic-reactor/reactium-sdk-core';

const reqs = {
    'allRoutes': {
        'MyFeature': {
            req: () => import('../src/app/MyFeature/route.js'),
            file: '../src/app/MyFeature/route.js',
        },
        'AnotherFeature': {
            req: () => import('@my-plugin/route'),
            file: '@my-plugin/route',
        },
    },
    'allServices': {
        'MyService': {
            req: () => import('../src/app/MyService/service.js'),
            file: '../src/app/MyService/service.js',
        },
    },
    // ... allHooks, etc.
};

const manifest = {
    get: () => {
        // Returns loader structure for ReactiumDependencies
        const domainLoaders = {};
        for (const [name, domains] of Object.entries(reqs)) {
            const loaders = [];
            for (const [domain, item] of Object.entries(domains)) {
                loaders.push({
                    name,   // 'allRoutes'
                    domain, // 'MyFeature'
                    loader: () => new Promise((resolve, reject) => {
                        item.req().then(module => resolve({ name, domain, module }));
                    }),
                });
            }
            domainLoaders[name] = loaders;
        }
        return domainLoaders;
    },
    list: () => {
        return { /* full manifest data structure */ };
    },
};

export default manifest;
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/manifest/templates/manifest.hbs:1-62`

### Manifest Processor

The processor resolves domains and handles duplicates:

```javascript
// For each type (allRoutes, allServices, etc.):
imports.forEach(file => {
    const domain = mapDomain(file);  // From domains.js

    // Duplicate detection:
    if (domains.find(d => d.domain === domain)) {
        console.warn(`Unable to add "${file}" - "${existing.file}" will be used.`);
        return;
    }

    domains.push({ domain, file });
});
```

**Critical**: Only ONE file per domain per type. If multiple routes exist in same domain, only the first discovered is used.

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/manifest/processors/manifest.js:29-51`

---

## Runtime Loading (ReactiumDependencies)

### ReactiumDependencies Class

```javascript
class ReactiumDependencies {
    constructor() {
        this.loaded = false;
        this.loadedModules = {};  // Cache: { name: { domain: loadedModule } }
        this.services = {};
        this.plugins = {};
        this.coreTypes = ['allServices', 'allPlugins', 'allHooks'];
        this.coreTypeMap = {
            allServices: 'services',
            allPlugins: 'plugins',
        };
    }

    async loadAll(type) {
        return manifest[type].map(async ({ name, domain, loader }) => {
            // Hook-driven filtering:
            const { load = true } = await Hook.run('load-dependency',
                { name, domain, module },
                Enums.priority.highest
            );

            if (load) {
                // Cache check:
                if (this.loadedModules[name]?.[domain]) {
                    return this.loadedModules[name][domain];
                }

                // Dynamic import:
                const loadedModule = await loader();
                this.loadedModules[name][domain] = loadedModule;
                return loadedModule;
            }
        });
    }

    async load() {
        for (const depType of Object.keys(this.manifest)) {
            const binding = this.coreTypeMap[depType] || depType;

            for (const { name, domain, module } of await this.loadAll(depType)) {
                // Store on dependencies instance:
                this[binding][domain] = module.default;
            }
        }
        this.loaded = true;
    }
}
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/dependencies/index.js:6-122`

### Loading Lifecycle

```javascript
// 1. Bootstrap: Manifest imported as file-scoped dependency
import manifestLoader from 'manifest';  // → src/manifest.js
dependencies.manifest = manifestLoader.get();

// 2. Hook registration: dependencies.load() registered on 'dependencies-load' hook
Hook.register('dependencies-load', dependencies.load.bind(dependencies), Enums.priority.highest);

// 3. Execution: Hook called during app initialization
// Services → dependencies.services.MyService
// Plugins → dependencies.plugins.MyPlugin
// Custom types → dependencies.customType.MyDomain
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/dependencies/index.js:133-152`

---

## Hook Integration

### load-dependency Hook

Fired **before** loading each dependency. Allows conditional loading:

```javascript
Hook.register('load-dependency', async ({ name, domain, module }) => {
    // name: 'allRoutes', 'allServices', etc.
    // domain: 'MyFeature'
    // module: undefined (not yet loaded)

    // Return { load: false } to skip loading:
    if (domain === 'AdminFeature' && !User.isAdmin()) {
        return { load: false };
    }

    // Return { load: true } or nothing to proceed
    return { load: true };
}, Enums.priority.highest);
```

**Priority**: `highest` - runs at highest priority to allow early filtering

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/dependencies/index.js:47-52`

---

## Build Integration

### Gulp Tasks

```javascript
// Task 1: Generate domains.js (domain name resolution)
const domainsManifest = () => {
    regenManifest({
        manifestFilePath: 'src/domains.js',
        manifestConfig: reactiumConfig.manifest.domains,
        manifestTemplateFilePath: 'manifest/templates/domains.hbs',
        manifestProcessor: require('./manifest/processors/domains'),
    });
};

// Task 2: Generate manifest.js (primary dependencies)
const mainManifest = () => {
    regenManifest({
        manifestFilePath: 'src/manifest.js',
        manifestConfig: reactiumConfig.manifest,
        manifestTemplateFilePath: 'manifest/templates/manifest.hbs',
        manifestProcessor: require('./manifest/processors/manifest'),
    });
};

// Task 3: Generate externals-manifest.js (webpack externals)
const externalsManifest = () => {
    regenManifest({
        manifestFilePath: 'src/externals-manifest.js',
        manifestConfig: reactiumConfig.manifest,
        manifestTemplateFilePath: 'manifest/templates/externals.hbs',
        manifestProcessor: require('./manifest/processors/externals'),
    });
};

// Task 4: Generate umd-manifest.json (UMD library builds)
const umdManifest = () => {
    regenManifest({
        manifestFilePath: 'public/umd-manifest.json',
        manifestConfig: reactiumConfig.manifest.umd,
        manifestTemplateFilePath: 'manifest/templates/umd.hbs',
        manifestProcessor: require('./manifest/processors/umd'),
    });
};

// Parallel execution:
const manifest = gulp.series(
    gulp.parallel(
        gulp.series(domainsManifest, mainManifest),  // mainManifest depends on domains
        externalsManifest,
        umdManifest,
    ),
);
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:320-388`

### Build Order

1. **domainsManifest** → **mainManifest** (sequential - mainManifest needs domains.js)
2. **externalsManifest** (parallel)
3. **umdManifest** (parallel)

All manifest tasks run BEFORE webpack compilation.

---

## Webpack Integration

### Dynamic Imports & Code Splitting

The manifest system generates `import()` statements, which Webpack treats as split points:

```javascript
// Generated manifest.js:
req: () => import('../src/app/MyFeature/route.js')

// Webpack creates:
// - main bundle (manifest.js)
// - MyFeature-route.chunk.js (lazy-loaded)
```

**Result**: Each route/service/hook is a separate chunk, loaded on-demand.

### Externals Manifest

`externals-manifest.js` provides library externalization for plugins:

```javascript
// Template output:
export default {
    "react": {
        externalName: "react",
        requirePath: "react",
        defaultAlias: "React"
    },
    "react-dom": { /* ... */ },
    // ... etc.
};
```

Used by UMD webpack config to avoid bundling core libraries in plugins.

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/manifest/templates/externals.hbs:1-11`

---

## Configuration Override Pattern

### manifest.config.override.js

Projects can customize manifest behavior:

```javascript
// Project root: manifest.config.override.js
module.exports = config => {
    // Add custom pattern:
    config.patterns.push({
        name: 'allMiddleware',
        type: 'middleware',
        pattern: /reactium-middleware.*?\.js$/,
    });

    // Add custom source mapping:
    config.sourceMappings.push({
        from: 'src/server/',
        to: '../src/server/',
    });

    // Modify search params:
    config.searchParams.exclude.push(/\.test\.js$/);
};
```

**Discovery**: Overrides discovered via globby in multiple locations:
- `./manifest.config.override.js` (project root)
- `./src/**/manifest.config.override.js`
- `./reactium_modules/**/manifest.config.override.js`
- `./node_modules/**/reactium-plugin/manifest.config.override.js`

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/reactium-config.js:176-186`

---

## Best Practices

### File Naming Conventions

Follow patterns for automatic discovery:

- **Routes**: `route.js`, `routes.js`, `reactium-route.js`, `reactium-routes-admin.js`
- **Services**: `service.js`, `services.js`, `reactium-service.js`
- **Hooks**: `reactium-hooks.js`, `reactium-hooks-plugin.js`
- **Domains**: `domain.js`, `reactium-domain.js`

### Domain Organization

**One manifest entry per domain per type**. Structure accordingly:

```
src/app/
  MyFeature/
    domain.js          ← Defines domain name
    route.js           ← Routes for MyFeature
    service.js         ← Services for MyFeature
    reactium-hooks.js  ← Hooks for MyFeature
  AnotherFeature/
    domain.js
    route.js
```

### Avoiding Duplicate Warnings

If you see: `"Unable to add X - Y will be used"`

**Cause**: Multiple files of same type in same domain
**Fix**:
1. Use different domains (different directories)
2. Consolidate into single file
3. Use subdomains in filenames: `reactium-route-admin.js` vs `reactium-route-public.js` (but both resolve to same parent domain - won't work!)

**Real solution**: Separate directories = separate domains.

### Performance Optimization

1. **Minimize patterns**: More patterns = slower discovery
2. **Specific exclusions**: Use `searchParams.exclude` to skip large directories
3. **Cache awareness**: `regenManifest` only writes if changed (uses `fast-diff`)
4. **NPM package filtering**: Use `ignore` RegExp in node_modules sourceMapping to limit scope

---

## Common Gotchas

### 1. Manifest Not Regenerating

**Symptom**: New files not appearing in manifest

**Causes**:
- File doesn't match pattern RegExp
- File excluded by `searchParams.exclude` or `sourceMapping.exclude`
- Gulp manifest task not running (dev mode: must manually rebuild)

**Fix**:
```bash
gulp manifest  # Regenerate all manifests
```

### 2. "Module not found" Import Errors

**Symptom**: Generated manifest has incorrect import paths

**Cause**: `sourceMappings.to` path incorrect for import resolution

**Example**:
```javascript
// File: src/app/MyFeature/route.js
// sourceMappings.from: 'src/app/'
// sourceMappings.to: '../src/app/'  ← Relative to manifest.js location

// Generated in src/manifest.js:
import('../src/app/MyFeature/route.js')  ← Correct relative import
```

**Fix**: Ensure `to` paths are relative to manifest file location (`src/manifest.js`).

### 3. Domain Collision Warnings

**Symptom**: `"Unable to add X - Y will be used"`

**Cause**: Two files of same type resolve to same domain

**Example**:
```
src/app/MyFeature/route.js        ← Domain: MyFeature
src/app/MyFeature/admin-route.js  ← Domain: MyFeature (collision!)
```

**Fix**: Use separate directories:
```
src/app/MyFeature/route.js        ← Domain: MyFeature
src/app/MyFeatureAdmin/route.js   ← Domain: MyFeatureAdmin
```

### 4. load-dependency Hook Not Filtering

**Symptom**: Dependencies load despite returning `{ load: false }`

**Causes**:
- Hook registered at lower priority than loader (must use `highest`)
- Hook registered after `dependencies-load` already executed
- Hook doesn't return object with `load` property

**Fix**:
```javascript
Hook.register('load-dependency', ({ name, domain }) => {
    return { load: shouldLoad(name, domain) };  // MUST return object
}, Enums.priority.highest);  // MUST use highest priority
```

### 5. Manifest Changes Not Reflecting in Build

**Symptom**: webpack-manifest.json or SSR still uses old manifest

**Cause**: Webpack caches imports; dev server needs restart

**Fix**:
```bash
# Kill dev server
# Regenerate manifests
gulp manifest
# Restart dev server
npm start
```

### 6. reactiumDependencies Not Loading

**Symptom**: Plugin in `reactium_modules/` not discovered

**Causes**:
- Plugin not listed in `package.json` `reactiumDependencies`
- Plugin's package.json missing or invalid
- Files don't match patterns

**Fix**:
```json
// package.json
{
  "reactiumDependencies": {
    "my-local-plugin": "file:./reactium_modules/my-local-plugin"
  }
}
```

Then: `npm install` to symlink

---

## Integration with Core Systems

### Routing System

Manifest provides routes to `Routing.register()`:

```javascript
// dependencies.load() populates:
dependencies.allRoutes = {
    MyFeature: { /* route module */ }
};

// Routing system consumes:
Object.values(dependencies.allRoutes).forEach(route => {
    Routing.register(route);
});
```

### Service Worker

UMD manifest lists libraries for offline caching:

```javascript
// umd-manifest.json
[
    {
        "libraryName": "MyWidget",
        "libraryEntry": "src/app/MyWidget/umd.js"
    }
]

// Service worker precaches all UMD bundles
```

### Plugin System

NPM plugins discovered via node_modules sourceMapping:

```javascript
{
    node_modules: true,
    ignore: /^((?!reactium-plugin).)*$/,  // Only "reactium-plugin-*" packages
}
```

---

## Debugging Techniques

### 1. Inspect Generated Manifests

```bash
cat src/manifest.js     # Primary dependencies
cat src/domains.js      # Domain resolution
cat public/umd-manifest.json  # UMD libraries
```

### 2. Enable Verbose Logging

```javascript
// In manifest-tools.js (temporarily):
console.log('Found files:', manifest);
console.log('Normalized path:', normalized);
```

### 3. Test Pattern Matching

```javascript
const pattern = /(routes?|reactium-routes?.*?)\.jsx?$/;
console.log(pattern.test('src/app/MyFeature/route.js'));  // true
console.log(pattern.test('src/app/MyFeature/routes.jsx')); // true
console.log(pattern.test('src/app/MyFeature/router.js'));  // false
```

### 4. Check Domain Resolution

```javascript
// Load domains.js in Node REPL:
const domains = require('./src/domains.js');
console.log(domains.relative['/full/path/to/src/app/MyFeature']);  // 'MyFeature'
```

### 5. Trace loader() Execution

```javascript
// In dependencies/index.js:
const loadedModule = await loader();
console.log('Loaded:', name, domain, loadedModule);
```

---

## Summary

**The Manifest System provides**:
1. **Auto-discovery** of DDD artifacts via pattern-based file search
2. **Code-splitting** through dynamic import() generation
3. **Domain-based organization** for namespaced module loading
4. **Hook-driven filtering** for conditional loading
5. **Plugin extensibility** via NPM package discovery and override system

**Critical for**:
- Understanding how Reactium discovers routes, services, hooks
- Building custom plugins that auto-register
- Optimizing bundle size through code-splitting
- Debugging "module not found" and "duplicate domain" errors
- Extending manifest discovery with custom patterns

**Key Insight**: Manifest is generated at build time (Gulp), consumed at runtime (ReactiumDependencies), and provides the foundation for Reactium's plugin-based architecture.
