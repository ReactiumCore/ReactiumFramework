<!-- v1.0.0 -->

# Collection Registration and Schema Management

**Purpose**: Define Parse Server collections with schema, Class-Level Permissions (CLP), indexes, and capability mappings
**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/collection.js:1-426`

---

## Overview

Collection registration is the core data modeling and security configuration system in Actinium. Every Parse Server collection must be registered to:

1. **Define schema** - Field types, constraints, relationships
2. **Set Class-Level Permissions (CLP)** - Role-based access control at collection level
3. **Create indexes** - Query optimization for high-entropy fields
4. **Map capabilities** - Link Actinium capabilities to Parse permissions
5. **Enable schema evolution** - Add/modify/delete fields safely

**Key Insight**: Collections registered with `Actinium.Collection.register()` automatically get capability-based security, with CLPs dynamically generated from role capabilities.

---

## Core API

### Actinium.Collection.register()

**Source**: `actinium-core/lib/collection.js:22-66`

```javascript
Actinium.Collection.register(
    collection,      // String: Collection name
    publicSetting,   // Object: Public permission flags
    schema,          // Object: Parse field definitions (optional)
    indexes          // Array: Field names to index (optional)
)
```

#### Parameters

**`collection`** (String, required)
Parse Server collection name (e.g., `'Setting'`, `'Content'`, `'_User'`, `'_Role'`).

**`publicSetting`** (Object, required)
Flags indicating which operations are publicly accessible:

```javascript
{
    create: false,      // Can public create new objects?
    retrieve: false,    // Can public read objects?
    update: false,      // Can public modify objects?
    delete: false,      // Can public delete objects?
    addField: false     // Can public add new fields?
}
```

- `true` = Public access (maps to `'*': true` in CLP)
- `false` = Role-restricted access (requires capability)

**Default**: All `false` (fully private, admin-only)

**`schema`** (Object, optional)
Parse Server field definitions:

```javascript
{
    fieldName: {
        type: 'String',      // Required: Parse type
        required: false,     // Optional: Field required?
        defaultValue: null,  // Optional: Default value
        delete: false        // Optional: Mark for deletion
    }
}
```

**Supported Parse Types**:
- Primitives: `'String'`, `'Number'`, `'Boolean'`, `'Date'`, `'Array'`, `'Object'`
- Parse-specific: `'Pointer'`, `'Relation'`, `'File'`, `'GeoPoint'`, `'Polygon'`
- Pointers/Relations require `targetClass: 'CollectionName'`

**`indexes`** (Array, optional)
List of field names to index for query performance:

```javascript
['key', 'uuid', 'slug']
```

**⚠️ Index Sparingly**: Only index high-entropy fields used in query filters. Indexes slow down writes.

---

## Registration Pattern

### Pattern 1: Basic Collection with Schema

**Source**: `actinium-settings/plugin.js:284-302`

```javascript
const COLLECTION = 'Setting';

// Register capabilities first
Actinium.Capability.register(`${COLLECTION}.create`, {}, Actinium.Enums.priority.highest);
Actinium.Capability.register(`${COLLECTION}.retrieve`, {}, Actinium.Enums.priority.highest);
Actinium.Capability.register(`${COLLECTION}.update`, {}, Actinium.Enums.priority.highest);
Actinium.Capability.register(`${COLLECTION}.delete`, {}, Actinium.Enums.priority.highest);
Actinium.Capability.register(`${COLLECTION}.addField`, {}, Actinium.Enums.priority.highest);

// Register collection with schema
Actinium.Collection.register(
    COLLECTION,
    {
        create: false,      // Admin-only
        retrieve: false,    // Admin-only
        update: false,      // Admin-only
        delete: false,      // Admin-only
        addField: false     // Admin-only
    },
    {
        key: { type: 'String' },
        value: { type: 'Object' }
    },
    ['key']  // Index the 'key' field
);
```

### Pattern 2: Public Retrieve, Private Mutations

**Source**: `actinium-roles/plugin.js:40-46`

```javascript
Actinium.Collection.register('_Role', {
    create: false,
    retrieve: true,    // ✓ Anyone can read roles
    update: false,
    delete: false,
    addField: false
});
```

### Pattern 3: Complex Schema with Relations

**Source**: `actinium-content/schema.js:1-56`

```javascript
Actinium.Collection.register(
    'Content',
    {
        create: true,       // Public can create
        retrieve: true,     // Public can read
        update: true,       // Public can update
        delete: true,       // Public can delete
        addField: false     // Only admins add fields
    },
    {
        title: { type: 'String' },
        slug: { type: 'String' },
        uuid: { type: 'String' },
        meta: { type: 'Object' },
        data: { type: 'Object' },
        status: { type: 'String' },

        // Pointer to Type collection
        type: {
            type: 'Pointer',
            targetClass: 'Type'
        },

        // Pointer to User
        user: {
            type: 'Pointer',
            targetClass: '_User'
        },

        // Self-referential pointer
        parent: {
            type: 'Pointer',
            targetClass: 'Content'
        },

        // Relation to self
        children: {
            type: 'Relation',
            targetClass: 'Content'
        },

        // Relation to Taxonomy
        taxonomy: {
            type: 'Relation',
            targetClass: 'Taxonomy'
        },

        file: { type: 'File' }
    },
    ['uuid', 'slug', 'title']  // Index multiple fields
);
```

### Pattern 4: Capability-Based Access Control

**Source**: `actinium-type/plugin.js:102-180`

```javascript
const COLLECTION = 'Type';

// Grant capabilities to specific roles
Actinium.Capability.register(`${COLLECTION}.create`, {
    allowed: ['contributor', 'moderator']
}, Actinium.Enums.priority.highest);

Actinium.Capability.register(`${COLLECTION}.retrieve`, {
    allowed: ['anonymous', 'contributor', 'moderator', 'user']
}, Actinium.Enums.priority.highest);

Actinium.Capability.register(`${COLLECTION}.update`, {
    allowed: ['moderator', 'contributor']
}, Actinium.Enums.priority.highest);

Actinium.Capability.register(`${COLLECTION}.delete`, {
    allowed: ['moderator', 'contributor']
}, Actinium.Enums.priority.highest);

Actinium.Capability.register(`${COLLECTION}.addField`, {}, Actinium.Enums.priority.highest);

// Register with public retrieve enabled
Actinium.Collection.register(
    COLLECTION,
    {
        create: false,
        retrieve: true,    // Public + role capabilities
        update: false,
        delete: false,
        addField: false
    },
    {
        uuid: { type: 'String' },
        type: { type: 'String' },
        collection: { type: 'String' },
        machineName: { type: 'String' },
        namespace: { type: 'String' },
        fields: { type: 'Object' },
        meta: { type: 'Object' },
        slugs: { type: 'Array' }
    },
    ['uuid', 'machineName', 'collection']
);
```

---

## CLP Generation Mechanism

**How Actinium maps capabilities to Parse Server CLPs**:

### 1. Capability → CLP Mapping

**Source**: `actinium-core/lib/collection.js:135-177`

For each operation (`create`, `retrieve`, `update`, `delete`, `addField`):

1. **Get capability name**: `${collection}.${operation}` (lowercase)
   - Example: `Setting.retrieve`, `Content.create`

2. **Fetch allowed roles** from capability:
   ```javascript
   const allowed = op.get(currentCap, 'allowed', []);
   // Example: ['contributor', 'moderator']
   ```

3. **Build CLP entry**:
   ```javascript
   {
       [capabilityName]: {
           'role:contributor': true,
           'role:moderator': true,
           'role:administrator': true,  // Always added
           'role:super-admin': true     // Always added
       }
   }
   ```

4. **Check public setting**:
   ```javascript
   if (publicSetting[operation] === true || allowed.includes('anonymous')) {
       CLP[capabilityName] = { '*': true };  // Override with public access
   }
   ```

### 2. CLP Operation Mapping

**Source**: `actinium-core/lib/collection.js:180-224`

| Capability | Parse Permissions |
|------------|-------------------|
| `create` | `create` |
| `retrieve` | `find`, `count`, `get` |
| `update` | `update` |
| `delete` | `delete` |
| `addField` | `addField` |

**Example CLP Output**:
```javascript
{
    classLevelPermissions: {
        find: { 'role:contributor': true, 'role:administrator': true, 'role:super-admin': true },
        get: { 'role:contributor': true, 'role:administrator': true, 'role:super-admin': true },
        count: { 'role:contributor': true, 'role:administrator': true, 'role:super-admin': true },
        create: { 'role:moderator': true, 'role:administrator': true, 'role:super-admin': true },
        update: { 'role:administrator': true, 'role:super-admin': true },
        delete: { 'role:administrator': true, 'role:super-admin': true },
        addField: { 'role:administrator': true, 'role:super-admin': true }
    }
}
```

---

## Hook Integration

### collection-before-permissions

**Fires before CLP generation for each collection**.

**Source**: `actinium-core/lib/collection.js:109-114`

```javascript
Actinium.Hook.register('collection-before-permissions', async (collection, publicSetting) => {
    // Modify publicSetting before CLP generation
    if (collection === 'MyCollection') {
        publicSetting.retrieve = true;
    }
});
```

### collection-clp

**Modify CLPs after generation, before applying to schema**.

**Source**: `actinium-core/lib/collection.js:273`

```javascript
Actinium.Hook.register('collection-clp', async ({ collection, CLP }) => {
    if (collection === '_User') {
        // Custom CLP modifications
        Object.keys(CLP).forEach(key => {
            CLP[key]['role:custom-role'] = true;
        });
    }
});
```

**Real-World Usage**: `actinium-users/plugin.js:305-314`

### collection-indexes

**Modify indexes before applying to schema**.

**Source**: `actinium-core/lib/collection.js:275-278`

```javascript
Actinium.Hook.register('collection-indexes', async ({ collection, newIndexes }) => {
    if (collection === 'Content') {
        // Add compound index
        newIndexes['status_createdAt'] = { status: 1, createdAt: -1 };
    }
});
```

### collection-before-load

**Fires before schema/CLP loading begins**.

**Source**: `actinium-core/lib/collection.js:82`

```javascript
Actinium.Hook.register('collection-before-load', async (collection) => {
    console.log(`Loading schema for ${collection || 'all collections'}`);
});
```

---

## Schema Field Management

### Adding Fields

Define fields in schema object when registering:

```javascript
Actinium.Collection.register('MyCollection', actions, {
    newField: {
        type: 'String',
        required: true,
        defaultValue: 'default'
    }
});
```

**On next startup**: Field added to Parse Server schema automatically.

### Deleting Fields

**⚠️ Mark for deletion, don't remove from schema object**:

```javascript
Actinium.Collection.register('MyCollection', actions, {
    oldField: {
        type: 'String',
        delete: true  // ← Marks field for deletion
    }
});
```

**Source**: `actinium-core/lib/collection.js:252-268`

**How it works**:
1. Sets `__op: 'Delete'` on field
2. Parse Server removes field from schema
3. Existing data remains but field is inaccessible

### Modifying Field Types

**⚠️ Cannot change field types after creation** - Parse Server limitation.

**Workaround**:
1. Create new field with different name
2. Migrate data via cloud function
3. Delete old field
4. Rename new field (requires Parse Dashboard)

---

## Dynamic CLP Updates

### On Capability Change

**Source**: `actinium-core/lib/collection.js:38-59`

When a capability is modified (role added/removed), CLPs automatically reload:

```javascript
Actinium.Hook.register('capability-change', async (req) => {
    const capability = req.object.get('group');

    // Check if capability affects this collection
    if ([`${collection}.create`, `${collection}.retrieve`, ...].includes(capability)) {
        await Actinium.Collection.load(collection);  // ← Reload CLPs
    }
});
```

**Example Flow**:
1. Admin grants `Content.create` to `contributor` role
2. `capability-change` hook fires
3. `Collection.load('Content')` re-generates CLPs
4. New CLP applied to Parse Server schema
5. Contributors can now create Content

---

## Collection Lifecycle

### Initialization Sequence

**Source**: `actinium-core/lib/collection.js:81-326`

1. **Plugin registers collection** during `init` or `schema` hook
2. **Capabilities registered** (before collection registration)
3. **Collection registered** with schema/indexes/actions
4. **On `Collection.load()`** (fires during startup):
   - `collection-before-load` hook
   - For each collection:
     - `collection-before-permissions` hook
     - Fetch existing Parse schema (or create empty)
     - Generate CLPs from capabilities
     - `collection-clp` hook (modify CLPs)
     - `collection-indexes` hook (modify indexes)
     - Apply schema via Parse SchemaController
5. **Collection.loaded = true**

### Schema Application

**Source**: `actinium-core/lib/collection.js:281-305`

```javascript
// Update existing schema
if (className) {
    schemaController.update(collection, {
        className: collection,
        classLevelPermissions: CLP,
        fields,
        indexes: newIndexes
    }, Actinium.Utils.MasterOptions());
}
// Create new schema
else {
    schemaController.create(collection, {
        className: collection,
        classLevelPermissions: CLP,
        fields,
        indexes: newIndexes
    }, Actinium.Utils.MasterOptions());
}
```

---

## Real-World Examples

### Example 1: Settings Collection (Fully Private)

**Source**: `actinium-settings/plugin.js:284-302`

```javascript
Actinium.Collection.register(
    'Setting',
    { create: false, retrieve: false, update: false, delete: false, addField: false },
    {
        key: { type: 'String' },
        value: { type: 'Object' }
    },
    ['key']
);
```

**Result**:
- Only `administrator` and `super-admin` can access
- `key` field indexed for fast lookups
- Object-path stored in `value` field

### Example 2: Type Collection (Mixed Permissions)

**Source**: `actinium-type/plugin.js:144-180`

```javascript
// Contributors can CRUD, anyone can read
Actinium.Capability.register('Type.create', { allowed: ['contributor', 'moderator'] });
Actinium.Capability.register('Type.retrieve', { allowed: ['anonymous', 'contributor', 'moderator', 'user'] });
Actinium.Capability.register('Type.update', { allowed: ['moderator', 'contributor'] });
Actinium.Capability.register('Type.delete', { allowed: ['moderator', 'contributor'] });

Actinium.Collection.register(
    'Type',
    { create: false, retrieve: true, update: false, delete: false, addField: false },
    {
        uuid: { type: 'String' },
        machineName: { type: 'String' },
        fields: { type: 'Object' },
        // ... more fields
    },
    ['uuid', 'machineName', 'collection']
);
```

**Result**:
- Anyone can read types (retrieve: true + anonymous in allowed)
- Contributors/moderators can create/update/delete
- Three fields indexed for queries

### Example 3: Content Collection (Public Access)

**Source**: `actinium-content/schema.js:1-56`

```javascript
{
    collection: 'Content',
    actions: {
        create: true,
        retrieve: true,
        update: true,
        delete: true,
        addField: false
    },
    schema: {
        title: { type: 'String' },
        slug: { type: 'String' },
        type: { type: 'Pointer', targetClass: 'Type' },
        user: { type: 'Pointer', targetClass: '_User' },
        taxonomy: { type: 'Relation', targetClass: 'Taxonomy' }
    },
    indexes: ['uuid', 'slug', 'title']
}
```

**Result**:
- Fully public CRUD (all operations have `'*': true`)
- Complex relational schema
- Multiple indexes for content queries

---

## Best Practices

### 1. Register Capabilities First

```javascript
// ✓ CORRECT ORDER
Actinium.Capability.register('MyCollection.create', { allowed: ['contributor'] });
Actinium.Collection.register('MyCollection', { create: false, ... });

// ✗ WRONG ORDER - Collection registration won't find capability
Actinium.Collection.register('MyCollection', { create: false, ... });
Actinium.Capability.register('MyCollection.create', { allowed: ['contributor'] });
```

### 2. Use Highest Priority for Core Capabilities

```javascript
Actinium.Capability.register(
    'Setting.create',
    {},
    Actinium.Enums.priority.highest  // ← Ensures capability exists before CLP generation
);
```

### 3. Index Strategically

```javascript
// ✓ GOOD - High-entropy field used in queries
Actinium.Collection.register('Content', actions, schema, ['uuid']);

// ✗ BAD - Low-entropy field (few unique values)
Actinium.Collection.register('Content', actions, schema, ['status']);

// ✗ BAD - Over-indexing
Actinium.Collection.register('Content', actions, schema, [
    'title', 'slug', 'uuid', 'status', 'createdAt', 'updatedAt'  // Too many!
]);
```

**Rule of Thumb**: Index only fields used in `query.equalTo()` or `query.contains()` frequently.

### 4. Use Schema Hook for Registration

```javascript
Actinium.Hook.register('schema', async () => {
    if (!Actinium.Plugin.isActive('MyPlugin')) return;

    Actinium.Collection.register('MyCollection', actions, schema, indexes);
});
```

**Why**: `schema` hook fires after capabilities loaded, before collection loading.

### 5. Separate Schema Definitions

```javascript
// schema.js
export default [
    {
        collection: 'Content',
        actions: { create: true, retrieve: true, ... },
        schema: { title: { type: 'String' }, ... },
        indexes: ['uuid', 'slug']
    }
];

// plugin.js
import PLUGIN_SCHEMA from './schema.js';

Actinium.Hook.register('schema', async () => {
    PLUGIN_SCHEMA.forEach(({ actions, collection, schema, indexes }) => {
        Actinium.Collection.register(collection, actions, schema, indexes);
    });
});
```

**Source**: `actinium-content/plugin.js:68-81`

---

## Common Gotchas

### Gotcha 1: Public Setting ≠ Public Access

```javascript
// This does NOT grant public access!
Actinium.Collection.register('MyCollection', {
    retrieve: false  // ← Still requires capability
});
```

**Fix**: Set `retrieve: true` OR add `anonymous` to capability:

```javascript
Actinium.Capability.register('MyCollection.retrieve', { allowed: ['anonymous'] });
```

### Gotcha 2: Changing Field Types

```javascript
// Initial registration
Actinium.Collection.register('MyCollection', actions, {
    count: { type: 'String' }  // Oops, should be Number
});

// Later (DOES NOT WORK!)
Actinium.Collection.register('MyCollection', actions, {
    count: { type: 'Number' }  // ← Parse Server error: Cannot change type
});
```

**Fix**: Migrate data to new field, delete old.

### Gotcha 3: Missing Capability Registration

```javascript
// Collection registered, but capability never defined
Actinium.Collection.register('MyCollection', { create: false, ... });

// Cloud function fails: "Permission denied"
Actinium.Cloud.run('mycollection-create', params);
```

**Fix**: Always register capabilities for operations:

```javascript
Actinium.Capability.register('MyCollection.create', { allowed: ['contributor'] });
```

### Gotcha 4: Index Performance Impact

```javascript
// Over-indexed collection
Actinium.Collection.register('Content', actions, schema, [
    'title', 'slug', 'status', 'createdAt', 'updatedAt', 'user', 'type'
]);
```

**Impact**:
- Every write rebuilds 7 indexes
- Slows down content creation/updates
- Most indexes never used in queries

**Fix**: Index only high-value, frequently-queried fields.

### Gotcha 5: Administrator Always Has Access

```javascript
// Trying to lock out administrators (IMPOSSIBLE)
Actinium.Hook.register('collection-clp', async ({ collection, CLP }) => {
    if (collection === 'Secret') {
        delete CLP.find['role:administrator'];  // ← Has no effect!
    }
});
```

**Source**: `actinium-core/lib/collection.js:167-176`

**Why**: Collection registration explicitly adds administrator/super-admin to every operation.

**Workaround**: Use object-level ACLs instead of CLPs.

### Gotcha 6: Schema Changes Require Restart

After modifying schema in code:

```javascript
Actinium.Collection.register('MyCollection', actions, {
    newField: { type: 'String' }  // ← Added
});
```

**Schema won't update until**:
1. Server restart, OR
2. Manual `Actinium.Collection.load('MyCollection')` call

**In Production**: Use migration cloud functions instead of in-place schema changes.

---

## Integration with Other Systems

### Capability System

**Source**: [Actinium Capabilities Deep Dive](./ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system)

Collection registration relies on capabilities:

```javascript
// Capability defines who can perform operation
Actinium.Capability.register('Content.create', { allowed: ['contributor'] });

// Collection references capability in CLP generation
Actinium.Collection.register('Content', { create: false, ... });
```

**Result**: `role:contributor` added to `create` CLP.

### Cloud Functions

**Source**: [Cloud Function Patterns](./CLOUD_FUNCTIONS.md)

Collections define available operations for cloud functions:

```javascript
// Collection allows public retrieve
Actinium.Collection.register('Setting', { retrieve: false, ... });

// Cloud function respects CLP
Actinium.Cloud.define('Settings', 'setting-get', async (req) => {
    // Automatically enforces Setting.retrieve capability
    return Actinium.Setting.get(req.params.key, null, CloudRunOptions(req));
});
```

### Parse Server Schema API

Actinium uses Parse `SchemaController` directly:

```javascript
const schemaController = Parse.CoreManager.getSchemaController();
await schemaController.update(collection, schemaDefinition, MasterOptions());
```

**Bypass Actinium** (advanced):

```javascript
// Direct Parse schema modification (use with caution!)
const schema = new Parse.Schema('MyCollection');
schema.addString('newField');
await schema.save({ useMasterKey: true });
```

---

## Comparison: Collection vs Direct Parse Schema

| Feature | Actinium Collection | Direct Parse Schema |
|---------|---------------------|---------------------|
| Capability integration | ✓ Automatic | Manual CLP config |
| Role-based security | ✓ Dynamic from caps | Static CLP |
| Hook extensibility | ✓ 4 hooks | None |
| Index management | ✓ Declarative | Imperative |
| Schema evolution | ✓ Version-tracked | Manual |
| Public/private toggle | ✓ Single flag | CLP object |
| Auto-reload on cap change | ✓ Yes | No |

**When to use Collection.register**:
- Plugin-managed collections
- Role-based access control needed
- Schema changes via code updates
- Need hook-based customization

**When to use Parse Schema directly**:
- One-time schema setup
- Non-role-based security
- Low-level schema manipulation
- Testing/migration scripts

---

## TypeScript Support

### Type Definitions

```typescript
interface PublicSetting {
    create: boolean;
    retrieve: boolean;
    update: boolean;
    delete: boolean;
    addField: boolean;
}

interface SchemaField {
    type: 'String' | 'Number' | 'Boolean' | 'Date' | 'Array' | 'Object' |
          'Pointer' | 'Relation' | 'File' | 'GeoPoint' | 'Polygon';
    targetClass?: string;  // Required for Pointer/Relation
    required?: boolean;
    defaultValue?: any;
    delete?: boolean;
}

interface CollectionSchema {
    [fieldName: string]: SchemaField;
}

function register(
    collection: string,
    publicSetting: PublicSetting,
    schema?: CollectionSchema,
    indexes?: string[]
): Promise<void>;
```

### Usage with TypeScript

```typescript
import Actinium from '@atomic-reactor/actinium-sdk-core/server';

const COLLECTION = 'Article';

const schema: CollectionSchema = {
    title: { type: 'String', required: true },
    slug: { type: 'String' },
    author: { type: 'Pointer', targetClass: '_User' },
    tags: { type: 'Relation', targetClass: 'Tag' },
    publishedAt: { type: 'Date' }
};

const publicSettings: PublicSetting = {
    create: false,
    retrieve: true,
    update: false,
    delete: false,
    addField: false
};

Actinium.Collection.register(COLLECTION, publicSettings, schema, ['slug']);
```

---

## Migration Patterns

### Pattern: Adding Collection to Existing Plugin

```javascript
// plugin.js (version 1.0.0 → 1.1.0)

Actinium.Hook.register('schema', async () => {
    if (!Actinium.Plugin.isActive('MyPlugin')) return;

    // New collection in v1.1.0
    Actinium.Capability.register('NewCollection.create', { allowed: ['contributor'] });
    Actinium.Capability.register('NewCollection.retrieve', { allowed: ['anonymous'] });

    Actinium.Collection.register(
        'NewCollection',
        { create: false, retrieve: true, update: false, delete: false, addField: false },
        {
            name: { type: 'String' },
            data: { type: 'Object' }
        },
        ['name']
    );
});
```

**On plugin update**: New collection schema created automatically on next server start.

### Pattern: Migrating Data to New Field

```javascript
// Old schema (v1.0.0)
Actinium.Collection.register('Article', actions, {
    authorName: { type: 'String' }  // ← Migrating away from this
});

// New schema (v2.0.0)
Actinium.Collection.register('Article', actions, {
    authorName: { type: 'String', delete: true },  // Mark for deletion
    author: { type: 'Pointer', targetClass: '_User' }  // New field
});

// Migration cloud function
Actinium.Cloud.define('MyPlugin', 'migrate-article-authors', async (req) => {
    const articles = await new Actinium.Query('Article')
        .limit(1000)
        .find(Actinium.Utils.MasterOptions());

    for (const article of articles) {
        const authorName = article.get('authorName');
        const user = await new Actinium.Query('_User')
            .equalTo('username', authorName)
            .first(Actinium.Utils.MasterOptions());

        if (user) {
            article.set('author', user);
            await article.save(null, Actinium.Utils.MasterOptions());
        }
    }

    return { migrated: articles.length };
});
```

---

## Summary

**Collection registration** is Actinium's declarative data modeling system:

1. **Single registration** defines schema, CLPs, indexes, and capabilities
2. **Automatic CLP generation** from role capabilities
3. **Dynamic security** - CLPs update when capabilities change
4. **Hook-extensible** - Customize CLPs and indexes before application
5. **Schema evolution** - Add/modify/delete fields via code updates

**Key Files**:
- Implementation: `actinium-core/lib/collection.js:1-426`
- Real examples: `actinium-settings/plugin.js`, `actinium-type/plugin.js`, `actinium-content/schema.js`

**Next Steps**:
- [Cloud Functions](./CLOUD_FUNCTIONS.md) - Using collections in APIs
- [Capability System](./ACTINIUM_COMPLETE_REFERENCE.md#capabilities-system) - Understanding capability-based security
- [Schema Initialization Pattern](./FRAMEWORK_PATTERNS.md#pattern-11-schema-initialization-pattern) - Best practices
