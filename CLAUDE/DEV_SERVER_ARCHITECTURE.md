<!-- v1.0.1 -->
# Reactium Development Server Architecture

Complete development server architecture with Hot Module Replacement (HMR), webpack-dev-middleware, BrowserSync live reload, and Gulp file watchers.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Development vs Production Differences](#development-vs-production-differences)
- [webpack-dev-middleware Integration](#webpack-dev-middleware-integration)
- [Hot Module Replacement (HMR)](#hot-module-replacement-hmr)
- [BrowserSync Live Reload](#browsersync-live-reload)
- [Gulp File Watchers](#gulp-file-watchers)
- [Forked Watch Process](#forked-watch-process)
- [Asset Serving in Development](#asset-serving-in-development)
- [Source Maps](#source-maps)
- [Development Workflow](#development-workflow)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Best Practices](#best-practices)
- [Common Gotchas](#common-gotchas)
- [Debugging](#debugging)

---

## Architecture Overview

**Multi-layer development system** with different responsibilities:

```
┌─────────────────────────────────────────────────────────────┐
│  Developer Browser (localhost:3000 - BrowserSync)           │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket (live reload)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  BrowserSync Proxy Server (port 3000)                       │
│  - Injects live reload script                               │
│  - Proxies requests to Express                              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP proxy
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Express Server (port 3030)                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ webpack-dev-middleware (high priority)              │   │
│  │ - Serves JS bundles from memory filesystem          │   │
│  │ - Injects res.locals.webpack.devMiddleware          │   │
│  │ - publicPath: http://localhost:3030/assets/js/      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ webpack-hot-middleware (high priority)              │   │
│  │ - EventStream for HMR updates                       │   │
│  │ - Endpoint: /__webpack_hmr                          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SSR Router (neutral priority)                       │   │
│  │ - Reads webpack stats from res.locals               │   │
│  │ - Renders React with latest bundles                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Static Middleware (neutral priority)                │   │
│  │ - Serves CSS, images, other assets from disk        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ▲
                         │ File changes
                         │
┌─────────────────────────────────────────────────────────────┐
│  Gulp Watch Process (forked child process)                  │
│  - Watches .scss files → compile → reload BrowserSync       │
│  - Watches .html/.css files → copy → reload BrowserSync     │
│  - Watches assets → copy → reload BrowserSync               │
│  - Watches manifest files → regenerate → restart watch      │
│  - Watches style/_*.scss → restart entire watch             │
└─────────────────────────────────────────────────────────────┘
```

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/index.mjs:189-246`, `gulp.tasks.js:874-910`, `gulp.watch.js:1-28`

---

## Development vs Production Differences

| Feature | Development | Production |
|---------|------------|------------|
| **JS Assets** | Memory filesystem (webpack-dev-middleware) | Disk (public/assets/js/) |
| **CSS Compilation** | Gulp watcher → BrowserSync reload | Build task once |
| **Source Maps** | Enabled (`devtool: 'source-map'`) | Disabled |
| **Asset Serving** | webpack-dev-middleware → Express static | Express static + gzip compression |
| **Live Reload** | BrowserSync WebSocket | None |
| **HMR** | Enabled (unless DISABLE_HMR=on) | Disabled |
| **Bundle Size** | Larger (includes HMR runtime) | Optimized (code splitting) |
| **Server Restart** | Automatic (nodemon watches src/index.mjs) | Manual |
| **Asset Discovery** | res.locals.webpack.devMiddleware.stats | webpack-manifest.json |

**Source**: `index.mjs:196-246`, `webpack.config.js:46-48`, `server/renderer/index.mjs:78-99`

---

## webpack-dev-middleware Integration

### Registration

**Development mode only** - registered as high-priority middleware:

```javascript
// index.mjs:189-246
const registeredDevMiddleware = async () => {
    if (process.env.NODE_ENV === 'development') {
        const { default: webpack } = await import('webpack');
        const { default: gulpConfig } = await import('./gulp.config.js');
        const { default: webpackConfigFactory } = await import('./webpack.config.js');
        const webpackConfig = webpackConfigFactory(gulpConfig);
        const { default: wpMiddleware } = await import('webpack-dev-middleware');

        const publicPath = `http://localhost:${PORT}/`;

        // HMR configuration
        if (process.env.DISABLE_HMR !== 'on') {
            webpackConfig.entry.main = [
                'webpack-hot-middleware/client?reload=true',
                webpackConfig.entry.main,
            ];
            webpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
        }

        webpackConfig.output.publicPath = publicPath;
        const compiler = webpack(webpackConfig);

        ReactiumBoot.Server.Middleware.register('webpack', {
            name: 'webpack',
            use: wpMiddleware(compiler, {
                serverSideRender: true,  // Injects res.locals.webpack
                publicPath,
            }),
            order: Enums.priority.high,  // Before SSR router
        });
    }
};
```

**Key options**:
- `serverSideRender: true` - Populates `res.locals.webpack.devMiddleware` with stats
- `publicPath` - Where bundles are served from (http://localhost:3030/)

**Source**: `index.mjs:189-231`

### Memory Filesystem

**webpack-dev-middleware serves bundles from memory** (not disk):

- **Fast rebuilds** - No disk I/O overhead
- **Automatic compilation** - Detects file changes via webpack watcher
- **Stats injection** - SSR renderer reads `res.locals.webpack.devMiddleware.stats`

### SSR Integration

**Renderer reads webpack stats from middleware**:

```javascript
// server/renderer/index.mjs:78-99
ReactiumBoot.Hook.runSync('Server.AppScripts', (req, AppScripts, res) => {
    // Webpack assets
    if (process.env.NODE_ENV === 'development') {
        const { stats: context } = res.locals.webpack.devMiddleware;
        const stats = context.toJson();
        _.pluck(stats.namedChunkGroups.main.assets, 'name').forEach(path => {
            AppScripts.register(`webpack-${path}`, {
                path: `/assets/js/${path}`,
                order: Enums.priority.highest,
            });
        });
    } else {
        // Production: read webpack-manifest.json
        const manifest = require(path.resolve(rootPath, 'public/webpack-manifest.json'));
        // ...
    }
});
```

**Critical**: Dev mode reads from `res.locals.webpack.devMiddleware.stats`, production reads from `webpack-manifest.json` on disk.

**Source**: `server/renderer/index.mjs:78-99`

---

## Hot Module Replacement (HMR)

### Configuration

**Enabled by default in development** (disable with `DISABLE_HMR=on`):

```javascript
// index.mjs:210-218
if (process.env.DISABLE_HMR !== 'on') {
    webpackConfig.entry.main = [
        'webpack-hot-middleware/client?reload=true',
        webpackConfig.entry.main,
    ];
    webpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
}
```

**HMR Client Options**:
- `reload=true` - Full page reload if HMR fails
- Connects to `/__webpack_hmr` EventStream endpoint

**Source**: `index.mjs:210-218`

### webpack-hot-middleware Registration

```javascript
// index.mjs:233-245
if (process.env.DISABLE_HMR !== 'on') {
    const { default: wpHotMiddleware } = await import('webpack-hot-middleware');

    ReactiumBoot.Server.Middleware.register('hmr', {
        name: 'hmr',
        use: wpHotMiddleware(compiler, {
            reload: true,  // Fall back to full reload on HMR failure
        }),
        order: Enums.priority.high,
    });
}
```

**Source**: `index.mjs:233-245`

### What HMR Updates

**Without full page reload**:
- ✅ React component changes (via react-refresh)
- ✅ Module changes (JavaScript)
- ✅ CSS-in-JS changes

**Requires full reload**:
- ❌ SCSS file changes (Gulp watcher triggers BrowserSync reload instead)
- ❌ HTML template changes
- ❌ Route configuration changes
- ❌ Manifest changes (triggers server restart)

### HMR Flow

```
1. Developer edits React component
2. Webpack detects change → recompiles module
3. webpack-hot-middleware sends update via EventStream
4. HMR runtime in browser receives update
5. Module is replaced in-place (no page reload)
6. React Fast Refresh re-renders component tree
```

**Source**: `index.mjs:210-245`

---

## BrowserSync Live Reload

### Purpose

**BrowserSync provides live reload for non-HMR assets**:
- CSS file changes (compiled by Gulp)
- HTML file changes
- Static asset changes (images, fonts)
- Full page reload fallback

### Configuration

```javascript
// gulp.tasks.js:132-155
const serve = ({ open } = { open: config.open }) => done => {
    const proxy = `127.0.0.1:${config.port.proxy}`;  // 3030

    axios.get(`http://${proxy}`).then(() => {
        browserSync({
            notify: false,
            timestamps: false,
            port: config.port.browsersync,  // 3000
            ui: { port: config.port.browsersync + 1 },  // 3001
            proxy,  // Proxy to Express server
            open: open,  // Open browser on start
            ghostMode: false,  // Disable synchronized interactions
            startPath: config.dest.startPath,  // '/'
            ws: true,  // WebSocket support
        });

        done();
    });
};
```

**Source**: `gulp.tasks.js:132-155`

### Port Configuration

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | BrowserSync | Browser connects here |
| 3001 | BrowserSync UI | Admin dashboard |
| 3030 | Express Server | Backend proxy target |

**Environment Variables**:
- `BROWSERSYNC_PORT` - Override default 3000
- `PORT` or `APP_PORT` - Override Express port (default 3030)
- `BROWERSYNC_OPEN_BROWSER` - Browser to open (`chrome`, `firefox`, etc.)

**Source**: `gulp.config.js:19-22`, `gulp.tasks.js:79-81,120-123`

### Reload Triggers

**File watchers trigger BrowserSync reload**:

```javascript
// gulp.tasks.js:874-910
const watchFork = done => {
    // ...watchers setup...

    gulpwatch(config.watch.markup, watcher);  // HTML, CSS changes
    gulpwatch(config.watch.assets, watcher);  // Images, fonts, etc.

    done();
};

// watcher function copies files and doesn't explicitly call browserSync.reload
// BrowserSync auto-detects changes in public/ directory
```

**Source**: `gulp.tasks.js:874-910`

### Browser Selection

**Monkey-patched for Linux support**:

```javascript
// gulp.tasks.js:117-130
const _opnWrapperMonkeyPatch = open =>
    function(url, name, bs) {
        const app = op.get(process.env, 'BROWERSYNC_OPEN_BROWSER', 'chrome');
        let browser = open.apps.chrome;
        if (app in open.apps) browser = open.apps[app];

        open(url, { app: { name: browser } }).catch(function() {
            bs.events.emit('browser:error');
        });
    };
```

**Source**: `gulp.tasks.js:117-130`

---

## Gulp File Watchers

### Watch Process Architecture

**Forked child process** for isolation:

```javascript
// gulp.tasks.js:157-189
const watch = (done, restart = false) => {
    let watchProcess = fork(path.resolve(__dirname, './gulp.watch.js'), {
        env: process.env,
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    });
    watchProcess.send({ config, webpackConfig, restart });
    watchProcess.on('message', message => {
        switch (message) {
            case 'build-started': {
                console.log("Starting 'build'...");
                done();
                return;
            }
            case 'restart-watches': {
                console.log('Waiting for server...');
                // Wait for server restart, then restart watch process
                // ...
            }
        }
    });
};
```

**Why forked?**
- **Isolation** - Watch process can be killed/restarted without affecting server
- **IPC Communication** - Parent can restart child on critical file changes
- **Clean Restart** - Kill child process and spawn new one for fresh state

**Source**: `gulp.tasks.js:157-189`

### Watched Files

**Four categories** with different behaviors:

#### 1. Manifest Files → Restart Watch

```javascript
// gulp.tasks.js:884-893
watchers['manifest'] = gulp.watch(
    [config.watch.js, config.src.domainManifest, config.src.manifest],
    gulp.task('mainManifest'),
);
```

**Triggers**: `mainManifest` task regeneration
**Files**: `src/app/**/*`, `src/domains.js`, `src/manifest.js`

**Source**: `gulp.tasks.js:884-893`

#### 2. Style Files → Recompile CSS

```javascript
// gulp.tasks.js:897-900
watchers['styles:compile'] = gulp.watch(
    _.flatten(style),
    gulp.task('styles:compile'),
);
```

**Triggers**: SCSS compilation → CSS output → BrowserSync reload
**Files**: `src/**/*.scss`, `reactium_modules/**/*.scss`

**Source**: `gulp.tasks.js:897-900`

#### 3. Style Partials → Regenerate Imports

```javascript
// gulp.tasks.js:901-904
watchers['styles:partials'] = gulp.watch(
    _.flatten(styleDDD),
    gulp.task('styles:partials'),
);
```

**Triggers**: Regenerate `_reactium-modules.scss` with DDD partials
**Files**: `src/**/_reactium-style*.scss`, `reactium_modules/**/_reactium-style*.scss`

**Source**: `gulp.tasks.js:901-904`

#### 4. Markup/Assets → Copy to Public

```javascript
// gulp.tasks.js:905-906
gulpwatch(config.watch.markup, watcher);  // HTML, CSS
gulpwatch(config.watch.assets, watcher);  // Images, fonts
```

**Triggers**: File copy to `public/` → BrowserSync auto-reload
**Files**:
- Markup: `src/**/*.html`, `src/**/*.css`, `reactium_modules/**/*.css`
- Assets: `src/**/assets/**/*` (excluding style/, js/)

**Source**: `gulp.tasks.js:905-906`, `gulp.config.js:26-53`

### Critical File Changes → Full Restart

**Style entry files trigger full watch restart**:

```javascript
// gulp.watch.js:25-27
gulpwatch(config.watch.restartWatches, () => {
    process.send('restart-watches');
});
```

**Restart files**: `src/**/assets/style/*.scss` (NOT partials `_*.scss`)
**Why?** Entry file changes may require new imports/structure

**Flow**:
1. Entry file changes
2. Child process sends `'restart-watches'` message
3. Parent waits for server to be ready (axios health check)
4. Parent kills child process
5. Parent spawns new child process with `restart: true` flag
6. BrowserSync reconnects

**Source**: `gulp.watch.js:25-27`, `gulp.tasks.js:170-186`

---

## Forked Watch Process

### gulp.watch.js Structure

```javascript
// gulp.watch.js:1-28
const gulp = require('gulp');
const gulpTasks = require('./gulp.tasks');
const gulpwatch = require('@atomic-reactor/gulp-watch');
const task = require('./get-task')(gulp);

process.on('message', ({ config, webpackConfig, restart }) => {
    require('./gulp.bootup');

    const asyncDone = done => {
        process.send('build-started');
        done();
    };

    const asyncBuild = gulp.series(
        task('build'),
        task('watchFork'),
        restart ? task('serve-restart') : task('serve'),
        task('postServe'),
        asyncDone,
    );

    gulp.task('asyncBuild', asyncBuild);
    gulp.task('asyncBuild')();

    gulpwatch(config.watch.restartWatches, () => {
        process.send('restart-watches');
    });
});
```

**Sequence**:
1. Receive config from parent via IPC
2. Run `gulp.bootup` (Hook system initialization)
3. Execute build series:
   - `build` - Full build (or skip if restart)
   - `watchFork` - Setup file watchers
   - `serve` or `serve-restart` - Start BrowserSync
   - `postServe` - Hook for post-serve tasks
   - `asyncDone` - Send `'build-started'` to parent
4. Watch critical files for restart trigger

**Source**: `gulp.watch.js:1-28`

### IPC Messages

| Message | Direction | Meaning |
|---------|-----------|---------|
| `{ config, webpackConfig, restart }` | Parent → Child | Initial configuration |
| `'build-started'` | Child → Parent | Build complete, watch active |
| `'restart-watches'` | Child → Parent | Critical file changed, need restart |

**Source**: `gulp.watch.js:6,10,26`, `gulp.tasks.js:162-186`

---

## Asset Serving in Development

### JavaScript (webpack bundles)

**Served from memory** via webpack-dev-middleware:

```
Browser Request: http://localhost:3000/assets/js/main.js
    ↓ BrowserSync proxy
    → http://localhost:3030/assets/js/main.js
    → webpack-dev-middleware (checks memory filesystem)
    → Returns compiled bundle from memory
```

**No disk writes** - all bundles kept in memory for fast rebuilds.

**Source**: `index.mjs:224-231`

### CSS (compiled SCSS)

**Served from disk** via Express static middleware:

```
Browser Request: http://localhost:3000/assets/style/style.css
    ↓ BrowserSync proxy
    → http://localhost:3030/assets/style/style.css
    → Express static middleware
    → Reads from public/assets/style/style.css (Gulp compiled)
```

**Gulp watch flow**:
1. Developer edits `src/**/*.scss`
2. Gulp watcher detects change
3. SCSS compiled → `public/assets/style/style.css`
4. BrowserSync detects `public/` change
5. BrowserSync reloads browser

**Source**: `index.mjs:89-111`, `gulp.tasks.js:897-900`

### HTML/Static Files

**Copied by Gulp watcher**:

```javascript
// gulp.tasks.js:85-115
const watcher = e => {
    let ePathRelative = path.relative(path.resolve(config.src.app), e.path);
    let fpath = path.resolve(
        rootPath,
        `${config.dest.dist}/${ePathRelative.replace(/^.*?\/assets/, 'assets')}`,
    );

    if (e.event !== 'unlink') {
        fs.createReadStream(e.path)
            .pipe(fs.createWriteStream(fpath))
            .on('error', error => console.error(error));
    }

    console.log(`File ${e.event}: ${displaySrc} -> ${displayDest}`);
};
```

**Flow**:
1. File change detected (add/change/unlink)
2. Watcher copies to `public/` (or deletes)
3. BrowserSync detects `public/` change
4. Browser reloads

**Source**: `gulp.tasks.js:85-115`

---

## Source Maps

### Configuration

**Enabled in development mode**:

```javascript
// webpack.config.js:46-48
if (env === 'development') {
    sdk.devtool = 'source-map';
}
```

**Type**: `'source-map'` - Full source maps with original source code
**Location**: Inline in bundle (memory filesystem, not written to disk)

**Source**: `webpack.config.js:46-48`

### Browser DevTools Integration

**Original file structure visible** in Sources panel:
- `webpack://` root
- `src/app/` - Application source
- `reactium_modules/` - Plugin source
- `node_modules/` - Dependencies

**Set breakpoints in original source** - maps back to transpiled code.

---

## Development Workflow

### Starting Development Server

```bash
npm run local
```

**What happens**:

1. **Manifest Generation** (`gulp domainsManifest`, `gulp mainManifest`)
   - Discovers all DDD artifacts
   - Generates `src/domains.js`, `src/manifest.js`

2. **Gulp Watch Process** (forked child)
   - Runs full build task
   - Sets up file watchers
   - Starts BrowserSync proxy

3. **Express Server** (nodemon)
   - Starts on port 3030
   - Registers webpack-dev-middleware
   - Registers webpack-hot-middleware
   - Serves SSR HTML

4. **Browser Opens** (http://localhost:3000)
   - BrowserSync injects live reload script
   - WebSocket connection established
   - App loads with HMR enabled

**Source**: `gulp.tasks.js:206-229`

### Development Loop

#### Editing React Components

```
1. Edit src/app/components/MyComponent.jsx
2. webpack detects change → recompiles module
3. HMR runtime receives update via /__webpack_hmr
4. Component hot-swaps in browser (no reload)
5. React Fast Refresh re-renders component tree
```

#### Editing SCSS Files

```
1. Edit src/app/components/MyComponent/_style.scss
2. Gulp watcher detects change
3. SCSS compiled → public/assets/style/style.css
4. BrowserSync detects public/ change
5. Browser reloads page (CSS injected)
```

#### Adding New Routes

```
1. Create src/app/components/MyPage/route.js
2. Manifest watcher detects new file
3. Gulp regenerates src/manifest.js
4. webpack recompiles (manifest imported by app)
5. HMR updates routing configuration
6. Navigate to new route (no server restart needed)
```

#### Editing Style Entry Files

```
1. Edit src/assets/style/style.scss (entry file, not partial)
2. Gulp restart watcher detects change
3. Watch process sends 'restart-watches' message
4. Parent kills watch process
5. Parent waits for server ready
6. Parent spawns new watch process
7. BrowserSync reconnects
```

---

## Configuration

### gulp.config.js

```javascript
{
    port: {
        browsersync: 3000,  // BrowserSync port
        proxy: 3030,        // Express server port
    },
    open: true,  // Auto-open browser on start
    watch: {
        js: ['src/app/**/*', 'reactium_modules/**/*'],
        markup: ['src/**/*.html', 'src/**/*.css', 'reactium_modules/**/*.css'],
        style: ['src/**/*.scss', 'reactium_modules/**/*.scss'],
        assets: ['src/**/assets/**/*', '!style', '!js'],
        restartWatches: ['src/**/assets/style/*.scss', '!_*.scss'],
    },
}
```

**Override**: Create `gulp.config.override.js` to customize

**Source**: `gulp.config.js:8-56`

### webpack.config.js

```javascript
module.exports = config => {
    const sdk = new WebpackSDK('reactium', 'reactium-webpack.js', config);

    sdk.mode = env;  // 'development' or 'production'
    sdk.entry = config.entries;  // From gulp.config
    sdk.target = 'web';
    sdk.output = {
        publicPath: '/assets/js/',
        path: path.resolve(rootPath, dest),
        filename: '[name].js',
    };

    if (env === 'development') {
        sdk.devtool = 'source-map';
    }

    // Hook-driven configuration via reactium-webpack.js files
    return sdk.config();
};
```

**Override**: Use Hook system in `reactium-webpack.js` files (preferred) or `webpack.override.js` (legacy)

**Source**: `webpack.config.js:31-132`

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | Development vs production mode |
| `PORT` or `APP_PORT` | `3030` | Express server port |
| `BROWSERSYNC_PORT` | `3000` | BrowserSync proxy port |
| `DISABLE_HMR` | `off` | Disable Hot Module Replacement |
| `BROWERSYNC_OPEN_BROWSER` | `chrome` | Browser to auto-open |
| `MANUAL_DEV_BUILD` | `false` | Skip auto-build on watch start |

**Source**: `gulp.tasks.js:69-81`, `index.mjs:210,233`, `gulp.config.js:19-25`

---

## Best Practices

### 1. Use HMR for Component Development

**Why**: Preserves React state during development
**How**: Default enabled, just edit components

### 2. Create SCSS Partials, Not Entry Files

**Good**: `src/app/components/MyComponent/_style.scss` (partial)
**Bad**: `src/app/components/MyComponent/style.scss` (entry file)

**Why**: Partials don't trigger watch restart, entry files do

### 3. Check BrowserSync vs HMR Behavior

**HMR updates** (no reload):
- React components
- JavaScript modules
- Routing configuration

**BrowserSync reload** (full page):
- CSS changes
- HTML changes
- Static assets

### 4. Use Source Maps for Debugging

**Enable**: Automatic in development
**Access**: Browser DevTools → Sources → webpack://

### 5. Monitor Webpack Compilation

**Terminal output** shows:
- File changes detected
- Compilation time
- Bundle sizes
- Errors/warnings

### 6. Disable HMR if Issues

```bash
DISABLE_HMR=on npm run local
```

**When**: HMR causing infinite loops or stale state

---

## Common Gotchas

### 1. Changes Not Appearing

**Symptom**: Edit file, no update in browser

**Causes**:
- **HMR failed** - Check console for HMR errors, may need full reload
- **File not watched** - Check file path matches watch globs
- **Wrong directory** - Editing outside `src/` or `reactium_modules/`
- **Build error** - Check terminal for webpack compilation errors

**Debug**:
```bash
# Check webpack compilation output
# Look for "Compiled successfully" or error messages
```

### 2. Full Page Reload Instead of HMR

**Symptom**: Page reloads on every change

**Causes**:
- HMR disabled (`DISABLE_HMR=on`)
- HMR client error (check browser console)
- Editing non-JS files (CSS triggers reload)
- Component not using React Fast Refresh patterns

**Fix**:
```bash
# Re-enable HMR
unset DISABLE_HMR
npm run local
```

### 3. Infinite Reload Loop

**Symptom**: Browser constantly reloading

**Causes**:
- File watcher detecting own output (circular write)
- HMR update triggering another file change
- BrowserSync watching wrong directory

**Fix**:
```javascript
// Check watch globs don't include output directories
watch: {
    style: ['src/**/*.scss', '!public/**'],  // Exclude public/
}
```

### 4. webpack-dev-middleware 404 on Assets

**Symptom**: 404 errors for JS bundles

**Causes**:
- `publicPath` mismatch (webpack config vs server URL)
- Middleware not registered before router
- Webpack compilation failed

**Debug**:
```javascript
// Check middleware order
ReactiumBoot.Server.Middleware.list
// webpack middleware should have high priority (before router)
```

**Source**: `index.mjs:224-231`

### 5. BrowserSync Not Proxying Correctly

**Symptom**: BrowserSync shows error page

**Causes**:
- Express server not started (port 3030)
- Port conflict (another process using 3030)
- Health check timeout

**Debug**:
```bash
# Check Express server running
curl http://localhost:3030/elb-healthcheck
# Should return "Up"
```

**Source**: `gulp.tasks.js:140-154`

### 6. SCSS Changes Not Compiling

**Symptom**: CSS doesn't update

**Causes**:
- SCSS syntax error (check terminal)
- File not matching watch glob
- Gulp watcher not running

**Debug**:
```bash
# Check Gulp watcher output
# Look for "File change: src/.../style.scss -> public/..."
```

**Source**: `gulp.tasks.js:897-900`

### 7. Server Restart Loop

**Symptom**: Watch process keeps restarting

**Causes**:
- Entry style file keeps changing
- Nodemon detecting watch process changes
- Server crash on startup

**Debug**:
```bash
# Check restartWatches glob
# Check nodemon configuration
# Check server startup logs
```

**Source**: `gulp.watch.js:25-27`

---

## Debugging

### Check Development Server Status

```bash
# Express server health
curl http://localhost:3030/elb-healthcheck

# BrowserSync proxy
curl http://localhost:3000/

# webpack-dev-middleware assets
curl http://localhost:3030/assets/js/main.js
```

### Inspect webpack Stats

**In browser console**:
```javascript
// Check HMR status
module.hot.status()  // 'idle', 'check', 'apply', etc.

// Check webpack public path
__webpack_public_path__
```

### Monitor File Watchers

**Terminal output**:
```
File change: src/app/components/MyComponent.jsx
File add: src/app/assets/image.png -> public/assets/image.png
[styles:compile change] src/app/components/MyComponent/_style.scss
```

### Check Middleware Order

```javascript
// In reactium-boot.js
ReactiumBoot.Hook.registerSync('Server.Middleware', Middleware => {
    console.log(Object.values(Middleware.list).map(m => m.name));
    // Should see: [..., 'webpack', 'hmr', ..., 'router', 'static', ...]
});
```

### Debug HMR Updates

**Browser console**:
```
[HMR] Checking for updates on the server...
[HMR] Updated modules:
[HMR]  - ./src/app/components/MyComponent.jsx
[HMR] App is up to date.
```

### Check Watch Process

```bash
# Parent process (gulp)
ps aux | grep gulp

# Child process (gulp.watch.js)
ps aux | grep "gulp.watch.js"

# Should see both processes running
```

---

## Summary

**Development server is a multi-layer system**:

1. **webpack-dev-middleware** - Serves JS bundles from memory
2. **webpack-hot-middleware** - Provides HMR updates via EventStream
3. **BrowserSync** - Proxies Express server, provides live reload
4. **Gulp Watchers** - Compile SCSS, copy assets, trigger reloads
5. **Forked Watch Process** - Isolated file watching with IPC restart

**Key insight**: Different file types trigger different update mechanisms:
- **JS/JSX** → HMR (no reload)
- **SCSS** → Gulp compile → BrowserSync reload
- **HTML/Assets** → Gulp copy → BrowserSync reload
- **Style entries** → Watch process restart

**Common confusion**: "Why doesn't my CSS hot-reload?" - CSS goes through Gulp, not HMR. BrowserSync reloads instead of hot-swapping.

**Performance**: Memory filesystem + HMR = sub-second feedback for React changes. SCSS compilation slower but still fast (~1-2s).

---

## Related Documentation

- [SSR Architecture](./SSR_ARCHITECTURE.md) - How SSR integrates with dev middleware
- [Gulp Build System](./GULP_BUILD_SYSTEM.md) - Complete Gulp architecture
- [ReactiumWebpack SDK](./REACTIUMWEBPACK_SDK.md) - webpack configuration system
- [Manifest System](./MANIFEST_SYSTEM.md) - DDD file discovery

---

**Source Files**:
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/index.mjs:189-416`
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.config.js:1-133`
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:1-970`
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.watch.js:1-28`
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.config.js:1-167`
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/server/router.mjs:1-95`
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/server/renderer/index.mjs:78-99`
