# Content Type System Architecture

<!-- v1.0.0 -->

**Complete architecture for defining, managing, and using Content Types in Actinium - the dynamic CMS schema system**

---

## Overview

The **Content Type System** is Actinium's schema-as-data architecture that enables creating dynamic content models without code deployment. Content Types define the structure, fields, and behavior of content collections (like "Article", "Product", "Event"), with automatic Parse Server collection creation, capability registration, and schema management.

**Key Concepts**:
- **Type Definition**: Stored in `Type` collection, describes fields/regions/metadata
- **Content Collection**: Auto-generated Parse collection (`Content_{machineName}`)
- **UUID Namespacing**: v5 UUIDs ensure type uniqueness across environments
- **Field Types**: Pluggable field definitions (Text, RichText, Pointer, Relation, etc.)
- **Dynamic Capabilities**: Auto-registered CRUD capabilities per content type
- **Regions**: UI layout groups for Content Editor field organization

**Key Files**:
- `actinium-core/lib/type/index.js:1-650` - Core Type SDK implementation
- `actinium-type/plugin.js:1-416` - Plugin registration and cloud functions
- `actinium-core/lib/type/enums.js:1-28` - Type system constants

---

## Type Lifecycle

```
1. Type.create() → Parse Type collection
2. type-saved hook → Type.saveSchema()
3. Parse Schema created for Content_{machineName}
4. Capabilities registered: Content_{machineName}.create/retrieve/update/delete
5. Content can be created via Actinium.Content.create({ type: {...} })
```

---

## Type Definition Structure

### Core Properties

```javascript
{
    // Identity (auto-generated)
    uuid: '550e8400-e29b-41d4-a716-446655440000',  // v5 UUID from namespace + machineName
    machineName: 'article',                        // Slugified, immutable
    type: 'article',                               // Original input (deprecated, use meta.label)
    collection: 'Content_article',                 // Auto-generated Parse collection name
    namespace: '9f85eb4d-777b-4213-b039-fced11c2dbae',  // UUID namespace

    // Field Configuration
    fields: {
        'field-uuid-1': {
            fieldId: 'field-uuid-1',               // UUID
            fieldName: 'title',                    // Unique, becomes column name
            fieldType: 'Text',                     // Hook-registered field type
            region: 'default',                     // Region ID
            defaultValue: '',                      // Field-type specific config
            // ... other field-type specific properties
        },
        'field-uuid-2': {
            fieldId: 'field-uuid-2',
            fieldName: 'body',
            fieldType: 'RichText',
            region: 'default'
        }
    },

    // UI Layout Configuration
    regions: {
        default: {
            id: 'default',
            label: 'Default',
            slug: 'default'
        },
        sidebar: {
            id: 'sidebar',
            label: 'Sidebar',
            slug: 'sidebar'
        }
    },

    // Metadata
    meta: {
        label: 'Article',                          // Display name
        icon: 'Linear.Newspaper',                  // UI icon
        // ... plugin-specific metadata
    }
}
```

**Source**: `actinium-core/lib/type/index.js:57-103`

---

## UUID Generation

### Namespace-Based UUIDs

Types use **UUID v5** (SHA-1 hash) to generate deterministic IDs from `machineName` + `namespace`:

```javascript
// actinium-core/lib/type/index.js:13-20
const getNamespace = () => {
    return (
        op.get(Actinium.Plugin.get('Type'), 'meta.namespace') ||
        'uninstalled-namespace'  // Default if plugin not activated
    );
};

// actinium-core/lib/type/index.js:65-66
const namespace = op.get(params, 'namespace', getNamespace());
const uuid = uuidv5(String(machineName), namespace);
```

**Why UUIDs?**
- ✅ **Cross-environment consistency**: Same machineName → same UUID (with same namespace)
- ✅ **Collision prevention**: Different namespaces = different UUIDs for same machineName
- ✅ **Content portability**: UUIDs reference types consistently across databases

**Namespace Configuration**:
```javascript
// Environment-specific namespace (set in ENV)
ENV.CONTENT_NAMESPACE = '550e8400-e29b-41d4-a716-446655440000';

// Or configure via plugin meta
PLUGINS['Type'].meta.namespace = '550e8400-e29b-41d4-a716-446655440000';
```

**Source**: `actinium-core/lib/type/index.js:13-20, 65-66`, `actinium-core/lib/type/enums.js:1-12`

### UUID Immutability

```javascript
// actinium-type/plugin.js:182-218 - beforeSave hook
Parse.Cloud.beforeSave('Type', async (req) => {
    const { uuid, machineName, namespace } = serialize(req.object);

    const old = await new Parse.Query('Type')
        .equalTo('uuid', uuid)
        .first(options);

    if (old) {
        const { uuid: existingUUID } = serialize(old);

        // ✅ Disallow UUID change
        if (uuid !== existingUUID) {
            req.object.set('uuid', existingUUID);
        }

        // ✅ Prevent namespace change that would break UUID
        if (uuid !== uuidv5(machineName, namespace)) {
            req.object.set('namespace', old.get('namespace'));
        }
    }
});
```

**Source**: `actinium-type/plugin.js:182-218`

---

## Collection Name Generation

### Automatic Collection Naming

```javascript
// actinium-core/lib/type/index.js:74
const collection = `Content_${machineName}`.replace(/[^A-Za-z0-9_]/g, '_');

// Examples:
// machineName: 'article'        → 'Content_article'
// machineName: 'blog-post'      → 'Content_blog_post'
// machineName: 'my.custom.type' → 'Content_my_custom_type'
```

**Naming Rules**:
- ✅ Prefix: `Content_` (identifies as content collection)
- ✅ Sanitization: Replace non-alphanumeric (except `_`) with `_`
- ✅ Parse-safe: Collection names are valid Parse Server identifiers

**Source**: `actinium-core/lib/type/index.js:74`

---

## Field Configuration

### Field Structure

Every field in `fields` object must have:

```javascript
{
    fieldId: 'uuid',           // Required: UUID identifier
    fieldName: 'uniqueName',   // Required: Column name in Parse schema
    fieldType: 'Text',         // Required: Registered field type
    region: 'default',         // Required: Region ID
    // ... field-type specific properties
}
```

**Source**: `actinium-core/lib/type/index.js:23-30, 44-49`

### Field Types (Pluggable)

Field types are **NOT** hardcoded - they're registered via hooks (typically by Content Type plugins):

```javascript
// Plugin registers field type via hook (not shown in core)
Actinium.Hook.register('content-schema-field-types', async (fieldTypes) => {
    fieldTypes.Text = {
        schema: { type: 'String' },  // Parse schema definition
        // ... field config
    };

    fieldTypes.RichText = {
        schema: { type: 'Object' },
        // ... field config
    };

    // Custom field type
    fieldTypes.CustomGallery = {
        schema: { type: 'Array' },
        // ... field config
    };
});
```

**Common Field Types** (from admin plugins, not core):
- `Text` → String
- `RichText` → Object (Slate.js structure)
- `Number` → Number
- `Boolean` → Boolean
- `Date` → Date
- `Pointer` → Pointer (relation to another collection)
- `Relation` → Relation (many-to-many)
- `File` → File
- `Array` → Array
- `Object` → Object

**Source**: Inferred from field structure documentation (`actinium-core/lib/type/index.js:23-30`)

### Field Name Uniqueness

```javascript
// Field names must be unique within a type
{
    fields: {
        'uuid-1': { fieldName: 'title', ... },   // ✅
        'uuid-2': { fieldName: 'title', ... }    // ❌ Duplicate fieldName
    }
}

// But same fieldName can exist across types:
// Type "Article": fieldName "title" ✅
// Type "Product": fieldName "title" ✅ (different collections)
```

---

## Regions (UI Layout)

### Region Structure

```javascript
{
    regions: {
        'region-id': {
            id: 'region-id',       // Must match key
            label: 'Display Name',
            slug: 'url-slug'
        }
    }
}
```

### Default Region

```javascript
// actinium-core/lib/type/index.js:86-95
contentType.set('regions', op.get(params, 'regions', {
    default: {
        id: 'default',
        label: 'Default',
        slug: 'default'
    }
}));
```

**Source**: `actinium-core/lib/type/index.js:86-95`

### Multi-Region Example

```javascript
const type = await Actinium.Type.create({
    type: 'Article',
    regions: {
        main: {
            id: 'main',
            label: 'Main Content',
            slug: 'main-content'
        },
        sidebar: {
            id: 'sidebar',
            label: 'Sidebar',
            slug: 'sidebar'
        },
        seo: {
            id: 'seo',
            label: 'SEO',
            slug: 'seo'
        }
    },
    fields: {
        'uuid-1': {
            fieldId: 'uuid-1',
            fieldName: 'title',
            fieldType: 'Text',
            region: 'main'  // ← Assigned to main region
        },
        'uuid-2': {
            fieldId: 'uuid-2',
            fieldName: 'metaDescription',
            fieldType: 'Text',
            region: 'seo'   // ← Assigned to SEO region
        }
    }
});
```

**Purpose**: Regions organize fields in the Content Editor UI (not enforced in database schema)

---

## Type CRUD Operations

### Create Type

```javascript
// actinium-core/lib/type/index.js:57-103
const type = await Actinium.Type.create(
    {
        type: 'Article',               // Display name
        machineName: 'article',        // Optional, auto-slugified from type
        namespace: 'custom-namespace', // Optional, uses plugin namespace

        fields: {
            'field-uuid-1': {
                fieldId: 'field-uuid-1',
                fieldName: 'title',
                fieldType: 'Text',
                region: 'default',
                defaultValue: ''
            }
        },

        regions: {
            default: {
                id: 'default',
                label: 'Default',
                slug: 'default'
            }
        },

        meta: {
            label: 'Article',
            icon: 'Linear.Newspaper'
        }
    },
    Actinium.Utils.MasterOptions()
);

// Returns:
// {
//     uuid: '...',
//     machineName: 'article',
//     collection: 'Content_article',
//     namespace: '...',
//     fields: { ... },
//     regions: { ... },
//     meta: { label: 'Article', icon: '...' },
//     objectId: '...',
//     createdAt: '...',
//     updatedAt: '...'
// }
```

**Validation**:
- ✅ `type` parameter required
- ✅ `machineName` auto-slugified if not provided
- ✅ UUID collision check (error if type already exists in namespace)
- ✅ Collection name auto-generated

**Hooks Fired**:
1. `type-saved` (after save)

**Source**: `actinium-core/lib/type/index.js:57-103`

### Retrieve Type

```javascript
// actinium-core/lib/type/index.js:236-268
const type = await Actinium.Type.retrieve(
    {
        machineName: 'article'
        // OR: objectId: 'xyz'
        // OR: uuid: '550e8400-...'
        // OR: collection: 'Content_article'
    },
    options
);
```

**Lookup Strategies**:
1. By `objectId` (Parse ID)
2. By `uuid` (v5 UUID)
3. By `machineName` + `namespace` (generates UUID, then queries)
4. By `collection` name

**Hooks Fired**:
1. `type-retrieved` (after retrieval)

**Source**: `actinium-core/lib/type/index.js:236-268`

### Update Type

```javascript
// actinium-core/lib/type/index.js:135-176
const updated = await Actinium.Type.update(
    {
        machineName: 'article',  // OR: uuid: '...'

        fields: {
            // ✅ Update fields (replaces entire fields object)
            'field-uuid-1': {
                fieldId: 'field-uuid-1',
                fieldName: 'title',
                fieldType: 'Text',
                region: 'default'
            },
            'field-uuid-2': {
                fieldId: 'field-uuid-2',
                fieldName: 'subtitle',
                fieldType: 'Text',
                region: 'default'
            }
        },

        meta: {
            label: 'Blog Article',  // ✅ Update label
            icon: 'Linear.Document'
        }
    },
    options
);
```

**Immutable Properties**:
- ❌ `uuid` (enforced by beforeSave hook)
- ❌ `machineName` (can't change after creation)
- ❌ `collection` (derived from machineName)
- ❌ `namespace` (can't change without breaking UUID)

**Mutable Properties**:
- ✅ `fields` (entire object replaced)
- ✅ `regions` (entire object replaced)
- ✅ `meta` (merged with existing)

**Hooks Fired**:
1. `type-saved` (after save)

**Source**: `actinium-core/lib/type/index.js:135-176`

### Delete Type

```javascript
// actinium-core/lib/type/index.js:189-216
const trash = await Actinium.Type.delete(
    {
        machineName: 'article'  // OR: uuid: '...'
    },
    options
);

// Returns: Recycle bin entry (type moved to Recycle, not destroyed)
```

**⚠️ Important**: Deleting a type does **NOT** delete:
- The content collection (`Content_article`)
- The content items in that collection
- The Parse schema

**Only deletes**: The type configuration in `Type` collection

**Hooks Fired**:
1. `type-deleted` (after deletion)
2. Cache invalidated: `types`

**Source**: `actinium-core/lib/type/index.js:189-216`

### List Types

```javascript
// actinium-core/lib/type/index.js:342-405
const list = await Actinium.Type.list(
    {
        page: 1,           // Page number (0 = all pages)
        limit: 100,        // Items per page
        refresh: false     // Bypass cache
    },
    options
);

// Returns:
// {
//     timestamp: 1640000000000,
//     limit: 100,
//     page: 1,
//     pages: 3,
//     types: [
//         { uuid: '...', machineName: 'article', ... },
//         { uuid: '...', machineName: 'product', ... }
//     ]
// }
```

**Caching**:
- Cache key: `['types', page, limit, 'types']`
- TTL: 20 seconds
- Bypass: `refresh: true`

**Load-All Pattern**:
```javascript
const allTypes = await Actinium.Type.list({ page: 0 }, options);
// page: 0 triggers while loop, loads all pages
```

**Source**: `actinium-core/lib/type/index.js:342-405` (while loop at lines 367-376)

---

## Schema Management

### Automatic Schema Creation

```javascript
// actinium-type/plugin.js:52-55
Actinium.Hook.register('type-saved', async (type) => {
    await Actinium.Type.saveSchema(type);  // Triggers Parse Schema creation
    Actinium.Cache.del('types');           // Invalidate cache
});
```

**What happens in `Type.saveSchema()`** (implementation not shown, but expected behavior):
1. Parse Schema created for `Content_{machineName}` collection
2. Fields from `fields` object converted to Parse schema fields
3. Field types resolved via `content-schema-field-types` hook
4. Indexes created (if specified)
5. CLP (Class-Level Permissions) applied from capabilities

**Source**: `actinium-type/plugin.js:52-55`

### Field Deletion Pattern

From Collection Registration documentation (related):
```javascript
// Field deletion requires explicit Parse Schema update
const schema = new Parse.Schema('Content_article');
await schema.get({ useMasterKey: true });
schema.deleteField('oldFieldName');
await schema.update({ useMasterKey: true });
```

**⚠️ Warning**: Deleting a field from `type.fields` does NOT automatically delete the Parse schema field. Must be done manually.

---

## Capabilities and Permissions

### Auto-Registered Capabilities

When a content type is created, capabilities are **NOT** automatically registered for that type's content operations. Instead, the `Type` plugin registers capabilities for the **Type collection itself**:

```javascript
// actinium-type/plugin.js:102-142
Actinium.Capability.register('Type.create', {
    allowed: ['contributor', 'moderator']
});
Actinium.Capability.register('Type.retrieve', {
    allowed: ['anonymous', 'contributor', 'moderator', 'user']
});
Actinium.Capability.register('Type.update', {
    allowed: ['moderator', 'contributor']
});
Actinium.Capability.register('Type.delete', {
    allowed: ['moderator', 'contributor']
});
Actinium.Capability.register('Type.addField', {});
Actinium.Capability.register('type-ui.view', {});
```

**Source**: `actinium-type/plugin.js:102-142`

### Content Capabilities (Separate System)

Content CRUD capabilities (e.g., `Content_article.create`) are registered via **Collection Registration** system, not Type system. See `COLLECTION_REGISTRATION.md` for details.

**Example** (from content plugin, not type plugin):
```javascript
// When content type "article" is created, content plugin registers:
Actinium.Collection.register('Content_article', {
    create: true,   // Capability: Content_article.create
    retrieve: true, // Capability: Content_article.retrieve
    update: true,   // Capability: Content_article.update
    delete: true,   // Capability: Content_article.delete
    addField: true  // Capability: Content_article.addField
});
```

---

## Cloud Functions

### type-create

```javascript
// actinium-type/plugin.js:261-264
const type = await Parse.Cloud.run('type-create', {
    type: 'Article',
    fields: { ... },
    regions: { ... },
    meta: { ... }
});
```

**Capability Required**: `Type.create`

**Source**: `actinium-type/plugin.js:238-264`

### type-retrieve

```javascript
// actinium-type/plugin.js:300-302
const type = await Parse.Cloud.run('type-retrieve', {
    machineName: 'article'
});
```

**Capability Required**: None (uses CloudRunOptions, respects session token)

**Source**: `actinium-type/plugin.js:284-302`

### type-update

```javascript
// actinium-type/plugin.js:332-334
const updated = await Parse.Cloud.run('type-update', {
    machineName: 'article',
    fields: { ... },
    meta: { label: 'Updated Article' }
});
```

**Capability Required**: None (uses CloudRunOptions)

**Source**: `actinium-type/plugin.js:304-334`

### type-delete

```javascript
// actinium-type/plugin.js:347-349
const trash = await Parse.Cloud.run('type-delete', {
    machineName: 'article'
});
```

**Capability Required**: None (uses CloudRunOptions)

**Source**: `actinium-type/plugin.js:336-349`

### type-status

```javascript
// actinium-type/plugin.js:278-281
const status = await Parse.Cloud.run('type-status', {
    machineName: 'article'
});

// Returns:
// {
//     collection: 'Content_article',
//     count: 42,              // Number of content items
//     fields: ['objectId', 'title', 'body', 'createdAt', 'updatedAt', ...]
// }
```

**Purpose**: Get Parse schema fields and content count for a type

**Source**: `actinium-type/plugin.js:267-281`, `actinium-core/lib/type/index.js:308-333`

### types

```javascript
// actinium-type/plugin.js:233-235
const list = await Parse.Cloud.run('types', {
    page: 1,
    limit: 50
});
```

**Capability Required**: None

**Source**: `actinium-type/plugin.js:228-235`

---

## Built-In Type Registration

### Default Type Registry

Plugins can register built-in types that are auto-created on startup:

```javascript
// actinium-type/plugin.js:351-413 - collection-before-load hook
Actinium.Hook.register('collection-before-load', async (collection) => {
    if (!collection) {  // Only on Actinium startup
        if (Actinium.Type[DEFAULT_TYPE_REGISTRY].list.length > 0) {
            BOOT('Adding Built-in Content Types...');

            await Promise.all(
                Actinium.Type[DEFAULT_TYPE_REGISTRY].list.map(async (template) => {
                    let contentType = await Actinium.Type.retrieve(
                        { machineName: template.machineName },
                        options
                    ).catch(() => null);

                    if (!contentType) {
                        // Create new type
                        contentType = await Actinium.Type.create(template, options);
                    } else {
                        // Update existing type (merge fields/regions)
                        const updated = {
                            ...contentType,
                            fields: {
                                ...template.fields,
                                ...contentType.fields
                            },
                            regions: {
                                ...template.regions,
                                ...contentType.regions
                            }
                        };
                        contentType = await Actinium.Type.update(updated, options);
                    }
                })
            );
        }
    }
});
```

**Usage** (from plugin):
```javascript
// Register default type
Actinium.Type[DEFAULT_TYPE_REGISTRY].register({
    type: 'Page',
    machineName: 'page',
    fields: {
        'uuid-1': {
            fieldId: 'uuid-1',
            fieldName: 'title',
            fieldType: 'Text',
            region: 'default'
        }
    },
    regions: {
        default: { id: 'default', label: 'Default', slug: 'default' }
    },
    meta: {
        label: 'Page',
        icon: 'Linear.FileText'
    }
});
```

**Source**: `actinium-type/plugin.js:351-413`, `actinium-core/lib/type/enums.js:20`

---

## Hooks

### type-saved

**Fired**: After `Type.create()` or `Type.update()` saves

**Parameters**: `(typeObj)` - Serialized type object

**Use Cases**:
- Trigger schema creation
- Invalidate caches
- Register capabilities for new content types
- Update search indexes

**Source**: `actinium-core/lib/type/index.js:101, 175`

### type-deleted

**Fired**: After `Type.delete()` destroys type

**Parameters**: `(typeObj)` - Serialized type object (before deletion)

**Use Cases**:
- Invalidate caches
- Clean up related data
- Unregister capabilities

**Source**: `actinium-core/lib/type/index.js:214`

### type-retrieved

**Fired**: After `Type.retrieve()` fetches type

**Parameters**: `(typeObj)` - Serialized type object

**Use Cases**:
- Add computed properties
- Inject plugin-specific metadata
- Cache population

**Source**: `actinium-core/lib/type/index.js:266`

### collection-before-load

**Fired**: Before collections are registered (startup)

**Parameters**: `(collection)` - Collection name being loaded (null on startup)

**Use Cases**:
- Register built-in types
- Seed default content types
- Database migrations

**Source**: `actinium-type/plugin.js:351-413`

---

## Routes (Type Plugin)

The Type plugin registers routes via `Actinium.Route.save()` on:
- Startup (`start` hook)
- Plugin activation (`activate` hook)
- Plugin update (`update` hook)

Routes are removed on deactivation (`deactivate` hook).

**Route File**: `actinium-type/routes.js` (not shown, but referenced in plugin.js:5)

**Source**: `actinium-type/plugin.js:61-100`

---

## Best Practices

### 1. Always Use Namespace

```javascript
// ❌ BAD: Using default uninstalled namespace
const type = await Actinium.Type.create({ type: 'Article' });

// ✅ GOOD: Explicit namespace
ENV.CONTENT_NAMESPACE = '550e8400-e29b-41d4-a716-446655440000';
const type = await Actinium.Type.create({ type: 'Article' });
```

**Why**: Default namespace causes UUID collisions across environments

### 2. Never Modify Immutable Properties

```javascript
// ❌ BAD: Attempting to change UUID
const updated = await Actinium.Type.update({
    uuid: existingType.uuid,
    machineName: 'new-machine-name'  // ❌ Ignored
});

// ✅ GOOD: Only update mutable properties
const updated = await Actinium.Type.update({
    uuid: existingType.uuid,
    fields: { ... },
    meta: { label: 'New Label' }
});
```

### 3. Use machineName for Lookups

```javascript
// ❌ BAD: Querying by objectId (changes across environments)
const type = await Actinium.Type.retrieve({ objectId: 'abc123' });

// ✅ GOOD: Query by machineName (consistent across environments)
const type = await Actinium.Type.retrieve({ machineName: 'article' });
```

### 4. Handle Type Not Found

```javascript
// ❌ BAD: Assuming type exists
const type = await Actinium.Type.retrieve({ machineName: 'article' });
const collection = type.collection;  // ❌ Throws if not found

// ✅ GOOD: Handle missing type
try {
    const type = await Actinium.Type.retrieve({ machineName: 'article' });
    const collection = type.collection;
} catch (error) {
    console.error('Type not found:', error);
}
```

### 5. Merge Fields on Update (Don't Replace)

```javascript
// ❌ BAD: Replacing all fields (deletes existing fields)
const updated = await Actinium.Type.update({
    machineName: 'article',
    fields: {
        'new-uuid': {
            fieldId: 'new-uuid',
            fieldName: 'newField',
            fieldType: 'Text',
            region: 'default'
        }
    }
});
// ❌ All previous fields are gone!

// ✅ GOOD: Merge with existing fields
const existing = await Actinium.Type.retrieve({ machineName: 'article' });
const updated = await Actinium.Type.update({
    machineName: 'article',
    fields: {
        ...existing.fields,  // ✅ Preserve existing
        'new-uuid': {
            fieldId: 'new-uuid',
            fieldName: 'newField',
            fieldType: 'Text',
            region: 'default'
        }
    }
});
```

---

## Common Gotchas

### 1. Type Deletion Doesn't Delete Content

```javascript
await Actinium.Type.delete({ machineName: 'article' });

// ⚠️ Content_article collection still exists
// ⚠️ All article content items still exist
// ⚠️ Parse schema still exists
```

**Fix**: Manually delete content and schema if needed

### 2. Field Deletion Doesn't Delete Schema Field

```javascript
const type = await Actinium.Type.retrieve({ machineName: 'article' });
delete type.fields['old-field-uuid'];
await Actinium.Type.update(type);

// ⚠️ Parse schema still has 'oldFieldName' column
```

**Fix**: Use Parse Schema API to delete field:
```javascript
const schema = new Parse.Schema('Content_article');
await schema.get({ useMasterKey: true });
schema.deleteField('oldFieldName');
await schema.update({ useMasterKey: true });
```

### 3. Namespace Change Breaks UUIDs

```javascript
// Type created with namespace A
const type = await Actinium.Type.create({
    type: 'Article',
    namespace: 'namespace-a'
});
// uuid: '550e8400-...' (hash of 'article' + 'namespace-a')

// Later, change namespace
await Actinium.Type.update({
    uuid: type.uuid,
    namespace: 'namespace-b'  // ❌ beforeSave hook prevents this
});

// ✅ Namespace remains 'namespace-a' (enforced by plugin)
```

**Source**: `actinium-type/plugin.js:195-213`

### 4. machineName Auto-Slugification Can Cause Collisions

```javascript
await Actinium.Type.create({ type: 'Blog Post' });    // machineName: 'blog-post'
await Actinium.Type.create({ type: 'Blog-Post' });    // machineName: 'blog-post' ❌ Collision!

// Error: "Type Blog-Post is not unique in namespace..."
```

**Fix**: Explicitly provide `machineName`:
```javascript
await Actinium.Type.create({
    type: 'Blog Post',
    machineName: 'blog_post'  // ✅ Explicit
});
```

### 5. Default Namespace Warning

```javascript
// actinium-type/plugin.js:35-50
Actinium.Hook.register('warning', async () => {
    const namespace = getNamespace();
    if (namespace === UNINSTALLED_NAMESPACE) {
        WARN('It appears you have not set the ID_NAMESPACE to a unique random uuid/v4.');
        WARN('The default will be used and your content ids will not be unique!');
    }
});
```

**Source**: `actinium-type/plugin.js:35-50`

---

## Integration with Content System

### Type → Content Workflow

```javascript
// 1. Create type
const type = await Actinium.Type.create({
    type: 'Article',
    fields: {
        'uuid-1': {
            fieldId: 'uuid-1',
            fieldName: 'title',
            fieldType: 'Text',
            region: 'default'
        }
    }
});

// 2. Create content of that type
const article = await Actinium.Content.create({
    type: { machineName: 'article' },  // OR: type: type
    title: 'My First Article'
});

// 3. Query content
const articles = await Actinium.Content.find({
    type: 'article',
    status: 'PUBLISHED'
});
```

**See Also**: `COLLECTION_REGISTRATION.md`, Content SDK documentation

---

## Summary

**Core Concepts**:
- Types are schema-as-data (stored in `Type` collection)
- UUIDs are namespace-based (v5) for cross-environment consistency
- Collection names auto-generated (`Content_{machineName}`)
- Fields/regions define structure, not enforced until schema created
- Schema creation happens via `type-saved` hook
- Type capabilities control type CRUD, content capabilities control content CRUD

**Key Operations**:
- `Actinium.Type.create()` - Create new type
- `Actinium.Type.retrieve()` - Get type by machineName/uuid/collection
- `Actinium.Type.update()` - Update fields/regions/meta
- `Actinium.Type.delete()` - Move to recycle (doesn't delete content)
- `Actinium.Type.list()` - List all types (cached)

**Integration Points**:
- `type-saved` hook → schema creation
- `collection-before-load` hook → built-in types
- `Type[DEFAULT_TYPE_REGISTRY]` → register default types
- Collection Registration → content capabilities

**Critical Files**:
- `actinium-core/lib/type/index.js` - Type SDK
- `actinium-type/plugin.js` - Plugin registration, cloud functions, hooks
- `actinium-core/lib/type/enums.js` - Constants
