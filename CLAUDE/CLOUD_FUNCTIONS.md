# Parse Server Cloud Function Patterns in Actinium

<!-- v1.0.0 -->

**Source References:**
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/utils/options.js:1-201`
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/utils/acl.js:1-298`
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-users/plugin.js:1-462`
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-roles/plugin.js:1-304`
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-settings/plugin.js:1-429`
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-type/plugin.js:1-200`

---

## Overview

Cloud functions are the **primary API pattern in Actinium** for exposing server-side functionality. They provide secure, authenticated endpoints with built-in capability checking, ACL enforcement, and hook integration.

**Key Characteristics:**
- Server-side execution with Parse Server context
- Automatic session management and user authentication
- Integration with Actinium's capability system
- Hook-driven extensibility (before/after patterns)
- Type-safe parameter validation
- Standardized error handling

---

## Registration Pattern

### Basic Registration

```javascript
Actinium.Cloud.define(PLUGIN.ID, 'function-name', async (req) => {
    // req.params - client parameters
    // req.user - authenticated Parse.User (or undefined)
    // req.master - boolean, true if using master key

    const options = CloudRunOptions(req);

    // Your logic here
    return result;
});
```

**Source:** `actinium-users/plugin.js:265-285`

### Registration Components

1. **Plugin ID** - Namespace for the cloud function (e.g., `'Users'`, `'Settings'`)
2. **Function Name** - Kebab-case identifier (e.g., `'user-find'`, `'setting-set'`)
3. **Handler Function** - Async function receiving `req` object

---

## Request Object (`req`)

### Core Properties

```javascript
{
    params: {},      // Client-provided parameters (from Actinium.Cloud.run())
    user: Parse.User || undefined,  // Authenticated user (undefined if not logged in)
    master: boolean, // true if request uses master key
    original: Parse.Object || undefined  // For beforeSave/afterSave triggers
}
```

### User Context Propagation

The `req.user` object provides authenticated user context:

```javascript
const find = (req) => {
    if (!req.user) {
        throw new Error('Authentication required');
    }

    const userId = req.user.id;
    const username = req.user.get('username');

    // Use CloudRunOptions to propagate session token
    const options = CloudRunOptions(req);
    return Actinium.User.list(req.params, options);
};
```

**Source:** `actinium-users/plugin.js:77-80`

---

## Security & Authorization

### CloudRunOptions() - Automatic Privilege Escalation

**Purpose:** Create Parse query options that respect user session context and automatically escalate to master key when appropriate.

```javascript
const CloudRunOptions = (req, match = null) => {
    const { user, master } = req;
    const options = {};

    // 1. Master key already in use
    if (master) {
        options['useMasterKey'] = true;
    }

    // 2. User logged in
    if (user) {
        options['sessionToken'] = user.getSessionToken();

        const id = user.objectId || user.id || user.username;

        // 3. Escalate for super-admin
        if (Actinium.Roles.User.is(id, 'super-admin')) {
            options['useMasterKey'] = true;
            return options;
        }

        // 4. Escalate if user meets level requirement
        if (match && userMeetsLevel(id, match)) {
            options['useMasterKey'] = true;
            return options;
        }
    }

    return options;
};
```

**Source:** `actinium-core/lib/utils/options.js:38-68`

**Usage Pattern:**
```javascript
const retrieve = (req) => {
    const options = CloudRunOptions(req);
    // Uses session token OR master key (if super-admin)
    return Actinium.User.retrieve(req.params, options);
};
```

**When to use:**
- ✅ User-scoped queries (respects ACLs with session token)
- ✅ Super-admin automatic escalation
- ✅ Level-based escalation (e.g., `CloudRunOptions(req, '>1000')`)

---

### MasterOptions() - Force Master Key

**Purpose:** Force master key usage, bypassing all ACLs and CLPs.

```javascript
const MasterOptions = (options = {}) => {
    return {
        ...options,
        useMasterKey: true,
    };
};
```

**Source:** `actinium-core/lib/utils/options.js:77-82`

**Usage Pattern:**
```javascript
const pref = {
    update: (req) => {
        // ALWAYS use master key for User.Pref operations
        const options = MasterOptions(req);
        return Actinium.User.Pref.update(req.params, options);
    }
};
```

**Source:** `actinium-users/plugin.js:203-212`

**When to use:**
- ⚠️ System-level operations (user preferences, internal state)
- ⚠️ Bypassing ACLs intentionally (use sparingly)
- ⚠️ Background tasks with elevated privileges

---

### CloudCapOptions() - Capability-Based Escalation

**Purpose:** Escalate to master key if user has specific capabilities.

```javascript
const CloudCapOptions = (
    req,
    capability,      // Array or string of capabilities
    strict = false,  // If true, ALL capabilities required; if false, ANY capability
    match = null     // Optional semver-style level requirement
) => {
    const options = CloudRunOptions(req, match);
    if (options.useMasterKey) return options;

    // Check capabilities
    if (CloudHasCapabilities(req, capability, strict)) {
        options.useMasterKey = true;
    }

    return options;
};
```

**Source:** `actinium-core/lib/utils/options.js:165-178`

**Usage Patterns:**

**Pattern 1: OR Logic (Any Capability)**
```javascript
Actinium.Cloud.define('Settings', 'setting-get', (req) => {
    const key = req.params.key;
    const [group] = String(key).split('.');

    // Escalate if user has EITHER capability
    const options = CloudCapOptions(
        req,
        [`Setting.retrieve`, `setting.${group}-get`],
        false // strict=false → OR logic
    );

    return SDK.get(key, null, options);
});
```

**Source:** `actinium-settings/plugin.js:359-370`

**Pattern 2: AND Logic (All Capabilities)**
```javascript
const options = CloudCapOptions(
    req,
    ['admin-access', 'write-content'],
    true // strict=true → AND logic
);
```

**Pattern 3: With Level Requirement**
```javascript
const options = CloudCapOptions(
    req,
    ['moderator-tools'],
    false,
    '>100' // Also escalate if user level > 100
);
```

---

### CloudHasCapabilities() - Check Without Escalation

**Purpose:** Check capabilities without modifying query options. Use for permission gates.

```javascript
const CloudHasCapabilities = (req, capability, strict = true) => {
    const { master } = req;

    if (!capability) return false;
    if (master) return true; // Master key bypasses capability checks

    const capabilities = _.flatten([capability]);

    // Check capabilities
    const permitted = strict
        ? capabilities.reduce((hasCaps, cap) =>
            !!(hasCaps && Actinium.Capability.User.can(cap, req)), true)
        : capabilities.reduce((hasCaps, cap) =>
            !!(hasCaps || Actinium.Capability.User.can(cap, req)), false);

    return permitted;
};
```

**Source:** `actinium-core/lib/utils/options.js:108-130`

**Usage Pattern - Permission Gate:**
```javascript
const set = async (req) => {
    const { key, value } = req.params;
    const [group] = key.split('.');

    // Check permissions BEFORE doing work
    if (!CloudHasCapabilities(req, [
        `Setting.create`,
        `Setting.update`,
        `setting.${group}-set`
    ], false)) {
        return Promise.reject('Permission denied.');
    }

    // Permission granted, proceed with operation
    const masterOptions = MasterOptions();
    let obj = await new Actinium.Query('Setting')
        .equalTo('key', group)
        .first(masterOptions);

    // ... rest of logic
};
```

**Source:** `actinium-settings/plugin.js:55-76`

**When to use:**
- ✅ Early permission gates (fail fast)
- ✅ Custom authorization logic
- ✅ Capability checks without query escalation

---

## ACL Management

### CloudACL() - Generate ACL from Permissions

**Purpose:** Convert declarative permission arrays into Parse.ACL objects with capability-based role access.

```javascript
const CloudACL = async (
    perms = [],        // Array of permission objects
    readCapability,    // Roles with this capability get read access
    writeCapability,   // Roles with this capability get write access
    existingACL        // Optional starting ACL
) => {
    // Returns Parse.ACL object
};
```

**Source:** `actinium-core/lib/utils/acl.js:190-292`

**Permission Object Schema:**
```javascript
{
    permission: 'read' | 'write',
    type: 'public' | 'role' | 'user',
    allow: true | false,  // Default: true
    objectId: 'userId',   // Required if type='user'
    name: 'roleName'      // Required if type='role'
}
```

### Usage Pattern - Object-Level Permissions

**Pattern 1: User-Scoped with Public Read**
```javascript
Actinium.Cloud.define('MyPlugin', 'save-high-score', async req => {
    const { user, params } = req;
    const score = new Actinium.Object('Score');

    score.set('high', params.scoreValue);

    // Create ACL: public read, current user write
    const scoreACL = await Actinium.Utils.CloudACL(
        [
            {
                permission: 'read',
                type: 'public',
                allow: true,
            },
            {
                permission: 'write',
                type: 'user',
                allow: true,
                objectId: user.id,
            },
        ],
        'read-score',   // Roles with 'read-score' capability get read access
        'write-score',  // Roles with 'write-score' capability get write access
        score.getACL()
    );

    score.setACL(scoreACL);

    const options = CloudRunOptions(req);
    return score.save(null, options);
});
```

**Source:** `actinium-core/lib/utils/acl.js:147-187` (example from documentation)

**Pattern 2: Setting-Specific ACL**
```javascript
const set = async (req) => {
    const { key, value, permissions } = req.params;
    const [group] = key.split('.');

    let obj = await new Actinium.Query('Setting')
        .equalTo('key', group)
        .first(MasterOptions());

    obj = obj || new Actinium.Object('Setting');
    obj.set('key', group);
    obj.set('value', { value });

    // Create ACL with capability-based role access
    const groupACL = await Actinium.Utils.CloudACL(
        permissions || [
            { permission: 'read', type: 'public', allow: false },
            { permission: 'write', type: 'public', allow: false }
        ],
        `setting.${group}-get`,   // Read capability
        `setting.${group}-set`,   // Write capability
        obj.getACL()
    );

    obj.setACL(groupACL);
    return obj.save(null, MasterOptions());
};
```

**Source:** `actinium-settings/plugin.js:55-137`

### AclTargets - Get Users and Roles for ACLs

**Purpose:** Fetch searchable list of users and roles for ACL dropdowns/pickers.

```javascript
Actinium.Cloud.define(PLUGIN.ID, 'acl-targets', AclTargets);

// Usage:
// Get all targets (cached)
await Actinium.Cloud.run('acl-targets', { cache: true });

// Search by name
await Actinium.Cloud.run('acl-targets', { search: 'admin' });

// Force fresh query
await Actinium.Cloud.run('acl-targets', { search: 'han', fresh: true });
```

**Source:** `actinium-users/plugin.js:291`, `actinium-core/lib/utils/acl.js:5-130`

**Response Format:**
```javascript
{
    roles: [
        { objectId: 'xxx', name: 'super-admin', label: 'Super Administrator' },
        { objectId: 'yyy', name: 'moderator', label: 'Moderator' }
    ],
    users: [
        { objectId: 'zzz', username: 'han', email: 'han@falcon.net', fname: 'Han', lname: 'Solo' }
    ]
}
```

---

## Parameter Validation

### Common Validation Patterns

**Pattern 1: Required Parameters**
```javascript
const save = (req) => {
    const { objectId, username, email } = req.params;

    if (!username || !email) {
        throw new Error('username and email are required');
    }

    const options = CloudRunOptions(req);
    return Actinium.User.save(req.params, options);
};
```

**Pattern 2: Type Validation**
```javascript
const isValid = (value) => {
    const checks = [
        'isEmpty',
        'isBoolean',
        'isNumber',
        'isString',
        'isDate',
        'isArray',
        'isObject',
    ];

    return checks.reduce((status, func) =>
        _[func](value) || status, false);
};

const set = async (req) => {
    const { value } = req.params;

    if (!isValid(value)) {
        return Promise.reject('invalid setting type: ' + typeof value);
    }

    // Proceed with valid value
};
```

**Source:** `actinium-settings/plugin.js:185-197`

**Pattern 3: Object-Path Key Validation**
```javascript
const set = async (req) => {
    const { key = '' } = req.params;
    const [group, ...settingPath] = key.split('.');

    if (!group) {
        return Promise.reject('key is required');
    }

    // group = top-level key (e.g., 'site')
    // settingPath = nested path (e.g., ['hostname', 'port'])
};
```

**Source:** `actinium-settings/plugin.js:55-59`

**Pattern 4: Entity Existence Validation**
```javascript
const User = {
    add: async (req) => {
        const { role, user } = req.params;
        const opts = CloudRunOptions(req);

        // Validate role exists
        let roleObj = await new Parse.Query(Parse.Role)
            .equalTo('name', role)
            .first(opts);

        if (!roleObj) {
            return Promise.reject('invalid role');
        }

        // Validate user exists
        const userObj = await new Parse.Query(Parse.User)
            .equalTo('objectId', user)
            .first(opts);

        if (!userObj) {
            return Promise.reject('invalid user');
        }

        // Both valid, proceed
        roleObj.getUsers().add(userObj);
        return roleObj.save(null, opts);
    }
};
```

**Source:** `actinium-roles/plugin.js:110-135`

---

## Error Handling

### Standard Error Patterns

**Pattern 1: throw Error**
```javascript
const validate = (req) => {
    if (!req.user) {
        throw new Error('invalid session token');
    }
    return true;
};
```

**Source:** `actinium-users/plugin.js:114-120`

**Pattern 2: Promise.reject**
```javascript
const addRoles = (req, roleArray) => {
    if (!Array.isArray(roleArray)) {
        return Promise.reject('Invalid role array');
    }

    return Parse.Object.saveAll(/* ... */);
};
```

**Source:** `actinium-roles/plugin.js:55-72`

**Pattern 3: Conditional Rejection**
```javascript
const del = async (req) => {
    const { key } = req.params;

    if (!CloudHasCapabilities(req, [`Setting.delete`], false)) {
        return Promise.reject('Permission denied.');
    }

    let obj = await query.first(options);
    return obj ? obj.destroy(options) : Promise.resolve();
};
```

**Source:** `actinium-settings/plugin.js:150-183`

**Pattern 4: Hook-Based Validation**
```javascript
const beforeSave = (req) => {
    const { name } = req.object.toJSON();

    if (name === 'anonymous' && !req.master && !req.object.isNew()) {
        throw new Error(
            `The ${name} role is protected and should not be edited.`
        );
    }
};

Actinium.Cloud.beforeSave(Parse.Role, beforeSave);
```

**Source:** `actinium-roles/plugin.js:206-214`

---

## Hook Integration

### Hook Points in Cloud Functions

Cloud functions integrate with Actinium's hook system at multiple points:

**Pattern 1: Pre-Operation Hooks**
```javascript
const beforeSave = async (req) => {
    // Custom pre-save logic
    await Actinium.Hook.run('user-before-save', req);
};

Actinium.Cloud.beforeSave('_User', beforeSave);
```

**Source:** `actinium-users/plugin.js:126-129`

**Pattern 2: Post-Operation Hooks**
```javascript
const afterSave = (req) => {
    Actinium.Hook.run('user-after-save', req);
};

Actinium.Cloud.afterSave('_User', afterSave);
```

**Source:** `actinium-users/plugin.js:122-124`

**Pattern 3: Event Hooks**
```javascript
const beforeSave = async (req) => {
    const { key, value } = req.object.toJSON();

    if (req.original) {
        const { value: previous } = req.original.toJSON();

        // Fire change hook if value changed
        if (!_.isEqual(previous, value)) {
            Actinium.Hook.run('setting-change', key, value, previous);
        }
    }

    Actinium.Hook.run('setting-set', key, value);
};
```

**Source:** `actinium-settings/plugin.js:214-227`

**Pattern 4: Fetch Hooks**
```javascript
const afterFind = async (req) => {
    const { objects = [] } = req;

    if (Actinium.running !== true) {
        return objects;
    }

    // Allow plugins to augment fetched users
    await Actinium.Hook.run('user-fetch', objects);

    return Promise.resolve(objects);
};

Actinium.Cloud.afterFind('_User', afterFind);
```

**Source:** `actinium-users/plugin.js:36-64`

### Parse Server Trigger Types

Actinium exposes Parse Server triggers via `Actinium.Cloud`:

```javascript
// Before triggers (can modify req.object)
Actinium.Cloud.beforeSave(COLLECTION, handler);
Actinium.Cloud.beforeDelete(COLLECTION, handler);
Actinium.Cloud.beforeLogin(handler);

// After triggers (object already saved)
Actinium.Cloud.afterSave(COLLECTION, handler);
Actinium.Cloud.afterDelete(COLLECTION, handler);
Actinium.Cloud.afterFind(COLLECTION, handler);

// Cloud functions
Actinium.Cloud.define(PLUGIN_ID, 'function-name', handler);
```

**Source:** `actinium-users/plugin.js:253-286`

---

## Testing Strategies

### Manual Testing with Cloud.run()

**Client-Side Testing:**
```javascript
// Test from browser console or Reactium component
const result = await Actinium.Cloud.run('user-find', {
    objectId: 'HrIE319Ddx'
});
console.log(result);
```

**Server-Side Testing:**
```javascript
// Test from another cloud function or hook
Actinium.Hook.register('start', async () => {
    const targets = await Actinium.Cloud.run(
        'acl-targets',
        { cache: true },
        { useMasterKey: true }
    );
    console.log('ACL Targets:', targets);
});
```

**Source:** `actinium-users/plugin.js:316-324`

### Testing Patterns

**Pattern 1: Master Key Testing**
```javascript
// Bypass all security for admin testing
const result = await Actinium.Cloud.run(
    'setting-get',
    { key: 'site.hostname' },
    { useMasterKey: true }
);
```

**Pattern 2: Session Token Testing**
```javascript
// Test as specific user
const sessionToken = 'r:abc123...';
const result = await Actinium.Cloud.run(
    'user-roles',
    {},
    { sessionToken }
);
```

**Pattern 3: Permission Testing**
```javascript
// Test permission denial
try {
    await Actinium.Cloud.run('setting-set', {
        key: 'protected',
        value: 'test'
    });
} catch (error) {
    console.log('Expected error:', error.message);
    // "Permission denied."
}
```

---

## Best Practices

### ✅ DO

1. **Use CloudRunOptions() for User-Scoped Queries**
   ```javascript
   const find = (req) => {
       const options = CloudRunOptions(req);
       return Actinium.User.list(req.params, options);
   };
   ```

2. **Check Capabilities Early (Fail Fast)**
   ```javascript
   if (!CloudHasCapabilities(req, ['required-cap'], false)) {
       return Promise.reject('Permission denied.');
   }
   ```

3. **Validate Parameters Explicitly**
   ```javascript
   const { objectId, username } = req.params;
   if (!objectId) throw new Error('objectId is required');
   ```

4. **Use MasterOptions() Sparingly**
   - Only for system operations (preferences, internal state)
   - Document WHY master key is necessary

5. **Register Capabilities for Cloud Functions**
   ```javascript
   Actinium.Capability.register('user-ui.view', {
       allowed: ['user', 'contributor', 'moderator']
   });
   ```

6. **Namespace Cloud Functions by Plugin**
   ```javascript
   Actinium.Cloud.define(PLUGIN.ID, 'user-find', find);
   // Called as: Actinium.Cloud.run('user-find', params)
   ```

7. **Use Hook Integration for Extensibility**
   ```javascript
   await Actinium.Hook.run('user-before-save', req);
   ```

---

### ❌ DON'T

1. **Don't Use MasterOptions() Without Justification**
   ```javascript
   // BAD: Bypasses all ACLs unnecessarily
   const options = MasterOptions();

   // GOOD: Respects user session and ACLs
   const options = CloudRunOptions(req);
   ```

2. **Don't Mix Options Helper Functions**
   ```javascript
   // BAD: MasterOptions already returns useMasterKey:true
   const options = CloudCapOptions(req, ['cap'], false);
   options.useMasterKey = true; // Redundant

   // GOOD: Use one helper consistently
   const options = MasterOptions();
   ```

3. **Don't Skip Parameter Validation**
   ```javascript
   // BAD: No validation
   const save = (req) => Actinium.User.save(req.params, options);

   // GOOD: Explicit validation
   const save = (req) => {
       const { username, email } = req.params;
       if (!username || !email) throw new Error('username and email required');
       return Actinium.User.save(req.params, options);
   };
   ```

4. **Don't Modify req.object in After Triggers**
   ```javascript
   // BAD: Object already saved, modifications ignored
   const afterSave = (req) => {
       req.object.set('extra', 'value');
   };

   // GOOD: Only read or fire events in afterSave
   const afterSave = (req) => {
       const { objectId } = req.object;
       Actinium.Hook.run('user-saved', objectId);
   };
   ```

5. **Don't Return Sensitive Data Without ACL Checks**
   ```javascript
   // BAD: Returns all users regardless of permissions
   const list = (req) => {
       return new Parse.Query('_User').find({ useMasterKey: true });
   };

   // GOOD: Uses user's session token (respects ACLs)
   const list = (req) => {
       const options = CloudRunOptions(req);
       return Actinium.User.list(req.params, options);
   };
   ```

6. **Don't Forget to Check req.user for Auth-Required Functions**
   ```javascript
   // BAD: Assumes user is logged in
   const save = (req) => {
       const userId = req.user.id; // TypeError if not logged in
   };

   // GOOD: Check auth first
   const save = (req) => {
       if (!req.user) throw new Error('Authentication required');
       const userId = req.user.id;
   };
   ```

---

## Common Gotchas

### 1. CloudRunOptions() vs MasterOptions() Confusion

**Problem:** Using MasterOptions when you meant CloudRunOptions, bypassing ACLs.

```javascript
// WRONG: Always uses master key
const pref = {
    update: (req) => {
        const options = MasterOptions();
        return Actinium.User.Pref.update(req.params, options);
    }
};

// INTENDED (User.Pref requires master key for security)
// But be explicit about WHY
```

**Solution:** Default to `CloudRunOptions(req)` unless you have a specific reason to use master key.

---

### 2. Capability Check Without CloudHasCapabilities

**Problem:** Manually checking capabilities without using framework helper.

```javascript
// WRONG: Manual check doesn't account for master key
const set = (req) => {
    if (!Actinium.Capability.User.can('Setting.update', req)) {
        return Promise.reject('Permission denied');
    }
};

// RIGHT: Use CloudHasCapabilities (handles master key, OR/AND logic)
const set = (req) => {
    if (!CloudHasCapabilities(req, ['Setting.update'], false)) {
        return Promise.reject('Permission denied');
    }
};
```

**Source:** `actinium-settings/plugin.js:63-75`

---

### 3. ACL Not Set After CloudACL()

**Problem:** Generating ACL but forgetting to apply it to the object.

```javascript
// WRONG: ACL generated but never applied
const acl = await CloudACL(permissions, readCap, writeCap);
return obj.save(null, MasterOptions());

// RIGHT: Set ACL before saving
const acl = await CloudACL(permissions, readCap, writeCap);
obj.setACL(acl);
return obj.save(null, MasterOptions());
```

---

### 4. Validation After Expensive Operations

**Problem:** Performing queries before validating parameters.

```javascript
// WRONG: Query before validation
const save = async (req) => {
    const obj = await Actinium.Query('Setting').first(options);

    const { key, value } = req.params;
    if (!key) throw new Error('key required');
};

// RIGHT: Validate first (fail fast)
const save = async (req) => {
    const { key, value } = req.params;
    if (!key) throw new Error('key required');

    const obj = await Actinium.Query('Setting').first(options);
};
```

---

### 5. Not Awaiting Async Hooks

**Problem:** Hooks run asynchronously but not awaited, causing race conditions.

```javascript
// WRONG: Hook fires but doesn't block
const beforeSave = (req) => {
    Actinium.Hook.run('user-before-save', req); // Not awaited
    // Continues immediately
};

// RIGHT: Await async hooks
const beforeSave = async (req) => {
    await Actinium.Hook.run('user-before-save', req);
    // Waits for all hook handlers
};
```

**Source:** `actinium-users/plugin.js:126-129`

---

### 6. Session Token Not Propagated

**Problem:** Using `{ useMasterKey: true }` instead of CloudRunOptions, breaking user-scoped ACLs.

```javascript
// WRONG: User's session token lost
const find = (req) => {
    return new Parse.Query('_User').find({ useMasterKey: true });
    // Returns ALL users, ignoring ACLs
};

// RIGHT: Propagate session token
const find = (req) => {
    const options = CloudRunOptions(req);
    return Actinium.User.list(req.params, options);
    // Returns only users the current user can see
};
```

---

### 7. Error Messages Exposing Internal Details

**Problem:** Returning detailed error messages that expose system architecture.

```javascript
// WRONG: Exposes collection names, fields
throw new Error('Failed to query Setting collection: key field not indexed');

// RIGHT: Generic user-facing message
throw new Error('Unable to retrieve setting');
```

---

## Real-World Examples

### Example 1: User Management Cloud Function

```javascript
const find = (req) => {
    const options = CloudRunOptions(req);
    return Actinium.User.list(req.params, options);
};

Actinium.Cloud.define(PLUGIN.ID, 'user-find', find);
```

**Source:** `actinium-users/plugin.js:77-80, 265`

**Usage:**
```javascript
// Client-side
const user = await Actinium.Cloud.run('user-find', {
    objectId: 'HrIE319Ddx'
});
```

---

### Example 2: Setting with Capability-Based ACL

```javascript
const set = async (req) => {
    const { params = {} } = req;
    const { key = '', value, permissions } = params;
    const [group, ...settingPath] = key.split('.');

    if (!group) return;

    // Permission gate
    if (!CloudHasCapabilities(req, [
        `Setting.create`,
        `Setting.update`,
        `setting.${group}-set`
    ], false)) {
        return Promise.reject('Permission denied.');
    }

    // Type validation
    if (!isValid(value)) {
        return Promise.reject('invalid setting type: ' + typeof value);
    }

    const masterOptions = MasterOptions();

    // Fetch or create setting object
    let obj = await new Actinium.Query('Setting')
        .equalTo('key', group)
        .first(masterOptions);
    obj = obj || new Actinium.Object('Setting');

    // Handle nested paths
    let objValue;
    if (settingPath.length) {
        objValue = op.get(obj.get('value'), 'value', {});
        op.set(objValue, settingPath, value);
    } else {
        objValue = value;
    }

    obj.set('key', group);
    obj.set('value', { value: objValue });

    // Generate ACL with capability-based role access
    const groupACL = await Actinium.Utils.CloudACL(
        permissions || [
            { permission: 'read', type: 'public', allow: false },
            { permission: 'write', type: 'public', allow: false }
        ],
        `setting.${group}-get`,
        `setting.${group}-set`,
        obj.getACL()
    );

    obj.setACL(groupACL);

    const setting = await obj.save(null, masterOptions);

    // Cache result
    Actinium.Cache.set(`setting.${key}`, objValue);

    const result = op.get(setting.get('value'), 'value');
    return settingPath.length ? op.get(result, settingPath) : result;
};

Actinium.Cloud.define('Settings', 'setting-set', set);
```

**Source:** `actinium-settings/plugin.js:55-137`

---

### Example 3: Role Assignment with Validation

```javascript
const User = {
    add: async (req) => {
        const { role, user } = req.params;
        const opts = CloudRunOptions(req);

        // Validate role exists
        let roleObj = await new Parse.Query(Parse.Role)
            .equalTo('name', role)
            .first(opts);

        if (!roleObj) {
            return Promise.reject('invalid role');
        }

        // Validate user exists
        const userObj = await new Parse.Query(Parse.User)
            .equalTo('objectId', user)
            .first(opts);

        if (!userObj) {
            return Promise.reject('invalid user');
        }

        // Add user to role
        roleObj.getUsers().add(userObj);

        roleObj = await roleObj.save(null, opts);

        return SDK.list(req);
    }
};

Actinium.Cloud.define('Roles', 'role-user-add', User.add);
```

**Source:** `actinium-roles/plugin.js:110-135, 222`

---

### Example 4: Protected Object with beforeSave Hook

```javascript
const beforeSave = (req) => {
    const { name } = req.object.toJSON();

    // Protect built-in role from modification
    if (name === 'anonymous' && !req.master && !req.object.isNew()) {
        throw new Error(
            `The ${name} role is protected and should not be edited.`
        );
    }
};

const beforeDelete = (req) => {
    const { name } = req.object.toJSON();

    // Protect built-in role from deletion
    if (name === 'anonymous' && !req.master) {
        throw new Error(
            `The ${name} role is protected and should not be deleted.`
        );
    }
};

Actinium.Cloud.beforeSave(Parse.Role, beforeSave);
Actinium.Cloud.beforeDelete(Parse.Role, beforeDelete);
```

**Source:** `actinium-roles/plugin.js:196-214, 232-236`

---

## Summary

**Parse Server Cloud Functions in Actinium provide:**

1. **Secure API Endpoints** - Automatic session management and authentication
2. **Flexible Authorization** - CloudRunOptions, CloudCapOptions, CloudHasCapabilities
3. **ACL Generation** - CloudACL for capability-based object permissions
4. **Hook Integration** - beforeSave, afterSave, beforeDelete, afterDelete, afterFind
5. **Parameter Validation** - Explicit validation patterns for type safety
6. **Error Handling** - Promise.reject and throw Error patterns
7. **Testing Support** - Manual testing with Cloud.run(), master key, and session tokens

**Key Takeaway:** Cloud functions are the backbone of Actinium's API layer, providing secure, capability-checked, hook-extensible server-side functionality.
