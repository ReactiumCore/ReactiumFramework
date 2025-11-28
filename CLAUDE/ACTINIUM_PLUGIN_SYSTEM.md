<!-- v1.0.0 -->

# Actinium Plugin Management System

Complete documentation of Actinium's plugin lifecycle, registration, activation/deactivation mechanics, version management, metadata handling, and hook-driven extensibility.

## Architecture Overview

The Plugin system provides a database-backed, hook-driven architecture for managing server-side Actinium plugins with:

- **Discovery and Registration**: Globby-based file discovery (`ENV.GLOB_PLUGINS`) + `Plugin.register()` API
- **Database Storage**: Parse Server `Plugin` collection for persistent plugin state
- **Version Validation**: Semver-based compatibility checks against Actinium core version
- **Lifecycle Hooks**: `install`, `schema`, `activate`, `update`, `deactivate`, `uninstall`
- **Built-in Plugin Detection**: Core plugins auto-flagged based on `.core` directory location
- **Metadata and Assets**: File-based assets (logos, scripts, stylesheets) uploaded to Parse Server
- **Capability-Based Security**: Granular permissions for plugin operations

**Source**: `actinium-core/lib/plugable.js:1-731`, `actinium-core/cloud/actinium-plugin.js:1-292`

---

## Plugin Registration

### Basic Plugin Object

```javascript
const PLUGIN = {
    ID: 'MY_PLUGIN',                    // Required: Unique identifier
    name: 'My Plugin',                  // Display name for UI
    description: 'Plugin description',  // Markdown-supported summary
    order: 100,                         // Load order (lower = earlier)
    version: {
        actinium: '>=3.2.0',           // Semver range for Actinium compatibility
        plugin: '1.0.0',               // Plugin version (semver)
    },
    meta: {
        group: 'feature',              // Optional: Plugin category
        builtIn: false,                // Auto-set for core plugins
    },
};

Actinium.Plugin.register(PLUGIN, true); // Second param: default active state
```

**Source**: `actinium-core/lib/plugable.js:116-151`

### Built-in Plugin Detection

Plugins in the `.core` directory (relative to `BASE_DIR`) are automatically flagged:

```javascript
// Core plugins get special treatment (line 130-145)
if (callerFileName && !/^[.]{2}/.test(path.relative(coredir, callerFileName))) {
    op.set(meta, 'builtIn', true);
    if (!op.get(meta, 'group')) op.set(meta, 'group', 'core');

    // Core plugins always valid for current Actinium version
    op.set(version, 'actinium', `>=${ACTINIUM_CONFIG.version}`);

    // Core plugins without version follow Actinium core versioning
    if (!pluginVersion || !semver.valid(pluginVersion))
        op.set(version, 'plugin', ACTINIUM_CONFIG.version);
}
```

**Source**: `actinium-core/lib/plugable.js:130-145`

---

## Plugin Lifecycle

### 1. Discovery and Load (Boot Time)

```javascript
// Called during Actinium boot sequence
await Plugable.init();  // Discover plugins via ENV.GLOB_PLUGINS
await Plugable.load();  // Sync with database, run lifecycle hooks
```

**Load Sequence** (`Plugable.load()`, lines 260-352):

1. **Schema Creation**: Create/verify `Plugin` collection schema
2. **Database Sync**: Load existing plugins from Parse Server
3. **Merge State**: Combine cached plugin data with database state
4. **Active State Determination**: `existing.active` overrides `cached.active` default
5. **Hook Execution**: `plugin-before-save` hook for each plugin
6. **Database Save**: Persist merged plugin objects
7. **Plugin Load Hook**: `plugin-load` hook after successful save
8. **Cache Update**: `Actinium.Cache.set('plugins.{ID}', plugin)`

**Source**: `actinium-core/lib/plugable.js:260-352`

### 2. Installation (First Registration)

Triggered when plugin is first saved to database:

```javascript
// beforeSave hook (line 158-164)
if (req.object.isNew()) {
    await Actinium.Hook.run('install', obj, req);
    if (active) {
        Actinium.Cache.set(`plugins.${obj.ID}.active`, true);
        await Actinium.Hook.run('schema', obj, req);  // Create collections/schemas
        await Actinium.Hook.run('activate', obj, req); // Activate plugin
    }
}
```

**Source**: `actinium-core/cloud/actinium-plugin.js:158-164`

**Real-World Example** (Taxonomy Plugin):

```javascript
// Schema hook creates database collections
Actinium.Hook.register('schema', async ({ ID }) => {
    if (ID !== PLUGIN.ID) return;
    PLUGIN_SCHEMA.forEach(({ actions, collection, schema }) => {
        if (!collection) return;
        Actinium.Collection.register(collection, actions, schema);
    });
});
```

**Source**: `actinium-taxonomy/plugin.js:94-100`

### 3. Activation

Triggered when `active` changes from `false` to `true`:

```javascript
// Cloud function wraps toggle function
Parse.Cloud.define('plugin-activate', (req) => {
    op.set(req, 'params.active', true);
    return toggle(req);  // Updates active field in database
});

// beforeSave hook detects activation (line 186-190)
if (active === true && active !== prev) {
    Actinium.Cache.set(`plugins.${obj.ID}.active`, true);
    await Actinium.Hook.run('schema', obj, req);   // Recreate schemas if needed
    await Actinium.Hook.run('activate', obj, req); // Run activation logic
}
```

**Source**: `actinium-core/cloud/actinium-plugin.js:109-112, 186-190`

**Real-World Example** (Settings Plugin):

```javascript
// Save routes on activation
Actinium.Hook.register('activate', async ({ ID }) => {
    if (ID === PLUGIN.ID) {
        await saveRoutes();  // Create/update API routes
    }
});
```

**Source**: `actinium-settings/plugin.js:313-317`

### 4. Update (Version Change)

Triggered when plugin version increases:

```javascript
// beforeSave hook detects version upgrade (line 175-178)
if (active === true) {
    if (semver.gt(semver.coerce(version), semver.coerce(prevVer))) {
        await Actinium.Hook.run('update', obj, req, old);  // old = previous plugin object
    }
    if (semver.lt(semver.coerce(version), semver.coerce(prevVer))) {
        WARN(`Plugin ${obj.ID} new version ${version} is less than previous version ${prevVer}!`);
    }
}
```

**Source**: `actinium-core/cloud/actinium-plugin.js:175-183`

### 5. Deactivation

Triggered when `active` changes from `true` to `false`:

```javascript
// Cloud function
Parse.Cloud.define('plugin-deactivate', (req) => {
    op.set(req, 'params.active', false);
    return toggle(req);
});

// beforeSave hook detects deactivation (line 192-195)
if (active === false && active !== prev) {
    Actinium.Cache.set(`plugins.${obj.ID}.active`, false);
    await Actinium.Hook.run('deactivate', obj, req);
}
```

**Source**: `actinium-core/cloud/actinium-plugin.js:114-117, 192-195`

**Real-World Example** (Settings Plugin):

```javascript
// Remove routes on deactivation
Actinium.Hook.register('deactivate', async ({ ID }) => {
    if (ID === PLUGIN.ID) {
        for (const route of PLUGIN_ROUTES) {
            await Actinium.Route.delete(route);
        }
    }
});
```

**Source**: `actinium-settings/plugin.js:320-327`

### 6. Uninstallation

Triggered when plugin is deleted from database:

```javascript
// beforeDelete hook (line 121-133)
Parse.Cloud.beforeDelete(COLLECTION, async (req) => {
    const obj = req.object.toJSON();

    if (op.get(obj, 'meta.builtIn', false) === true) {
        return Promise.reject('Cannot delete or deactivate built in plugins');
    }

    await Actinium.Hook.run('beforeDelete-plugin', req);

    if (op.has(obj, 'ID')) {
        await Actinium.Plugin.deactivate(obj.ID);  // Deactivate before deletion
    }
});

// afterDelete hook (line 203-213)
Parse.Cloud.afterDelete(COLLECTION, async (req) => {
    const obj = req.object.toJSON();

    if (op.has(obj, 'ID')) {
        await Actinium.Hook.run('uninstall', obj);
        Actinium.Cache.del(`plugins.${obj.ID}`);
    }

    await Actinium.Hook.run('afterDelete-plugin', req);
});
```

**Source**: `actinium-core/cloud/actinium-plugin.js:121-133, 203-213`

---

## Plugin State Queries

### Check Active Status

```javascript
// Returns true if plugin is active, false otherwise
const isActive = Actinium.Plugin.isActive('MY_PLUGIN');

// Used throughout core plugins for feature gating
if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;
```

**Source**: `actinium-core/lib/plugable.js:359`

### Check Validity

```javascript
// Returns true if plugin is registered and version-compatible
const isValid = Actinium.Plugin.isValid('MY_PLUGIN');

// Strict mode: also checks if plugin is active
const isValidAndActive = Actinium.Plugin.isValid('MY_PLUGIN', true);
```

**Validation Logic** (line 26-52):

- Plugin ID exists and not blacklisted
- Plugin object exists
- Actinium version satisfies plugin's `version.actinium` semver range
- If `strict=true`, plugin must also be active

**Source**: `actinium-core/lib/plugable.js:26-52, 361-364`

### Get Plugin Data

```javascript
// Get single plugin
const plugin = Actinium.Plugin.get('MY_PLUGIN');
// Returns: { ID, name, description, order, version, meta, active, ... }

// Get all plugins
const allPlugins = Actinium.Plugin.get();
// Returns: { 'MY_PLUGIN': {...}, 'OTHER_PLUGIN': {...}, ... }
```

**Source**: `actinium-core/lib/plugable.js:354-358`

### Gate Cloud Functions

```javascript
// Wrapper that rejects if plugin is not active
Actinium.Cloud.define(PLUGIN.ID, 'my-function', (req) => {
    return Actinium.Plugin.gate({
        req,
        ID: PLUGIN.ID,
        name: 'my-function',
        callback: async (req) => {
            // Function logic runs only if plugin is active
            return doWork(req.params);
        }
    });
});
```

**Source**: `actinium-core/lib/plugable.js:366-372`

---

## Metadata and Asset Management

### File-Based Assets

Plugins can upload files (logos, scripts, stylesheets) to Parse Server and store URLs in plugin metadata:

```javascript
// Register logo image (appears in plugin manager UI)
Actinium.Plugin.addLogo(
    PLUGIN.ID,
    path.resolve(__dirname, 'plugin-assets/logo.svg')
);
// Stores URL at: plugin.meta.assets.admin.logo

// Register browser JavaScript bundle
Actinium.Plugin.addScript(
    PLUGIN.ID,
    path.resolve(__dirname, 'plugin-assets/bundle.js')
);
// Stores URL at: plugin.meta.assets.admin.script

// Register CSS stylesheet
Actinium.Plugin.addStylesheet(
    PLUGIN.ID,
    path.resolve(__dirname, 'plugin-assets/styles.css')
);
// Stores URL at: plugin.meta.assets.admin.style

// Custom asset path
Actinium.Plugin.addMetaAsset(
    PLUGIN.ID,
    path.resolve(__dirname, 'worker.js'),
    'webworkerURL'  // Custom object path
);
// Stores URL at: plugin.meta.assets.admin.webworkerURL
```

**Source**: `actinium-core/lib/plugable.js:154-234`

### Asset Upload Lifecycle

Assets are uploaded during `activation` and `update` hooks:

```javascript
// addMetaAsset registers hooks (line 210-218)
Actinium.Hook.register('plugin-before-save', async (data, obj, existing) =>
    installMissingAsset(data, obj, existing),  // Check if asset needs uploading
);

Actinium.Hook.register('activate', async (data, req) =>
    installAsset(data, req.object),  // Upload on activation
);

Actinium.Hook.register('update', async (data, req) =>
    installAsset(data, req.object),  // Re-upload on update
);
```

**Upload Process** (lines 165-193):

1. Check if this is the correct plugin ID
2. Run `add-meta-asset` hook (allows filename transformation)
3. Upload file to Parse Server via `Actinium.File.create()`
4. Strip server URI prefix from URL
5. Store URL in plugin metadata object path
6. Save plugin object with updated metadata

**Source**: `actinium-core/lib/plugable.js:165-218`

### Filename Versioning Hook

```javascript
// Default hook adds plugin version to filenames for cache busting
Actinium.Hook.register('add-meta-asset', async (metaAsset) => {
    const parsedFilename = path.parse(metaAsset.targetFileName);
    const plugin = Actinium.Cache.get(`plugins.${metaAsset.ID}`);
    const version = op.get(plugin, 'version.plugin', appVer);
    const { name, ext } = parsedFilename;

    // logo.svg → logo-1.0.0.svg
    metaAsset.targetFileName = `${name}-${version}${ext}`;
}, Actinium.Enums.priority.highest);
```

**Source**: `actinium-core/cloud/actinium-plugin.js:219-230`

**MetaAsset Object Structure**:

```javascript
{
    ID: 'MY_PLUGIN',                      // Plugin ID
    filePath: '/path/to/source/file.js',  // Local file path
    objectPath: 'meta.assets.admin.scriptURL', // Where to store URL
    targetPath: 'plugins/MY_PLUGIN',      // Parse file URI path
    targetFileName: 'file.js'             // Parse file name (modifiable by hooks)
}
```

**Source**: `actinium-core/lib/plugable.js:168-174`

---

## Version Management and Migrations

### updateHookHelper Pattern

Helper function for running multiple version-specific migration scripts:

```javascript
const migrations = {
    '1.0.4': {
        migration: async (plugin, req, oldPlugin) => {
            console.log('Upgrade from <1.0.4');
            // Run schema changes, data migrations, etc.
        }
    },
    '1.0.5': {
        test: async (newVer, oldVer) => {
            // Custom test function (optional)
            return semver.gt(newVer, '1.0.4') && semver.lt(oldVer, '1.0.5');
        },
        migration: async (plugin, req, oldPlugin) => {
            console.log('Upgrade to 1.0.5');
        }
    },
    '1.0.6': {
        migration: async (plugin, req, oldPlugin) => {
            console.log('Upgrade to 1.0.6');
        }
    },
};

// Register helper on update hook
Actinium.Hook.register('update', Actinium.Plugin.updateHookHelper('MY_PLUGIN', migrations));
```

**Execution Logic** (lines 384-411):

1. Sort migration versions with `semver.coerce()` and `semver.gt()`
2. For each version, check `test()` function (default: `semver.gt(version, oldVer)`)
3. If test returns truthy, run `migration()` function
4. Passes `(current, req, old)` to migration function

**Use Case**: If upgrading from `1.0.3` to `1.0.6`, migrations for `1.0.4`, `1.0.5`, and `1.0.6` all run sequentially.

**Source**: `actinium-core/lib/plugable.js:384-411`

---

## Plugin Collection Schema

```javascript
// Database schema for Plugin collection (line 56-75)
schema.addBoolean('active');      // Activation state
schema.addNumber('order');        // Load order
schema.addObject('meta');         // Metadata (group, builtIn, assets, etc.)
schema.addString('description');  // Markdown description
schema.addString('ID');           // Unique identifier
schema.addString('name');         // Display name
schema.addString('version');      // Plugin version (string)
```

**Source**: `actinium-core/lib/plugable.js:56-75`

**Field Restrictions** (enforced in beforeSave, line 142-156):

Only these fields are allowed on Plugin objects. All others are unset before save.

---

## Capability-Based Security

### Plugin Collection Capabilities

```javascript
// Registered on init (line 77-112)
Plugable.capabilities = [
    {
        capability: 'Plugin.create',
        roles: {},  // No default roles (admin only via CLP)
    },
    {
        capability: 'Plugin.retrieve',
        roles: {
            allowed: ['anonymous'],  // Anyone can list plugins
        },
    },
    {
        capability: 'Plugin.update',
        roles: {},
    },
    {
        capability: 'Plugin.delete',
        roles: {},
    },
    {
        capability: 'Plugin.addField',
        roles: {},
    },
    {
        capability: 'plugin-ui.view',
        roles: {
            allowed: ['super-admin', 'administrator'],
        },
    },
    {
        capability: 'plugins.activate',
        roles: {
            allowed: ['super-admin', 'administrator'],
        },
    },
];
```

**Source**: `actinium-core/lib/plugable.js:77-112`

### Cloud Function Security

```javascript
// plugin-activate/plugin-deactivate require multiple capabilities
const options = CloudCapOptions(
    req,
    ['plugin.view', 'plugin.activate', 'plugin.deactivate'],
    true  // Strict: ALL capabilities required
);
```

**Source**: `actinium-core/cloud/actinium-plugin.js:16-20`

---

## Cloud Functions

### plugins

List all plugins with pagination:

```javascript
const result = await Actinium.Cloud.run('plugins', {
    page: 1,      // Optional: page number (0-indexed for load-all)
    limit: 1000,  // Optional: results per page (max 1000)
});

// Returns:
{
    timestamp: 1234567890,
    limit: 1000,
    page: 1,
    pages: 3,
    total: 2500,
    plugins: [
        { ID, name, description, version, active, meta, ... },
        ...
    ]
}
```

**Load-All Pattern**: Set `page: 0` or omit to load all plugins (ignores pagination).

**Source**: `actinium-core/cloud/actinium-plugin.js:56-107`

### plugin-activate

```javascript
const plugin = await Actinium.Cloud.run('plugin-activate', {
    plugin: 'MY_PLUGIN'  // Plugin ID
});
// Returns updated plugin object
```

**Hooks Fired**: `plugin-before-save`, `schema`, `activate`

**Source**: `actinium-core/cloud/actinium-plugin.js:109-112`

### plugin-deactivate

```javascript
const plugin = await Actinium.Cloud.run('plugin-deactivate', {
    plugin: 'MY_PLUGIN'
});
// Returns updated plugin object
```

**Hooks Fired**: `plugin-before-save`, `deactivate`

**Source**: `actinium-core/cloud/actinium-plugin.js:114-117`

### plugin-uninstall

```javascript
const plugin = await Actinium.Cloud.run('plugin-uninstall', {
    plugin: 'MY_PLUGIN'
});
// Returns deleted plugin object
```

**Hooks Fired**: `beforeDelete-plugin`, `deactivate`, `uninstall`, `afterDelete-plugin`

**Protection**: Built-in plugins (`meta.builtIn === true`) cannot be uninstalled.

**Source**: `actinium-core/cloud/actinium-plugin.js:119, 121-133`

---

## Hook Reference

### Lifecycle Hooks

| Hook Name | When Fired | Parameters | Use Case |
|-----------|------------|------------|----------|
| `install` | Plugin first saved to DB | `(obj, req)` | Initial setup, default data creation |
| `schema` | After install or activation | `(obj, req)` | Create/update database schemas |
| `activate` | Plugin activated | `(obj, req)` | Enable features, save routes, register capabilities |
| `update` | Plugin version increased | `(obj, req, old)` | Run migrations, update schemas |
| `deactivate` | Plugin deactivated | `(obj, req)` | Clean up routes, disable features |
| `uninstall` | Plugin deleted from DB | `(obj)` | Remove data, clean up files |
| `plugin-load` | After plugin saved during boot | `(plugin)` | Post-load initialization |

**Source**: `actinium-core/cloud/actinium-plugin.js:158-216`

### Save/Delete Hooks

| Hook Name | When Fired | Parameters |
|-----------|------------|------------|
| `plugin-before-save` | Before plugin object saved | `(data, obj, existing, cached)` |
| `beforeSave-plugin` | Before any plugin save | `(req)` |
| `afterSave` | After plugin saved | `(req)` |
| `beforeDelete-plugin` | Before plugin deleted | `(req)` |
| `afterDelete-plugin` | After plugin deleted | `(req)` |

**Source**: `actinium-core/cloud/actinium-plugin.js:135-217`, `actinium-core/lib/plugable.js:324-331`

### Asset Management Hooks

| Hook Name | When Fired | Parameters | Use Case |
|-----------|------------|------------|----------|
| `add-meta-asset` | Before file upload | `(metaAsset)` | Modify filename, add version suffix |

**Source**: `actinium-core/lib/plugable.js:176, 514-523`

### List Hook

| Hook Name | When Fired | Parameters | Use Case |
|-----------|------------|------------|----------|
| `plugins-list` | After plugins cloud function | `(list)` | Modify plugin list response |

**Source**: `actinium-core/cloud/actinium-plugin.js:104`

---

## Real-World Plugin Patterns

### Pattern 1: Core Plugin with Full Lifecycle

```javascript
import PLUGIN_ROUTES from './routes.js';

const PLUGIN = {
    ID: 'Settings',
    description: 'Settings plugin used to manage application settings',
    name: 'Settings Plugin',
    order: Actinium.Enums.priority.highest * 10,  // Load early
    version: {
        actinium: '>=3.2.6',
        plugin: '1.0.0',
    },
    meta: {
        group: 'core',
        builtIn: true,
    },
};

Actinium.Plugin.register(PLUGIN, true);  // Active by default

// Save routes on activation
Actinium.Hook.register('activate', async ({ ID }) => {
    if (ID === PLUGIN.ID) {
        await saveRoutes();
    }
});

// Remove routes on deactivation
Actinium.Hook.register('deactivate', async ({ ID }) => {
    if (ID === PLUGIN.ID) {
        for (const route of PLUGIN_ROUTES) {
            await Actinium.Route.delete(route);
        }
    }
});

// Update routes on startup
Actinium.Hook.register('start', async () => {
    if (Actinium.Plugin.isActive(PLUGIN.ID)) {
        await saveRoutes();
    }
});

// Update routes on plugin update
Actinium.Hook.register('update', async ({ ID }) => {
    if (ID === PLUGIN.ID) {
        await saveRoutes();
    }
});
```

**Source**: `actinium-settings/plugin.js:12-341`

### Pattern 2: Schema Registration on Activation

```javascript
const PLUGIN_SCHEMA = [
    {
        collection: 'Taxonomy',
        actions: {
            create: false,
            retrieve: false,
            update: false,
            delete: false,
            addField: false,
        },
        schema: {
            name: { type: 'String' },
            slug: { type: 'String' },
            type: { type: 'Pointer', targetClass: 'Type_taxonomy' },
        },
    },
];

// Create schemas when plugin activates
Actinium.Hook.register('schema', async ({ ID }) => {
    if (ID !== PLUGIN.ID) return;

    PLUGIN_SCHEMA.forEach(({ actions, collection, schema }) => {
        if (!collection) return;
        Actinium.Collection.register(collection, actions, schema);
    });
});
```

**Source**: `actinium-taxonomy/plugin.js:94-100`

### Pattern 3: Feature Gating with isActive

```javascript
// Hook only runs if plugin is active
Actinium.Hook.register('content-retrieve', async (content, params, options) => {
    if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

    // Plugin-specific logic
    const tax = await Taxonomy.Content.retrieve({ content }, options);
    Object.entries(tax).forEach(([key, value]) =>
        op.set(content, key, value),
    );
});
```

**Source**: `actinium-taxonomy/plugin.js:131-145`

### Pattern 4: Capability Registration on Activation

```javascript
const registerCaps = async () => {
    if (!Actinium.Capability) return;

    const allowed = ['moderator', 'contributor'];
    PLUGIN_SCHEMA.forEach(({ actions = {}, collection }) =>
        Object.keys(actions).forEach((action) =>
            Actinium.Capability.register(`${collection}.${action}`, {
                allowed,
            }),
        ),
    );
};

// Register capabilities before capability system loads
Actinium.Hook.register('before-capability-load', async () => {
    if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;
    registerCaps();
});

// Also register on activation
Actinium.Hook.register('activate', ({ ID }) => {
    if (ID !== PLUGIN.ID) return;
    registerCaps();
});
```

**Source**: `actinium-taxonomy/plugin.js:17-75`

---

## Best Practices

### 1. Always Check Active State in Hooks

```javascript
// ✅ GOOD: Check if plugin is active
Actinium.Hook.register('some-hook', async () => {
    if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;
    // Plugin logic
});

// ❌ BAD: No active check (runs even when deactivated)
Actinium.Hook.register('some-hook', async () => {
    // Plugin logic runs always
});
```

### 2. Use Lifecycle Hooks for Setup/Teardown

```javascript
// ✅ GOOD: Clean up on deactivation
Actinium.Hook.register('deactivate', async ({ ID }) => {
    if (ID === PLUGIN.ID) {
        await cleanupRoutes();
        await cleanupCapabilities();
    }
});

// ❌ BAD: No cleanup (leaves orphaned data)
```

### 3. Register Schemas on 'schema' Hook

```javascript
// ✅ GOOD: Schema hook runs on install and activation
Actinium.Hook.register('schema', async ({ ID }) => {
    if (ID !== PLUGIN.ID) return;
    await Actinium.Collection.register('MyCollection', actions, schema);
});

// ❌ BAD: Registering on 'start' (won't run on activation)
```

### 4. Use updateHookHelper for Complex Migrations

```javascript
// ✅ GOOD: Multiple version-specific migrations
const migrations = {
    '1.0.4': { migration: async () => { /* upgrade logic */ } },
    '1.0.5': { migration: async () => { /* upgrade logic */ } },
};
Actinium.Hook.register('update', Actinium.Plugin.updateHookHelper(PLUGIN.ID, migrations));

// ❌ BAD: Single migration with manual version checks
Actinium.Hook.register('update', async (plugin, req, old) => {
    if (plugin.ID !== PLUGIN.ID) return;
    if (semver.gt(plugin.version, '1.0.4')) { /* ... */ }
    if (semver.gt(plugin.version, '1.0.5')) { /* ... */ }
});
```

### 5. Filter Hook Parameters by Plugin ID

```javascript
// ✅ GOOD: Early return if not this plugin
Actinium.Hook.register('activate', async ({ ID }) => {
    if (ID !== PLUGIN.ID) return;  // Don't run for other plugins
    await doActivation();
});

// ❌ BAD: Runs for ALL plugin activations
Actinium.Hook.register('activate', async (data) => {
    await doActivation();  // Runs for every plugin
});
```

### 6. Use Semver Ranges for Actinium Compatibility

```javascript
// ✅ GOOD: Flexible semver range
version: {
    actinium: '>=3.2.0 <4.0.0',  // Compatible with 3.x
    plugin: '1.0.0',
}

// ❌ BAD: Exact version (breaks on patch updates)
version: {
    actinium: '3.2.6',
    plugin: '1.0.0',
}
```

### 7. Protect Built-in Plugins

```javascript
// Built-in plugins cannot be deleted/uninstalled
if (op.get(obj, 'meta.builtIn', false) === true) {
    return Promise.reject('Cannot delete or deactivate built in plugins');
}
```

**Source**: `actinium-core/cloud/actinium-plugin.js:124-126`

---

## Common Gotchas

### 1. Plugin Active State Persistence

**GOTCHA**: Default `active` state in `Plugin.register()` is overridden by database value.

```javascript
Actinium.Plugin.register(PLUGIN, true);  // Default: active

// If plugin exists in DB with active=false, it will be inactive
// Database value always wins
```

**FIX**: For core plugins, set `active: true` in database manually or on first install.

**Source**: `actinium-core/lib/plugable.js:291-294`

### 2. Schema Hook Timing

**GOTCHA**: `schema` hook only runs on `install` and `activate`, not on `start`.

```javascript
// ❌ Collection not registered if plugin activated after boot
Actinium.Hook.register('start', async () => {
    Actinium.Collection.register('MyCollection', ...);
});

// ✅ Runs on activation
Actinium.Hook.register('schema', async ({ ID }) => {
    if (ID !== PLUGIN.ID) return;
    Actinium.Collection.register('MyCollection', ...);
});
```

### 3. Update Hook Only Runs for Active Plugins

**GOTCHA**: `update` hook only fires if plugin is `active: true` during version change.

```javascript
// update hook (line 175-178)
if (active === true) {
    if (semver.gt(semver.coerce(version), semver.coerce(prevVer))) {
        await Actinium.Hook.run('update', obj, req, old);
    }
}
```

**FIX**: Activate plugin before updating version.

**Source**: `actinium-core/cloud/actinium-plugin.js:175-178`

### 4. Asset Upload Requires Activation

**GOTCHA**: `addMetaAsset` only uploads files during `activate` or `update` hooks.

**FIX**: Assets won't appear until plugin is activated at least once.

**Source**: `actinium-core/lib/plugable.js:210-218`

### 5. Plugin Order Doesn't Control Hook Execution Order

**GOTCHA**: `order` field only affects **load order** during boot, not hook priority.

**FIX**: Use hook priority parameter for execution order:

```javascript
Actinium.Hook.register('start', myHandler, Actinium.Enums.priority.highest);
```

### 6. Cache vs Database Inconsistency

**GOTCHA**: `Actinium.Plugin.get()` reads from cache, which may be stale after external updates.

**FIX**: Cache is updated on:
- Boot (`Plugable.load()`)
- Cloud function calls (`plugin-activate`, `plugin-deactivate`)
- beforeSave/afterSave hooks

For manual database updates, invalidate cache:

```javascript
Actinium.Cache.del(`plugins.${ID}`);
```

### 7. Built-in Core Plugins Can't Be Deactivated in UI

**GOTCHA**: `meta.builtIn === true` prevents deletion, but activation/deactivation is allowed.

**Source**: `actinium-core/cloud/actinium-plugin.js:124-126`

---

## Integration with Other Systems

### Collection Registration

Plugins typically register Parse Server collections during `schema` hook:

```javascript
Actinium.Collection.register(
    'MyCollection',
    {
        create: false,   // Capability required
        retrieve: false,
        update: false,
        delete: false,
        addField: false,
    },
    {
        fieldName: { type: 'String' },
        otherField: { type: 'Number' },
    },
    ['fieldName']  // Indexes
);
```

**See**: [Collection Registration and Schema Management](./COLLECTION_REGISTRATION.md)

### Capability System

Plugins register custom capabilities during `before-capability-load` hook:

```javascript
Actinium.Capability.register('my-plugin.feature', {
    allowed: ['administrator', 'super-admin'],
});
```

**See**: [Actinium Capabilities System](./ACTINIUM_CAPABILITIES.md)

### Route System (Actinium Admin)

Plugins can register API routes for Actinium Admin frontend:

```javascript
const PLUGIN_ROUTES = [
    {
        route: '/admin/my-plugin',
        blueprint: 'MyPlugin',
        meta: { builtIn: true },
    },
];

const saveRoutes = async () => {
    for (const route of PLUGIN_ROUTES) {
        await Actinium.Route.save(route);
    }
};
```

### Cloud Function Namespacing

Plugins use `Actinium.Cloud.define(PLUGIN.ID, functionName, handler)` for automatic capability checks:

```javascript
Actinium.Cloud.define(PLUGIN.ID, 'my-function', async (req) => {
    // Automatically checks Plugin.retrieve capability
    return doWork(req.params);
});
```

**See**: [Parse Server Cloud Function Patterns](./CLOUD_FUNCTION_PATTERNS.md)

---

## Debugging Techniques

### 1. Check Plugin Registration

```javascript
// In Node console or hook
const plugin = Actinium.Plugin.get('MY_PLUGIN');
console.log(plugin);
// Check: ID, active, version, meta
```

### 2. Verify Active Status

```javascript
const isActive = Actinium.Plugin.isActive('MY_PLUGIN');
console.log('Plugin active?', isActive);
```

### 3. Check Version Compatibility

```javascript
const isValid = Actinium.Plugin.isValid('MY_PLUGIN');
console.log('Plugin valid?', isValid);

const isValidAndActive = Actinium.Plugin.isValid('MY_PLUGIN', true);
console.log('Plugin valid and active?', isValidAndActive);
```

### 4. Monitor Lifecycle Hooks

```javascript
Actinium.Hook.register('install', async (obj) => {
    console.log('Plugin installed:', obj.ID);
});

Actinium.Hook.register('activate', async (obj) => {
    console.log('Plugin activated:', obj.ID);
});

Actinium.Hook.register('update', async (obj, req, old) => {
    console.log('Plugin updated:', obj.ID, 'from', old.version, 'to', obj.version);
});
```

### 5. Inspect Database State

```javascript
const query = new Parse.Query('Plugin');
const plugins = await query.find({ useMasterKey: true });
plugins.forEach(p => {
    const json = p.toJSON();
    console.log(json.ID, 'active:', json.active, 'version:', json.version);
});
```

### 6. Clear Plugin Cache

```javascript
// If cache is stale
Actinium.Cache.del(`plugins.MY_PLUGIN`);
Actinium.Cache.del('plugins');  // Clear all plugins
```

---

## API Reference Summary

### Core Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `Plugin.register(plugin, active)` | `plugin: Object`, `active: Boolean` | `void` | Register plugin with cache |
| `Plugin.get(ID)` | `ID?: String` | `Object \| Object<ID, Object>` | Get plugin(s) from cache |
| `Plugin.isActive(ID)` | `ID: String` | `Boolean` | Check if plugin is active |
| `Plugin.isValid(ID, strict)` | `ID: String`, `strict?: Boolean` | `Boolean` | Check version compatibility |
| `Plugin.gate(options)` | `{ req, ID, name, callback }` | `Promise` | Gate function by plugin active state |
| `Plugin.activate(ID)` | `ID: String` | `Promise<Object>` | Activate plugin programmatically |
| `Plugin.deactivate(ID)` | `ID: String` | `Promise<Object>` | Deactivate plugin programmatically |
| `Plugin.addLogo(ID, filePath, app)` | `ID: String`, `filePath: String`, `app?: String` | `void` | Register logo asset |
| `Plugin.addScript(ID, filePath, app)` | `ID: String`, `filePath: String`, `app?: String` | `void` | Register script asset |
| `Plugin.addStylesheet(ID, filePath, app)` | `ID: String`, `filePath: String`, `app?: String` | `void` | Register stylesheet asset |
| `Plugin.addMetaAsset(ID, filePath, path)` | `ID: String`, `filePath: String`, `path: String` | `void` | Register custom asset |
| `Plugin.updateHookHelper(ID, migrations)` | `ID: String`, `migrations: Object` | `Function` | Create versioned migration handler |

**Source**: `actinium-core/lib/plugable.js`

### Cloud Functions

| Function | Parameters | Capability Required | Description |
|----------|------------|---------------------|-------------|
| `plugins` | `{ page?, limit? }` | `Plugin.retrieve` | List all plugins |
| `plugin-activate` | `{ plugin: ID }` | `plugins.activate` | Activate plugin |
| `plugin-deactivate` | `{ plugin: ID }` | `plugins.activate` | Deactivate plugin |
| `plugin-uninstall` | `{ plugin: ID }` | `plugin.uninstall` | Uninstall plugin |

**Source**: `actinium-core/cloud/actinium-plugin.js`

---

## Complete Source References

- **Core Library**: `actinium-core/lib/plugable.js:1-731`
- **Cloud Functions**: `actinium-core/cloud/actinium-plugin.js:1-292`
- **Settings Plugin Example**: `actinium-settings/plugin.js:1-383`
- **Taxonomy Plugin Example**: `actinium-taxonomy/plugin.js:1-584`
- **Type Plugin Example**: `actinium-type/plugin.js:1-100`
