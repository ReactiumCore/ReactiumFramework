# Actinium Framework Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Core Architecture](#core-architecture)
3. [Plugin System](#plugin-system)
4. [Hook System](#hook-system)
5. [Cloud Functions](#cloud-functions)
6. [Middleware System](#middleware-system)
7. [Parse Server Integration](#parse-server-integration)
8. [ES Module Requirements](#es-module-requirements)
9. [Plugin Development](#plugin-development)
10. [Database and Collections](#database-and-collections)
11. [Capabilities and Roles](#capabilities-and-roles)
12. [Best Practices & Gotchas](#best-practices--gotchas)

---

## Introduction

**Actinium** is a plugin-based backend framework built on top of **Parse Server** and **Express.js** by Atomic Reactor. It extends Parse Server with a sophisticated plugin architecture, hook system, and convention-based auto-discovery of backend features.

### Key Differentiators from Vanilla Express/Parse

- **Plugin Architecture**: Backend features organized as auto-discoverable plugins
- **Hook System**: Event-driven lifecycle allows plugins to intercept and extend behavior
- **Parse Server Extension**: Full access to Parse Server's features (MongoDB integration, user authentication, ACLs)
- **Cloud Function Gateway**: Plugin-based Cloud Functions with automatic permission gating
- **Middleware Discovery**: Auto-discovered Express middleware from plugin files
- **ES Module First**: Requires ES module syntax (`import`/`export`), not CommonJS

### Project Structure

```
api/
├── actinium_modules/
│   └── @atomic-reactor/
│       └── actinium-core/              # Framework core
├── src/
│   ├── app/                            # Application plugins
│   │   └── my-plugin/
│   │       ├── plugin.js               # Plugin registration
│   │       ├── info.js                 # Plugin metadata
│   │       └── sdk.js                  # Plugin SDK (optional)
│   └── index.js                        # Application entry point
├── .env                                # Environment configuration
└── package.json
```

---

## Core Architecture

### The Actinium Global Object

Actinium extends the Parse SDK and provides a global `Actinium` object with extensive utilities:

**Location**: `/api/actinium_modules/@atomic-reactor/actinium-core/actinium.js`

```javascript
// Actinium is a global object available everywhere
Actinium = {
    ...Parse,  // Inherits all Parse SDK methods

    // Actinium-specific modules
    Hook,           // Hook system
    Plugin,         // Plugin management
    Cloud,          // Cloud Function registration
    Middleware,     // Express middleware management
    Utils,          // Utility functions
    Cache,          // Caching layer
    Setting,        // Settings management
    Roles,          // Role management
    Capability,     // Capability-based permissions
    User,           // User utilities
    Collection,     // MongoDB collection utilities
    Type,           // Content type management
    Pulse,          // Pub/sub event system
    Enums,          // Constants and enums
    File,           // File handling
    FilesAdapter,   // File storage adapter
};
```

### Initialization Lifecycle

**From**: `/api/actinium_modules/@atomic-reactor/actinium-core/actinium.js`

The Actinium initialization process follows this sequence:

1. **`Actinium.init(options)`** - Initializes all core systems:
   ```javascript
   // Express app setup
   const app = express();
   Actinium.app = app;

   // Express settings initialization
   Actinium.Exp.init(app, options);

   // Middleware discovery and registration
   await Actinium.Middleware.init(app);

   // Plugin discovery and registration
   await Actinium.Plugin.init();

   // File adapter initialization
   await Actinium.FilesAdapter.init();

   // Settings initialization
   Actinium.Setting.init();

   // Content type initialization
   Actinium.Type.init();

   Actinium.ready = true;

   // Fire init hook
   await Actinium.Hook.run('init', app, options);
   ```

2. **`Actinium.start(options)`** - Starts the HTTP server:
   ```javascript
   // Create HTTP or HTTPS server
   Actinium.server = http.createServer(Actinium.app);

   // Start listening on configured PORT
   Actinium.server.listen(PORT);

   Actinium.started = true;
   ```

### Application Entry Point

**Typical `/api/src/index.js`**:

```javascript
import Actinium from '@atomic-reactor/actinium-core';

(async () => {
    await Actinium.init();
    await Actinium.start();
})();
```

---

## Plugin System

### Plugin Structure

A typical Actinium plugin consists of several files:

```
src/app/my-plugin/
├── info.js              # Plugin metadata (required)
├── plugin.js            # Plugin registration and initialization (required)
├── sdk.js               # Plugin SDK methods (optional)
└── my-service.js        # Additional service files (optional)
```

### Plugin Metadata (`info.js`)

Defines plugin identity and configuration:

```javascript
// src/app/my-plugin/info.js
const PLUGIN = {
    ID: 'MyPlugin',                      // Unique identifier
    name: 'My Plugin',                   // Display name
    description: 'Description of plugin functionality',
    version: '1.0.0',                    // Plugin version
    pluginDependencies: [],              // Array of plugin IDs this depends on
    order: 100,                          // Load order (lower = earlier)
    bundle: [],                          // Files to bundle
    meta: {
        group: 'MyPluginGroup',          // Grouping for organization
        builtIn: false,                  // true for core plugins
    },
};

export default PLUGIN;
```

### Plugin Registration (`plugin.js`)

The main plugin file that registers the plugin and its features:

```javascript
// src/app/my-plugin/plugin.js
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';
import SDK from './sdk.js';

const MOD = () => {
    // Attach SDK to global Actinium object
    Actinium.MyPlugin = Actinium.MyPlugin || SDK;

    // Register the plugin
    Actinium.Plugin.register(PLUGIN, true);  // true = activate immediately

    // Register Cloud Functions
    Actinium.Cloud.define(PLUGIN.ID, 'myCloudFunction', async (req) => {
        const { param1, param2 } = req.params;
        return SDK.doSomething(param1, param2);
    });

    console.log('MyPlugin registered');
};

export default MOD();  // IMPORTANT: Execute immediately
```

**Key Points**:
- Export the result of calling `MOD()` immediately, not just the function
- Register plugin with `Actinium.Plugin.register(PLUGIN, active)`
- Attach SDK to `Actinium` object for global access
- Use `Actinium.Cloud.define()` for Cloud Functions (not `Parse.Cloud.define()`)

### Plugin SDK (`sdk.js`)

Optional SDK exposing plugin methods:

```javascript
// src/app/my-plugin/sdk.js
import MyService from './my-service.js';

export default {
    doSomething: MyService.doSomething.bind(MyService),
    anotherMethod: async (param) => {
        // Implementation
        return { result: 'success' };
    },
};
```

### Plugin Discovery

**From**: `/api/actinium_modules/@atomic-reactor/actinium-core/lib/plugable.js`

Plugins are auto-discovered via globbing patterns defined in `ENV.GLOB_PLUGINS`:

```javascript
Actinium.Plugin.init = async () => {
    const files = globby(ENV.GLOB_PLUGINS);  // e.g., 'src/app/**/plugin.js'

    // Import all plugin.js files
    await Promise.all(files.map(file => import(normalizeImportPath(file))));

    // Activate plugins based on database settings
    await Actinium.Plugin.activate();
};
```

**Plugin Activation**:
Plugins can be activated/deactivated dynamically via the database or configuration.

### Plugin Validation

**From**: `lib/plugable.js`

Plugins are validated before registration:

```javascript
const _isValid = (plugin, strict = false) => {
    const { ID } = plugin;

    // Must have unique ID
    if (!ID || blacklist.includes(ID)) return false;

    // Validate Actinium version compatibility
    const actiniumVer = ACTINIUM_CONFIG.version;
    const versionRange = plugin.version.actinium || `>=${actiniumVer}`;
    if (!semver.satisfies(actiniumVer, versionRange)) return false;

    // If strict, must be active
    if (strict && !Plugable.isActive(ID)) return false;

    return true;
};
```

---

## Hook System

Actinium's hook system is the backbone of its extensibility, allowing plugins to intercept and extend framework behavior.

### Hook Architecture

**Location**: `/api/actinium_modules/@atomic-reactor/actinium-core/lib/hook.js`

The Hook system provides:
- **Async hooks**: Most common, allows `await` in callbacks
- **Sync hooks**: For synchronous operations
- **Priority-based execution**: Hooks execute in order of priority
- **Action sequence**: Uses `action-sequence` library for orchestrated async execution

### Hook Registration

**Async Hooks** (most common):

```javascript
import Actinium from '@atomic-reactor/actinium-core';

Actinium.Hook.register(
    'my-custom-hook',           // Hook name
    async (arg1, arg2, context) => {  // Callback
        console.log('Hook fired:', arg1, arg2);

        // Async operations allowed
        const result = await someAsyncOperation();

        // Can modify context
        context.customData = result;
    },
    Actinium.Enums.priority.normal,  // Priority
    'unique-hook-id'            // Optional unique ID
);
```

**Sync Hooks**:

```javascript
Actinium.Hook.registerSync(
    'my-sync-hook',
    (arg1, arg2, context) => {
        // Synchronous only, no await
        console.log('Sync hook:', arg1);
    },
    Actinium.Enums.priority.normal,
    'sync-hook-id'
);
```

### Hook Execution

**Run async hooks**:

```javascript
const context = await Actinium.Hook.run('my-custom-hook', 'arg1', 'arg2');
// context = { hook: 'my-custom-hook', params: ['arg1', 'arg2'], customData: ... }
```

**Run sync hooks**:

```javascript
const context = Actinium.Hook.runSync('my-sync-hook', 'data');
```

### Common Framework Hooks

**Initialization Hooks** (order of execution):

1. **`warning`**: Early warnings before initialization
2. **`init`**: Core initialization complete, app and options available
   ```javascript
   Actinium.Hook.register('init', async (app, options) => {
       console.log('Actinium initialized');
   });
   ```

3. **`start`**: Server starting
4. **`started`**: Server started and listening
5. **`activate`**: Plugin activation
6. **`schema-created`**: After database schemas created

**Request/Response Hooks**:

- **`before-save-{ClassName}`**: Before saving a Parse object
  ```javascript
  Actinium.Hook.register('before-save-User', async (req, context) => {
      const { object, user, master } = req;
      // Validate or modify object before save
      if (!object.get('email')) {
          throw new Error('Email required');
      }
  });
  ```

- **`after-save-{ClassName}`**: After saving a Parse object
- **`before-delete-{ClassName}`**: Before deleting
- **`after-delete-{ClassName}`**: After deleting
- **`before-find-{ClassName}`**: Before query execution
- **`after-find-{ClassName}`**: After query execution

**Cloud Function Hooks**:

- **`before-cloud-{functionName}`**: Before Cloud Function execution
- **`after-cloud-{functionName}`**: After Cloud Function execution

**Custom Application Hooks**:

Define your own hooks for plugin communication:

```javascript
// In plugin A
Actinium.Hook.register('data-processed', async (data, context) => {
    console.log('Data processed:', data);
});

// In plugin B
await Actinium.Hook.run('data-processed', processedData);
```

### Priority Levels

**From**: `lib/enums.js`

```javascript
Actinium.Enums.priority = {
    highest: -1000000,   // Execute first
    core: -1000,
    high: -100,
    normal: 0,           // Default
    low: 100,
    lowest: 1000000,     // Execute last
};
```

Lower numbers = higher priority (execute earlier).

### Hook Context

Every hook execution creates a context object:

```javascript
const context = await Actinium.Hook.run('my-hook', arg1, arg2);

// context = {
//     hook: 'my-hook',
//     params: [arg1, arg2],
//     // Plus any properties added by hook callbacks
// }
```

Hook callbacks can modify the context to pass data between hooks.

### Hook Unregistration

```javascript
const hookId = Actinium.Hook.register('my-hook', callback, priority);

// Later, unregister
Actinium.Hook.unregister(hookId);
```

### Hook Error Handling

**From**: `lib/hook.js`

Errors in async hooks are caught and logged but don't crash the server:

```javascript
try {
    await ActionSequence({ actions: hookActions, context });
} catch (errors) {
    Object.entries(errors).forEach(([id, error]) => {
        ERROR(`Error in action.${name}[${id}]`);
        if (error.error instanceof assert.AssertionError) {
            // Log assertion details
        } else {
            ERROR(error);
        }
    });
}
```

---

## Cloud Functions

Cloud Functions in Actinium are Parse Cloud Functions with additional plugin-based gating and hook integration.

### Defining Cloud Functions

**Always use `Actinium.Cloud.define()`, not `Parse.Cloud.define()`**:

```javascript
// In plugin.js
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';
import SDK from './sdk.js';

Actinium.Cloud.define(PLUGIN.ID, 'myCloudFunction', async (req) => {
    // req.params: Client-provided parameters
    // req.user: Authenticated user (if any)
    // req.master: Master key usage flag

    const { param1, param2 } = req.params;

    // Perform operations
    const result = await SDK.doSomething(param1, param2);

    return result;  // Returned to client
});
```

**Cloud Function Signature**:

```javascript
Actinium.Cloud.define(
    pluginID,        // Plugin ID (for permission gating)
    functionName,    // Cloud Function name
    callback         // async function(req) => result
);
```

### Cloud Function Gateway

**From**: `lib/cloud.js`

`Actinium.Cloud.define()` wraps `Parse.Cloud.define()` with plugin gating:

```javascript
Cloud.define = (plugin, name, callback) => {
    if (!plugin || !name || !callback) {
        throw new Error('Cloud.define(plugin, name, callback) all parameters required');
    }

    Parse.Cloud.define(name, (req) =>
        Actinium.Plugin.gate({ req, ID: plugin, name, callback })
    );

    CLOUD_FUNCTIONS.push({ name });
};
```

**Plugin Gating**: Ensures the plugin is active before executing the Cloud Function. If plugin is inactive, the function throws an error.

### Calling Cloud Functions

**From frontend (Reactium)**:

```javascript
import Parse from 'parse';

const result = await Parse.Cloud.run('myCloudFunction', {
    param1: 'value1',
    param2: 'value2',
});
```

**From backend (another plugin)**:

```javascript
const result = await Actinium.Cloud.run('myCloudFunction', {
    param1: 'value1',
    param2: 'value2',
}, { sessionToken: user.getSessionToken() });
```

### Cloud Function Hooks

Intercept Cloud Function execution:

```javascript
// Before execution
Actinium.Hook.register('before-cloud-myCloudFunction', async (req, context) => {
    console.log('About to execute myCloudFunction');

    // Can modify req.params
    req.params.injectedParam = 'value';

    // Can throw to prevent execution
    if (!req.user) {
        throw new Error('Authentication required');
    }
});

// After execution
Actinium.Hook.register('after-cloud-myCloudFunction', async (req, result, context) => {
    console.log('myCloudFunction returned:', result);

    // Can modify result (if returned from context)
    context.result = modifiedResult;
});
```

### Example: Real-World Cloud Function

**From this project**: `/api/src/app/coingecko/plugin.js`

```javascript
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';
import SDK from './sdk.js';

const MOD = () => {
    Actinium.CoinGecko = Actinium.CoinGecko || SDK;
    Actinium.Plugin.register(PLUGIN, true);

    // Register Cloud Function
    // Accessible at: POST http://localhost:9000/api/functions/getOHLC
    Actinium.Cloud.define(PLUGIN.ID, 'getOHLC', async (req) => {
        const {
            coinId = 'ethereum',
            vsCurrency = 'usd',
            days = '1',
        } = req.params;

        return SDK.getOHLC(coinId, vsCurrency, days);
    });

    console.log('CoinGeckoPlugin registered with Cloud Function on /api/functions/getOHLC');
};

export default MOD();
```

**SDK**: `/api/src/app/coingecko/sdk.js`

```javascript
import CoinGeckoService from './coingecko-service.js';

export default {
    getOHLC: CoinGeckoService.getOHLC.bind(CoinGeckoService),
};
```

**Service**: `/api/src/app/coingecko/coingecko-service.js`

```javascript
class CoinGeckoService {
    async getOHLC(coinId, vsCurrency, days) {
        const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc`;
        const params = new URLSearchParams({
            vs_currency: vsCurrency,
            days: days,
        });

        const response = await fetch(`${url}?${params}`);
        const data = await response.json();

        return data;
    }
}

export default new CoinGeckoService();
```

---

## Middleware System

Actinium auto-discovers and registers Express middleware from plugin files.

### Middleware Discovery

**From**: `lib/middleware.js`

Middleware files are discovered via glob patterns:

```javascript
await Promise.all(
    globby(ENV.GLOB_MIDDLEWARE)  // e.g., 'src/app/**/middleware.js'
        .filter(file => isMiddleware(fs.readFileSync(file, 'utf8')))
        .map(file => import(normalizeImportPath(file)))
);
```

A file is considered middleware if it contains:
- `Actinium.Middleware.register`
- `Actinium.Middleware.unregister`

### Middleware Structure

**Pattern**: `middleware/my-middleware/middleware.js` or `src/app/my-plugin/middleware.js`

```javascript
import Actinium from '@atomic-reactor/actinium-core';

Actinium.Middleware.register(
    'my-middleware',                    // Middleware ID
    (app) => {                          // Callback receives Express app
        app.use((req, res, next) => {
            // Express middleware logic
            console.log('Request:', req.method, req.url);
            next();
        });
    },
    Actinium.Enums.priority.normal,     // Priority
    'unique-middleware-id'              // Optional unique ID
);
```

### Middleware Registration Order

Middleware is registered in priority order (lowest priority number first). This is crucial for:
- **Body parsers** need to run early
- **CORS** should be before routes
- **Authentication** before protected routes
- **Error handlers** should be last

### Core Middleware

Actinium includes several core middleware modules:

**From**: `/api/actinium_modules/@atomic-reactor/actinium-core/middleware/`

1. **body_parser**: JSON and URL-encoded body parsing
2. **cookie_parser**: Cookie parsing
3. **cookie_session**: Session management
4. **cors**: Cross-origin resource sharing
5. **morgan**: HTTP request logging
6. **parse**: Parse Server mounting
7. **static**: Static file serving
8. **docs**: API documentation serving

### Example: CORS Middleware

**From**: `/api/actinium_modules/@atomic-reactor/actinium-core/middleware/cors/middleware.js`

```javascript
import Actinium from '@atomic-reactor/actinium-core';
import cors from 'cors';

Actinium.Middleware.register(
    'cors',
    (app) => {
        app.use(cors());
    },
    Actinium.Enums.priority.highest,
    'ACTINIUM-MIDDLEWARE-CORS'
);
```

### Custom Middleware Example

```javascript
// src/app/my-plugin/middleware.js
import Actinium from '@atomic-reactor/actinium-core';

Actinium.Middleware.register(
    'request-logger',
    (app) => {
        app.use((req, res, next) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
            next();
        });
    },
    Actinium.Enums.priority.high,  // Run early
    'my-plugin-logger'
);

// Add custom routes
Actinium.Middleware.register(
    'custom-routes',
    (app) => {
        app.get('/api/custom-endpoint', (req, res) => {
            res.json({ message: 'Custom endpoint response' });
        });
    },
    Actinium.Enums.priority.normal,
    'my-plugin-routes'
);
```

### Middleware Unregistration

```javascript
Actinium.Middleware.unregister('my-middleware-id');
```

---

## Parse Server Integration

Actinium is built on Parse Server, providing full access to Parse features.

### Parse Server Mounting

**From**: `middleware/parse/middleware.js`

Parse Server is mounted as Express middleware:

```javascript
const parseConfig = {
    appId: ENV.APP_ID,
    masterKey: ENV.MASTER_KEY,
    serverURL: ENV.SERVER_URL,
    databaseURI: ENV.DATABASE_URI,
    fileKey: ENV.FILE_KEY,
    javascriptKey: ENV.JAVASCRIPT_KEY,
    // ... more configuration
};

const parseServer = new ParseServer(parseConfig);
app.use(ENV.PARSE_MOUNT, parseServer.app);
```

**Default mount point**: `/parse` (configurable via `ENV.PARSE_MOUNT`)

### MongoDB Integration

Parse Server uses MongoDB for data storage:

```javascript
// ENV.DATABASE_URI example:
// 'mongodb://localhost:27017/actinium'
```

**Parse Collections** (MongoDB collections):
- `_User`: User accounts
- `_Role`: Roles
- `_Session`: User sessions
- `_Installation`: Device installations
- Custom classes: Any other data models

### Working with Parse Objects

**Create and save**:

```javascript
const MyClass = Actinium.Object.extend('MyClass');
const obj = new MyClass();

obj.set('fieldName', 'value');
obj.set('numberField', 123);

await obj.save(null, { useMasterKey: true });
```

**Query**:

```javascript
const query = new Actinium.Query('MyClass');
query.equalTo('fieldName', 'value');
query.limit(10);

const results = await query.find({ useMasterKey: true });
```

**Update**:

```javascript
const query = new Actinium.Query('MyClass');
const obj = await query.first({ useMasterKey: true });

obj.set('fieldName', 'newValue');
await obj.save(null, { useMasterKey: true });
```

**Delete**:

```javascript
await obj.destroy({ useMasterKey: true });
```

### ACLs (Access Control Lists)

Parse provides granular permission control:

```javascript
const acl = new Actinium.ACL();

// Public read, no public write
acl.setPublicReadAccess(true);
acl.setPublicWriteAccess(false);

// User-specific permissions
acl.setReadAccess(user, true);
acl.setWriteAccess(user, true);

// Role-based permissions
acl.setRoleReadAccess('Admin', true);
acl.setRoleWriteAccess('Admin', true);

obj.setACL(acl);
await obj.save(null, { useMasterKey: true });
```

### Master Key Usage

The master key bypasses all ACLs and permissions:

```javascript
// Use sparingly and only in trusted backend code
await query.find({ useMasterKey: true });
await obj.save(null, { useMasterKey: true });
```

**Security Warning**: Never expose master key to clients.

### Parse Hooks in Actinium

Actinium automatically creates hooks for Parse lifecycle events:

```javascript
// Before save
Actinium.Hook.register('before-save-MyClass', async (req, context) => {
    const { object, user, master } = req;
    // Validate or modify object
});

// After save
Actinium.Hook.register('after-save-MyClass', async (req, context) => {
    const { object } = req;
    // Perform post-save actions
});

// Before find
Actinium.Hook.register('before-find-MyClass', async (req, context) => {
    const { query } = req;
    // Modify query
});
```

---

## ES Module Requirements

Actinium **requires ES module syntax** (`import`/`export`), not CommonJS (`require`/`module.exports`).

### Package.json Configuration

**Required** in `/api/package.json`:

```json
{
  "type": "module"
}
```

This tells Node.js to treat `.js` files as ES modules.

### Import Syntax

**Always use**:

```javascript
import Actinium from '@atomic-reactor/actinium-core';
import express from 'express';
import path from 'node:path';
```

**Never use**:

```javascript
// WRONG - will cause errors
const Actinium = require('@atomic-reactor/actinium-core');
```

### Export Syntax

**Always use**:

```javascript
// Named exports
export const myFunction = () => { ... };
export default MyClass;

// Or
const myFunction = () => { ... };
export { myFunction };
export default MyClass;
```

**Never use**:

```javascript
// WRONG
module.exports = MyClass;
exports.myFunction = () => { ... };
```

### Dynamic Imports

For conditional or lazy loading:

```javascript
const module = await import('./my-module.js');
```

### File Extensions

**Required**: Must include `.js` extension in imports for relative paths:

```javascript
// CORRECT
import MyClass from './MyClass.js';
import config from './config.js';

// WRONG - will fail
import MyClass from './MyClass';
```

### Node.js Built-in Modules

Prefer `node:` prefix for built-ins:

```javascript
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
```

### Top-Level Await

ES modules support top-level await:

```javascript
// Allowed at top level
const data = await fetchData();

Actinium.Hook.register('init', async () => {
    // Also allowed in async functions
    await initializePlugin();
});
```

---

## Plugin Development

### Step-by-Step Plugin Creation

#### Step 1: Create Plugin Directory

```bash
mkdir -p api/src/app/my-plugin
cd api/src/app/my-plugin
```

#### Step 2: Create `info.js`

```javascript
// info.js
const PLUGIN = {
    ID: 'MyPlugin',
    name: 'My Plugin',
    description: 'My custom Actinium plugin',
    version: '1.0.0',
    pluginDependencies: [],
    order: 100,
    bundle: [],
    meta: {
        group: 'Custom',
        builtIn: false,
    },
};

export default PLUGIN;
```

#### Step 3: Create `sdk.js` (optional)

```javascript
// sdk.js
class MyPluginSDK {
    async doSomething(param) {
        console.log('Doing something with:', param);
        return { success: true, param };
    }

    async queryData(filters) {
        const query = new Actinium.Query('MyData');

        if (filters.name) {
            query.equalTo('name', filters.name);
        }

        return query.find({ useMasterKey: true });
    }
}

export default new MyPluginSDK();
```

#### Step 4: Create `plugin.js`

```javascript
// plugin.js
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';
import SDK from './sdk.js';

const MOD = () => {
    // Attach SDK to Actinium global
    Actinium.MyPlugin = Actinium.MyPlugin || SDK;

    // Register plugin
    Actinium.Plugin.register(PLUGIN, true);

    // Register hooks
    Actinium.Hook.register('init', async () => {
        console.log('MyPlugin initialized');

        // Perform initialization tasks
        await initializeDatabase();
    }, Actinium.Enums.priority.normal, 'MyPlugin-init');

    // Register Cloud Functions
    Actinium.Cloud.define(PLUGIN.ID, 'myCloudFunction', async (req) => {
        const { param } = req.params;
        return SDK.doSomething(param);
    });

    // Register schemas
    Actinium.Hook.register('schema-created', async () => {
        await createMySchema();
    }, Actinium.Enums.priority.normal, 'MyPlugin-schema');
};

const initializeDatabase = async () => {
    const schema = new Actinium.Schema('MyData');

    try {
        await schema.get({ useMasterKey: true });
    } catch (err) {
        // Schema doesn't exist, create it
        schema.addString('name');
        schema.addNumber('value');
        schema.addBoolean('active');

        await schema.save(null, { useMasterKey: true });
    }
};

const createMySchema = async () => {
    // Additional schema setup
};

export default MOD();  // Execute immediately
```

#### Step 5: Create Middleware (optional)

```javascript
// middleware.js
import Actinium from '@atomic-reactor/actinium-core';

Actinium.Middleware.register(
    'my-plugin-routes',
    (app) => {
        // Add custom Express routes
        app.get('/api/my-plugin/status', (req, res) => {
            res.json({
                status: 'active',
                version: '1.0.0',
            });
        });

        app.post('/api/my-plugin/action', async (req, res) => {
            try {
                const result = await Actinium.MyPlugin.doSomething(req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    },
    Actinium.Enums.priority.normal,
    'MyPlugin-middleware'
);
```

#### Step 6: Test the Plugin

Start Actinium:

```bash
cd api
npm start
```

Test Cloud Function:

```bash
curl -X POST http://localhost:9000/api/functions/myCloudFunction \
  -H "Content-Type: application/json" \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -d '{"param": "test value"}'
```

---

## Database and Collections

### Schema Definition

```javascript
const schema = new Actinium.Schema('MyCollection');

// Field types
schema.addString('name');
schema.addNumber('count');
schema.addBoolean('active');
schema.addDate('createdAt');
schema.addArray('tags');
schema.addObject('metadata');
schema.addPointer('user', '_User');  // Relation to User
schema.addRelation('items', 'Item'); // Many-to-many relation

// Indexes
schema.addIndex('name_index', { name: 1 });

// Save schema
await schema.save(null, { useMasterKey: true });
```

### Collection Utilities

**From**: `lib/collection.js`

```javascript
// Register a collection
Actinium.Collection.register('MyCollection', {
    create: true,    // Allow creation
    retrieve: true,  // Allow retrieval
    update: true,    // Allow updates
    delete: true,    // Allow deletion
});

// List registered collections
const collections = Actinium.Collection.list();
```

---

## Capabilities and Roles

### Role Management

```javascript
// Create a role
const roleACL = new Actinium.ACL();
roleACL.setPublicReadAccess(true);

const role = new Actinium.Role('Editor', roleACL);
await role.save(null, { useMasterKey: true });

// Add user to role
const user = await new Actinium.Query('_User')
    .equalTo('username', 'john')
    .first({ useMasterKey: true });

role.getUsers().add(user);
await role.save(null, { useMasterKey: true });

// Check if user has role
const hasRole = await Actinium.Roles.User.is(user, 'Editor');
```

### Capability-Based Permissions

```javascript
// Register capability
Actinium.Capability.register('myPlugin.create', {
    allowed: ['Editor', 'Admin'],
    excluded: ['Banned'],
});

// Check user capability
const canCreate = await Actinium.Capability.User.can(user, 'myPlugin.create');

if (!canCreate) {
    throw new Error('Permission denied');
}
```

### Plugin Capabilities

**From**: `lib/plugable.js`

Plugins define their own capabilities:

```javascript
// In plugin.js
PLUGIN.capabilities = [
    {
        capability: 'MyPlugin.create',
        roles: {
            allowed: ['Admin'],
        },
    },
    {
        capability: 'MyPlugin.retrieve',
        roles: {
            allowed: ['anonymous'],  // Public access
        },
    },
];
```

---

## Best Practices & Gotchas

### Best Practices

#### 1. Always Use Plugin ID for Cloud Functions

```javascript
// GOOD
Actinium.Cloud.define(PLUGIN.ID, 'myFunction', callback);

// BAD - no plugin gating
Parse.Cloud.define('myFunction', callback);
```

#### 2. Execute Plugin Immediately

```javascript
// GOOD
const MOD = () => {
    // Plugin registration
};
export default MOD();  // Execute immediately

// BAD - function not executed
export default MOD;
```

#### 3. Use Master Key for Backend Operations

```javascript
// Backend code can use master key
await query.find({ useMasterKey: true });
await obj.save(null, { useMasterKey: true });
```

#### 4. Attach SDKs to Actinium Global

```javascript
// Makes SDK available everywhere
Actinium.MyPlugin = Actinium.MyPlugin || SDK;
```

#### 5. Use Hooks for Cross-Plugin Communication

```javascript
// In plugin A
Actinium.Hook.register('data-updated', async (data) => {
    // Handle data update
});

// In plugin B
await Actinium.Hook.run('data-updated', newData);
```

#### 6. Register Schemas in Hooks

```javascript
Actinium.Hook.register('schema-created', async () => {
    const schema = new Actinium.Schema('MyClass');
    // Define schema
    await schema.save(null, { useMasterKey: true });
}, Actinium.Enums.priority.normal);
```

#### 7. Use Environment Variables

```javascript
// In .env
MY_API_KEY=secret_key_here

// In plugin
const apiKey = process.env.MY_API_KEY || ENV.MY_API_KEY;
```

### Gotchas

#### 1. Must Use ES Modules

```javascript
// WRONG - will fail
const Actinium = require('@atomic-reactor/actinium-core');

// CORRECT
import Actinium from '@atomic-reactor/actinium-core';
```

#### 2. File Extensions Required for Relative Imports

```javascript
// WRONG
import SDK from './sdk';

// CORRECT
import SDK from './sdk.js';
```

#### 3. Plugin Order Matters

Plugins load in order specified by the `order` property in `info.js`. If Plugin B depends on Plugin A, ensure `A.order < B.order`.

#### 4. Hook Execution is Async

```javascript
// Hooks run asynchronously, must await
await Actinium.Hook.run('my-hook', data);

// DON'T forget await
Actinium.Hook.run('my-hook', data);  // Hook may not complete
```

#### 5. Cloud Function Parameters in req.params

```javascript
// CORRECT
Actinium.Cloud.define(PLUGIN.ID, 'myFunc', async (req) => {
    const { param1 } = req.params;  // Client params are in req.params
});

// WRONG
Actinium.Cloud.define(PLUGIN.ID, 'myFunc', async (param1) => {
    // This won't work
});
```

#### 6. Parse Queries Return Promises

```javascript
// MUST await Parse queries
const results = await query.find({ useMasterKey: true });

// WRONG
const results = query.find({ useMasterKey: true });  // Returns Promise
```

#### 7. ACLs Don't Apply with Master Key

Using `{ useMasterKey: true }` bypasses all ACLs. Use carefully.

#### 8. Global Actinium Object

`Actinium` is a global object, available without import in plugin files:

```javascript
// No need to import in plugin.js
// Actinium is already global
Actinium.Plugin.register(PLUGIN, true);
```

But for type safety and clarity, you can still import:

```javascript
import Actinium from '@atomic-reactor/actinium-core';
```

#### 9. Middleware Registration Timing

Middleware must be registered before `Actinium.init()` completes. Don't register middleware in late hooks.

#### 10. Schema Changes Require Restart

After modifying Parse schemas, restart the server for changes to take effect.

---

## Real-World Example: CoinGecko Plugin

Complete example from this project:

**info.js**:
```javascript
const PLUGIN = {
    ID: 'CoinGeckoPlugin',
    name: 'Coinbase Plugin',
    description: 'CoinGecko API integration for crypto market data.',
    version: '1.0.0',
    pluginDependencies: [],
    order: 100,
    bundle: [],
    meta: {
        group: 'CoinGecko',
        builtIn: false,
    },
};

export default PLUGIN;
```

**plugin.js**:
```javascript
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';
import SDK from './sdk.js';

const MOD = () => {
    Actinium.CoinGecko = Actinium.CoinGecko || SDK;
    Actinium.Plugin.register(PLUGIN, true);

    Actinium.Cloud.define(PLUGIN.ID, 'getOHLC', async (req) => {
        const {
            coinId = 'ethereum',
            vsCurrency = 'usd',
            days = '1',
        } = req.params;
        return SDK.getOHLC(coinId, vsCurrency, days);
    });

    console.log('CoinGeckoPlugin registered');
};

export default MOD();
```

**sdk.js**:
```javascript
import CoinGeckoService from './coingecko-service.js';

export default {
    getOHLC: CoinGeckoService.getOHLC.bind(CoinGeckoService),
};
```

**coingecko-service.js**:
```javascript
class CoinGeckoService {
    async getOHLC(coinId, vsCurrency, days) {
        const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc`;
        const params = new URLSearchParams({
            vs_currency: vsCurrency,
            days: days,
        });

        const response = await fetch(`${url}?${params}`);
        return response.json();
    }
}

export default new CoinGeckoService();
```

**Usage from frontend**:
```javascript
const data = await Parse.Cloud.run('getOHLC', {
    coinId: 'bitcoin',
    vsCurrency: 'usd',
    days: '7',
});
```

---

## Summary

Actinium is a powerful backend framework that provides:

1. **Parse Server Foundation**: Full MongoDB integration, user management, ACLs
2. **Plugin Architecture**: Auto-discoverable, modular plugins
3. **Hook System**: Event-driven extensibility at every level
4. **Cloud Function Gateway**: Plugin-based Cloud Functions with permission gating
5. **Middleware System**: Convention-based Express middleware
6. **ES Module First**: Modern JavaScript module system
7. **Capability-Based Permissions**: Fine-grained access control
8. **Extensible Global Object**: `Actinium` global with all framework features

By leveraging Actinium's conventions and features, you can build scalable, maintainable backend systems with robust plugin ecosystems.

For frontend integration with Reactium, see [REACTIUM_FRAMEWORK.md](./REACTIUM_FRAMEWORK.md).
