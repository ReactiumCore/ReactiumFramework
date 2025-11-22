<!-- v1.0.0 -->

# Actinium Capabilities System - Deep Dive

**Research Date:** November 22, 2025
**Framework Version:** Actinium 5.x+
**Related Topics:** Roles, ACLs, Permissions, Authorization

---

## Executive Summary

The Actinium Capabilities System is a flexible, role-based authorization layer that sits above Parse Server's ACLs. It provides fine-grained permission control through named capabilities that can be granted to or restricted from roles. Unlike ACLs (which control object-level access), capabilities control feature-level and action-level access, making them ideal for UI permissions, cloud function authorization, and content workflow management.

**Key Architectural Points:**

- Capabilities are **named permissions** (e.g., `user.view`, `Content_article.publish`)
- Capabilities are **granted to roles**, not individual users
- Users inherit capabilities from their roles
- Two privileged roles bypass most checks: `super-admin` (always allowed) and `administrator` (allowed unless explicitly excluded)
- Capabilities can be **dynamic** (auto-generated for content types)
- Frontend and backend use the same capability names for consistent authorization

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [How Capabilities Differ from ACLs](#how-capabilities-differ-from-acls)
3. [Capability Architecture](#capability-architecture)
4. [Built-in vs Custom Capabilities](#built-in-vs-custom-capabilities)
5. [Server-Side Implementation](#server-side-implementation)
6. [Client-Side Implementation](#client-side-implementation)
7. [Capability Naming Conventions](#capability-naming-conventions)
8. [Integration with Parse Server](#integration-with-parse-server)
9. [Real-World Examples](#real-world-examples)
10. [Common Patterns](#common-patterns)
11. [Performance Considerations](#performance-considerations)
12. [Gotchas and Best Practices](#gotchas-and-best-practices)

---

## Core Concepts

### What is a Capability?

A capability is a **named permission** that represents the ability to perform a specific action or access a specific feature. Each capability has:

- **Group Name**: Dot-notation identifier (e.g., `user.view`, `Content_article.publish`)
- **Allowed Roles**: Array of role names that have this capability
- **Excluded Roles**: Array of role names explicitly denied this capability

### Database Schema

Capabilities are stored in the `Capability` Parse collection with this schema:

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-capability/schema.js:1-24
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
    actions: {
        create: false,                // Only via cloud functions
        retrieve: true,               // Public read access
        update: false,
        delete: false,
        addField: false,
    }
}
```

### Special Roles

Two roles receive automatic privilege escalation:

1. **`super-admin`**:

   - Always has ALL capabilities
   - Cannot be excluded from any capability
   - Bypasses all capability checks
   - Gets `useMasterKey: true` in Parse queries

2. **`administrator`**:

   - Automatically added to ALL capability `allowed` lists
   - Can be explicitly excluded (unlike super-admin)
   - Gets `useMasterKey: true` in Parse queries (unless excluded)

3. **`banned`**:

   - Always added to ALL capability `excluded` lists
   - Cannot be granted capabilities
   - Used to revoke all access from problematic users

4. **`anonymous`**:
   - Automatically added to every user's role list
   - Used for unauthenticated user capabilities

---

## How Capabilities Differ from ACLs

| Aspect                       | ACLs                               | Capabilities                              |
| ---------------------------- | ---------------------------------- | ----------------------------------------- |
| **Level**                    | Object-level (per document)        | Feature/Action-level (system-wide)        |
| **Granularity**              | Specific database records          | Broad permissions                         |
| **Storage**                  | On each Parse Object               | Centralized in Capability collection      |
| **Use Case**                 | "Can this user edit THIS article?" | "Can this user edit articles in general?" |
| **Parse Server Integration** | Built into Parse (CLP/ACL)         | Actinium layer on top of Parse            |
| **Check Location**           | Database query time                | Cloud function entry / UI render time     |
| **Performance**              | Enforced by Parse Server           | Requires explicit checks                  |
| **Typical Usage**            | Data security                      | UI permissions, workflow control          |

### When to Use Which

**Use ACLs when:**

- Controlling access to specific database objects
- Implementing owner-only access patterns
- Enforcing data-level security
- Working with Parse's built-in security

**Use Capabilities when:**

- Controlling feature visibility in UI
- Authorizing cloud function access
- Managing content workflows (publish/unpublish)
- Implementing role-based feature access

**Use Both Together:**

```javascript
// Example: CloudACL utility combines both approaches
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/utils/acl.js:190-291

const groupACL = await Actinium.Utils.CloudACL(
  [
    { permission: 'read', type: 'user', objectId: user.id },
    { permission: 'write', type: 'user', objectId: user.id },
  ],
  'read-score', // Any role with this capability gets read access
  'write-score' // Any role with this capability gets write access
);

score.setACL(groupACL);
```

---

## Capability Architecture

### Server-Side Core Components

#### 1. Capability Class (`@atomic-reactor/actinium-core/lib/capability.js`)

The main Capability class manages the in-memory registry and database synchronization:

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/capability.js:226-232

class Capability {
  constructor() {
    this.roleList = [];
    this.Registry = new Registry('capability', 'group');
    this.Role = Role(this); // Role-based capability queries
    this.User = User(this); // User-based capability queries
  }
}
```

**Key Methods:**

- **`register(id, capability, order)`**: Register capability in memory
- **`get(capability)`**: Retrieve capability synchronously from registry
- **`getAsync(capability)`**: Fetch capability from database
- **`granted(capability)`**: Get roles allowed this capability
- **`restricted(capability)`**: Get roles excluded from this capability
- **`propagate()`**: Sync memory registry to database
- **`grant(params, options)`**: Add role to capability's allowed list
- **`revoke(params, options)`**: Remove role from capability's allowed list
- **`restrict(params, options)`**: Add role to capability's excluded list
- **`unrestrict(params, options)`**: Remove role from capability's excluded list

#### 2. Capability Normalization

All capabilities are normalized to ensure consistency:

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/capability.js:48-69

const normalizeCapability = (capabilityObj = {}) => {
  let allowed = op.get(capabilityObj, 'allowed', []) || [];
  let excluded = op.get(capabilityObj, 'excluded', []) || [];

  // banned is always excluded. super-admin may not be excluded, administrator may.
  excluded = _.uniq(_.flatten([excluded, 'banned'])).filter(
    (role) => role !== 'super-admin'
  );

  // administrator and super admin are always added to allowed
  allowed = _.uniq(
    _.flatten([allowed, 'administrator', 'super-admin']).filter(
      (role) => !excluded.includes(role)
    )
  );

  return {
    ...capabilityObj,
    allowed,
    excluded,
  };
};
```

**This means:**

- `super-admin` is ALWAYS in `allowed`, cannot be in `excluded`
- `administrator` is ALWAYS in `allowed` (unless explicitly in `excluded`)
- `banned` is ALWAYS in `excluded`

#### 3. Capability Checking Utilities

The main authorization functions:

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/utils/options.js:108-130

export const CloudHasCapabilities = (req, capability, strict = true) => {
  const { master } = req;

  // if no capabilities specified, deny
  if (!capability) return false;

  // Master key bypass
  if (master) return true;

  const capabilities = _.flatten([capability]);

  // Check against existing capabilities
  const permitted = strict
    ? // all capabilities required for strict
      capabilities.reduce((hasCaps, cap) => {
        return !!(hasCaps && Actinium.Capability.User.can(cap, req));
      }, true)
    : // one capability required for non-strict
      capabilities.reduce((hasCaps, cap) => {
        return !!(hasCaps || Actinium.Capability.User.can(cap, req));
      }, false);

  return permitted;
};
```

**Parameters:**

- `req`: Parse Cloud request object
- `capability`: String or array of capability names
- `strict`: When `true`, ALL capabilities required; when `false`, ANY capability suffices

### Client-Side Core Components

#### 1. Frontend Capability SDK (`@atomic-reactor/reactium-capability/sdk`)

The browser-side capability system mirrors server functionality:

```javascript
// /Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-capability/sdk/index.js:284-306

Capability.check = async (checks, strict = true, userID) => {
  if (!userID) {
    const isValidUser = await SDK.User.hasValidSession();
    userID = isValidUser ? SDK.User.current(true).id : userID;
  }

  // Super admin bypass
  const isSuperAdmin = userID
    ? await SDK.User.isRole('super-admin', userID)
    : false;
  if (isSuperAdmin === true) return true;

  checks = _.chain([checks])
    .flatten()
    .uniq()
    .value()
    .map((cap) => String(cap).toLowerCase());

  const caps = await Capability.User.get(userID);
  const match = _.intersection(caps, checks);

  return strict === true ? match.length === checks.length : match.length > 0;
};
```

#### 2. React Hooks

Two hooks for UI capability checks:

```javascript
// /Reactium-Admin-Plugins/.core/sdk/named-exports/capability.js:13-34

export const useCapabilityCheck = (capabilities, strict = true) => {
  const allowedRef = useRef(false);
  const [, update] = useState(new Date());
  const caps = _.uniq(_.compact(_.flatten([capabilities])));
  const { default: SDK } = require('reactium-core/sdk');

  useAsyncEffect(
    async (isMounted) => {
      allowedRef.current = false;
      if (caps.length < 1) {
        allowedRef.current = true;
      } else {
        allowedRef.current = await SDK.Capability.check(caps);
      }

      if (isMounted()) update(new Date());
    },
    [caps.sort().join(''), strict]
  );

  return allowedRef.current;
};
```

```javascript
// /Reactium-Admin-Plugins/.core/sdk/named-exports/capability.js:43-61

export const useCapability = (capability) => {
  const ref = useRef({});
  const [, update] = useState(new Date());
  const updateCapRef = (cap) => {
    ref.current = cap;
    update(new Date());
  };
  const { default: SDK } = require('reactium-core/sdk');

  useAsyncEffect(
    async (isMounted) => {
      const cap = await SDK.Capability.get(capability);
      if (isMounted()) updateCapRef(cap);
    },
    [capability]
  );

  return ref.current;
};
```

---

## Built-in vs Custom Capabilities

### Built-in Capabilities

Actinium automatically registers capabilities for core features:

#### Collection CRUD Capabilities

Every registered collection gets 5 capabilities:

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-capability/plugin.js:48-72

const COLLECTION = 'Capability';

Actinium.Capability.register(
    `${COLLECTION}.create`,
    {},
    Actinium.Enums.priority.highest,
);

Actinium.Capability.register(
    `${COLLECTION}.retrieve`,
    {
        allowed: ['anonymous', 'contributor', 'moderator', 'user'],
    },
    Actinium.Enums.priority.highest,
);

Actinium.Capability.register(`${COLLECTION}.update`, {}, ...);
Actinium.Capability.register(`${COLLECTION}.delete`, {}, ...);
Actinium.Capability.register(`${COLLECTION}.addField`, {}, ...);
```

**Standard CRUD capabilities for any collection:**

- `{Collection}.create` - Create new objects
- `{Collection}.retrieve` - Read/query objects
- `{Collection}.update` - Update existing objects
- `{Collection}.delete` - Delete objects
- `{Collection}.addField` - Modify schema

#### Content Type Capabilities

Content types get extended capabilities:

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/capability.js:477-498

async _ensureContentTypeCapabilities() {
    const caps = [
        'create',
        'retrieve',
        'retrieveany',     // View any user's content
        'update',
        'updateany',       // Edit any user's content
        'delete',
        'deleteany',       // Delete any user's content
        'addField',
    ];

    const { types } = await Actinium.Type.list({}, { useMasterKey: true });
    types.forEach(({ type }) => {
        const group = `content.${String(type).toLowerCase()}`;
        const config = normalizeCapability({ group });
        caps.forEach((cap) => {
            if (this.get(group)) return;
            this.register(`${group}.${cap}`, config);
        });
    });
}
```

**Example for `article` content type:**

- `content.article.create`
- `content.article.retrieve`
- `content.article.retrieveany`
- `content.article.update`
- `content.article.updateany`
- `content.article.delete`
- `content.article.deleteany`
- `content.article.addField`

#### Dynamic Publisher Capabilities

The Publisher plugin adds workflow capabilities:

```javascript
// /Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-content/ContentType/Plugins/Publisher/reactium-hooks.js:41-71

Reactium.Hook.register(
  'content-type-capabilities',
  async (capabilities, type, collection, machineName, ctValue) => {
    const statuses = _.compact(
      op
        .get(ctValue, 'fields.publisher.statuses', 'TRASH,DRAFT,PUBLISHED')
        .split(',')
    );

    if (statuses.length > 0) {
      statuses.forEach((status) => {
        capabilities.push({
          capability: `${collection}.setstatus-${status}`.toLowerCase(),
          title: __('%type: Set %status status')
            .replace('%type', type)
            .replace('%status', status),
          tooltip: __(
            'Able to set content status of type %type (%machineName) to %status'
          )
            .replace('%type', type)
            .replace('%machineName', machineName)
            .replace('%status', status),
        });
      });
    }
  }
);
```

**Example for `article` with statuses `[DRAFT, REVIEW, PUBLISHED]`:**

- `Content_article.publish`
- `Content_article.unpublish`
- `Content_article.setstatus-DRAFT`
- `Content_article.setstatus-REVIEW`
- `Content_article.setstatus-PUBLISHED`

### Custom Capabilities

Plugins can register custom capabilities:

```javascript
// Example: Type plugin custom UI capability
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-type/plugin.js:137-141

Actinium.Capability.register(
  'type-ui.view',
  {},
  Actinium.Enums.priority.highest
);
```

**Registration patterns:**

```javascript
// Minimal registration (administrators and super-admin only)
Actinium.Capability.register('my-feature.use', {});

// With allowed roles
Actinium.Capability.register('my-feature.view', {
  allowed: ['contributor', 'moderator'],
});

// With excluded roles
Actinium.Capability.register('my-feature.admin', {
  allowed: ['moderator'],
  excluded: ['contributor'],
});

// With priority for load order
Actinium.Capability.register(
  'critical-feature.access',
  { allowed: ['user'] },
  Actinium.Enums.priority.highest
);
```

---

## Server-Side Implementation

### Registering Capabilities

Capabilities should be registered during plugin initialization:

```javascript
// In plugin.js
const MOD = () => {
  const PLUGIN = {
    ID: 'MyPlugin',
    name: 'My Plugin',
    order: 100,
  };

  Actinium.Plugin.register(PLUGIN, true);

  // Register capabilities
  Actinium.Capability.register('myplugin.view', {
    allowed: ['contributor', 'moderator', 'user'],
  });

  Actinium.Capability.register('myplugin.edit', {
    allowed: ['moderator'],
  });

  Actinium.Capability.register('myplugin.admin', {});
};

export default MOD();
```

### Enforcing Capabilities in Cloud Functions

#### Pattern 1: CloudHasCapabilities Check

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-capability/plugin.js:31-44

const { CloudHasCapabilities } = Actinium.Utils;

const canEdit = (req) =>
  CloudHasCapabilities(
    req,
    ['capability.create', 'capability.update'],
    true // strict: must have BOTH capabilities
  );

const edit = async (req) => {
  if (!canEdit(req)) throw new Error('Permission denied');
  const { id, capability = {} } = req.params;
  const result = await Actinium.Capability.register(id, capability);
  if (_.isError(result)) throw result;
  return result;
};

Actinium.Cloud.define(PLUGIN.ID, 'capability-create', edit);
```

#### Pattern 2: CloudRunOptions for Escalation

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-users/plugin.js:77-84

const find = (req) => {
  const options = CloudRunOptions(req);
  // options.useMasterKey will be true if:
  // - req.master is true
  // - user is super-admin
  // - user meets optional level requirement
  return Actinium.User.list(req.params, options);
};

Actinium.Cloud.define(PLUGIN.ID, 'users', find);
```

#### Pattern 3: CloudCapOptions for Capability-Based Escalation

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/utils/options.js:165-178

Actinium.Cloud.define('MyPlugin', 'privileged-query', async (req) => {
  const options = Actinium.Utils.CloudCapOptions(
    req,
    ['admin-access', 'manager-access'], // Either capability escalates
    false, // strict: false = any capability grants access
    '>1000' // OR user level > 1000 grants access
  );

  // query will succeed if:
  // 1. User session token satisfies ACL/CLP
  // 2. User is super-admin
  // 3. User has admin-access OR manager-access capability
  // 4. User's role level is > 1000
  const query = new Parse.Query('SecureData');
  return query.find(options);
});
```

### Capability-Driven Cloud Function Examples

```javascript
// Strict: User must have ALL capabilities
Actinium.Cloud.define('MyPlugin', 'admin-function', async (req) => {
  const { CloudHasCapabilities } = Actinium.Utils;

  if (!CloudHasCapabilities(req, ['admin.users', 'admin.roles'], true)) {
    throw new Error('Requires both user and role admin capabilities');
  }

  // ... privileged operation
});

// Permissive: User needs ANY capability
Actinium.Cloud.define('MyPlugin', 'editor-function', async (req) => {
  const { CloudHasCapabilities } = Actinium.Utils;

  if (!CloudHasCapabilities(req, ['content.edit', 'content.review'], false)) {
    throw new Error('Requires edit or review capability');
  }

  // ... editor operation
});
```

### Parse Triggers with Capability Checks

```javascript
Actinium.Cloud.beforeSave('MyCollection', async (req) => {
  const { CloudHasCapabilities } = Actinium.Utils;

  // Allow super-admin and users with edit capability
  if (!CloudHasCapabilities(req, 'mycollection.update')) {
    throw new Error('Permission denied');
  }

  // Continue with save
});
```

---

## Client-Side Implementation

### Checking Capabilities in React Components

#### Using useCapabilityCheck Hook

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

#### Using SDK Directly

```javascript
import Reactium from 'reactium-core/sdk';

const checkPermissions = async () => {
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

  return { canPublish, isAdmin, canEditContent };
};
```

#### Bulk Capability Checks

For performance, use bulk checks when checking many capabilities:

```javascript
// /Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-content/ContentType/Plugins/Publisher/Editor/index.js:40-56

const checks = {
  publish: {
    capabilities: ['Content_article.publish', 'publish-content'],
    strict: false,
  },
  unpublish: {
    capabilities: ['Content_article.unpublish', 'unpublish-content'],
    strict: false,
  },
  canSetStatusDRAFT: {
    capabilities: ['Content_article.setStatus-DRAFT', 'set-content-status'],
    strict: false,
  },
};

const { publish, unpublish, canSetStatusDRAFT } = await Reactium.Cloud.run(
  'capability-bulk-check',
  { checks }
);
```

### Caching Strategy

The client SDK automatically caches capability results:

```javascript
// /Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-capability/sdk/index.js:52-64

/**
 * Time in milliseconds that controls how long to cache capability request results.
 * Default: 60000 (1 minute)
 */
Capability.cache = 60000;

/**
 * Clear all capability-related cache
 */
Capability.clearCache = () =>
  Cache.keys().forEach((key) => {
    if (String(key).startsWith('capability_')) {
      Cache.del(key);
    }
  });
```

**When cache is cleared:**

- When user logs in/out
- After capability grants/revokes
- On manual `Capability.clearCache()` call
- After cache expiry (default 60 seconds)

---

## Capability Naming Conventions

### Official Patterns

1. **Collection CRUD**: `{Collection}.{action}`

   - Example: `_User.create`, `Media.retrieve`, `Content.delete`

2. **Content Types**: `content.{typename}.{action}`

   - Example: `content.article.update`, `content.page.publish`

3. **Content Type Collection**: `Content_{typename}.{action}`

   - Example: `Content_article.setstatus-DRAFT`

4. **Feature Access**: `{feature}.{action}`

   - Example: `type-ui.view`, `mail.send`

5. **Workflow States**: `{collection}.{action}-{state}`
   - Example: `Content_article.setstatus-PUBLISHED`

### Case Sensitivity

All capability names are **normalized to lowercase**:

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-capability/plugin.js:226-229

let group = req.object.get('group');
group = String(group).toLowerCase();
group = String(group).substr(0, 1) === '_' ? group.split('_').pop() : group;
req.object.set('group', group);
```

**This means:**

- `User.View` → `user.view`
- `Content.Article.Update` → `content.article.update`
- `_Role.create` → `role.create` (leading underscore removed)

### Recommended Custom Naming

```javascript
// Feature-based
'analytics.view';
'reporting.export';
'billing.manage';

// Module-based
'crm.contacts.create';
'crm.deals.close';
'inventory.products.adjust';

// Action-based
'send-notifications';
'approve-orders';
'generate-reports';
```

---

## Integration with Parse Server

### Class-Level Permissions (CLP)

Capabilities automatically configure Parse Server CLPs:

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/collection.js:134-177

const classLevelPermissions = {};
for (const capability of [
  'create',
  'retrieve',
  'update',
  'delete',
  'addField',
]) {
  const capabilityName = `${collection}.${capability}`.toLowerCase();
  classLevelPermissions[capabilityName] = {};

  const currentCap = await Actinium.Capability.getAsync(capabilityName);
  const allowed = op.get(currentCap, 'allowed', []);

  // Add each allowed role to CLP
  allowed.forEach((role) =>
    op.set(classLevelPermissions, [capabilityName, `role:${role}`], true)
  );

  // Public if anonymous is allowed
  classLevelPermissions[capabilityName] =
    op.get(publicSetting, capability, false) === true ||
    allowed.includes('anonymous')
      ? { '*': true }
      : classLevelPermissions[capabilityName];

  // Always allow super-admin and administrator
  op.set(classLevelPermissions, [capabilityName, 'role:administrator'], true);
  op.set(classLevelPermissions, [capabilityName, 'role:super-admin'], true);
}
```

**Result:** Parse Server's CLPs mirror capability permissions, providing database-level enforcement.

### CLP Mapping

| Capability  | Parse CLP Operations   |
| ----------- | ---------------------- |
| `.create`   | `create`               |
| `.retrieve` | `find`, `count`, `get` |
| `.update`   | `update`               |
| `.delete`   | `delete`               |
| `.addField` | `addField`             |

### Capability-Driven ACLs

Use `CloudACL` to create ACLs based on capabilities:

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/utils/acl.js:190-291

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

**How it works:**

1. Fetches all roles with the specified capabilities
2. Adds those roles to the ACL with appropriate permissions
3. Combines with explicit user/role/public permissions
4. Returns a Parse.ACL ready to attach to objects

---

## Real-World Examples

### Example 1: Type Plugin Capabilities

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-type/plugin.js:102-142

if (Actinium.Capability) {
  const COLLECTION = 'Type';

  Actinium.Capability.register(
    `${COLLECTION}.create`,
    {
      allowed: ['contributor', 'moderator'],
    },
    Actinium.Enums.priority.highest
  );

  Actinium.Capability.register(
    `${COLLECTION}.retrieve`,
    {
      allowed: ['anonymous', 'contributor', 'moderator', 'user'],
    },
    Actinium.Enums.priority.highest
  );

  Actinium.Capability.register(
    `${COLLECTION}.update`,
    {
      allowed: ['moderator', 'contributor'],
    },
    Actinium.Enums.priority.highest
  );

  Actinium.Capability.register(
    `${COLLECTION}.delete`,
    {
      allowed: ['moderator', 'contributor'],
    },
    Actinium.Enums.priority.highest
  );

  Actinium.Capability.register(
    `${COLLECTION}.addField`,
    {}, // Only admin/super-admin
    Actinium.Enums.priority.highest
  );

  // Custom UI capability
  Actinium.Capability.register(
    'type-ui.view',
    {},
    Actinium.Enums.priority.highest
  );
}
```

### Example 2: Content Plugin Auto-Registration

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-content/plugin.js:68-81

Actinium.Hook.register('schema', async () => {
  if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

  PLUGIN_SCHEMA.forEach((item) => {
    const { actions = {}, collection, schema = {} } = item;

    Actinium.Collection.register(collection, actions, _.clone(schema));

    // Auto-register capability for each collection action
    Object.keys(actions).forEach((action) =>
      Actinium.Capability.register(
        String(`${collection}.${action}`).toLowerCase()
      )
    );
  });
});
```

### Example 3: Publisher Workflow Capabilities

```javascript
// /Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-content/ContentType/Plugins/Publisher/Editor/enums.js:8-30

export default {
  CAPS: {
    PUBLISH: (collection) => ({
      capabilities: [
        `${collection}.publish`.toLowerCase(),
        'publish-content', // Fallback generic capability
      ],
      strict: false, // Need either specific OR generic
    }),
    UNPUBLISH: (collection) => ({
      capabilities: [
        `${collection}.unpublish`.toLowerCase(),
        'unpublish-content',
      ],
      strict: false,
    }),
    STATUS: (collection, status) => ({
      capabilities: [
        `${collection}.setstatus-${status}`.toLowerCase(),
        'set-content-status',
      ],
      strict: false,
    }),
  },
};
```

### Example 4: Capability Bulk Check in UI

```javascript
// Real usage from Blueprint admin panel
// /Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/Blueprint/reactium-hooks.js:75-92

const capChecks = {
  'Blueprint.create': {
    capabilities: ['blueprint.create'],
  },
  'Blueprint.update': {
    capabilities: ['blueprint.update'],
  },
  'Blueprint.delete': {
    capabilities: ['blueprint.delete'],
  },
};

try {
  permissions = {
    ...permissions,
    ...(await Reactium.Cloud.run('capability-bulk-check', {
      checks: capChecks,
    })),
  };
} catch (error) {
  console.error('Capability check failed:', error);
}

// permissions now contains:
// {
//     'Blueprint.create': true,
//     'Blueprint.update': false,
//     'Blueprint.delete': true,
// }
```

---

## Common Patterns

### Pattern 1: Hierarchical Capabilities

Use generic fallback capabilities alongside specific ones:

```javascript
// Check for specific OR generic permission
const canPublish = await Reactium.Capability.check(
  [
    'Content_article.publish', // Specific to articles
    'publish-content', // Generic publish right
  ],
  false // strict: false = need only one
);
```

### Pattern 2: Progressive Permission Escalation

```javascript
const options = Actinium.Utils.CloudCapOptions(
  req,
  ['content.article.updateany', 'content.updateany'],
  false // Need either capability
);

// Users with 'updateany' capabilities get master key
// Others use their session token (may be limited by ACL)
const query = new Actinium.Query('Content');
return query.find(options);
```

### Pattern 3: Capability Guards in Hooks

```javascript
Actinium.Hook.register('content-before-save', async (req) => {
  const { CloudHasCapabilities } = Actinium.Utils;

  const status = req.object.get('status');

  if (status === 'PUBLISHED') {
    if (!CloudHasCapabilities(req, 'Content_article.publish', true)) {
      throw new Error('Cannot publish without publish capability');
    }
  }
});
```

### Pattern 4: Dynamic Capability Registration

```javascript
// Register capabilities for new content types
Actinium.Hook.register('type-saved', async (type) => {
  const machineName = type.get('machineName');
  const collection = `Content_${machineName}`;

  const actions = ['publish', 'unpublish', 'archive'];

  actions.forEach((action) => {
    Actinium.Capability.register(`${collection}.${action}`.toLowerCase(), {
      allowed: ['moderator'],
    });
  });

  await Actinium.Capability.propagate();
});
```

### Pattern 5: Frontend Capability-Based Rendering

```javascript
import { useCapabilityCheck } from 'reactium-core/sdk';

const ContentEditor = ({ contentType }) => {
  const canUpdate = useCapabilityCheck(`content.${contentType}.update`);
  const canUpdateAny = useCapabilityCheck(`content.${contentType}.updateany`);
  const canPublish = useCapabilityCheck(
    [`Content_${contentType}.publish`, 'publish-content'],
    false // Either capability works
  );

  return (
    <div>
      {canUpdate && <SaveButton />}
      {canUpdateAny && <EditAllButton />}
      {canPublish && <PublishButton />}
    </div>
  );
};
```

---

## Performance Considerations

### 1. Capability Propagation

Capabilities are loaded once at startup and cached in memory:

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/capability.js:682-703

async load(flush = false, caller) {
    await Actinium.Hook.run('before-capability-load');

    // Flush registry
    if (flush === true) this.Registry.flush();

    // Get from DB
    const capabilities = await this.fetch();
    Actinium.Cache.set('capability.loaded', true);

    // Create Content Type capabilities if they don't exist
    this._ensureContentTypeCapabilities();

    // Add to registry
    capabilities.forEach((cap) => {
        if (this.isRegistered(cap.group)) {
            this.update(cap.group, cap);
        } else {
            this.register(cap.group, cap);
        }
    });
}
```

**Performance Impact:**

- Initial load: ~100-500ms for 100+ capabilities
- Subsequent checks: O(1) lookup in memory registry
- Database writes: Queued and batched during propagation

### 2. User Capability Queries

User capabilities are computed from roles and cached:

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/capability.js:105-129

get: (user, passedRoles) => {
    const userRoles = passedRoles || Capability.User.roles(user);
    const caps = _.sortBy(
        Capability.get().filter((cap) => {
            // Super Admin bi-pass.
            if (userRoles.includes('super-admin')) {
                return true;
            }

            // Administrator bi-pass
            if (
                userRoles.includes('administrator') &&
                !Capability.restricted(cap.group, 'administrator')
            ) {
                return true;
            }

            // Intersectional match
            const granted = Capability.granted(cap.group);
            return _.intersection(userRoles, granted).length > 0;
        }),
        'group',
    );

    return caps;
},
```

**Performance Tips:**

- Pre-fetch user roles if checking multiple capabilities
- Use bulk checks (`capability-bulk-check`) instead of individual calls
- Cache user capability results on the client (default: 60s)

### 3. Frontend Caching

```javascript
// /Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-capability/sdk/index.js:236-272

Capability.get = async (capability, refresh = false) => {
  const cacheKey = 'capabilities_list';
  let caps = Cache.get(cacheKey);

  // Return cached unless refresh requested
  if (!caps || refresh === true) {
    let req = op.get(Capability.request, 'list');

    if (!req) {
      req = SDK.API.Actinium.Cloud.run('capability-get')
        .then((caps) => {
          caps = Object.values(caps);
          Cache.set(cacheKey, caps, Capability.cache); // 60s default
          op.del(Capability.request, 'list');
          return capability.length > 0
            ? caps.filter(({ group }) => capability.includes(group))
            : caps;
        })
        .catch(() => op.del(Capability.request, 'list'));

      op.set(Capability.request, 'list', req);
    }

    return req;
  }

  return capability.length > 0
    ? caps.filter(({ group }) => capability.includes(group))
    : caps;
};
```

**Client-Side Performance:**

- Capability list cached for 60 seconds by default
- User capabilities cached per user ID
- Deduplicates concurrent requests (request registry)
- Auto-refresh on cache expiry

### 4. CLP Update Performance

Capability changes trigger CLP updates:

```javascript
// /Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/collection.js:38-59

// Update Collection classLevelPermissions on capability updates
Actinium.Hook.register('capability-change', async (req) => {
  const capability = req.object.get('group');
  if (
    Actinium.Collection.loaded &&
    [
      `${collection}.create`,
      `${collection}.retrieve`,
      `${collection}.update`,
      `${collection}.delete`,
      `${collection}.addField`,
    ]
      .map((c) => String(c).toLowerCase(c))
      .includes(capability)
  ) {
    await Actinium.Collection.load(collection);
    BOOT(
      chalk.cyan(`Capability ${capability} edited.`),
      chalk.magenta(`Reloading CLP for ${collection}`)
    );
  }
});
```

**Cost:** CLP updates are expensive (Parse schema modification), so they're done:

- Only for affected collections
- After capability changes (not on every check)
- During server startup/restart

---

## Gotchas and Best Practices

### Gotchas

#### 1. Capability Names are Always Lowercase

```javascript
// WRONG - will be normalized
Actinium.Capability.register('MyFeature.Edit');

// CORRECT
Actinium.Capability.register('myfeature.edit');

// Checking works with any case (normalized internally)
const allowed = await Reactium.Capability.check('MyFeature.Edit'); // Works but avoid
```

#### 2. Super-Admin Cannot Be Restricted

```javascript
// This has NO EFFECT on super-admin
Actinium.Capability.register('dangerous-action', {
  excluded: ['super-admin'], // Ignored! Super-admin can't be excluded
});

// Super-admin will ALWAYS pass this check
CloudHasCapabilities(req, 'dangerous-action'); // true for super-admin
```

**Solution:** Check roles explicitly if you need to exclude super-admin:

```javascript
const roles = Actinium.Roles.User.get(req.user.id);
if (roles['super-admin']) {
  throw new Error('Even super-admin cannot do this');
}
```

#### 3. Empty Allowed Array = Admin Only

```javascript
// Only administrator and super-admin allowed
Actinium.Capability.register('admin-only-feature', {});

// Same as:
Actinium.Capability.register('admin-only-feature', {
  allowed: [], // Will be normalized to ['administrator', 'super-admin']
});
```

#### 4. Anonymous Capabilities Must Be Explicit

```javascript
// WRONG - anonymous users cannot access
Actinium.Capability.register('public-feature', {
  allowed: ['user'],
});

// CORRECT - include anonymous
Actinium.Capability.register('public-feature', {
  allowed: ['anonymous', 'user'],
});
```

#### 5. Client Capabilities Don't Sync Automatically

Frontend capability registration doesn't immediately sync to server:

```javascript
// This registers in browser only
Reactium.Capability.register('my-ui-feature.view');

// Sync happens on interval (default 10s) or manually:
await Reactium.Capability.propagate();
```

#### 6. Capability Checks Don't Enforce ACLs

```javascript
// User has capability but ACL might still deny
if (CloudHasCapabilities(req, 'content.article.update')) {
  // Still might fail if ACL denies this user access to this specific article!
  const article = await query.first(CloudRunOptions(req));
}
```

**Solution:** Use `CloudCapOptions` to escalate when appropriate, or check ACLs separately.

#### 7. Content Type Capabilities Use Different Naming

```javascript
// Collection-level capabilities
'Type.create'; // Generic Type collection
'Content.retrieve'; // Generic Content collection

// Content type capabilities (note the difference!)
'content.article.create'; // Lowercase, different pattern
'Content_article.publish'; // Collection name format
```

### Best Practices

#### 1. Register Capabilities at Highest Priority

```javascript
// Ensures capabilities exist before other plugins check them
Actinium.Capability.register(
  'mycollection.create',
  { allowed: ['contributor'] },
  Actinium.Enums.priority.highest // Load early
);
```

#### 2. Use Strict Mode by Default

```javascript
// GOOD: Explicit strict requirement
const canAdmin = CloudHasCapabilities(req, ['user.admin', 'role.admin'], true);

// RISKY: Permissive check should be intentional
const canEdit = CloudHasCapabilities(
  req,
  ['content.update', 'content.updateany'],
  false
);
```

#### 3. Always Normalize Capability Names

```javascript
// In your code
const capability = String(capabilityName).toLowerCase();
await Reactium.Capability.check(capability);
```

#### 4. Provide Generic Fallback Capabilities

```javascript
// Specific + generic for flexibility
const canPublish = await Reactium.Capability.check(
  [
    `Content_${typename}.publish`, // Type-specific
    'publish-content', // Generic fallback
  ],
  false
);
```

#### 5. Use Bulk Checks for Performance

```javascript
// INEFFICIENT
const canCreate = await Reactium.Capability.check('user.create');
const canUpdate = await Reactium.Capability.check('user.update');
const canDelete = await Reactium.Capability.check('user.delete');

// BETTER
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

#### 6. Clear Cache on User Changes

```javascript
Actinium.Hook.register('user-after-save', async (req) => {
  // User roles may have changed
  Actinium.Cache.del(`capabilities_${req.object.id}`);
});

Actinium.Hook.register('role-user-add', async (req) => {
  // Clear capability cache for affected user
  const { user } = req.params;
  Actinium.Cache.del(`capabilities_${user}`);
});
```

#### 7. Document Custom Capabilities

```javascript
/**
 * @api {Capability} analytics.view analytics.view
 * @apiGroup Capabilities
 * @apiDescription View analytics dashboards and reports.
 * Granted to: analyst, manager, administrator
 */
Actinium.Capability.register('analytics.view', {
  allowed: ['analyst', 'manager'],
});
```

#### 8. Use Capability Hooks for Validation

```javascript
Actinium.Hook.register('before-capability-save', async (req) => {
  const group = req.object.get('group');

  // Prevent reserved capability names
  if (group.startsWith('system.')) {
    throw new Error('Cannot create system capabilities');
  }

  // Enforce naming convention
  if (!group.match(/^[a-z0-9.-]+$/)) {
    throw new Error(
      'Capability names must be lowercase alphanumeric with dots/dashes'
    );
  }
});
```

#### 9. Handle Capability Failures Gracefully

```javascript
// Frontend
const MyComponent = () => {
  const canEdit = useCapabilityCheck('content.article.update');

  if (canEdit === null) {
    return <Loading />; // Still checking
  }

  if (canEdit === false) {
    return <PermissionDenied />;
  }

  return <Editor />;
};

// Backend
Actinium.Cloud.define('MyPlugin', 'sensitive-operation', async (req) => {
  try {
    if (!CloudHasCapabilities(req, 'sensitive.operate')) {
      throw new Error('PERMISSION_DENIED');
    }
    // ... operation
  } catch (error) {
    if (error.message === 'PERMISSION_DENIED') {
      // Log security event
      await Actinium.Log.security('Unauthorized access attempt', {
        user: req.user?.id,
        capability: 'sensitive.operate',
      });
    }
    throw error;
  }
});
```

#### 10. Use TypeScript for Capability Constants

```typescript
// capabilities.ts
export const CAPABILITIES = {
  USER: {
    VIEW: 'user.view',
    CREATE: 'user.create',
    UPDATE: 'user.update',
    DELETE: 'user.delete',
    ADMIN: 'user.admin',
  },
  CONTENT: {
    ARTICLE: {
      CREATE: 'content.article.create',
      UPDATE: 'content.article.update',
      PUBLISH: 'Content_article.publish',
    },
  },
} as const;

// Usage
import { CAPABILITIES } from './capabilities';

const canEdit = await Reactium.Capability.check(
  CAPABILITIES.CONTENT.ARTICLE.UPDATE
);
```

---

## Summary

The Actinium Capabilities System provides a robust, role-based authorization layer that:

1. **Complements Parse Server ACLs** - Use capabilities for feature-level permissions, ACLs for object-level security
2. **Scales with your application** - Dynamic capabilities for content types, custom workflows
3. **Performs efficiently** - In-memory registry, client-side caching, bulk checks
4. **Integrates deeply** - Automatic CLP configuration, ACL helpers, Parse query escalation
5. **Works everywhere** - Same capability names on frontend and backend

**When to use capabilities:**

- Controlling UI feature visibility
- Authorizing cloud function access
- Managing content publishing workflows
- Implementing role-based feature gates

**When to use ACLs instead:**

- Protecting specific database objects
- Owner-only access patterns
- User-specific data security
- Parse Server built-in security

**Best approach:** Use both together - capabilities for "can this role do X?" and ACLs for "can this user access this object?".

---

## File References

### Core Implementation

- `/Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/capability.js` - Main Capability class
- `/Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-capability/plugin.js` - Capability plugin
- `/Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-capability/schema.js` - Database schema
- `/Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/utils/options.js` - CloudHasCapabilities utility
- `/Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/utils/acl.js` - CloudACL integration
- `/Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/collection.js` - CLP integration

### Client SDK

- `/Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-capability/sdk/index.js` - Frontend SDK
- `/Reactium-Admin-Plugins/.core/sdk/named-exports/capability.js` - React hooks

### Examples

- `/Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-type/plugin.js` - Type plugin capabilities
- `/Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-roles/plugin.js` - Role plugin capabilities
- `/Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-content/ContentType/Plugins/Publisher/` - Publisher workflow capabilities

---

**Research completed.** This document provides comprehensive coverage of the Actinium Capabilities System based on actual source code analysis.
