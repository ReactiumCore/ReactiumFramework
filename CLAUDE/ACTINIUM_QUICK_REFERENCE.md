# Actinium Framework - Quick Reference Guide

**Version**: 5.1.18
**Last Updated**: 2025-11-20

Quick reference for common Actinium patterns verified from source code.

---

## Plugin Structure (Minimal)

```javascript
// info.js
const PLUGIN = {
    ID: 'MyPlugin',
    name: 'My Plugin',
    description: 'Plugin description',
    version: '1.0.0',
    order: 100,
};
export default PLUGIN;

// plugin.js
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';
import SDK from './sdk.js';

const MOD = () => {
    Actinium.MyPlugin = SDK;
    Actinium.Plugin.register(PLUGIN, true);

    Actinium.Cloud.define(PLUGIN.ID, 'myFunction', async (req) => {
        const { param } = req.params;
        return SDK.doSomething(param);
    });
};

export default MOD();

// sdk.js
export default {
    doSomething: async (param) => {
        return { success: true, param };
    },
};
```

---

## Hook Registration

```javascript
// Async hook (most common)
Actinium.Hook.register(
    'hook-name',
    async (arg1, arg2, context) => {
        // Hook logic
        context.result = 'modified';
    },
    Actinium.Enums.priority.neutral,  // 0
    'unique-hook-id'
);

// Sync hook
Actinium.Hook.registerSync(
    'sync-hook',
    (arg1, arg2, context) => {
        // No await allowed
    },
    Actinium.Enums.priority.neutral
);

// Run hook
const context = await Actinium.Hook.run('hook-name', 'arg1', 'arg2');
```

---

## Priority Constants

```javascript
Actinium.Enums.priority.highest  // -1000 (runs first)
Actinium.Enums.priority.high     // -500
Actinium.Enums.priority.neutral  // 0 (default)
Actinium.Enums.priority.low      // 500
Actinium.Enums.priority.lowest   // 1000 (runs last)
```

**Rule**: Lower number = higher priority = executes earlier

---

## Cloud Functions

```javascript
// Plugin Cloud Function (with gating)
Actinium.Cloud.define(PLUGIN.ID, 'functionName', async (req) => {
    const { param1, param2 } = req.params;
    const user = req.user;
    const master = req.master;

    return { result: 'success' };
});

// Call from client (Reactium)
const result = await Parse.Cloud.run('functionName', {
    param1: 'value',
});

// Call from backend
const result = await Actinium.Cloud.run('functionName', {
    param1: 'value',
}, { sessionToken: user.getSessionToken() });
```

---

## Middleware

```javascript
// Standard middleware
Actinium.Middleware.register(
    'my-middleware',
    (app) => {
        app.use((req, res, next) => {
            console.log(req.method, req.url);
            next();
        });
    },
    Actinium.Enums.priority.neutral,
    'middleware-id'
);

// Hook-based middleware
Actinium.Middleware.registerHook('my-hook-middleware', '/api/path', 100);

// Later, plugins can hook in
Actinium.Hook.register('my-hook-middleware-middleware', async (mw) => {
    mw.use((req, res, next) => {
        // Custom logic
        next();
    });
});
```

---

## Parse Queries

```javascript
// Query with master key
const query = new Actinium.Query('MyClass');
query.equalTo('field', 'value');
query.limit(10);
const results = await query.find({ useMasterKey: true });

// Get first result
const first = await query.first({ useMasterKey: true });

// Get by ID
const obj = await query.get(objectId, { useMasterKey: true });

// Count
const count = await query.count({ useMasterKey: true });
```

---

## Parse Objects (CRUD)

```javascript
// Create
const MyClass = Actinium.Object.extend('MyClass');
const obj = new MyClass();
obj.set('name', 'value');
obj.set('number', 123);
await obj.save(null, { useMasterKey: true });

// Read
const query = new Actinium.Query('MyClass');
const obj = await query.get(objectId, { useMasterKey: true });
const name = obj.get('name');

// Update
obj.set('name', 'new value');
await obj.save(null, { useMasterKey: true });

// Delete
await obj.destroy({ useMasterKey: true });

// Increment
obj.increment('counter');
await obj.save(null, { useMasterKey: true });

// Add to array
obj.addUnique('tags', 'new-tag');
await obj.save(null, { useMasterKey: true });
```

---

## Schema Management

```javascript
Actinium.Hook.register('schema', async (plugin) => {
    if (plugin.ID !== PLUGIN.ID) return;

    const schema = new Actinium.Schema('MyClass');

    try {
        // Try to get existing schema
        await schema.get({ useMasterKey: true });
    } catch (err) {
        // Schema doesn't exist, create it
        schema.addString('name');
        schema.addNumber('count');
        schema.addBoolean('active');
        schema.addDate('createdAt');
        schema.addArray('tags');
        schema.addObject('metadata');
        schema.addPointer('user', '_User');
        schema.addRelation('items', 'Item');

        // Add index
        schema.addIndex('name_index', { name: 1 });

        await schema.save(null, { useMasterKey: true });
    }
}, Actinium.Enums.priority.neutral, 'MyPlugin-schema');
```

---

## ACLs (Access Control)

```javascript
// Create ACL
const acl = new Actinium.ACL();

// Public access
acl.setPublicReadAccess(true);
acl.setPublicWriteAccess(false);

// User-specific
acl.setReadAccess(user, true);
acl.setWriteAccess(user, true);

// Role-based
acl.setRoleReadAccess('Admin', true);
acl.setRoleWriteAccess('Admin', true);

// Apply to object
obj.setACL(acl);
await obj.save(null, { useMasterKey: true });
```

---

## Roles

```javascript
// Create role
const roleACL = new Actinium.ACL();
roleACL.setPublicReadAccess(true);

const role = new Actinium.Role('Editor', roleACL);
await role.save(null, { useMasterKey: true });

// Add user to role
role.getUsers().add(user);
await role.save(null, { useMasterKey: true });

// Check if user has role
const hasRole = await Actinium.Roles.User.is(user, 'Editor');

// Get user roles
const roles = await Actinium.Roles.User.get(user);
```

---

## Capabilities

```javascript
// Register capability
Actinium.Capability.register('myPlugin.create', {
    allowed: ['Editor', 'Admin'],
    excluded: ['Banned'],
}, Actinium.Enums.priority.neutral);

// Check user capability
const canCreate = await Actinium.Capability.User.can(user, 'myPlugin.create');

// In Cloud Function
if (!Actinium.Utils.CloudHasCapabilities(req, ['myPlugin.create'])) {
    throw new Error('Permission denied');
}
```

---

## Plugin Lifecycle Hooks

```javascript
// Install (first time plugin saved)
Actinium.Hook.register('install', async (plugin, req) => {
    if (plugin.ID !== PLUGIN.ID) return;
    console.log('Installing plugin');
});

// Schema creation
Actinium.Hook.register('schema', async (plugin, req) => {
    if (plugin.ID !== PLUGIN.ID) return;
    // Create database schemas
});

// Activate
Actinium.Hook.register('activate', async (plugin, req) => {
    if (plugin.ID !== PLUGIN.ID) return;
    console.log('Plugin activated');
});

// Update (version change)
Actinium.Hook.register('update', async (plugin, req, oldPlugin) => {
    if (plugin.ID !== PLUGIN.ID) return;
    console.log('Updating from', oldPlugin.version, 'to', plugin.version);
});

// Deactivate
Actinium.Hook.register('deactivate', async (plugin, req) => {
    if (plugin.ID !== PLUGIN.ID) return;
    console.log('Plugin deactivated');
});

// Uninstall (deleted from database)
Actinium.Hook.register('uninstall', async (plugin) => {
    if (plugin.ID !== PLUGIN.ID) return;
    console.log('Plugin uninstalled');
});
```

---

## Migration Helper

```javascript
const migrations = {
    '1.1.0': {
        migration: async (plugin, req, oldPlugin) => {
            console.log('Migrating to 1.1.0');
            // Migration logic
        }
    },
    '1.0.5': {
        test: (newVer, oldVer) => {
            // Custom test logic
            return semver.gt(newVer, '1.0.4');
        },
        migration: async (plugin, req, oldPlugin) => {
            console.log('Migrating to 1.0.5');
        }
    },
};

Actinium.Hook.register(
    'update',
    Actinium.Plugin.updateHookHelper(PLUGIN.ID, migrations)
);
```

---

## Common Parse Hooks

```javascript
// Before save
Actinium.Hook.register('before-save-MyClass', async (req, context) => {
    const { object, user, master } = req;

    // Validate
    if (!object.get('name')) {
        throw new Error('Name required');
    }

    // Set defaults
    if (!object.get('status')) {
        object.set('status', 'pending');
    }
});

// After save
Actinium.Hook.register('after-save-MyClass', async (req, context) => {
    const { object } = req;
    console.log('Saved:', object.id);
});

// Before delete
Actinium.Hook.register('before-delete-MyClass', async (req, context) => {
    const { object } = req;

    // Prevent deletion
    if (object.get('protected')) {
        throw new Error('Cannot delete protected object');
    }
});

// After delete
Actinium.Hook.register('after-delete-MyClass', async (req, context) => {
    console.log('Deleted object');
});
```

---

## Environment Variables

```javascript
// Access environment
const apiKey = ENV.MY_API_KEY;
const port = PORT;  // Global
const appName = ENV.APP_NAME;

// Common ENV variables
ENV.APP_ID
ENV.MASTER_KEY
ENV.SERVER_URL
ENV.DATABASE_URI
ENV.PARSE_MOUNT        // Default: '/parse'
ENV.STATIC_PATH
ENV.LOG_LEVEL          // 'DEBUG', 'INFO', 'BOOT', 'WARN', 'ERROR'
```

---

## Global Logging

```javascript
DEBUG('Debug message');
INFO('Info message');
BOOT('Boot message');
WARN('Warning message');
ERROR('Error message');
LOG('Log message');  // Alias for BOOT
```

**Log Levels** (threshold):
- `DEBUG`: 1000
- `INFO`: 500
- `BOOT`: 0
- `WARN`: -500
- `ERROR`: -1000

Set `ENV.LOG_LEVEL` to control output.

---

## Global Path Constants

```javascript
BASE_DIR    // Project root
SRC_DIR     // src/ directory
APP_DIR     // src/app/ directory
CORE_DIR    // actinium-core directory
```

---

## Plugin Meta Assets

```javascript
// Add logo
Actinium.Plugin.addLogo(
    PLUGIN.ID,
    path.resolve(__dirname, 'plugin-assets/logo.svg')
);

// Add script
Actinium.Plugin.addScript(
    PLUGIN.ID,
    path.resolve(__dirname, 'plugin-assets/script.js')
);

// Add stylesheet
Actinium.Plugin.addStylesheet(
    PLUGIN.ID,
    path.resolve(__dirname, 'plugin-assets/style.css')
);

// Generic asset
Actinium.Plugin.addMetaAsset(
    PLUGIN.ID,
    path.resolve(__dirname, 'plugin-assets/worker.js'),
    'webworkerURL'
);
```

---

## Common Utilities

```javascript
// Serialize Parse object to JSON
const json = Actinium.Utils.serialize(parseObject);

// Master key options
const options = Actinium.Utils.MasterOptions();
// Returns: { useMasterKey: true }

// Cloud capability options
const options = Actinium.Utils.CloudCapOptions(req, ['Plugin.retrieve']);

// Check capabilities
if (Actinium.Utils.CloudHasCapabilities(req, ['Plugin.retrieve'])) {
    // User has permission
}

// Get user from session
const user = await Actinium.Utils.UserFromSession(sessionToken);
```

---

## File Operations

```javascript
// Create file
const file = await Actinium.File.create(
    '/path/to/local/file.jpg',
    'uploads/images',         // Target path
    'custom-filename.jpg'     // Target filename
);

const url = file.url();
console.log('File URL:', url);

// Attach to object
obj.set('image', file);
await obj.save(null, { useMasterKey: true });
```

---

## Cache Operations

```javascript
// Set cache value
Actinium.Cache.set('my-key', { data: 'value' });

// Get cache value
const value = Actinium.Cache.get('my-key');

// Get with default
const value = Actinium.Cache.get('my-key', 'default-value');

// Delete cache value
Actinium.Cache.del('my-key');

// Plugin state cache
const plugin = Actinium.Cache.get(`plugins.${PLUGIN.ID}`);
const isActive = Actinium.Cache.get(`plugins.${PLUGIN.ID}.active`);
```

---

## Plugin Control

```javascript
// Check if plugin active
const active = Actinium.Plugin.isActive('PluginID');

// Check if plugin valid
const valid = Actinium.Plugin.isValid('PluginID');

// Check if plugin valid and active
const validAndActive = Actinium.Plugin.isValid('PluginID', true);

// Get plugin info
const plugin = Actinium.Plugin.get('PluginID');

// Get all plugins
const plugins = Actinium.Plugin.get();

// Activate plugin
await Actinium.Plugin.activate('PluginID');

// Deactivate plugin
await Actinium.Plugin.deactivate('PluginID');
```

---

## Common Mistakes to Avoid

### 1. Wrong Priority Constant
```javascript
// WRONG
Actinium.Enums.priority.normal

// CORRECT
Actinium.Enums.priority.neutral
```

### 2. Not Executing Plugin
```javascript
// WRONG
const MOD = () => { /* ... */ };
export default MOD;  // Not executed!

// CORRECT
const MOD = () => { /* ... */ };
export default MOD();  // Execute immediately
```

### 3. Missing File Extension
```javascript
// WRONG
import SDK from './sdk';

// CORRECT
import SDK from './sdk.js';
```

### 4. Using Parse.Cloud.define Instead of Actinium.Cloud.define
```javascript
// WRONG - no plugin gating
Parse.Cloud.define('myFunction', callback);

// CORRECT - with plugin gating
Actinium.Cloud.define(PLUGIN.ID, 'myFunction', callback);
```

### 5. Forgetting Master Key
```javascript
// WRONG - will fail with permission error
await query.find();

// CORRECT
await query.find({ useMasterKey: true });
```

### 6. Not Awaiting Promises
```javascript
// WRONG
const result = query.find({ useMasterKey: true });  // Promise object

// CORRECT
const result = await query.find({ useMasterKey: true });
```

---

## Common Patterns

### Singleton Service Pattern

```javascript
// my-service.js
class MyService {
    constructor() {
        this.cache = new Map();
    }

    async getData(id) {
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }

        const query = new Actinium.Query('MyData');
        const data = await query.get(id, { useMasterKey: true });

        this.cache.set(id, data);
        return data;
    }
}

export default new MyService();  // Export singleton
```

### Hook Filter Pattern

```javascript
// Only execute hook for specific plugin
Actinium.Hook.register('activate', async (plugin, req) => {
    if (plugin.ID !== PLUGIN.ID) return;  // Filter

    // Plugin-specific activation logic
});
```

### Error Handling in Cloud Functions

```javascript
Actinium.Cloud.define(PLUGIN.ID, 'myFunction', async (req) => {
    try {
        const { param } = req.params;

        if (!param) {
            throw new Error('param is required');
        }

        const result = await doSomething(param);
        return { success: true, result };

    } catch (error) {
        ERROR('Cloud function error:', error);
        throw error;  // Re-throw to client
    }
});
```

### Conditional Schema Updates

```javascript
Actinium.Hook.register('schema', async (plugin) => {
    if (plugin.ID !== PLUGIN.ID) return;

    const schema = new Actinium.Schema('MyClass');

    try {
        const existing = await schema.get({ useMasterKey: true });

        // Schema exists, check if field needs to be added
        if (!existing.fields.newField) {
            schema.addString('newField');
            await schema.update({ useMasterKey: true });
        }

    } catch (err) {
        // Schema doesn't exist, create it
        schema.addString('name');
        schema.addString('newField');
        await schema.save(null, { useMasterKey: true });
    }
});
```

---

## Debugging Tips

### 1. Enable Debug Logging
Set `ENV.LOG_LEVEL = 'DEBUG'` in `src/env.json`

### 2. Log Hook Execution
```javascript
Actinium.Hook.register('my-hook', async (...args) => {
    DEBUG('my-hook called with:', args);
    // Hook logic
});
```

### 3. Check Plugin State
```javascript
console.log('Plugin active:', Actinium.Plugin.isActive(PLUGIN.ID));
console.log('Plugin info:', Actinium.Plugin.get(PLUGIN.ID));
```

### 4. Inspect Cloud Functions
```javascript
console.log('Registered Cloud Functions:', CLOUD_FUNCTIONS);
```

### 5. Test Cloud Functions
```bash
curl -X POST http://localhost:9000/api/functions/myFunction \
  -H "Content-Type: application/json" \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -d '{"param": "value"}'
```

---

## Quick Checklist for New Plugin

- [ ] Create `info.js` with plugin metadata
- [ ] Create `plugin.js` with registration code
- [ ] Export `MOD()` execution (not just function)
- [ ] Use `Actinium.Cloud.define(PLUGIN.ID, ...)` for Cloud Functions
- [ ] Register `schema` hook for database schema
- [ ] Add `.js` extension to relative imports
- [ ] Use `useMasterKey: true` for backend operations
- [ ] Filter lifecycle hooks by `plugin.ID`
- [ ] Test with plugin active and inactive
- [ ] Check logs for errors during startup

---

For complete details, see:
- `ACTINIUM_FRAMEWORK.md` - Comprehensive framework guide
- `ACTINIUM_DEEP_DIVE.md` - Deep implementation analysis
- `ACTINIUM_SOURCE_ANALYSIS_SUMMARY.md` - Key findings and corrections
