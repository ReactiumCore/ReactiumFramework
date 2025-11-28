<!-- v1.0.0 -->

# Actinium Search and Indexing System

**Complete hook-driven search architecture with pluggable indexers**

---

## Overview

The Actinium Search system provides a **hook-extensible architecture** for content indexing and searching. It follows a **plugin pattern** where the core search framework handles content normalization while actual indexing/search implementations (like Lunr.js) are registered via hooks.

**Key Design Principles:**
- Hook-driven extensibility for custom search backends
- Content type-aware indexing with automatic RichText extraction
- Cron-based automatic reindexing with Pulse integration
- Threshold-based result filtering for quality control
- Default Lunr.js implementation for in-memory search

---

## Architecture

### Two-Plugin Pattern

1. **actinium-search** (Core Framework)
   - Provides `Actinium.Search.index()` and `Actinium.Search.search()` SDK
   - Handles content prefetching and normalization
   - Triggers hooks for actual indexing/search
   - Manages cron-based reindexing schedule

2. **actinium-search-lunr** (Lunr.js Implementation)
   - Listens to `search-index` and `search` hooks
   - Builds in-memory Lunr.js indexes
   - Performs full-text search with scoring

**Source References:**
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-search/sdk.js:1-130`
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-search/search-plugin.js:1-126`
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-search/search-lunr-plugin.js:1-96`

---

## SDK API

### Actinium.Search.index(params)

**Trigger indexing of a content type**

```javascript
await Actinium.Search.index({
    type: {
        objectId: 'abc123',          // OR
        uuid: 'uuid-string',         // OR
        machineName: 'Article'       // Any Type.retrieve params
    }
});
```

**Workflow:**

1. Fires `search-index-config` hook (can prevent indexing or disable prefetch)
2. If `indexConfig.prefetchItems === true`: Fetches all content from collection
3. For each item: Fires `search-index-item-normalize` hook (RichText → plaintext)
4. Fires `search-index` hook with normalized items (indexer plugins implement this)

**Source:** `actinium-search/sdk.js:6-50`

---

### Actinium.Search.search(req)

**Perform search query**

```javascript
const results = await Actinium.Search.search({
    params: {
        index: 'Content_Article',   // Collection name to search
        search: 'keyword phrase',    // Search terms
        page: 1,                     // Page number (default: 1)
        limit: 100,                  // Results per page (default: 1000, max: 1000)
        threshold: 0.5               // Minimum score (0-1, default: 0)
    }
});

// Returns:
// {
//     count: 42,
//     next: 2,
//     page: 1,
//     pages: 5,
//     prev: null,
//     results: [
//         { ...content, score: 0.85 },
//         { ...content, score: 0.72 }
//     ]
// }
```

**Workflow:**

1. Fires `search` hook (search plugin populates `context.results`)
2. Filters results by `threshold` (removes low-scoring matches)
3. Returns paginated result structure

**Source:** `actinium-search/sdk.js:51-58`

---

## Hook Integration

### search-index-config Hook

**Control indexing behavior before it starts**

```javascript
Actinium.Hook.register('search-index-config', async (indexConfig, params) => {
    // Prevent indexing for specific types
    if (params.type.machineName === 'Draft') {
        indexConfig.shouldIndex = false;
    }

    // Disable prefetch for large collections (custom fetch logic in search-index hook)
    if (params.type.machineName === 'BigData') {
        indexConfig.prefetchItems = false;
    }

    // Add custom config for your indexer
    indexConfig.customIndexerOption = 'value';
});
```

**Parameters:**
- `indexConfig` (object, mutate): `{ shouldIndex: true, prefetchItems: true, ...custom }`
- `params` (object): Original params passed to `Search.index()`

**Source:** `actinium-search/sdk.js:8`

---

### search-index-item-normalize Hook

**Transform content items before indexing**

```javascript
Actinium.Hook.register('search-index-item-normalize', async (item, params, type, permittedFields, indexConfig) => {
    // Extract plaintext from RichText fields (built-in handler)
    for (const [fieldName, fieldValue] of Object.entries(item)) {
        if (op.has(permittedFields, fieldName)) {
            const { fieldType } = op.get(permittedFields, fieldName);

            if (fieldType === 'RichText') {
                const children = op.get(fieldValue, 'children', []);
                const plaintext = _.chain(flatten({ children }, 'children'))
                    .pluck('text')
                    .compact()
                    .value()
                    .join(' ');

                item[fieldName] = plaintext; // Replace RichText with plaintext
            }
        }
    }

    // Custom transformations
    if (item.customField) {
        item.searchableCustom = extractSearchableText(item.customField);
    }
});
```

**Parameters:**
- `item` (object, mutate): Serialized content item to normalize
- `params` (object): Original params passed to `Search.index()`
- `type` (object): Content type object
- `permittedFields` (object): Field type information (currently empty object, legacy param)
- `indexConfig` (object): Final index configuration

**Built-In Normalization:**
- RichText fields: Extracts text from Slate.js children tree
- Uses `tree-flatten` to traverse nested structure
- Joins all text nodes with spaces

**Source:** `actinium-search/search-plugin.js:70-94`

---

### search-index Hook

**Implement actual indexing logic**

```javascript
Actinium.Hook.register('search-index', async (items, params, type, permittedFields, indexConfig) => {
    const { collection } = type;

    // Build Lunr.js index (example from built-in plugin)
    const builder = new lunr.Builder();
    builder.ref('slug');         // Document identifier
    builder.field('slug');       // Searchable field
    builder.field('title');      // Searchable field

    // Add all fields from content type
    Object.keys(permittedFields).forEach(field => builder.field(field));

    // Add documents
    for (const item of items) {
        builder.add(item);
    }

    // Store index in memory
    indexes[collection] = builder.build();
});
```

**Parameters:**
- `items` (array): Normalized items (empty if `indexConfig.prefetchItems === false`)
- `params` (object): Original params passed to `Search.index()`
- `type` (object): Content type object with `collection` property
- `permittedFields` (object): Field type information
- `indexConfig` (object): Final index configuration

**Source:** `actinium-search/search-lunr-plugin.js:25-44`

---

### search Hook

**Implement actual search query**

```javascript
Actinium.Hook.register('search', async (req, context) => {
    const index = op.get(req, 'params.index', '');    // Collection name
    const search = op.get(req, 'params.search', '');  // Search query
    const page = Math.max(op.get(req, 'params.page', 1), 1);
    const limit = Math.max(Math.min(op.get(req, 'params.limit', 1000), 1000), 1);

    if (!(index in indexes)) throw 'No such index';

    // Perform search
    const searchResult = indexes[index].search(search);

    // Paginate results
    const resultPages = _.chunk(searchResult, limit);
    const resultPage = op.get(resultPages, page - 1, []);
    const count = searchResult.length;

    // Fetch full content for results
    const bySlug = _.indexBy(resultPage, 'ref');
    const qry = new Parse.Query(index);
    qry.containedIn('slug', Object.keys(bySlug));

    const options = Actinium.Utils.CloudRunOptions(req);
    const results = _.sortBy(await qry.find(options))
        .map(item => ({
            ...Actinium.Utils.serialize(item),
            score: bySlug[item.get('slug')].score  // Attach relevance score
        }), 'score')
        .reverse();

    // Populate context (Search.search will filter by threshold)
    context.results = {
        count,
        next: page + 1 <= pages ? page + 1 : null,
        page,
        pages: Math.ceil(count / limit),
        prev: page - 1 > 0 && page <= pages ? page - 1 : null,
        results
    };
});
```

**Parameters:**
- `req` (object): Cloud request with `params.index`, `params.search`, `params.page`, `params.limit`
- `context` (object, mutate): Set `context.results` with search response

**Response Structure:**
```typescript
{
    count: number;       // Total results
    page: number;        // Current page
    pages: number;       // Total pages
    next: number | null; // Next page number
    prev: number | null; // Previous page number
    results: Array<{     // Content items with scores
        ...contentFields,
        score: number    // Relevance score (0-1)
    }>;
}
```

**Source:** `actinium-search/search-lunr-plugin.js:47-92`

---

## Automatic Reindexing

### Pulse-Based Cron Scheduling

```javascript
// On server start: Index all content types
Actinium.Hook.register('start', async () => {
    const options = Actinium.Utils.MasterOptions();
    const { types } = await Actinium.Type.list({}, options);

    INFO(chalk.cyan.bold('Indexing Content:'));
    for (const type of types) {
        INFO(' -', type.collection);
        await Actinium.Search.index({ type }, options);
    }

    // Schedule recurring reindex
    const schedule = await Actinium.Setting.get('index-frequency', '0 0 * * *');
    Actinium.Pulse.define('content-search-indexing', { schedule }, indexContent);
});

// Update schedule when setting changes
Actinium.Hook.register('setting-set', async (key) => {
    if (key === 'index-frequency') {
        const schedule = await Actinium.Setting.get('index-frequency', '0 0 * * *');
        Actinium.Pulse.replace('content-search-indexing', { schedule }, indexContent);
    }
});
```

**Default Schedule:** `0 0 * * *` (midnight every day)

**Configuration:** Update `index-frequency` setting with cron expression

**Source:** `actinium-search/search-plugin.js:28-68`

---

## Cloud Functions

### search-index Cloud Function

```javascript
// Trigger indexing (requires Search.index capability)
await Actinium.Cloud.run('search-index', {
    type: {
        machineName: 'Article'
    }
});
```

**Capability Required:** `Search.index`

**Source:** `actinium-search/search-plugin.js:103-108`

---

### search Cloud Function

```javascript
// Perform search (no capability required)
const results = await Actinium.Cloud.run('search', {
    index: 'Content_Article',
    search: 'reactium framework',
    page: 1,
    limit: 20,
    threshold: 0.3
});
```

**Source:** `actinium-search/search-plugin.js:120-122`

---

## Real-World Examples

### Example 1: Custom Search Backend (Elasticsearch)

```javascript
// Register Elasticsearch indexer
const indexes = new Map();

Actinium.Hook.register('search-index', async (items, params, type) => {
    if (!Actinium.Plugin.isActive('ElasticsearchSearch')) return;

    const { collection } = type;
    const client = getElasticsearchClient();

    // Create index
    await client.indices.create({
        index: collection.toLowerCase(),
        body: {
            mappings: {
                properties: {
                    slug: { type: 'keyword' },
                    title: { type: 'text' },
                    content: { type: 'text' }
                }
            }
        }
    });

    // Bulk index documents
    const body = items.flatMap(item => [
        { index: { _index: collection.toLowerCase(), _id: item.slug } },
        item
    ]);

    await client.bulk({ body });
});

Actinium.Hook.register('search', async (req, context) => {
    if (!Actinium.Plugin.isActive('ElasticsearchSearch')) return;

    const { index, search, page, limit } = req.params;
    const client = getElasticsearchClient();

    const { body } = await client.search({
        index: index.toLowerCase(),
        from: (page - 1) * limit,
        size: limit,
        body: {
            query: {
                multi_match: {
                    query: search,
                    fields: ['title^2', 'content']
                }
            }
        }
    });

    context.results = {
        count: body.hits.total.value,
        results: body.hits.hits.map(hit => ({
            ...hit._source,
            score: hit._score
        }))
    };
});
```

---

### Example 2: Search-Only Specific Fields

```javascript
// Limit indexing to specific fields for performance
Actinium.Hook.register('search-index-item-normalize', async (item, params, type) => {
    const searchableFields = ['title', 'summary', 'content'];

    // Remove non-searchable fields
    Object.keys(item).forEach(key => {
        if (!searchableFields.includes(key) && !['slug', 'objectId'].includes(key)) {
            delete item[key];
        }
    });
});
```

---

### Example 3: Type-Specific Indexing

```javascript
// Don't index draft or archived content
Actinium.Hook.register('search-index-config', async (indexConfig, params) => {
    const { type } = params;

    // Skip indexing for drafts
    if (type.machineName === 'Draft') {
        indexConfig.shouldIndex = false;
        return;
    }
});

// Filter items during normalization
Actinium.Hook.register('search-index-item-normalize', async (item, params, type) => {
    // Only index published content
    if (item.status !== 'PUBLISHED') {
        item._skipIndex = true;  // Custom flag
    }
});

Actinium.Hook.register('search-index', async (items, params, type) => {
    // Filter out skipped items
    items = items.filter(item => !item._skipIndex);

    // Continue with indexing...
});
```

---

### Example 4: Cursor-Based Large Collection Indexing

```javascript
// For very large collections, disable prefetch and implement cursor-based pagination
Actinium.Hook.register('search-index-config', async (indexConfig, params) => {
    const LARGE_THRESHOLD = 10000;
    const { type } = params;

    const count = await new Parse.Query(type.collection).count({ useMasterKey: true });

    if (count > LARGE_THRESHOLD) {
        indexConfig.prefetchItems = false;  // Don't prefetch
        indexConfig.useCursor = true;       // Custom flag
    }
});

Actinium.Hook.register('search-index', async (items, params, type, permittedFields, indexConfig) => {
    if (!indexConfig.useCursor) return;  // Use default prefetch logic

    const { collection } = type;
    const BATCH_SIZE = 1000;
    let skip = 0;

    while (true) {
        const qry = new Parse.Query(collection);
        qry.skip(skip).limit(BATCH_SIZE);

        const batch = await qry.find({ useMasterKey: true });
        if (batch.length === 0) break;

        // Normalize and index batch
        for (let item of batch) {
            item = Actinium.Utils.serialize(item);
            await Actinium.Hook.run('search-index-item-normalize', item, params, type, permittedFields, indexConfig);
            // Index item...
        }

        skip += BATCH_SIZE;
    }
});
```

---

## Best Practices

### Indexing Strategy

1. **Use Cron Scheduling** - Let automatic reindexing handle content updates
2. **Filter Early** - Use `search-index-config` to skip types that shouldn't be indexed
3. **Normalize Consistently** - Extract plaintext from RichText, HTML, Markdown in `search-index-item-normalize`
4. **Index Essential Fields Only** - Don't index every field, focus on searchable content
5. **Handle Large Collections** - Disable prefetch and implement cursor-based pagination for >10k items

### Search Implementation

1. **Set Reasonable Limits** - Cap `limit` parameter (default Lunr plugin uses max 1000)
2. **Use Thresholds** - Filter low-quality results with threshold parameter (e.g., 0.3)
3. **Score Results** - Always include relevance scores for ranking
4. **Paginate Results** - Return page/count/next/prev for client-side pagination
5. **Fetch Full Content** - Search plugins return objectIds/slugs, fetch full content with Parse Query

### Hook Priority

1. **Normalization Hooks** - Use default priority (0) for most normalizers
2. **Indexer Hooks** - Multiple indexers can coexist (Lunr + Elasticsearch)
3. **Check Plugin Active State** - Always check `Actinium.Plugin.isActive(PLUGIN.ID)` in hooks

---

## Common Gotchas

### 1. **Empty `permittedFields` Parameter**

**Issue:** The `permittedFields` parameter is currently an empty object

```javascript
// This doesn't work:
const { fieldType } = op.get(permittedFields, fieldName);  // undefined
```

**Workaround:** Access field types from `type.fields` directly or hardcode known field types

```javascript
// Better:
if (op.get(item, `${fieldName}.children`)) {  // RichText has children property
    // Extract plaintext
}
```

**Source:** `actinium-search/sdk.js:14` (commented out)

---

### 2. **Indexing Not Triggered on Content Save**

**Issue:** Search index is NOT automatically updated when content is saved

**Solution:** Manually trigger reindexing or implement `content-saved` hook

```javascript
Actinium.Hook.register('content-saved', async (content, typeObj) => {
    await Actinium.Search.index({ type: typeObj });
});
```

**Alternative:** Rely on cron-based automatic reindexing (default: midnight)

---

### 3. **Threshold Filtering Happens After Search Hook**

**Issue:** Search plugins must return ALL results; threshold filtering happens in `Search.search()`

```javascript
// Search hook runs first (returns 100 results)
Actinium.Hook.register('search', async (req, context) => {
    context.results = { results: [...100 items with scores...] };
});

// Then Search.search() filters by threshold
results = results.filter(({ score }) => score >= threshold);
```

**Impact:** Can't optimize search query based on threshold; must return all matches

---

### 4. **Index Storage Is Per-Plugin**

**Issue:** Built-in Lunr plugin stores indexes in memory (lost on restart)

```javascript
const indexes = {};  // Module-level variable, not persisted
```

**Solution:** Indexing runs on server start automatically

**Alternative:** Implement persistent indexing (Redis, Elasticsearch) in custom plugin

---

### 5. **No Built-In Autocomplete/Suggestions**

**Issue:** Search system doesn't provide autocomplete or "did you mean" features

**Solution:** Implement in custom search plugin using Lunr's wildcard queries or external service

```javascript
// Example wildcard search with Lunr
const results = index.search(`${search}*`);  // Prefix matching
```

---

### 6. **RichText Normalization Loses Formatting**

**Issue:** Extracting plaintext from RichText discards all formatting, links, etc.

**Impact:** Search results don't preserve rich content structure

**Alternative:** Index structured data for advanced search features

```javascript
// Store both plaintext and metadata
item.searchText = extractPlaintext(item.richTextField);
item.links = extractLinks(item.richTextField);
item.headings = extractHeadings(item.richTextField);
```

---

## Integration Points

### Content Type System

- Search indexes entire content type collections
- Uses `Type.retrieve()` to get collection name
- Relies on content type field definitions (though `permittedFields` param is empty)

**See:** `/home/john/reactium-framework/CLAUDE/CONTENT_TYPE_SYSTEM.md`

---

### Settings System

- `index-frequency` setting controls cron schedule (default: `0 0 * * *`)
- Anonymous group NOT configured (search settings require authentication)

**See:** `/home/john/reactium-framework/CLAUDE/ACTINIUM_SETTINGS_SYSTEM.md`

---

### Pulse System

- `content-search-indexing` pulse task handles automatic reindexing
- Schedule updated via `setting-set` hook

**See:** `/home/john/reactium-framework/CLAUDE/PULSE_SYSTEM.md`

---

### Capability System

- `Search.index` capability required for `search-index` cloud function
- `search` cloud function has NO capability requirement (public search)

**See:** `/home/john/reactium-framework/CLAUDE/ACTINIUM_CAPABILITIES_SYSTEM.md` (if exists, else ACTINIUM_FRAMEWORK.md)

---

## Performance Considerations

1. **In-Memory Indexes** - Default Lunr plugin stores indexes in RAM (fast but not scalable)
2. **Reindexing Cost** - Full reindex scans entire collection (use skip-based pagination for large datasets)
3. **Prefetch All Items** - Default behavior fetches all content into memory (disable for >10k items)
4. **Normalization Overhead** - `search-index-item-normalize` hook runs for EVERY item during indexing
5. **No Incremental Updates** - Full reindex required for any content change (implement custom incremental logic)

---

## Testing Strategies

### Test Indexing

```javascript
// Manually trigger indexing
const result = await Actinium.Cloud.run('search-index', {
    type: { machineName: 'Article' }
}, { useMasterKey: true });

// Verify hook was called
let indexCalled = false;
Actinium.Hook.register('search-index', async () => {
    indexCalled = true;
});
await Actinium.Search.index({ type });
assert(indexCalled);
```

---

### Test Search

```javascript
// Perform search
const results = await Actinium.Cloud.run('search', {
    index: 'Content_Article',
    search: 'test query',
    threshold: 0.5
});

assert(results.count >= 0);
assert(Array.isArray(results.results));
assert(results.results.every(item => item.score >= 0.5));
```

---

### Test RichText Normalization

```javascript
const item = {
    content: {
        children: [
            { text: 'Hello ' },
            { text: 'World', bold: true }
        ]
    }
};

await Actinium.Hook.run('search-index-item-normalize', item, {}, {}, {});

assert.equal(item.content, 'Hello World');  // Plaintext extracted
```

---

## Comparison with Alternatives

| Feature | Actinium Search | Parse Server Search | Elasticsearch | Algolia |
|---------|----------------|-------------------|---------------|---------|
| **Built-In** | ✓ (with Lunr) | ✗ | ✗ | ✗ |
| **Extensible** | ✓ (hook-based) | ✗ | ✓ (custom) | ✓ (custom) |
| **Real-Time** | ✗ (cron-based) | ✗ | ✓ | ✓ |
| **Scalable** | ✗ (in-memory) | ✗ | ✓ | ✓ |
| **Cost** | Free | Free | Infrastructure | SaaS |
| **Full-Text** | ✓ | Limited | ✓ | ✓ |
| **Faceting** | ✗ | ✗ | ✓ | ✓ |

**When to Use Actinium Search:**
- Small to medium content collections (<10k items)
- Simple full-text search requirements
- Budget constraints (no external services)
- Framework-integrated solution preferred

**When to Use External Search:**
- Large collections (>10k items)
- Real-time search updates required
- Advanced features needed (autocomplete, faceting, typo tolerance)
- Scalability is critical

---

## Summary

The Actinium Search system provides a **minimal, extensible foundation** for content search:

1. **Hook-Driven** - Core framework triggers hooks; plugins implement indexing/search
2. **Automatic Reindexing** - Pulse-based cron scheduling (default: midnight)
3. **RichText Normalization** - Built-in plaintext extraction for searchable content
4. **Default Lunr Implementation** - In-memory full-text search (good for small datasets)
5. **Pluggable Backends** - Replace Lunr with Elasticsearch, Algolia, etc. via hooks

**Critical for:** CMS search functionality, content discovery, simple full-text search

**Not suitable for:** Large datasets (>10k items), real-time search, advanced search features
