<!-- v1.0.0 -->

# Actinium Framework - Complete Reference

**Last Updated**: November 22, 2025
**Framework Version**: Actinium 5.x (actinium-core v5.1.18)
**Purpose**: Consolidated reference combining quick reference, framework guide, capabilities system, and source code analysis

---

## Document Navigation

**Jump to Section:**

- [Quick Reference](#quick-reference) - Common patterns and quick lookup
- [Framework Architecture](#framework-architecture) - Core concepts and design
- [Plugin System](#plugin-system) - Creating and managing plugins
- [Hook System](#hook-system) - Event-driven architecture
- [Cloud Functions](#cloud-functions) - Backend API endpoints
- [Capabilities System](#capabilities-system) - Authorization and permissions
- [Source Code Insights](#source-code-insights) - Implementation details
- [Troubleshooting](#troubleshooting) - Common issues and solutions

---

# Quick Reference

> For developers who need immediate answers

## Essential Plugin Structure

```javascript
// info.js - Plugin metadata (required)
const PLUGIN = {
    ID: 'MyPlugin',
    name: 'My Plugin',
    description: 'Plugin description',
    version: '1.0.0',
    order: 100,
};
export default PLUGIN;

// plugin.js - Main plugin file (required)
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';
import SDK from './sdk.js';

const MOD = () => {
    // Register plugin
    Actinium.Plugin.register(PLUGIN, true);

    // Attach SDK to Actinium
    Actinium.MyPlugin = SDK;

    // Register cloud functions
    Actinium.Cloud.define(PLUGIN.ID, 'myFunction', async (req) => {
        const { param } = req.params;
        return SDK.doSomething(param);
    });

    // Register capabilities
    Actinium.Capability.register('myplugin.view', {
        allowed: ['contributor', 'moderator', 'user'],
    });
};

export default MOD();

// sdk.js - Plugin SDK methods (optional)
export default {
    doSomething: async (param) => {
        return { success: true, param };
    },
};
```

## Hook Registration Patterns

```javascript
// Async hook (most common)
Actinium.Hook.register(
  'hook-name',
  async (arg1, arg2, context) => {
    context.result = 'modified';
  },
  Actinium.Enums.priority.neutral, // 0
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

// Run hooks
const context = await Actinium.Hook.run('hook-name', 'arg1', 'arg2');
const syncContext = Actinium.Hook.runSync('sync-hook', 'arg1', 'arg2');
```

## Priority Constants

```javascript
Actinium.Enums.priority.highest; // -1000 (runs first)
Actinium.Enums.priority.high; // -500
Actinium.Enums.priority.neutral; // 0 (default)
Actinium.Enums.priority.low; // 500
Actinium.Enums.priority.lowest; // 1000 (runs last)
```

**Rule**: Lower number = higher priority = executes earlier

## Cloud Function Patterns

```javascript
// Plugin cloud function (with automatic plugin gating)
Actinium.Cloud.define(PLUGIN.ID, 'functionName', async (req) => {
  const { param1, param2 } = req.params;
  const user = req.user;
  const master = req.master;

  // Capability check
  const { CloudHasCapabilities } = Actinium.Utils;
  if (!CloudHasCapabilities(req, 'myplugin.use')) {
    throw new Error('Permission denied');
  }

  // Get options with capability-based escalation
  const options = Actinium.Utils.CloudCapOptions(req, 'admin.access');

  // Query with proper permissions
  const query = new Actinium.Query('MyCollection');
  return query.find(options);
});

// Core cloud function (no plugin gating)
Parse.Cloud.define('coreFunctionName', async (req) => {
  // Only use for framework core functions
});
```

## Capability Checking

```javascript
// Server-side
const { CloudHasCapabilities } = Actinium.Utils;

// Check single capability
if (!CloudHasCapabilities(req, 'feature.use')) {
  throw new Error('Permission denied');
}

// Check multiple (strict - ALL required)
if (!CloudHasCapabilities(req, ['admin.users', 'admin.roles'], true)) {
  throw new Error('Requires both capabilities');
}

// Check multiple (permissive - ANY required)
if (!CloudHasCapabilities(req, ['content.edit', 'content.review'], false)) {
  throw new Error('Requires edit or review');
}

// Get query options with capability escalation
const options = Actinium.Utils.CloudCapOptions(
  req,
  ['content.updateany'], // Capabilities that grant master key
  false // strict mode
);
```

## Global Variables Available

```javascript
// Framework
Actinium; // Main framework object
ENV; // Environment configuration
PORT; // Server port

// Directories
BASE_DIR; // Project root
SRC_DIR; // src/ directory
APP_DIR; // src/app/ directory
CORE_DIR; // actinium-core directory

// Registries
CLOUD_FUNCTIONS; // Cloud function registry
FEATURES; // Feature registry

// Logging functions (auto-filtered by LOG_LEVEL)
DEBUG(...args); // Threshold: 1000
INFO(...args); // Threshold: 500
BOOT(...args); // Threshold: 0 (boot messages)
WARN(...args); // Threshold: -500
ERROR(...args); // Threshold: -1000
LOG(...args); // Alias for BOOT
```

## Common Lifecycle Hooks

```javascript
// Initialization
Actinium.Hook.register('init', async (app, options) => {
  // After initialization, before server starts
});

// Plugin lifecycle
Actinium.Hook.register('install', async (plugin, req) => {
  // First time plugin saved to database
});

Actinium.Hook.register('activate', async (plugin, req) => {
  // Plugin activated
});

Actinium.Hook.register('schema', async (plugin, req) => {
  // Define/update database schemas
  Actinium.Collection.register(
    'MyCollection',
    {
      create: true,
      retrieve: true,
      update: true,
      delete: true,
    },
    {
      fieldName: { type: 'String' },
    }
  );
});

Actinium.Hook.register('update', async (plugin, req, oldPlugin) => {
  // Plugin version increased
});

// Server lifecycle
Actinium.Hook.register('start', async () => {
  // Server starting
});

Actinium.Hook.register('running', async () => {
  // Server fully operational
});

// Parse Object hooks
Actinium.Hook.register('beforeSave', async (req) => {
  // Before any object save
});

Actinium.Hook.register('beforeSave_MyCollection', async (req) => {
  // Before specific collection save
});

Actinium.Hook.register('afterSave_MyCollection', async (req) => {
  // After specific collection save
});
```

## Database Schema Definition

```javascript
Actinium.Collection.register(
  'MyCollection', // Collection name
  {
    // Actions (maps to capabilities)
    create: true,
    retrieve: true,
    update: true,
    delete: true,
    addField: false, // Prevent schema changes
  },
  {
    // Schema definition
    fieldName: {
      type: 'String',
      required: true,
      default: 'default value',
    },
    numberField: {
      type: 'Number',
    },
    relationField: {
      type: 'Relation',
      targetClass: 'OtherCollection',
    },
    pointerField: {
      type: 'Pointer',
      targetClass: '_User',
    },
  }
);
```

---

# Framework Architecture

## Critical Architectural Findings

### 1. Actinium Extends Parse, Not Express

**Source**: `/api/actinium_modules/@atomic-reactor/actinium-core/actinium.js:34`

```javascript
Actinium = { ...Parse };
```

**Critical Insight**: Actinium spreads all Parse SDK methods into its global object:

- All `Parse.*` methods available as `Actinium.*`
- `Actinium.Query` = `Parse.Query`
- `Actinium.Object` = Extended `Parse.Object` (with hooks)
- Parse Server is the data layer, not a separate service
- Express is the HTTP layer, Parse handles data/auth

### 2. Global-First Design Pattern

The framework creates multiple global objects accessible everywhere:

```javascript
global.Actinium = {};
global.ENV = {...};
global.PORT = 3030;
global.BASE_DIR = '/path/to/project';
global.SRC_DIR = '/path/to/project/src';
global.APP_DIR = '/path/to/project/src/app';
global.CORE_DIR = '/path/to/actinium-core';
global.CLOUD_FUNCTIONS = [];
global.FEATURES = new Registry('Features');
```

**Design Philosophy**: No imports needed for core framework objects in plugin code.

### 3. Initialization Sequence

**Phase 1: `Actinium.init(options)`**

```javascript
1. Create Express app
2. Initialize Express settings
3. Auto-discover and initialize Middlewares
4. Auto-discover and initialize Plugins
5. Initialize FileAdapter
6. Initialize Settings
7. Initialize Type system
8. Set Actinium.ready = true
9. Run 'init' hook
10. Run 'live-query-classnames' hook
```

**Phase 2: `Actinium.start(options)`**

```javascript
1. Create HTTP/HTTPS server
2. Start listening on PORT
3. Start Live Query Server (if enabled)
4. Load Settings from database
5. Load Plugins from database
6. Load User Roles
7. Load Capabilities
8. Run 'schema' hook (runtime schema initialization)
9. Load Collection Schemas
10. Run 'start' hook
11. Run tests in development
12. Run 'warnings' hook
13. Set Actinium.running = true
14. Run 'running' hook
```

**Key Hook Execution Order**:

1. `init` - After initialization, before server starts
2. `live-query-classnames` - Configure live query classes
3. `schema` - Runtime schema initialization
4. `start` - Server starting
5. `running` - Server fully operational

### 4. Complete Actinium Object Structure

```javascript
Actinium = { ...Parse }; // Start with all Parse SDK methods

// Core properties
Actinium.ready = false;
Actinium.started = false;
Actinium.server = null;
Actinium.version = '5.1.18';
Actinium.app = express();

// Core modules
Actinium.Utils = ActiniumUtils;
Actinium.Hook = ActiniumHook;
Actinium.Object = ActiniumObject; // Extended Parse.Object
Actinium.User = ActiniumUser;
Actinium.Enums = ActiniumEnums;
Actinium.Cache = ActiniumCache;
Actinium.File = ActiniumFile;
Actinium.Setting = ActiniumSetting;
Actinium.Roles = ActiniumRoles;
Actinium.Cloud = ActiniumCloud;
Actinium.Plugin = ActiniumPlugin;
Actinium.Middleware = ActiniumMiddleware;
Actinium.Pulse = ActiniumPulse; // Pub/sub event system
Actinium.Collection = ActiniumCollection;
Actinium.Type = ActiniumType;
Actinium.Capability = ActiniumCapabilities;

// Convenience aliases
Actinium.User.isRole = Actinium.Roles.User.is;
Actinium.User.can = Actinium.Capability.User.can;
Actinium.User.capabilities = Actinium.Capability.User.get;
```

---

# Plugin System

## Plugin Discovery

**Auto-Discovery Glob Patterns**:

```javascript
plugins: [
  `${ACTINIUM_DIR}/plugin/**/*plugin.js`, // Core plugins
  `${BASE_DIR}/node_modules/**/actinium/*plugin.js`, // NPM plugins
  `${BASE_DIR}/actinium_modules/**/*plugin.js`, // actinium_modules
  `${APP_DIR}/**/*plugin.js`, // App plugins
];
```

**Search Order**:

1. Core plugins in `actinium-core/plugin/`
2. Node modules with actinium plugins
3. `actinium_modules/` directory
4. Application plugins in `src/app/`

## Plugin Structure

### Minimal Plugin

```
src/app/my-plugin/
├── info.js          # Plugin metadata (required)
└── plugin.js        # Plugin registration (required)
```

### Full Plugin

```
src/app/my-plugin/
├── info.js          # Plugin metadata
├── plugin.js        # Plugin registration and cloud functions
├── sdk.js           # Plugin SDK methods
├── middleware.js    # Express middleware
├── service.js       # Business logic service
├── schema.js        # Database schema definitions
└── plugin-assets/   # Frontend assets
    ├── logo.svg
    ├── script.js
    └── style.css
```

## Plugin Registration

### Registration Implementation

```javascript
Plugable.register = (plugin, active = false) => {
  const ID = op.get(plugin, 'ID');
  plugin['active'] = active;

  // Validate plugin ID
  if (!ID || blacklist.includes(ID)) return;

  // Core plugins auto-detection
  if (callerFileName && isInCoreDirectory(callerFileName)) {
    op.set(plugin, 'meta.builtIn', true);
    op.set(plugin, 'meta.group', 'core');
    op.set(plugin, 'version.actinium', `>=${ACTINIUM_CONFIG.version}`);
  }

  // Store in cache if valid
  if (_isValid(plugin)) {
    Actinium.Cache.set(`plugins.${ID}`, plugin);
  }
};
```

**Key Features**:

- Uses stack trace to detect core plugins
- Core plugins marked as `builtIn: true`
- Version validation with semver
- Plugins cached with key `plugins.{ID}`

## Plugin Gating

**Critical Pattern**: Every Cloud Function defined with `Actinium.Cloud.define()` is automatically wrapped with a plugin gate:

```javascript
Cloud.define = (plugin, name, callback) => {
  Parse.Cloud.define(name, (req) =>
    Actinium.Plugin.gate({ req, ID: plugin, name, callback })
  );
  CLOUD_FUNCTIONS.push({ name });
};

Plugable.gate = async ({ req, ID, name, callback }) => {
  if (Plugable.isValid(ID, true) !== true) {
    return Promise.reject(`Plugin: ${ID} is not active.`);
  }
  return callback(req);
};
```

**Result**: If plugin is inactive, cloud functions throw errors automatically.

## Plugin Lifecycle Hooks

```javascript
// Parse.Cloud.beforeSave('Plugin', ...)
if (req.object.isNew()) {
  await Actinium.Hook.run('install', obj, req);
  if (active) {
    await Actinium.Hook.run('schema', obj, req);
    await Actinium.Hook.run('activate', obj, req);
  }
} else {
  // Existing plugin
  if (versionIncreased) {
    await Actinium.Hook.run('update', obj, req, old);
  }
  if (activatedNow) {
    await Actinium.Hook.run('schema', obj, req);
    await Actinium.Hook.run('activate', obj, req);
  }
  if (deactivatedNow) {
    await Actinium.Hook.run('deactivate', obj, req);
  }
}
```

**Lifecycle Hooks**:

- `install` - First time plugin saved to database
- `schema` - Plugin needs to create/update schemas
- `activate` - Plugin activated
- `update` - Plugin version increased
- `deactivate` - Plugin deactivated
- `uninstall` - Plugin deleted

## Plugin Update Migrations

```javascript
// Helper for version-based migrations
const migrations = {
  '1.0.6': {
    migration: async (plugin, req, oldPlugin) => {
      // Update schemas, migrate data, etc.
    },
  },
  '1.0.5': {
    migration: async (plugin, req, oldPlugin) => {
      // Earlier version migration
    },
  },
};

Actinium.Hook.register(
  'update',
  Actinium.Plugin.updateHookHelper('MY_PLUGIN', migrations)
);
```

---

# Hook System

## Hook Architecture

### Internal Data Structure

```javascript
const Hook = {
  action: {
    async: {
      'hook-name': {
        'uuid-1': { id: 'uuid-1', order: -1000, callback: fn },
        'uuid-2': { id: 'uuid-2', order: 0, callback: fn },
      },
    },
    sync: {
      'sync-hook': {
        'uuid-4': { id: 'uuid-4', order: 0, callback: fn },
      },
    },
  },
  actionIds: {}, // Maps hook IDs to action paths
};
```

### Hook Registration

```javascript
Hook._register =
  (type = 'async') =>
  (
    name,
    callback,
    order = Enums.priority.neutral, // Default: 0
    id
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

### Hook Execution

```javascript
Hook.run = async (name, ...params) => {
  const context = { hook: name, params };

  // Sort hooks by order (lower = earlier)
  const actions = _.sortBy(
    Object.values(op.get(Hook.action, `async.${name}`, {})),
    'order'
  );

  try {
    await ActionSequence({ actions, context });
    return context;
  } catch (errors) {
    // Log errors but don't crash server
    Object.entries(errors).forEach(([id, error]) => {
      ERROR(`Error in action.${name}[${id}]`);
      ERROR(error);
    });
  }
};
```

**Key Features**:

1. Hooks sorted by `order` (lower = earlier)
2. All hooks receive `(...params, context)` where context = `{ hook, params }`
3. Uses `action-sequence` library for async orchestration
4. Errors caught and logged, don't crash server
5. Sync hooks fail immediately on error

### Hook Management

```javascript
// Unregister specific hook
Hook.unregister(hookId);

// Flush all hooks for a name
Hook.flush('hook-name', 'async');
```

---

# Cloud Functions

## Cloud Function Discovery

**Auto-Discovery Patterns**:

```javascript
cloud: [
  `${ACTINIUM_DIR}/cloud/**/*.js`,
  `${BASE_DIR}/node_modules/**/actinium/*cloud.js`,
  `${BASE_DIR}/actinium_modules/**/*cloud.js`,
  `${APP_DIR}/**/*cloud.js`,
];
```

**Modern Pattern**: Define cloud functions directly in `plugin.js` using `Actinium.Cloud.define()` rather than separate `cloud.js` files.

## Cloud Function Definition

### With Plugin Gating (Recommended)

```javascript
Actinium.Cloud.define(PLUGIN.ID, 'functionName', async (req) => {
  const { param1, param2 } = req.params;
  const user = req.user; // Parse.User or undefined
  const master = req.master; // true if using master key

  // Capability check
  const { CloudHasCapabilities } = Actinium.Utils;
  if (!CloudHasCapabilities(req, 'feature.use')) {
    throw new Error('Permission denied');
  }

  // Business logic
  return { success: true };
});
```

### Without Plugin Gating (Core Only)

```javascript
Parse.Cloud.define('coreFunctionName', async (req) => {
  // Only use for framework core functions
  // Not gated by plugin activation
});
```

## Capability-Based Authorization

### CloudHasCapabilities

```javascript
const { CloudHasCapabilities } = Actinium.Utils;

// Single capability
if (!CloudHasCapabilities(req, 'admin.access')) {
  throw new Error('Permission denied');
}

// Multiple capabilities (strict - ALL required)
if (!CloudHasCapabilities(req, ['user.admin', 'role.admin'], true)) {
  throw new Error('Requires both capabilities');
}

// Multiple capabilities (permissive - ANY required)
if (!CloudHasCapabilities(req, ['content.edit', 'content.review'], false)) {
  throw new Error('Requires edit OR review capability');
}
```

**Parameters**:

- `req`: Cloud request object
- `capability`: String or array of capability names
- `strict`: When `true`, ALL capabilities required; when `false`, ANY suffices
- Returns: `boolean`

**Special Cases**:

- `req.master === true` → Always returns `true`
- User is `super-admin` → Always returns `true`
- No capabilities specified → Returns `false`

### CloudCapOptions

```javascript
// Get query options with capability-based master key escalation
const options = Actinium.Utils.CloudCapOptions(
  req,
  ['content.updateany', 'admin.access'], // Capabilities granting master key
  false, // strict: false = any capability grants access
  '>1000' // OR user level > 1000 grants access
);

// Use in queries
const query = new Actinium.Query('SecureData');
return query.find(options); // options.useMasterKey = true if authorized
```

**Result**: Returns `{ useMasterKey: true }` if:

1. `req.master === true`, OR
2. User is `super-admin`, OR
3. User has specified capabilities (respecting strict mode), OR
4. User's role level satisfies level requirement

### CloudRunOptions

```javascript
// Simpler escalation without capability check
const options = Actinium.Utils.CloudRunOptions(req);

// options.useMasterKey = true if:
// - req.master is true
// - user is super-admin
```

## Parse Triggers with Capabilities

```javascript
Actinium.Cloud.beforeSave('MyCollection', async (req) => {
  const { CloudHasCapabilities } = Actinium.Utils;

  if (!CloudHasCapabilities(req, 'mycollection.update')) {
    throw new Error('Permission denied');
  }

  // Validation logic
});

Actinium.Cloud.afterSave('MyCollection', async (req) => {
  // Post-save logic
});
```

---

# Capabilities System

> **Role-based authorization layer** for feature-level permissions

## Capabilities vs ACLs

| Aspect                | ACLs                               | Capabilities                              |
| --------------------- | ---------------------------------- | ----------------------------------------- |
| **Level**             | Object-level (per document)        | Feature/Action-level (system-wide)        |
| **Granularity**       | Specific database records          | Broad permissions                         |
| **Storage**           | On each Parse Object               | Centralized in Capability collection      |
| **Use Case**          | "Can this user edit THIS article?" | "Can this user edit articles in general?" |
| **Parse Integration** | Built into Parse (CLP/ACL)         | Actinium layer on top                     |
| **Check Location**    | Database query time                | Cloud function entry / UI render          |
| **Performance**       | Enforced by Parse Server           | Requires explicit checks                  |

**Best Practice**: Use capabilities for feature-level permissions, ACLs for object-level security.

## Capability Database Schema

```javascript
{
    collection: 'Capability',
    schema: {
        group: {
            type: 'String',           // Capability name (e.g., "user.view")
        },
        allowed: {
            type: 'Relation',         // Parse Relation to _Role
            targetClass: '_Role',
        },
        excluded: {
            type: 'Relation',         // Parse Relation to _Role
            targetClass: '_Role',
        },
    },
    indexes: ['group'],
}
```

## Special Roles

1. **`super-admin`**:

   - ALWAYS has ALL capabilities
   - Cannot be excluded
   - Bypasses all capability checks
   - Gets `useMasterKey: true` in queries

2. **`administrator`**:

   - Automatically in ALL capability `allowed` lists
   - Can be explicitly excluded
   - Gets `useMasterKey: true` unless excluded

3. **`banned`**:

   - Always in ALL capability `excluded` lists
   - Cannot be granted capabilities
   - Used to revoke all access

4. **`anonymous`**:
   - Added to every user's role list
   - Used for unauthenticated user capabilities

## Capability Normalization

```javascript
const normalizeCapability = (capabilityObj = {}) => {
  let allowed = op.get(capabilityObj, 'allowed', []) || [];
  let excluded = op.get(capabilityObj, 'excluded', []) || [];

  // banned always excluded, super-admin never excluded
  excluded = _.uniq([...excluded, 'banned']).filter(
    (role) => role !== 'super-admin'
  );

  // administrator and super-admin always in allowed
  allowed = _.uniq([...allowed, 'administrator', 'super-admin']).filter(
    (role) => !excluded.includes(role)
  );

  return { ...capabilityObj, allowed, excluded };
};
```

## Built-in Capabilities

### Collection CRUD Capabilities

Every registered collection automatically gets:

```javascript
// For collection 'MyCollection':
'MyCollection.create'; // Create new objects
'MyCollection.retrieve'; // Read/query objects
'MyCollection.update'; // Update existing objects
'MyCollection.delete'; // Delete objects
'MyCollection.addField'; // Modify schema
```

### Content Type Capabilities

Content types get extended capabilities:

```javascript
// For content type 'article':
'content.article.create';
'content.article.retrieve';
'content.article.retrieveany'; // View any user's content
'content.article.update';
'content.article.updateany'; // Edit any user's content
'content.article.delete';
'content.article.deleteany'; // Delete any user's content
'content.article.addField';

// Publisher workflow capabilities:
'Content_article.publish';
'Content_article.unpublish';
'Content_article.setstatus-DRAFT';
'Content_article.setstatus-PUBLISHED';
```

## Capability Registration

```javascript
// Minimal (admin/super-admin only)
Actinium.Capability.register('my-feature.use', {});

// With allowed roles
Actinium.Capability.register('my-feature.view', {
  allowed: ['contributor', 'moderator', 'user'],
});

// With excluded roles
Actinium.Capability.register('my-feature.admin', {
  allowed: ['moderator'],
  excluded: ['contributor'],
});

// With priority
Actinium.Capability.register(
  'critical-feature.access',
  { allowed: ['user'] },
  Actinium.Enums.priority.highest
);
```

## Server-Side Capability Checks

### Pattern 1: CloudHasCapabilities

```javascript
Actinium.Cloud.define(PLUGIN.ID, 'admin-function', async (req) => {
  const { CloudHasCapabilities } = Actinium.Utils;

  // Strict check (ALL required)
  if (!CloudHasCapabilities(req, ['admin.users', 'admin.roles'], true)) {
    throw new Error('Requires both user and role admin');
  }

  // Permissive check (ANY required)
  if (!CloudHasCapabilities(req, ['content.edit', 'content.review'], false)) {
    throw new Error('Requires edit or review capability');
  }
});
```

### Pattern 2: CloudCapOptions Escalation

```javascript
Actinium.Cloud.define('MyPlugin', 'privileged-query', async (req) => {
  const options = Actinium.Utils.CloudCapOptions(
    req,
    ['admin.access', 'manager.access'], // Either capability escalates
    false // strict: false = any capability grants access
  );

  const query = new Actinium.Query('SecureData');
  return query.find(options); // Uses master key if authorized
});
```

## Client-Side Capability Checks

### React Hook

```javascript
import { useCapabilityCheck } from 'reactium-core/sdk';

const AdminPanel = () => {
  const canManageUsers = useCapabilityCheck(['user.admin'], true);
  const canEdit = useCapabilityCheck(['content.article.update'], true);

  if (!canManageUsers) {
    return <div>Access Denied</div>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      {canEdit && <EditButton />}
    </div>
  );
};
```

### SDK Direct Usage

```javascript
import Reactium from 'reactium-core/sdk';

// Check single capability
const canPublish = await Reactium.Capability.check('content.article.publish');

// Check multiple (strict: need all)
const isAdmin = await Reactium.Capability.check(
  ['user.admin', 'role.admin'],
  true
);

// Check multiple (permissive: need any)
const canEditContent = await Reactium.Capability.check(
  ['content.article.update', 'content.updateany'],
  false
);
```

### Bulk Capability Checks

```javascript
const checks = {
  canCreate: { capabilities: ['user.create'] },
  canUpdate: { capabilities: ['user.update'] },
  canDelete: { capabilities: ['user.delete'] },
};

const { canCreate, canUpdate, canDelete } = await Reactium.Cloud.run(
  'capability-bulk-check',
  { checks }
);
```

## Capability Naming Conventions

### Standard Patterns

1. **Collection CRUD**: `{Collection}.{action}`

   - Example: `_User.create`, `Media.retrieve`

2. **Content Types**: `content.{typename}.{action}`

   - Example: `content.article.update`, `content.page.publish`

3. **Content Collection**: `Content_{typename}.{action}`

   - Example: `Content_article.setstatus-DRAFT`

4. **Feature Access**: `{feature}.{action}`

   - Example: `type-ui.view`, `mail.send`

5. **Workflow States**: `{collection}.{action}-{state}`
   - Example: `Content_article.setstatus-PUBLISHED`

### Case Sensitivity

**All capability names normalized to lowercase**:

```javascript
'User.View' → 'user.view'
'Content.Article.Update' → 'content.article.update'
'_Role.create' → 'role.create'  // Leading underscore removed
```

## Performance Considerations

### 1. Memory Caching

Capabilities loaded once at startup and cached:

```javascript
// Initial load: ~100-500ms for 100+ capabilities
// Subsequent checks: O(1) lookup in memory registry
```

### 2. Client-Side Caching

```javascript
// Default cache: 60 seconds
Reactium.Capability.cache = 60000;

// Clear cache
Reactium.Capability.clearCache();
```

**Cache cleared on**:

- User login/logout
- Capability grants/revokes
- Manual `clearCache()` call
- Cache expiry

### 3. Bulk Checks for Performance

```javascript
// INEFFICIENT (3 separate requests)
const canCreate = await Reactium.Capability.check('user.create');
const canUpdate = await Reactium.Capability.check('user.update');
const canDelete = await Reactium.Capability.check('user.delete');

// BETTER (1 bulk request)
const checks = {
  canCreate: { capabilities: ['user.create'] },
  canUpdate: { capabilities: ['user.update'] },
  canDelete: { capabilities: ['user.delete'] },
};
const result = await Reactium.Cloud.run('capability-bulk-check', { checks });
```

## Capability Integration with Parse

### Class-Level Permissions (CLP)

Capabilities automatically configure Parse Server CLPs:

```javascript
// Actinium syncs capabilities to Parse CLP
const allowed = op.get(currentCap, 'allowed', []);

allowed.forEach((role) => {
  classLevelPermissions[capability][`role:${role}`] = true;
});

// Public if anonymous allowed
if (allowed.includes('anonymous')) {
  classLevelPermissions[capability]['*'] = true;
}
```

### CLP Mapping

| Capability  | Parse CLP Operations   |
| ----------- | ---------------------- |
| `.create`   | `create`               |
| `.retrieve` | `find`, `count`, `get` |
| `.update`   | `update`               |
| `.delete`   | `delete`               |
| `.addField` | `addField`             |

### Capability-Driven ACLs

```javascript
// Create ACL from capabilities
const groupACL = await Actinium.Utils.CloudACL(
  [
    { permission: 'read', type: 'public', allow: true },
    { permission: 'write', type: 'user', objectId: user.id },
  ],
  'content.article.retrieve', // Read capability
  'content.article.update' // Write capability
);

article.setACL(groupACL);
```

**How it works**:

1. Fetches all roles with specified capabilities
2. Adds roles to ACL with appropriate permissions
3. Combines with explicit user/role/public permissions
4. Returns Parse.ACL ready to attach

---

# Source Code Insights

## Parse Object Hook Integration

Actinium replaces `Parse.Object` with extended version that auto-fires hooks:

```javascript
class ParseObject extends Parse.Object {
  async save(arg1, arg2, arg3, context) {
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

**Hook Execution Order for Save**:

1. `beforeSave` - Generic before save
2. `beforeSave_{ClassName}` - Class-specific
3. `beforeSave_content` - If class starts with `Content_`
4. **Actual save operation**
5. `afterSave` - Generic after save
6. `afterSave_{ClassName}` - Class-specific
7. `afterSave_content` - If class starts with `Content_`

## Middleware System

### Middleware Detection

```javascript
// String-based heuristic
const matches = [
  'Actinium.Middleware.register',
  'Actinium.Middleware.unregister',
];

const isMiddleware = (fileContent) =>
  matches.some((match) => String(fileContent).includes(match));
```

### Middleware Initialization

```javascript
mw.init = async (app) => {
  // 1. Auto-discover middleware files
  await Promise.all(
    globby(ENV.GLOB_MIDDLEWARE)
      .filter((file) => isMiddleware(fs.readFileSync(file, 'utf8')))
      .map(normalizeImportPath)
      .map((file) => import(file))
  );

  // 2. Sort by order (lower = earlier)
  const sorted = _.sortBy(mw.sort, 'order');

  // 3. Build action sequence
  const actions = sorted.reduce((acts, { callback, id }) => {
    acts[id] = () => callback(app);
    return acts;
  }, {});

  // 4. Replace middleware
  Object.entries(mw.replacements).forEach(([id, callback]) => {
    actions[id] = () => callback(app);
  });

  // 5. Unregister middleware
  mw.unregistered.forEach((id) => op.del(actions, id));

  // 6. Execute all middleware registrations
  return ActionSequence({ actions });
};
```

### Hook-Based Middleware

```javascript
// Register hook-based middleware
Actinium.Middleware.registerHook('plugin-assets', '/api/plugin-assets', -10000);

// Plugins can hook into this middleware
Actinium.Hook.register('plugin-assets-middleware', async (mw) => {
  mw.use((req, res, next) => {
    // Custom middleware logic
    next();
  });
});
```

## Environment Configuration

### Environment File Resolution

**Priority Order**:

1. `ACTINIUM_ENV_FILE` env var - Explicit file path
2. `ACTINIUM_ENV_ID` env var - Environment ID (e.g., `dev`, `prod`) → `src/env.{id}.json`
3. Default: `src/env.json`

### Environment Loading

```javascript
const env = {
  ...JSON.parse(fs.readFileSync(file, 'utf8')),
  ...process.env, // process.env overrides file
  PORT,
  SERVER_URI,
  PUBLIC_SERVER_URI,
};
```

**Key**: `process.env` variables override JSON file values.

## ES Module Import Path Normalization

```javascript
export const normalizeImportPath = (filePath) => {
  // Converts absolute paths to file:// URLs for ES module imports
  // Handles Windows vs. Unix path differences
};
```

**Why**: Plugin discovery works across different operating systems.

---

# Troubleshooting

## Common Issues

### 1. Plugin Cloud Functions Not Available

**Symptom**: Cloud function returns `Plugin: MyPlugin is not active` error

**Cause**: Plugin not marked as active or using wrong define method

**Solution**:

```javascript
// WRONG
Parse.Cloud.define('myFunction', callback);

// CORRECT
Actinium.Cloud.define(PLUGIN.ID, 'myFunction', callback);

// And register plugin with active=true
Actinium.Plugin.register(PLUGIN, true);
```

### 2. Hooks Not Executing

**Symptom**: Hook registered but callback never runs

**Causes**:

- Hook registered AFTER hook runs (timing issue)
- Wrong hook name
- Hook registered in inactive plugin

**Solutions**:

```javascript
// Register at highest priority to run early
Actinium.Hook.register('init', callback, Actinium.Enums.priority.highest);

// Verify hook name matches
Actinium.Hook.run('exact-hook-name', args);

// Ensure plugin is active
Actinium.Plugin.register(PLUGIN, true);
```

### 3. Capabilities Not Working

**Symptom**: User has role but capability check fails

**Causes**:

- Capability name case mismatch
- Capability not propagated to database
- User role cache stale

**Solutions**:

```javascript
// Always lowercase
const capability = 'myfeature.use'.toLowerCase();

// Force propagate
await Actinium.Capability.propagate();

// Clear user cache
Actinium.Cache.del(`capabilities_${user.id}`);
```

### 4. Schema Not Created

**Symptom**: Collection schema not in database

**Causes**:

- `schema` hook not registered
- Plugin inactive when schema hook runs
- Collection.register called after schema hook

**Solution**:

```javascript
// Register schema in 'schema' hook
Actinium.Hook.register('schema', async () => {
  if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

  Actinium.Collection.register(
    'MyCollection',
    {
      create: true,
      retrieve: true,
    },
    {
      fieldName: { type: 'String' },
    }
  );
});
```

### 5. Master Key Not Applied

**Symptom**: Query fails despite having capability

**Cause**: Using wrong options method

**Solution**:

```javascript
// WRONG
const options = { useMasterKey: true };

// CORRECT
const options = Actinium.Utils.CloudCapOptions(req, 'admin.access');

// OR
const options = Actinium.Utils.MasterOptions();
```

## Debugging Strategies

### 1. Enable Debug Logging

```javascript
// In .env
LOG_LEVEL = DEBUG;

// Or in code
ENV.LOG_LEVEL = 'DEBUG';

// Use logging
DEBUG('Debug message', data);
INFO('Info message', data);
WARN('Warning', data);
ERROR('Error', error);
```

### 2. Inspect Hook Execution

```javascript
Actinium.Hook.register(
  'hook-name',
  async (...args) => {
    DEBUG('Hook executed', { args });
  },
  Actinium.Enums.priority.highest,
  'debug-hook'
);
```

### 3. Check Plugin Status

```javascript
// In cloud function or hook
const isActive = Actinium.Plugin.isActive('PluginID');
DEBUG('Plugin active?', isActive);

// List all plugins
const plugins = Actinium.Cache.get('plugins');
DEBUG('Loaded plugins', Object.keys(plugins));
```

### 4. Verify Capabilities

```javascript
// Server-side
const userCaps = Actinium.Capability.User.get(req.user);
DEBUG(
  'User capabilities',
  userCaps.map((c) => c.group)
);

// Client-side
const caps = await Reactium.Capability.User.get();
console.log('User capabilities', caps);
```

### 5. Check Hook Registration

```javascript
// Inspect registered hooks
const hooks = Actinium.Hook.action;
DEBUG('Registered hooks', hooks);

// Check specific hook
const myHooks = op.get(Actinium.Hook.action, 'async.my-hook-name');
DEBUG('My hook handlers', Object.keys(myHooks));
```

## Best Practices

1. **Use CloudCapOptions for queries** - Automatic master key escalation
2. **Register capabilities at highest priority** - Ensures availability
3. **Always check plugin active state** - In hooks and cloud functions
4. **Use bulk capability checks** - Better performance
5. **Clear caches on user/role changes** - Prevent stale permissions
6. **Log security events** - Track unauthorized access attempts
7. **Validate hook names** - Use constants to prevent typos
8. **Test with different roles** - Verify capability checks work
9. **Document custom capabilities** - Help future developers
10. **Use TypeScript for capability constants** - Prevent naming errors

---

## Related Documentation

**See Also**:

- [ACTINIUM_FRAMEWORK.md](ACTINIUM_FRAMEWORK.md) - Original framework guide
- [FRAMEWORK_INTEGRATION.md](FRAMEWORK_INTEGRATION.md) - Reactium + Actinium integration
- [FRAMEWORK_PATTERNS.md](FRAMEWORK_PATTERNS.md) - Best practices and patterns
- [FRAMEWORK_GOTCHAS.md](FRAMEWORK_GOTCHAS.md) - Common pitfalls

**Source Code References**:

- `/api/actinium_modules/@atomic-reactor/actinium-core/actinium.js` - Main entry
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/plugable.js` - Plugin system
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/hook.js` - Hook system
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/cloud.js` - Cloud functions
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/capability.js` - Capability system
- `/api/actinium_modules/@atomic-reactor/actinium-core/lib/middleware.js` - Middleware

---

**Last Updated**: November 22, 2025
**Maintained By**: AI Documentation Steward
**Version**: Consolidated Reference v1.0
