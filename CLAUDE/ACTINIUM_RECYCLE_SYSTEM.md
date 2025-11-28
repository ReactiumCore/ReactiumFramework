<!-- v1.0.0 -->

# Actinium Recycle System - Soft Delete and Object Archiving

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-recycle/` (SDK: 267 lines, Plugin: 237 lines)

## Overview

The Recycle System provides **soft delete functionality** for Actinium applications with three distinct types: **delete** (trash), **archive**, and **revision**. Objects moved to the Recycle collection preserve ACL, can be restored to their original collection, or permanently purged.

**Key Concept**: Recycle is NOT a revision control system - it's a **temporary storage pattern** for undo/recovery workflows.

---

## Architecture

### Three-Tier Type System

```javascript
// Type field determines recycle purpose
type RecycleType = 'delete' | 'archive' | 'revision';

// delete - User-initiated soft delete (trash can)
// archive - Long-term storage (not deleted, just moved)
// revision - Snapshot for version history
```

**Why Three Types**:
- **delete**: Recoverable trash for 30 days before purge
- **archive**: Inactive records (e.g., closed projects, old users)
- **revision**: Content snapshots before major edits

### Recycle Collection Structure

```javascript
// Parse Server Recycle collection
{
    objectId: 'recycle123',
    type: 'delete',           // delete | archive | revision
    collection: 'Content_Article',  // Original collection name
    object: {                 // Serialized original object
        objectId: 'article456',
        title: 'My Article',
        ACL: { ... },         // ACL preserved
        // ... all original fields
    },
    user: {                   // User who recycled (optional)
        __type: 'Pointer',
        className: '_User',
        objectId: 'user789',
    },
    createdAt: '2025-11-28T12:00:00.000Z',
    updatedAt: '2025-11-28T12:00:00.000Z',
    ACL: { ... },             // ACL for Recycle object itself
}
```

**Source**: `sdk.js:8-21`, `plugin.js:8-14`

---

## SDK API

### Actinium.Recycle.trash() - Soft Delete

```javascript
/**
 * Move object to Recycle collection as 'delete' type
 */
await Actinium.Recycle.trash(
    {
        collection: 'Content_Article',  // Required: Original collection
        object: articleObject,          // Required: Actinium.Object or plain object
        user: req.user,                 // Optional: User who deleted
    },
    options  // Parse options (master key, session token, etc.)
);
```

**Returns**: Parse.Object (Recycle collection object)

**Source**: `sdk.js:148-154`

**Behavior**:
1. Serializes object with `toJSON()` if Parse.Object
2. Extracts ACL from object (preserved in Recycle object)
3. Creates new Recycle object with type='delete'
4. Saves to Recycle collection

### Actinium.Recycle.archive() - Long-Term Storage

```javascript
/**
 * Move object to Recycle collection as 'archive' type
 */
await Actinium.Recycle.archive(
    {
        collection: '_User',
        object: inactiveUser,
        user: req.user,
    },
    options
);
```

**Returns**: Parse.Object (Recycle collection object)

**Source**: `sdk.js:148-149`

**Use Cases**:
- Inactive users (not deleted, just archived)
- Completed projects
- Closed support tickets
- Historical records

### Actinium.Recycle.revision() - Version Snapshot

```javascript
/**
 * Create revision snapshot before editing
 */
await Actinium.Recycle.revision(
    {
        collection: 'Content_Article',
        object: articleBeforeEdit,
        user: req.user,
    },
    options
);
```

**Returns**: Parse.Object (Recycle collection object)

**Source**: `sdk.js:151-152`

**Use Cases**:
- Content editing history
- Version control snapshots
- Audit trail for changes

### Actinium.Recycle.retrieve() - Query Recycled Objects

```javascript
/**
 * Retrieve paginated list of recycled objects
 */
const results = await Actinium.Recycle.retrieve(
    {
        type: 'delete',             // Optional: Filter by type
        collection: 'Content_Article',  // Optional: Filter by collection
        objectId: 'article456',     // Optional: Find specific object
        page: 1,                    // Page number (default: 1)
        limit: 50,                  // Results per page (default: 1000, max: 1000)
    },
    options
);

// Returns pagination metadata + results
{
    count: 100,          // Total count
    page: 1,             // Current page
    pages: 2,            // Total pages
    next: 2,             // Next page number (or null)
    prev: null,          // Previous page number (or null)
    results: [           // Array of recycled objects (toJSON() format)
        {
            objectId: 'recycle123',
            type: 'delete',
            collection: 'Content_Article',
            object: { ... },
            user: { ... },
            createdAt: '...',
        },
        // ...
    ],
}
```

**Source**: `sdk.js:93-137`

**Query Behavior**:
- Results sorted by `createdAt` descending (newest first)
- `recycle-query` hook runs before query execution
- Supports filtering by type, collection, or objectId

### Actinium.Recycle.retrieveAll() - Load All Pages

```javascript
/**
 * Retrieve all recycled objects (all pages)
 */
const allResults = await Actinium.Recycle.retrieveAll(
    {
        type: 'archive',
        collection: '_User',
    },
    options
);

// Returns flattened results
{
    count: 100,
    page: 1,
    pages: 1,
    results: [ ... ],  // All results from all pages
}
```

**Source**: `sdk.js:74-91`

**Warning**: Loads ALL pages into memory - use with caution for large datasets.

### Actinium.Recycle.restore() - Restore Single Object

```javascript
/**
 * Restore recycled object to original collection
 */
await Actinium.Recycle.restore(
    {
        objectId: 'article456',  // Original object ID
        collection: 'Content_Article',  // Optional: Filter by collection
        // OR provide items directly:
        items: [recycleObject],  // Array of Recycle objects from retrieve()
    },
    options
);
```

**Returns**: Parse.Object (restored object in original collection)

**Source**: `sdk.js:31-62`

**Restoration Process**:
1. Finds most recent Recycle object matching objectId/collection
2. Extracts `object` field (original data)
3. **Removes objectId** (generates new ID on save)
4. Restores ACL from original object
5. Restores Pointer fields (adds `__type: 'Pointer'`)
6. Saves to original collection

**Important**: Restored object gets **NEW objectId** (not original).

### Actinium.Recycle.restoreAll() - Restore Multiple Objects

```javascript
/**
 * Restore all recycled objects matching criteria
 */
const restored = await Actinium.Recycle.restoreAll(
    {
        type: 'delete',
        collection: 'Content_Article',
    },
    options
);

// Returns array of restored Parse.Objects
```

**Source**: `sdk.js:64-72`

**Warning**: Restores ALL matching objects - can create duplicates if objects already exist.

### Actinium.Recycle.purge() - Permanent Deletion

```javascript
/**
 * Permanently delete recycled objects from Recycle collection
 */
await Actinium.Recycle.purge(
    {
        type: 'delete',             // Optional: Purge specific type
        collection: 'Content_Article',  // Optional: Purge specific collection
        objectId: 'article456',     // Optional: Purge specific object
    },
    options
);
```

**Returns**: Void

**Source**: `sdk.js:23-29`

**Warning**: Permanent deletion - cannot be undone. Original objects NOT deleted (only Recycle records).

---

## Cloud Functions API

### recycle - Soft Delete (Client-Side)

```javascript
// Client-side cloud function call
await Reactium.Cloud.run('recycle', {
    collection: 'Content_Article',
    object: articleObject,
});
```

**Capability Required**: `Recycle.create` (default, configurable via settings)

**Source**: `plugin.js:103-113`

### recycle-archive - Archive (Client-Side)

```javascript
await Reactium.Cloud.run('recycle-archive', {
    collection: '_User',
    object: userObject,
});
```

**Capability Required**: `Recycle.create`

**Source**: `plugin.js:51-61`

### recycled - List Deleted Objects

```javascript
const results = await Reactium.Cloud.run('recycled', {
    collection: 'Content_Article',
    page: 1,
    limit: 50,
});
```

**Capability Required**: `Recycle.retrieve`

**Source**: `plugin.js:133-142`

**Note**: Always filters by `type: 'delete'`.

### recycle-archived - List Archived Objects

```javascript
const results = await Reactium.Cloud.run('recycle-archived', {
    collection: '_User',
});
```

**Capability Required**: `Recycle.retrieve`

**Source**: `plugin.js:75-86`

**Note**: Always filters by `type: 'archive'`.

### recycle-revision - Create Revision

```javascript
await Reactium.Cloud.run('recycle-revision', {
    collection: 'Content_Article',
    object: articleSnapshot,
});
```

**Capability Required**: `Recycle.create`

**Source**: `plugin.js:165-175`

### recycle-revisions - List Revisions

```javascript
const revisions = await Reactium.Cloud.run('recycle-revisions', {
    objectId: 'article456',
});
```

**Capability Required**: `Recycle.retrieve`

**Source**: `plugin.js:192-201`

**Note**: Filters by `type: 'revision'` and specific objectId.

### recycle-restore - Restore Object

```javascript
const restored = await Reactium.Cloud.run('recycle-restore', {
    objectId: 'article456',
    collection: 'Content_Article',
});
```

**Capability Required**: `Recycle.restore`

**Source**: `plugin.js:215-225`

### recycle-purge - Permanent Deletion

```javascript
await Reactium.Cloud.run('recycle-purge', {
    type: 'delete',
    collection: 'Content_Article',
});
```

**Capability Required**: `Recycle.delete`

**Source**: `plugin.js:143-153`

---

## Hook Integration

### recycle-query Hook

```javascript
/**
 * Modify Recycle query before execution
 */
Actinium.Hook.register('recycle-query', (qry, params, options) => {
    // Add custom filters
    qry.greaterThan('createdAt', oneWeekAgo);

    // Modify query based on params
    if (params.customFilter) {
        qry.equalTo('object.status', 'published');
    }
});
```

**Source**: `sdk.js:112-120`

**Use Cases**:
- Filter by date range
- Add custom query constraints
- Implement retention policies (e.g., only show last 30 days)

---

## Capability-Based Access Control

### Default Capabilities

```javascript
// Registered on plugin activation
Actinium.Capability.register('Recycle.create');
Actinium.Capability.register('Recycle.retrieve');
Actinium.Capability.register('Recycle.update');
Actinium.Capability.register('Recycle.delete');
Actinium.Capability.register('Recycle.addField');
```

**Source**: `plugin.js:20-32`, `schema.js:2-11`

### Settings-Based Capability Override

```javascript
// Customize capabilities via settings
await Actinium.Setting.set('recycle.capabilities.create', [
    'content-admin',  // Custom capability
]);

await Actinium.Setting.set('recycle.capabilities.retrieve', [
    'Recycle.retrieve',
    'content-viewer',
]);
```

**Source**: `plugin.js:52-54,76-79,104-106`

**Use Cases**:
- Grant recycle access to content admins
- Restrict purge to super-admins
- Allow users to view only their own recycled items

---

## Real-World Patterns

### Pattern 1: Content Soft Delete with Auto-Purge

```javascript
// beforeDelete hook for Content collection
Actinium.Hook.register('beforeDelete-Content_Article', async (req) => {
    const object = req.object;

    // Move to recycle instead of deleting
    await Actinium.Recycle.trash(
        {
            collection: 'Content_Article',
            object: object.toJSON(),
            user: req.user,
        },
        Actinium.Utils.MasterOptions()
    );

    // Prevent actual deletion
    throw new Error('Moved to recycle');
});

// Cron job to purge old trash (30 days)
Actinium.Hook.register('start', async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const oldTrash = await Actinium.Recycle.retrieve(
        {
            type: 'delete',
            // Use recycle-query hook to filter by date
        },
        Actinium.Utils.MasterOptions()
    );

    for (const item of oldTrash.results) {
        if (new Date(item.createdAt) < thirtyDaysAgo) {
            await Actinium.Recycle.purge(
                { objectId: item.object.objectId },
                Actinium.Utils.MasterOptions()
            );
        }
    }
});
```

**Pattern**: Intercept deletes, move to recycle, auto-purge after retention period.

### Pattern 2: Content Revision History

```javascript
// beforeSave hook for Content collection
Actinium.Hook.register('beforeSave-Content_Article', async (req) => {
    const object = req.object;

    // Only create revision if object exists (update, not create)
    if (!object.isNew()) {
        // Fetch current version before update
        const current = await new Actinium.Query('Content_Article')
            .equalTo('objectId', object.id)
            .first(Actinium.Utils.MasterOptions());

        // Save revision
        await Actinium.Recycle.revision(
            {
                collection: 'Content_Article',
                object: current.toJSON(),
                user: req.user,
            },
            Actinium.Utils.MasterOptions()
        );
    }
});

// Retrieve revision history
const revisions = await Actinium.Recycle.retrieve(
    {
        type: 'revision',
        objectId: 'article456',
    },
    options
);
```

**Pattern**: Auto-save revision snapshot before every edit.

### Pattern 3: User Archive on Deactivation

```javascript
// Cloud function to deactivate user
Actinium.Cloud.define('user-deactivate', async (req) => {
    const { userId } = req.params;

    const user = await new Actinium.Query('_User')
        .equalTo('objectId', userId)
        .first(Actinium.Utils.MasterOptions());

    // Archive user instead of deleting
    await Actinium.Recycle.archive(
        {
            collection: '_User',
            object: user.toJSON(),
            user: req.user,
        },
        Actinium.Utils.MasterOptions()
    );

    // Mark user as inactive (keep in database)
    user.set('active', false);
    await user.save(null, Actinium.Utils.MasterOptions());

    return { success: true };
});
```

**Pattern**: Archive user record while keeping minimal active record.

---

## Best Practices

### 1. Type Selection

 **DO**: Use correct type for intent
```javascript
// User deleted content í delete
Actinium.Recycle.trash({ collection, object });

// User archived project í archive
Actinium.Recycle.archive({ collection, object });

// Auto-save before edit í revision
Actinium.Recycle.revision({ collection, object });
```

L **DON'T**: Mix types inconsistently
```javascript
// ê WRONG: Using archive for trash
Actinium.Recycle.archive({ collection, deletedObject });
```

### 2. ACL Preservation

 **DO**: Verify ACL preserved on restore
```javascript
const restored = await Actinium.Recycle.restore({ objectId });
console.log('ACL preserved:', restored.getACL());
```

 **DO**: Set Recycle ACL to match original
```javascript
// ACL automatically copied from object in create()
```

### 3. Retention Policies

 **DO**: Implement auto-purge with cron
```javascript
// Purge trash older than 30 days
const oldTrash = await Actinium.Recycle.retrieve({
    type: 'delete',
});

// Filter and purge
```

 **DO**: Document retention period
```javascript
// Trash: 30 days before purge
// Archive: Indefinite
// Revision: Last 10 versions
```

### 4. Restore Workflow

 **DO**: Confirm before restore (creates new objectId)
```javascript
if (confirm('Restore will create new object. Continue?')) {
    await Actinium.Recycle.restore({ objectId });
}
```

 **DO**: Update references after restore
```javascript
const restored = await Actinium.Recycle.restore({ objectId });
const newId = restored.id;  // Different from original
// Update relations, references, etc.
```

### 5. Performance

 **DO**: Use pagination for large datasets
```javascript
const page1 = await Actinium.Recycle.retrieve({ page: 1, limit: 50 });
```

L **DON'T**: Use retrieveAll() for unbounded queries
```javascript
// ê WRONG: Loads all pages into memory
const all = await Actinium.Recycle.retrieveAll({ type: 'revision' });
```

---

## Common Gotchas

### 1. Restored Object Gets New ObjectId

**GOTCHA**: Restore creates NEW object - original objectId discarded.

```javascript
// Original object
const original = { objectId: 'abc123', title: 'Article' };

await Actinium.Recycle.trash({ collection: 'Content_Article', object: original });

// Restore
const restored = await Actinium.Recycle.restore({ objectId: 'abc123' });

console.log(restored.id);  // 'xyz789' (NEW ID, not 'abc123')
```

**Source**: `sdk.js:45` (objectId deleted before save)

**Impact**: References to original objectId break - must update relations.

**Workaround**: Store original objectId in custom field before recycling:
```javascript
object.set('originalId', object.id);
await Actinium.Recycle.trash({ collection, object });
```

### 2. Recycle != Version Control

**GOTCHA**: Recycle is temporary storage, NOT a full revision control system.

**Limitations**:
- No diff/comparison tools
- No branching or merging
- No conflict resolution
- Manual purge required

**Use Instead**: For true version control, implement custom versioning system or use Actinium Content Publisher workflow.

### 3. Type Field is String, Not Enum

**GOTCHA**: Type field accepts any string - no validation.

```javascript
// L WRONG: Typo creates invalid type
await Actinium.Recycle.trash({ type: 'delet', collection, object });  // Typo

//  CORRECT: Use constants
const TYPES = { DELETE: 'delete', ARCHIVE: 'archive', REVISION: 'revision' };
await Actinium.Recycle.trash({ type: TYPES.DELETE, collection, object });
```

**Impact**: Invalid types silently accepted - breaks retrieve() filtering.

### 4. Purge Does NOT Delete Original Objects

**GOTCHA**: `purge()` only deletes Recycle collection records - original objects unaffected.

```javascript
// Original object still in Content_Article collection
const original = await new Actinium.Query('Content_Article')
    .equalTo('objectId', 'article456')
    .first();

// Recycle trash
await Actinium.Recycle.trash({ collection: 'Content_Article', object: original });

// Purge recycle record
await Actinium.Recycle.purge({ objectId: 'article456' });

// Original object STILL EXISTS in Content_Article
const stillThere = await new Actinium.Query('Content_Article')
    .equalTo('objectId', 'article456')
    .first();
console.log(stillThere);  // Original object (not deleted)
```

**Solution**: Manually delete original object if needed:
```javascript
await Actinium.Recycle.trash({ collection, object });
await object.destroy(options);  // Delete original
```

### 5. Capability Settings Not Applied Until Cloud Function Call

**GOTCHA**: Settings-based capability overrides only checked in cloud functions, not SDK methods.

```javascript
// SDK method - uses default Recycle.create capability
await Actinium.Recycle.trash({ collection, object }, options);

// Cloud function - checks setting 'recycle.capabilities.create'
await Actinium.Cloud.run('recycle', { collection, object });
```

**Impact**: Direct SDK calls bypass custom capability configuration.

**Solution**: Use cloud functions for client-side access, SDK for server-side automation.

### 6. Restore Without Items Parameter Fetches Most Recent

**GOTCHA**: `restore({ objectId })` fetches most recent Recycle object - may restore wrong version if multiple exist.

```javascript
// Multiple revisions
await Actinium.Recycle.revision({ collection, object: version1 });
await Actinium.Recycle.revision({ collection, object: version2 });
await Actinium.Recycle.revision({ collection, object: version3 });

// Restore (fetches most recent = version3)
await Actinium.Recycle.restore({ objectId: 'article456' });
```

**Solution**: Fetch specific Recycle object and pass as `items`:
```javascript
const revisions = await Actinium.Recycle.retrieve({
    type: 'revision',
    objectId: 'article456',
});

// Restore specific revision
await Actinium.Recycle.restore({
    items: [revisions.results[1]],  // version2
});
```

---

## Integration Points

### With Actinium Capabilities System

- **Collection Capabilities**: `Recycle.create/retrieve/update/delete/addField`
- **Settings Override**: `recycle.capabilities.create/retrieve` via Actinium.Setting
- **Cloud Function Checks**: All cloud functions use `CloudHasCapabilities()`

**See**: [Actinium Capabilities System](./ACTINIUM_CAPABILITIES_SYSTEM.md)

### With Parse Server Hooks

- **beforeSave Hook**: Auto-create revisions before updates
- **beforeDelete Hook**: Intercept deletes, move to recycle instead
- **afterSave Hook**: Clean up old revisions (retention policy)

**See**: [Parse Server Cloud Functions](./CLOUD_FUNCTIONS.md)

### With Collection Registration

- **Schema Registration**: Recycle collection schema defined in plugin activation
- **Action Mapping**: CLP actions mapped to capabilities

**See**: [Collection Registration](./COLLECTION_REGISTRATION.md)

---

## TypeScript Support

Recycle system is JavaScript-only. For type safety:

```typescript
// Custom type definitions
interface RecycleObject {
    objectId: string;
    type: 'delete' | 'archive' | 'revision';
    collection: string;
    object: any;
    user?: Parse.Pointer;
    createdAt: string;
    updatedAt: string;
    ACL: Parse.ACL;
}

interface RecycleParams {
    collection: string;
    object: any;
    user?: Parse.User;
}

interface RecycleRetrieveParams {
    type?: 'delete' | 'archive' | 'revision';
    collection?: string;
    objectId?: string;
    page?: number;
    limit?: number;
}

interface RecycleRetrieveResult {
    count: number;
    page: number;
    pages: number;
    next: number | null;
    prev: number | null;
    results: RecycleObject[];
}
```

---

## Related Documentation

- [Parse Query Patterns](./PARSE_QUERY_PATTERNS.md) - Recycle query patterns
- [Cloud Functions](./CLOUD_FUNCTIONS.md) - Cloud function integration
- [Actinium Capabilities System](./ACTINIUM_CAPABILITIES_SYSTEM.md) - Capability-based access
- [Collection Registration](./COLLECTION_REGISTRATION.md) - Schema and CLP

---

## Summary

The Actinium Recycle System provides **soft delete functionality** with three-tier type system (delete/archive/revision). Key points:

1. **Three Types**: delete (trash), archive (inactive), revision (snapshots)
2. **ACL Preservation**: Original ACL restored on object restoration
3. **New ObjectId on Restore**: Restored objects get new IDs - references must be updated
4. **Capability-Based Access**: Configurable via settings or default capabilities
5. **Hook Integration**: `recycle-query` hook for custom filtering
6. **Pagination Support**: retrieve() with page/limit, retrieveAll() for full datasets
7. **Cloud Function API**: Client-accessible via Reactium.Cloud.run()
8. **NOT Version Control**: Temporary storage for undo/recovery, not full VCS

**Critical for**: Content management systems, user management, audit trails, undo workflows, data retention policies, archival strategies.

---

**Version**: 1.0.0
**Last Updated**: Nov 28, 2025
**Discovered During**: Third exploration - substantial SDK with three-tier type system and restore mechanics
