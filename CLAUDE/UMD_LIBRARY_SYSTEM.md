<!-- v1.0.0 -->
# UMD Library System and External Dependencies

Complete architecture for building reusable UMD (Universal Module Definition) libraries in Reactium, enabling code splitting, library externalization, and runtime dependency loading.

---

## Table of Contents

1. [Overview](#overview)
2. [UMD System Architecture](#umd-system-architecture)
3. [Configuration Structure](#configuration-structure)
4. [Entry Point Discovery](#entry-point-discovery)
5. [Webpack Build Process](#webpack-build-process)
6. [Default Library Externals](#default-library-externals)
7. [Custom UMD Library Creation](#custom-umd-library-creation)
8. [Runtime Loading Patterns](#runtime-loading-patterns)
9. [Integration with Main Build](#integration-with-main-build)
10. [Best Practices](#best-practices)
11. [Common Gotchas](#common-gotchas)

---

## Overview

The UMD system enables:
- **Code splitting** - Separate libraries from main bundle
- **Library externalization** - Prevent duplicate dependencies in bundles
- **Reusable components** - Build standalone libraries for plugins
- **Bundle optimization** - Reduce main bundle size by externalizing common libraries
- **Plugin distribution** - Package plugins as UMD libraries

**Key Mechanism**: Manifest-based discovery → webpack config generation → UMD build → public deployment

**Source Files**:
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/umd.webpack.config.js:1-122`
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/reactium-config.js:9-84,119-150`
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/manifest/processors/umd.js:1-77`
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:447-486`

---

## UMD System Architecture

### Build Pipeline Flow

```
1. Discovery Phase (Manifest Generation)
   ├─ Find umd.js / *-umd.js files (pattern: /(umd|reactium-umd.*?)\.js$/)
   ├─ Find umd-config.json files (pattern: /umd-config.json$/)
   └─ Generate .tmp/umd-manifest.json

2. Configuration Phase
   ├─ Read umd-manifest.json (array of library configs)
   ├─ Apply defaults (libraryName, outputPath, externals)
   └─ Generate webpack config via umdWebpackGenerator()

3. Build Phase (per library)
   ├─ Create UMD webpack config with WebpackSDK
   ├─ Apply babel-loader with presets
   ├─ Add externals to prevent bundling
   ├─ Run webpack build
   └─ Output to public/assets/js/umd/[libraryName]/[libraryName].js

4. Deployment
   └─ UMD libraries available at runtime for dynamic loading
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:447-486`

---

## Configuration Structure

### umd-config.json

Each UMD library requires a `umd-config.json` file in the same directory as the entry point.

**Minimal Configuration**:
```json
{
  "libraryName": "my-library"
}
```

**Complete Configuration**:
```json
{
  "libraryName": "my-library",
  "outputPath": "custom-path",
  "outputFile": "custom-name.js",
  "globalObject": "window",
  "babelPresetEnv": true,
  "babelReact": true,
  "babelLoader": true,
  "externals": {
    "react": "react",
    "react-dom": "react-dom"
  },
  "addDefines": true,
  "workerRestAPI": false,
  "sourcemaps": true
}
```

**Configuration Options**:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `libraryName` | String | Directory name | Library name for UMD export |
| `outputPath` | String | `libraryName` | Subdirectory under `public/assets/js/umd/` |
| `outputFile` | String | `${libraryName}.js` | Output filename |
| `globalObject` | String | `"window"` | Global object for UMD (`"window"`, `"this"`, `"self"`) |
| `babelPresetEnv` | Boolean | `true` | Enable @babel/preset-env |
| `babelReact` | Boolean | `true` | Enable @babel/preset-react |
| `babelLoader` | Boolean | `true` | Enable babel-loader |
| `externals` | Object | `defaultLibraryExternals` | External dependencies (not bundled) |
| `addDefines` | Boolean | `true` | Add webpack DefinePlugin |
| `workerRestAPI` | Boolean | `false` | Inject workerRestAPIConfig define |
| `sourcemaps` | Boolean | `true` (dev only) | Generate source maps in development |

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/manifest/processors/umd.js:35-70`

---

## Entry Point Discovery

### File Naming Conventions

UMD entry points are discovered by pattern matching:

**Pattern**: `/(umd|reactium-umd.*?)\.js$/`

**Valid filenames**:
- `umd.js` - Standard name
- `reactium-umd.js` - Prefixed variant
- `reactium-umd-worker.js` - Named variant

**Discovery locations** (via manifest sourceMappings):
- `src/` - Project source
- `reactium_modules/` - Workspace modules
- `node_modules/` - NPM packages (must match pattern)

**Exclusions**:
- Files in `/assets/` directories (ignored via pattern config)

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/reactium-config.js:121-134`

### Directory Structure Example

```
src/sw/
├── umd.js                   # Entry point
├── umd-config.json          # Configuration
└── index.js                 # Actual library code (imported by umd.js)

reactium_modules/my-plugin/worker/
├── reactium-umd-worker.js   # Entry point
├── umd-config.json          # Configuration
└── implementation.js        # Worker code
```

**Entry Point Pattern** (simple):
```javascript
// umd.js
require('./index');
```

**Entry Point Pattern** (complex):
```javascript
// reactium-umd.js
import MyLibrary from './lib';
export default MyLibrary;
```

**Source**: Real examples from `Reactium-Admin-Plugins/src/app/components/plugin-src/reset/umd.js:1-2`

---

## Webpack Build Process

### umdWebpackGenerator Function

The `umd.webpack.config.js` exports a factory function that generates webpack config:

```javascript
module.exports = umd => {
  const sdk = new WebpackSDK(umd.libraryName, 'reactium-webpack.js', umd);

  // Add ignores for non-JS files
  sdk.addIgnore('css', /\.css$/);
  sdk.addIgnore('scss', /\.scss$/);
  sdk.addIgnore('server-src', /server/);
  // ... more ignores

  // Configure babel-loader
  if (op.get(umd, 'babelLoader', true)) {
    sdk.addRule('babel-loader', {
      test: /(\.jsx|\.js)$/,
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env', '@babel/react'],
        plugins: [
          ['@babel/plugin-proposal-class-properties', { loose: true }],
          ['module-resolver'],
        ],
      },
    });
  }

  // Add externals from config
  Object.entries(umd.externals).forEach(([key, value]) => {
    sdk.addExternal(key, { key, value });
  });

  // Configure output
  sdk.mode = env;
  sdk.entry = umd.entry;
  sdk.output = {
    path: umd.outputPath,
    filename: umd.outputFile,
    library: umd.libraryName,
    libraryTarget: 'umd',
    globalObject: umd.globalObject,
  };

  // Production compression
  if (env === 'production') {
    sdk.addPlugin('compression', new CompressionPlugin());
  }

  return sdk.config();
};
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/umd.webpack.config.js:28-120`

### WebpackSDK Integration

UMD builds use the same `WebpackSDK` class as main builds, providing:
- **Registry-based configuration** - Rules, plugins, externals
- **Hook integration** - `reactium-webpack.js` discovery for customization
- **Ignore patterns** - Exclude server code, styles, configs
- **Override support** - `umd.webpack.override.js` files

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/umd.webpack.config.js:10-26`

---

## Default Library Externals

### Standard External Libraries

Reactium provides default externals for common libraries to prevent bundling:

```javascript
const defaultLibraryExternals = {
  axios: {
    externalName: 'axios',
    requirePath: 'axios',
  },
  classnames: {
    externalName: 'classnames',
    requirePath: 'classnames',
  },
  moment: {
    externalName: 'moment',
    requirePath: 'dayjs',  // Note: maps to dayjs
  },
  dayjs: {
    externalName: 'dayjs',
    requirePath: 'dayjs',
  },
  'object-path': {
    externalName: 'object-path',
    requirePath: 'object-path',
  },
  'prop-types': {
    externalName: 'prop-types',
    requirePath: 'prop-types',
  },
  react: {
    externalName: 'react',
    requirePath: 'react',
    defaultAlias: 'React',  // ES6 named exports + default alias
  },
  'react-router-dom': {
    externalName: 'react-router-dom',
    requirePath: 'react-router-dom',
  },
  ReactDOM: {
    externalName: 'react-dom',
    requirePath: 'react-dom',
    defaultAlias: 'ReactDOM',
  },
  Reactium: {
    externalName: '/@atomic-reactor/reactium-core/sdk$/',
    requirePath: '@atomic-reactor/reactium-core/sdk',
    defaultAlias: 'Reactium',
  },
  semver: {
    externalName: 'semver',
    requirePath: 'semver',
  },
  'shallow-equals': {
    externalName: 'shallow-equals',
    requirePath: 'shallow-equals',
  },
  underscore: {
    externalName: 'underscore',
    requirePath: 'underscore',
  },
  uuid: {
    externalName: 'uuid',
    requirePath: 'uuid',
  },
  xss: {
    externalName: 'xss',
    requirePath: 'xss',
  },
};
```

**External Configuration**:
- `externalName` - How the library is referenced in webpack externals
- `requirePath` - Import path in source code
- `defaultAlias` - (Optional) Default export alias for dual CJS/ESM support

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/reactium-config.js:9-84`

### How Externals Work

When a UMD library is built:
1. Webpack sees `import React from 'react'`
2. Matches `'react'` against externals config
3. Replaces import with reference to global `React` variable
4. **Result**: React is NOT bundled, expected to be loaded separately

**Benefit**: If main app bundles React, UMD library reuses it (no duplication).

---

## Custom UMD Library Creation

### Step-by-Step Guide

#### 1. Create Library Directory Structure

```bash
mkdir -p src/my-library
cd src/my-library
```

#### 2. Create Entry Point (`umd.js`)

```javascript
// src/my-library/umd.js
import MyLibrary from './index';

// Export for UMD consumers
export default MyLibrary;
```

#### 3. Create Library Implementation (`index.js`)

```javascript
// src/my-library/index.js
import React from 'react';
import op from 'object-path';

const MyLibrary = {
  version: '1.0.0',

  doSomething: (data) => {
    return op.get(data, 'path.to.value');
  },

  Component: (props) => {
    return <div>{props.children}</div>;
  },
};

export default MyLibrary;
```

#### 4. Create Configuration (`umd-config.json`)

```json
{
  "libraryName": "MyLibrary",
  "globalObject": "window",
  "externals": {
    "react": "react",
    "object-path": "object-path"
  }
}
```

#### 5. Build and Deploy

```bash
# Development (with watch)
npm run local

# Production build
npm run build
```

**Output Location**: `public/assets/js/umd/MyLibrary/MyLibrary.js`

#### 6. Runtime Loading

```javascript
// In main app or other UMD library
import('/assets/js/umd/MyLibrary/MyLibrary.js')
  .then(module => {
    const MyLibrary = module.default;
    MyLibrary.doSomething({ path: { to: { value: 'test' } } });
  });
```

---

## Runtime Loading Patterns

### Dynamic Import Pattern

```javascript
// Lazy load UMD library
const loadLibrary = async () => {
  const module = await import('/assets/js/umd/my-library/my-library.js');
  return module.default;
};

// Use in component
const MyComponent = () => {
  const [Library, setLibrary] = React.useState(null);

  React.useEffect(() => {
    loadLibrary().then(setLibrary);
  }, []);

  if (!Library) return <div>Loading...</div>;

  return <Library.Component />;
};
```

### Script Tag Pattern

```javascript
// Load via script tag (for non-module contexts like service workers)
const script = document.createElement('script');
script.src = '/assets/js/umd/my-library/my-library.js';
script.onload = () => {
  // Library available as window.MyLibrary
  window.MyLibrary.doSomething();
};
document.head.appendChild(script);
```

### Service Worker Pattern

Service workers use UMD libraries extensively (can't use ES modules):

```javascript
// src/sw/umd-config.json
{
  "libraryName": "service-worker",
  "globalObject": "this",
  "babelPresetEnv": false,
  "babelReact": false,
  "babelLoader": false,
  "externals": {},
  "workerRestAPI": true
}
```

**Source**: `Reactium-Core-Plugins/src/sw/umd-config.json:1-10`

---

## Integration with Main Build

### Gulp Build Task

UMD libraries are built as part of the main build pipeline:

```javascript
const umdLibraries = async done => {
  let umdConfigs = [];
  try {
    umdConfigs = JSON.parse(
      fs.readFileSync(config.umd.manifest, 'utf8'),
    );
  } catch (error) {
    console.log(error);
  }

  for (let umd of umdConfigs) {
    try {
      console.log(`Generating UMD library ${umd.libraryName}`);
      await new Promise((resolve, reject) => {
        webpack(umdWebpackGenerator(umd), (err, stats) => {
          if (err) {
            reject(err);
            return;
          }

          let result = stats.toJson();
          if (result.errors.length > 0) {
            result.errors.forEach(error => {
              console.log(error);
            });
            reject(result.errors);
            return;
          }

          resolve();
        });
      });
    } catch (error) {
      console.log('error', error);
    }
  }

  done();
};
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:447-486`

### Build Order

```javascript
buildTasks: [
  'preBuild',
  'ensureReactiumModules',
  'clean',
  'manifest',           // Generates umd-manifest.json
  ['markup', 'json'],
  ['assets', 'styles'],
  'scripts',            // Main webpack build
  'umdLibraries',       // UMD builds (after main)
  'serviceWorker',
  'compress',
  'postBuild',
]
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.config.js:138-150`

---

## Best Practices

### 1. Library Naming

**Good**:
- `MyLibrary` - PascalCase for global variable
- `my-library` - kebab-case for directory/file names
- Descriptive, unique names

**Bad**:
- `lib` - Too generic
- `MyLib` - Abbreviations unclear
- `my_library` - Snake case (use kebab)

### 2. External Dependencies

**Always externalize**:
- React/ReactDOM (already in main bundle)
- Reactium SDK (framework dependency)
- Common utilities (object-path, lodash, etc.)

**Bundle**:
- Library-specific dependencies not in defaultLibraryExternals
- Rare NPM packages

**Example**:
```json
{
  "externals": {
    "react": "react",
    "react-dom": "react-dom",
    "Reactium": "/@atomic-reactor/reactium-core/sdk$/"
  }
}
```

### 3. Entry Point Simplicity

Keep `umd.js` minimal - just export:

```javascript
// Good
export { default } from './index';

// Also good
import Library from './index';
export default Library;

// Bad - logic in entry point
import React from 'react';
const Component = () => <div>Hello</div>;
export default Component;
```

### 4. Global Object Selection

- **Browser libraries**: `"window"`
- **Service workers**: `"this"`
- **Universal (browser + worker)**: `"self"`

### 5. Source Maps

Enable in development, disable in production for smaller bundles:

```json
{
  "sourcemaps": true
}
```

(Framework automatically disables in production mode)

### 6. Output Organization

Use `outputPath` to organize related libraries:

```json
{
  "libraryName": "media-utils",
  "outputPath": "media"
}
```

**Result**: `public/assets/js/umd/media/media-utils.js`

---

## Common Gotchas

### 1. Forgetting umd-config.json

**Problem**: UMD entry point discovered but no config file.

**Result**: Uses defaults (directory name as libraryName, all defaultLibraryExternals).

**Fix**: Always create `umd-config.json` even if minimal:
```json
{ "libraryName": "my-library" }
```

### 2. Incorrect External References

**Problem**: External library bundled when it should be external.

**Symptom**: UMD bundle contains React code (large file size).

**Cause**: External name mismatch or missing from config.

**Fix**: Verify external config matches import statement:
```javascript
// Import in code
import React from 'react';

// Must match in umd-config.json
{
  "externals": {
    "react": "react"  // Key matches import
  }
}
```

### 3. Service Worker Babel Configuration

**Problem**: Service worker UMD build uses ES6 syntax that breaks in workers.

**Cause**: Babel presets enabled (default: true).

**Fix**: Disable babel for service workers:
```json
{
  "babelPresetEnv": false,
  "babelReact": false,
  "babelLoader": false
}
```

**Source**: `Reactium-Core-Plugins/src/sw/umd-config.json:4-6`

### 4. UMD Not Regenerating

**Problem**: Changes to UMD library not reflected after rebuild.

**Possible Causes**:
- Manifest not regenerated (change to entry point filename)
- Webpack cache (delete `.tmp/` directory)
- Wrong NODE_ENV

**Fix**:
```bash
# Clean build
rm -rf .tmp/ public/
npm run build
```

### 5. Global Object Scope

**Problem**: UMD library works in browser but fails in service worker.

**Cause**: `globalObject: "window"` (window doesn't exist in workers).

**Fix**: Use `"this"` or `"self"` for universal compatibility:
```json
{
  "globalObject": "self"
}
```

### 6. Circular Dependencies with Externals

**Problem**: UMD library externalizes dependency that itself is a UMD library.

**Example**: Library A externalizes Library B, but Library B loads Library A.

**Result**: Runtime errors (undefined references).

**Fix**: Ensure clear dependency hierarchy - no circular UMD dependencies.

### 7. Missing Runtime Dependencies

**Problem**: UMD library loads but crashes with "React is not defined".

**Cause**: External dependency not loaded before UMD library.

**Fix**: Ensure externals are available:
```javascript
// Load dependencies first
await import('/assets/js/main.js');  // Contains React
// Then load UMD library
await import('/assets/js/umd/my-library/my-library.js');
```

### 8. Compression Plugin Errors

**Problem**: Production build fails on UMD libraries.

**Cause**: CompressionPlugin configured but gzip not available.

**Fix**: Install compression dependencies or disable:
```javascript
// In umd.webpack.override.js
module.exports = (umd, config) => {
  if (umd.libraryName === 'my-library') {
    delete config.plugins.compression;
  }
  return config;
};
```

### 9. Override Files Not Applied

**Problem**: `umd.webpack.override.js` changes not reflected.

**Discovery locations** (checked in order):
1. `./umd.webpack.override.js` (root)
2. `./src/**/umd.webpack.override.js` (source)
3. `./reactium_modules/**/umd.webpack.override.js` (workspace modules)

**Fix**: Place override file in correct location, restart build.

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/umd.webpack.config.js:10-26`

### 10. DefinePlugin Conflicts

**Problem**: Custom defines in UMD library override defaults.

**Cause**: `addDefines: true` (default) adds DefinePlugin.

**Fix**: Disable or merge with custom defines:
```json
{
  "addDefines": false
}
```

Then add custom DefinePlugin in override file.

---

## Summary

The UMD system provides:
- ✅ **Automatic discovery** - Find entry points via manifest pattern matching
- ✅ **Flexible configuration** - Per-library umd-config.json files
- ✅ **External optimization** - Prevent dependency duplication
- ✅ **WebpackSDK integration** - Consistent configuration approach
- ✅ **Build pipeline integration** - Seamless Gulp task inclusion
- ✅ **Runtime flexibility** - Dynamic loading, script tags, service workers

**Critical for**:
- Plugin distribution (standalone components)
- Service worker implementation (UMD-only environment)
- Code splitting strategies (lazy-loaded features)
- Bundle size optimization (externalize common libraries)

**Complete reference chain**: CLAUDEDB → this file → Source code (file:line references above)
