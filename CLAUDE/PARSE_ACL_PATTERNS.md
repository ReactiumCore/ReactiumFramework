<!-- v1.0.0 -->

# Parse Server ACL Patterns and Object-Level Access Control

**Last Updated**: Nov 27, 2025
**Relevance**: Critical for secure content management and privacy controls

---

## Overview

Parse Server provides **two complementary security layers**:

1. **ACL (Access Control List)** - Object-level permissions (read/write for individual Parse.Objects)
2. **CLP (Collection Level Permissions)** - Collection-wide permissions (see [COLLECTION_REGISTRATION.md](./COLLECTION_REGISTRATION.md))

**Key Distinction**:
- **ACL**: "Can user X read/write THIS SPECIFIC object?"
- **CLP**: "Can users create/read/update/delete ANY object in this collection?"

**When both exist**: Parse Server requires BOTH to allow access (ACL AND CLP must permit)

---

## ACL Architecture

### Parse.ACL Object Structure

```javascript
// Internal structure (simplified)
{
  "read": {
    "userId1": true,
    "role:admin": true,
    "*": false  // public read = false
  },
  "write": {
    "userId1": true,
    "role:admin": true,
    "*": false  // public write = false
  }
}
```

**Source**: Parse Server SDK internals

### Core ACL API

```javascript
// Create new ACL
const acl = new Parse.ACL();

// Public access
acl.setPublicReadAccess(true);   // Anyone can read
acl.setPublicWriteAccess(false); // Only ACL-specified users can write

// User-specific access
acl.setReadAccess(userId, true);   // Specific user can read
acl.setWriteAccess(userId, false); // Deny write for user

// Role-based access
acl.setRoleReadAccess('admin', true);
acl.setRoleWriteAccess('admin', true);

// Apply to object
parseObject.setACL(acl);

// Retrieve ACL
const currentACL = parseObject.getACL();
```

**Source**: Parse SDK documentation, used throughout framework

---

## CloudACL Helper Pattern

**Purpose**: Generate capability-based ACLs for cloud functions

**Signature**:
```javascript
await Actinium.Utils.CloudACL(
  permissions,      // Array of permission objects
  readCapability,   // String - capability for read access (optional)
  writeCapability,  // String - capability for write access (optional)
  existingACL       // Parse.ACL - starting point (optional)
)
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/utils/acl.js:132-292`

### Permission Object Structure

```javascript
{
  permission: 'read' | 'write',
  type: 'public' | 'role' | 'user',
  objectId: 'userId',  // Required if type === 'user'
  name: 'roleName',    // Required if type === 'role'
  allow: true          // Optional, defaults to true
}
```

### CloudACL Algorithm

1. **Empty permissions array** → Public read, privileged write (default)
2. **Fetch capability-granted roles** → Map readCap/writeCap to roles with those capabilities
3. **Group permissions** → Separate read/write, then by type (public/role/user)
4. **Apply permissions** → Call ACL setters for each permission
5. **Special handling** → 'anonymous' role maps to setPublicReadAccess/setPublicWriteAccess

**Source**: `actinium-core/lib/utils/acl.js:190-292`

---

## Common ACL Patterns

### 1. User-Owned Content (Author Only)

**Use Case**: Blog post, profile, private document

```javascript
// Content plugin beforeSave hook
const ACL = req.object.getACL() || new Actinium.ACL();

ACL.setPublicReadAccess(false);
ACL.setPublicWriteAccess(false);

if (user) {
    ACL.setReadAccess(user.id, true);
    ACL.setWriteAccess(user.id, true);
}

// Administrators can always access
['super-admin', 'administrator'].forEach(role => {
    ACL.setRoleReadAccess(role, true);
    ACL.setRoleWriteAccess(role, true);
});

req.object.setACL(ACL);
```

**Source**: `actinium-content/sdk.js:311-327` (beforeSave hook)

**Pattern**: Private by default, owner + admin access

---

### 2. Public Read, Restricted Write

**Use Case**: Published articles, product listings

```javascript
const acl = new Parse.ACL();

// Anyone can read
acl.setPublicReadAccess(true);
acl.setPublicWriteAccess(false);

// Only content owner can write
if (user) {
    acl.setWriteAccess(user.id, true);
}

// Admins can write
acl.setRoleWriteAccess('administrator', true);

object.setACL(acl);
```

**Pattern**: Open read, controlled write

---

### 3. Capability-Based Access (Settings Pattern)

**Use Case**: Settings groups with fine-grained permissions

```javascript
const permissions = [
    {
        permission: 'read',
        type: 'public',
        allow: false,  // Not public
    },
];

const groupACL = await Actinium.Utils.CloudACL(
    permissions,
    `setting.${group}-get`,  // Read capability
    `setting.${group}-set`,  // Write capability
    obj.getACL()
);

obj.setACL(groupACL);
```

**Source**: `actinium-settings/plugin.js:102-121` (setting-set-group cloud function)

**Pattern**: Capability-driven, role-agnostic access control

---

### 4. Role-Based Team Collaboration

**Use Case**: Multiple users can edit shared content

```javascript
const acl = new Parse.ACL();

// Team members
['contributor', 'moderator', 'administrator'].forEach(role => {
    acl.setRoleReadAccess(role, true);
    acl.setRoleWriteAccess(role, true);
});

// Public can read
acl.setPublicReadAccess(true);

object.setACL(acl);
```

**Pattern**: Role-based multi-user access

---

### 5. Self-Protecting Roles (Role ACL Pattern)

**Use Case**: Prevent non-admins from modifying role membership

```javascript
const defaultRoleACL = () => {
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(true);  // Anyone can see roles exist
    acl.setPublicWriteAccess(true); // Default (will be restricted below)
    return acl;
};

// Apply role-specific ACL from ENV.ROLES configuration
if (roleData.acl) {  // e.g., ['administrator', 'super-admin']
    const ACL = defaultRoleACL();
    roleData.acl.forEach(roleName => {
        ACL.setPublicWriteAccess(false);  // Disable public write
        ACL.setRoleWriteAccess(roleName, true);  // Only these roles can edit
    });
    role.setACL(ACL);
}
```

**Source**: `actinium-roles/plugin.js:48-93`, `actinium-core/lib/roles.js:252-296`

**Pattern**: Roles protect themselves via ACL - only higher-privileged roles can modify membership

**Real Config**:
```javascript
ENV.ROLES = [
    {
        name: 'banned',
        acl: ['administrator', 'super-admin', 'moderator']
    },
    {
        name: 'contributor',
        acl: ['administrator', 'super-admin']
    }
]
```

---

### 6. User Profile ACL (User Collection)

**Use Case**: Users control their own profile, admins can modify all

```javascript
// User afterSave hook
let acl = req.object.getACL();
if (!acl) {
    const roles = Actinium.Roles.get();

    acl = new Parse.ACL(req.object);  // User can read/write own profile

    // Privileged roles can write
    ['super-admin', 'administrator', 'moderator']
        .filter(role => op.has(roles, role))
        .forEach(role => {
            acl.setRoleWriteAccess(role, true);
        });

    req.object.setACL(acl);
    return req.object.save(null, { useMasterKey: true });
}
```

**Source**: `actinium-users/plugin.js:373-396` (user-after-save hook)

**Pattern**: Self + admin access, set once on creation

---

## ACL vs CLP Decision Matrix

| Scenario | Use ACL | Use CLP | Both |
|----------|---------|---------|------|
| **User-owned content** (only author can edit) | ✅ Yes | No | Recommended |
| **Role-based access** (all admins can edit all) | Optional | ✅ Yes | Best |
| **Public data, restricted create** (anyone reads, auth creates) | No | ✅ Yes | No |
| **Per-object privacy** (some public, some private) | ✅ Yes | ✅ Yes | **Required** |
| **Performance-critical reads** (avoid ACL checks) | No | ✅ Yes | No |
| **Team collaboration** (multiple specific users) | ✅ Yes | ✅ Yes | **Required** |

**Rule of Thumb**:
- **CLP**: Collection-wide rules (all objects same permissions)
- **ACL**: Per-object rules (objects have different permissions)
- **Both**: Fine-grained control with collection-level safety net

---

## Integration with Framework Systems

### Capability System Integration

```javascript
// CloudACL automatically maps capabilities to roles
const acl = await Actinium.Utils.CloudACL(
    [],
    'content.read',   // Any role with this capability gets read
    'content.write'   // Any role with this capability gets write
);
```

**How it works**:
1. Calls `Actinium.Capability.granted(capName)` → returns role names
2. Maps role names to role objects via `AclTargets` cache
3. Applies `setRoleReadAccess`/`setRoleWriteAccess` for each role

**Source**: `actinium-core/lib/utils/acl.js:207-223`

### Hook Integration

**content-acl hook** - Modify ACL before save:
```javascript
Actinium.Hook.register('content-acl', async req => {
    const acl = req.object.getACL();

    // Custom ACL logic
    if (req.object.get('status') === 'PUBLISHED') {
        acl.setPublicReadAccess(true);
    }

    req.object.setACL(acl);
});
```

**Source**: `actinium-content/sdk.js:329` (content beforeSave hook)

### CloudRunOptions and Session Tokens

**CRITICAL**: ACLs only work if session token is passed

```javascript
const options = Actinium.Utils.CloudRunOptions(req);
// Includes sessionToken from logged-in user

const query = new Parse.Query('Content');
const results = await query.find(options);
// ✅ ACL enforced - user sees only objects they can read
```

**Without session token**:
```javascript
const results = await query.find({ useMasterKey: true });
// ⚠️ ACL bypassed - sees ALL objects regardless of ACL
```

**Source**: `actinium-core/lib/utils/options.js:38-68`

---

## AclTargets Helper

**Purpose**: Fetch all users and roles for ACL UI selection (e.g., "who can access this?")

```javascript
const { users, roles } = await Actinium.Utils.AclTargets({
    master: true,
    params: {
        search: 'john',  // Optional filter
        fresh: false,    // Use cache if available
        cache: true      // Cache results
    }
});
```

**Returns**:
```javascript
{
    users: [
        { objectId, username, email, fname, lname }
    ],
    roles: [
        { objectId, name, label }
    ]
}
```

**Caching**: Results cached in `Actinium.Cache.get('acl-targets')` for performance

**Source**: `actinium-core/lib/utils/acl.js:5-130`

**Real Usage**: Admin UI for selecting ACL targets, capability-based ACL generation

---

## Common Gotchas

### 1. Forgetting to Pass Session Token

**Problem**:
```javascript
// ❌ ACL not enforced
const query = new Parse.Query('Content');
const results = await query.find();
```

**Solution**:
```javascript
// ✅ ACL enforced
const options = CloudRunOptions(req);
const results = await query.find(options);
```

**Why**: Without session token, Parse Server doesn't know WHO is querying → cannot check ACL

---

### 2. ACL vs CLP Confusion

**Problem**: Setting ACL but CLP blocks access

**Example**:
```javascript
// ACL allows user to read
acl.setReadAccess(userId, true);
object.setACL(acl);

// But CLP blocks ALL reads
Collection.register('MyCollection', {
    retrieve: false  // ❌ CLP denies read
});
```

**Result**: User CANNOT read (CLP overrides)

**Solution**: Ensure CLP allows the operation OR use master key

---

### 3. Anonymous Role vs Public Access

**Problem**: `setRoleReadAccess('anonymous', true)` doesn't work as expected

**Why**: `'anonymous'` is a special role name that CloudACL maps to `setPublicReadAccess`

```javascript
// CloudACL special handling
if (role === 'anonymous') {
    groupACL.setPublicReadAccess(allowed);
} else {
    groupACL.setRoleReadAccess(role, allowed);
}
```

**Source**: `actinium-core/lib/utils/acl.js:246-247`

**Best Practice**: Use `setPublicReadAccess()` directly for unauthenticated access

---

### 4. Not Setting ACL on Creation

**Problem**: Object created without ACL inherits Parse Server default (usually public read/write)

**Solution**: Set ACL in `beforeSave` hook:
```javascript
Parse.Cloud.beforeSave('MyClass', async req => {
    if (!req.object.getACL()) {
        const acl = new Parse.ACL();
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        req.object.setACL(acl);
    }
});
```

---

### 5. ACL Not Preserved on Update

**Problem**: Object.save() without proper options can lose ACL

**Solution**: Always use CloudRunOptions or master key:
```javascript
const options = CloudRunOptions(req);
await object.save(null, options);
```

---

### 6. Role Pointer vs Role Name

**Problem**: Confusing when to use role object vs role name string

**API**:
```javascript
// ✅ Role name (string)
acl.setRoleReadAccess('admin', true);

// ✅ Role object (Parse.Role instance)
const role = await new Parse.Query(Parse.Role)
    .equalTo('name', 'admin')
    .first({ useMasterKey: true });
acl.setRoleReadAccess(role, true);
```

**Both work**, but string is simpler and cached internally by Parse Server

---

## Best Practices

### 1. Use CloudACL for Complex Scenarios

**Instead of**:
```javascript
const acl = new Parse.ACL();
// 20 lines of setRoleReadAccess calls
```

**Do**:
```javascript
const acl = await Actinium.Utils.CloudACL(
    permissions,
    'read-capability',
    'write-capability'
);
```

**Why**: Capability-based, cleaner, role changes auto-propagate

---

### 2. Set ACL in beforeSave Hooks

**Pattern**:
```javascript
Parse.Cloud.beforeSave('MyClass', async req => {
    const acl = req.object.getACL() || new Parse.ACL();

    // Set ACL based on business logic
    if (req.user) {
        acl.setReadAccess(req.user.id, true);
        acl.setWriteAccess(req.user.id, true);
    }

    req.object.setACL(acl);
});
```

**Why**: Ensures ACL consistency, prevents accidental bypass

---

### 3. Cache ACL Targets

**Pattern**:
```javascript
// Use cached targets for UI
const { users, roles } = await AclTargets({
    master: true,
    params: { cache: true }
});
```

**Why**: Avoid expensive user/role queries on every ACL operation

---

### 4. Document ACL Strategy in Code

```javascript
// ✅ Clear intent
// ACL: Owner + admin read/write, public can read published only
const acl = buildContentACL(user, status);
```

---

### 5. Test ACL with Multiple User Contexts

**Pattern**:
```javascript
// Test as owner
const ownerOptions = { sessionToken: ownerUser.getSessionToken() };
const ownerView = await query.find(ownerOptions);

// Test as stranger
const strangerOptions = { sessionToken: strangerUser.getSessionToken() };
const strangerView = await query.find(strangerOptions);

// Assert expected visibility
```

---

## Debugging ACL Issues

### 1. Check Object ACL

```javascript
const obj = await query.first({ useMasterKey: true });
const acl = obj.getACL();
console.log(acl.toJSON());
```

**Look for**: User IDs, role names, public read/write settings

---

### 2. Verify Session Token

```javascript
console.log('Session Token:', req.user?.getSessionToken());
```

**If undefined**: User not authenticated → ACL defaults to public permissions only

---

### 3. Check CLP

```javascript
// In Parse Dashboard: App Settings → Security → Class Level Permissions
```

**Verify**: retrieve/update operations allowed for user's roles

---

### 4. Use Master Key Temporarily

```javascript
// Temporarily bypass ACL to confirm data exists
const results = await query.find({ useMasterKey: true });
console.log('Total objects (ignoring ACL):', results.length);
```

**If results exist**: ACL is the issue, not data availability

---

## Performance Considerations

### ACL Check Overhead

**Impact**: Every query evaluates ACL for each object → adds latency

**Mitigation**:
1. **Use CLP when possible** - Collection-wide rules are faster than per-object checks
2. **Cache-first patterns** - Cache public data outside Parse queries
3. **Limit query results** - Smaller result sets = fewer ACL checks
4. **Index ACL fields** - Parse Server indexes ACL internally, but ensure proper DB indexes

---

### ACL Storage Size

**Impact**: Large ACLs (many individual users) increase object size

**Example**:
```javascript
// ❌ Poor: 1000 individual user ACLs
users.forEach(u => acl.setReadAccess(u.id, true));

// ✅ Better: Use role-based access
acl.setRoleReadAccess('team-members', true);
```

**Guideline**: If >10 users need same permissions, create a role instead

---

## Testing Strategies

### Unit Testing ACL Logic

```javascript
describe('Content ACL', () => {
    it('should allow owner to read/write', async () => {
        const content = new Parse.Object('Content');
        content.set('user', ownerUser);

        // Trigger beforeSave hook
        await content.save(null, { sessionToken: ownerUser.getSessionToken() });

        const acl = content.getACL();
        expect(acl.getReadAccess(ownerUser.id)).toBe(true);
        expect(acl.getWriteAccess(ownerUser.id)).toBe(true);
    });
});
```

**Source**: Framework testing patterns (see [TESTING_STRATEGIES.md](./TESTING_STRATEGIES.md))

---

### Integration Testing with CloudACL

```javascript
it('should generate capability-based ACL', async () => {
    const acl = await Actinium.Utils.CloudACL(
        [],
        'test.read',
        'test.write'
    );

    // Verify roles with capabilities have access
    expect(acl.getRoleReadAccess('admin')).toBe(true);
});
```

---

## Real-World Examples

### Example 1: Content Management System

**Requirements**:
- Authors own their drafts (private)
- Editors can review all drafts
- Published content is public read-only
- Authors can unpublish their own content

**Implementation**:
```javascript
Parse.Cloud.beforeSave('Article', async req => {
    const acl = req.object.getACL() || new Parse.ACL();
    const user = req.object.get('author');
    const status = req.object.get('status');

    // Reset ACL
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);

    // Author always has full access
    if (user) {
        acl.setReadAccess(user.id, true);
        acl.setWriteAccess(user.id, true);
    }

    // Editors and admins have full access
    ['editor', 'administrator'].forEach(role => {
        acl.setRoleReadAccess(role, true);
        acl.setRoleWriteAccess(role, true);
    });

    // Published = public read
    if (status === 'PUBLISHED') {
        acl.setPublicReadAccess(true);
    }

    req.object.setACL(acl);
});
```

---

### Example 2: Multi-Tenant SaaS

**Requirements**:
- Organizations own their data
- Organization members can read/write org data
- Organization admins can manage members
- Super admins can access all orgs

**Implementation**:
```javascript
// Cloud function: create-project
Actinium.Cloud.define('MyApp', 'create-project', async req => {
    const { orgId, name } = req.params;
    const options = CloudRunOptions(req);

    const project = new Parse.Object('Project');
    project.set('name', name);
    project.set('organization', orgId);

    // ACL: Org members + super-admin
    const acl = await Actinium.Utils.CloudACL(
        [
            {
                permission: 'read',
                type: 'role',
                name: `org-${orgId}-member`
            },
            {
                permission: 'write',
                type: 'role',
                name: `org-${orgId}-admin`
            }
        ],
        null,
        null
    );

    // Super admin always has access
    acl.setRoleReadAccess('super-admin', true);
    acl.setRoleWriteAccess('super-admin', true);

    project.setACL(acl);
    return project.save(null, options);
});
```

---

## Summary

**ACL provides object-level security** complementing collection-level CLP:

| Feature | ACL | CLP |
|---------|-----|-----|
| **Granularity** | Per-object | Per-collection |
| **Performance** | Slower (per-object checks) | Faster (collection-wide rules) |
| **Flexibility** | Different permissions per object | Same permissions for all objects |
| **Use Case** | User-owned content, privacy | Role-based access, public data |

**Framework Patterns**:
- **CloudACL** - Capability-based ACL generation
- **AclTargets** - User/role selection helper with caching
- **CloudRunOptions** - Session token propagation (required for ACL)
- **beforeSave hooks** - Automatic ACL application on object creation

**Best Practices**:
1. Set ACL in beforeSave hooks
2. Use CloudACL for capability-based access
3. Combine with CLP for defense-in-depth
4. Pass session tokens via CloudRunOptions
5. Cache ACL targets for UI performance
6. Use roles instead of individual users for large teams

**Critical for**: Content management, multi-tenant systems, privacy controls, debugging permission denied errors
