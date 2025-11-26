<!-- v1.0.0 -->

# Parse Server Query Patterns and Performance

> **Purpose**: Comprehensive guide to Parse.Query construction, optimization, and performance patterns in Actinium/Reactium applications

**Source**: actinium-core/lib/utils/hookedQuery.js:1-167, actinium-content/sdk.js:55-145, actinium-users/plugin.js:87-102, actinium-core/lib/utils/acl.js:83-130, actinium-taxonomy/plugin.js:216-320

---

## Architecture Overview

Parse queries are the primary data access mechanism in Actinium applications. The framework provides several patterns:

1. **Direct Query Construction** - Manual Parse.Query creation
2. **HookedQuery Pattern** - Hook-extensible paginated queries
3. **Compound Queries** - OR/AND queries with Parse.Query.or()
4. **Cached Queries** - Memory-cached query results via Actinium.Cache

---

## Core Query Construction

### Basic Query Pattern

```javascript
// actinium-content/sdk.js:57-62
const qry = new Actinium.Query('Content');

// Filter by UUID array
let uuids = op.get(params, 'uuid');
uuids = this.utils.stringToArray(uuids);
if (uuids.length > 0) qry.containedIn('uuid', uuids);

// Filter by objectId array
let oids = op.get(params, 'objectId');
oids = this.utils.stringToArray(oids);
if (oids.length > 0) qry.containedIn('objectId', oids);
```

**Source**: actinium-content/sdk.js:57-67

### Query Constraints Reference

**Supported Methods** (actinium-core/lib/utils/hookedQuery.js:61-83):

```javascript
const queryWhitelist = [
    'containedBy',
    'containedIn',      // objectId in array
    'contains',         // string contains substring
    'containsAll',      // array contains all values
    'containsAllStartingWith',
    'descending',       // sort order
    'doesNotExist',     // field is undefined
    'endsWith',         // string suffix match
    'equalTo',          // exact match
    'exclude',          // omit fields from result
    'greaterThan',      // numeric/date comparison
    'greaterThanOrEqualTo',
    'include',          // fetch pointer references
    'includeAll',       // fetch all pointers
    'lessThan',         // numeric/date comparison
    'lessThanOrEqualTo',
    'matches',          // regex match
    'notContainedIn',   // objectId not in array
    'notEqualTo',       // not equal
    'select',           // return only specified fields
    'startsWith',       // string prefix match
];
```

### Regex Pattern Matching

```javascript
// actinium-content/sdk.js:70-74
let title = op.get(params, 'title');
if (_.isString(title)) {
    this.utils.assertSearchLength(title); // minimum 4 chars
    qry.matches('title', new RegExp(title, 'gi')); // case-insensitive
}
```

**Source**: actinium-content/sdk.js:70-74

---

## Pointer Optimization with include()

### Include Pointers for Efficient Queries

**Pattern**: Use `include()` to fetch related objects in single query (prevents N+1 queries)

```javascript
// actinium-content/sdk.js:131-132
qry.include('type');  // Fetch related Type object
qry.include('user');  // Fetch related User object

const results = await qry.find(options);
// results now contain fully hydrated type and user objects
```

**Source**: actinium-content/sdk.js:131-135

**When to use**:
- Always include pointers you'll access in results
- Reduces round trips from N+1 to 1
- Critical for list views displaying pointer data

**When NOT to use**:
- Large nested objects (use select() to limit fields)
- Pointers you don't need in the result

---

## Field Selection with select()

### Limit Returned Fields for Performance

```javascript
// Hypothetical example based on queryWhitelist
qry.select('objectId', 'title', 'status', 'updatedAt');
// Only these fields returned, reducing payload size
```

**Use cases**:
- List views needing only summary data
- Large documents with many fields
- Mobile/bandwidth-constrained clients

**Gotcha**: Cannot access non-selected fields (returns undefined)

---

## Compound Queries (OR Queries)

### Parse.Query.or() Pattern

**Pattern**: Search across multiple fields with OR logic

```javascript
// actinium-core/lib/utils/acl.js:86-97
if (search) {
    const regex = new RegExp(search, 'gi');
    const fields = ['username', 'email', 'fname', 'lname'];

    // Create separate query for each field
    const queries = fields.map((fld) =>
        new Parse.Query('_User').matches(fld, regex),
    );

    // Combine with OR
    qry = Parse.Query.or(...queries);
}
```

**Source**: actinium-core/lib/utils/acl.js:86-97

**Performance Note**: OR queries are more expensive than single-field queries. Use sparingly.

---

## Pagination Patterns

### Skip/Limit Pagination (Standard)

```javascript
// actinium-content/sdk.js:117-129
const count = await qry.count(options);
let limit = op.get(params, 'limit', 50);
limit = Math.min(limit, 100); // cap at 100

const pages = Math.ceil(count / limit);

let page = op.get(params, 'page', 1);
page = Math.min(page, pages);
page = Math.max(page, 1);

const index = page * limit - limit;
qry.skip(index);
qry.limit(limit);

const results = await qry.find(options);
```

**Source**: actinium-content/sdk.js:117-135

**Characteristics**:
- Simple to implement
- Works well for small-to-medium datasets
- Performance degrades with large skip values (MongoDB limitation)

### Load-All-Pages Pattern (HookedQuery)

```javascript
// actinium-core/lib/utils/hookedQuery.js:101-120
let skip = page < 1 ? 0 : page * limit - limit;

// Execute first query
let results = await qry.skip(skip).limit(limit).find(options);

// Loop until no more results (page < 1 means load all)
while (results.length > 0) {
    op.set(resp, [resultsKey], _.flatten([resp[resultsKey], results]));

    if (page < 1) {
        skip += limit;
        results = await qry.skip(skip).limit(limit).find(options);
    } else {
        results = [];
    }
}
```

**Source**: actinium-core/lib/utils/hookedQuery.js:101-120

**Use case**: Admin interfaces needing all records (roles, settings, etc.)

**Warning**: Only use for bounded datasets (< 10,000 records)

---

## HookedQuery Pattern (Hook-Extensible Queries)

### Architecture

HookedQuery provides:
1. Standardized pagination
2. Hook points for query modification
3. Hook points for output transformation
4. Automatic serialization

**Signature** (actinium-core/lib/utils/hookedQuery.js:22-31):

```javascript
hookedQuery(
    params = {},
    options = {},
    collection,
    queryHook = 'hooked-query-query',
    outputHook = 'hooked-query-output',
    resultsKey = 'results',
    resultsAs = 'OBJECT',
    req,
)
```

### Hook Integration Points

```javascript
// 1. Query modification hook (before count/find)
await Actinium.Hook.run(queryHook, qry, params, options, collection, req);

// 2. Output transformation hook (after find, before serialization)
await Actinium.Hook.run(
    outputHook,
    resp,
    params,
    options,
    collection,
    resultsKey,
    resultsAs,
    req,
);
```

**Source**: actinium-core/lib/utils/hookedQuery.js:58, 146-155

**Use case**: Plugin-extensible queries (content system, taxonomy, etc.)

### Standardized Query Params

HookedQuery supports `queryParams` array for declarative query building:

```javascript
// actinium-core/lib/utils/hookedQuery.js:84-93
const queryParams = Array.from(op.get(params, 'queryParams', []));
if (queryParams.length > 0) {
    queryParams.forEach(({ method, params = [] }) => {
        if (queryWhitelist.includes(method)) {
            qry[method](...params);
        }
    });
}
```

**Example**:

```javascript
Actinium.Cloud.run('some-hooked-query', {
    limit: 50,
    page: 1,
    queryParams: [
        { method: 'equalTo', params: ['status', 'PUBLISHED'] },
        { method: 'include', params: ['author'] },
        { method: 'descending', params: ['publishedAt'] },
    ],
});
```

---

## Caching Strategies

### Actinium.Cache Pattern

**Cache Implementation**: Memory-cache with object-path support

```javascript
// actinium-core/lib/cache.js:16-40
cache.get = (key, defaultValue) => {
    // Supports dot notation: cache.get('roles.super-admin')
    // Supports array paths: cache.get(['roles', 'super-admin'])
    // Returns all cache if no key: cache.get()
};

cache.set = (key, value, ttl) => {
    // TTL in milliseconds (optional)
};
```

**Source**: actinium-core/lib/cache.js:20-55

### Cache-First Query Pattern

```javascript
// actinium-core/lib/utils/acl.js:66-73
const cached = Actinium.Cache.get('acl-targets');
if (cached && !fresh) {
    return {
        roles: filterRoles(cached.roles, search),
        users: filterUsers(cached.users, search),
    };
}

// Otherwise, query database and cache result
```

**Source**: actinium-core/lib/utils/acl.js:66-73

**Use cases**:
- Relatively static data (roles, settings, capabilities)
- Expensive queries (joins, aggregations)
- High-frequency reads

### Roles Cache Pattern

```javascript
// actinium-core/lib/roles.js:156
Actinium.Cache.set('roles', output);

// Later access
Roles.get = (search) => {
    return _.chain(
        Object.values(Actinium.Cache.get('roles', {}))
            .filter(({ name, level, objectId }) =>
                !search ||
                name === search ||
                level === search ||
                objectId === search,
            ),
    )
        .sortBy('level')
        .value()
        .reverse();
};
```

**Source**: actinium-core/lib/roles.js:95-116, 156

**Cache Invalidation**: Triggered on afterSave hook (actinium-roles/plugin.js:186-194)

```javascript
const afterSave = async () => {
    await SDK.list({ useMasterKey: true }); // Refreshes cache

    await Actinium.Cloud.run(
        'acl-targets',
        { cache: true },
        { useMasterKey: true },
    ); // Refreshes dependent cache
};
```

---

## Session Token Propagation

### CloudRunOptions Pattern

**Critical**: Always use CloudRunOptions to propagate session token

```javascript
// actinium-users/plugin.js:78-79
const find = (req) => {
    const options = CloudRunOptions(req);
    return Actinium.User.list(req.params, options);
};
```

**Source**: actinium-users/plugin.js:77-80

**What CloudRunOptions does** (actinium-core/lib/utils/options.js):
- Extracts `sessionToken` from req.user
- Preserves user context for ACL checks
- Enables capability-based authorization

**Without it**: Query runs as anonymous (may fail ACL checks)

---

## Sorting Patterns

### Single Field Sort

```javascript
// actinium-core/lib/utils/hookedQuery.js:50-55
let { order = 'ascending', orderBy = 'name' } = params;
order = ['ascending', 'descending'].includes(order) ? order : 'descending';

qry[order](orderBy); // qry.ascending('name') or qry.descending('name')
```

**Source**: actinium-core/lib/utils/hookedQuery.js:50-55

### Multi-Field Sort (Compound)

```javascript
// actinium-core/lib/utils/acl.js:102-104
qry.ascending('fname');
qry.addAscending('lname');
qry.addAscending('username');
```

**Source**: actinium-core/lib/utils/acl.js:102-104

**Pattern**: First sort is `ascending()`/`descending()`, subsequent sorts use `addAscending()`/`addDescending()`

---

## Performance Best Practices

### 1. Always Use include() for Pointers

**Bad** (N+1 queries):
```javascript
const content = await qry.find(options);
for (let item of content) {
    await item.get('type').fetch(); // N queries!
}
```

**Good** (1 query):
```javascript
qry.include('type');
const content = await qry.find(options); // All types fetched in single query
```

### 2. Limit Results Appropriately

```javascript
// actinium-content/sdk.js:118-119
let limit = op.get(params, 'limit', 50);
limit = Math.min(limit, 100); // Never exceed 100
```

**Why**: Large result sets increase:
- Network transfer time
- Memory usage
- Parse Server processing

### 3. Use count() Before Large Fetches

```javascript
// actinium-core/lib/utils/hookedQuery.js:96
let count = await qry.count(options);
```

**Why**: Determine if pagination needed, avoid fetching millions of records

### 4. Cache Stable Data

**Good candidates**:
- Roles (change infrequently)
- Settings (rarely updated)
- Capabilities (static)

**Bad candidates**:
- User-generated content
- Real-time data
- Personalized results

### 5. Avoid Deep skip() Values

**Problem**: MongoDB skips by scanning (skip 10,000 = scan 10,000 docs)

**Solution**: Cursor-based pagination (use createdAt/objectId range queries)

```javascript
// Instead of skip:
qry.greaterThan('createdAt', lastSeenDate);
qry.limit(50);
```

### 6. Use select() for Large Documents

```javascript
qry.select('objectId', 'title', 'summary', 'thumbnail');
// Don't fetch full content body for list views
```

---

## Common Query Patterns

### Pattern: Type + Slug Lookup

```javascript
// actinium-content/sdk.js:89-105
let type = await this.utils.type(op.get(params, 'type'));
let slugs = this.utils.stringToArray(op.get(params, 'slug'));

if (type) {
    if (slugs.length < 1) {
        qry.equalTo('type', type);
    } else {
        // Convert type + slug to UUID
        const typeMachineName = type.get('machineName');
        slugs = slugs.map((slug) =>
            this.utils.genUUID(typeMachineName, slug),
        );
        if (slugs.length > 0) qry.containedIn('uuid', slugs);
    }
}
```

**Source**: actinium-content/sdk.js:89-105

### Pattern: Status Filter

```javascript
// actinium-content/sdk.js:76-80
let statuses = op.get(params, 'status');
statuses = this.utils.stringToArray(statuses);
statuses = statuses.map((s) => String(s).toUpperCase());
if (statuses.length > 0) qry.containedIn('status', statuses);
```

**Source**: actinium-content/sdk.js:76-80

### Pattern: User Relation Filter

```javascript
// actinium-content/sdk.js:82-86
let users = op.get(params, 'user');
users = this.utils.stringToArray(users);
users = await Promise.all(users.map(this.utils.userFromString));
if (users.length > 0) qry.containedIn('user', users);
```

**Source**: actinium-content/sdk.js:82-86

### Pattern: Load All Pages (Small Dataset)

```javascript
// actinium-core/lib/utils/acl.js:107-120
let users = [];
let results = await qry.find(options);

while (results.length > 0) {
    results = results.map((item) => mapUser(item.toJSON()));
    users = users.concat(results);

    if (results.length === 1000) {
        qry.skip(users.length);
        results = await qry.find(options);
    } else {
        results = [];
    }
}
```

**Source**: actinium-core/lib/utils/acl.js:107-120

---

## Common Gotchas

### 1. Forgetting include() on Pointers

**Symptom**: Pointers are Parse.Pointer objects, not fetched objects

**Solution**: Always `qry.include('pointerField')` before find()

### 2. Not Capping limit Parameter

**Symptom**: User passes limit=999999, overwhelms server

**Solution**: Always cap: `limit = Math.min(limit, 100)`

### 3. Using skip() for Deep Pagination

**Symptom**: Page 1000 takes 10+ seconds

**Solution**: Use cursor-based pagination with range queries

### 4. Querying Without Session Token

**Symptom**: ACL errors, missing data

**Solution**: Always use `CloudRunOptions(req)` in cloud functions

### 5. count() After limit()

**Symptom**: count() returns limit value, not total

**Solution**: Call count() BEFORE limit() (HookedQuery does this correctly)

### 6. Forgetting to Invalidate Cache

**Symptom**: Stale data after updates

**Solution**: Clear cache in afterSave/afterDelete hooks

### 7. OR Queries on Unindexed Fields

**Symptom**: Slow queries

**Solution**: Add database indexes via Collection.register schema

---

## Testing Query Patterns

### Manual Testing with Cloud.run

```javascript
// From browser console or admin panel
await Actinium.Cloud.run('content-list', {
    limit: 10,
    page: 1,
    queryParams: [
        { method: 'equalTo', params: ['status', 'PUBLISHED'] },
    ],
}, { sessionToken: 'user-session-token-here' });
```

### Testing with Master Key (Server-Side)

```javascript
const results = await qry.find({ useMasterKey: true });
```

**Warning**: Only use in server-side code, never expose to client

---

## Integration with Other Systems

### Collection Schema Integration

```javascript
// Define indexes for query performance
Actinium.Collection.register('Content', {
    // ... other config
    indexes: {
        uuid_index: { uuid: 1 },
        type_status_index: { type: 1, status: 1 },
        user_updatedAt_index: { user: 1, updatedAt: -1 },
    },
});
```

**Recommendation**: Index fields used in:
- `equalTo()` / `containedIn()`
- Sort operations (ascending/descending)
- Compound queries (OR queries benefit from indexes on all fields)

### Hook Integration for Query Extension

```javascript
// Plugin extending content queries
Actinium.Hook.register('content-query', async ({ query, params, options }) => {
    // Add plugin-specific filters
    if (params.featured) {
        query.equalTo('featured', true);
    }

    // Add custom includes
    query.include('customRelation');
}, Actinium.Enums.priority.neutral, 'MY-PLUGIN');
```

---

## Advanced Patterns

### Aggregate Queries

**Note**: Not shown in examined source, but supported by Parse Server

```javascript
// Hypothetical aggregate pipeline
const pipeline = [
    { match: { status: 'PUBLISHED' } },
    { group: { objectId: '$type', count: { $sum: 1 } } },
];

const results = await new Actinium.Query('Content')
    .aggregate(pipeline, { useMasterKey: true });
```

**Use cases**: Analytics, reporting, counts by category

### Relation Queries

```javascript
// Query Parse Relation (actinium-core/lib/roles.js:66-80)
await item
    .get('users')
    .query()
    .each((item) => {
        const { avatar, objectId, username } = item.toJSON();
        users[objectId] = { avatar, objectId, username };
    }, options);
```

**Source**: actinium-core/lib/roles.js:66-72

**Pattern**: Use `relation.query()` to query related objects

---

## Summary

**Query Construction Checklist**:
- ✓ Use appropriate constraints (equalTo, containedIn, matches)
- ✓ Include pointers you'll access
- ✓ Limit results to reasonable size
- ✓ Use CloudRunOptions for session token
- ✓ Add sorting
- ✓ Consider caching for stable data
- ✓ Count before paginating
- ✓ Use hooks for extensibility

**Performance Checklist**:
- ✓ Index queried fields
- ✓ Avoid deep skip values
- ✓ Use select() for large documents
- ✓ Cache query results when appropriate
- ✓ Use compound indexes for multi-field queries

**Common Patterns**:
- HookedQuery for plugin-extensible queries
- Cache-first for roles/settings
- Include for pointer hydration
- OR queries for multi-field search
- Load-all-pages for admin interfaces

---

**Related Documentation**:
- [Cloud Functions](./CLOUD_FUNCTIONS.md) - Session token, CloudRunOptions
- [Collection Registration](./COLLECTION_REGISTRATION.md) - Schema, indexes, CLP
- [Actinium Capabilities](./ACTINIUM_CAPABILITIES.md) - ACL checks in queries
