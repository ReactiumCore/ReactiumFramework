# Pagination Strategies

<!-- v1.0.0 -->

**Complete guide to pagination patterns in Actinium/Reactium framework: skip-based, load-all, and cursor-based approaches**

---

## Overview

Pagination is critical for handling large datasets in Actinium applications. The framework provides **skip-based pagination** patterns in `hookedQuery` and various SDK methods, but understanding when and how to implement **cursor-based pagination** is essential for scalable production applications.

**Key Files**:
- `actinium-core/lib/utils/hookedQuery.js:1-167` - Unified pagination utility
- `actinium-content/sdk.js:55-145` - Skip-based content pagination
- `actinium-search/sdk.js:17-37` - Load-all pattern example
- `actinium-recycle/sdk.js:73-90` - Page-based retrieval pattern

---

## Pagination Patterns

### 1. Skip-Based Pagination (Framework Default)

**When to use**: Small to medium datasets (< 10,000 records), standard CRUD operations

**How it works**: Uses Parse Query `skip(offset)` and `limit(pageSize)` methods

**Performance**: Degrades significantly at high skip values (MongoDB must scan all skipped documents)

#### Example: Standard Page/Limit Pattern

```javascript
// actinium-content/sdk.js:116-145
const count = await qry.count(options);
let limit = op.get(params, 'limit', 50);
limit = Math.min(limit, 100);

const pages = Math.ceil(count / limit);
let page = op.get(params, 'page', 1);
page = Math.min(page, pages);

const index = page * limit - limit;
qry.skip(index);  // ❌ Performance degrades with high page numbers
qry.limit(limit);

const results = await qry.find(options);

return {
    count,
    page,
    pages,
    limit,
    index,
    results,
};
```

**Source**: `actinium-content/sdk.js:116-145`

#### Example: HookedQuery Utility

```javascript
// actinium-core/lib/utils/hookedQuery.js:32-120
const result = await Actinium.Utils.hookedQuery(
    {
        page: 2,       // Page number (1-indexed)
        limit: 50,     // Items per page
        orderBy: 'createdAt',
        order: 'descending'
    },
    options,
    'MyCollection',
    'my-query-hook',      // Hook to modify query
    'my-output-hook'      // Hook to modify results
);

// Returns:
// {
//     count: 500,        // Total items
//     page: 2,           // Current page
//     pages: 10,         // Total pages
//     limit: 50,
//     prev: 1,           // Previous page number
//     next: 3,           // Next page number
//     results: [...]     // Array or object indexed by id
// }
```

**Key Parameters**:
- `page: -1` → Load ALL pages (see Load-All Pattern below)
- `resultsAs: 'OBJECT'` → Index results by `id` field
- `resultsAs: 'ARRAY'` → Return array of results

**Source**: `actinium-core/lib/utils/hookedQuery.js:22-167`

---

### 2. Load-All Pattern (Skip Incrementation)

**When to use**: Need all records, not paginating for users (e.g., indexing, batch processing)

**How it works**: Loop with `skip(currentLength)` until no results returned

**Performance**: Better than skip(10000) but still not ideal for massive datasets

#### Example: Search Indexing

```javascript
// actinium-search/sdk.js:17-37
const qry = new Parse.Query(collection);
let results = await qry.find(options);
let items = [];

while (results.length > 0) {
    for (let item of results) {
        items.push(item);
    }

    qry.skip(items.length);  // Increment skip by total loaded
    results = await qry.find(options);
}

// items now contains ALL records
```

**Source**: `actinium-search/sdk.js:17-37`

#### Example: HookedQuery Load-All

```javascript
// actinium-core/lib/utils/hookedQuery.js:107-120
const result = await Actinium.Utils.hookedQuery(
    {
        page: -1,      // ← Load all pages
        limit: 100,    // Batch size
    },
    options,
    'MyCollection'
);

// Returns ALL results in result.results
```

**How it works internally**:
```javascript
// actinium-core/lib/utils/hookedQuery.js:107-120
let skip = page < 1 ? 0 : page * limit - limit;
let results = await qry.skip(skip).limit(limit).find(options);

while (results.length > 0) {
    resp.results = _.flatten([resp.results, results]);

    if (page < 1) {
        skip += limit;
        results = await qry.skip(skip).limit(limit).find(options);
    } else {
        results = [];  // Single page only
    }
}
```

**Source**: `actinium-core/lib/utils/hookedQuery.js:107-120`

---

### 3. Cursor-Based Pagination (Recommended for Scale)

**When to use**: Large datasets (> 10,000 records), high-traffic pagination, infinite scroll

**How it works**: Uses field values (e.g., `createdAt`, `objectId`) as cursors instead of skip offsets

**Performance**: O(1) query time regardless of page depth

**Status**: ⚠️ **Not implemented in framework** - Must be manually implemented

#### Why Cursor-Based is Better

**Skip-based problem**:
```javascript
// Page 1000 with limit 50
qry.skip(50000).limit(50);
// ❌ MongoDB scans 50,000 documents to skip them
// ❌ Query time: ~5-10 seconds on large collections
```

**Cursor-based solution**:
```javascript
// After page 1 (got last createdAt + objectId)
qry.greaterThan('createdAt', lastSeenDate).limit(50);
// ✅ MongoDB uses index, finds next 50 immediately
// ✅ Query time: ~50-100ms regardless of dataset size
```

#### Implementation Pattern: Forward Pagination

```javascript
/**
 * Cursor-based pagination for large datasets
 * Uses createdAt + objectId for stable ordering
 */
async function paginateForward(params, options) {
    const limit = Math.min(op.get(params, 'limit', 50), 100);
    const lastCursor = op.get(params, 'cursor'); // { createdAt, objectId }

    const qry = new Parse.Query('Content_article');
    qry.descending('createdAt');
    qry.addDescending('objectId');  // Tiebreaker for same timestamps

    // Apply cursor if provided
    if (lastCursor) {
        const { createdAt, objectId } = lastCursor;

        // Get records created AFTER last seen
        qry.greaterThan('createdAt', new Date(createdAt));

        // OR created at same time but with higher objectId
        const sameDateQuery = new Parse.Query('Content_article');
        sameDateQuery.equalTo('createdAt', new Date(createdAt));
        sameDateQuery.greaterThan('objectId', objectId);

        // Combine with OR
        const combinedQuery = Parse.Query.or(qry, sameDateQuery);
        qry = combinedQuery;
    }

    qry.limit(limit + 1);  // Fetch one extra to detect hasMore
    const results = await qry.find(options);

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    // Build next cursor from last item
    let nextCursor = null;
    if (hasMore && items.length > 0) {
        const lastItem = items[items.length - 1];
        nextCursor = {
            createdAt: lastItem.get('createdAt').toISOString(),
            objectId: lastItem.id
        };
    }

    return {
        results: items.map(item => Actinium.Utils.serialize(item)),
        cursor: nextCursor,
        hasMore,
        limit
    };
}
```

**Usage**:
```javascript
// First page
const page1 = await paginateForward({}, options);
// Returns: { results: [...], cursor: {...}, hasMore: true }

// Next page
const page2 = await paginateForward({ cursor: page1.cursor }, options);
// Returns: { results: [...], cursor: {...}, hasMore: true }
```

#### Implementation Pattern: Bidirectional Pagination

```javascript
/**
 * Cursor-based pagination with prev/next support
 */
async function paginateBidirectional(params, options) {
    const limit = Math.min(op.get(params, 'limit', 50), 100);
    const cursor = op.get(params, 'cursor');
    const direction = op.get(params, 'direction', 'forward'); // 'forward' or 'backward'

    const qry = new Parse.Query('Content_article');

    if (direction === 'forward') {
        qry.descending('createdAt');
        qry.addDescending('objectId');

        if (cursor) {
            qry.greaterThan('createdAt', new Date(cursor.createdAt));
        }
    } else {
        // Backward = ascending order (reverse)
        qry.ascending('createdAt');
        qry.addAscending('objectId');

        if (cursor) {
            qry.lessThan('createdAt', new Date(cursor.createdAt));
        }
    }

    qry.limit(limit + 1);
    let results = await qry.find(options);

    // If going backward, reverse results to maintain descending order
    if (direction === 'backward') {
        results = results.reverse();
    }

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    return {
        results: items.map(item => Actinium.Utils.serialize(item)),
        nextCursor: hasMore ? buildCursor(items[items.length - 1]) : null,
        prevCursor: items.length > 0 ? buildCursor(items[0]) : null,
        hasMore,
        hasPrev: !!cursor
    };
}

function buildCursor(item) {
    return {
        createdAt: item.get('createdAt').toISOString(),
        objectId: item.id
    };
}
```

#### Edge Cases and Gotchas

**1. Records with Identical Timestamps**

Use `objectId` as tiebreaker:
```javascript
qry.descending('createdAt');
qry.addDescending('objectId');  // ✅ Ensures stable ordering

// NOT just:
qry.descending('createdAt');  // ❌ Non-deterministic for same timestamp
```

**2. Records Deleted Mid-Pagination**

Cursor-based pagination handles deletions gracefully:
```javascript
// User deleted item at cursor position
// → Next query simply starts from next available item
// ✅ No gap in results, no duplicate items
```

Skip-based fails:
```javascript
// User on page 2, item deleted from page 1
// → Page 2 now shows item that was on page 3
// ❌ User sees duplicate when going to "next" page
```

**3. Cursor Encoding**

Encode cursors for URL safety:
```javascript
function encodeCursor(cursor) {
    return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

function decodeCursor(encoded) {
    return JSON.parse(Buffer.from(encoded, 'base64').toString());
}

// Usage in API:
const cursor = encodeCursor({ createdAt: '2025-01-01', objectId: 'xyz' });
// Returns: "eyJjcmVhdGVkQXQiOiIyMDI1LTAxLTAxIiwib2JqZWN0SWQiOiJ4eXoifQ=="
```

**4. Integration with HookedQuery**

Cursor-based pagination **cannot** use `hookedQuery` utility (skip-based only). Implement as custom cloud function:

```javascript
// actinium-content/plugin.js
Actinium.Cloud.define('MY_PLUGIN', 'content-paginate-cursor', async (req) => {
    const options = Actinium.Utils.CloudRunOptions(req);

    // Custom cursor-based implementation
    return await paginateForward(req.params, options);
});
```

---

## Performance Comparison

| Pattern | Dataset Size | Query Time | Use Case |
|---------|--------------|------------|----------|
| Skip-based | < 1,000 | 10-50ms | Small datasets, admin panels |
| Skip-based | 10,000 (page 100) | 500ms-2s | Acceptable for occasional deep pagination |
| Skip-based | 100,000 (page 1000) | 5-15s | ❌ Unacceptable |
| Load-all | Any size | O(n) | Batch processing, indexing |
| Cursor-based | Any size | 10-50ms | ✅ Production infinite scroll, APIs |

**Source**: Based on MongoDB performance characteristics with indexed queries

---

## Best Practices

### When to Use Skip-Based Pagination

✅ **Good Use Cases**:
- Admin panels with < 10,000 total records
- Page numbers required (e.g., "Page 5 of 20")
- Jumping to arbitrary pages
- Internal tools with low traffic

❌ **Bad Use Cases**:
- Public-facing infinite scroll
- Large datasets (> 10,000 records)
- High-traffic APIs
- Mobile apps (poor network performance)

### When to Use Cursor-Based Pagination

✅ **Good Use Cases**:
- Infinite scroll UIs
- Large datasets (> 10,000 records)
- High-traffic public APIs
- Mobile apps
- Social feeds, activity streams
- Real-time data (cursors handle inserts/deletes gracefully)

❌ **Bad Use Cases**:
- Need to display "Page X of Y"
- Need to jump to arbitrary pages
- Sorting by user-selected fields (cursor must match sort field)

### When to Use Load-All Pattern

✅ **Good Use Cases**:
- Batch processing jobs
- Search indexing
- Data exports
- Cache warming
- Analytics calculations

❌ **Bad Use Cases**:
- User-facing pagination (use skip-based or cursor-based)
- Real-time APIs (too slow)
- Datasets > 100,000 (use cursor-based batching instead)

---

## Common Gotchas

### 1. HookedQuery `page: -1` Loads Everything

```javascript
// ❌ DANGER: Loads all 100,000 records into memory
const result = await Actinium.Utils.hookedQuery(
    { page: -1 },
    options,
    'Content_article'
);
// → Memory: 500MB+
// → Time: 30-60 seconds
```

**Fix**: Use cursor-based pagination or limit results:
```javascript
// ✅ Safe: Batched processing
let skip = 0;
const limit = 100;
let hasMore = true;

while (hasMore) {
    const batch = await Actinium.Utils.hookedQuery(
        { page: Math.floor(skip / limit) + 1, limit },
        options,
        'Content_article'
    );

    await processBatch(batch.results);

    skip += limit;
    hasMore = batch.next !== undefined;
}
```

### 2. Skip Performance Degrades Silently

```javascript
// Works fine in dev (100 records)
qry.skip(page * 50).limit(50);

// ❌ Fails in prod (100,000 records, page 500)
// → 5-10 second queries
// → Database CPU spikes
// → Timeouts
```

**Fix**: Monitor query performance, switch to cursor-based when dataset grows

### 3. Cursor Must Match Sort Order

```javascript
// ❌ WRONG: Sorting by title, but cursor uses createdAt
qry.ascending('title');
qry.greaterThan('createdAt', cursor.createdAt);
// → Results out of order, duplicates possible

// ✅ CORRECT: Cursor matches sort field
qry.ascending('title');
qry.greaterThan('title', cursor.title);
qry.addGreaterThan('objectId', cursor.objectId); // Tiebreaker
```

### 4. Date Range Queries != Cursor Pagination

```javascript
// actinium-pulse/plugin.js:48-59 - Date range cleanup, NOT pagination
const date = moment().subtract(1, 'days').toDate();
const qry = new Parse.Query(COLLECTION);
qry.lessThan('createdAt', date);  // ✅ Range query (delete old records)

// This is NOT cursor-based pagination (no incremental loading)
```

**Source**: `actinium-pulse/plugin.js:48-59`

---

## Integration with Framework Hooks

### Cursor Pagination in HookedQuery (Custom)

Since `hookedQuery` doesn't support cursor pagination, extend it via custom hook:

```javascript
// Custom pagination hook
Actinium.Hook.register('content-query', async ({ query, params }) => {
    const useCursor = op.get(params, 'useCursor', false);

    if (useCursor) {
        const cursor = op.get(params, 'cursor');
        if (cursor) {
            query.greaterThan('createdAt', new Date(cursor.createdAt));
            query.greaterThan('objectId', cursor.objectId);
        }

        // Override default skip/limit logic
        query.limit(op.get(params, 'limit', 50) + 1);
    }
});
```

---

## Real-World Examples

### Example 1: Content List with Skip-Based Pagination

```javascript
// actinium-content/sdk.js:55-145 - Production content finder
const result = await Actinium.Content.find(
    {
        type: 'article',
        status: 'PUBLISHED',
        page: 2,
        limit: 20
    },
    options
);

// Returns:
// {
//     count: 500,
//     page: 2,
//     pages: 25,
//     limit: 20,
//     index: 20,
//     results: [...]
// }
```

**Source**: `actinium-content/sdk.js:55-145`

### Example 2: Recycle Bin with Page-Based Retrieval

```javascript
// actinium-recycle/sdk.js:73-90 - Load all recycled items
const retrieveAll = async (params = {}, options) => {
    let results = [];
    let page = op.get(params, 'page', 1);

    let list = await retrieve(params, options);
    const { pages } = list;

    results = results.concat(list.results);

    while (page < pages) {
        page += 1;
        op.set(params, 'page', page);
        list = await retrieve(params, options);
        results = results.concat(list.results);
    }

    return { count: results.length, page: 1, pages: 1, results };
};
```

**Source**: `actinium-recycle/sdk.js:73-90`

### Example 3: Search Indexing with Load-All

```javascript
// actinium-search/sdk.js:17-37 - Index all content
const qry = new Parse.Query(collection);
let results = await qry.find(options);
let items = [];

while (results.length > 0) {
    for (let item of results) {
        item = Actinium.Utils.serialize(item);
        await Actinium.Hook.run('search-index-item-normalize', item, params);
        items.push(item);
    }

    qry.skip(items.length);
    results = await qry.find(options);
}

await Actinium.Hook.run('search-index', items, params);
```

**Source**: `actinium-search/sdk.js:17-37`

---

## Summary

| Requirement | Recommended Pattern |
|-------------|---------------------|
| Admin panel, < 10K records | Skip-based (hookedQuery) |
| Public API, large dataset | Cursor-based (custom) |
| Batch processing | Load-all pattern (page: -1) |
| Infinite scroll | Cursor-based (custom) |
| "Page X of Y" display | Skip-based (hookedQuery) |
| High performance required | Cursor-based (custom) |

**Framework Support**:
- ✅ Skip-based: Built-in via `hookedQuery` and SDK methods
- ❌ Cursor-based: Not built-in, implement manually (see examples above)
- ✅ Load-all: Built-in via `hookedQuery({ page: -1 })`

**Key Takeaway**: For datasets > 10,000 records with public-facing pagination, implement cursor-based pagination as a custom cloud function. For everything else, use the built-in `hookedQuery` utility.
