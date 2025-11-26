<!-- v1.0.0 -->

# Actinium Roles System Deep Dive

> **Purpose**: Complete architecture of role-based access control, role hierarchy, user-role relations, and cache management

**Source**: actinium-core/lib/roles.js:1-304, actinium-roles/plugin.js:1-300

---

## Architecture Overview

The Actinium Roles system provides:

1. **Hierarchical Role Levels** - Numeric levels for privilege comparison
2. **Role Relations** - Roles can contain other roles (inheritance)
3. **User-Role Assignment** - Many-to-many relation via Parse.Role
4. **Role Cache** - In-memory cache for fast role lookups
5. **Protected Roles** - Built-in roles (anonymous, super-admin) with special handling
6. **ACL-Based Role Access** - Role objects themselves have ACL protection

---

## Built-In Roles (DEFAULT Roles)

### Role Hierarchy Definition

**File**: actinium-core/lib/roles.js:10-55

```javascript
const DEFAULTS = [
    {
        name: 'banned',
        label: 'Banned User',
        level: -1,
        acl: ['administrator', 'super-admin', 'moderator'],
    },
    {
        name: 'anonymous',
        label: 'Anonymous',
        level: 0,
    },
    {
        name: 'user',
        label: 'Standard User',
        level: 1,
    },
    {
        name: 'contributor',
        label: 'Contributor',
        level: 10,
        roles: ['user'],
        acl: ['administrator', 'super-admin'],
    },
    {
        name: 'moderator',
        label: 'Moderator',
        level: 100,
        roles: ['user', 'contributor'],
        acl: ['administrator', 'super-admin'],
    },
    {
        name: 'administrator',
        label: 'Administrator',
        level: 1000,
        roles: ['user', 'contributor', 'moderator'],
        acl: ['administrator', 'super-admin'],
    },
    {
        name: 'super-admin',
        label: 'Super Administrator',
        level: 10000,
        roles: ['user', 'contributor', 'moderator', 'administrator'],
        acl: ['super-admin'],
    },
];
```

**Source**: actinium-core/lib/roles.js:10-55

### Role Properties Explained

- **name**: Unique identifier (lowercase-with-hyphens)
- **label**: Display name for UI
- **level**: Numeric privilege level (-1 to 10000)
- **roles**: Array of role names this role contains (inheritance)
- **acl**: Array of role names allowed to modify this role

### Level Hierarchy

```
-1   = banned (access revoked)
0    = anonymous (implicit for all users)
1    = user (standard authenticated user)
10   = contributor (can create content)
100  = moderator (can moderate content)
1000 = administrator (system administration)
10000 = super-admin (unrestricted access)
```

**Usage Pattern**:

```javascript
// Check if user has at least moderator level
if (Actinium.Roles.User.is(userId, 100)) {
    // User has moderator or higher (admin, super-admin)
}

// Check if user has specific role name
if (Actinium.Roles.User.is(userId, 'super-admin')) {
    // User has super-admin role
}
```

**Source**: actinium-core/lib/roles.js:217-229

---

## Role Relations (Role Inheritance)

### Parse.Role Relations API

Roles contain **two Parse.Relation fields**:

1. **users** - Relation to _User collection (which users have this role)
2. **roles** - Relation to _Role collection (which roles are contained in this role)

### Adding Roles to Roles (Inheritance)

**Pattern** (actinium-core/lib/roles.js:276-285):

```javascript
roles = roles.map((role) => {
    const { name } = role.toJSON();
    const roleData = _.findWhere(ENV.ROLES, { name }) || {};

    if (op.has(roleData, 'roles')) {
        const related = roles.filter((r) =>
            roleData.roles.includes(r.get('name')),
        );
        role.getRoles().add(related); // Add related roles
    }

    return role;
});
```

**Source**: actinium-core/lib/roles.js:276-285

**Example**: Administrator role contains [user, contributor, moderator]

**Implication**: User with 'administrator' role implicitly has all contained roles

### Querying Role Relations

**Pattern** (actinium-core/lib/roles.js:66-80):

```javascript
// Decorate role with user list
await item
    .get('users')
    .query()
    .each((item) => {
        const { avatar, objectId, username } = item.toJSON();
        users[objectId] = { avatar, objectId, username };
    }, options);

// Decorate role with contained roles
await item
    .get('roles')
    .query()
    .each((item) => {
        const { level, name, objectId, label } = item.toJSON();
        roles[objectId] = { label, level, name, objectId };
    }, options);
```

**Source**: actinium-core/lib/roles.js:65-80

**Result**: Role object decorated with `userList` and `roleList` properties

---

## User-Role Assignment

### Adding Users to Roles

**Cloud Function**: `role-user-add`

```javascript
Actinium.Cloud.run('role-user-add', {
    user: 'user-objectId',
    role: 'contributor',
}, { sessionToken: 'user-session-token' });
```

**Implementation** (actinium-roles/plugin.js:110-135):

```javascript
const User = {
    add: async (req) => {
        const { role, user } = req.params;
        const opts = CloudRunOptions(req);

        let roleObj = await new Parse.Query(COLLECTION)
            .equalTo('name', role)
            .first(opts);

        if (!roleObj) {
            return Promise.reject('invalid role');
        }

        const userObj = await new Parse.Query(Parse.User)
            .equalTo('objectId', user)
            .first(opts);

        if (!userObj) {
            return Promise.reject('invalid user');
        }

        roleObj.getUsers().add(userObj); // Add user to role's users relation

        roleObj = await roleObj.save(null, opts);

        return SDK.list(req); // Return updated role list
    },
};
```

**Source**: actinium-roles/plugin.js:110-135

### Removing Users from Roles

**Cloud Function**: `role-user-remove`

```javascript
Actinium.Cloud.run('role-user-remove', {
    user: 'user-objectId',
    role: 'contributor',
}, { sessionToken: 'user-session-token' });
```

**Implementation** (actinium-roles/plugin.js:137-162):

```javascript
remove: async (req) => {
    const { role, user } = req.params;
    const opts = CloudRunOptions(req);

    let roleObj = await new Parse.Query(Parse.Role)
        .equalTo('name', role)
        .first(opts);

    if (!roleObj) {
        return Promise.reject('invalid role');
    }

    const userObj = await new Parse.Query(Parse.User)
        .equalTo('objectId', user)
        .first(opts);

    if (!userObj) {
        return Promise.reject('invalid user');
    }

    roleObj.getUsers().remove(userObj); // Remove user from relation

    roleObj = await roleObj.save(null, opts);

    return SDK.list(req);
}
```

**Source**: actinium-roles/plugin.js:137-162

### SDK Helper Methods

```javascript
// Server-side only
Actinium.Roles.User.add(userId, 'contributor', { useMasterKey: true });
Actinium.Roles.User.remove(userId, 'contributor', { useMasterKey: true });
```

**Source**: actinium-core/lib/roles.js:211-215

---

## Role Cache Management

### Cache Structure

**Cache Key**: `'roles'`

**Value**: Object indexed by role name

```javascript
{
  "anonymous": {
    "name": "anonymous",
    "label": "Anonymous",
    "level": 0,
    "objectId": "abc123",
    "users": {},
    "roles": {}
  },
  "super-admin": {
    "name": "super-admin",
    "label": "Super Administrator",
    "level": 10000,
    "objectId": "xyz789",
    "users": {
      "userId1": { "avatar": "...", "objectId": "userId1", "username": "admin" }
    },
    "roles": {
      "roleId1": { "label": "Administrator", "level": 1000, "name": "administrator", "objectId": "roleId1" }
    }
  }
}
```

### Loading Roles into Cache

**Method**: `Roles.list()`

**Implementation** (actinium-core/lib/roles.js:118-159):

```javascript
Roles.list = async (req, opts) => {
    let output = [];
    opts = opts || CloudRunOptions(req);

    // Create query with high limit
    const qry = new Parse.Query(COLLECTION).skip(0).limit(1000);

    // Get first page
    let results = await qry.find(opts);

    // If no roles exist, initialize defaults
    if (results.length < 1) {
        results = await Roles.init();
    }

    // Decorate with user/role relations
    results = await decorateRoles(results, opts);

    // Paginate through all results
    while (results.length > 0) {
        output = output.concat(
            results.map((item) => {
                item = item.toJSON();
                item['users'] = item.userList || {};
                item['roles'] = item.roleList || {};
                delete item.userList;
                delete item.roleList;
                return item;
            }),
        );
        qry.skip(Object.keys(output).length);
        results = await qry.find(opts);
    }

    // Format as object indexed by name
    output = _.indexBy(output, 'name');

    // Cache roles
    Actinium.Cache.set('roles', output);

    return Promise.resolve(output);
};
```

**Source**: actinium-core/lib/roles.js:118-159

**Trigger**: Automatically called on startup via `Roles.load()`

### Cache Invalidation

**Trigger**: afterSave hook on _Role collection

```javascript
const afterSave = async () => {
    await SDK.list({ useMasterKey: true }); // Refresh roles cache

    await Actinium.Cloud.run(
        'acl-targets',
        { cache: true },
        { useMasterKey: true },
    ); // Refresh dependent acl-targets cache
};
```

**Source**: actinium-roles/plugin.js:186-194

**Why**: Roles change infrequently, so cache-first pattern is efficient

### Accessing Cached Roles

```javascript
// Get all roles
const allRoles = Actinium.Roles.get();

// Get specific role by name
const adminRole = Actinium.Roles.get('administrator');

// Get role by level
const moderatorRole = Actinium.Roles.get(100);

// Get role by objectId
const roleById = Actinium.Roles.get('roleObjectId');
```

**Implementation** (actinium-core/lib/roles.js:95-116):

```javascript
Roles.get = (search) => {
    return _.chain(
        Object.values(Actinium.Cache.get('roles', {})).filter(
            ({ name, level, objectId }) =>
                !search ||
                name === search ||
                level === search ||
                objectId === search,
        ),
    )
        .sortBy('level')
        .value()
        .reverse()
        .reduce((obj, item) => {
            const { name } = item;
            delete item.ACL;
            delete item.createdAt;
            delete item.updatedAt;
            obj[name] = item;
            return obj;
        }, {});
};
```

**Source**: actinium-core/lib/roles.js:95-116

---

## User Role Retrieval

### Get Roles for Single User

```javascript
const userRoles = Actinium.Roles.User.get(userId);
// Returns: { anonymous: 0, user: 1, contributor: 10 }
```

**Implementation** (actinium-core/lib/roles.js:187-209):

```javascript
Roles.User.get = (search) => {
    return _.chain(
        Object.values(Roles.get()).filter(({ users = {} }) => {
            return (
                _.findWhere(Object.values(users), { objectId: search }) ||
                _.findWhere(Object.values(users), { username: search })
            );
        }),
    )
        .sortBy('level')
        .value()
        .reverse()
        .reduce(
            (obj, { name, level }) => {
                obj[name] = level;
                return obj;
            },
            {
                // always include anonymous
                anonymous: 0,
            },
        );
};
```

**Source**: actinium-core/lib/roles.js:187-209

**Return Format**: Object with role names as keys, levels as values

**Implicit anonymous**: All users always have `anonymous: 0`

### Get Roles for Multiple Users

```javascript
const userRoles = Actinium.Roles.User.getMany([user1, user2]);
// Returns:
// {
//   "userId1": { anonymous: 0, user: 1 },
//   "userId2": { anonymous: 0, user: 1, administrator: 1000 }
// }
```

**Implementation** (actinium-core/lib/roles.js:169-185):

```javascript
Roles.User.getMany = (users = []) => {
    const byUser = users.reduce((init, user) => {
        init[user.id || user.objectId] = { anonymous: 0 };
        return init;
    }, {});

    const allRoles = Object.values(Roles.get());
    allRoles.forEach((role) => {
        const { users = {}, name, level } = role;
        Object.values(users).forEach((user) => {
            const id = user.id || user.objectId;
            if (id in byUser) byUser[id][name] = level;
        });
    });

    return byUser;
};
```

**Source**: actinium-core/lib/roles.js:169-185

**Use Case**: Efficient batch role lookup (e.g., user list view)

---

## Role Authorization Checks

### Check If User Has Role

```javascript
// By role name
if (Actinium.Roles.User.is(userId, 'administrator')) {
    // User has administrator role
}

// By role level (checks if user has ANY role >= level)
if (Actinium.Roles.User.is(userId, 100)) {
    // User has level 100 or higher (moderator, admin, super-admin)
}
```

**Implementation** (actinium-core/lib/roles.js:217-229):

```javascript
Roles.User.is = (user, role) => {
    // All users are granted implicit anonymous role
    if (role === 'anonymous') return true;

    const roleObj = Actinium.Roles.User.get(user);

    if (isNaN(role)) {
        // String role name
        return op.has(roleObj, role);
    } else {
        // Numeric level - check if max level >= requested level
        const level = _.max(Object.values(roleObj)) || 0;
        return level >= role;
    }
};
```

**Source**: actinium-core/lib/roles.js:217-229

**Pattern**:
- String argument: Exact role name match
- Number argument: Level comparison (user's max level >= requested level)

### beforeLogin Hook (Banned User Check)

```javascript
const beforeLogin = async (req) => {
    const { object: user } = req;
    const roles = Actinium.Roles.User.get(user.id);

    if (op.has(roles, 'banned')) {
        throw new Error('Access denied, you have been banned.');
    }

    await Actinium.Hook.run('user-before-login', user);
};
```

**Source**: actinium-users/plugin.js:66-75

**Trigger**: Parse Server beforeLogin trigger

**Effect**: Prevents banned users from logging in

---

## Role ACL Protection

### Default Role ACL (Public Read, Public Write)

```javascript
const defaultRoleACL = () => {
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(true);
    return acl;
};
```

**Source**: actinium-roles/plugin.js:48-53

**Why**: Roles are readable by all users for authorization checks

### Role-Specific ACL (Restricted Write)

**Pattern** (actinium-roles/plugin.js:84-94):

```javascript
if (op.has(roleData, 'acl')) {
    ACL = ACL || defaultRoleACL();
    let newACL = new Parse.ACL(ACL.toJSON());

    roles.forEach((r) => {
        if (roleData.acl.includes(r.get('name'))) {
            newACL.setPublicWriteAccess(false); // Remove public write
            newACL.setRoleWriteAccess(r, true); // Grant write to specific role
        }
    });

    role.setACL(newACL);
}
```

**Source**: actinium-roles/plugin.js:84-94

**Example**: 'super-admin' role can only be modified by users with 'super-admin' role

### Protected Role Enforcement

**beforeSave Hook** (actinium-roles/plugin.js:206-214):

```javascript
const beforeSave = (req) => {
    const { name } = req.object.toJSON();

    if (name === 'anonymous' && !req.master && !req.object.isNew()) {
        throw new Error(
            `The ${name} role is protected and should not be edited.`,
        );
    }
};
```

**Source**: actinium-roles/plugin.js:206-214

**beforeDelete Hook** (actinium-roles/plugin.js:196-204):

```javascript
const beforeDelete = (req) => {
    const { name } = req.object.toJSON();

    if (name === 'anonymous' && !req.master) {
        throw new Error(
            `The ${name} role is protected and should not be deleted.`,
        );
    }
};
```

**Source**: actinium-roles/plugin.js:196-204

**Protection**: 'anonymous' role cannot be edited or deleted without master key

---

## Role Creation

### Create New Role

**Cloud Function**: `role-create`

```javascript
Actinium.Cloud.run('role-create', {
    roleArray: [
        {
            name: 'editor',
            label: 'Editor',
            level: 50,
            roles: ['user'], // Contains 'user' role
            acl: ['administrator', 'super-admin'], // Only admins can edit
        },
    ],
}, { useMasterKey: true });
```

**Implementation** (actinium-roles/plugin.js:103-107):

```javascript
const create = async (req) => {
    const { ACL, roleArray = [] } = req.params;
    await addRoles(req, roleArray, ACL);
    return SDK.list(req); // Refresh cache and return updated list
};
```

**Source**: actinium-roles/plugin.js:103-107

**Effect**: Creates role, sets up relations, applies ACL, refreshes cache

### SDK Helper Method

```javascript
// Server-side
Actinium.Roles.create({
    name: 'editor',
    label: 'Editor',
    level: 50,
    roles: ['user'],
    acl: ['administrator'],
}, { useMasterKey: true });
```

**Source**: actinium-core/lib/roles.js:231-249

---

## Role Removal

### Delete Role

**Cloud Function**: `role-remove`

```javascript
Actinium.Cloud.run('role-remove', {
    role: 'editor',
}, { useMasterKey: true });
```

**Implementation** (actinium-roles/plugin.js:169-184):

```javascript
const remove = async (req) => {
    const { role } = req.params;
    const opts = CloudRunOptions(req);

    const roleObj = new Parse.Query(COLLECTION)
        .equalTo('name', role)
        .first(opts);

    if (!roleObj) {
        return SDK.list(req);
    }

    await roleObj.destroy(opts);

    return SDK.list(req); // Refresh cache
};
```

**Source**: actinium-roles/plugin.js:169-184

**Caveat**: Protected roles (anonymous) cannot be deleted (enforced by beforeDelete hook)

---

## Role Initialization

### Default Role Seeding

**Method**: `Roles.init()`

**Trigger**: Automatically called if no roles exist

```javascript
Roles.init = () =>
    Parse.Object.saveAll(
        DEFAULTS.map(({ label, level, name }) =>
            new Parse.Role(name, Roles.defaultRoleACL())
                .set('label', label)
                .set('level', level),
        ),
        { useMasterKey: true },
    ).then((roles) => {
        // Set up role relations
        roles = roles.map((role) => {
            const { name } = role.toJSON();
            const roleData = _.findWhere(ENV.ROLES, { name }) || {};

            if (op.has(roleData, 'roles')) {
                const related = roles.filter((r) =>
                    roleData.roles.includes(r.get('name')),
                );
                role.getRoles().add(related);
            }

            if (op.has(roleData, 'acl')) {
                const ACL = Roles.defaultRoleACL();
                roles.forEach((r) => {
                    if (roleData.acl.includes(r.get('name'))) {
                        ACL.setPublicWriteAccess(false);
                        ACL.setRoleWriteAccess(r, true);
                    }
                });
                role.setACL(ACL);
            }

            return role;
        });

        return Parse.Object.saveAll(roles, { useMasterKey: true });
    });
```

**Source**: actinium-core/lib/roles.js:267-302

**When**: First startup of Actinium instance (no roles in database)

---

## Collection Registration

### _Role Collection Configuration

```javascript
Actinium.Collection.register('_Role', {
    create: false,    // Cannot create via Collection API (use role-create cloud function)
    retrieve: true,   // Can retrieve roles
    update: false,    // Cannot update via Collection API (use role-user-add/remove)
    delete: false,    // Cannot delete via Collection API (use role-remove cloud function)
    addField: false,  // Cannot add fields to _Role
});
```

**Source**: actinium-roles/plugin.js:40-46

**Effect**: Restricts direct database access, enforces cloud function usage

### Role Capabilities

```javascript
const capabilities = [
    '_Role.create',
    '_Role.retrieve',
    '_Role.update',
    '_Role.delete',
    '_Role.addField',
];

capabilities.forEach((cap) =>
    Actinium.Capability.register(cap, {}, Actinium.Enums.priority.highest),
);
```

**Source**: actinium-roles/plugin.js:28-38

**Usage**: Cloud functions check capabilities (e.g., CloudHasCapabilities(req, ['_Role.create']))

---

## Best Practices

### 1. Use Cache-First Pattern

**Good**:
```javascript
const roles = Actinium.Roles.get(); // Fast (from cache)
```

**Bad**:
```javascript
const qry = new Parse.Query('_Role');
const roles = await qry.find({ useMasterKey: true }); // Slow (database query)
```

### 2. Check Roles by Level for Minimum Privilege

**Good**:
```javascript
if (Actinium.Roles.User.is(userId, 100)) {
    // User is moderator OR higher
}
```

**Bad**:
```javascript
if (Actinium.Roles.User.is(userId, 'moderator') ||
    Actinium.Roles.User.is(userId, 'administrator') ||
    Actinium.Roles.User.is(userId, 'super-admin')) {
    // Verbose and fragile
}
```

### 3. Always Include 'anonymous' in Role Checks

**Why**: All users implicitly have `anonymous: 0` role

```javascript
const roles = Actinium.Roles.User.get(userId);
// Always returns { anonymous: 0, ...otherRoles }
```

### 4. Use beforeLogin Hook for Access Control

```javascript
Actinium.Hook.register('user-before-login', async (user) => {
    const roles = Actinium.Roles.User.get(user.id);

    if (op.has(roles, 'banned')) {
        throw new Error('Access denied');
    }

    // Check custom conditions
}, Actinium.Enums.priority.highest);
```

### 5. Invalidate Cache After Role Changes

**Automatic**: afterSave hook refreshes cache

**Manual** (if needed):
```javascript
await Actinium.Roles.list({}, { useMasterKey: true });
```

---

## Common Gotchas

### 1. Forgetting 'anonymous' is Implicit

**Symptom**: Checks fail for users with no explicit roles

**Solution**: All users have `anonymous: 0` automatically

### 2. Not Refreshing Cache After Manual Updates

**Symptom**: Stale role data

**Solution**: afterSave hook handles this automatically

### 3. Comparing Levels Incorrectly

**Bad**:
```javascript
if (userLevel === 100) // Only exact match
```

**Good**:
```javascript
if (userLevel >= 100) // Moderator or higher
```

**Better**:
```javascript
if (Actinium.Roles.User.is(userId, 100)) // Framework handles comparison
```

### 4. Trying to Delete 'anonymous' Role

**Symptom**: Error "The anonymous role is protected"

**Solution**: Don't delete built-in roles

### 5. Assuming Role Relations Auto-Populate

**Symptom**: `role.get('users')` is Parse.Relation, not array

**Solution**: Query relation explicitly:
```javascript
await role.get('users').query().find(options);
```

### 6. Not Using CloudRunOptions in Cloud Functions

**Symptom**: ACL errors, session token lost

**Solution**: Always use `CloudRunOptions(req)` for session token propagation

---

## Integration with Other Systems

### Capability System Integration

**Pattern**: Roles grant capabilities

```javascript
// Check if user's roles grant capability
if (Actinium.Capability.User.can(userId, 'content.create')) {
    // User has capability via their role(s)
}
```

**See**: [Actinium Capabilities](./ACTINIUM_CAPABILITIES.md)

### ACL Generation with Roles

**Pattern**: Use role names in CloudACL

```javascript
const acl = await Actinium.Utils.CloudACL(
    [
        { type: 'role', name: 'administrator', permission: 'write' },
        { type: 'role', name: 'moderator', permission: 'read' },
    ],
);
```

**See**: [Cloud Functions - CloudACL](./CLOUD_FUNCTIONS.md#cloudacl)

### Collection CLP Generation

**Pattern**: Roles used in Class-Level Permissions

```javascript
Actinium.Collection.register('Content', {
    // Roles with 'content.create' capability can create
});
```

**See**: [Collection Registration - CLP Generation](./COLLECTION_REGISTRATION.md)

---

## Summary

**Core Concepts**:
- Hierarchical levels (-1 to 10000)
- Role relations (inheritance via roles field)
- User-role assignment (many-to-many via users relation)
- Cache-first pattern for performance
- Protected roles (anonymous cannot be deleted)

**Key Methods**:
- `Actinium.Roles.get(search)` - Get roles from cache
- `Actinium.Roles.User.get(userId)` - Get user's roles
- `Actinium.Roles.User.is(userId, roleOrLevel)` - Check authorization
- `Actinium.Roles.list()` - Refresh cache from database

**Cloud Functions**:
- `role-create` - Create new role
- `role-remove` - Delete role
- `role-user-add` - Add user to role
- `role-user-remove` - Remove user from role
- `roles` - Get all roles
- `role` - Get specific role

**Best Practices**:
- Use cache-first pattern
- Check levels for minimum privilege
- Use beforeLogin for access control
- Let afterSave hook manage cache invalidation

---

**Related Documentation**:
- [Actinium Capabilities](./ACTINIUM_CAPABILITIES.md) - Capability-based authorization
- [Cloud Functions](./CLOUD_FUNCTIONS.md) - CloudRunOptions, session tokens
- [Parse Query Patterns](./PARSE_QUERY_PATTERNS.md) - Querying roles efficiently
- [Collection Registration](./COLLECTION_REGISTRATION.md) - CLP integration with roles
