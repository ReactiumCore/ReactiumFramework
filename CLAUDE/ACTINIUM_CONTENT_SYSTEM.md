<!-- v1.0.0 -->

# Actinium Content System

**Purpose**: Type-based content management system with UUID-based content identification, CRUD operations, ACL management, and hook-extensible validation.

**Source**: `actinium-content/sdk.js:1-531`, `plugin.js:1-180`, `schema.js:1-57`

---

## Architecture Overview

Content system provides type-safe content management where each content item:
- Has a unique UUID (type + slug combination)
- Belongs to a Type (e.g., blog, page, product)
- Has status-driven workflow (PUBLISHED, DRAFT, etc.)
- Supports user ownership and ACL-based access control
- Stores structured data in `data` and `meta` objects

---

## Content Collection Schema

```javascript
{
  collection: 'Content',
  indexes: ['uuid', 'slug', 'title'],
  schema: {
    title: { type: 'String' },
    meta: { type: 'Object' },      // Arbitrary metadata
    data: { type: 'Object' },      // Structured content data
    slug: { type: 'String' },      // URL-friendly identifier
    uuid: { type: 'String' },      // Unique ID (type/slug hash)
    taxonomy: {                     // Many-to-many taxonomies
      type: 'Relation',
      targetClass: 'Taxonomy'
    },
    type: {                         // Content type pointer
      type: 'Pointer',
      targetClass: 'Type'
    },
    status: { type: 'String' },    // PUBLISHED, DRAFT, DELETE, etc.
    user: {                         // Content owner
      type: 'Pointer',
      targetClass: '_User'
    },
    parent: {                       // Hierarchical relationships
      type: 'Pointer',
      targetClass: 'Content'
    },
    children: {                     // Child content items
      type: 'Relation',
      targetClass: 'Content'
    },
    file: { type: 'File' }         // Optional file attachment
  },
  actions: {
    addField: false,
    create: true,
    retrieve: true,
    update: true,
    delete: true
  }
}
```

**Source**: `schema.js:1-57`

---

## SDK Architecture

Content SDK is a class-based singleton with property getters:

```javascript
class SDK {
  get collection()  // Returns 'Content'
  get schema()      // Returns Content schema from PLUGIN_SCHEMA
  get version()     // Returns plugin version from package.json
  get exists()      // Async function to check content existence
  get find()        // Async function to query content
  get retrieve()    // Async function to get single content
  get save()        // Async function to create/update content
  get beforeSave()  // Parse beforeSave hook handler
  get delete()      // Async function to soft delete (status=DELETE)
  get purge()       // Async function to hard delete
  get utils()       // Utility methods object
}

Actinium.Content = new SDK();
```

**Source**: `sdk.js:24-530`

---

## UUID System

### UUID v5 Namespacing

Content uses deterministic UUID generation for cross-environment consistency:

```javascript
import { v4 as uuid, v5 as uuidv5 } from 'uuid';

const NAMESPACE = ENV.CONTENT_NAMESPACE || '9f85eb4d-777b-4213-b039-fced11c2dbae';

// Generate content UUID
const contentUUID = uuidv5(`${type}/${slug}`, NAMESPACE);
// Example: uuidv5('blog/hello-world', NAMESPACE) → '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
```

**Key Benefits**:
- Same type + slug = same UUID across environments
- Enables content sync between dev/staging/prod
- Predictable for testing and migrations

**Source**: `sdk.js:6,17,460-463`

---

## Core API Methods

### Actinium.Content.find(params, options)

Query content with filtering, pagination, and sorting.

**Parameters**:
- `params.uuid` - String or array of UUIDs
- `params.objectId` - String or array of objectIds
- `params.title` - Title search (regex, min 4 chars)
- `params.status` - String or array of statuses (PUBLISHED, DRAFT, DELETE, etc.)
- `params.user` - String (objectId) or array of user objectIds
- `params.type` - Type objectId, machineName, or Type object
- `params.slug` - String or array of slugs (converted to UUIDs if type provided)
- `params.limit` - Results per page (max 100, default 50)
- `params.page` - Page number (starts at 1)
- `options` - Parse options (useMasterKey, sessionToken, etc.)

**Query Hooks**:
- `content-query` - Modify Parse.Query before execution

**Returns**:
```javascript
{
  count: 42,      // Total matching records
  page: 1,        // Current page
  pages: 3,       // Total pages
  limit: 50,      // Results per page
  index: 0,       // Skip offset
  results: []     // Array of Content objects (includes type, user pointers)
}
```

**Example**:
```javascript
// Find published blog posts
const { results, count, pages } = await Actinium.Content.find({
  type: 'blog',
  status: 'PUBLISHED',
  limit: 20,
  page: 1
}, { useMasterKey: true });

// Find by type + slug (converts to UUID)
const { results } = await Actinium.Content.find({
  type: 'blog',
  slug: ['hello-world', 'my-first-post']
}, options);

// Title search (min 4 chars)
const { results } = await Actinium.Content.find({
  title: 'React'  // Regex search, case-insensitive
}, options);
```

**Source**: `sdk.js:55-146`

---

### Actinium.Content.retrieve(params, options, create = false)

Retrieve single content item by uuid, objectId, or type + slug.

**Parameters**:
- `params.uuid` - Content UUID
- `params.objectId` - Content objectId
- `params.type` - Type identifier (if using slug)
- `params.slug` - Content slug (requires type)
- `options` - Parse options (defaults to `{ useMasterKey: true }` if not provided)
- `create` - Boolean, return new Content object if not found (default: false)

**Returns**: Parse Content object or `undefined` (or new object if `create=true`)

**Example**:
```javascript
// By UUID
const content = await Actinium.Content.retrieve({
  uuid: '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
}, { useMasterKey: true });

// By type + slug
const content = await Actinium.Content.retrieve({
  type: 'blog',
  slug: 'hello-world'
}, options);

// By objectId
const content = await Actinium.Content.retrieve({
  objectId: 'abc123'
}, options);

// Create new if not found
const content = await Actinium.Content.retrieve({
  type: 'blog',
  slug: 'new-post'
}, options, true);  // Returns new Content object if not found
```

**Source**: `sdk.js:148-181`

---

### Actinium.Content.save(params, options)

Create or update content item with validation and hook integration.

**Parameters**:
- `params.type` - Type objectId, machineName, or Type object (required)
- `params.title` - Content title (required)
- `params.slug` - URL-friendly slug (auto-generated from uuid if not provided)
- `params.uuid` - Unique identifier (auto-generated if not provided)
- `params.status` - Content status (auto-generated from type if not provided)
- `params.user` - User objectId or User object (optional)
- `params.data` - Structured content data object (optional, default: {})
- `params.meta` - Metadata object (optional, default: {})
- `params.*` - Any other schema fields
- `options` - Parse options

**Validation**:
- `title` - Required (min length check via hook)
- `type` - Required, must exist

**Hooks**:
- `content-save-sanitize` - Filter params after schema validation
- `content-before-save` - Modify object before validation
- `content-validate` - Custom validation logic
- `content-acl` - Modify ACL before save
- `content-save` - Last chance to mutate before database write

**Returns**: Saved and fetched Content object

**Example**:
```javascript
// Create new content
const content = await Actinium.Content.save({
  type: 'blog',
  title: 'Hello World',
  slug: 'hello-world',
  status: 'PUBLISHED',
  user: req.user.id,
  data: {
    body: '<p>Content here</p>',
    excerpt: 'Short summary'
  },
  meta: {
    featured: true,
    readTime: 5
  }
}, { sessionToken: req.sessionToken });

// Update existing (finds by uuid)
const updated = await Actinium.Content.save({
  uuid: existingUUID,
  title: 'Updated Title',
  data: { body: '<p>New content</p>' }
}, options);
```

**Source**: `sdk.js:183-231`

---

### Actinium.Content.delete(params, options)

Soft delete content by setting status to 'DELETE'.

**Process**:
1. Finds all matching content via `.find()`
2. Sets status='DELETE' on each item
3. Calls `saveEventually()` for background processing
4. Paginates through all results

**Parameters**: Same as `.find()` (uuid, objectId, type, slug, etc.)

**Returns**: `{ items: [] }` - Array of soft-deleted content objects

**Note**: Does NOT permanently delete from database, use `.purge()` for permanent deletion.

**Example**:
```javascript
// Soft delete by type + slug
const { items } = await Actinium.Content.delete({
  type: 'blog',
  slug: 'old-post'
}, { useMasterKey: true });

// Soft delete multiple by status
const { items } = await Actinium.Content.delete({
  status: 'DRAFT',
  user: userId
}, options);
```

**Source**: `sdk.js:383-405`

---

### Actinium.Content.purge(params, options)

Permanently delete content with status='DELETE'.

**Process**:
1. Automatically sets `params.status = 'DELETE'`
2. Finds all matching content
3. Calls `destroyEventually()` for permanent deletion
4. Paginates through all results

**Parameters**: Same as `.find()` (automatically filters status=DELETE)

**Returns**: `{ items: [] }` - Array of purged content objects

**Warning**: Permanent deletion, cannot be undone!

**Example**:
```javascript
// Purge all soft-deleted blog posts
const { items } = await Actinium.Content.purge({
  type: 'blog'
}, { useMasterKey: true });

// Purge specific item
const { items } = await Actinium.Content.purge({
  uuid: contentUUID
}, options);
```

**Source**: `sdk.js:407-430`

---

### Actinium.Content.exists({ type, slug }, options)

Check if content exists by type + slug.

**Parameters**:
- `type` - Type machineName
- `slug` - Content slug
- `options` - Parse options (default: `{ useMasterKey: true }`)

**Returns**: Boolean

**Example**:
```javascript
const exists = await Actinium.Content.exists({
  type: 'blog',
  slug: 'hello-world'
}, { useMasterKey: true });

if (exists) {
  console.log('Content already exists');
}
```

**Source**: `sdk.js:43-53`

---

## beforeSave Hook Handler

Actinium.Content.beforeSave is registered as Parse Server beforeSave hook for Content collection.

**Responsibilities**:

1. **Type Resolution** - Converts type string to Type object
2. **User Resolution** - Converts user string to User object
3. **ACL Generation** - Creates capability-based ACL
4. **Status Generation** - Derives from type if not provided
5. **UUID Generation** - Creates unique identifier if not provided
6. **Slug Generation** - Defaults to UUID if not provided
7. **Data/Meta Initialization** - Ensures objects exist
8. **Validation** - Runs required field checks

**Context Object**:
```javascript
req.context = {
  error: {
    message: null,      // Array of error messages
    set: (msg) => {},   // Add error message
    get: () => {}       // Get concatenated errors
  },
  isError: () => {},    // Check if errors exist
  required: []          // Array of required field names
}
```

**ACL Pattern**:
```javascript
const ACL = new Actinium.ACL();
ACL.setPublicReadAccess(false);
ACL.setPublicWriteAccess(false);

if (user) {
  ACL.setReadAccess(user.id, true);
  ACL.setWriteAccess(user.id, true);
}

['super-admin', 'administrator'].forEach(role => {
  ACL.setRoleReadAccess(role, true);
  ACL.setRoleWriteAccess(role, true);
});
```

**Hooks**:
- `content-before-save` - Early modification before type/user resolution
- `content-validate` - Add custom validation logic
- `content-acl` - Modify ACL before finalizing
- `content-save` - Last chance mutation before database write

**Source**: `sdk.js:233-381`, `plugin.js:176`

---

## Utility Methods

### utils.genUUID(type, slug)

Generate deterministic UUID v5 from type + slug.

```javascript
const uuid = Actinium.Content.utils.genUUID('blog', 'hello-world');
// '3f2504e0-4f89-11d3-9a0c-0305e82c3301' (deterministic)
```

**Source**: `sdk.js:460-463`

---

### utils.genSlug(title)

Generate URL-friendly slug from title.

```javascript
const slug = Actinium.Content.utils.genSlug('Hello World!');
// 'hello-world'
```

Uses `slugify` with options: `{ lower: true, strict: true }`

**Source**: `sdk.js:451-458`

---

### utils.type(type)

Resolve type identifier to Type object.

**Accepts**:
- String (machineName, uuid, or objectId)
- Type object with id
- Type object with uuid/objectId/machineName

**Returns**: Type Parse object or `undefined`

**Example**:
```javascript
const type = await Actinium.Content.utils.type('blog');
const type = await Actinium.Content.utils.type({ uuid: '...' });
const type = await Actinium.Content.utils.type(typeObject);
```

**Source**: `sdk.js:468-497`

---

### utils.typeFromString(key, str, options)

Fetch Type by specific field.

```javascript
const type = await Actinium.Content.utils.typeFromString('machineName', 'blog');
const type = await Actinium.Content.utils.typeFromString('uuid', typeUUID);
```

**Source**: `sdk.js:499-509`

---

### utils.userFromString(user, fetch = false)

Convert user string (objectId) to User object.

```javascript
// Create pointer only (no fetch)
const userPointer = await Actinium.Content.utils.userFromString(userId);

// Fetch full user object
const userObj = await Actinium.Content.utils.userFromString(userId, true);
```

**Source**: `sdk.js:511-524`

---

### utils.stringToArray(str)

Convert string or array to flattened, unique array.

```javascript
utils.stringToArray('blog')          // ['blog']
utils.stringToArray(['a', 'b', 'a']) // ['a', 'b']
utils.stringToArray([['a'], 'b'])    // ['a', 'b']
```

**Source**: `sdk.js:465-466`

---

### utils.assertString(key, str)

Throw error if value is not a string.

```javascript
utils.assertString('title', title);  // Throws if not string
```

**Source**: `sdk.js:434-438`

---

### utils.assertSearchLength(str)

Throw error if search string is less than 4 characters.

```javascript
utils.assertSearchLength('Rea');  // Throws ENUMS.ERROR.SEARCH_LENGTH
utils.assertSearchLength('React'); // OK
```

**Source**: `sdk.js:440-444`

---

### utils.assertTypeSlug(type, slug)

Validate both type and slug are strings.

```javascript
utils.assertTypeSlug('blog', 'hello-world');  // OK
utils.assertTypeSlug(123, 'hello');           // Throws
```

**Source**: `sdk.js:446-449`

---

## Cloud Functions

All cloud functions registered with plugin ID `actinium-content`:

```javascript
// Create/update content
Actinium.Cloud.define('actinium-content', 'content-save', (req) => {
  req.params.user = req.params.user || req.user.id;
  return Actinium.Content.save(req.params, CloudRunOptions(req));
});

// Query content
Actinium.Cloud.define('actinium-content', 'content-list', (req) =>
  Actinium.Content.find(req.params, CloudRunOptions(req))
);

// Soft delete
Actinium.Cloud.define('actinium-content', 'content-delete', (req) =>
  Actinium.Content.delete(req.params, CloudRunOptions(req))
);

// Hard delete
Actinium.Cloud.define('actinium-content', 'content-purge', (req) =>
  Actinium.Content.purge(req.params, CloudRunOptions(req))
);

// Retrieve single
Actinium.Cloud.define('actinium-content', 'content-retrieve', (req) =>
  Actinium.Content.retrieve(req.params, CloudRunOptions(req))
);

// Check existence
Actinium.Cloud.define('actinium-content', 'content-exists', (req) =>
  Actinium.Content.exists(req.params, CloudRunOptions(req))
);
```

**Source**: `plugin.js:88-117`

---

## Parse Server Hooks

### beforeFind

```javascript
Actinium.Cloud.beforeFind('Content', async (req) => {
  await Actinium.Hook.run('content-before-find', req);
});
```

**Source**: `plugin.js:156-158`

---

### afterFind

```javascript
Actinium.Cloud.afterFind('Content', async (req) => {
  await Actinium.Hook.run('content-after-find', req);
  return req.objects;
});
```

**Source**: `plugin.js:125-128`

---

### beforeSave

```javascript
Actinium.Cloud.beforeSave('Content', Actinium.Content.beforeSave);
```

**Source**: `plugin.js:176`

---

### afterSave

```javascript
Actinium.Cloud.afterSave('Content', async (req) => {
  await Actinium.Hook.run('content-after-save', req);
});
```

**Source**: `plugin.js:146-148`

---

### beforeDelete

```javascript
Actinium.Cloud.beforeDelete('Content', async (req) => {
  await Actinium.Hook.run('content-before-delete', req);
});
```

**Source**: `plugin.js:166-168`

---

### afterDelete

```javascript
Actinium.Cloud.afterDelete('Content', async (req) => {
  await Actinium.Hook.run('content-after-delete', req);
});
```

**Source**: `plugin.js:136-138`

---

## Hook Integration Points

### Query Modification

```javascript
Actinium.Hook.register('content-query', ({ query, params, options }) => {
  // Add custom query constraints
  query.equalTo('meta.featured', true);
});
```

**Source**: `sdk.js:110-114`

---

### Save Sanitization

```javascript
Actinium.Hook.register('content-save-sanitize', (params) => {
  // Filter params after schema validation
  delete params.internalField;
});
```

**Source**: `sdk.js:204`

---

### Validation

```javascript
Actinium.Hook.register('content-validate', (req) => {
  const body = req.object.get('data').body;

  if (!body || body.length < 10) {
    req.context.error.set('Body must be at least 10 characters');
  }
});
```

**Source**: `sdk.js:274`

---

### ACL Customization

```javascript
Actinium.Hook.register('content-acl', (req) => {
  const ACL = req.object.getACL();

  // Add role-based access
  if (req.object.get('meta').publiclyVisible) {
    ACL.setPublicReadAccess(true);
  }

  req.object.setACL(ACL);
});
```

**Source**: `sdk.js:329`

---

### Pre-Save Mutation

```javascript
Actinium.Hook.register('content-save', (req) => {
  // Last chance to modify before save
  const now = new Date();
  req.object.set('meta.lastModified', now);
});
```

**Source**: `sdk.js:379`

---

### Lifecycle Hooks

```javascript
// Before content query
Actinium.Hook.register('content-before-find', (req) => {
  // Modify Parse beforeFind request
});

// After content query
Actinium.Hook.register('content-after-find', (req) => {
  // Process results after query
});

// Before content save (Parse hook)
Actinium.Hook.register('content-before-save', (req) => {
  // Early modification
});

// After content save
Actinium.Hook.register('content-after-save', (req) => {
  // Post-save processing (cache invalidation, search indexing, etc.)
});

// Before content delete
Actinium.Hook.register('content-before-delete', (req) => {
  // Prevent deletion or cleanup
});

// After content delete
Actinium.Hook.register('content-after-delete', (req) => {
  // Post-delete cleanup
});
```

---

## Real-World Usage Patterns

### Pattern 1: Create Blog Post

```javascript
const post = await Actinium.Content.save({
  type: 'blog',
  title: 'Getting Started with Actinium',
  slug: 'getting-started',
  status: 'PUBLISHED',
  user: req.user.id,
  data: {
    body: '<p>Welcome to Actinium...</p>',
    excerpt: 'Learn the basics',
    coverImage: fileObject
  },
  meta: {
    featured: true,
    readTime: 5,
    tags: ['tutorial', 'beginner']
  }
}, { sessionToken: req.sessionToken });
```

---

### Pattern 2: Query with Type + Status Filter

```javascript
const { results, count, pages } = await Actinium.Content.find({
  type: 'blog',
  status: ['PUBLISHED', 'SCHEDULED'],
  limit: 10,
  page: 1
}, { useMasterKey: true });

// Include type and user pointers automatically
results.forEach(post => {
  console.log(post.get('title'));
  console.log(post.get('type').get('machineName'));
  console.log(post.get('user').get('username'));
});
```

---

### Pattern 3: Update Existing Content

```javascript
// Retrieve by type + slug
const content = await Actinium.Content.retrieve({
  type: 'blog',
  slug: 'hello-world'
}, { useMasterKey: true });

// Update fields
const updated = await Actinium.Content.save({
  uuid: content.get('uuid'),
  title: 'Updated Title',
  data: {
    ...content.get('data'),
    body: '<p>Updated content</p>'
  }
}, { useMasterKey: true });
```

---

### Pattern 4: Soft Delete Workflow

```javascript
// Step 1: Soft delete (status=DELETE)
await Actinium.Content.delete({
  type: 'blog',
  slug: 'old-post'
}, { useMasterKey: true });

// Step 2: Query soft-deleted content
const { results } = await Actinium.Content.find({
  status: 'DELETE',
  type: 'blog'
}, { useMasterKey: true });

// Step 3: Restore (change status back)
await Actinium.Content.save({
  uuid: results[0].get('uuid'),
  status: 'DRAFT'
}, { useMasterKey: true });

// Step 4: Permanent delete after review
await Actinium.Content.purge({
  type: 'blog',
  status: 'DELETE'  // Automatically filtered
}, { useMasterKey: true });
```

---

### Pattern 5: Search by Title

```javascript
// Min 4 characters required
const { results } = await Actinium.Content.find({
  title: 'React',  // Case-insensitive regex search
  type: 'blog',
  status: 'PUBLISHED'
}, { useMasterKey: true });
```

---

### Pattern 6: Hierarchical Content

```javascript
// Create parent page
const parent = await Actinium.Content.save({
  type: 'page',
  title: 'Documentation',
  slug: 'docs'
}, { useMasterKey: true });

// Create child page
const child = await Actinium.Content.save({
  type: 'page',
  title: 'Getting Started',
  slug: 'docs-getting-started',
  parent: parent  // Pointer to parent
}, { useMasterKey: true });

// Add to parent's children relation
parent.relation('children').add(child);
await parent.save(null, { useMasterKey: true });
```

---

### Pattern 7: Custom Validation

```javascript
Actinium.Hook.register('content-validate', (req) => {
  const type = req.object.get('type');

  if (type.get('machineName') === 'blog') {
    const data = req.object.get('data');

    if (!data.body || data.body.length < 100) {
      req.context.error.set('Blog posts must have at least 100 characters');
    }

    if (!data.excerpt) {
      req.context.error.set('Blog posts require an excerpt');
    }
  }
});
```

---

### Pattern 8: Syndicate Integration

```javascript
// Content automatically includes type pointer
const { results } = await Actinium.Content.find({
  status: 'PUBLISHED'
}, { useMasterKey: true });

// Syndicate enriches with URLs
await Actinium.Hook.run('syndicate-content-list', { results });

results.forEach(content => {
  console.log(content.urls);  // URLs added by syndicate hook
});
```

---

## Best Practices

### 1. Always Provide Type

Content requires a valid Type - create types before creating content.

```javascript
// Create type first
await Actinium.Type.create({
  machineName: 'blog',
  label: 'Blog Post'
});

// Then create content
await Actinium.Content.save({
  type: 'blog',
  title: 'My Post'
});
```

---

### 2. Use UUID for Cross-Environment Sync

UUID is deterministic (type + slug), ideal for syncing content between environments:

```javascript
// Dev environment
const devContent = await Actinium.Content.save({
  type: 'blog',
  slug: 'hello-world',
  title: 'Hello World'
});

console.log(devContent.get('uuid'));
// '3f2504e0-4f89-11d3-9a0c-0305e82c3301'

// Prod environment (same type namespace)
const prodContent = await Actinium.Content.save({
  type: 'blog',
  slug: 'hello-world',
  title: 'Hello World'
});

console.log(prodContent.get('uuid'));
// '3f2504e0-4f89-11d3-9a0c-0305e82c3301' (identical!)
```

---

### 3. Structure Data/Meta Appropriately

- `data` - Content-specific structured data (body, fields, etc.)
- `meta` - Metadata about content (featured, readTime, tags, etc.)

```javascript
{
  data: {
    body: '<p>...</p>',
    excerpt: 'Summary',
    coverImage: fileObject
  },
  meta: {
    featured: true,
    readTime: 5,
    seo: {
      title: 'SEO title',
      description: 'Meta description'
    }
  }
}
```

---

### 4. Use Pagination for Large Datasets

```javascript
async function getAllContent() {
  const allResults = [];
  let page = 1;
  let pages = 1;

  while (page <= pages) {
    const { results, pages: totalPages } = await Actinium.Content.find({
      type: 'blog',
      page,
      limit: 100
    }, { useMasterKey: true });

    allResults.push(...results);
    pages = totalPages;
    page++;
  }

  return allResults;
}
```

---

### 5. Implement Soft Delete Workflow

Use status-based workflow instead of hard deletion:

```javascript
// Soft delete
await Actinium.Content.delete({ uuid }, options);

// Query excludes DELETE status by default
const published = await Actinium.Content.find({
  status: 'PUBLISHED'  // Won't include soft-deleted
}, options);

// Explicitly query soft-deleted for admin UI
const deleted = await Actinium.Content.find({
  status: 'DELETE'
}, options);
```

---

### 6. Validate in Hooks, Not Cloud Functions

```javascript
// Good - reusable validation
Actinium.Hook.register('content-validate', (req) => {
  // Runs for all saves (cloud function, direct SDK, REST API)
});

// Bad - only validates cloud function calls
Actinium.Cloud.define('content-save', (req) => {
  if (!req.params.title) throw new Error('Title required');
  return Actinium.Content.save(req.params);
});
```

---

### 7. Use Master Key for Internal Operations

```javascript
// Internal operations bypass ACL
await Actinium.Content.find(params, { useMasterKey: true });

// User-scoped operations respect ACL
await Actinium.Content.find(params, { sessionToken: req.sessionToken });
```

---

## Common Gotchas

### 1. Title Search Min Length

**Problem**: Title search throws error for < 4 characters
**Solution**: Validate search length before calling `.find()`

```javascript
const SEARCH_LENGTH = 4;

if (searchTerm.length < SEARCH_LENGTH) {
  throw new Error('Search must be at least 4 characters');
}

const results = await Actinium.Content.find({ title: searchTerm });
```

**Source**: `sdk.js:14,18-20,72,440-444`

---

### 2. Slug Auto-Generation

**Problem**: Slug defaults to UUID if not provided, not slugified title
**Solution**: Explicitly generate slug from title

```javascript
// Bad - slug will be UUID
await Actinium.Content.save({
  type: 'blog',
  title: 'Hello World'
});

// Good - explicit slug
await Actinium.Content.save({
  type: 'blog',
  title: 'Hello World',
  slug: Actinium.Content.utils.genSlug('Hello World')  // 'hello-world'
});
```

**Source**: `sdk.js:360-363`

---

### 3. Status Auto-Generation

**Problem**: Status derived from type's first status if not provided
**Solution**: Explicitly set status or ensure type has correct default

```javascript
// Type defines statuses
const type = await Actinium.Type.retrieve({ machineName: 'blog' });
console.log(type.get('fields').publisher.statuses);
// 'PUBLISHED,DRAFT,SCHEDULED'

// First status is default
const content = await Actinium.Content.save({
  type: 'blog',
  title: 'My Post'
  // status will be 'PUBLISHED' (first in list)
});

// Better - explicit status
await Actinium.Content.save({
  type: 'blog',
  title: 'My Post',
  status: 'DRAFT'  // Explicit intent
});
```

**Source**: `sdk.js:331-348`

---

### 4. Type Resolution Performance

**Problem**: Type resolution fetches from database on every save
**Solution**: Cache type objects or use type objectId directly

```javascript
// Slow - fetches type on every save
for (const post of posts) {
  await Actinium.Content.save({
    type: 'blog',  // DB lookup
    title: post.title
  });
}

// Fast - reuse type object
const blogType = await Actinium.Type.retrieve({ machineName: 'blog' });
for (const post of posts) {
  await Actinium.Content.save({
    type: blogType,  // No DB lookup
    title: post.title
  });
}
```

---

### 5. Pagination Limit Capped

**Problem**: Limit is capped at 100, higher values ignored
**Solution**: Use pagination loop for > 100 results

```javascript
// Bad - only returns 100 results
const { results } = await Actinium.Content.find({
  limit: 1000  // Ignored, returns max 100
});

// Good - paginate
async function getAll() {
  const all = [];
  let page = 1, pages = 1;

  while (page <= pages) {
    const { results, pages: total } = await Actinium.Content.find({
      page,
      limit: 100
    });
    all.push(...results);
    pages = total;
    page++;
  }

  return all;
}
```

**Source**: `sdk.js:118-120`

---

### 6. Required Fields Not Extensible via Schema

**Problem**: Required fields hardcoded to `['title']`, not derived from schema
**Solution**: Use `content-validate` hook for custom required fields

```javascript
// Schema doesn't control required fields
{
  schema: {
    title: { type: 'String' },     // Required by default
    excerpt: { type: 'String' }    // NOT required
  }
}

// Add custom required fields
Actinium.Hook.register('content-validate', (req) => {
  const type = req.object.get('type');

  if (type.get('machineName') === 'blog') {
    req.context.required.push('excerpt');  // Now required
  }
});
```

**Source**: `sdk.js:252-257`

---

### 7. Delete is Soft Delete, Not Hard Delete

**Problem**: `.delete()` only sets status='DELETE', doesn't remove from database
**Solution**: Use `.purge()` for permanent deletion

```javascript
// Soft delete
await Actinium.Content.delete({ uuid });

// Still in database
const deleted = await Actinium.Content.find({
  status: 'DELETE'
});
console.log(deleted.results.length);  // > 0

// Permanent delete
await Actinium.Content.purge({ uuid });
```

**Source**: `sdk.js:383-430`

---

### 8. ACL Prevents User-Scoped Access

**Problem**: Default ACL is private (no public access), users can't read their own content
**Solution**: Ensure user has sessionToken or use master key

```javascript
// Bad - user can't see their own content
const { results } = await Actinium.Content.find({
  user: req.user.id
}, {});  // No session token or master key

// Good - user-scoped query
const { results } = await Actinium.Content.find({
  user: req.user.id
}, { sessionToken: req.sessionToken });

// Or use master key for internal operations
const { results } = await Actinium.Content.find({
  user: userId
}, { useMasterKey: true });
```

**Source**: `sdk.js:312-327`

---

### 9. Sanitize Removes Unknown Fields

**Problem**: Fields not in schema are removed before save
**Solution**: Ensure all custom fields are in Content schema

```javascript
// Schema
{
  schema: {
    title: { type: 'String' },
    data: { type: 'Object' }
    // customField not defined
  }
}

// Saving
await Actinium.Content.save({
  title: 'My Post',
  customField: 'value'  // REMOVED by sanitize
});

// Use data object for custom fields
await Actinium.Content.save({
  title: 'My Post',
  data: {
    customField: 'value'  // Preserved
  }
});
```

**Source**: `sdk.js:184-195,203`

---

### 10. User String Not Auto-Fetched

**Problem**: User string (objectId) creates pointer without fetching full object
**Solution**: Use `.include('user')` in queries or fetch separately

```javascript
// Create with user objectId
await Actinium.Content.save({
  type: 'blog',
  title: 'My Post',
  user: userId  // String objectId
});

// Query automatically includes user pointer
const { results } = await Actinium.Content.find({});
results[0].get('user').get('username');  // Available (auto-included)

// But in beforeSave, user is pointer only
Actinium.Hook.register('content-before-save', (req) => {
  const user = req.object.get('user');
  console.log(user.get('username'));  // May not be fetched
});
```

**Source**: `sdk.js:132,301-309,511-524`

---

## Integration with Other Systems

### Type System

Content requires Type for schema and validation:

```javascript
const type = await Actinium.Type.retrieve({ machineName: 'blog' });
const content = await Actinium.Content.save({
  type: type,
  title: 'My Post'
});
```

**Source**: `sdk.js:89,199-201,468-497`

---

### Taxonomy System

Content has many-to-many relation with taxonomies:

```javascript
const content = await Actinium.Content.retrieve({ uuid });
const categories = content.relation('taxonomy');

// Attach taxonomy
await Actinium.Taxonomy.Content.attach({
  type: { machineName: 'blog', collection: 'Content_blog' },
  contentId: content.id,
  taxonomies: [{ type: 'category', slug: 'tutorials' }]
});
```

**Source**: `schema.js:21-24`

---

### User System

Content tracks ownership and ACL:

```javascript
const content = await Actinium.Content.save({
  type: 'blog',
  title: 'My Post',
  user: req.user.id  // Owner
});

// ACL grants read/write to owner
const ACL = content.getACL();
console.log(ACL.getReadAccess(req.user.id));  // true
```

**Source**: `sdk.js:301-327`

---

### Recycle System

Soft-deleted content can be archived:

```javascript
// Soft delete
await Actinium.Content.delete({ uuid });

// Archive to Recycle collection
await Actinium.Recycle.trash({
  collection: 'Content',
  object: content
});
```

---

### Syndicate System

Content syndicated to external sites:

```javascript
// Configure syndicated types
await Actinium.Setting.set('Syndicate.types', {
  blog: true,
  page: false
});

// Syndicate API automatically filters
const types = await Actinium.Syndicate.Content.types({ params: { token } });
// Returns only blog type
```

**Source**: `actinium-syndicate/sdk.js:317-320,332-340`

---

### URL System

Content URLs managed by URL plugin:

```javascript
// Get URLs for content
const { results: urls } = await Actinium.URL.list({
  contentId: content.id
}, { useMasterKey: true });

urls.forEach(url => {
  console.log(url.route);  // /blog/hello-world
});
```

---

### Search System

Content indexed for search:

```javascript
Actinium.Hook.register('content-after-save', async (req) => {
  // Re-index content
  await Actinium.Search.index({
    collection: 'Content',
    objectId: req.object.id
  });
});
```

---

## Related Documentation

- [Type System](./ACTINIUM_TYPE_SYSTEM.md) - Content type management
- [Taxonomy System](./ACTINIUM_TAXONOMY_SYSTEM.md) - Content categorization
- [Syndicate System](./ACTINIUM_SYNDICATE_SYSTEM.md) - Content distribution
- [Cloud Function Patterns](./CLOUD_FUNCTION_PATTERNS.md) - Security and validation
- [Parse ACL Patterns](./PARSE_ACL_PATTERNS.md) - Access control
- [Parse Object Serialization](./PARSE_OBJECT_SERIALIZATION.md) - Object transformation

---

## Plugin Metadata

```javascript
{
  ID: 'actinium-content',
  name: 'Content Type Plugin',
  description: 'Plugin for managing Actinium content',
  order: 100,
  version: {
    plugin: '/* from package.json */',
    actinium: '>=5.1.0',
    reactium: '>=5.0.0'
  },
  meta: {
    builtIn: false
  }
}
```

**Source**: `plugin.js:10-24`
