<!-- v1.0.0 -->

# Actinium Settings System Architecture

Complete documentation of Actinium's hierarchical settings management system with object-path addressing, capability-based access control, anonymous group configuration, caching strategies, and hook-driven extensibility.

## Architecture Overview

The Settings system provides a flexible key-value store for application configuration with:

- **Object-Path Addressing**: Hierarchical organization (`group.subkey.leaf`) with dot notation
- **Capability-Based Access**: Per-setting-group read/write/delete capabilities
- **Anonymous Group Registry**: Whitelist non-sensitive settings for unauthenticated access
- **Cache-First Strategy**: Actinium.Cache integration for performance
- **Hook Integration**: `setting-set`, `setting-change`, `setting-unset`, `settings-sync` hooks
- **ENV Initialization**: Bootstrap from `ENV.SETTINGS` object
- **Pulse-Based Sync**: Periodic cache synchronization via Pulse scheduler

**Source**: `actinium-core/lib/setting.js:1-175`, `actinium-settings/plugin.js:1-429`

---

## Setting Storage Model

### Database Structure

Settings are stored in the `Setting` Parse Server collection:

```javascript
// Schema (line 9-23)
{
    key: String,      // Top-level group name (e.g., 'site')
    value: Object,    // Nested object: { value: <actual data> }
}
```

**Object-Path Pattern**: Settings use a **double-nesting** pattern where the actual value is at `object.value.value`:

```javascript
// Database object
{
    key: 'site',
    value: {
        value: {
            title: 'My Site',
            hostname: 'example.com',
        }
    }
}

// Retrieved via Setting.get('site') → { title: 'My Site', hostname: 'example.com' }
// Retrieved via Setting.get('site.hostname') → 'example.com'
```

**Source**: `actinium-core/lib/setting.js:9-23`

### Hierarchical Addressing

Settings support object-path notation for nested values:

```javascript
// Set entire group
await Actinium.Setting.set('site', {
    title: 'My Awesome Site',
    hostname: 'example.com',
    theme: {
        primaryColor: '#007bff',
        logo: '/assets/logo.svg',
    }
});

// Set nested value (preserves other keys in group)
await Actinium.Setting.set('site.theme.primaryColor', '#ff0000');

// Get entire group
const site = await Actinium.Setting.get('site');
// Returns: { title: 'My Awesome Site', hostname: 'example.com', theme: {...} }

// Get nested value
const color = await Actinium.Setting.get('site.theme.primaryColor');
// Returns: '#ff0000'
```

**Source**: `actinium-core/lib/setting.js:26-60, 63-103`

---

## Setting Operations

### Setting.set(key, value, ACL)

Create or update a setting with optional ACL:

```javascript
// Set entire group
await Actinium.Setting.set('site', {
    title: 'My Site',
    hostname: 'example.com'
});

// Set nested key (merges with existing)
await Actinium.Setting.set('site.hostname', 'newdomain.com');

// Set with custom permissions (via cloud function)
await Actinium.Cloud.run('setting-set', {
    key: 'site',
    value: { title: 'My Site' },
    permissions: [
        {
            permission: 'read',
            type: 'public',
            allow: true,
        },
        {
            permission: 'write',
            type: 'public',
            allow: false,
        },
    ]
});
```

**Implementation** (lines 41-60):

1. Split key into `[group, ...settingPath]`
2. If setting path exists, fetch existing group object
3. Merge new value into existing object at path: `op.set(obj, 'value.${settingPath}', value)`
4. Call `setting-set` cloud function with merged value

**Source**: `actinium-core/lib/setting.js:41-60`

**Cloud Function Implementation** (lines 55-137 in plugin.js):

1. **Capability Check**: Requires `Setting.create`, `Setting.update`, OR `setting.${group}-set`
2. **Type Validation**: Must be valid type (string, number, boolean, date, array, object)
3. **Fetch Existing**: Load current setting from database
4. **Merge Values**: If nested path, merge into existing object
5. **Generate ACL**: Use `CloudACL()` helper with `setting.${group}-get` (read) and `setting.${group}-set` (write)
6. **Save**: Persist to database with MasterKey
7. **Cache**: Update `Actinium.Cache.set('setting.{key}', value)`
8. **Return**: Nested value or full object

**Source**: `actinium-settings/plugin.js:55-137`

### Setting.get(key, defaultValue, options)

Retrieve a setting value with optional default:

```javascript
// Get entire group
const site = await Actinium.Setting.get('site');
// Returns: { title: 'My Site', hostname: 'example.com', ... }

// Get nested key
const hostname = await Actinium.Setting.get('site.hostname');
// Returns: 'example.com'

// Get with default (if not found)
const port = await Actinium.Setting.get('site.port', 3000);
// Returns: 3000 if setting doesn't exist

// Get with custom options (e.g., session token for capability checks)
const settings = await Actinium.Setting.get('private', null, CloudRunOptions(req));
```

**Implementation** (lines 77-103):

1. Split key into `[group, ...settingPath]`
2. Check cache: `Actinium.Cache.get('setting.{key}')`
3. If not cached, query database for group
4. If not found, return defaultValue
5. Extract value: `op.get(obj, 'value.value')`
6. If settingPath exists, extract nested: `op.get(result, settingPath, defaultValue)`
7. Cache result with `Enums.cache.dataLoading` TTL
8. Return value or defaultValue

**Source**: `actinium-core/lib/setting.js:77-103`

### Setting.unset(key)

Delete a setting or nested key:

```javascript
// Delete nested key (sets to undefined)
await Actinium.Setting.unset('site.title');
// Equivalent to: Setting.set('site.title', undefined)

// Delete entire group
await Actinium.Setting.unset('site');
// Deletes 'site' setting object from database
// Also unregisters capabilities: setting.site-set, setting.site-get, setting.site-delete
```

**Implementation** (lines 119-125):

- **Nested Key**: Calls `Setting.set(key)` without value (sets to undefined)
- **Top-Level Group**: Calls `setting-unset` cloud function → deletes object

**Source**: `actinium-core/lib/setting.js:119-125`

**Cloud Function Implementation** (lines 150-183 in plugin.js):

1. **Capability Check**: Requires `Setting.delete` OR `setting.${group}-delete`
2. **Delete Logic**:
   - If nested path: Call `set(req)` with no value (unsets nested key)
   - If top-level: Destroy Parse object
3. **Cleanup** (afterDelete hook, lines 204-212):
   - Clear cache: `Actinium.Cache.del('setting.{key}')`
   - Unregister capabilities: `Capability.unregister('setting.{key}-set/get/delete')`
   - Run `setting-unset` hook

**Source**: `actinium-settings/plugin.js:150-183, 204-212`

### Setting.list(req, fullAccess)

Load all settings with capability filtering:

```javascript
// Load all settings (internal use, requires master key or Setting.retrieve)
const settings = await Setting.list({}, true);
// Returns: { site: {...}, app: {...}, ... }

// Load with capability filtering (per-group access checks)
const settings = await Setting.list(req, false);
// Only includes groups where user has setting.${group}-get capability
```

**Implementation** (lines 133-163):

1. Query all Setting objects with pagination (1000/page)
2. For each setting:
   - Check `fullAccess` OR `CloudHasCapabilities(req, 'setting.{key}-get')`
   - If authorized, include in output: `output[key] = op.get(value, 'value')`
3. Cache result: `Actinium.Cache.set('setting', output, Enums.cache.dataLoading)`
4. Return object of all accessible settings

**Source**: `actinium-core/lib/setting.js:133-163`

---

## Capability-Based Access Control

### Per-Group Capabilities

Each setting group automatically generates three capabilities:

- `setting.${group}-get` - Read access
- `setting.${group}-set` - Write access (create/update)
- `setting.${group}-delete` - Delete access

**Example**:

```javascript
// Setting group 'site' creates:
// - setting.site-get
// - setting.site-set
// - setting.site-delete

// Assign to role
await Actinium.Capability.Role.grant('administrator', 'setting.site-set');
```

### Collection-Level Capabilities

```javascript
// Registered on plugin init (line 238-262)
Actinium.Capability.register('Setting.create', {}, Actinium.Enums.priority.highest);
Actinium.Capability.register('Setting.retrieve', {}, Actinium.Enums.priority.highest);
Actinium.Capability.register('Setting.update', {}, Actinium.Enums.priority.highest);
Actinium.Capability.register('Setting.delete', {}, Actinium.Enums.priority.highest);
Actinium.Capability.register('Setting.addField', {}, Actinium.Enums.priority.highest);
```

**Default Roles**: Empty `{}` means no roles by default (admin-only via CLP).

**Source**: `actinium-settings/plugin.js:238-262`

### ACL Generation

Settings use `CloudACL()` helper to create ACL from permissions array:

```javascript
// Default permissions (no public access)
const permissions = [
    {
        permission: 'read',
        type: 'public',
        allow: false,
    },
    {
        permission: 'write',
        type: 'public',
        allow: false,
    },
];

const groupACL = await Actinium.Utils.CloudACL(
    permissions,
    'setting.site-get',    // Read capability
    'setting.site-set',    // Write capability
    obj.getACL(),          // Existing ACL
);

obj.setACL(groupACL);
```

**Source**: `actinium-settings/plugin.js:101-122`

**See**: [Parse Server ACL Patterns](./PARSE_ACL_PATTERNS.md)

### Anonymous Group Registry

Non-sensitive setting groups can be whitelisted for anonymous access:

```javascript
// Initialize in Setting.init() (line 165-172)
Setting.anonymousGroup = new Registry('AnonymousGroup');
Setting.anonymousGroup.register('app', { id: 'app' });
Setting.anonymousGroup.register('profile', { id: 'profile' });

// Capabilities registered on before-capability-load hook (line 271-281)
Actinium.Hook.register('before-capability-load', () => {
    SDK.anonymousGroup.list.forEach(({ id }) =>
        Actinium.Capability.register(`setting.${id}-get`, {
            allowed: ['anonymous', 'user', 'contributor', 'moderator'],
        }),
    );
}, Actinium.Enums.priority.lowest);
```

**Real-World Example** (Shortcodes Plugin):

```javascript
// Register 'shortcodes' as anonymously readable
Actinium.Setting.anonymousGroup.register('shortcodes', {
    id: 'shortcodes'
});
```

**Source**: `actinium-core/lib/setting.js:165-172`, `actinium-settings/plugin.js:271-281`, `actinium-shortcodes/plugin.js:46`

---

## Caching Strategy

### Cache Keys

```javascript
// Individual setting
Actinium.Cache.set('setting.{key}', value, Enums.cache.dataLoading);
// Example: 'setting.site' → { title: 'My Site', ... }
// Example: 'setting.site.hostname' → 'example.com'

// All settings
Actinium.Cache.set('setting', allSettings, Enums.cache.dataLoading);
// Example: { site: {...}, app: {...}, ... }
```

**TTL**: `Enums.cache.dataLoading` (default configurable cache duration)

**Source**: `actinium-core/lib/setting.js:100, 160`

### Cache Invalidation

Cache is cleared on:

1. **Setting Save**: `beforeSave` hook (line 225)
   ```javascript
   Actinium.Cache.set(`setting.${key}`, op.get(value, 'value'));
   ```

2. **Setting Change**: `afterSave` hook (line 199-202)
   ```javascript
   const { key, value } = req.object.toJSON();
   Actinium.Cache.set(`setting.${key}`, op.get(value, 'value'));
   ```

3. **Setting Delete**: `afterDelete` hook (line 207)
   ```javascript
   Actinium.Cache.del(`setting.${key}`);
   ```

4. **Cloud Function Set**: After save (line 125-129)
   ```javascript
   Actinium.Cache.set(`setting.${key}`, objValue, Actinium.Enums.cache.dataLoading);
   ```

5. **Cloud Function Set (group delete)**: Before query (line 83)
   ```javascript
   Actinium.Cache.del(`setting.${group}`);
   ```

**Source**: `actinium-settings/plugin.js:83, 125-129, 199-202, 207, 225`

### Periodic Sync with Pulse

Settings are periodically reloaded from database to catch external changes:

```javascript
// Running hook registers Pulse task (line 344-356)
Actinium.Hook.register('running', async () => {
    Actinium.Pulse.define(
        'settings-sync',
        {
            schedule: op.get(ENV, 'SETTINGS_SYNC_SCHEDULE', '* * * * *'),  // Default: every minute
        },
        async () => {
            const prevSettings = Actinium.Cache.get('setting');
            const settings = await SDK.load();  // Reload all settings
            Actinium.Hook.run('settings-sync', settings, prevSettings);
        },
    );
});
```

**ENV Variable**: `SETTINGS_SYNC_SCHEDULE` (cron format, default: `'* * * * *'` = every minute)

**Source**: `actinium-settings/plugin.js:344-356`

**See**: [Pulse System Architecture](./PULSE_SYSTEM.md)

---

## Hook Integration

### setting-set

Fired when a setting is saved (before database save):

```javascript
Actinium.Hook.register('setting-set', async (key, value) => {
    console.log('Setting saved:', key, value);
    // value is the nested object: { value: <actual data> }
});
```

**Triggered By**: `beforeSave` hook (line 226)

**Source**: `actinium-settings/plugin.js:226`

### setting-change

Fired when a setting value actually changes (not on every save):

```javascript
Actinium.Hook.register('setting-change', async (key, value, previous) => {
    console.log('Setting changed:', key);
    console.log('New:', value);
    console.log('Old:', previous);
});
```

**Triggered By**: `beforeSave` hook if `!_.isEqual(previous, value)` (line 220-222)

**Source**: `actinium-settings/plugin.js:220-222`

### setting-unset

Fired when a setting group is deleted:

```javascript
Actinium.Hook.register('setting-unset', async (key) => {
    console.log('Setting deleted:', key);
});
```

**Triggered By**: `afterDelete` hook (line 211)

**Source**: `actinium-settings/plugin.js:211`

### settings-sync

Fired during Pulse-based periodic sync:

```javascript
Actinium.Hook.register('settings-sync', async (settings, prevSettings) => {
    console.log('Settings reloaded from database');
    // Compare settings and prevSettings to detect external changes
});
```

**Triggered By**: Pulse task every minute (or `SETTINGS_SYNC_SCHEDULE`)

**Source**: `actinium-settings/plugin.js:353`

### settings-acl-roles

Customize default ACL roles for settings:

```javascript
Actinium.Hook.register('settings-acl-roles', async (context) => {
    context.roles = ['administrator', 'super-admin'];
}, Actinium.Enums.priority.highest);
```

**Source**: `actinium-settings/plugin.js:304-310`

---

## Initialization

### ENV.SETTINGS Bootstrap

Settings are initialized from environment variable on boot:

```javascript
// Setting.init() called during Actinium boot (line 165)
Setting.init = () => {
    Actinium.Cache.set('setting', ENV.SETTINGS);  // Bootstrap from env

    // Initialize anonymous group registry
    Setting.anonymousGroup = new Registry('AnonymousGroup');
    Setting.anonymousGroup.register('app', { id: 'app' });
    Setting.anonymousGroup.register('profile', { id: 'profile' });
};
```

**ENV Example** (in `env.json` or `process.env`):

```json
{
    "SETTINGS": {
        "site": {
            "title": "My Site",
            "hostname": "example.com"
        },
        "app": {
            "version": "1.0.0"
        }
    }
}
```

**Source**: `actinium-core/lib/setting.js:165-172`

### Load on Boot

Settings are fully loaded from database during Actinium startup:

```javascript
// Setting.load() called after init
Setting.load = async () => {
    await Setting.schema();        // Create/verify schema
    const settings = await Setting.list({}, true);  // Load all with master key
    return settings;
};
```

**Source**: `actinium-core/lib/setting.js:127-131`

---

## Cloud Functions

### settings

List all settings (capability-filtered):

```javascript
const settings = await Actinium.Cloud.run('settings');
// Returns: { site: {...}, app: {...}, ... }
// Only includes groups where user has Setting.retrieve OR setting.{key}-get
```

**Implementation**: Calls `SDK.list(req)`

**Capability Required**: `Setting.retrieve` (all settings) OR per-group `setting.{key}-get`

**Source**: `actinium-settings/plugin.js:358`

### setting-get

Get a specific setting value:

```javascript
const siteSettings = await Actinium.Cloud.run('setting-get', {
    key: 'site'
});
// Returns: { title: 'My Site', hostname: 'example.com', ... }

const hostname = await Actinium.Cloud.run('setting-get', {
    key: 'site.hostname'
});
// Returns: 'example.com'
```

**Implementation** (lines 359-369):

1. Extract group from key: `const [group] = String(key).split('.')`
2. Build CloudCapOptions with `Setting.retrieve` OR `setting.{group}-get`
3. Call `SDK.get(key, null, options)`

**Capability Required**: `Setting.retrieve` OR `setting.{group}-get`

**Source**: `actinium-settings/plugin.js:359-369`

### setting-set / setting-save

Create or update a setting:

```javascript
await Actinium.Cloud.run('setting-set', {
    key: 'site',
    value: { title: 'New Title', hostname: 'example.com' },
    permissions: [  // Optional
        {
            permission: 'read',
            type: 'public',
            allow: true,
        },
    ],
});
```

**Parameters**:

- `key`: Setting group or object path (`'site'` or `'site.hostname'`)
- `value`: Setting value (any valid type)
- `permissions`: Optional array for `CloudACL()` helper

**Capability Required**: `Setting.create`, `Setting.update`, OR `setting.{group}-set`

**Source**: `actinium-settings/plugin.js:372-373`

### setting-unset / setting-del / setting-rm

Delete a setting or nested key:

```javascript
// Delete nested key
await Actinium.Cloud.run('setting-unset', {
    key: 'site.title'
});

// Delete entire group
await Actinium.Cloud.run('setting-unset', {
    key: 'site'
});
```

**Capability Required**: `Setting.delete` OR `setting.{group}-delete`

**Source**: `actinium-settings/plugin.js:374-376`

---

## Real-World Usage Examples

### Example 1: Plugin Configuration Storage

```javascript
// S3 Adapter Plugin
Actinium.Hook.register('activate', async ({ ID }) => {
    if (ID === 'S3Adapter') {
        // Get plugin-specific settings
        const settings = await Actinium.Setting.get('S3Adapter', {
            bucket: '',
            region: 'us-east-1',
            accessKeyId: '',
            secretAccessKey: '',
        });

        // Initialize S3 client with settings
        initializeS3(settings);
    }
});
```

**Source**: `actinium-fs-adapter/s3-plugin.js:50`

### Example 2: Feature Flag / Toggle

```javascript
// Mailer Plugin
const getMailerSettings = async () => {
    return Actinium.Setting.get('mailer', {
        driver: 'smtp',  // Default driver
        enabled: true,
    });
};

Actinium.Hook.register('send-email', async (email) => {
    const { enabled, driver } = await getMailerSettings();

    if (!enabled) {
        WARN('Mailer disabled in settings');
        return;
    }

    // Send via configured driver
    await sendViaDriver(driver, email);
});
```

**Source**: `actinium-mailer/mailer-plugin.js:22`

### Example 3: Cron Schedule Configuration

```javascript
// Search Plugin
Actinium.Hook.register('running', async () => {
    const schedule = await Actinium.Setting.get(
        'search.index.schedule',
        '0 0 * * *'  // Default: midnight daily
    );

    Actinium.Pulse.define('search-indexer', { schedule }, async () => {
        await rebuildSearchIndex();
    });
});

// Admin can update schedule without code changes:
await Actinium.Setting.set('search.index.schedule', '*/30 * * * *');  // Every 30 minutes
```

**Source**: `actinium-search/search-plugin.js:42, 56`

### Example 4: Multi-Tenant Configuration

```javascript
// Syndicate Plugin
const getSyndicateTypes = async () => {
    return Actinium.Setting.get('Syndicate.types', []);
};

Actinium.Hook.register('content-saved', async (content) => {
    const types = await getSyndicateTypes();

    if (types.includes(content.type)) {
        await syndicate(content);
    }
});
```

**Source**: `actinium-syndicate/sdk.js:317`

### Example 5: Anonymous Setting Access

```javascript
// Client-side (browser) can read app settings without authentication
const appSettings = await Actinium.Cloud.run('setting-get', {
    key: 'app'
});
// Works because 'app' is in anonymousGroup registry

// Register custom anonymous group
Actinium.Setting.anonymousGroup.register('shortcodes', {
    id: 'shortcodes'
});

// Now 'shortcodes' settings are publicly readable
```

**Source**: `actinium-shortcodes/plugin.js:46`

---

## Best Practices

### 1. Use Hierarchical Keys for Organization

```javascript
// ✅ GOOD: Organized by domain
await Actinium.Setting.set('email.smtp.host', 'smtp.example.com');
await Actinium.Setting.set('email.smtp.port', 587);
await Actinium.Setting.set('email.from', 'noreply@example.com');

// ❌ BAD: Flat namespace
await Actinium.Setting.set('smtpHost', 'smtp.example.com');
await Actinium.Setting.set('smtpPort', 587);
await Actinium.Setting.set('emailFrom', 'noreply@example.com');
```

### 2. Register Anonymous Groups for Non-Sensitive Data

```javascript
// ✅ GOOD: Public app configuration
Actinium.Setting.anonymousGroup.register('app', { id: 'app' });
await Actinium.Setting.set('app', {
    name: 'My App',
    version: '1.0.0',
});

// ❌ BAD: Sensitive data in anonymous group
Actinium.Setting.anonymousGroup.register('secrets', { id: 'secrets' });
await Actinium.Setting.set('secrets', {
    apiKey: 'secret-key-123',  // Now publicly readable!
});
```

### 3. Provide Defaults When Getting Settings

```javascript
// ✅ GOOD: Graceful fallback
const port = await Actinium.Setting.get('server.port', 3000);

// ❌ BAD: No default (returns undefined if not set)
const port = await Actinium.Setting.get('server.port');
if (!port) {
    // Need to handle undefined
}
```

### 4. Use ENV.SETTINGS for Bootstrap Values

```javascript
// env.json
{
    "SETTINGS": {
        "site": {
            "title": "Default Site Title",
            "hostname": "localhost:3000"
        }
    }
}

// These are loaded on boot before database settings
// Database settings override ENV.SETTINGS after load
```

### 5. Cache-Bust with setting-change Hook

```javascript
// ✅ GOOD: Invalidate caches when settings change
Actinium.Hook.register('setting-change', async (key, value, previous) => {
    if (key === 'theme') {
        await clearThemeCache();
        await recompileStyles();
    }
});

// ❌ BAD: No cache invalidation (stale data)
```

### 6. Use Capability Checks in Custom Logic

```javascript
// ✅ GOOD: Check capabilities before sensitive operations
const canEdit = CloudHasCapabilities(req, ['setting.site-set']);
if (!canEdit) {
    throw new Error('Permission denied');
}

// ❌ BAD: Assume caller has permission
await Actinium.Setting.set('site.apiKey', req.params.apiKey);
```

### 7. Group Related Settings

```javascript
// ✅ GOOD: Single group for related settings
await Actinium.Setting.set('smtp', {
    host: 'smtp.example.com',
    port: 587,
    user: 'user@example.com',
    password: 'secret',
});

// ❌ BAD: Multiple top-level groups for related data
await Actinium.Setting.set('smtpHost', 'smtp.example.com');
await Actinium.Setting.set('smtpPort', 587);
// Creates separate database objects and capabilities
```

---

## Common Gotchas

### 1. Double-Nesting Value Structure

**GOTCHA**: Database value is nested as `{ value: { value: <data> } }`.

```javascript
// ❌ WRONG: Accessing raw database object
const obj = await new Parse.Query('Setting').equalTo('key', 'site').first();
const title = obj.get('value').title;  // undefined!

// ✅ CORRECT: Use SDK method
const title = await Actinium.Setting.get('site.title');
// OR extract from nested structure
const title = op.get(obj.get('value'), 'value.title');
```

**Source**: `actinium-core/lib/setting.js:95, 99`

### 2. Setting Nested Keys Creates Intermediate Objects

**GOTCHA**: Setting `'site.theme.color'` when `site` doesn't exist creates empty intermediate objects.

```javascript
// Setting doesn't exist yet
await Actinium.Setting.set('site.theme.color', '#007bff');

// Creates:
{
    key: 'site',
    value: {
        value: {
            theme: {
                color: '#007bff'
            }
        }
    }
}

// Other 'site' keys are undefined
const title = await Actinium.Setting.get('site.title');  // undefined
```

**FIX**: Set top-level group first with all required keys:

```javascript
await Actinium.Setting.set('site', {
    title: 'My Site',
    theme: {
        color: '#007bff'
    }
});
```

### 3. Unset on Nested Key Sets to Undefined (Not Delete)

**GOTCHA**: `Setting.unset('site.title')` sets `site.title` to `undefined`, doesn't delete the key.

```javascript
await Actinium.Setting.set('site', { title: 'My Site', hostname: 'example.com' });
await Actinium.Setting.unset('site.title');

const site = await Actinium.Setting.get('site');
// Returns: { title: undefined, hostname: 'example.com' }
```

**Source**: `actinium-core/lib/setting.js:122`

### 4. Anonymous Groups Must Be Registered Before Capability Load

**GOTCHA**: `anonymousGroup.register()` must run **before** `before-capability-load` hook.

```javascript
// ❌ BAD: Registered too late (after capabilities loaded)
Actinium.Hook.register('start', () => {
    Actinium.Setting.anonymousGroup.register('public', { id: 'public' });
});

// ✅ GOOD: Register during plugin init (before capability load)
Actinium.Setting.anonymousGroup.register('public', { id: 'public' });
```

**Source**: `actinium-settings/plugin.js:271-281`

### 5. Setting.get() Returns Cached Value

**GOTCHA**: `Setting.get()` reads from cache, may be stale if database is modified externally.

**FIX**: Cache is refreshed by:
- Pulse sync (every minute by default)
- `Setting.set()` calls
- Manual invalidation: `Actinium.Cache.del('setting.{key}')`

### 6. Capability Checks Use Top-Level Group Only

**GOTCHA**: `setting.site-get` capability applies to ALL nested keys in `site` group.

```javascript
// setting.site-get grants access to:
// - site
// - site.title
// - site.theme.color
// - site.anything.nested

// No granular per-key capabilities
```

**FIX**: Use separate top-level groups for different access levels:

```javascript
// Public settings
await Actinium.Setting.set('public', { appName: 'My App' });
Actinium.Setting.anonymousGroup.register('public', { id: 'public' });

// Private settings
await Actinium.Setting.set('private', { apiKey: 'secret' });
// Only admins can access 'private' group
```

### 7. ENV.SETTINGS Overridden by Database

**GOTCHA**: `ENV.SETTINGS` are loaded first, but database values override them after `Setting.load()`.

```javascript
// env.json
{ "SETTINGS": { "site": { "title": "Default Title" } } }

// Database has different value
Setting object: { key: 'site', value: { value: { title: 'Database Title' } } }

// After boot
await Actinium.Setting.get('site.title');
// Returns: 'Database Title' (not 'Default Title')
```

**Use Case**: ENV.SETTINGS are for bootstrapping new environments, not runtime overrides.

---

## Type Validation

Valid setting value types (line 185-197 in plugin.js):

```javascript
const isValid = (value) => {
    const checks = [
        'isEmpty',     // null, undefined, '', [], {}
        'isBoolean',   // true, false
        'isNumber',    // 123, 45.67
        'isString',    // 'hello'
        'isDate',      // Date object
        'isArray',     // [1, 2, 3]
        'isObject',    // { key: 'value' }
    ];

    return checks.reduce((status, func) => _[func](value) || status, false);
};
```

**Invalid Types**: Functions, Symbols, undefined, Parse Objects (must serialize to plain objects first)

**Source**: `actinium-settings/plugin.js:185-197`

---

## Integration with Other Systems

### Pulse Scheduler

Settings use Pulse for periodic cache synchronization:

```javascript
Actinium.Pulse.define(
    'settings-sync',
    { schedule: '* * * * *' },  // Cron format
    async () => {
        const settings = await SDK.load();
        Actinium.Hook.run('settings-sync', settings, prevSettings);
    }
);
```

**See**: [Pulse System Architecture](./PULSE_SYSTEM.md)

### Capability System

Each setting group creates dynamic capabilities:

```javascript
// Automatic capability registration
Actinium.Capability.register('setting.site-get', { allowed: [...] });
Actinium.Capability.register('setting.site-set', { allowed: [...] });
Actinium.Capability.register('setting.site-delete', { allowed: [...] });
```

**See**: [Actinium Capabilities System](./ACTINIUM_CAPABILITIES.md)

### Parse ACL System

Settings use `CloudACL()` helper for object-level permissions:

```javascript
const groupACL = await Actinium.Utils.CloudACL(
    permissions,
    'setting.site-get',    // Read capability
    'setting.site-set',    // Write capability
);
```

**See**: [Parse Server ACL Patterns](./PARSE_ACL_PATTERNS.md)

---

## Debugging Techniques

### 1. Check Cache State

```javascript
// Get cached value
const cached = Actinium.Cache.get('setting.site');
console.log('Cached setting:', cached);

// Get all cached settings
const allCached = Actinium.Cache.get('setting');
console.log('All cached settings:', allCached);
```

### 2. Verify Database State

```javascript
const query = new Parse.Query('Setting');
const settings = await query.find({ useMasterKey: true });

settings.forEach(s => {
    const { key, value } = s.toJSON();
    console.log('Database setting:', key, op.get(value, 'value'));
});
```

### 3. Check Anonymous Groups

```javascript
const anonymousGroups = Actinium.Setting.anonymousGroup.list;
console.log('Anonymous groups:', anonymousGroups.map(g => g.id));
```

### 4. Monitor Setting Changes

```javascript
Actinium.Hook.register('setting-change', (key, value, previous) => {
    console.log('Setting changed:', key);
    console.log('Old:', previous);
    console.log('New:', value);
});
```

### 5. Test Capability Access

```javascript
const hasAccess = CloudHasCapabilities(req, ['setting.site-get']);
console.log('User can read site settings?', hasAccess);

const canWrite = CloudHasCapabilities(req, ['setting.site-set']);
console.log('User can write site settings?', canWrite);
```

### 6. Clear Cache for Testing

```javascript
// Clear specific setting
Actinium.Cache.del('setting.site');

// Clear all settings
Actinium.Cache.del('setting');

// Force reload from database
const settings = await Actinium.Setting.load();
```

---

## API Reference Summary

### Core Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `Setting.set(key, value)` | `key: String`, `value: any` | `Promise<any>` | Create/update setting |
| `Setting.get(key, default, options)` | `key: String`, `default?: any`, `options?: Object` | `Promise<any>` | Get setting value |
| `Setting.unset(key)` | `key: String` | `Promise` | Delete setting/key |
| `Setting.list(req, fullAccess)` | `req?: Object`, `fullAccess?: Boolean` | `Promise<Object>` | List all settings |
| `Setting.load()` | - | `Promise<Object>` | Load settings from DB |
| `Setting.init()` | - | `void` | Initialize from ENV.SETTINGS |

**Source**: `actinium-core/lib/setting.js`

### Cloud Functions

| Function | Parameters | Capability Required | Description |
|----------|------------|---------------------|-------------|
| `settings` | - | `Setting.retrieve` OR per-group | List all settings |
| `setting-get` | `{ key }` | `Setting.retrieve` OR `setting.{group}-get` | Get specific setting |
| `setting-set` | `{ key, value, permissions? }` | `Setting.create/update` OR `setting.{group}-set` | Create/update setting |
| `setting-unset` | `{ key }` | `Setting.delete` OR `setting.{group}-delete` | Delete setting |

**Aliases**: `setting-save`, `setting-del`, `setting-rm`

**Source**: `actinium-settings/plugin.js:358-376`

### Hooks

| Hook | Parameters | When Fired |
|------|------------|------------|
| `setting-set` | `(key, value)` | Before setting saved |
| `setting-change` | `(key, value, previous)` | When value changes |
| `setting-unset` | `(key)` | After setting deleted |
| `settings-sync` | `(settings, prevSettings)` | Pulse periodic sync |
| `settings-acl-roles` | `(context)` | Before ACL generation |

**Source**: `actinium-settings/plugin.js`

---

## Complete Source References

- **Core Library**: `actinium-core/lib/setting.js:1-175`
- **Settings Plugin**: `actinium-settings/plugin.js:1-429`
- **Real Usage Examples**:
  - S3 Adapter: `actinium-fs-adapter/s3-plugin.js:50`
  - Mailer: `actinium-mailer/mailer-plugin.js:22`
  - Search: `actinium-search/search-plugin.js:42,56`
  - Syndicate: `actinium-syndicate/sdk.js:317`
  - Shortcodes: `actinium-shortcodes/plugin.js:46`
