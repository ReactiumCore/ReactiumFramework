<!-- v1.0.0 -->

# Parse Object Serialization (Actinium.Utils.serialize)

**Purpose**: Convert Parse Objects to plain JavaScript objects with automatic pointer stripping and nested object resolution.

**Source**: `actinium-core/lib/utils/serialize.js:1-35`

---

## API Reference

### Actinium.Utils.serialize(data)

Serialize Parse Object to plain JSON with pointer type cleanup.

**Parameters**:
- `data` - Parse Object, array of Parse Objects, or any object with `.toJSON()` method

**Returns**: Plain JavaScript object with:
- All Parse Object data converted to JSON
- Nested Parse Objects automatically serialized
- Pointer `__type` fields removed
- ACL preserved (if present)

**Signature**:
```javascript
const serialize = (data) => {
  if (!data || typeof data.toJSON === 'undefined') return data;
  const obj = data.toJSON();
  Object.entries(obj).forEach(([key, value]) => {
    if (value && typeof value.toJSON !== 'undefined') {
      obj[key] = value.toJSON();
    }

    // Strip pointers
    if (op.has(obj, [key, '__type'])) op.del(obj, [key, '__type']);
  });

  return obj;
};
```

**Source**: `serialize.js:19-32`

---

## Behavior Details

### 1. Null/Undefined Pass-Through

```javascript
serialize(null);       // null
serialize(undefined);  // undefined
serialize('string');   // 'string'
serialize(123);        // 123
serialize({});         // {} (no toJSON method, returns as-is)
```

**Source**: `serialize.js:20`

---

### 2. Parse Object Conversion

```javascript
const user = await new Parse.Query('_User').first();

const serialized = Actinium.Utils.serialize(user);

// Before serialize
{
  className: '_User',
  id: 'abc123',
  attributes: { username: 'john', email: 'john@example.com' },
  _toFullJSON: [Function],
  toJSON: [Function]
}

// After serialize
{
  objectId: 'abc123',
  username: 'john',
  email: 'john@example.com',
  createdAt: '2025-01-15T10:30:00.000Z',
  updatedAt: '2025-01-15T10:30:00.000Z',
  ACL: { /* ACL object */ }
}
```

---

### 3. Nested Parse Object Resolution

```javascript
const content = await new Parse.Query('Content')
  .include('type')
  .include('user')
  .first();

const serialized = Actinium.Utils.serialize(content);

// Before serialize
{
  title: 'Hello World',
  type: Parse.Object,     // Parse Object instance
  user: Parse.Object      // Parse Object instance
}

// After serialize
{
  title: 'Hello World',
  type: {                 // Resolved to plain object
    objectId: 'xyz789',
    machineName: 'blog',
    label: 'Blog Post'
  },
  user: {                 // Resolved to plain object
    objectId: 'abc123',
    username: 'john'
  }
}
```

**Source**: `serialize.js:22-25`

---

### 4. Pointer Type Stripping

Parse SDK adds `__type: 'Pointer'` metadata to pointer fields. `serialize()` removes these:

```javascript
// Raw Parse.Object.toJSON()
{
  type: {
    __type: 'Pointer',
    className: 'Type',
    objectId: 'xyz789'
  }
}

// After Actinium.Utils.serialize()
{
  type: {
    objectId: 'xyz789',
    machineName: 'blog',
    label: 'Blog Post'
    // __type removed
  }
}
```

**Source**: `serialize.js:27-28`

---

### 5. ACL Preservation

ACL objects are preserved (not stripped):

```javascript
const content = await new Parse.Query('Content').first();
const serialized = Actinium.Utils.serialize(content);

console.log(serialized.ACL);
// {
//   "*": { read: false, write: false },
//   "abc123": { read: true, write: true },
//   "role:administrator": { read: true, write: true }
// }
```

---

### 6. Relation Fields

Parse Relation fields are NOT automatically fetched or resolved:

```javascript
const content = await new Parse.Query('Content').first();
const serialized = Actinium.Utils.serialize(content);

console.log(serialized.taxonomy);
// {
//   __type: 'Relation',
//   className: 'Taxonomy'
// }
// Relation not fetched, metadata preserved
```

**Workaround**: Manually query and attach relation data:

```javascript
const content = await new Parse.Query('Content').first();
const taxonomies = await content.relation('taxonomy').query().find();

const serialized = Actinium.Utils.serialize(content);
serialized.taxonomy = taxonomies.map(Actinium.Utils.serialize);
```

---

## Real-World Usage Patterns

### Pattern 1: Cloud Function Response

```javascript
Actinium.Cloud.define('MY_PLUGIN', 'get-content', async (req) => {
  const content = await new Parse.Query('Content')
    .include('type')
    .include('user')
    .first(Actinium.Utils.MasterOptions());

  // Serialize before returning
  return Actinium.Utils.serialize(content);
});

// Client receives plain object (no Parse SDK dependency)
const data = await Actinium.Cloud.run('get-content');
console.log(data.type.machineName);  // 'blog' (not Parse.Object)
```

**Usage**: `actinium-syndicate/sdk.js:101,126`, `actinium-route/sdk.js:29,59`

---

### Pattern 2: Array of Parse Objects

```javascript
const users = await new Parse.Query('_User').find();

// Map and serialize
const serialized = users.map(Actinium.Utils.serialize);

// Or serialize containing object
const result = {
  count: users.length,
  results: users.map(Actinium.Utils.serialize)
};
```

**Usage**: `actinium-user.js:243`, `actinium-plugable.js:277`

---

### Pattern 3: Cache Storage

```javascript
// Bad - Parse Objects can't be cached directly
Actinium.Cache.set('user', parseUserObject);  // May cause issues

// Good - serialize before caching
Actinium.Cache.set('user', Actinium.Utils.serialize(parseUserObject));

// Retrieve and reconstruct if needed
const cached = Actinium.Cache.get('user');
if (cached) {
  const user = new Parse.Object('_User');
  user.id = cached.objectId;
  // Set attributes from cached data
}
```

**Usage**: Cache documentation example: `MEMORY_CACHE_SYSTEM.md:756`

---

### Pattern 4: Search Indexing

```javascript
Actinium.Hook.register('search-index-item-normalize', async (item, content) => {
  // Serialize Parse Object for indexing
  const serialized = Actinium.Utils.serialize(content);

  // Flatten to plain text for search
  return {
    ...serialized,
    searchText: extractPlainText(serialized.data.body)
  };
});
```

**Usage**: `actinium-search/search-lunr-plugin.js:76`, `actinium-search/sdk.js:24`

---

### Pattern 5: API Response Pagination

```javascript
async function listContent(params) {
  const query = new Parse.Query('Content');
  query.include('type');
  query.include('user');

  const count = await query.count();
  const results = await query.find();

  return {
    count,
    page: params.page,
    pages: Math.ceil(count / params.limit),
    results: results.map(Actinium.Utils.serialize)  // Clean response
  };
}
```

**Usage**: Pagination patterns: `PAGINATION_STRATEGIES.md:244,305,614`

---

### Pattern 6: Nested Object Serialization

```javascript
const content = await new Parse.Query('Content')
  .include('type')
  .include('user')
  .first();

// Single serialize call handles all nesting
const serialized = Actinium.Utils.serialize(content);

// All nested Parse Objects resolved
console.log(serialized.type.machineName);  // Direct access
console.log(serialized.user.username);     // No Parse.Object wrapper
```

---

### Pattern 7: Plugin Registration Response

```javascript
Actinium.Plugin.register(PLUGIN, false);

const plugins = await new Parse.Query('Plugin').find();

return {
  plugins: plugins.map(Actinium.Utils.serialize)
};
```

**Usage**: `actinium-plugable.js:277,339`

---

## Comparison with Alternatives

### serialize() vs .toJSON()

| Feature | serialize() | .toJSON() |
|---------|-------------|-----------|
| **Nested Objects** | Auto-resolves | Returns Parse.Object |
| **Pointer Cleanup** | Strips `__type` | Preserves `__type` |
| **Null Safety** | Returns null/undefined | Throws on null |
| **Relations** | Metadata only | Metadata only |
| **ACL** | Preserved | Preserved |

**Example**:
```javascript
const content = await query.include('type').first();

// .toJSON() - nested Parse Object not serialized
const json = content.toJSON();
console.log(json.type);
// { __type: 'Pointer', className: 'Type', objectId: 'xyz' }

// serialize() - nested object fully resolved
const serialized = Actinium.Utils.serialize(content);
console.log(serialized.type);
// { objectId: 'xyz', machineName: 'blog', label: 'Blog Post' }
```

---

### serialize() vs JSON.stringify()

| Feature | serialize() | JSON.stringify() |
|---------|-------------|------------------|
| **Parse Objects** | Converts to plain | Throws error |
| **Circular Refs** | Not handled | Throws error |
| **Custom toJSON** | Uses method | Uses method |
| **Pointer Cleanup** | Yes | No |

**Example**:
```javascript
const user = await query.first();

// JSON.stringify() on Parse Object throws
JSON.stringify(user);  // Error: Converting circular structure

// serialize() first
JSON.stringify(Actinium.Utils.serialize(user));  // Works
```

---

## Best Practices

### 1. Serialize Before Returning from Cloud Functions

```javascript
// Good
Actinium.Cloud.define('get-data', async () => {
  const data = await query.first();
  return Actinium.Utils.serialize(data);  // Clean response
});

// Bad - returns Parse.Object
Actinium.Cloud.define('get-data', async () => {
  const data = await query.first();
  return data;  // Client receives Parse SDK dependency
});
```

---

### 2. Serialize Arrays with .map()

```javascript
// Good
return results.map(Actinium.Utils.serialize);

// Bad - only serializes array wrapper
return Actinium.Utils.serialize(results);  // Array itself, not items
```

---

### 3. Include Pointers Before Serializing

```javascript
// Good - pointers resolved
const content = await query
  .include('type')
  .include('user')
  .first();
const serialized = Actinium.Utils.serialize(content);

// Bad - pointers not resolved
const content = await query.first();
const serialized = Actinium.Utils.serialize(content);
console.log(serialized.type);  // { __type: 'Pointer', objectId: 'xyz' }
```

---

### 4. Don't Serialize Twice

```javascript
// Bad - double serialization returns same object
const serialized = Actinium.Utils.serialize(content);
const doubled = Actinium.Utils.serialize(serialized);
// doubled === serialized (no toJSON method on plain object)

// Good - serialize once
const serialized = Actinium.Utils.serialize(content);
```

---

### 5. Cache Serialized Objects

```javascript
// Good - cache plain objects
const serialized = Actinium.Utils.serialize(user);
Actinium.Cache.set('user', serialized);

// Bad - cache Parse Objects (may cause issues)
Actinium.Cache.set('user', user);
```

---

### 6. Handle Null/Undefined

```javascript
// serialize() is null-safe
const data = await query.first();  // May be undefined
const serialized = Actinium.Utils.serialize(data);  // Returns undefined, no error
```

---

## Common Gotchas

### 1. Relations Not Auto-Fetched

**Problem**: Relation fields show metadata only, not actual related objects

```javascript
const content = await query.first();
const serialized = Actinium.Utils.serialize(content);

console.log(serialized.taxonomy);
// { __type: 'Relation', className: 'Taxonomy' }
// NOT array of taxonomies
```

**Solution**: Manually fetch relations before serializing

```javascript
const content = await query.first();
const taxonomies = await content.relation('taxonomy').query().find();

const serialized = Actinium.Utils.serialize(content);
serialized.taxonomy = taxonomies.map(Actinium.Utils.serialize);
```

---

### 2. Pointer Not Included

**Problem**: Pointer fields show objectId only without `.include()`

```javascript
// Without include
const content = await query.first();
const serialized = Actinium.Utils.serialize(content);

console.log(serialized.type);
// { __type: 'Pointer', className: 'Type', objectId: 'xyz' }

// With include
const content = await query.include('type').first();
const serialized = Actinium.Utils.serialize(content);

console.log(serialized.type);
// { objectId: 'xyz', machineName: 'blog', label: 'Blog Post' }
```

**Source**: Pointer cleanup only removes `__type`, doesn't fetch data

---

### 3. Array Not Auto-Mapped

**Problem**: Serializing array doesn't serialize items

```javascript
const users = await query.find();

// Bad - array itself has no toJSON
const serialized = Actinium.Utils.serialize(users);
console.log(serialized);  // Original array (unchanged)

// Good - map items
const serialized = users.map(Actinium.Utils.serialize);
```

---

### 4. Circular References Not Handled

**Problem**: If Parse Object has circular references, serialization may fail

```javascript
// Rare, but possible with custom fields
content.set('self', content);

const serialized = Actinium.Utils.serialize(content);
// May cause issues if .toJSON() doesn't handle circular refs
```

**Solution**: Avoid circular references in Parse Objects

---

### 5. Custom Fields with toJSON

**Problem**: Objects with custom `.toJSON()` may not serialize as expected

```javascript
class CustomClass {
  toJSON() {
    return { custom: 'data' };
  }
}

const obj = new CustomClass();
const serialized = Actinium.Utils.serialize(obj);
console.log(serialized);  // { custom: 'data' }
// Nested objects within toJSON NOT auto-serialized
```

**Solution**: Ensure custom `.toJSON()` handles nested serialization

---

### 6. File Objects

**Problem**: Parse File objects serialize to URL strings

```javascript
content.set('file', parseFile);
const serialized = Actinium.Utils.serialize(content);

console.log(serialized.file);
// { name: 'file.jpg', url: 'https://...', __type: 'File' }
```

Parse File `.toJSON()` includes URL, `__type` remains (not a Pointer, so not stripped)

---

### 7. ACL Object Structure

**Problem**: ACL serializes to plain object, not Parse.ACL instance

```javascript
const serialized = Actinium.Utils.serialize(content);

// Can't call Parse.ACL methods
serialized.ACL.setReadAccess(userId, true);  // Error: not a method

// ACL is plain object
console.log(serialized.ACL);
// { "userId": { read: true, write: true } }
```

**Solution**: Reconstruct Parse.ACL if needed

```javascript
const acl = new Parse.ACL();
Object.entries(serialized.ACL).forEach(([key, perms]) => {
  if (perms.read) acl.setReadAccess(key, true);
  if (perms.write) acl.setWriteAccess(key, true);
});
```

---

## Integration with Other Systems

### Cloud Functions

Serialize responses for clean client consumption:

```javascript
Actinium.Cloud.define('PLUGIN', 'function-name', async (req) => {
  const result = await query.first();
  return Actinium.Utils.serialize(result);
});
```

**Usage**: Every cloud function that returns Parse Objects

---

### Cache System

Serialize before caching to avoid Parse Object issues:

```javascript
const data = Actinium.Utils.serialize(parseObject);
Actinium.Cache.set('key', data);
```

**Related**: [MemoryCache System](./MEMORY_CACHE_SYSTEM.md)

---

### Search System

Serialize for indexing and plain-text extraction:

```javascript
Actinium.Hook.register('search-index-item-normalize', (item, content) => {
  return Actinium.Utils.serialize(content);
});
```

**Related**: [Search System](./ACTINIUM_SEARCH_SYSTEM.md)

---

### Syndicate System

Serialize content for cross-site API responses:

```javascript
const content = await query.first();
return Actinium.Utils.serialize(content);
```

**Related**: [Syndicate System](./ACTINIUM_SYNDICATE_SYSTEM.md)

---

### Pagination Patterns

Serialize paginated results:

```javascript
return {
  count,
  page,
  pages,
  results: items.map(Actinium.Utils.serialize)
};
```

**Related**: [Pagination Strategies](./PAGINATION_STRATEGIES.md)

---

## Debugging Techniques

### Inspect Before/After

```javascript
const parseObject = await query.first();

console.log('Before:', parseObject);
console.log('Has toJSON:', typeof parseObject.toJSON);

const serialized = Actinium.Utils.serialize(parseObject);

console.log('After:', serialized);
console.log('Has toJSON:', typeof serialized.toJSON);
```

---

### Compare with .toJSON()

```javascript
const parseObject = await query.include('type').first();

const manualJSON = parseObject.toJSON();
const serialized = Actinium.Utils.serialize(parseObject);

console.log('toJSON type:', manualJSON.type);
// { __type: 'Pointer', className: 'Type', objectId: 'xyz' }

console.log('serialized type:', serialized.type);
// { objectId: 'xyz', machineName: 'blog', label: 'Blog Post' }
```

---

### Check Pointer Cleanup

```javascript
const serialized = Actinium.Utils.serialize(parseObject);

// Verify no __type fields
function hasPointerType(obj, path = '') {
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__type') {
      console.log('Found __type at:', path + key);
    }
    if (value && typeof value === 'object') {
      hasPointerType(value, path + key + '.');
    }
  }
}

hasPointerType(serialized);
```

---

### Verify Nested Resolution

```javascript
const content = await query
  .include('type')
  .include('user')
  .first();

const serialized = Actinium.Utils.serialize(content);

// Check nested objects are plain
console.log(serialized.type.constructor.name);  // 'Object' (not Parse.Object)
console.log(serialized.user.constructor.name);  // 'Object'
```

---

## Related Documentation

- [Cloud Function Patterns](./CLOUD_FUNCTION_PATTERNS.md) - Using serialize in cloud functions
- [MemoryCache System](./MEMORY_CACHE_SYSTEM.md) - Caching serialized objects
- [Actinium Search System](./ACTINIUM_SEARCH_SYSTEM.md) - Serialization for indexing
- [Actinium Syndicate System](./ACTINIUM_SYNDICATE_SYSTEM.md) - API response serialization
- [Pagination Strategies](./PAGINATION_STRATEGIES.md) - Serializing paginated results

---

## Source Code Reference

```javascript
// actinium-core/lib/utils/serialize.js:19-32
const serialize = (data) => {
  if (!data || typeof data.toJSON === 'undefined') return data;
  const obj = data.toJSON();
  Object.entries(obj).forEach(([key, value]) => {
    if (value && typeof value.toJSON !== 'undefined') {
      obj[key] = value.toJSON();
    }

    // strip pointers
    if (op.has(obj, [key, '__type'])) op.del(obj, [key, '__type']);
  });

  return obj;
};

export default serialize;
```

**Export**: `actinium-core/lib/utils/index.js` → `Actinium.Utils.serialize`

---

## Usage Statistics

Serialization is used extensively throughout the framework:

- **Cloud Functions**: 15+ usages in syndicate/route/user/plugin SDKs
- **Cache Storage**: Recommended pattern for all Parse Object caching
- **Search Indexing**: Required for Lunr.js indexing
- **API Responses**: Standard pattern for all cloud function returns
- **Pagination**: Used in all paginated query results

**Total Framework Usage**: 20+ files, 40+ direct calls

---

## Performance Considerations

### Serialization Cost

```javascript
// Lightweight - single toJSON call per object
const serialized = Actinium.Utils.serialize(content);
// O(n) where n = number of fields + nested objects
```

---

### Include vs Serialize

```javascript
// Efficient - fetch with include, serialize once
const content = await query
  .include('type')
  .include('user')
  .first();
const serialized = Actinium.Utils.serialize(content);

// Inefficient - multiple fetches
const content = await query.first();
const type = await content.get('type').fetch();
const user = await content.get('user').fetch();
const serialized = Actinium.Utils.serialize(content);
```

---

### Bulk Serialization

```javascript
// Efficient - map serialization
const items = await query.find();
const serialized = items.map(Actinium.Utils.serialize);

// Inefficient - loop with individual serialize
const serialized = [];
for (const item of items) {
  serialized.push(Actinium.Utils.serialize(item));
}
// Both are O(n), but map is cleaner and faster
```

---

## TypeScript Integration

```typescript
// Type-safe serialization
interface SerializedContent {
  objectId: string;
  title: string;
  type: {
    objectId: string;
    machineName: string;
  };
}

const content = await query.include('type').first();
const serialized: SerializedContent = Actinium.Utils.serialize(content);
```

**Note**: TypeScript types not included in actinium-core, define manually for type safety.
