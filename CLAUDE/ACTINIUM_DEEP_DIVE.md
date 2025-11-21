# Actinium Framework - Deep Source Code Analysis

**Generated**: 2025-11-20
**Based on**: actinium-core v5.1.18
**Source**: `/home/john/reactium-framework/api/actinium_modules/@atomic-reactor/actinium-core/`

This document provides a comprehensive analysis of the Actinium framework based on actual source code examination, not documentation or assumptions.

---

## Table of Contents

1. [Critical Architecture Findings](#critical-architecture-findings)
2. [Global Object Construction](#global-object-construction)
3. [Initialization Sequence (Verified)](#initialization-sequence-verified)
4. [Plugin System Internals](#plugin-system-internals)
5. [Hook System Implementation](#hook-system-implementation)
6. [Cloud Function Gateway](#cloud-function-gateway)
7. [Middleware Registration](#middleware-registration)
8. [Environment Configuration](#environment-configuration)
9. [Parse Object Extensions](#parse-object-extensions)
10. [Priority System](#priority-system)
11. [File Organization Patterns](#file-organization-patterns)
12. [Advanced Patterns & Implementation Details](#advanced-patterns--implementation-details)

---

## Critical Architecture Findings

### 1. Actinium Extends Parse, Not Express

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/actinium.js` (line 34)

```javascript
Actinium = { ...Parse };
```

**Critical Finding**: Actinium spreads all Parse SDK methods into the global Actinium object. This means:
- All `Parse.*` methods are available as `Actinium.*`
- `Actinium.Query`, `Actinium.Object`, `Actinium.User`, etc. are Parse classes
- Parse Server is the data layer, not a separate service

### 2. Global-First Design Pattern

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/globals.js`

The framework creates multiple global objects:

```javascript
global.Actinium = {};
global.ACTINIUM_CONFIG = ACTINIUM_CONFIG;
global.CORE_DIR = __dirname;
global.BASE_DIR = path.normalize(path.resolve(path.join(__dirname, '../../..')));
global.SRC_DIR = path.normalize(path.resolve(path.join(BASE_DIR, 'src')));
global.APP_DIR = path.normalize(path.resolve(path.join(SRC_DIR, 'app')));
global.ENV = baseENV.environment;
global.PORT = ENV.PORT;
global.ACTINIUM_DIR = __dirname;
global.CLOUD_FUNCTIONS = [];
global.FEATURES = new Registry('Features');
```

**Key Globals Available Everywhere**:
- `Actinium` - The main framework object
- `ENV` - Environment configuration
- `PORT` - Server port
- `BASE_DIR`, `SRC_DIR`, `APP_DIR`, `CORE_DIR` - Path constants
- `CLOUD_FUNCTIONS` - Registry of Cloud Functions
- Logging functions: `BOOT`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `LOG`

### 3. ES Module Import Path Normalization

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/lib/globby-patch.js`

Actinium has custom logic for normalizing file paths for ES module imports:

```javascript
export const normalizeImportPath = (filePath) => {
    // Converts absolute paths to file:// URLs for ES module imports
    // Handles Windows vs. Unix path differences
};
```

This is why plugin discovery works across different operating systems.

---

## Global Object Construction

### Complete Actinium Object Structure

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/actinium.js` (lines 36-68)

```javascript
Actinium = { ...Parse };  // Start with all Parse SDK methods

// Core properties
Actinium.ready = false;
Actinium.started = false;
Actinium.server = null;
Actinium.version = '5.1.18';
Actinium.app = express();

// Core modules
Actinium.Utils = ActiniumUtils;
Actinium.Hook = ActiniumHook;
Actinium.Object = ActiniumObject;      // Extended Parse.Object
Actinium.User = ActiniumUser;
Actinium.Harness = ActiniumHarness;    // Test harness
Actinium.Enums = ActiniumEnums;
Actinium.Exp = ActiniumExp;            // Express settings
Actinium.Cache = ActiniumCache;
Actinium.FilesAdapter = ActiniumFileAdapter;
Actinium.File = ActiniumFile;
Actinium.Setting = ActiniumSetting;
Actinium.Roles = ActiniumRoles;
Actinium.Cloud = ActiniumCloud;
Actinium.Plugin = ActiniumPlugin;
Actinium.Warnings = ActiniumWarnings;
Actinium.Middleware = ActiniumMiddleware;
Actinium.Pulse = ActiniumPulse;        // Pub/sub event system
Actinium.Collection = ActiniumCollection;
Actinium.Type = ActiniumType;
Actinium.Capability = ActiniumCapabilities();

// Cross-alias functions (convenience methods)
Actinium.User.isRole = Actinium.Roles.User.is;
Actinium.User.can = Actinium.Capability.User.can;
Actinium.User.capabilities = Actinium.Capability.User.get;
Actinium.Roles.can = Actinium.Capability.Role.can;
Actinium.Roles.capabilities = Actinium.Capability.Role.get;
```

---

## Initialization Sequence (Verified)

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/actinium.js` (lines 36-114)

### Phase 1: `Actinium.init(options)`

```javascript
Actinium.init = async (options) => {
    Actinium.ready = false;
    Actinium.started = false;

    // 1. Create Express app
    const app = Actinium.app || express();
    Actinium.app = app;

    // 2. Initialize Express settings
    Actinium.Exp.init(app, options);

    // 3. Initialize Middlewares (auto-discover and register)
    await Actinium.Middleware.init(app);

    // 4. Initialize Plugins (auto-discover and register)
    await Actinium.Plugin.init();

    // 5. Initialize FileAdapter
    await Actinium.FilesAdapter.init();

    // 6. Initialize Settings
    Actinium.Setting.init();

    // 7. Initialize Type system
    Actinium.Type.init();

    Actinium.ready = true;

    // 8. Run init hook
    await Actinium.Hook.run('init', app, options);

    // 9. Run live-query-classnames hook
    await Actinium.Hook.run(
        'live-query-classnames',
        op.get(ENV.LIVE_QUERY_SETTINGS, 'classNames', [])
    );

    return Promise.resolve(Actinium.app);
};
```

### Phase 2: `Actinium.start(options)`

**Source**: Lines 116-275

```javascript
Actinium.start = (options) =>
    new Promise(async (resolve, reject) => {
        // Skip if already started
        if (Actinium.started === true && Actinium.server !== null) {
            resolve(Actinium.server);
            return;
        }

        // Ensure initialized
        if (Actinium.ready !== true) {
            await Actinium.init(options);
        }

        // Create HTTP or HTTPS server
        Actinium.server = ENV.TLS_MODE
            ? https.createServer({
                cert: ENV.APP_TLS_CERT,
                key: ENV.APP_TLS_KEY,
            }, Actinium.app)
            : http.createServer(Actinium.app);

        // Start listening
        Actinium.server.listen(PORT, async (err) => {
            if (err) reject(err);

            // Start Live Query Server (if enabled)
            if (!ENV.NO_PARSE && ENV.LIVE_QUERY_SERVER) {
                await ParseServer.createLiveQueryServer(Actinium.server);
            }

            Actinium.started = true;

            // Load Settings from database
            await Actinium.Setting.load();

            // Load Plugins from database
            await Actinium.Plugin.load();

            // Load File Adapter
            Actinium.FilesAdapter.getProxy().bootMessage();

            // Load User Roles
            await Actinium.Roles.load();

            // Load Capabilities
            await Actinium.Capability.load(false, 'boot');

            // Runtime schema initialization
            await Actinium.Hook.run('schema', {}, {});

            // Load Collection Schemas
            await Actinium.Collection.load();

            // Run start-up hook
            await Actinium.Hook.run('start');

            // Log cloud function info
            Actinium.Cloud.info();

            // Run tests in local development
            await Actinium.Harness.run();

            // Run warnings hook
            await Actinium.Warnings.run();

            Actinium.running = true;
            await Actinium.Hook.run('running');

            resolve(Actinium.server);
        });
    });
```

**Key Hook Execution Order**:
1. `init` - After initialization, before server starts
2. `live-query-classnames` - Configure live query classes
3. `schema` - Runtime schema initialization
4. `start` - Server starting
5. `running` - Server fully operational

---

## Plugin System Internals

### Plugin Discovery and Loading

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/lib/plugable.js`

#### Discovery Glob Patterns (from globals.js lines 54-61)

```javascript
const defaults = {
    glob: {
        plugins: [
            `${ACTINIUM_DIR}/plugin/**/*plugin.js`,
            `${BASE_DIR}/node_modules/**/actinium/*plugin.js`,
            `${BASE_DIR}/actinium_modules/**/*plugin.js`,
            `${APP_DIR}/**/*plugin.js`,
            `!${ACTINIUM_DIR}/plugin/**/assets/**/*.js`,
            `!${ACTINIUM_DIR}/plugin/**/plugin-assets/**/*.js`,
        ],
    }
};
```

**Search Order**:
1. Core plugins in `actinium-core/plugin/`
2. Node modules with actinium plugins
3. actinium_modules directory
4. Application plugins in `src/app/`

#### Plugin Registration Implementation

**Source**: `lib/plugable.js` (lines 116-151)

```javascript
Plugable.register = (plugin, active = false) => {
    const coredir = path.normalize(`${BASE_DIR}/.core`);
    const callerFileName = Actinium.Utils.getCallerFile();
    const ID = op.get(plugin, 'ID');
    plugin['active'] = active;

    // Validate plugin ID
    if (!ID || blacklist.includes(ID)) {
        return;
    }

    const meta = op.get(plugin, 'meta', {}) || {};
    const version = op.get(plugin, 'version', {}) || {};

    // Core plugins auto-detection
    if (
        callerFileName &&
        !/^[.]{2}/.test(path.relative(coredir, callerFileName))
    ) {
        op.set(meta, 'builtIn', true);
        if (!op.get(meta, 'group')) op.set(meta, 'group', 'core');

        // core plugin are always valid for this version of actinium
        op.set(version, 'actinium', `>=${ACTINIUM_CONFIG.version}`);

        // core plugins that have no version information follow actinium core versioning
        const pluginVersion = op.get(version, 'plugin');
        if (!pluginVersion || !semver.valid(pluginVersion))
            op.set(version, 'plugin', ACTINIUM_CONFIG.version);
    }

    op.set(plugin, 'meta', meta);
    op.set(plugin, 'version', version);

    if (_isValid(plugin)) Actinium.Cache.set(`plugins.${ID}`, plugin);
};
```

**Key Implementation Details**:
- Uses stack trace to detect if plugin is in core directory
- Core plugins automatically marked as `builtIn: true`
- Core plugins inherit framework version if no version specified
- Plugins stored in cache with key `plugins.{ID}`

#### Plugin Validation

**Source**: `lib/plugable.js` (lines 26-52)

```javascript
const _isValid = (plugin = {}, strict = false) => {
    const { ID } = plugin;
    if (!ID || blacklist.includes(ID)) {
        return false;
    }

    // Validate if the plugin exists
    if (!plugin) {
        return false;
    }

    // Validate Actinium version
    const actiniumVer = op.get(ACTINIUM_CONFIG, 'version');
    const versionRange = op.get(plugin, 'version.actinium', `>=${actiniumVer}`);
    if (versionRange && semverValidRange(versionRange)) {
        if (!semver.satisfies(actiniumVer, versionRange)) {
            return false;
        }
    }

    // Validate if the plugin is active
    if (strict === true && Plugable.isActive(ID) !== true) {
        return false;
    }

    return true;
};
```

**Validation Rules**:
1. Must have unique ID not in blacklist
2. Must satisfy semver version range for Actinium
3. If strict mode, must be active

#### Plugin Gating (Cloud Function Protection)

**Source**: `lib/plugable.js` (lines 366-372)

```javascript
Plugable.gate = async ({ req, ID, name, callback }) => {
    if (Plugable.isValid(ID, true) !== true) {
        return Promise.reject(`Plugin: ${ID} is not active.`);
    }

    return callback(req);
};
```

**This is critical**: Every Cloud Function defined with `Actinium.Cloud.define()` is wrapped with this gate. If the plugin is inactive, the function throws an error.

---

## Hook System Implementation

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/lib/hook.js`

### Internal Data Structure

```javascript
const Hook = {
    action: {},      // Stores all registered hooks
    actionIds: {},   // Maps hook IDs to action paths
};
```

### Hook Registration

**Source**: Lines 30-45

```javascript
Hook._register = (type = 'async') => (
    name,
    callback,
    order = Enums.priority.neutral,  // Default: 0
    id,
) => {
    id = id || uuid();
    const path = `${type}.${name}.${id}`;
    op.set(Hook.actionIds, [id], path);
    op.set(Hook.action, `${type}.${name}.${id}`, { id, order, callback });

    return id;
};

Hook.register = Hook._register('async');
Hook.registerSync = Hook._register('sync');
```

**Storage Structure**:
```javascript
Hook.action = {
    async: {
        'hook-name': {
            'uuid-1': { id: 'uuid-1', order: -1000, callback: fn },
            'uuid-2': { id: 'uuid-2', order: 0, callback: fn },
            'uuid-3': { id: 'uuid-3', order: 1000, callback: fn },
        }
    },
    sync: {
        'sync-hook': {
            'uuid-4': { id: 'uuid-4', order: 0, callback: fn },
        }
    }
}
```

### Hook Execution

**Source**: Lines 50-108

```javascript
Hook._actions = (name, type = 'async', params) =>
    _.sortBy(
        Object.values(op.get(Hook.action, `${type}.${name}`, {})),
        'order',  // Sort by order (priority)
    ).reduce((acts, action) => {
        const { callback = noop[type], id } = action;
        acts[id] = ({ context }) => callback(...params, context);
        return acts;
    }, {});

Hook.run = async (name, ...params) => {
    const context = { hook: name, params };
    try {
        await ActionSequence({
            actions: Hook._actions(name, 'async', params),
            context,
        });

        return context;
    } catch (errors) {
        Object.entries(errors).forEach(([id, error]) => {
            ERROR(chalk.magenta(`Error in action.${name}[${id}]`));
            if (op.get(error, 'error') instanceof assert.AssertionError) {
                const assertion = error.error;
                DEBUG(chalk.cyan('Assertion: ' + assertion.message));
                DEBUG(chalk.cyan('operator: ' + JSON.stringify(assertion.operator, null, 2)));
                DEBUG(chalk.green('expected: ' + JSON.stringify(assertion.expected, null, 2)));
                DEBUG(chalk.red('actual: ' + JSON.stringify(assertion.actual, null, 2)));
            } else {
                ERROR(error);
            }
        });
    }
};

Hook.runSync = (name, ...params) => {
    const context = { hook: name, params };
    Object.values(Hook._actions(name, 'sync', params)).forEach(callback =>
        callback({ context }),
    );

    return context;
};
```

**Key Implementation Details**:
1. Hooks sorted by `order` (lower = earlier execution)
2. All hooks receive `(...params, context)` where context is `{ hook, params }`
3. Uses `action-sequence` library for async orchestration
4. Errors are caught and logged, but don't crash the server
5. Sync hooks don't catch errors (fail immediately)

### Hook Unregistration

**Source**: Lines 22-28

```javascript
Hook.unregister = id => {
    const path = op.get(Hook.actionIds, [id]);
    if (path) {
        op.del(Hook.action, path);
        op.del(Hook.actionIds, [id]);
    }
};
```

### Hook Flushing (Clear All)

**Source**: Lines 19-20

```javascript
Hook.flush = (name, type = 'async') =>
    op.set(Hook.action, `${type}.${name}`, {});
```

---

## Cloud Function Gateway

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/lib/cloud.js`

### Cloud Function Discovery

**Source**: Lines 20-37

```javascript
Cloud.init = async () => {
    const output = [];
    const files = globby(ENV.GLOB_CLOUD);

    // Load cloud functions
    global.CLOUD_FUNCTIONS = await Promise.all(
        files.map((item) => {
            const p = normalizeImportPath(item);
            const name = String(path.basename(item)).split('.').shift();

            output.push({ name, path: p });

            return import(p);
        }),
    );

    return output;
};
```

**Discovery Patterns** (from globals.js):
```javascript
glob: {
    cloud: [
        `${ACTINIUM_DIR}/cloud/**/*.js`,
        `${BASE_DIR}/node_modules/**/actinium/*cloud.js`,
        `${BASE_DIR}/actinium_modules/**/*cloud.js`,
        `${APP_DIR}/cloud/**/*.js`,      // deprecated 3.1.8
        `${APP_DIR}/**/*cloud.js`,       // since 3.1.8
    ],
}
```

### Cloud Function Definition with Plugin Gating

**Source**: Lines 39-52

```javascript
Cloud.define = (plugin, name, callback) => {
    if (!plugin || !name || !callback) {
        throw new Error(
            `Cloud.define(plugin, name, callback) all parameters required: ${
                (!!plugin, !!name, !!callback)
            }`,
        );
    }

    Parse.Cloud.define(name, (req) =>
        Actinium.Plugin.gate({ req, ID: plugin, name, callback })
    );
    CLOUD_FUNCTIONS.push({ name });
};
```

**Critical Flow**:
1. `Actinium.Cloud.define(pluginID, functionName, callback)` called
2. Wraps `Parse.Cloud.define()` with plugin gate
3. When function is called, checks if plugin is active
4. If active, executes callback; if not, rejects with error
5. Adds to global `CLOUD_FUNCTIONS` array for logging

### Example Cloud Function from Core

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/cloud/actinium-plugin.js` (lines 56-107)

```javascript
Parse.Cloud.define('plugins', async (req) => {
    if (!CloudHasCapabilities(req, ['Plugin.retrieve']))
        throw new Error('Permission denied.');

    let pages = 0, total = 0;
    let { page = 0, limit = 1000 } = req.params;

    page = Math.max(page, 0);
    limit = Math.min(limit, 1000);

    const skip = page > 0 ? page * limit - limit : 0;
    const query = new Parse.Query(COLLECTION);
    const options = CloudCapOptions(req, ['Plugin.retrieve']);

    // Pagination
    total = await query.count(options);

    // Find
    query.skip(skip);
    query.limit(limit);

    let plugins = [];
    let results = await query.find(options);
    while (results.length > 0) {
        plugins = plugins.concat(results);

        if (page < 1) {
            query.skip(plugins.length);
            results = await query.find(options);
        } else {
            break;
        }
    }
    plugins = mapPlugins(plugins);

    pages = Math.ceil(total / limit);

    const list = {
        timestamp: Date.now(),
        limit,
        page,
        pages,
        total,
        plugins,
    };

    await Actinium.Hook.run('plugins-list', list);

    return list;
});
```

**Note**: This uses `Parse.Cloud.define()` directly because it's a core function that manages plugins themselves, so it shouldn't be gated by a plugin.

---

## Middleware Registration

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/lib/middleware.js`

### Middleware Detection

**Source**: Lines 8-47

```javascript
const matches = [
    'Actinium.Middleware.register',
    'Actinium.Middleware.unregister',
];

const isMiddleware = (fileContent) =>
    matches.reduce((valid, match) => {
        if (valid !== true && String(fileContent).includes(match) === true) {
            valid = true;
        }
        return valid;
    }, false);
```

**Detection Method**: Reads file content and checks if it contains middleware registration code. This is a string-based heuristic.

### Middleware Initialization

**Source**: Lines 49-101

```javascript
mw.init = async (app) => {
    app = app || Actinium.app;

    // 1. Auto-discover middleware files
    await Promise.all(
        globby(ENV.GLOB_MIDDLEWARE)
            .filter((file) => isMiddleware(fs.readFileSync(file, 'utf8')))
            .map(normalizeImportPath)
            .map((file) => import(file)),
    );

    // 2. Sort by order
    const sorted = _.sortBy(mw.sort, 'order');

    // 3. Build action sequence
    const actions = sorted.reduce((acts, { callback = noop, id }) => {
        acts[id] = () => {
            BOOT(
                chalk.cyan('  Middleware'),
                chalk.cyan('→'),
                chalk.magenta(id),
            );
            callback(app);
        };
        return acts;
    }, {});

    // 4. Replace middleware
    Object.entries(mw.replacements).forEach(([id, callback]) => {
        actions[id] = () => callback(app);
    });

    if (Object.keys(mw.replacements).length > 0) {
        BOOT(chalk.cyan('  Middleware'), chalk.cyan('→'), chalk.magenta('Replaced'));
        BOOT(' ', Object.keys(mw.replacements).join(', '));
    }

    // 5. Unregister middleware
    _.uniq(mw.unregistered).forEach((id) => op.del(actions, id));

    if (mw.unregistered.length > 0) {
        BOOT(chalk.cyan('  Middleware'), chalk.cyan('→'), chalk.magenta('Unregistered'));
        BOOT(' ', mw.unregistered.join(', '));
    }

    mw.list = actions;

    // 6. Execute all middleware registrations
    return ActionSequence({ actions });
};
```

### Middleware Registration API

**Source**: Lines 103-130

```javascript
mw.register = (id, callback, order = 100) => {
    if (!Array.isArray(op.get(mw, 'sort'))) {
        mw.sort = [];
    }

    mw.sort.push({ id, callback, order });
};

mw.registerHook = (...params) => {
    let [id, path, order = 100] = params;
    if (typeof path === 'number') order = path;
    if (typeof order !== 'number') order = 100;

    let args = [
        async (req, res, next) => {
            const mw = new HookMiddleware(req, res, next);
            await Actinium.Hook.run(`${id}-middleware`, mw);
            mw.next();
        },
    ];

    if (typeof path === 'string') args = [path, ...args];
    mw.register(id, (app) => app.use(...args), order);
};

mw.replace = (id, callback) => op.set(mw.replacements, id, callback);

mw.unregister = (id) => mw.unregistered.push(id);
```

### Example: CORS Middleware

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/middleware/cors/middleware.js`

```javascript
import cors from 'cors';

Actinium.Middleware.register(
    'cors',
    app => {
        app.use(cors());
        return Promise.resolve();
    },
    -100000,  // Very high priority (runs early)
);
```

### Example: Static File Middleware with Hook Integration

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/middleware/static/middleware.js`

```javascript
import path from 'path';
import fs from 'fs-extra';
import express from 'express';

// Register hook-based middleware for plugin assets
Actinium.Middleware.registerHook('plugin-assets', '/api/plugin-assets', -10000);

// Register static file serving
Actinium.Middleware.register(
    'static',
    app => {
        fs.ensureDirSync(path.normalize(ENV.STATIC_PATH));
        app.use(
            ENV.PARSE_MOUNT + '/static',
            express.static(path.normalize(ENV.STATIC_PATH))
        );
    },
    -10000,
);
```

**registerHook Pattern**: Creates Express middleware that runs a hook, allowing plugins to inject behavior into HTTP request handling.

---

## Environment Configuration

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/boot.js`

### Environment File Resolution

**Source**: Lines 174-187

```javascript
function environmentFile() {
    const envFile = process.env.ACTINIUM_ENV_FILE;
    const envId = process.env.ACTINIUM_ENV_ID;

    if (envFile) {
        return envFile;
    } else if (envId) {
        validateReactorEnvId(envId);
        return path.resolve(path.join(SRC_DIR, `env.${envId}.json`));
    } else {
        return path.resolve(path.join(SRC_DIR, 'env.json'));
    }
}
```

**Priority Order**:
1. `ACTINIUM_ENV_FILE` - Explicit file path
2. `ACTINIUM_ENV_ID` - Environment ID (e.g., `dev`, `prod`) → `src/env.{id}.json`
3. Default: `src/env.json`

### Environment Loading

**Source**: Lines 122-154

```javascript
const boot = {
    get environment() {
        const file = environmentFile();
        let env = {
            ENV_WARNING: false,
        };

        try {
            const ENV_WARNING = envDev();

            env = {
                ...env,
                ...JSON.parse(fs.readFileSync(file, 'utf8')),
                ENV_WARNING,
            };

            const PORT = ensurePortEnvironment(env);
            const SERVER_URI = getServerURI(env, PORT);
            const PUBLIC_SERVER_URI = getPublicServerURI(env, SERVER_URI);

            return {
                ...env,
                ...process.env,  // process.env overrides file
                PORT,
                SERVER_URI,
                PUBLIC_SERVER_URI,
            };
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    },
};
```

**Key Points**:
1. Reads JSON file from `src/env.json` (or variant)
2. Merges with `process.env` (process.env wins)
3. Calculates `PORT`, `SERVER_URI`, `PUBLIC_SERVER_URI`
4. Exits on error

### Global Logging Functions

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/globals.js` (lines 150-172)

```javascript
const LOG_THRESHOLD = op.get(Enums, ['logLevels', LOG_LEVEL], 0);
for (const [LEVEL, THRESHOLD] of Object.entries(Enums.logLevels)) {
    global[LEVEL] = (...args) => {
        if (!ENV.LOG || THRESHOLD > LOG_THRESHOLD) {
            return;
        }

        const _W = THRESHOLD <= Enums.logLevels.WARN;
        const _E = THRESHOLD <= Enums.logLevels.ERROR;
        let color = _W ? chalk.yellow.bold : chalk.cyan;
        color = _E ? chalk.red.bold : color;

        const time = `[${chalk.magenta(moment().format('HH:mm:ss'))}]`;
        let name = `${color(String(ENV.APP_NAME))}`;
        name = _E ? `%${name}%` : _W ? `!${name}!` : `[${name}]`;

        let logMethod = op.get(console, LEVEL, console.log);
        logMethod = typeof logMethod === 'function' ? logMethod : console.log;
        logMethod(time, name, ...args);
    };
}

global.LOG = global.BOOT;
```

**Available Global Log Functions**:
- `DEBUG(...args)` - Debug level (threshold: 1000)
- `INFO(...args)` - Info level (threshold: 500)
- `BOOT(...args)` - Boot level (threshold: 0)
- `WARN(...args)` - Warning level (threshold: -500)
- `ERROR(...args)` - Error level (threshold: -1000)
- `LOG(...args)` - Alias for BOOT

**Log Level Control**: Set `ENV.LOG_LEVEL` to control which logs appear.

---

## Parse Object Extensions

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/lib/ParseObject/index.js`

### Custom Save Method with Hooks

```javascript
class ParseObject extends Parse.Object {
    async save(arg1, arg2, arg3, context) {
        context = context || {};

        // ... argument parsing ...

        const hooksToRun = {
            before: ['beforeSave', `beforeSave_${this.className}`],
            after: ['afterSave', `afterSave_${this.className}`],
        };

        // Special handling for Content_ classes
        if (String(this.className).toLowerCase().startsWith('content_')) {
            hooksToRun.before.push('beforeSave_content');
            hooksToRun.after.push('afterSave_content');
        }

        const req = { object: this, options: saveOptions, context };

        // Run before hooks
        for (let hook of hooksToRun.before) {
            await Actinium.Hook.run(hook, req, arg1, arg2, arg3);
        }

        // Handle cascade save
        const unsaved =
            options.cascadeSave !== false ? unsavedChildren(this) : null;
        await controller.save(unsaved, saveOptions);

        // Actual save
        const result = await controller.save(this, saveOptions);

        // Run after hooks
        for (let hook of hooksToRun.after) {
            await Actinium.Hook.run(hook, req, arg1, arg2, arg3);
        }

        return result;
    }
}
```

**Hook Execution for Save**:
1. `beforeSave` - Generic before save
2. `beforeSave_{ClassName}` - Class-specific before save
3. `beforeSave_content` - If class starts with `Content_`
4. Actual save operation
5. `afterSave` - Generic after save
6. `afterSave_{ClassName}` - Class-specific after save
7. `afterSave_content` - If class starts with `Content_`

### Custom Destroy Method with Hooks

```javascript
async destroy(options, context) {
    // ... setup ...

    const hooksToRun = {
        before: ['beforeDelete', `beforeDelete_${this.className}`],
        after: ['afterDelete', `afterDelete_${this.className}`],
    };

    if (String(this.className).toLowerCase().startsWith('content_')) {
        hooksToRun.before.push('beforeDelete_content');
        hooksToRun.after.push('afterDelete_content');
    }

    const req = { object: this, options: destroyOptions, context };

    // Run before hooks
    for (let hook of hooksToRun.before) {
        await Actinium.Hook.run(hook, req);
    }

    // Actual destroy
    const result = await controller.destroy(this, destroyOptions);

    // Run after hooks
    for (let hook of hooksToRun.after) {
        await Actinium.Hook.run(hook, req);
    }

    return result;
}
```

**Critical Insight**: Actinium replaces Parse.Object with an extended version that automatically fires hooks for all save/delete operations.

---

## Priority System

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/lib/enums.js`

```javascript
const Enums = {
    priority: {
        highest: -1000,
        high: -500,
        neutral: 0,
        low: 500,
        lowest: 1000,
    },
    weight: {
        highest: 1000,
        high: 500,
        neutral: 0,
        low: -500,
        lowest: -1000,
    },
    logLevels: {
        DEBUG: 1000,
        INFO: 500,
        BOOT: 0,
        WARN: -500,
        ERROR: -1000,
    },
};
```

**Priority Rules**:
- **Lower numbers execute earlier**
- Priority determines hook execution order
- Middleware with high priority (negative numbers) runs first
- Use `Actinium.Enums.priority.highest` for critical early hooks
- Use `Actinium.Enums.priority.lowest` for cleanup hooks

**Common Patterns**:
```javascript
// Very early (before most things)
Actinium.Middleware.register('cors', callback, -100000);

// Core plugins
Actinium.Hook.register('init', callback, Actinium.Enums.priority.highest);

// Normal application logic
Actinium.Hook.register('my-hook', callback, Actinium.Enums.priority.neutral);

// Cleanup or post-processing
Actinium.Hook.register('cleanup', callback, Actinium.Enums.priority.lowest);
```

---

## File Organization Patterns

### Verified Glob Patterns

**From**: `/api/actinium_modules/@atomic-reactor/actinium-core/globals.js` (lines 45-69)

```javascript
const defaults = {
    glob: {
        cloud: [
            `${ACTINIUM_DIR}/cloud/**/*.js`,
            `${BASE_DIR}/node_modules/**/actinium/*cloud.js`,
            `${BASE_DIR}/actinium_modules/**/*cloud.js`,
            `${APP_DIR}/cloud/**/*.js`,      // deprecated 3.1.8
            `${APP_DIR}/**/*cloud.js`,       // since 3.1.8
        ],
        plugins: [
            `${ACTINIUM_DIR}/plugin/**/*plugin.js`,
            `${BASE_DIR}/node_modules/**/actinium/*plugin.js`,
            `${BASE_DIR}/actinium_modules/**/*plugin.js`,
            `${APP_DIR}/**/*plugin.js`,
            `!${ACTINIUM_DIR}/plugin/**/assets/**/*.js`,
            `!${ACTINIUM_DIR}/plugin/**/plugin-assets/**/*.js`,
        ],
        middleware: [
            `${ACTINIUM_DIR}/middleware/**/*.js`,
            `${ACTINIUM_DIR}/**/*middleware.js`,
            `${BASE_DIR}/node_modules/**/actinium/*middleware.js`,
            `${BASE_DIR}/actinium_modules/**/*middleware.js`,
            `${APP_DIR}/**/*middleware.js`,
        ],
    },
};
```

### Recommended Plugin Structure

Based on actual core plugins:

```
src/app/my-plugin/
├── info.js                # Plugin metadata (required)
├── plugin.js              # Plugin registration (required)
├── sdk.js                 # Plugin SDK methods (optional)
├── middleware.js          # Express middleware (optional)
├── cloud.js               # Cloud functions (optional, deprecated pattern)
├── service.js             # Business logic service (optional)
└── plugin-assets/         # Frontend assets (optional)
    ├── logo.svg
    ├── script.js
    └── style.css
```

**Modern Pattern**: Define Cloud Functions in `plugin.js` using `Actinium.Cloud.define()`, not in separate `cloud.js` files.

---

## Advanced Patterns & Implementation Details

### 1. Plugin Meta Assets

**Source**: `lib/plugable.js` (lines 154-219)

```javascript
Plugable.addMetaAsset = (ID, filePath, assetObjectPath = 'admin.assetURL') => {
    const objectPath = `meta.assets.${assetObjectPath}`;

    const installAsset = async (pluginObj, obj) => {
        if (ID !== pluginObj.ID) return;

        const metaAsset = {
            ID,
            filePath,
            objectPath,
            targetPath: `plugins/${ID}`,
            targetFileName: path.basename(filePath),
        };

        await Actinium.Hook.run('add-meta-asset', metaAsset);

        let url;
        const file = await Actinium.File.create(
            metaAsset.filePath,
            metaAsset.targetPath,
            metaAsset.targetFileName,
        );

        url = String(file.url()).replace(
            `${ENV.PUBLIC_SERVER_URI}${ENV.PARSE_MOUNT}`,
            '',
        );

        const plugin = Actinium.Cache.get(`plugins.${ID}`);
        op.set(plugin, metaAsset.objectPath, url);
        obj.set('meta', op.get(plugin, 'meta'));
    };

    Actinium.Hook.register('plugin-before-save', async (data, obj, existing) =>
        installMissingAsset(data, obj, existing),
    );
    Actinium.Hook.register('activate', async (data, req) =>
        installAsset(data, req.object),
    );
    Actinium.Hook.register('update', async (data, req) =>
        installAsset(data, req.object),
    );
};
```

**How It Works**:
1. Registers hooks for plugin activation/update
2. Uploads file to Parse Files API
3. Stores URL in plugin meta object
4. Allows versioning via `add-meta-asset` hook

**Convenience Methods**:
```javascript
Plugable.addLogo = (ID, filePath, app = 'admin') =>
    Plugable.addMetaAsset(ID, filePath, `${app}.logo`);

Plugable.addScript = (ID, filePath, app = 'admin') =>
    Plugable.addMetaAsset(ID, filePath, `${app}.script`);

Plugable.addStylesheet = (ID, filePath, app = 'admin') =>
    Plugable.addMetaAsset(ID, filePath, `${app}.style`);
```

### 2. Plugin Lifecycle Hooks

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/cloud/actinium-plugin.js`

```javascript
Parse.Cloud.beforeSave(COLLECTION, async (req) => {
    await Actinium.Hook.run('beforeSave-plugin', req);

    const obj = req.object.toJSON();
    const { active, version } = obj;

    if (req.object.isNew()) {
        await Actinium.Hook.run('install', obj, req);
        if (active) {
            Actinium.Cache.set(`plugins.${obj.ID}.active`, true);
            await Actinium.Hook.run('schema', obj, req);
            await Actinium.Hook.run('activate', obj, req);
        }
    } else {
        let old = await new Parse.Query(COLLECTION)
            .equalTo('ID', obj.ID)
            .first({ useMasterKey: true });

        old = old.toJSON();

        const { active: prev } = old;
        const prevVer = op.get(old, 'version') || version;

        if (active === true) {
            if (semver.gt(semver.coerce(version), semver.coerce(prevVer))) {
                await Actinium.Hook.run('update', obj, req, old);
            }
        }

        if (active === true && active !== prev) {
            Actinium.Cache.set(`plugins.${obj.ID}.active`, true);
            await Actinium.Hook.run('schema', obj, req);
            await Actinium.Hook.run('activate', obj, req);
        }

        if (active === false && active !== prev) {
            Actinium.Cache.set(`plugins.${obj.ID}.active`, false);
            await Actinium.Hook.run('deactivate', obj, req);
        }
    }
});
```

**Plugin Lifecycle Hooks**:
- `install` - First time plugin is saved to database
- `schema` - Run when plugin needs to create/update database schemas
- `activate` - Plugin activated (can happen multiple times)
- `update` - Plugin version increased
- `deactivate` - Plugin deactivated
- `uninstall` - Plugin deleted from database

### 3. Plugin Update Migration Helper

**Source**: `lib/plugable.js` (lines 384-411)

```javascript
Plugable.updateHookHelper = (pluginId, migrations = {}) => {
    const versions = Object.keys(migrations).sort((a, b) => {
        if (semver.gt(semver.coerce(a), semver.coerce(b))) return 1;
        if (semver.gt(semver.coerce(b), semver.coerce(a))) return -1;
        return 0;
    });

    return async (current, req, old) => {
        if (pluginId === current.ID) {
            const newVer = semver.coerce(op.get(current, 'version'));
            const oldVer = semver.coerce(op.get(old, 'version'));

            for (const version of versions) {
                const spec = migrations[version];
                const test = op.get(spec, 'test', () =>
                    semver.gt(version, oldVer),
                );
                const migration = op.get(spec, 'migration', () => {});
                if (typeof test === 'function') {
                    const runnable = await test(newVer, oldVer, current);
                    if (runnable) {
                        await migration(current, req, old);
                    }
                }
            }
        }
    };
};
```

**Usage Example**:
```javascript
const migrations = {
    '1.0.6': {
        migration: async (plugin, req, oldPlugin) => {
            console.log('Migrating to 1.0.6');
            // Update database schemas, migrate data, etc.
        }
    },
    '1.0.5': {
        migration: async (plugin, req, oldPlugin) => {
            console.log('Migrating to 1.0.5');
        }
    },
};

Actinium.Hook.register(
    'update',
    Actinium.Plugin.updateHookHelper('MY_PLUGIN', migrations)
);
```

### 4. Cloud Function Capability Checking

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/lib/utils/options.js`

```javascript
// Check if request has specific capabilities
CloudHasCapabilities(req, ['Plugin.retrieve']);

// Get options with capability checking
const options = CloudCapOptions(req, ['Plugin.retrieve']);

// Use master key for backend operations
const options = MasterOptions();
// Returns: { useMasterKey: true }
```

### 5. Hook-Based Middleware Pattern

**Source**: `lib/middleware.js` (lines 15-32, 111-126)

```javascript
class HookMiddleware {
    constructor(req, res, next) {
        this.req = req;
        this.res = res;
        this.stack = () => next();
    }

    use(cb) {
        const next = this.stack;
        this.stack = () => cb(this.req, this.res, next);
    }

    next() {
        this.stack();
    }
}

mw.registerHook = (...params) => {
    let [id, path, order = 100] = params;

    let args = [
        async (req, res, next) => {
            const mw = new HookMiddleware(req, res, next);
            await Actinium.Hook.run(`${id}-middleware`, mw);
            mw.next();
        },
    ];

    if (typeof path === 'string') args = [path, ...args];
    mw.register(id, (app) => app.use(...args), order);
};
```

**Usage**:
```javascript
// Register hook-based middleware
Actinium.Middleware.registerHook('plugin-assets', '/api/plugin-assets', -10000);

// Now plugins can hook into this middleware
Actinium.Hook.register('plugin-assets-middleware', async (mw) => {
    mw.use((req, res, next) => {
        // Custom middleware logic
        console.log('Plugin assets request:', req.url);
        next();
    });
});
```

---

## Summary of Critical Implementation Details

### 1. **Actinium = Parse + Extensions**
- Actinium spreads all Parse SDK methods
- Parse.Object is extended with hook integration
- Parse Server is the database layer

### 2. **Global-First Architecture**
- Heavy use of global variables for convenience
- `Actinium`, `ENV`, logging functions all global
- Plugin code doesn't need imports for globals

### 3. **Plugin Gating is Mandatory for Cloud Functions**
- `Actinium.Cloud.define()` wraps functions with plugin gate
- Inactive plugins throw errors on function calls
- Use `Parse.Cloud.define()` directly only for core functions

### 4. **Hook System is Async-First**
- Uses `action-sequence` library for orchestration
- Hooks sorted by priority (lower = earlier)
- Errors caught and logged, don't crash server

### 5. **Middleware is Pre-Sorted**
- Middleware discovered and sorted before execution
- Order determined by numeric priority
- Can be replaced or unregistered after discovery

### 6. **Environment Overrides**
- File-based config < process.env
- Multiple environment files supported
- PORT calculation has complex fallback logic

### 7. **Plugin Lifecycle is Rich**
- Install, activate, update, deactivate, uninstall hooks
- Version-based migration support
- Asset management integrated

### 8. **Parse Hooks Auto-Generated**
- beforeSave, afterSave, beforeDelete, afterDelete
- Class-specific hooks: `beforeSave_{ClassName}`
- Content types get special treatment

---

## Verification Checklist

Based on source code analysis, the following statements from the existing documentation have been **verified as accurate**:

- Plugin discovery via glob patterns
- Hook priority system (lower = earlier)
- Cloud function plugin gating
- Middleware discovery and sorting
- Global Actinium object structure
- Environment configuration loading
- Parse Object hook integration
- Plugin lifecycle hooks
- ES module requirement

**Corrections Made**:
- Priority constants: `Enums.priority.normal` should be `Enums.priority.neutral` (value: 0)
- Middleware priority for CORS: -100000 (not -1000000 as documented)
- Cloud function discovery pattern changed in v3.1.8

---

## Related Files for Reference

### Core Framework Files
- `/api/actinium_modules/@atomic-reactor/actinium-core/actinium.js` - Main entry point
- `/api/actinium_modules/@atomic-reactor/actinium-core/globals.js` - Global setup
- `/api/actinium_modules/@atomic-reactor/actinium-core/boot.js` - Environment loading
- `/api/actinium_modules/@atomic-reactor/actinium-core/actinium-config.js` - Version config
- `/api/actinium_modules/@atomic-reactor/actinium-core/package.json` - Dependencies

### Core Libraries
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/plugable.js` - Plugin system
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/hook.js` - Hook system
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/cloud.js` - Cloud functions
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/middleware.js` - Middleware
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/enums.js` - Constants
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/ParseObject/index.js` - Parse extensions
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/utils/index.js` - Utilities

### Example Implementations
- `/api/actinium_modules/@atomic-reactor/actinium-core/cloud/actinium-plugin.js` - Plugin management Cloud Functions
- `/api/actinium_modules/@atomic-reactor/actinium-core/middleware/cors/middleware.js` - CORS middleware
- `/api/actinium_modules/@atomic-reactor/actinium-core/middleware/static/middleware.js` - Static files + hook middleware
- `/api/src/app/coingecko/plugin.js` - Application plugin example

---

**End of Deep Dive Analysis**
