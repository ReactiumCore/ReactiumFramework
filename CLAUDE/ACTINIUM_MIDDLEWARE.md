<!-- v1.0.0 -->
# Actinium Middleware Auto-Discovery System

Complete guide to Express middleware registration, discovery, and lifecycle in Actinium.

---

## Architecture Overview

Actinium uses a **globby-based auto-discovery system** to find and register Express middleware files, with **priority-based ordering** and **hook integration** for extensibility.

**Key Components**:
- File discovery via glob patterns (`ENV.GLOB_MIDDLEWARE`)
- Priority-based sequential execution via `ActionSequence`
- Registration API (`Actinium.Middleware.register`, `registerHook`, `replace`, `unregister`)
- Lifecycle integration (fires after `Actinium.Exp.init`, before `Actinium.Plugin.init`)

**Source Reference**: `actinium-core/lib/middleware.js:1-133`, `actinium-core/actinium.js:77-87`

---

## Discovery Pattern (DDD)

### Glob Patterns

**Default patterns** from `actinium-core/globals.js:62-68`:

```javascript
ENV.GLOB_MIDDLEWARE = [
    `${ACTINIUM_DIR}/middleware/**/*.js`,          // Core middleware directory
    `${ACTINIUM_DIR}/**/*middleware.js`,           // Core middleware files anywhere
    `${BASE_DIR}/node_modules/**/actinium/*middleware.js`,  // NPM packages
    `${BASE_DIR}/actinium_modules/**/*middleware.js`,       // Workspace modules
    `${APP_DIR}/**/*middleware.js`,                // Application middleware
]
```

**Discovery process** (`middleware.js:49-57`):

1. Globby scans all patterns
2. Filters files containing `Actinium.Middleware.register` or `Actinium.Middleware.unregister`
3. Dynamic imports all matching files
4. Files execute, calling `Actinium.Middleware.register()` to register themselves
5. Middleware sorted by priority (`order` parameter)
6. Applied to Express app sequentially via `ActionSequence`

**File pattern matching** (`middleware.js:41-47`):

```javascript
const isMiddleware = (fileContent) =>
    matches.reduce((valid, match) => {
        if (valid !== true && String(fileContent).includes(match) === true) {
            valid = true;
        }
        return valid;
    }, false);
```

Only files containing `Actinium.Middleware.register` or `Actinium.Middleware.unregister` are imported.

---

## Registration API

### `Actinium.Middleware.register(id, callback, order)`

Register standard Express middleware.

**Parameters**:
- `id` (String) - Unique identifier for the middleware
- `callback` (Function) - `(app) => Promise<void>` - Receives Express app instance
- `order` (Number) - Priority order (lower = earlier, default: `100`)

**Source**: `middleware.js:103-109`

**Example** - Body parser (`body_parser/middleware.js:1-12`):

```javascript
import express from 'express';

Actinium.Middleware.register(
    'body-parser',
    (app) => {
        app.use(express.json({ limit: ENV.MAX_UPLOAD_SIZE }));
        app.use(express.urlencoded({ extended: true, limit: ENV.MAX_UPLOAD_SIZE }));
        return Promise.resolve();
    },
    -100000,  // Very early (parse request bodies before most middleware)
);
```

**Example** - CORS (`cors/middleware.js:1-11`):

```javascript
import cors from 'cors';

Actinium.Middleware.register(
    'cors',
    app => {
        app.use(cors());
        return Promise.resolve();
    },
    -100000,  // Very early (CORS must be before routes)
);
```

**Example** - Conditional middleware (`morgan/middleware.js:1-10`):

```javascript
import morgan from 'morgan';

Actinium.Middleware.register('morgan', app => {
    if (process.env.NODE_ENV !== 'development') {
        app.use(morgan('combined'));
    }
    return Promise.resolve();
});
```

**Example** - Router-based middleware (`docs/middleware.js:1-19`):

```javascript
import path from 'node:path';
import express from 'express';

Actinium.Middleware.register('docs', app => {
    if (!op.get(ENV, 'NO_DOCS', false)) {
        const router = express.Router();
        const dir = path.join(BASE_DIR, 'docs');
        router.use('/docs', express.static(dir));
        app.use(router);
    }
    return Promise.resolve();
});
```

---

### `Actinium.Middleware.registerHook(id, [path], order)`

Register hook-driven middleware that allows plugins to inject functionality.

**Parameters**:
- `id` (String) - Hook name (will create `{id}-middleware` hook)
- `path` (String, optional) - Express route path to scope middleware
- `order` (Number) - Priority order (default: `100`)

**Source**: `middleware.js:111-126`

**How it works**:

1. Creates Express middleware that instantiates `HookMiddleware` wrapper
2. Runs hook `{id}-middleware` passing the wrapper
3. Hook listeners call `mw.use(callback)` to chain middleware
4. Calls `mw.next()` to execute chain and continue to next Express middleware

**Example** - Plugin assets (`static/middleware.js:5`):

```javascript
// Register hook-driven middleware for plugin assets
Actinium.Middleware.registerHook('plugin-assets', '/api/plugin-assets', -10000);
```

**Example** - Hook listener in plugin (`actinium-fs-adapter/s3-plugin.js:55-62`):

```javascript
Actinium.Hook.register('plugin-assets-middleware', async mw => {
    const router = express.Router();
    router.use(
        `/${PLUGIN.ID}`,
        express.static(path.resolve(__dirname, 'plugin-assets')),
    );
    mw.req.app.use(router);  // Access app via mw.req.app
});
```

**HookMiddleware wrapper** (`middleware.js:15-32`):

```javascript
class HookMiddleware {
    constructor(req, res, next) {
        this.req = req;
        this.res = res;
        this.stack = () => next();  // Initial next
    }

    use(cb) {
        const next = this.stack;
        this.stack = () => cb(this.req, this.res, next);  // Chain
    }

    next() {
        this.stack();  // Execute chain
    }
}
```

---

### `Actinium.Middleware.replace(id, callback)`

Replace previously registered middleware.

**Parameters**:
- `id` (String) - Middleware ID to replace
- `callback` (Function) - `(app) => Promise<void>` - New implementation

**Source**: `middleware.js:128`

**Use cases**:
- Override core middleware behavior
- Inject custom authentication
- Modify Parse Server configuration

**Example** - Replace sample middleware:

```javascript
import express from 'express';

Actinium.Middleware.replace(
    'sample',
    app => {
        const router = express.Router();
        router.get('/sample', (req, res) => {
            res.send('hello bro!');
        });
        app.use(router);
        return Promise.resolve();
    }
);
```

**Execution** (`middleware.js:72-84`):

Replacements are applied after sorting, so replacement happens **regardless of original priority**.

---

### `Actinium.Middleware.unregister(id)`

Remove middleware from execution.

**Parameters**:
- `id` (String) - Middleware ID to remove

**Source**: `middleware.js:130`

**Use case**: Disable core middleware (e.g., disable docs in production).

**Example**:

```javascript
Actinium.Middleware.unregister('docs');
```

**Execution** (`middleware.js:86-96`):

Unregister happens after replacements, so even replaced middleware can be unregistered.

---

## Priority-Based Ordering

Middleware executes in **ascending order** (lowest first).

**Common priority values**:

| Priority   | Use Case                             | Examples                      |
|------------|--------------------------------------|-------------------------------|
| `-100000`  | Critical early middleware            | body-parser, cookie-parser, CORS, cookie-session, static |
| `0`        | Parse Server                         | parse                         |
| `100`      | Default (most middleware)            | morgan, docs                  |

**Sorting** (`middleware.js:59`):

```javascript
const sorted = _.sortBy(mw.sort, 'order');
```

**Best practice**: Use very negative numbers (`-100000`) for middleware that must run before routes/Parse Server.

---

## Lifecycle Integration

Middleware initialization is part of `Actinium.init()` bootstrap sequence.

**Bootstrap order** (`actinium.js:36-114`):

1. `Actinium.Exp.init(app, options)` - Express settings (line 81)
2. **`Actinium.Middleware.init(app)`** - Middleware discovery & registration (line 84)
3. `Actinium.Plugin.init()` - Plugin discovery (line 87)
4. `Actinium.FilesAdapter.init()` - File adapter setup
5. `Actinium.Setting.init()` - Settings initialization
6. `Actinium.Type.init()` - Type system initialization
7. `Actinium.Hook.run('init', app, options)` - Init hook (line 101)

**Middleware init process** (`middleware.js:49-101`):

```javascript
mw.init = async (app) => {
    app = app || Actinium.app;

    // 1. Discover and import middleware files
    await Promise.all(
        globby(ENV.GLOB_MIDDLEWARE)
            .filter((file) => isMiddleware(fs.readFileSync(file, 'utf8')))
            .map(normalizeImportPath)
            .map((file) => import(file)),
    );

    // 2. Sort by priority
    const sorted = _.sortBy(mw.sort, 'order');

    // 3. Build action sequence
    const actions = sorted.reduce((acts, { callback = noop, id }) => {
        acts[id] = () => {
            BOOT(chalk.cyan('  Middleware'), chalk.cyan('→'), chalk.magenta(id));
            callback(app);
        };
        return acts;
    }, {});

    // 4. Apply replacements
    Object.entries(mw.replacements).forEach(([id, callback]) => {
        actions[id] = () => callback(app);
    });

    // 5. Remove unregistered
    _.uniq(mw.unregistered).forEach((id) => op.del(actions, id));

    mw.list = actions;

    // 6. Execute sequentially
    return ActionSequence({ actions });
};
```

---

## Real-World Examples

### Parse Server Middleware

**Most complex middleware** - Conditionally registers Parse Server and Parse Dashboard.

**Source**: `parse/middleware.js:1-123`

```javascript
import { ParseServer } from 'parse-server';
import ParseDashboard from 'parse-dashboard';

Actinium.Middleware.register('parse', async (app) => {
    // Parse Server
    if (ENV.NO_PARSE !== true) {
        const server = new ParseServer(parseConfig('parse-server-config'));
        const routerServer = express.Router();
        routerServer.use(ENV.PARSE_MOUNT, server.app);
        app.use(routerServer);
        await server.start();
    }

    // Parse Dashboard
    if (ENV.PARSE_DASHBOARD === true && !ENV.NO_PARSE) {
        const dashboardConfig = { /* ... */ };
        const dashboardOptions = { /* ... */ };

        Hook.runSync('parse-dashboard-config', dashboardConfig);
        Hook.runSync('parse-dashboard-config-options', dashboardOptions);

        const dashboard = new ParseDashboard(dashboardConfig, dashboardOptions);
        app.use(ENV.PARSE_DASHBOARD_MOUNT, dashboard);
    }

    return Promise.resolve();
});
```

**Key patterns**:
- Async callback (await `server.start()`)
- Hook integration for configuration (`parse-server-config`, `parse-dashboard-config`)
- Conditional registration (ENV flags)
- Router scoping (`ENV.PARSE_MOUNT`, `ENV.PARSE_DASHBOARD_MOUNT`)

---

### Static Assets Middleware

**Pattern**: Hook-driven middleware for plugin asset serving.

**Source**: `static/middleware.js:1-15`

```javascript
import path from 'path';
import fs from 'fs-extra';
import express from 'express';

// Hook-driven middleware (plugins can inject via 'plugin-assets-middleware' hook)
Actinium.Middleware.registerHook('plugin-assets', '/api/plugin-assets', -10000);

// Standard static file serving
Actinium.Middleware.register(
    'static',
    app => {
        fs.ensureDirSync(path.normalize(ENV.STATIC_PATH));
        app.use(ENV.PARSE_MOUNT + '/static', express.static(path.normalize(ENV.STATIC_PATH)));
    },
    -10000,
);
```

---

### Cookie Session Middleware

**Pattern**: Simple wrapper around NPM middleware package.

**Source**: `cookie_session/middleware.js:1-17`

```javascript
import cookieSession from 'cookie-session';

Actinium.Middleware.register(
    'cookie-session',
    app => {
        app.use(
            cookieSession({
                name: '4lqaOOlW1',
                keys: ['Q2FtZXJvbiBSdWxlcw', 'vT3GtyZKbnoNSdWxlcw'],
            }),
        );
        return Promise.resolve();
    },
    -100000,  // Early (session must exist before most middleware)
);
```

---

## Common Patterns

### Pattern 1: Simple NPM Package Wrapper

Wrap third-party middleware packages.

```javascript
import middlewarePackage from 'some-package';

Actinium.Middleware.register(
    'my-middleware',
    app => {
        app.use(middlewarePackage(options));
        return Promise.resolve();
    },
    order,
);
```

**Examples**: `cors`, `cookie-parser`, `cookie-session`, `morgan`

---

### Pattern 2: Router-Based Middleware

Scope middleware to specific routes.

```javascript
import express from 'express';

Actinium.Middleware.register('my-routes', app => {
    const router = express.Router();

    router.get('/my-route', (req, res) => { /* ... */ });
    router.post('/my-route', (req, res) => { /* ... */ });

    app.use('/api', router);  // All routes prefixed with /api

    return Promise.resolve();
});
```

**Examples**: `docs`, `static`, `parse`

---

### Pattern 3: Conditional Middleware

Register middleware based on environment or configuration.

```javascript
Actinium.Middleware.register('conditional', app => {
    if (ENV.SOME_FEATURE === true) {
        app.use(someMiddleware());
    }
    return Promise.resolve();
});
```

**Examples**: `morgan` (only non-dev), `docs` (unless `NO_DOCS`), `parse` (unless `NO_PARSE`)

---

### Pattern 4: Hook-Driven Middleware

Allow plugins to extend middleware via hooks.

```javascript
// In core middleware file
Actinium.Middleware.registerHook('my-feature', '/api/my-feature', -1000);

// In plugin
Actinium.Hook.register('my-feature-middleware', async mw => {
    const router = express.Router();
    router.get('/plugin-route', (req, res) => { /* ... */ });
    mw.req.app.use(router);
});
```

**Examples**: `plugin-assets`

---

### Pattern 5: Async Middleware

Middleware that requires async initialization.

```javascript
Actinium.Middleware.register('async-example', async (app) => {
    const config = await loadConfigFromDatabase();
    app.use(createMiddleware(config));
    return Promise.resolve();
});
```

**Examples**: `parse` (calls `await server.start()`)

---

## Environment Configuration

**Override glob patterns** via `.env`:

```bash
GLOB_MIDDLEWARE='["./src/**/*middleware.js", "./custom/**/*.js"]'
```

**Disable specific middleware**:

```javascript
// In application middleware file
Actinium.Middleware.unregister('docs');
Actinium.Middleware.unregister('morgan');
```

---

## Best Practices

### ✅ DO

1. **Use very negative priority** for critical early middleware (body-parser, CORS, auth)
2. **Return promises** from all callbacks (consistency)
3. **Use routers** to scope routes instead of registering directly on app
4. **Check ENV flags** for conditional middleware
5. **Use hook integration** for extensible middleware points
6. **Register once** - avoid duplicate registration in loops or conditionals

### ❌ DON'T

1. **Don't mutate global state** without cleanup (memory leaks)
2. **Don't register middleware in hooks** - use middleware files (discovery timing)
3. **Don't forget priority** - default `100` might be too late for your needs
4. **Don't use same ID twice** - later registration with same ID doesn't replace (use `replace()`)
5. **Don't block** - avoid long synchronous operations in callback

---

## Common Gotchas

### Gotcha 1: Registration vs Execution Timing

**Issue**: Middleware files are imported during `Actinium.Middleware.init()`, but execution happens sequentially via `ActionSequence`.

**Implication**:
- File-level code runs in parallel (all imports at once)
- Callback functions run in priority order (sequential)

**Example**:

```javascript
console.log('File imported');  // Runs during parallel import phase

Actinium.Middleware.register('example', app => {
    console.log('Middleware executing');  // Runs during sequential execution
    return Promise.resolve();
});
```

---

### Gotcha 2: Middleware Replacement Timing

**Issue**: `replace()` must be called **after** original registration (during discovery) but **before** `Middleware.init()` completes.

**Solution**: Call `replace()` in middleware file that's discovered (not in plugin init hook).

**Example**:

```javascript
// ✅ CORRECT - In middleware file
Actinium.Middleware.replace('parse', app => { /* custom impl */ });

// ❌ WRONG - In plugin init hook (too late)
Actinium.Hook.register('init', async () => {
    Actinium.Middleware.replace('parse', app => { /* ... */ });  // Won't work!
});
```

---

### Gotcha 3: Hook Middleware Access to Express App

**Issue**: Hook-driven middleware receives `HookMiddleware` wrapper, not direct `app` reference.

**Solution**: Access app via `mw.req.app`.

**Example**:

```javascript
Actinium.Hook.register('plugin-assets-middleware', async mw => {
    const router = express.Router();
    router.get('/route', (req, res) => { /* ... */ });
    mw.req.app.use(router);  // ✅ Access app via mw.req.app
});
```

---

### Gotcha 4: Priority Order Confusion

**Issue**: Lower numbers run **earlier**, not later.

**Remember**:
- `-100000` = very early (body-parser, CORS)
- `0` = middle (Parse Server)
- `100` = default (most middleware)
- `1000` = late

---

### Gotcha 5: Unregister Doesn't Prevent Discovery

**Issue**: `unregister()` removes from execution, but file still gets imported.

**Implication**: File-level side effects still happen.

**Example**:

```javascript
// This file will still be imported, even if unregistered elsewhere
console.log('Side effect!');  // ✅ Runs

Actinium.Middleware.register('example', app => {
    console.log('Middleware');  // ❌ Doesn't run (unregistered)
});
```

---

## Debugging

### View Registered Middleware

**During boot** - Look for console output:

```
  Middleware → body-parser
  Middleware → cookie-parser
  Middleware → cors
  Middleware → cookie-session
  ...
```

**Programmatically**:

```javascript
// List all registered middleware
console.log(Object.keys(Actinium.Middleware.list));

// Check if specific middleware registered
console.log('parse' in Actinium.Middleware.list);
```

---

### View Middleware Order

**Inspect sorted array**:

```javascript
// Before ActionSequence execution
console.log(mw.sort.map(({ id, order }) => ({ id, order })));
```

---

### Test Middleware Isolation

**Test individual middleware** without full bootstrap:

```javascript
import express from 'express';
import middleware from './my-middleware.js';

const app = express();
await middleware(app);

// Test routes
app.listen(3000);
```

---

## Integration with Other Systems

### Hook System

**Hooks used in middleware lifecycle**:

1. **`parse-server-config`** - Modify Parse Server configuration (source: `parse/middleware.js:63`)
2. **`parse-dashboard-config`** - Modify Parse Dashboard configuration (line 113)
3. **`parse-dashboard-config-options`** - Modify Parse Dashboard options (line 114)
4. **`{id}-middleware`** - Hook-driven middleware (e.g., `plugin-assets-middleware`)

**Pattern**: Use hooks to allow plugins to modify middleware configuration without replacement.

---

### Plugin System

**Timing**: Middleware init happens **before** plugin init.

**Implication**: Middleware files can't access plugin state (plugins not loaded yet).

**Solution**: Use hook-driven middleware if you need plugin interaction.

---

### Express Settings

**Timing**: `Actinium.Exp.init()` runs **before** middleware init.

**Implication**: Express settings (views, trust proxy, etc.) are available during middleware registration.

---

## File Structure Examples

### Minimal Middleware File

```javascript
// src/middleware/my-middleware.js
import express from 'express';

Actinium.Middleware.register('my-middleware', app => {
    const router = express.Router();
    router.get('/health', (req, res) => res.json({ status: 'ok' }));
    app.use(router);
    return Promise.resolve();
});
```

**Discovery**: Matches `${APP_DIR}/**/*middleware.js` pattern.

---

### Core Middleware Directory Structure

```
actinium-core/middleware/
├── body_parser/middleware.js
├── cookie_parser/middleware.js
├── cookie_session/middleware.js
├── cors/middleware.js
├── docs/middleware.js
├── morgan/middleware.js
├── parse/middleware.js
└── static/middleware.js
```

**Discovery**: Matches `${ACTINIUM_DIR}/middleware/**/*.js` pattern.

---

## Comparison with Reactium

| Aspect              | Actinium Middleware              | Reactium (N/A)                |
|---------------------|----------------------------------|-------------------------------|
| **Purpose**         | Express middleware registration  | No server-side middleware     |
| **Discovery**       | Globby-based DDD                 | N/A                           |
| **Registration**    | `Actinium.Middleware.register()` | N/A                           |
| **Priority**        | Numeric order                    | N/A                           |
| **Lifecycle**       | Before plugin init               | N/A                           |

**Note**: Reactium is frontend-only (React). Actinium is the backend framework with Express middleware.

---

## Summary

**Actinium Middleware Auto-Discovery** provides:

✅ Globby-based file discovery (`*middleware.js` pattern)
✅ Priority-based sequential execution
✅ Registration API (register, registerHook, replace, unregister)
✅ Hook integration for extensibility
✅ Early lifecycle integration (before plugins)
✅ Environment-based configuration

**Key insight**: Middleware discovery happens in parallel (all files imported at once), but **execution is sequential** (priority-ordered via ActionSequence). This allows middleware to depend on earlier middleware (e.g., routes depend on body-parser).

**For developers**: Use middleware files for Express route registration, third-party middleware wrapping, and server-side request/response pipeline customization.
