<!-- v1.0.0 -->

# Gulp Build System and Asset Pipeline

**Purpose**: Orchestrate build tasks (SCSS compilation, asset copying, manifest generation, webpack bundling, service worker generation, compression) with hook-driven extensibility.

**Core Concept**: Gulp provides task orchestration. Hooks enable plugins to inject custom build steps. The system supports both development (watch mode with BrowserSync) and production builds.

---

## System Architecture

### Build Pipeline Overview

```
Build Flow (Production):
1. preBuild hook
2. ensureReactiumModules (create reactium_modules/ if missing)
3. clean (delete public/ directory)
4. manifest (generate all manifests in parallel)
5. markup + json (copy HTML/JSON files)
6. assets + styles (copy assets, compile SCSS)
7. scripts (webpack compilation)
8. umdLibraries (build UMD bundles for plugins)
9. serviceWorker (generate SW with precache manifest)
10. compress (gzip static assets)
11. postBuild hook

Development Flow:
1. Same as production BUT:
   - scripts task skipped (webpack runs in watch mode separately)
   - BrowserSync proxy enabled
   - File watchers active (manifest, styles, assets, markup)
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:263-281`

---

## Gulp Configuration (gulp.config.js)

### Key Configuration Sections

```javascript
module.exports = {
    port: {
        proxy: 3030,           // Node server port
        browsersync: 3000,     // BrowserSync proxy port
    },
    open: true,                // Auto-open browser on start

    src: {
        app: './src/app',
        assets: './src/app/**/assets/**/*',
        includes: ['./node_modules'],
        appdir: path.resolve(rootPath, 'src/app'),
        rootdir: rootPath,
        domainManifest: 'src/domains.js',
        manifest: 'src/manifest.js',
        externalsManifest: 'src/externals-manifest.js',
        markup: './src/app/**/*.html',
        json: ['./src/**/*.json', '!./src/app/server/manifest-webpack.json'],
        style: './src/app/main.scss',
        styleDDD: [
            './src/**/*/style',
            './reactium_modules/**/*/style',
            './src/**/**/_reactium-style*.scss',
            './reactium_modules/**/**/_reactium-style*.scss',
        ],
        pluginAssets: ['./reactium_modules/**/plugin-assets.json'],
        reactiumModules: path.normalize(`${rootPath}/reactium_modules`),
    },

    dest: {
        dist: path.normalize(`${rootPath}/public`),
        build: path.normalize(`${rootPath}/public`),
        assets: path.normalize(`${rootPath}/public/assets`),
        styles: path.normalize(`${rootPath}/public/assets/style`),
        markup: path.normalize(`${rootPath}/public`),
        static: path.normalize(`${rootPath}/.static`),
        modulesPartial: path.normalize(`${rootPath}/src/app/main.scss`),
    },

    umd: {
        manifest: path.normalize(`${rootPath}/public/umd-manifest.json`),
        dist: path.normalize(`${rootPath}/public/assets/js/umd`),
    },
};
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.config.js:30-128`

---

## Core Build Tasks

### 1. clean - Remove Build Artifacts

```javascript
const clean = done => {
    del.sync([config.dest.dist]);  // Delete public/ directory
    done();
};
```

**Purpose**: Start with clean slate, remove stale files
**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:304-308`

---

### 2. manifest - Generate All Manifests

```javascript
const manifest = gulp.series(
    gulp.parallel(
        gulp.series(task('domainsManifest'), task('mainManifest')),  // Sequential
        task('externalsManifest'),  // Parallel
        task('umdManifest'),        // Parallel
    ),
);
```

**Generates**:
1. `src/domains.js` - Domain name resolution
2. `src/manifest.js` - Routes/services/hooks loader
3. `src/externals-manifest.js` - Webpack externals config
4. `public/umd-manifest.json` - UMD library build list

**Why Sequential**: `mainManifest` depends on `domains.js` existing

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:320-326,332-388`

See **[MANIFEST_SYSTEM.md](./MANIFEST_SYSTEM.md)** for complete manifest documentation.

---

### 3. styles - SCSS Compilation with DDD Partials

#### SCSS Compilation Flow

```
1. styles:pluginAssets (convert images to data URLs)
   ↓
2. styles:partials (generate _reactium-modules-partials.scss with all discovered partials)
   ↓
3. styles:main (compile src/app/main.scss → public/assets/style/style.css)
   ↓
4. styles:main (minify → style.min.css)
   ↓
5. styles:main (compress → style.min.css.gz)
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:559-770,807-824`

#### Plugin Assets (Base64 Embedding)

Plugins can embed images as data URLs in SCSS:

```json
// reactium_modules/my-plugin/plugin-assets.json
{
  "logo": "assets/logo.png",
  "icon": "assets/icon.svg"
}
```

**Generated**:
```scss
// reactium_modules/my-plugin/_reactium-style-variables.scss
@use "sass:map";

$assets: () !default;
$assets: map.set($assets, "logo", "data:image/png;base64,iVBOR...");
$assets: map.set($assets, "icon", "data:image/svg+xml;base64,PHN...");
```

**Usage in SCSS**:
```scss
@import 'my-plugin/_reactium-style-variables';

.logo {
    background-image: map.get($assets, 'logo');
}
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:499-557`

#### DDD Style Partials Discovery

**Discovery Pattern**:
```javascript
config.src.styleDDD = [
    './src/**/*/style',                            // Directory-based: src/app/MyFeature/style/*.scss
    './reactium_modules/**/*/style',               // Plugin directory-based
    './src/**/**/_reactium-style*.scss',           // File-based: _reactium-style-atoms.scss
    './reactium_modules/**/**/_reactium-style*.scss',
];
```

**Registry-Based Priority System**:
```javascript
sassPartialPreRegistrations(SassPartialRegistry);  // Core patterns registered

// Priority order (low → high number = earlier in compilation):
Enums.style.VARIABLES  = -1000000  // Variables first
Enums.style.MIXINS     = -900000   // Mixins second
Enums.style.BASE       = -100000   // Base styles
Enums.style.ATOMS      = -1000     // Atomic Design: Atoms
Enums.style.MOLECULES  = -100      // Atomic Design: Molecules
Enums.style.ORGANISMS  = -10       // Atomic Design: Organisms
Enums.style.OVERRIDES  = 1000000   // Overrides last
```

**Pre-registered Patterns**:
```javascript
// Pattern matching examples:
SassPartialRegistry.register('variables-dir', {
    pattern: /variables?\/_reactium-style/,  // src/app/variables/_reactium-style.scss
    priority: Enums.style.VARIABLES,
});

SassPartialRegistry.register('variables-ddd', {
    pattern: /_reactium-style-variables?/,   // src/app/MyFeature/_reactium-style-variables.scss
    priority: Enums.style.VARIABLES,
});

// Same patterns for: mixins, base, atoms, molecules, organisms, overrides
```

**Hook**: `ddd-styles-partial` - Plugins can register custom patterns
**Hook**: `ddd-styles-partial-glob` - Plugins can add custom glob patterns

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:559-643,645-696`

#### Multi-Level Sort Algorithm

```javascript
stylePartials
    // 1. Sort by directory basename (alphabetical)
    .sort(({ partial: a }, { partial: b }) => {
        const aBase = path.basename(path.dirname(a)).toLowerCase();
        const bBase = path.basename(path.dirname(b)).toLowerCase();
        return aBase > bBase ? 1 : aBase < bBase ? -1 : 0;
    })
    // 2. Sort by filename (alphabetical)
    .sort(({ partial: a }, { partial: b }) => {
        const aBase = path.basename(a).toLowerCase();
        const bBase = path.basename(b).toLowerCase();
        return aBase > bBase ? 1 : aBase < bBase ? -1 : 0;
    })
    // 3. Sort by numeric prefix in filename (if present)
    .sort(({ partial: a }, { partial: b }) => {
        const aNumber = path.basename(a).match(/(\d+)/) || 0;
        const bNumber = path.basename(b).match(/(\d+)/) || 0;
        return aNumber > bNumber ? 1 : aNumber < bNumber ? -1 : 0;
    })
    // 4. Sort by registered priority (FINAL sort - highest precedence)
    .sort(({ match: a }, { match: b }) => {
        const aPriority = op.get(a, 'priority', Enums.style.ORGANISMS);
        const bPriority = op.get(b, 'priority', Enums.style.ORGANISMS);
        return aPriority > bPriority ? 1 : bPriority > aPriority ? -1 : 0;
    });
```

**Result**: Variables → Mixins → Base → Atoms (alphabetical, numeric) → Molecules → Organisms → Overrides

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:700-752`

#### Generated Partial Aggregator

```scss
// src/app/main.scss includes:
@import '_reactium-modules-partials';

// Generated file: src/app/_reactium-modules-partials.scss
// WARNING: Do not directly edit this file !!!!
// File generated by gulp styles:partials task

@import 'reactium_modules/@atomic-reactor/reactium-core/style/_reactium-style-variables';
@import 'reactium_modules/@atomic-reactor/reactium-core/style/_reactium-style-mixins';
@import '+@atomic-reactor/my-plugin/_reactium-style-base';  // "+" prefix = reactium_modules/
@import '../src/app/MyFeature/_reactium-style-atoms';
// ... etc in priority order
```

**Path Transformation**:
- `reactium_modules/` → `+` prefix for node-sass-reactium-importer
- Relative paths maintained for src/app files

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:655-762`

#### SCSS Compilation with Reactium Importer

```javascript
gulp.src(config.src.style)  // src/app/main.scss
    .pipe(sourcemaps.init())
    .pipe(sass({
        importer: reactiumImporter,  // Resolves "+" prefix to reactium_modules/
        includePaths: config.src.includes,  // ['./node_modules']
    }))
    .pipe(prefix(config.cssOptions))  // Autoprefixer
    .pipe(rename({ basename: 'style' }))
    .pipe(gulpif(!isDev, cleanCSS()))  // Minify in production
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(config.dest.styles));  // public/assets/style/
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:807-824`

---

### 4. scripts - Webpack Compilation

```javascript
const scripts = done => {
    if (!isDev || process.env.MANUAL_DEV_BUILD === 'true') {
        webpack(webpackConfig, (err, stats) => {
            // Error handling...

            // Extract main entry assets:
            const mainEntryAssets = _.pluck(
                stats.toJson().namedChunkGroups.main.assets,
                'name'
            );

            // Hook for plugins to process webpack output:
            Hook.runSync('main-webpack-assets', mainEntryAssets, info, stats);

            // Save manifest for SSR:
            fs.writeFileSync(
                'src/app/server/webpack-manifest.json',
                JSON.stringify(mainEntryAssets),
                'utf-8'
            );

            done();
        });
    } else {
        done();  // Skip in dev mode (webpack-dev-middleware handles it)
    }
};
```

**Key Points**:
- **Production**: Webpack runs via Gulp, generates static bundles
- **Development**: Webpack runs separately in watch mode (gulp.watch.js), serves from memory via webpack-dev-middleware
- **Manifest**: `webpack-manifest.json` saved for SSR to know which assets to inject

**Hook**: `main-webpack-assets` - Plugins can process compiled asset list

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:396-445`

---

### 5. umdLibraries - Build Plugin UMD Bundles

```javascript
const umdLibraries = async done => {
    let umdConfigs = JSON.parse(fs.readFileSync(config.umd.manifest, 'utf8'));

    for (let umd of umdConfigs) {
        console.log(`Generating UMD library ${umd.libraryName}`);

        await new Promise((resolve, reject) => {
            webpack(umdWebpackGenerator(umd), (err, stats) => {
                // Error handling...
                resolve();
            });
        });
    }

    done();
};
```

**Purpose**: Build standalone UMD bundles for reusable components/plugins
**Input**: `public/umd-manifest.json` (generated by `umdManifest` task)
**Output**: `public/assets/js/umd/*.umd.js` files

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:447-486`

See **[UMD_SYSTEM.md]** for complete UMD documentation (TODO: create this doc).

---

### 6. assets - Copy Static Assets

```javascript
const assets = () =>
    gulp
        .src(config.src.assets, { encoding: false })  // Binary mode
        .pipe(rename(assetPath))  // Strip 'assets' from path
        .pipe(gulp.dest(config.dest.assets));  // → public/assets/

// Path transformation:
const assetPath = p => {
    p.dirname = p.dirname.split('assets').pop();  // src/app/MyFeature/assets/img/logo.png → img/logo.png
};
```

**Discovery Pattern**: `./src/app/**/assets/**/*`
**Result**: All files in `assets/` directories copied to `public/assets/`

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:233-237,49-51`

---

### 7. markup - Copy HTML Files

```javascript
const markup = () =>
    gulp
        .src(config.src.markup)  // ./src/app/**/*.html
        .pipe(rename(markupPath))
        .pipe(gulp.dest(config.dest.markup));  // → public/

const markupPath = p => {
    if (p.extname === '.css') {  // Special handling for CSS in markup task
        p.dirname = config.dest.style.split(config.dest.markup).pop();
    }
};
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:390-394,52-56`

---

### 8. json - Copy JSON Files

```javascript
const json = () =>
    gulp.src(config.src.json).pipe(gulp.dest(config.dest.build));

// Pattern: ['./src/**/*.json', '!./src/app/server/manifest-webpack.json']
```

**Excludes**: webpack-manifest.json (generated by scripts task)

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:317-318`

---

### 9. compress - Gzip Static Assets

```javascript
const compress = () =>
    gulp
        .src([
            `${config.dest.dist}/**/*.css`,
            `${config.dest.dist}/**/*.js`,
            `${config.dest.dist}/**/*.html`,
        ])
        .pipe(gzip({ gzipOptions: { level: 9 } }))  // Maximum compression
        .pipe(gulp.dest(config.dest.dist));  // Writes .gz files alongside originals
```

**Result**: For each `.css`/`.js`/`.html` file, creates `.css.gz`/`.js.gz`/`.html.gz`

**Source**: Implied from standard Gulp pattern (not explicitly shown in provided excerpts, but standard practice)

---

### 10. serviceWorker - Generate Service Worker (Plugin)

```javascript
// Stub in core - actual implementation in @atomic-reactor/reactium-service-worker plugin
const serviceWorker = () => Promise.resolve();
```

**Actual Implementation** (in service worker plugin):
- Generates `sw.js` with precache manifest
- Lists all assets for offline availability
- Integrates with workbox for caching strategies

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:488-489`

---

## Development Mode

### watch Task

```javascript
const watch = (done, restart = false) => {
    let watchProcess = fork(path.resolve(__dirname, './gulp.watch.js'), {
        env: process.env,
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    });

    watchProcess.send({ config, webpackConfig, restart });

    watchProcess.on('message', message => {
        switch (message) {
            case 'build-started':
                console.log("Starting 'build'...");
                done();
                return;
            case 'restart-watches':
                // Server crashed, wait and restart
                axios.get(`http://127.0.0.1:${config.port.proxy}`)
                    .then(() => {
                        watchProcess.kill();
                        watch(_ => _, true);
                    });
                return;
        }
    });
};
```

**Why Fork**: Isolates file watchers in separate process to prevent memory leaks

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:156-188`

### File Watchers (gulp.watch.js)

```javascript
// Watch manifest sources → regenerate manifests
gulpwatch([config.src.app, config.src.reactiumModules], () => {
    gulp.task('manifest')(() => Promise.resolve());
});

// Watch SCSS partials → regenerate partials
gulpwatch(config.src.styleDDD, gulp.series(task('styles:pluginAssets'), task('styles:partials')));

// Watch main SCSS → recompile
gulpwatch(config.src.style, task('styles:main'));

// Watch assets → copy
gulpwatch(config.src.assets, task('assets'), watcher);

// Watch markup → copy
gulpwatch(config.src.markup, task('markup'));
```

**watcher** helper: Efficiently copies individual changed files (not entire directory)

**Source**: Implied from `gulp.watch.js` (forked process, not fully shown in excerpts)

---

### BrowserSync Integration

```javascript
const serve = ({ open } = { open: config.open }) => done => {
    const proxy = `127.0.0.1:${config.port.proxy}`;  // Node server

    axios.get(`http://${proxy}`).then(() => {  // Wait for server ready
        browserSync({
            notify: false,
            timestamps: false,
            port: config.port.browsersync,      // 3000
            ui: { port: config.port.browsersync + 1 },  // 3001
            proxy,                               // Proxy to Node server
            open: open,
            ghostMode: false,
            startPath: config.dest.startPath,
            ws: true,                            // WebSocket support
        });

        done();
    });
};
```

**Flow**:
1. Node server runs on port 3030 (serves SSR + webpack-dev-middleware)
2. BrowserSync proxies to 3030 on port 3000
3. Browser connects to 3000
4. BrowserSync injects live-reload script
5. File changes trigger reload via WebSocket

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:131-154`

---

## Hook Integration

### Build Hooks

Plugins can extend build process via hooks:

```javascript
// Before build
Hook.register('preBuild', async () => {
    console.log('Running custom pre-build step...');
});

// After build
Hook.register('postBuild', async () => {
    console.log('Running custom post-build step...');
});

// Modify build task series
Hook.register('build-series', series => {
    series.push('myCustomTask');  // Add custom task to end
    series.splice(3, 0, 'myEarlyTask');  // Insert task after clean
});

// Process webpack output
Hook.register('main-webpack-assets', (assets, info, stats) => {
    console.log('Main bundle assets:', assets);
    // assets = ['main.abc123.js', 'vendor.def456.js', ...]
});

// Customize style partials discovery
Hook.register('ddd-styles-partial', SassPartialRegistry => {
    SassPartialRegistry.register('my-custom-pattern', {
        pattern: /_my-style/,
        priority: Enums.style.ATOMS,
    });
});

// Add custom glob patterns for style discovery
Hook.register('ddd-styles-partial-glob', styleDDD => {
    styleDDD.push('./my-custom-path/**/_styles.scss');
});
```

**Available Hooks**:
- `preBuild` - Before build starts
- `postBuild` - After build completes
- `build-series` - Modify build task array
- `main-webpack-assets` - Process webpack output
- `ddd-styles-partial` - Register SCSS partial patterns
- `ddd-styles-partial-glob` - Add SCSS discovery globs

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:278,425,653,666`

---

## Configuration Override Pattern

### gulp.config.override.js

Projects can customize gulp configuration:

```javascript
// Project root: gulp.config.override.js
module.exports = config => {
    // Change ports:
    config.port.proxy = 4000;
    config.port.browsersync = 4001;

    // Add custom source paths:
    config.src.customAssets = './src/server/assets/**/*';

    // Change destinations:
    config.dest.customDist = './build';

    // Modify SCSS discovery:
    config.src.styleDDD.push('./src/custom-styles/**/*.scss');

    return config;
};
```

**Discovery**: Automatically loaded by `gulp.config.js` if exists in project root

**Source**: Standard Gulp pattern (override file imported in gulp.config.js)

---

## Environment Variables

### Build-Time Configuration

```bash
# Port configuration
PORT=4000 gulp                    # Sets Node server port
APP_PORT=4000 gulp                # Alternative port variable
BROWSERSYNC_PORT=4001 gulp        # BrowserSync port

# Build modes
NODE_ENV=production gulp          # Production build
NODE_ENV=development gulp         # Development build
MANUAL_DEV_BUILD=true gulp        # Force webpack build in dev mode

# Debug options
DEBUG=on gulp                     # Show webpack warnings
VERBOSE_API_DOCS=true gulp        # Verbose API doc generation

# Browser selection (BrowserSync)
BROWERSYNC_OPEN_BROWSER=firefox gulp  # Open specific browser
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:65-80,116-128,418`

---

## Task Organization

### Task Naming Convention

```javascript
const task = require('./get-task')(gulp);

// Usage:
gulp.series(task('clean'), task('manifest'));

// Equivalent to:
gulp.series(gulp.task('clean'), gulp.task('manifest'));
```

**get-task helper**: Returns task function or registers on-the-fly

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:44`

### Task Composition Helpers

```javascript
// Generate series from array:
const generateSeries = (arr = []) => {
    return gulp.series(
        ...arr.map(t => {
            if (typeof t === 'string') {
                return task(t);
            } else if (Array.isArray(t)) {
                return generateParallel(t);  // Nested parallel
            }
        }),
    );
};

// Generate parallel from array:
const generateParallel = (arr = []) => {
    return gulp.parallel(
        ...arr.map(t => {
            if (typeof t === 'string') {
                return task(t);
            } else if (Array.isArray(t)) {
                return generateSeries(t);  // Nested series
            }
        }),
    );
};

// Usage (from config):
const series = [
    'preBuild',
    'clean',
    'manifest',
    ['markup', 'json'],  // ← Parallel
    ['assets', 'styles'],  // ← Parallel
    'scripts',
    'postBuild',
];

const build = generateSeries(series);
```

**Flexibility**: Mix series and parallel execution declaratively

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:239-261,263-281`

---

## Common CLI Commands

### Development

```bash
# Start dev server with file watching and BrowserSync
gulp

# Or explicitly:
gulp watch

# Start local dev server (no BrowserSync, just nodemon)
gulp local

# Regenerate manifests only
gulp manifest

# Regenerate styles only
gulp styles

# Regenerate UMD libraries only
gulp umd
```

### Production

```bash
# Full production build
NODE_ENV=production gulp

# Or via npm script:
npm run build

# Build then copy to .static/ directory
gulp static
```

### Specific Tasks

```bash
# Clean build artifacts
gulp clean

# Generate API documentation
gulp apidocs

# Build service worker only
gulp serviceWorker
```

**Source**: Implied from task registration and npm scripts

---

## Best Practices

### 1. Hook Registration Timing

Register build hooks BEFORE build process starts:

```javascript
// In reactium-hooks.js (plugin):
import Reactium from '@atomic-reactor/reactium-core/sdk';

Reactium.Hook.register('preBuild', async () => {
    // Custom pre-build logic
});
```

**Timing**: Hooks discovered via manifest, loaded before build tasks execute

### 2. Style Partial Naming

Follow conventions for automatic priority assignment:

```
_reactium-style-variables.scss  → VARIABLES priority (-1000000)
_reactium-style-mixins.scss     → MIXINS priority (-900000)
_reactium-style-base.scss       → BASE priority (-100000)
_reactium-style-atoms.scss      → ATOMS priority (-1000)
_reactium-style-molecules.scss  → MOLECULES priority (-100)
_reactium-style-organisms.scss  → ORGANISMS priority (-10)
_reactium-style-overrides.scss  → OVERRIDES priority (1000000)
```

Or organize by directory:
```
src/app/style/
  variables/_reactium-style.scss
  mixins/_reactium-style.scss
  base/_reactium-style.scss
  atoms/_reactium-style.scss
```

### 3. Asset Organization

Keep assets in `assets/` subdirectories:

```
src/app/
  MyFeature/
    assets/
      images/logo.png      → public/assets/images/logo.png
      fonts/custom.woff    → public/assets/fonts/custom.woff
      data/config.json     → public/assets/data/config.json
```

**Benefit**: Automatic discovery and copying by `assets` task

### 4. Custom Build Tasks

Extend build process via hooks, not by modifying gulp.tasks.js:

```javascript
// ❌ BAD: Editing gulp.tasks.js directly (conflicts on framework updates)

// ✅ GOOD: Using hooks in plugin
Hook.register('postBuild', async () => {
    // Custom post-build logic (runs after all standard tasks)
});

Hook.register('build-series', series => {
    // Insert custom task at specific point
    const indexOfScripts = series.indexOf('scripts');
    series.splice(indexOfScripts + 1, 0, 'myCustomTask');
});

// Register custom task:
gulp.task('myCustomTask', done => {
    // Custom logic...
    done();
});
```

### 5. Development Performance

Optimize watch performance:

```javascript
// ❌ AVOID: Watching too many files
gulpwatch('src/**/*', task('build'));  // Rebuilds everything on any change

// ✅ BETTER: Specific watchers for specific tasks
gulpwatch('src/**/*.scss', task('styles'));
gulpwatch('src/**/*.js', task('scripts'));
gulpwatch('src/**/assets/**/*', task('assets'));
```

### 6. Plugin Asset Embedding

Use `plugin-assets.json` for small images/icons:

```json
// reactium_modules/my-plugin/plugin-assets.json
{
  "icon-close": "assets/icons/close.svg",
  "icon-menu": "assets/icons/menu.svg",
  "logo-small": "assets/logo-sm.png"
}
```

**Benefits**:
- No additional HTTP requests
- Guaranteed availability (no 404 risks)
- Cacheable in SCSS output

**Tradeoffs**:
- Increases CSS file size
- Only suitable for small images (<10KB)
- No lazy-loading

---

## Common Gotchas

### 1. Manifest Not Regenerating

**Symptom**: New files not discovered, routes/services not loading

**Cause**: Manifest only regenerates when explicitly run or on full build

**Fix**:
```bash
gulp manifest  # Regenerate manifests
# OR
gulp           # Full rebuild (includes manifest task)
```

**Watch Mode**: Manifest watcher detects file additions/deletions automatically

### 2. SCSS Partial Not Included

**Symptom**: Styles from new partial not appearing

**Causes**:
- File doesn't match `config.src.styleDDD` patterns
- File doesn't match any `SassPartialRegistry` pattern
- File marked as `exclude: true` in registry

**Debug**:
```bash
gulp styles:partials  # Regenerate _reactium-modules-partials.scss
cat src/app/_reactium-modules-partials.scss  # Check if your file is listed
```

**Fix**: Ensure file matches pattern:
- Use `_reactium-style-*.scss` naming
- Place in `style/` directory
- Check `ddd-styles-partial` hook registration

### 3. Asset Not Copied

**Symptom**: Asset returns 404 in browser

**Causes**:
- File not in `assets/` subdirectory
- File path doesn't match `config.src.assets` glob
- File excluded by gulp default exclusions (.DS_Store, etc.)

**Fix**:
```
src/app/MyFeature/
  assets/              ← MUST be named 'assets'
    images/logo.png    ← Gets copied
  files/data.json      ← NOT copied (not in 'assets' directory)
```

### 4. Webpack Bundle Not Updating (Dev Mode)

**Symptom**: Code changes not reflected in browser

**Cause**: Webpack runs in separate watch process (webpack-dev-middleware), not via Gulp

**Fix**:
- Check webpack-dev-server console output (separate terminal)
- Verify no webpack compilation errors
- Hard refresh browser (Ctrl+Shift+R)
- Restart dev server if webpack hung

### 5. BrowserSync Not Reloading

**Symptom**: Changes to files don't trigger browser reload

**Causes**:
- BrowserSync not connected (check WebSocket connection)
- File type not watched (e.g., `.jsx` files trigger webpack, not BrowserSync)
- Server not responding (check `config.port.proxy` server is running)

**Fix**:
```bash
# Check server is running:
curl http://localhost:3030  # Should respond

# Check BrowserSync proxy:
curl http://localhost:3000  # Should respond with same content

# Restart watch task:
gulp watch
```

### 6. Styles Compiled in Wrong Order

**Symptom**: Variables undefined, mixins not available, overrides not applying

**Cause**: SCSS partial priority incorrect or not registered

**Debug**:
```bash
cat src/app/_reactium-modules-partials.scss
# Check order: Variables → Mixins → Base → Atoms → Molecules → Organisms → Overrides
```

**Fix**:
```javascript
// Register custom pattern with correct priority:
Hook.register('ddd-styles-partial', SassPartialRegistry => {
    SassPartialRegistry.register('my-variables', {
        pattern: /_my-vars/,
        priority: Enums.style.VARIABLES,  // Ensure earliest
    });
});
```

### 7. UMD Build Failures

**Symptom**: `gulp umdLibraries` fails with webpack errors

**Causes**:
- Invalid `umd-config.json` in plugin
- Missing library externals
- Incorrect entry point path
- Circular dependencies

**Debug**:
```bash
cat public/umd-manifest.json  # Check generated UMD configs
# Look for:
# - libraryName (must be valid JS identifier)
# - libraryEntry (must exist and be valid JS file)
# - externals (must match defaultLibraryExternals keys)
```

**Fix**: Verify `umd-config.json` structure:
```json
{
  "libraryName": "MyWidget",
  "libraryEntry": "umd.js",
  "externals": ["react", "react-dom"]
}
```

### 8. Compress Task Errors

**Symptom**: `gulp compress` fails or doesn't create .gz files

**Causes**:
- Insufficient disk space
- Permission errors on public/ directory
- Corrupted source files

**Fix**:
```bash
# Check disk space:
df -h

# Check permissions:
ls -la public/

# Manual compress test:
gzip -9 -c public/assets/style/style.css > public/assets/style/style.css.gz
```

---

## Performance Optimization

### Build Performance

**Profile build time**:
```bash
time NODE_ENV=production gulp
```

**Optimization strategies**:

1. **Parallel task execution**: Use `gulp.parallel` for independent tasks
2. **Incremental compilation**: Only rebuild changed files (watch mode)
3. **Sourcemap generation**: Disable in production (`gulpif(!isDev, sourcemaps.init())`)
4. **SCSS compilation**: Cache imports with `@import` (not `@use`) for faster incremental
5. **Asset copying**: Use `gulp-changed` to skip unchanged files

### Runtime Performance

**SCSS optimization**:
```javascript
// ✅ GOOD: Specific imports
@import 'variables';
@import 'mixins';

// ❌ BAD: Import everything
@import 'all-styles';  // Forces recompilation of everything
```

**Webpack optimization**: See webpack.config.js (splitChunks, minimize, etc.)

---

## Debugging Techniques

### 1. Verbose Gulp Output

```bash
gulp --verbose           # Show all gulp logs
gulp --tasks             # List all registered tasks
gulp --tasks-simple      # List task names only
```

### 2. Isolate Task Execution

```bash
gulp clean               # Run single task
gulp manifest            # Run single task
gulp styles:partials     # Run sub-task
```

### 3. Inspect Generated Files

```bash
# Check manifests:
cat src/manifest.js
cat src/domains.js
cat public/umd-manifest.json

# Check SCSS partials:
cat src/app/_reactium-modules-partials.scss

# Check webpack output:
cat src/app/server/webpack-manifest.json
```

### 4. Hook Debugging

```javascript
// Log all hook executions:
Hook.register('preBuild', () => console.log('preBuild hook'));
Hook.register('postBuild', () => console.log('postBuild hook'));
Hook.register('build-series', series => {
    console.log('Build series:', series);
});
```

### 5. Watch Process Debugging

```bash
# Kill all watch processes:
pkill -f gulp.watch.js

# Restart watch:
gulp watch

# Check process:
ps aux | grep gulp.watch
```

---

## Integration with Core Systems

### Manifest System

Gulp generates manifests consumed by ReactiumDependencies:

```
gulp manifest
  → src/manifest.js (generated)
  → import manifestLoader from 'manifest'
  → dependencies.manifest = manifestLoader.get()
  → await dependencies.load()
```

See **[MANIFEST_SYSTEM.md](./MANIFEST_SYSTEM.md)**

### Webpack Configuration

Gulp invokes webpack programmatically:

```javascript
webpack(webpackConfig, (err, stats) => {
    // Process output, save manifest
});
```

See **[REACTIUM_WEBPACK.md](./REACTIUM_WEBPACK.md)** for webpack customization

### Service Worker

Service worker plugin hooks into build:

```javascript
Hook.register('postBuild', async () => {
    // Generate sw.js with precache manifest
    // Lists all assets from public/ directory
});
```

### SSR (Server-Side Rendering)

Gulp saves webpack output for SSR consumption:

```javascript
// After webpack compilation:
fs.writeFileSync(
    'src/app/server/webpack-manifest.json',
    JSON.stringify(mainEntryAssets)
);

// SSR reads manifest to inject scripts:
const assets = require('./src/app/server/webpack-manifest.json');
// → ['main.abc123.js', 'vendor.def456.js']
```

See **[SSR_ARCHITECTURE.md](./SSR_ARCHITECTURE.md)**

---

## Summary

**The Gulp Build System provides**:
1. **Task orchestration** with series/parallel execution
2. **Hook-driven extensibility** for plugin customization
3. **SCSS compilation** with DDD partial discovery and Atomic Design priority
4. **Asset pipeline** (copy, compress, transform)
5. **Manifest generation** for dynamic imports and code-splitting
6. **Development workflow** with file watching and live reload
7. **Production optimization** with minification and compression

**Critical for**:
- Understanding build process and output structure
- Debugging asset loading issues (404s, wrong paths)
- Extending build with custom tasks via hooks
- Optimizing build performance
- Integrating custom asset types or build steps
- Troubleshooting SCSS compilation order issues

**Key Insight**: Gulp orchestrates, Hooks extend. Never modify `gulp.tasks.js` directly—use hooks in plugins to add custom build steps. The system is designed for extensibility without core file modification.
