# Actinium Framework - Source Code Analysis Summary

**Date**: 2025-11-20
**Actinium Version**: 5.1.18
**Analysis Method**: Direct source code examination

---

## Executive Summary

This analysis examined the actual source code of the Actinium framework from `/home/john/reactium-framework/api/actinium_modules/@atomic-reactor/actinium-core/`. The existing `ACTINIUM_FRAMEWORK.md` documentation is largely accurate, but this analysis reveals deeper implementation details and corrects a few inaccuracies.

---

## Key Discoveries

### 1. Actinium = Parse + Extensions (NOT Express)

**File**: `actinium.js:34`

```javascript
Actinium = { ...Parse };
```

**Finding**: Actinium spreads the entire Parse SDK into its global object. This means:
- `Actinium.Query` = `Parse.Query`
- `Actinium.User` = `Parse.User`
- `Actinium.Object` = Extended `Parse.Object` (with hooks)
- All Parse methods available as `Actinium.*`

**Impact**: Actinium is a Parse SDK extension, not an Express wrapper. Express is the HTTP layer, Parse is the data layer.

---

### 2. Global Variables Are Pervasive

**File**: `globals.js`

The framework creates numerous globals available everywhere without imports:

```javascript
global.Actinium       // Main framework object
global.ENV            // Environment config
global.PORT           // Server port
global.BASE_DIR       // Project root
global.SRC_DIR        // src/ directory
global.APP_DIR        // src/app/ directory
global.CORE_DIR       // actinium-core directory
global.CLOUD_FUNCTIONS  // Cloud function registry
global.FEATURES       // Feature registry

// Logging functions
global.DEBUG
global.INFO
global.BOOT
global.WARN
global.ERROR
global.LOG
```

**Impact**: Plugin code can use `Actinium`, `ENV`, and logging functions without imports. This is by design.

---

### 3. Plugin Gating Implementation

**File**: `lib/cloud.js:39-52`

```javascript
Cloud.define = (plugin, name, callback) => {
    Parse.Cloud.define(name, (req) =>
        Actinium.Plugin.gate({ req, ID: plugin, name, callback })
    );
    CLOUD_FUNCTIONS.push({ name });
};
```

**File**: `lib/plugable.js:366-372`

```javascript
Plugable.gate = async ({ req, ID, name, callback }) => {
    if (Plugable.isValid(ID, true) !== true) {
        return Promise.reject(`Plugin: ${ID} is not active.`);
    }
    return callback(req);
};
```

**Finding**: Every Cloud Function defined with `Actinium.Cloud.define()` is automatically wrapped with a plugin gate that checks if the plugin is active. If the plugin is inactive, the function throws an error.

**Critical Pattern**:
- Use `Actinium.Cloud.define(PLUGIN.ID, name, callback)` for plugin Cloud Functions
- Use `Parse.Cloud.define(name, callback)` only for core framework functions

---

### 4. Hook System Uses action-sequence Library

**File**: `lib/hook.js:60-98`

```javascript
Hook.run = async (name, ...params) => {
    const context = { hook: name, params };
    try {
        await ActionSequence({
            actions: Hook._actions(name, 'async', params),
            context,
        });
        return context;
    } catch (errors) {
        // Errors logged but don't crash server
        Object.entries(errors).forEach(([id, error]) => {
            ERROR(chalk.magenta(`Error in action.${name}[${id}]`));
            // ... detailed error logging ...
        });
    }
};
```

**Finding**:
- Hooks use the `action-sequence` npm package for orchestration
- Hooks are sorted by `order` (priority) before execution
- Errors are caught, logged, and don't crash the server
- Context object passed to all hooks: `{ hook: name, params: [...] }`

---

### 5. Middleware Discovery is String-Based

**File**: `lib/middleware.js:8-47`

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

mw.init = async (app) => {
    await Promise.all(
        globby(ENV.GLOB_MIDDLEWARE)
            .filter((file) => isMiddleware(fs.readFileSync(file, 'utf8')))
            .map(normalizeImportPath)
            .map((file) => import(file)),
    );
    // ...
};
```

**Finding**: Middleware files are detected by reading file contents and checking for the string `'Actinium.Middleware.register'`. This is a heuristic, not AST parsing.

**Impact**: Files containing middleware registration code will be loaded even if the code isn't executed.

---

### 6. Parse.Object Extended with Automatic Hooks

**File**: `lib/ParseObject/index.js`

```javascript
class ParseObject extends Parse.Object {
    async save(arg1, arg2, arg3, context) {
        const hooksToRun = {
            before: ['beforeSave', `beforeSave_${this.className}`],
            after: ['afterSave', `afterSave_${this.className}`],
        };

        if (String(this.className).toLowerCase().startsWith('content_')) {
            hooksToRun.before.push('beforeSave_content');
            hooksToRun.after.push('afterSave_content');
        }

        // Run before hooks
        for (let hook of hooksToRun.before) {
            await Actinium.Hook.run(hook, req, arg1, arg2, arg3);
        }

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

**Finding**: Actinium replaces `Parse.Object` with an extended version that:
- Automatically fires `beforeSave` and `afterSave` hooks
- Fires class-specific hooks: `beforeSave_{ClassName}`
- Special handling for `Content_*` classes
- Same pattern for `destroy()` method

**Impact**: All Parse object operations trigger hooks automatically. No manual hook registration needed for CRUD operations.

---

### 7. Environment Configuration Priority

**File**: `boot.js:122-154`

```javascript
const boot = {
    get environment() {
        const file = environmentFile();
        let env = JSON.parse(fs.readFileSync(file, 'utf8'));

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
    },
};
```

**Environment File Priority**:
1. `ACTINIUM_ENV_FILE` environment variable (explicit path)
2. `ACTINIUM_ENV_ID` environment variable → `src/env.{ID}.json`
3. Default: `src/env.json`

**Value Priority**:
1. File-based config loaded first
2. `process.env` overrides file values
3. Calculated values (`PORT`, `SERVER_URI`, `PUBLIC_SERVER_URI`)

---

### 8. Plugin Lifecycle Hooks

**File**: `cloud/actinium-plugin.js:135-198`

```javascript
Parse.Cloud.beforeSave(COLLECTION, async (req) => {
    if (req.object.isNew()) {
        await Actinium.Hook.run('install', obj, req);
        if (active) {
            await Actinium.Hook.run('schema', obj, req);
            await Actinium.Hook.run('activate', obj, req);
        }
    } else {
        // ... version checking ...
        if (semver.gt(semver.coerce(version), semver.coerce(prevVer))) {
            await Actinium.Hook.run('update', obj, req, old);
        }

        if (active === true && active !== prev) {
            await Actinium.Hook.run('schema', obj, req);
            await Actinium.Hook.run('activate', obj, req);
        }

        if (active === false && active !== prev) {
            await Actinium.Hook.run('deactivate', obj, req);
        }
    }
});
```

**Plugin Lifecycle Events**:
1. `install` - First time plugin saved to database
2. `schema` - Database schema creation/updates
3. `activate` - Plugin activated
4. `update` - Plugin version increased
5. `deactivate` - Plugin deactivated
6. `uninstall` - Plugin deleted

**Finding**: These hooks are fired by Parse Cloud triggers on the Plugin collection, not during plugin registration.

---

### 9. Glob Discovery Patterns (Verified)

**File**: `globals.js:45-69`

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

**Discovery Order** (for plugins):
1. Core plugins: `actinium-core/plugin/**/*plugin.js`
2. NPM packages: `node_modules/**/actinium/*plugin.js`
3. Actinium modules: `actinium_modules/**/*plugin.js`
4. Application: `src/app/**/*plugin.js`

---

### 10. Priority System (Verified and Corrected)

**File**: `lib/enums.js`

```javascript
const Enums = {
    priority: {
        highest: -1000,
        high: -500,
        neutral: 0,      // NOT "normal"
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

**Correction**: The existing documentation uses `Actinium.Enums.priority.normal`, but the actual constant is `Actinium.Enums.priority.neutral`.

**Priority Rules**:
- **Lower numbers = higher priority = execute earlier**
- Hooks execute in ascending order: -1000, -500, 0, 500, 1000
- Middleware same pattern: CORS at -100000 runs very early

---

## Corrections to Existing Documentation

### 1. Priority Constant Name

**Incorrect**: `Actinium.Enums.priority.normal`
**Correct**: `Actinium.Enums.priority.neutral`

### 2. Middleware Priority Example

**From CORS middleware source**:
```javascript
Actinium.Middleware.register('cors', app => { ... }, -100000);
```

The value is `-100000` (five zeros), not `-1000000` (six zeros).

### 3. Cloud Function Pattern (Deprecated)

**Old Pattern** (deprecated since 3.1.8):
```
src/app/my-plugin/
├── plugin.js
└── cloud.js       // Separate cloud function file
```

**Modern Pattern**:
```javascript
// In plugin.js
const MOD = () => {
    Actinium.Plugin.register(PLUGIN, true);

    // Define Cloud Functions directly in plugin.js
    Actinium.Cloud.define(PLUGIN.ID, 'myFunction', async (req) => {
        return { result: 'success' };
    });
};

export default MOD();
```

---

## Additional Implementation Patterns Discovered

### 1. Core Plugin Auto-Detection

**File**: `lib/plugable.js:117-145`

```javascript
const coredir = path.normalize(`${BASE_DIR}/.core`);
const callerFileName = Actinium.Utils.getCallerFile();

if (
    callerFileName &&
    !/^[.]{2}/.test(path.relative(coredir, callerFileName))
) {
    op.set(meta, 'builtIn', true);
    if (!op.get(meta, 'group')) op.set(meta, 'group', 'core');
    op.set(version, 'actinium', `>=${ACTINIUM_CONFIG.version}`);

    const pluginVersion = op.get(version, 'plugin');
    if (!pluginVersion || !semver.valid(pluginVersion))
        op.set(version, 'plugin', ACTINIUM_CONFIG.version);
}
```

**Finding**: Plugins are automatically marked as "built-in" if they're in the `.core` directory (relative to BASE_DIR). Built-in plugins inherit the framework version.

### 2. Plugin Meta Asset Versioning

**File**: `cloud/actinium-plugin.js:219-230`

```javascript
Actinium.Hook.register(
    'add-meta-asset',
    async (metaAsset) => {
        const parsedFilename = path.parse(metaAsset.targetFileName);
        const plugin = Actinium.Cache.get(`plugins.${metaAsset.ID}`);
        const appVer = op.get(ACTINIUM_CONFIG, 'version');
        const version = op.get(plugin, 'version.plugin', appVer);
        const { name, ext } = parsedFilename;
        metaAsset.targetFileName = `${name}-${version}${ext}`;
    },
    Actinium.Enums.priority.highest,
);
```

**Finding**: Core framework automatically versions plugin assets by appending version number to filename. This ensures proper cache busting.

### 3. Hook-Based Middleware Pattern

**File**: `lib/middleware.js:111-126`

```javascript
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

**Finding**: `Actinium.Middleware.registerHook()` creates Express middleware that runs a hook, allowing plugins to inject behavior into HTTP requests.

**Example Usage**:
```javascript
// Register hook-based middleware
Actinium.Middleware.registerHook('plugin-assets', '/api/plugin-assets', -10000);

// Plugins can now hook into it
Actinium.Hook.register('plugin-assets-middleware', async (mw) => {
    mw.use((req, res, next) => {
        console.log('Custom logic');
        next();
    });
});
```

---

## Architecture Insights

### 1. Two-Phase Initialization

**Phase 1 - Registration** (`Actinium.init()`):
- Discover and import all plugins, middleware, cloud functions
- Plugins register themselves during import
- No database access yet

**Phase 2 - Activation** (`Actinium.start()`):
- Start HTTP server
- Load plugin states from database
- Activate plugins based on database settings
- Initialize schemas, capabilities, roles

### 2. Cache-First Plugin State

```javascript
// Plugin state stored in cache
Actinium.Cache.set(`plugins.${ID}`, plugin);
Actinium.Cache.set(`plugins.${ID}.active`, true);

// Quick lookups
Actinium.Plugin.isActive(ID);  // Reads from cache
Actinium.Plugin.get(ID);       // Reads from cache
```

**Finding**: Plugin state is cached in memory for fast access. Database is source of truth, but cache is used for runtime checks.

### 3. Plugin Validation with Semver

```javascript
const actiniumVer = op.get(ACTINIUM_CONFIG, 'version');
const versionRange = op.get(plugin, 'version.actinium', `>=${actiniumVer}`);
if (versionRange && semverValidRange(versionRange)) {
    if (!semver.satisfies(actiniumVer, versionRange)) {
        return false;  // Plugin invalid
    }
}
```

**Finding**: Plugins can specify compatible Actinium versions using semver ranges. Invalid plugins are ignored.

---

## Testing Considerations

### 1. Harness System

**File**: `actinium.js:249`

```javascript
// Run tests in local development
await Actinium.Harness.run();
```

**Finding**: Actinium has a built-in test harness that runs automatically during startup (in development mode).

### 2. Warning System

**File**: `actinium.js:252`

```javascript
await Actinium.Warnings.run();
```

**Finding**: Framework includes a warning system that checks for common configuration issues and displays them at startup.

---

## Security Considerations

### 1. Master Key Protection

**File**: `globals.js:147`

```javascript
ENV.MASTER_KEY_IPS = stringToObject(
    op.get(ENV, 'MASTER_KEY_IPS', defaults.masterKeyIps),
);
```

Default: `["0.0.0.0/0", "::1"]`

**Finding**: Master key IP restrictions configurable via environment. Default allows localhost only in IPv4 and IPv6.

### 2. Capability-Based Access Control

Cloud Functions use capability checks:

```javascript
if (!CloudHasCapabilities(req, ['Plugin.retrieve']))
    throw new Error('Permission denied.');
```

**Finding**: Core framework enforces capability-based permissions for all sensitive operations.

---

## Performance Considerations

### 1. Action Sequence for Hooks

Hook execution uses `action-sequence` library which:
- Runs async actions in parallel when possible
- Maintains order based on priority
- Aggregates errors without stopping execution

### 2. Cache Layer

```javascript
Actinium.Cache = ActiniumCache;
```

Framework includes built-in cache system (implementation in `lib/cache.js`) for frequently accessed data like plugin states.

### 3. Lazy Loading

Plugins, middleware, and cloud functions are imported dynamically during initialization, not at require time.

---

## Recommendations for Plugin Development

### 1. Always Use Plugin ID for Cloud Functions

```javascript
// CORRECT
Actinium.Cloud.define(PLUGIN.ID, 'myFunction', callback);

// WRONG - bypasses plugin gating
Parse.Cloud.define('myFunction', callback);
```

### 2. Use Appropriate Priority

```javascript
// Early initialization
Actinium.Hook.register('init', callback, Actinium.Enums.priority.highest);

// Normal application logic
Actinium.Hook.register('data-updated', callback, Actinium.Enums.priority.neutral);

// Cleanup
Actinium.Hook.register('shutdown', callback, Actinium.Enums.priority.lowest);
```

### 3. Leverage Plugin Lifecycle Hooks

```javascript
// Database schema creation
Actinium.Hook.register('schema', async (plugin, req) => {
    if (plugin.ID !== PLUGIN.ID) return;

    const schema = new Actinium.Schema('MyData');
    schema.addString('name');
    await schema.save(null, { useMasterKey: true });
});

// Plugin activation
Actinium.Hook.register('activate', async (plugin, req) => {
    if (plugin.ID !== PLUGIN.ID) return;

    console.log('Plugin activated, perform setup');
});
```

### 4. Use Migration Helper for Updates

```javascript
const migrations = {
    '1.1.0': {
        migration: async (plugin, req, oldPlugin) => {
            // Update database, migrate data, etc.
        }
    },
};

Actinium.Hook.register(
    'update',
    Actinium.Plugin.updateHookHelper(PLUGIN.ID, migrations)
);
```

---

## Files Analyzed

### Core Framework
- `/api/actinium_modules/@atomic-reactor/actinium-core/actinium.js`
- `/api/actinium_modules/@atomic-reactor/actinium-core/globals.js`
- `/api/actinium_modules/@atomic-reactor/actinium-core/boot.js`
- `/api/actinium_modules/@atomic-reactor/actinium-core/actinium-config.js`
- `/api/actinium_modules/@atomic-reactor/actinium-core/package.json`

### Core Libraries
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/plugable.js`
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/hook.js`
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/cloud.js`
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/middleware.js`
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/enums.js`
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/ParseObject/index.js`
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/utils/index.js`

### Examples
- `/api/actinium_modules/@atomic-reactor/actinium-core/cloud/actinium-plugin.js`
- `/api/actinium_modules/@atomic-reactor/actinium-core/middleware/cors/middleware.js`
- `/api/actinium_modules/@atomic-reactor/actinium-core/middleware/static/middleware.js`
- `/api/src/app/coingecko/plugin.js`

---

## Conclusion

The Actinium framework is a sophisticated plugin-based backend system built on Parse Server. Key architectural decisions:

1. **Parse-First**: Extends Parse SDK, not a wrapper
2. **Global-Heavy**: Convenient but non-standard approach
3. **Hook-Driven**: Extensibility at every level
4. **Plugin-Gated**: Cloud Functions protected by plugin state
5. **Two-Phase Init**: Registration then activation
6. **Cache-Backed**: Plugin state cached for performance

The existing documentation (`ACTINIUM_FRAMEWORK.md`) is accurate with minor corrections needed for priority constant naming. This analysis provides deeper implementation details for advanced plugin development.

---

**Next Steps**:
1. Review `ACTINIUM_DEEP_DIVE.md` for complete implementation details
2. Update any application code using `Enums.priority.normal` to `Enums.priority.neutral`
3. Consider migrating deprecated `cloud.js` patterns to inline Cloud Function definitions
