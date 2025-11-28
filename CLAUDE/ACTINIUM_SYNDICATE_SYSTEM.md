<!-- v1.0.0 -->

# Actinium Syndicate Multi-Tenant Content Distribution System

**Purpose**: JWT-based authentication and content syndication system for distributing content across multiple Actinium sites, enabling headless CMS and multi-tenant architectures.

**Source**: `actinium-syndicate/sdk.js:1-478`, `plugin.js:1-185`, `schema.js:1-24`, `enums.js:1-7`

---

## Architecture Overview

Syndicate enables one Actinium instance (content hub) to serve content to multiple external clients (consumer sites) via secure REST API with JWT authentication.

### Two-Token System

1. **Refresh Token** - Long-lived secret token stored in database
   - Created when registering a client
   - Used only to generate access tokens
   - Signed with `ENV.REFRESH_SECRET`
   - Never expires
   - Stored in SyndicateClient collection

2. **Access Token** - Short-lived API token
   - Generated from refresh token
   - Expires after 60 seconds (configurable via `Enums.token_expiration`)
   - Signed with `ENV.ACCESS_SECRET`
   - Used for all syndicated content API calls

---

## SyndicateClient Collection

### Schema

```javascript
{
  collection: 'SyndicateClient',
  schema: {
    user: {
      type: 'Pointer',
      targetClass: '_User'
    },
    client: {
      type: 'String'  // Client name/label
    },
    token: {
      type: 'String'  // JWT refresh token
    }
  }
}
```

### Collection-Level Permissions (CLP)

```javascript
// Capabilities required
SyndicateClient.addField
SyndicateClient.create
SyndicateClient.delete
SyndicateClient.retrieve
SyndicateClient.update

// Settings access
setting.Syndicate-get
setting.Syndicate-set
setting.Syndicate-delete

// Special capability
Syndicate.Client  // Bypasses token verification
```

**Source**: `plugin.js:77-96`

---

## Client Management API

### Actinium.Syndicate.Client.create(req, options)

Create a syndication client and generate refresh token.

**Parameters**:
- `req.params.client` - Client name/label (required)
- `req.params.user` - User object (optional, uses session user if not provided)
- `options` - Parse options (defaults to CloudRunOptions)

**Capability Required**: `SyndicateClient.create`

**Returns**: Serialized client object with `token` (refresh token) and `objectId`

**Flow**:
1. Validates capability `SyndicateClient.create`
2. Gets user from session token or params
3. Generates JWT refresh token with payload: `{ username, client }`
4. Creates SyndicateClient record
5. Returns serialized object

**Example**:
```javascript
// SDK call
await Actinium.Syndicate.Client.create({
  sessionToken,
  params: {
    client: 'My syndication client'
  }
}, Actinium.Utils.MasterOptions());

// Returns
{
  objectId: 'abc123',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',  // Refresh token
  client: 'My syndication client',
  user: { /* User object */ }
}

// Cloud function
await Actinium.Cloud.run('syndicate-client-create', {
  client: 'My Syndicate client'
});
```

**Source**: `sdk.js:62-102`

---

### Actinium.Syndicate.Client.token(req)

Exchange refresh token for short-lived access token.

**Parameters**:
- `req.params.token` - Refresh token from client creation

**Returns**: `{ token: accessToken }`

**Flow**:
1. Verifies refresh token signature with `REFRESH_SECRET`
2. Queries SyndicateClient collection matching token + client name
3. Generates new access token with payload: `{ username, client }`
4. Signs with `ACCESS_SECRET`, expires in 60 seconds
5. Returns access token

**Example**:
```javascript
// SDK call
const { token: accessToken } = await Actinium.Syndicate.Client.token({
  params: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // Refresh token
  }
});

// Cloud function POST /functions/syndicate-client-token
{
  "_ApplicationId": "Actinium",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Source**: `sdk.js:179-212`

---

### Actinium.Syndicate.Client.verify(req)

Verify access token validity (check expiration).

**Parameters**:
- `req.params.token` - Access token from `.token()` call

**Returns**: JWT payload object if valid, `false` if expired/invalid

**Special**: Users with `Syndicate.Client` capability bypass token check (always returns `true`)

**Example**:
```javascript
const payload = await Actinium.Syndicate.Client.verify({
  params: {
    token: accessToken
  }
});

if (!payload) {
  // Token expired, fetch new one
  const { token: newAccessToken } = await Actinium.Syndicate.Client.token({
    params: { token: refreshToken }
  });
}
```

**Source**: `sdk.js:248-267`

---

### Actinium.Syndicate.Client.retrieve(req, options)

Retrieve single client by objectId.

**Parameters**:
- `req.params.objectId` - SyndicateClient objectId

**Returns**: Serialized client object

**Source**: `sdk.js:115-127`

---

### Actinium.Syndicate.Client.delete(req, options)

Delete syndication client by objectId.

**Parameters**:
- `req.params.objectId` - SyndicateClient objectId

**Returns**: Destroy result

**Alias**: `Client.destroy`

**Source**: `sdk.js:140-150`

---

### Actinium.Syndicate.Client.list(req, options)

List all syndication clients with pagination.

**Capability Required**: `SyndicateClient.retrieve`

**Uses**: `hookedQuery` pattern with hooks:
- `syndicate-client-query` - Modify query
- `syndicate-client-list` - Modify output

**Source**: `sdk.js:280-298`

---

## Content Syndication API

All content API methods require valid access token via `Client.verify()`.

### Actinium.Syndicate.Content.types(req)

Get list of syndicated content types.

**Flow**:
1. Verifies access token
2. Gets enabled types from `Setting.get('Syndicate.types')`
3. Fetches all types via `Actinium.Type.list()`
4. Filters types matching `Syndicate.types` setting

**Example**:
```javascript
// Cloud function POST /functions/syndicate-content-types
{
  "_ApplicationId": "Actinium",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // Access token
}

// Returns
[
  { machineName: 'blog', uuid: '...', collection: 'Content_blog', ... },
  { machineName: 'page', uuid: '...', collection: 'Content_page', ... }
]
```

**Source**: `sdk.js:312-320`

---

### Actinium.Syndicate.Content.list(req)

Get paginated list of syndicated content.

**Flow**:
1. Verifies access token
2. Calls `Actinium.Content.list()` with master key
3. Runs `syndicate-content-list` hook for modification
4. Adds URLs to each content item (see hook below)

**Hook Integration**:
```javascript
// Automatically enriches content with URL list
Actinium.Hook.register('syndicate-content-list', async ({ results = [] }) => {
  for (const content of results) {
    const urls = await Actinium.URL.list({ contentId: content.objectId });
    op.set(content, 'urls', urls.results);
  }
});
```

**Source**: `sdk.js:332-340`, `plugin.js:132-146`

---

### Actinium.Syndicate.Content.media(req)

Get syndicated media files.

**Uses**: `hookedQuery` with hooks:
- `syndicate-media-query` - Modify query
- `syndicate-media-output` - Modify output

**Collection**: `Media`

**Source**: `sdk.js:376-388`

---

### Actinium.Syndicate.Content.mediaDirectories(req)

Get media directory structure.

**Uses**: `hookedQuery` with hooks:
- `syndicate-media-directories-query`
- `syndicate-media-directories-output`

**Collection**: `MediaDirectory`

**Source**: `sdk.js:352-364`

---

### Actinium.Syndicate.Content.taxonomies(req)

Get syndicated taxonomy list.

**Flow**:
1. Verifies access token
2. Calls `Actinium.Taxonomy.list()` with master key
3. Runs `syndicate-content-taxonomies` hook

**Source**: `sdk.js:423-431`

---

### Actinium.Syndicate.Content.taxonomyTypes(req)

Get taxonomy type definitions.

**Flow**:
1. Verifies access token
2. Calls `Actinium.Taxonomy.Type.list()` with master key
3. Runs `syndicate-content-taxonomy-types` hook

**Source**: `sdk.js:400-411`

---

### Actinium.Syndicate.Content.taxonomiesAttached(req)

Get taxonomies attached to specific content item.

**Parameters**:
- `req.params.type` - Object with `machineName` and `collection`
- `req.params.contentId` - Content objectId

**Example**:
```javascript
await Actinium.Cloud.run('syndicate-content-taxonomies-attached', {
  type: {
    machineName: 'nav',
    collection: 'Content_nav'
  },
  contentId: '0aOqeToFgx'
});
```

**Source**: `sdk.js:451-469`

---

## Security Configuration

### Environment Variables

**CRITICAL**: Change default secrets in production!

```javascript
ENV.ACCESS_SECRET   // Default: long hex string (see enums.js:2-3)
ENV.REFRESH_SECRET  // Default: long hex string (see enums.js:4-5)
```

**Warning Hook**: Plugin warns on startup if using default secrets.

**Source**: `enums.js:1-7`, `plugin.js:99-130`

### Token Expiration

```javascript
Enums.token_expiration = 60  // Access token expires in 60 seconds
```

**Source**: `enums.js:6`

---

## Cloud Function API

All syndicate cloud functions are registered with plugin ID:

```javascript
const cloudAPIs = [
  { name: 'syndicate-client-create', sdk: 'Syndicate.Client.create' },
  { name: 'syndicate-client-retrieve', sdk: 'Syndicate.Client.retrieve' },
  { name: 'syndicate-client-delete', sdk: 'Syndicate.Client.delete' },
  { name: 'syndicate-clients', sdk: 'Syndicate.Client.list' },
  { name: 'syndicate-client-token', sdk: 'Syndicate.Client.token' },
  { name: 'syndicate-client-verify', sdk: 'Syndicate.Client.verify' },
  { name: 'syndicate-content-types', sdk: 'Syndicate.Content.types' },
  { name: 'syndicate-content-list', sdk: 'Syndicate.Content.list' },
  { name: 'syndicate-content-media-directories', sdk: 'Syndicate.Content.mediaDirectories' },
  { name: 'syndicate-content-media', sdk: 'Syndicate.Content.media' },
  { name: 'syndicate-content-taxonomy-types', sdk: 'Syndicate.Content.taxonomyTypes' },
  { name: 'syndicate-content-taxonomies', sdk: 'Syndicate.Content.taxonomies' },
  { name: 'syndicate-content-taxonomies-attached', sdk: 'Syndicate.Content.taxonomiesAttached' }
];
```

**Source**: `plugin.js:148-181`

---

## Real-World Usage Patterns

### Pattern 1: Initial Client Setup

```javascript
// 1. Content hub creates syndication client
const { token: refreshToken, objectId: clientId } = await Actinium.Cloud.run(
  'syndicate-client-create',
  { client: 'Consumer Site #1' }
);

// 2. Store refreshToken securely on consumer site
// 3. Consumer site requests access token before API calls
const { token: accessToken } = await fetch('https://hub.example.com/functions/syndicate-client-token', {
  method: 'POST',
  body: JSON.stringify({
    _ApplicationId: 'Actinium',
    token: refreshToken
  })
}).then(r => r.json());

// 4. Use access token for content requests
const types = await fetch('https://hub.example.com/functions/syndicate-content-types', {
  method: 'POST',
  body: JSON.stringify({
    _ApplicationId: 'Actinium',
    token: accessToken
  })
}).then(r => r.json());
```

---

### Pattern 2: Token Refresh Workflow

```javascript
// Store refresh token persistently
const REFRESH_TOKEN = process.env.SYNDICATE_REFRESH_TOKEN;
let accessToken = null;

async function getValidAccessToken() {
  // Verify current access token
  const payload = await Actinium.Syndicate.Client.verify({
    params: { token: accessToken }
  });

  if (!payload) {
    // Token expired, get new one
    const { token } = await Actinium.Syndicate.Client.token({
      params: { token: REFRESH_TOKEN }
    });
    accessToken = token;
  }

  return accessToken;
}

// Use before every API call
const token = await getValidAccessToken();
const content = await Actinium.Syndicate.Content.list({
  params: { token }
});
```

---

### Pattern 3: Multi-Tenant Content Configuration

```javascript
// Hub site: Configure which types are syndicated
await Actinium.Setting.set(
  'Syndicate.types',
  {
    blog: true,
    page: true,
    nav: false  // Not syndicated
  }
);

// Consumer site: Fetch only enabled types
const types = await Actinium.Syndicate.Content.types({ params: { token } });
// Returns only blog and page types
```

---

### Pattern 4: Content with URLs

```javascript
// Content automatically enriched with URL list via hook
const { results } = await Actinium.Syndicate.Content.list({
  params: { token }
});

results.forEach(content => {
  console.log(content.title);
  console.log(content.urls);  // Array of URL objects from URL plugin
});
```

---

## Hook Integration Points

### Extensibility Hooks

```javascript
// Modify client queries
Actinium.Hook.register('syndicate-client-query', ({ query, params, options }) => {
  // Modify Parse.Query before execution
});

// Modify client list output
Actinium.Hook.register('syndicate-client-list', ({ results }) => {
  // Transform output before returning
});

// Enrich content with URLs (built-in)
Actinium.Hook.register('syndicate-content-list', async ({ results }) => {
  // Add URLs to each content item
});

// Modify taxonomy types output
Actinium.Hook.register('syndicate-content-taxonomy-types', (result) => {
  // Transform taxonomy types
});

// Modify taxonomies output
Actinium.Hook.register('syndicate-content-taxonomies', (result) => {
  // Transform taxonomies
});

// Modify attached taxonomies
Actinium.Hook.register('syndicate-content-taxonomies-attached', (result) => {
  // Transform attached taxonomies
});
```

**Source**: `sdk.js:110,338,409,429,464`, `plugin.js:132-146`

---

## Best Practices

### Security

1. **ALWAYS change default secrets in production**
   ```bash
   # Generate secure random secrets
   ENV.ACCESS_SECRET=$(openssl rand -hex 64)
   ENV.REFRESH_SECRET=$(openssl rand -hex 64)
   ```

2. **Store refresh tokens securely** - Never expose in client-side code, use server-side storage

3. **Implement token refresh logic** - Access tokens expire after 60 seconds

4. **Use capability checks** - Grant `SyndicateClient.create` only to trusted administrators

5. **Whitelist syndicated types** - Use `Syndicate.types` setting to control what's exposed

### Performance

1. **Cache access tokens** - Reuse until expiration (60 seconds)

2. **Use pagination** - Content.list supports pagination parameters

3. **Hook optimization** - Avoid N+1 queries in syndicate hooks

### Multi-Tenant Strategy

1. **One client per consumer site** - Track which site accesses what content

2. **User association** - Link client to specific user for audit trails

3. **Type-based filtering** - Different clients can access different content types

4. **Settings-driven config** - Use Settings system for per-type syndication rules

---

## Common Gotchas

### 1. Default Secrets in Production

**Problem**: Using default `ACCESS_SECRET` and `REFRESH_SECRET` values
**Solution**: Set environment variables with strong random values
**Detection**: Warning hook fires on startup if using defaults

**Source**: `plugin.js:99-130`

---

### 2. Token Expiration Not Handled

**Problem**: Access token expires after 60 seconds, API calls fail
**Solution**: Implement token refresh workflow with `.verify()` and `.token()`
**Pattern**: Check validity before each API call, refresh if needed

---

### 3. Refresh Token Exposed

**Problem**: Storing refresh token in client-side code
**Solution**: Keep refresh token server-side only, expose access tokens to client if needed

---

### 4. Missing Type Configuration

**Problem**: Content types not showing in syndicated list
**Solution**: Configure `Syndicate.types` setting with enabled types
**Check**: `await Actinium.Setting.get('Syndicate.types')`

---

### 5. Capability Misconfiguration

**Problem**: Users can't create clients or access content
**Solution**: Grant appropriate capabilities:
  - `SyndicateClient.create` for client creation
  - `SyndicateClient.retrieve` for listing clients
  - `Syndicate.Client` to bypass token verification (internal use)

---

### 6. Hook Execution Order

**Problem**: Custom hooks not firing for syndicated content
**Solution**: Register hooks on correct hook names (e.g., `syndicate-content-list` not `content-list`)

---

### 7. MasterKey Not Used

**Problem**: Content API returns limited results due to ACL restrictions
**Solution**: Syndicate content methods automatically use `MasterOptions()` to bypass ACL

**Source**: `sdk.js:316,336,356,380,404,427,459`

---

## Integration with Other Systems

### Content System

- Uses `Actinium.Content.list()` for content retrieval
- Respects Content ACL when not using master key
- Integrates with Type system for type filtering

**Source**: `sdk.js:337`

---

### Settings System

- `Syndicate.types` controls which types are syndicated
- Settings capabilities required for configuration

**Source**: `sdk.js:317`, `plugin.js:86-88`

---

### URL Plugin

- Automatically adds URLs to syndicated content via hook
- Provides SEO-friendly URL patterns for consumer sites

**Source**: `plugin.js:132-146`

---

### Taxonomy System

- Syndicates taxonomy types and taxonomies
- Provides attached taxonomies per content item

**Source**: `sdk.js:400-469`

---

### Media System

- Syndicates media files and directory structure
- Uses `hookedQuery` for extensibility

**Source**: `sdk.js:352-388`

---

## Comparison with Alternatives

### Syndicate vs Direct Parse REST API

| Feature | Syndicate | Parse REST API |
|---------|-----------|----------------|
| **Authentication** | Two-token JWT system | Session tokens |
| **Token Expiration** | 60 seconds (access) | Session-based |
| **Content Filtering** | Settings-driven type whitelist | Manual ACL/CLP |
| **URL Enrichment** | Automatic via hooks | Manual |
| **Multi-Tenant** | Client-based tracking | User-based |
| **Extensibility** | Hook-driven | Limited |

### Syndicate vs GraphQL

| Feature | Syndicate | GraphQL (actinium-graphql) |
|---------|-----------|----------------------------|
| **Query Flexibility** | Fixed endpoints | Flexible queries |
| **Authentication** | JWT tokens | Session tokens |
| **Client Management** | Built-in | Manual |
| **Type Safety** | Runtime | Schema-based |
| **Caching** | Manual | Built-in (Apollo) |

---

## Debugging Techniques

### Verify Token Generation

```javascript
const jwt = require('jsonwebtoken');

// Decode refresh token (no verification)
const payload = jwt.decode(refreshToken);
console.log(payload);  // { username, client }

// Verify access token
try {
  const verified = jwt.verify(accessToken, ENV.ACCESS_SECRET);
  console.log('Valid:', verified);
} catch (err) {
  console.log('Expired or invalid:', err.message);
}
```

---

### Test Client Creation

```javascript
// Check capability
const hasCapability = await Actinium.Capability.User.hasAll(
  req.user,
  ['SyndicateClient.create']
);

// Create test client
const client = await Actinium.Syndicate.Client.create({
  sessionToken: req.sessionToken,
  params: { client: 'Test Client' }
}, Actinium.Utils.MasterOptions());

console.log('Client created:', client.objectId);
console.log('Refresh token:', client.token);
```

---

### Monitor Token Lifecycle

```javascript
// Get access token
const { token: accessToken } = await Actinium.Syndicate.Client.token({
  params: { token: refreshToken }
});

console.log('Access token created');

// Wait 61 seconds
await new Promise(resolve => setTimeout(resolve, 61000));

// Verify expiration
const payload = await Actinium.Syndicate.Client.verify({
  params: { token: accessToken }
});

console.log('After 61 seconds:', payload);  // Should be false
```

---

### Check Settings Configuration

```javascript
// View syndicated types
const types = await Actinium.Setting.get('Syndicate.types', {});
console.log('Syndicated types:', types);

// Add type
await Actinium.Setting.set('Syndicate.types', {
  ...types,
  newType: true
});
```

---

## Related Documentation

- [Content System](./ACTINIUM_CONTENT_SYSTEM.md) - Content CRUD and type integration
- [Settings System](./ACTINIUM_SETTINGS_SYSTEM.md) - Settings-based configuration
- [Parse Object Serialization](./PARSE_OBJECT_SERIALIZATION.md) - Actinium.Utils.serialize
- [Cloud Function Patterns](./CLOUD_FUNCTION_PATTERNS.md) - Security and registration
- [Taxonomy System](./ACTINIUM_TAXONOMY_SYSTEM.md) - Taxonomy syndication

---

## Plugin Metadata

```javascript
{
  ID: 'Syndicate',
  name: 'Syndicate Plugin',
  description: 'Enable Syndicated content to be served across Reactium cloud sites.',
  order: 100,
  version: {
    actinium: '>5.0.0',
    plugin: '/* from package.json */'
  },
  meta: {
    group: 'Networking',
    settings: true,
    builtIn: true
  }
}
```

**Source**: `plugin.js:17-33`
