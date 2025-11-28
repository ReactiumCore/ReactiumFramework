<!-- v1.0.0 -->

# Actinium Taxonomy System

**Hierarchical taxonomy architecture for content organization**

---

## Overview

The Actinium Taxonomy system provides **two-level hierarchical classification** for content with a **many-to-many relationship model**. It implements a **Type → Taxonomy → Content** structure similar to WordPress taxonomy systems (Categories and Tags).

**Key Design Principles:**
- Two-level hierarchy: Taxonomy Types (like "Category") contain Taxonomies (like "Blog")
- Many-to-many relationships: Content can have multiple taxonomies
- Parse Relation-based architecture for flexible querying
- Hook-extensible CRUD operations
- Integration with Content Type system via "Taxonomy" field type
- Default installation with Category/Tag types and Blog/Featured taxonomies

---

## Architecture

### Three Collection System

1. **Type_taxonomy** - Taxonomy types (e.g., "Category", "Tag", "Topic")
   - Contains taxonomies via `taxonomies` relation
   - Defines taxonomy namespace and output format

2. **Taxonomy** - Individual taxonomy terms (e.g., "Blog", "Featured", "JavaScript")
   - References parent Type_taxonomy via pointer
   - Can be attached to content via relations

3. **Content_*** - Content collections with Taxonomy fields
   - Taxonomy fields are Parse Relations to Taxonomy collection
   - Multiple taxonomy fields per content type (e.g., `categories`, `tags`)

**Relationship Flow:**
```
Type_taxonomy (Category)
    └─ taxonomies relation → Taxonomy (Blog, News, Events)
                                  └─ Content relation ← Content_Article (field: categories)
```

**Source References:**
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-taxonomy/sdk.js:1-336`
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-taxonomy/plugin.js:1-584`

---

## SDK API

### Taxonomy Type CRUD

#### Taxonomy.Type.create(params, options)

**Create a new taxonomy type**

```javascript
const categoryType = await Actinium.Taxonomy.Type.create({
    name: 'Category',
    slug: 'category',
    description: 'Content categories',
    outputType: 'OBJECT'  // or 'JSON'
}, { useMasterKey: true });
```

**Required Fields:**
- `name` - Display name
- `slug` - Unique identifier (validated on create)

**Optional Fields:**
- `description` - Type description
- `outputType` - Default output format ('OBJECT' or 'JSON')

**Source:** `actinium-taxonomy/sdk.js:114-115`

---

#### Taxonomy.Type.retrieve(params, options)

**Retrieve a taxonomy type by slug or objectId**

```javascript
const type = await Actinium.Taxonomy.Type.retrieve({
    slug: 'category',        // OR
    objectId: 'abc123',      // OR
    name: 'Category'
}, { useMasterKey: true });

// Includes taxonomies relation in response
// type.taxonomies = { count, results: { [id]: taxonomy } }
```

**Hook Integration:** `taxonomy-type-retrieve-query` modifies query, `taxonomy-type-retrieved` adds `taxonomies` property

**Source:** `actinium-taxonomy/sdk.js:126-133`, `plugin.js:393-428`

---

#### Taxonomy.Type.list(params, options)

**List all taxonomy types**

```javascript
const { count, page, pages, results } = await Actinium.Taxonomy.Type.list({
    name: ['Category', 'Tag'],  // Filter by names (array or string)
    slug: 'category',           // Filter by slugs (array or string)
    page: 1,
    limit: 20,
    verbose: true,              // Include taxonomies relation
    outputType: 'JSON'
}, { useMasterKey: true });

// results is keyed by objectId
// results[objectId] = { name, slug, taxonomies: {...} }
```

**Source:** `actinium-taxonomy/sdk.js:144-151`, `plugin.js:259-283`

---

#### Taxonomy.Type.update(params, options)

**Update existing taxonomy type**

```javascript
await Actinium.Taxonomy.Type.update({
    objectId: 'abc123',
    description: 'Updated description'
}, { useMasterKey: true });
```

**Immutable Fields:** `slug` cannot be changed after creation

**Source:** `actinium-taxonomy/sdk.js:117-118`

---

#### Taxonomy.Type.delete(params, options)

**Delete taxonomy type (cascades to taxonomies)**

```javascript
await Actinium.Taxonomy.Type.delete({
    objectId: 'abc123'  // OR slug
}, { useMasterKey: true });
```

**Cascade Behavior:** `taxonomy-type-after-delete` hook deletes all associated taxonomies

**Source:** `actinium-taxonomy/sdk.js:120-124`, `plugin.js:383-391`

---

### Taxonomy CRUD

#### Taxonomy.create(params, options)

**Create a new taxonomy term**

```javascript
const blog = await Actinium.Taxonomy.create({
    name: 'Blog',
    slug: 'blog',
    type: categoryType,     // OR { slug: 'category' } OR 'category'
    outputType: 'OBJECT'
}, { useMasterKey: true });
```

**Required Fields:**
- `name` - Display name
- `slug` - Identifier (unique within type recommended)
- `type` - Type_taxonomy object, slug, or objectId

**String Type Resolution:** If `params.type` is a string, SDK fetches Type_taxonomy by slug

**Source:** `actinium-taxonomy/sdk.js:5-15,77`

---

#### Taxonomy.retrieve(params, options)

**Retrieve a taxonomy by type + slug**

```javascript
const blog = await Actinium.Taxonomy.retrieve({
    type: 'category',    // OR type object
    slug: 'blog',
    name: 'Blog',        // Optional additional filter
    outputType: 'OBJECT'
}, { useMasterKey: true });
```

**Hook Integration:** `taxonomy-retrieve-query` resolves type string to object, includes type pointer

**Source:** `actinium-taxonomy/sdk.js:87-94`, `plugin.js:301-324`

---

#### Taxonomy.list(params, options)

**List taxonomies with filtering**

```javascript
const { count, page, pages, results } = await Actinium.Taxonomy.list({
    type: 'category',              // Filter by type (array or string)
    slug: ['blog', 'news'],        // Filter by slugs
    name: 'Blog',                  // Filter by names
    page: 1,
    limit: 20,
    outputType: 'JSON'
}, { useMasterKey: true });
```

**Hook Integration:** `taxonomy-query` includes type pointer, resolves type strings

**Source:** `actinium-taxonomy/sdk.js:105-112`, `plugin.js:207-241`

---

#### Taxonomy.update(params, options)

**Update existing taxonomy**

```javascript
await Actinium.Taxonomy.update({
    objectId: 'abc123',
    name: 'Updated Name'
}, { useMasterKey: true });
```

**Source:** `actinium-taxonomy/sdk.js:79`

---

#### Taxonomy.delete(params, options)

**Delete taxonomy (detaches from all content)**

```javascript
await Actinium.Taxonomy.delete({
    type: 'category',
    slug: 'blog'  // OR objectId
}, { useMasterKey: true });
```

**Source:** `actinium-taxonomy/sdk.js:81-85`

---

### Content-Taxonomy Integration

#### Taxonomy.Content.attach(params, options)

**Attach taxonomy to content**

```javascript
await Actinium.Taxonomy.Content.attach({
    content: contentObject,          // OR use contentId + contentType
    contentId: 'content-id',         // Content objectId
    contentType: { machineName: 'Article' },  // Type for retrieval
    field: 'categories',             // Taxonomy field name
    type: 'category',                // Taxonomy type slug
    slug: 'blog',                    // Taxonomy slug
    update: true                     // Auto-save content (default: true)
}, { useMasterKey: true });
```

**Workflow:**
1. Retrieves content if not provided as object
2. Retrieves taxonomy by type + slug
3. Adds taxonomy to content's relation field
4. Saves content if `update: true`

**Return Value:** Updated content object (or unsaved if `update: false`)

**Source:** `actinium-taxonomy/sdk.js:153-202`

---

#### Taxonomy.Content.detach(params, options)

**Detach taxonomy from content**

```javascript
await Actinium.Taxonomy.Content.detach({
    content: contentObject,
    field: 'categories',
    type: 'category',
    slug: 'blog',
    update: true
}, { useMasterKey: true });
```

**Workflow:** Same as attach, but uses `relation.remove()` instead of `add()`

**Source:** `actinium-taxonomy/sdk.js:204-253`

---

#### Taxonomy.Content.fields(content)

**Get all taxonomy field names from content**

```javascript
const fields = Actinium.Taxonomy.Content.fields(contentObject);
// ['categories', 'tags', 'topics']
```

**Logic:** Filters content type fields for `fieldType: 'Taxonomy'`, returns slugified field names

**Source:** `actinium-taxonomy/sdk.js:255-263`

---

#### Taxonomy.Content.retrieve(params, options)

**Retrieve all taxonomies attached to content**

```javascript
const taxonomies = await Actinium.Taxonomy.Content.retrieve({
    content: contentObject,      // OR
    contentId: 'content-id',
    type: typeObject,            // OR
    collection: 'Content_Article'
}, { useMasterKey: true });

// Returns:
// {
//     categories: [
//         { ...taxonomy, field: 'categories', isTaxonomy: true, type: {...} }
//     ],
//     tags: [
//         { ...taxonomy, field: 'tags', isTaxonomy: true, type: {...} }
//     ]
// }
```

**Workflow:**
1. Gets taxonomy field names from content type
2. For each field: Queries relation, counts items, fetches all with `include('type')`
3. Returns keyed by field name with taxonomy objects

**Hook Integration:** `content-retrieve` hook automatically calls this and merges taxonomies into content object

**Source:** `actinium-taxonomy/sdk.js:265-331`, `plugin.js:130-145`

---

## Content Type Integration

### Taxonomy Field Type

```javascript
// Registered via content-schema-field-types hook
fieldTypes['Taxonomy'] = {
    type: 'Relation',
    targetClass: 'Taxonomy'
};
```

**Content Type Definition:**
```javascript
{
    fields: {
        categories: {
            fieldId: 'categories',
            fieldName: 'Categories',
            fieldType: 'Taxonomy',  // Relation to Taxonomy collection
            region: 'sidebar'
        }
    }
}
```

**Parse Schema:** Creates `Relation<Taxonomy>` field on content collection

**Source:** `actinium-taxonomy/plugin.js:124-128`

---

### Content Save Integration

**Automatic Taxonomy Attachment on Content Save**

```javascript
// Client-side content save params
await Actinium.Content.save({
    type: { machineName: 'Article' },
    title: 'My Article',
    categories: {
        'blog-id': { slug: 'blog', type: 'category', pending: true },
        'news-id': { slug: 'news', type: 'category', deleted: true }
    }
});
```

**Backend Processing (content-saved hook):**
1. Extracts taxonomy data from params (keyed by objectId)
2. Filters items with `pending: true` → calls `Taxonomy.Content.attach()`
3. Filters items with `deleted: true` → calls `Taxonomy.Content.detach()`
4. Retrieves updated taxonomies and merges into content object

**beforeSave Protection:** Unsets taxonomy fields before save (relations can't be saved directly)

**Source:** `actinium-taxonomy/plugin.js:147-182,184-205`

---

## Default Installation

### Auto-Created Taxonomy Types

```javascript
// Created on first server start if no types exist
const categoryType = await Taxonomy.Type.create({
    name: 'Category',
    slug: 'category',
    description: 'Default content taxonomy',
    outputType: 'OBJECT'
});

const tagType = await Taxonomy.Type.create({
    name: 'Tag',
    slug: 'tag',
    description: 'Default content taxonomy',
    outputType: 'OBJECT'
});
```

---

### Auto-Created Taxonomies

```javascript
const blog = await Taxonomy.create({
    name: 'Blog',
    slug: 'blog',
    type: categoryType,
    outputType: 'OBJECT'
});

const featured = await Taxonomy.create({
    name: 'Featured',
    slug: 'featured',
    type: tagType,
    outputType: 'OBJECT'
});

// Auto-adds to type relations
categoryType.relation('taxonomies').add(blog);
tagType.relation('taxonomies').add(featured);
```

**Warning Display:** If installation creates defaults, `warning` hook displays notice at startup

**Source:** `actinium-taxonomy/sdk.js:23-75`, `plugin.js:102-112`

---

## Hook Integration

### taxonomy-save Hook (beforeSave)

**Validate taxonomy fields before save**

```javascript
Actinium.Hook.register('taxonomy-save', async (req) => {
    if (!req.object.get('name')) {
        req.context.errors.push('name is a required parameter');
    }
    if (!req.object.get('slug')) {
        req.context.errors.push('slug is a required parameter');
    }
    if (!req.object.get('type')) {
        req.context.errors.push('type is a required parameter');
    }
});
```

**Source:** `actinium-taxonomy/plugin.js:326-344`

---

### taxonomy-after-save Hook

**Auto-add taxonomy to type relation**

```javascript
Actinium.Hook.register('taxonomy-after-save', async (req) => {
    const type = await req.object.get('type').fetch({ useMasterKey: true });
    const rel = type.relation('taxonomies');
    rel.add(req.object);
    await type.save(null, { useMasterKey: true });
});
```

**Purpose:** Maintains Type_taxonomy.taxonomies relation automatically

**Source:** `actinium-taxonomy/plugin.js:346-353`

---

### taxonomy-type-save Hook (beforeSave)

**Validate taxonomy type, enforce unique slug**

```javascript
Actinium.Hook.register('taxonomy-type-save', async (req) => {
    if (!req.object.get('name')) {
        req.context.errors.push('name is a required parameter');
    }
    if (!req.object.get('slug')) {
        req.context.errors.push('slug is a required parameter');
    }

    // Check slug uniqueness on new types
    if (req.object.isNew()) {
        const slug = req.object.get('slug');
        const lookup = await Taxonomy.Type.retrieve({ slug }, { useMasterKey: true });
        if (lookup) {
            req.context.errors.push('slug must be unique');
        }
    }
});
```

**Source:** `actinium-taxonomy/plugin.js:355-381`

---

### beforeSave_content Hook

**Remove taxonomy fields before content save**

```javascript
Actinium.Hook.register('beforeSave_content', async ({ object, options }) => {
    const collection = object.className;
    const type = await Actinium.Type.retrieve({ collection }, options);

    // Find all Taxonomy fields and unset them
    _.chain(Object.values(type.fields))
        .where({ fieldType: 'Taxonomy' })
        .pluck('fieldName')
        .value()
        .forEach(field => {
            field = String(field).toLowerCase();
            const val = object.get(field);
            if (!Array.isArray(val)) return;  // Only unset if array (invalid)
            object.unset(field);
        });
}, 100000000);  // Very high priority (runs last)
```

**Purpose:** Parse Relations can't be saved directly; taxonomy attachment happens via `content-saved` hook

**Source:** `actinium-taxonomy/plugin.js:184-205`

---

## Cloud Functions

### Taxonomy Type Cloud Functions

```javascript
// Create type
Actinium.Cloud.run('taxonomy-type-create', {
    name: 'Topic',
    slug: 'topic'
});

// Retrieve type
Actinium.Cloud.run('taxonomy-type-retrieve', {
    slug: 'category'
});

// List types
Actinium.Cloud.run('taxonomy-types', {
    page: 1,
    limit: 20
});

// Update type
Actinium.Cloud.run('taxonomy-type-update', {
    objectId: 'abc123',
    description: 'Updated'
});

// Delete type (cascades to taxonomies)
Actinium.Cloud.run('taxonomy-type-delete', {
    objectId: 'abc123'
});

// Exists check
Actinium.Cloud.run('taxonomy-type-exists', {
    slug: 'category'
});
```

**Source:** `actinium-taxonomy/plugin.js:537-559`

---

### Taxonomy Cloud Functions

```javascript
// Create taxonomy
Actinium.Cloud.run('taxonomy-create', {
    name: 'Tutorial',
    slug: 'tutorial',
    type: 'category'
});

// Retrieve taxonomy
Actinium.Cloud.run('taxonomy-retrieve', {
    type: 'category',
    slug: 'blog'
});

// List taxonomies
Actinium.Cloud.run('taxonomies', {
    type: 'category',
    page: 1
});

// Update taxonomy
Actinium.Cloud.run('taxonomy-update', {
    objectId: 'abc123',
    name: 'Updated Name'
});

// Delete taxonomy
Actinium.Cloud.run('taxonomy-delete', {
    type: 'category',
    slug: 'blog'
});

// Exists check
Actinium.Cloud.run('taxonomy-exists', {
    type: 'category',
    slug: 'blog'
});
```

**Source:** `actinium-taxonomy/plugin.js:513-535`

---

### Content-Taxonomy Cloud Functions

```javascript
// Attach taxonomy to content
Actinium.Cloud.run('taxonomy-content-attach', {
    contentId: 'content-id',
    contentType: { machineName: 'Article' },
    field: 'categories',
    type: 'category',
    slug: 'blog'
});

// Detach taxonomy from content
Actinium.Cloud.run('taxonomy-content-detach', {
    contentId: 'content-id',
    contentType: { machineName: 'Article' },
    field: 'categories',
    type: 'category',
    slug: 'blog'
});

// Retrieve all content taxonomies
Actinium.Cloud.run('taxonomy-content-retrieve', {
    contentId: 'content-id',
    type: { machineName: 'Article' }
});
```

**Source:** `actinium-taxonomy/plugin.js:561-580`

---

## Real-World Examples

### Example 1: Multi-Level Category System

```javascript
// Create category type
const categoryType = await Actinium.Taxonomy.Type.create({
    name: 'Category',
    slug: 'category'
}, { useMasterKey: true });

// Create parent categories
const tech = await Actinium.Taxonomy.create({
    name: 'Technology',
    slug: 'technology',
    type: 'category'
}, { useMasterKey: true });

const lifestyle = await Actinium.Taxonomy.create({
    name: 'Lifestyle',
    slug: 'lifestyle',
    type: 'category'
}, { useMasterKey: true });

// Note: Taxonomy system does NOT support parent-child hierarchies natively
// For hierarchical taxonomies, implement custom parent field:
const javascript = await Actinium.Taxonomy.create({
    name: 'JavaScript',
    slug: 'javascript',
    type: 'category',
    parent: tech  // Custom pointer field (requires schema modification)
}, { useMasterKey: true });
```

---

### Example 2: Content with Multiple Taxonomy Types

```javascript
// Content type with categories AND tags
const articleType = await Actinium.Type.create({
    machineName: 'Article',
    fields: {
        categories: {
            fieldType: 'Taxonomy',
            fieldName: 'Categories'
        },
        tags: {
            fieldType: 'Taxonomy',
            fieldName: 'Tags'
        }
    }
}, { useMasterKey: true });

// Create content with taxonomies
await Actinium.Content.save({
    type: { machineName: 'Article' },
    title: 'My Article',
    categories: {
        'tech-id': { slug: 'technology', type: 'category', pending: true }
    },
    tags: {
        'js-id': { slug: 'javascript', type: 'tag', pending: true },
        'react-id': { slug: 'react', type: 'tag', pending: true }
    }
}, { useMasterKey: true });

// Retrieve content with taxonomies (auto-populated via hook)
const article = await Actinium.Content.retrieve({
    type: { machineName: 'Article' },
    slug: 'my-article'
}, { useMasterKey: true });

// article.categories = [{ name: 'Technology', slug: 'technology', ... }]
// article.tags = [{ name: 'JavaScript', ... }, { name: 'React', ... }]
```

---

### Example 3: Query Content by Taxonomy

```javascript
// Find all articles in "Technology" category
const techTaxonomy = await Actinium.Taxonomy.retrieve({
    type: 'category',
    slug: 'technology'
}, { useMasterKey: true });

// Query relation
const qry = new Parse.Query('Content_Article');
qry.equalTo('categories', techTaxonomy);  // Relation contains taxonomy

const articles = await qry.find({ useMasterKey: true });
```

---

### Example 4: Taxonomy-Based Navigation

```javascript
// Build category navigation
const categories = await Actinium.Taxonomy.list({
    type: 'category',
    outputType: 'JSON'
}, { useMasterKey: true });

// Count content per category
const nav = await Promise.all(
    Object.values(categories.results).map(async (category) => {
        const qry = new Parse.Query('Content_Article');
        qry.equalTo('categories', Actinium.Object.pointer('Taxonomy', category.objectId));
        const count = await qry.count({ useMasterKey: true });

        return {
            ...category,
            count
        };
    })
);
```

---

## Best Practices

### Taxonomy Structure

1. **Use Types for Namespaces** - Create separate types for different classification systems (Category vs Tag vs Topic)
2. **Unique Slugs Per Type** - Ensure taxonomy slugs are unique within their type (not enforced)
3. **Consistent Naming** - Use lowercase slugs, proper-case names
4. **Field Name Convention** - Match taxonomy field names to type slugs (`categories` field for `category` type)

### Content Integration

1. **Auto-Populate on Retrieve** - Use `content-retrieve` hook (built-in) to include taxonomies
2. **Attach via Content.save** - Use `pending: true` pattern instead of manual `attach()` calls
3. **Validate Taxonomies Exist** - Check taxonomy exists before attaching to avoid errors
4. **Cleanup on Type Delete** - Implement hooks to handle taxonomy cleanup when content type deleted

### Performance

1. **Relation Queries Are Expensive** - Each taxonomy field requires separate relation query
2. **Cache Taxonomy Lists** - Taxonomy types and terms change infrequently, cache aggressively
3. **Limit Taxonomy Fields** - Don't create 10+ taxonomy fields per content type
4. **Use Pointers for Queries** - `equalTo('field', taxonomyObject)` faster than slug lookups

---

## Common Gotchas

### 1. **No Parent-Child Hierarchy Support**

**Issue:** Taxonomy system is FLAT; no built-in parent-child relationships

```javascript
// This does NOT work:
const javascript = await Taxonomy.create({
    name: 'JavaScript',
    parent: techCategory  // No parent field
});
```

**Workaround:** Add custom `parent` pointer field to Taxonomy schema

```javascript
Actinium.Collection.register('Taxonomy', {}, {
    parent: { type: 'Pointer', targetClass: 'Taxonomy', required: false }
});

// Then implement recursive retrieval logic
```

---

### 2. **Taxonomy Fields Can't Be Saved Directly**

**Issue:** Parse Relations can't be set via `.set()` method

```javascript
// This throws error:
const content = new Parse.Object('Content_Article');
content.set('categories', [taxonomy1, taxonomy2]);  // Invalid
await content.save();
```

**Solution:** Use `pending: true` pattern with `Content.save()` or `Taxonomy.Content.attach()`

```javascript
// Correct:
await Actinium.Taxonomy.Content.attach({
    content,
    field: 'categories',
    type: 'category',
    slug: 'blog'
});
```

---

### 3. **content-retrieve Hook Adds Taxonomies Automatically**

**Issue:** Taxonomy data merged into content object even if not requested

```javascript
const article = await Actinium.Content.retrieve({ type, slug });

// article.categories exists even if you didn't ask for it
```

**Impact:** Extra relation queries on EVERY content retrieval

**Workaround:** Implement custom content retrieval without hook or conditionally skip taxonomy retrieval

---

### 4. **Taxonomy Type Deletion Cascades**

**Issue:** Deleting Type_taxonomy deletes ALL associated taxonomies

```javascript
await Actinium.Taxonomy.Type.delete({ slug: 'category' });

// ALL taxonomies of type 'category' are deleted via hook
```

**No Undo:** Cascade delete via `taxonomy-type-after-delete` hook has no confirmation

**Source:** `actinium-taxonomy/plugin.js:383-391`

---

### 5. **Slug Uniqueness NOT Enforced**

**Issue:** Type slugs are validated unique on create, but taxonomy slugs are NOT enforced

```javascript
// Both succeed (duplicate slugs allowed):
await Taxonomy.create({ name: 'Blog', slug: 'blog', type: 'category' });
await Taxonomy.create({ name: 'Blog 2', slug: 'blog', type: 'category' });
```

**Impact:** `Taxonomy.retrieve({ type, slug })` returns first match only

**Best Practice:** Implement client-side uniqueness check before creation

---

### 6. **outputType Parameter Inconsistent**

**Issue:** `outputType` can be set on Type, Taxonomy, and query params

```javascript
// outputType can be set in three places:
const type = await Taxonomy.Type.create({
    outputType: 'OBJECT'  // 1. Type default
});

const tax = await Taxonomy.create({
    type,
    outputType: 'JSON'    // 2. Taxonomy override
});

const result = await Taxonomy.retrieve({
    type,
    slug: 'blog',
    outputType: 'OBJECT'  // 3. Query param override
});
```

**Precedence:** Query param > Taxonomy > Type

**Impact:** Unclear which outputType will be used

---

### 7. **Relation Count Queries Before Fetch**

**Issue:** `Taxonomy.Content.retrieve()` counts relation before fetching (two queries per field)

```javascript
// For each taxonomy field:
const count = await rel.query().count();  // Query 1
const items = await rel.query().limit(count).find();  // Query 2
```

**Performance:** N+1 query problem for N taxonomy fields

**Alternative:** Use `limit(1000)` without count if you know max taxonomies

**Source:** `actinium-taxonomy/sdk.js:309-319`

---

## Integration Points

### Content Type System

- Taxonomy field type registered via `content-schema-field-types` hook
- Creates `Relation<Taxonomy>` fields on content collections
- `content-retrieve` hook auto-populates taxonomy data

**See:** `/home/john/reactium-framework/CLAUDE/CONTENT_TYPE_SYSTEM.md`

---

### Collection Registration

- Taxonomy and Type_taxonomy collections registered with capabilities
- Capability model: `Taxonomy.create/retrieve/update/delete/addField`
- Default allowed roles: `moderator`, `contributor`

**See:** `/home/john/reactium-framework/CLAUDE/COLLECTION_REGISTRATION.md`

---

### Route System (Actinium Admin)

- Plugin routes registered for admin UI on start/activate/update
- Routes deleted on deactivate

**See:** `/home/john/reactium-framework/CLAUDE/ACTINIUM_ROUTE_SYSTEM.md`

---

## Testing Strategies

### Test Type CRUD

```javascript
const type = await Actinium.Taxonomy.Type.create({
    name: 'Test Type',
    slug: 'test-type'
}, { useMasterKey: true });

assert(type.get('slug') === 'test-type');

// Test uniqueness validation
try {
    await Actinium.Taxonomy.Type.create({
        name: 'Duplicate',
        slug: 'test-type'
    }, { useMasterKey: true });
    assert.fail('Should throw');
} catch (err) {
    assert(err.includes('slug must be unique'));
}
```

---

### Test Content Attachment

```javascript
const content = await Actinium.Content.create({
    type: { machineName: 'Article' },
    title: 'Test'
}, { useMasterKey: true });

await Actinium.Taxonomy.Content.attach({
    content,
    field: 'categories',
    type: 'category',
    slug: 'blog'
}, { useMasterKey: true });

const taxonomies = await Actinium.Taxonomy.Content.retrieve({
    content
}, { useMasterKey: true });

assert(taxonomies.categories.length === 1);
assert(taxonomies.categories[0].slug === 'blog');
```

---

### Test Cascade Delete

```javascript
const type = await Actinium.Taxonomy.Type.create({ name: 'Test', slug: 'test' });
const tax = await Actinium.Taxonomy.create({ name: 'Child', slug: 'child', type: 'test' });

await Actinium.Taxonomy.Type.delete({ slug: 'test' }, { useMasterKey: true });

// Verify taxonomy deleted
const lookup = await Actinium.Taxonomy.retrieve({ type: 'test', slug: 'child' }, { useMasterKey: true });
assert(!lookup);
```

---

## Comparison with WordPress Taxonomies

| Feature | Actinium Taxonomy | WordPress Taxonomy |
|---------|------------------|-------------------|
| **Hierarchical** | ✗ (flat) | ✓ (categories) |
| **Many-to-Many** | ✓ | ✓ |
| **Custom Types** | ✓ | ✓ |
| **Meta Fields** | ✗ | ✓ (term meta) |
| **Slug Enforcement** | ✗ (types only) | ✓ |
| **Query by Taxonomy** | ✓ (relation) | ✓ (tax_query) |
| **Auto-Populate** | ✓ (hook) | ✓ (WP_Query) |

**When to Use Actinium Taxonomy:**
- Simple category/tag classification
- Many-to-many content relationships
- Parse Relation-based architecture preferred

**When to Extend:**
- Need hierarchical categories (add custom parent field)
- Need term metadata (add custom fields to Taxonomy schema)
- Need slug uniqueness (implement validation hook)

---

## Summary

The Actinium Taxonomy system provides a **WordPress-inspired classification architecture** with Parse Relations:

1. **Two-Level Hierarchy** - Type_taxonomy contains Taxonomies
2. **Many-to-Many Relations** - Content can have multiple taxonomies per field
3. **Hook-Extensible CRUD** - All operations trigger hooks for customization
4. **Content Type Integration** - Taxonomy field type with automatic retrieval
5. **Default Installation** - Category/Tag types with Blog/Featured terms

**Critical for:** Content organization, categorization, tagging, SEO-friendly URLs, navigation systems

**Limitations:** No parent-child hierarchies, no term metadata, no slug uniqueness enforcement, N+1 query problem on retrieval
