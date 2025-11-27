<!-- v1.0.0 -->

# Actinium FileAdapter System and Pluggable File Storage

**Last Updated**: Nov 27, 2025
**Relevance**: Critical for production deployments and scalable file storage

---

## Overview

The **FileAdapter System** provides pluggable file storage backends for Parse Server, allowing runtime switching between:

- **GridFS** (default) - MongoDB-based storage
- **Local Filesystem** - Development/testing
- **Amazon S3** - Production cloud storage
- **Digital Ocean Spaces** - S3-compatible alternative
- **Google Cloud Storage** - GCS backend
- **Custom adapters** - Plugin-extensible

**Key Features**:
- Runtime adapter switching via plugin activation
- Hook-driven file processing pipeline
- Proxy pattern for seamless adapter swapping
- Environment-based configuration
- Direct access vs proxied file serving

---

## Architecture

### FilesAdapterProxy Pattern

**Purpose**: Transparent adapter swapping without Parse Server restart

```javascript
class FilesAdapterProxy {
    constructor(config) {
        this._adapter = new GridFSBucketAdapter(config.databaseURI);
        this.ID = 'GridFSBucketAdapter';
    }

    createFile(filename, data, contentType) {
        return this._adapter.createFile(filename, data, contentType);
    }

    deleteFile(filename) {
        return this._adapter.deleteFile(filename);
    }

    getFileData(filename) {
        return this._adapter.getFileData(filename);
    }

    getFileLocation(config, filename) {
        return this._adapter.getFileLocation(config, filename);
    }

    validateFilename(filename) {
        return this._adapter.validateFilename(filename);
    }

    handleFileStream(filename, res, req, contentType) {
        return this._adapter.handleFileStream(filename, res, req, contentType);
    }
}
```

**Source**: `actinium-core/lib/files-adapter.js:7-97`

**Pattern**: Proxy delegates all Parse FilesAdapter methods to current active adapter

---

## Default Adapter: GridFS

**GridFS** - MongoDB-based file storage (default)

**Why GridFS**:
- ✅ No additional infrastructure (uses existing MongoDB)
- ✅ Transactional consistency with Parse objects
- ✅ Works out-of-the-box for development
- ❌ Not optimized for CDN delivery
- ❌ Limited scalability vs cloud storage

**Initialization**:
```javascript
FilesAdapterProxy.prototype._defaultAdapter = function() {
    this._adapter = new GridFSBucketAdapter(this.config.databaseURI);
    this._adapter.validateFilename = this._validateFilenameDefault;
};
```

**Source**: `actinium-core/lib/files-adapter.js:14-17`

---

## Parse Server Integration

### Configuration in Parse Middleware

```javascript
const parseConfig = (hook) => {
    const config = {
        appId: ENV.APP_ID,
        masterKey: ENV.MASTER_KEY,
        databaseURI: ENV.DATABASE_URI,
        directAccess: ENV.PARSE_FILES_DIRECT_ACCESS,
        preserveFileName: ENV.PARSE_PRESERVE_FILENAME,
        maxUploadSize: ENV.MAX_UPLOAD_SIZE,
        // ... other config
    };

    config.filesAdapter = FileAdapter.getProxy(config);

    return config;
};
```

**Source**: `actinium-core/middleware/parse/middleware.js:8-27`

**Flow**:
1. Parse Server requests `filesAdapter` from config
2. `FileAdapter.getProxy(config)` returns singleton proxy
3. Proxy delegates to current active adapter (GridFS by default)

---

## Environment Configuration

### Key Environment Variables

```bash
# Direct file access (bypass Parse Server for file URLs)
PARSE_FILES_DIRECT_ACCESS=true  # Files served directly from storage

# Preserve original filenames (vs random hash)
PARSE_PRESERVE_FILENAME=true

# Max upload size (bytes)
MAX_UPLOAD_SIZE=20971520  # 20MB

# Filesystem adapter subdirectory (if using FSFilesAdapter)
PARSE_FS_FILES_SUB_DIRECTORY=uploads
```

**Source**: `actinium-core/middleware/parse/middleware.js:20-24`, environment configuration system

### Direct Access vs Proxied Serving

**Direct Access** (`directAccess: true`):
- File URLs point directly to storage backend (S3 URL, filesystem path)
- Faster delivery (no Parse Server intermediary)
- Requires public-readable storage or signed URLs

**Proxied Access** (`directAccess: false`):
- File URLs point to Parse Server endpoint
- Parse Server fetches from backend and streams to client
- Allows ACL/authentication checks before serving files

**Trade-off**: Performance vs security

---

## Registering Custom Adapters

### FilesAdapter.register() API

```javascript
/**
 * @param {Object} plugin - Plugin object (ID, name, version, etc.)
 * @param {Function} installer - Async function returning adapter instance
 * @param {Number} order - Priority (higher = wins if multiple active)
 */
Actinium.FilesAdapter.register(plugin, installer, order);
```

**Source**: `actinium-core/lib/files-adapter.js:130-158`

### Installer Function Signature

```javascript
async function installer(config, env) {
    // config = Parse Server configuration object
    // env = ENV global (environment variables)

    // Return Parse FilesAdapter instance
    return new SomeFilesAdapter({ /* options */ });
}
```

**Requirements**:
- Must return object implementing Parse FilesAdapter interface
- Called when plugin is activated
- Must check `Actinium.Plugin.isActive(plugin.ID)` before returning adapter

---

## Built-In Adapters

### 1. S3Adapter Plugin

**Purpose**: Amazon S3 and Digital Ocean Spaces storage

```javascript
import S3Adapter from '@parse/s3-files-adapter';

const PLUGIN = {
    ID: 'S3Adapter',
    name: 'Actinium S3 Adapter plugin.',
    order: Actinium.Enums.priority.high,
    meta: {
        group: 'FilesAdapter',
        builtIn: true,
        settings: true,  // Configurable via Actinium Settings
    },
};

Actinium.FilesAdapter.register(PLUGIN, async config => {
    if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

    const settings = await Actinium.Setting.get('S3Adapter', {});

    return new S3Adapter(settings);
});
```

**Source**: `actinium-fs-adapter/s3-plugin.js:1-65`

**Configuration** (stored in Actinium Settings):
```javascript
{
    accessKey: 'AWS_ACCESS_KEY',
    secretKey: 'AWS_SECRET_KEY',
    bucket: 'my-bucket',
    region: 'us-east-1',
    // Optional: Digital Ocean Spaces
    endpoint: 'https://nyc3.digitaloceanspaces.com',
    // Optional: Custom base URL
    baseUrl: 'https://cdn.example.com',
    // Optional: Direct access
    directAccess: true
}
```

**NPM Package**: `@parse/s3-files-adapter`

---

### 2. FSFilesAdapter Plugin

**Purpose**: Local filesystem storage (development/testing)

```javascript
import FSFilesAdapter from '@parse/fs-files-adapter';

const PLUGIN = {
    ID: 'FSFileAdapter',
    name: 'Actinium File Adapter plugin.',
    order: Actinium.Enums.priority.high,
};

Actinium.FilesAdapter.register(PLUGIN, async (config, env) => {
    if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

    let filesSubDirectory = await Actinium.Setting.get(
        'FSFileAdapter.filesSubDirectory',
        env.PARSE_FS_FILES_SUB_DIRECTORY || 'uploads'
    );

    // Normalize path (relative to BASE_DIR)
    filesSubDirectory = path.normalize(filesSubDirectory);
    if (filesSubDirectory[0] === path.sep) {
        filesSubDirectory = path.relative(BASE_DIR, filesSubDirectory);
    }

    return new FSFilesAdapter({
        filesSubDirectory,
    });
});
```

**Source**: `actinium-fs-adapter/fs-plugin.js:1-58`

**Directory Structure**:
```
project-root/
└── uploads/           # Default filesSubDirectory
    ├── abc123.jpg
    ├── def456.pdf
    └── ...
```

**Path Resolution**: Automatically ensures directory exists on write

**Custom Patch**:
```javascript
FSFilesAdapter.prototype._getLocalFilePath = function (filename) {
    const applicationDir = this._getApplicationDir();
    const filePath = path.resolve(applicationDir, filename);
    fs.ensureDirSync(path.dirname(filePath));  // Auto-create dirs
    return filePath;
};
```

**Source**: `actinium-fs-adapter/fs-plugin.js:26-32`

---

## Hook-Driven Extensibility

### files-adapter Hook

**Purpose**: Allow plugins to provide adapter on activation

```javascript
Actinium.Hook.register(
    'files-adapter',
    async (config, env, ID, active, context) => {
        if (active && ID === 'MyCustomAdapter') {
            context.adapter = new MyCustomAdapter(config);
            context.ID = 'MyCustomAdapter';
        }
    }
);
```

**Source**: `actinium-core/lib/files-adapter.js:143-153`

**Hook Context**:
- `config` - Parse Server configuration
- `env` - ENV global
- `ID` - Plugin ID being activated/deactivated
- `active` - Boolean (plugin activated?)
- `context` - Object to mutate (`adapter`, `ID`)

**Pattern**: Hook modifies context object with adapter instance

---

## Adapter Lifecycle

### Activation Flow

```
1. Plugin activated (via dashboard or Plugin.activate())
   ↓
2. plugin-before-save hook fires
   ↓
3. FilesAdapter.update(ID, active=true) called
   ↓
4. files-adapter hook runs with active=true
   ↓
5. Hook installer returns adapter instance
   ↓
6. proxy._set(adapter, ID) swaps active adapter
   ↓
7. Boot message logs new adapter ID
```

**Source**: `actinium-core/lib/files-adapter.js:111-128, 160-169`

---

### Deactivation Flow

```
1. Plugin deactivated
   ↓
2. deactivate hook fires
   ↓
3. FilesAdapter.update(ID, active=false) called
   ↓
4. If ID === current proxy.ID:
   ↓
5. proxy._set() reverts to default (GridFS)
```

**Source**: `actinium-core/lib/files-adapter.js:181-189`

**Graceful Fallback**: Deactivating current adapter reverts to GridFS (always available)

---

## Priority-Based Selection

**Problem**: Multiple FilesAdapter plugins active simultaneously

**Solution**: Highest `order` wins

```javascript
const PLUGIN_A = {
    ID: 'S3Adapter',
    order: Actinium.Enums.priority.high,  // 100
};

const PLUGIN_B = {
    ID: 'GCSAdapter',
    order: Actinium.Enums.priority.highest,  // 1000
};

// GCSAdapter wins (1000 > 100)
```

**Source**: Hook system priority ordering (see [HOOK_DOMAINS_DEEP_DIVE.md](./HOOK_DOMAINS_DEEP_DIVE.md))

**Best Practice**: Use same priority for all FileAdapter plugins (only one should be active)

---

## File Processing Pipeline (Future Hook Integration)

**Potential hooks** (not currently implemented, discovered during research):

```javascript
// Example: Image transformation
Actinium.Hook.register('file-before-create', async (filename, data, contentType) => {
    if (contentType.startsWith('image/')) {
        // Resize, optimize, generate thumbnails
        data = await processImage(data);
    }
    return { filename, data, contentType };
});

// Example: Virus scanning
Actinium.Hook.register('file-before-create', async (filename, data) => {
    await virusScan(data);
});

// Example: Metadata extraction
Actinium.Hook.register('file-after-create', async (filename, url) => {
    if (filename.endsWith('.pdf')) {
        const metadata = await extractPDFMetadata(url);
        // Store in separate collection
    }
});
```

**Note**: These hooks are NOT currently implemented in framework, but proxy pattern enables future extensibility

---

## Real-World Deployment Patterns

### Development Setup

```javascript
// Use GridFS (default) or local filesystem
// No configuration needed

// OR activate FSFileAdapter for local files
await Actinium.Plugin.activate('FSFileAdapter');
```

**Benefit**: Zero external dependencies

---

### Production Setup (S3)

```javascript
// 1. Set environment variables
ENV.PARSE_FILES_DIRECT_ACCESS = true;
ENV.PARSE_PRESERVE_FILENAME = false;

// 2. Configure S3 via Settings
await Actinium.Setting.set('S3Adapter', {
    accessKey: process.env.AWS_ACCESS_KEY,
    secretKey: process.env.AWS_SECRET_KEY,
    bucket: 'my-app-files',
    region: 'us-west-2',
    directAccess: true,
    baseUrl: 'https://cdn.myapp.com'  // CloudFront CDN
});

// 3. Activate S3Adapter plugin
await Actinium.Plugin.activate('S3Adapter');
```

**Benefit**: Scalable, CDN-friendly, offloads file serving from app servers

---

### Multi-Environment Strategy

```javascript
// env.dev.json
{
    "PARSE_FILES_DIRECT_ACCESS": false,
    "PARSE_FS_FILES_SUB_DIRECTORY": "uploads"
}

// env.prod.json
{
    "PARSE_FILES_DIRECT_ACCESS": true,
    "PARSE_PRESERVE_FILENAME": false
}

// Plugin activation via environment
if (ENV.NODE_ENV === 'production') {
    await Actinium.Plugin.activate('S3Adapter');
} else {
    await Actinium.Plugin.activate('FSFileAdapter');
}
```

---

## Common Use Cases

### 1. CDN Integration

**Pattern**: S3 + CloudFront

```javascript
await Actinium.Setting.set('S3Adapter', {
    bucket: 'my-app-files',
    region: 'us-east-1',
    directAccess: true,
    baseUrl: 'https://d123abc.cloudfront.net'  // CloudFront URL
});
```

**Result**: Parse File URLs use CDN domain for fast global delivery

---

### 2. Private File Access

**Pattern**: Proxied access with ACL checks

```javascript
// Disable direct access
ENV.PARSE_FILES_DIRECT_ACCESS = false;

// Files served through Parse Server
// Parse Server checks ACL before serving file
const file = await new Parse.Query('_File')
    .equalTo('name', 'private-doc.pdf')
    .first({ sessionToken });

// URL: https://api.myapp.com/parse/files/[appId]/[filename]
// Requires valid session token with ACL permission
```

---

### 3. Multi-Tenant File Isolation

**Pattern**: Bucket-per-tenant OR prefix-based isolation

```javascript
// Option A: Different adapter per tenant (complex)
const tenantAdapter = new S3Adapter({
    bucket: `tenant-${tenantId}-files`,
    // ...
});

// Option B: Prefix-based (simpler)
const file = new Parse.File(`tenant-${tenantId}/document.pdf`, data);
await file.save();
```

---

### 4. File Upload Size Limits

```javascript
ENV.MAX_UPLOAD_SIZE = 10 * 1024 * 1024;  // 10MB

// Parse Server enforces on upload
// Returns error if file exceeds limit
```

**Source**: `actinium-core/middleware/parse/middleware.js:24`

---

## Filename Validation

### Default Validation

```javascript
_validateFilenameDefault(filename) {
    const regx = /^[_a-zA-Z0-9][a-zA-Z0-9@./ ~_-]*$/;
    if (!filename.match(regx)) {
        return new Parse.Error(
            Parse.Error.INVALID_FILE_NAME,
            'Filename contains invalid characters.'
        );
    }
    return null;
}
```

**Source**: `actinium-core/lib/files-adapter.js:59-69`

**Allowed**: Alphanumeric, `@`, `.`, `/`, `~`, `_`, `-`

**Blocked**: Spaces, Unicode, special characters

---

### Custom Validation

```javascript
class MyCustomAdapter {
    validateFilename(filename) {
        // Custom logic
        if (filename.includes('..')) {
            return new Parse.Error(
                Parse.Error.INVALID_FILE_NAME,
                'Path traversal not allowed'
            );
        }
        return null;
    }
}
```

**Pattern**: Return `Parse.Error` for invalid, `null` for valid

---

## Debugging File Storage Issues

### 1. Check Active Adapter

```javascript
const proxy = Actinium.FilesAdapter.getProxy();
console.log('Active Adapter:', proxy.ID);
```

**Expected**: 'GridFSBucketAdapter', 'S3Adapter', 'FSFileAdapter', etc.

---

### 2. Verify Plugin Activation

```javascript
const isActive = Actinium.Plugin.isActive('S3Adapter');
console.log('S3Adapter active:', isActive);
```

---

### 3. Check Settings

```javascript
const settings = await Actinium.Setting.get('S3Adapter');
console.log('S3 Config:', settings);
```

**Common Issues**:
- Missing accessKey/secretKey
- Wrong bucket name
- Incorrect region

---

### 4. Test File Upload

```javascript
const file = new Parse.File('test.txt', { base64: 'SGVsbG8gV29ybGQ=' });
await file.save({ useMasterKey: true });
console.log('File URL:', file.url());
```

**Verify**: URL matches expected format (S3 URL, local path, etc.)

---

### 5. Check Parse Server Logs

```bash
# Look for FilesAdapter initialization
Files Adapter: S3Adapter
```

**Source**: `actinium-core/lib/files-adapter.js:32-37` (bootMessage)

---

## Performance Considerations

### Direct Access Performance

**Proxied** (`directAccess: false`):
- Client → Parse Server → Storage Backend → Parse Server → Client
- 2x network hops, Parse Server becomes bottleneck

**Direct** (`directAccess: true`):
- Client → Storage Backend (direct URL)
- 1x network hop, offloads Parse Server

**Recommendation**: Use direct access in production with CDN

---

### GridFS vs S3 Performance

**GridFS**:
- ✅ Low latency for small files (same datacenter as MongoDB)
- ❌ Not optimized for concurrent reads
- ❌ Limited CDN integration

**S3**:
- ✅ Highly scalable (millions of files)
- ✅ CDN-friendly (CloudFront integration)
- ✅ Parallel upload/download
- ❌ Slightly higher latency for first byte (network round trip)

---

## Common Gotchas

### 1. Adapter Not Switching on Activation

**Problem**: Activated S3Adapter but still using GridFS

**Cause**: Plugin activation didn't trigger `files-adapter` hook

**Solution**: Verify plugin registered correctly:
```javascript
Actinium.FilesAdapter.register(PLUGIN, installer, order);
```

---

### 2. Direct Access Not Working

**Problem**: File URLs still point to Parse Server

**Cause**: `directAccess` not set in Parse config

**Solution**:
```javascript
ENV.PARSE_FILES_DIRECT_ACCESS = true;
```

**OR** adapter-specific:
```javascript
new S3Adapter({ directAccess: true });
```

---

### 3. Permission Denied on S3 Upload

**Problem**: 403 Forbidden when saving files

**Cause**: AWS credentials lack `s3:PutObject` permission

**Solution**: Update IAM policy:
```json
{
    "Effect": "Allow",
    "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
    ],
    "Resource": "arn:aws:s3:::my-bucket/*"
}
```

---

### 4. File Not Accessible After Deactivating Adapter

**Problem**: Files stored in S3 not accessible after switching to GridFS

**Cause**: Adapter change doesn't migrate existing files

**Solution**: **Files are NOT migrated automatically**. Use separate migration script or keep adapter active.

---

### 5. Filename Validation Failure

**Problem**: File upload fails with "Filename contains invalid characters"

**Cause**: Filename has spaces or special characters

**Solution**: Sanitize filename before upload:
```javascript
const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
const file = new Parse.File(sanitized, data);
```

---

## Best Practices

### 1. Use Direct Access in Production

```javascript
ENV.PARSE_FILES_DIRECT_ACCESS = true;
```

**Why**: Offloads file serving, enables CDN caching

---

### 2. Don't Preserve Filenames in Production

```javascript
ENV.PARSE_PRESERVE_FILENAME = false;
```

**Why**: Avoids filename collisions, hides internal structure

---

### 3. Set Reasonable Upload Limits

```javascript
ENV.MAX_UPLOAD_SIZE = 20 * 1024 * 1024;  // 20MB
```

**Why**: Prevents abuse, manages storage costs

---

### 4. Use CDN for Public Files

```javascript
new S3Adapter({
    baseUrl: 'https://cdn.myapp.com'
});
```

**Why**: Faster global delivery, reduces S3 egress costs

---

### 5. Monitor Storage Costs

**Pattern**: Enable S3 lifecycle policies

```javascript
// AWS S3 Lifecycle Rule
{
    "Rules": [{
        "Status": "Enabled",
        "Transitions": [{
            "Days": 90,
            "StorageClass": "STANDARD_IA"  // Infrequent Access
        }]
    }]
}
```

---

### 6. Separate Buckets by Environment

```javascript
// dev
bucket: 'myapp-dev-files'

// staging
bucket: 'myapp-staging-files'

// production
bucket: 'myapp-prod-files'
```

**Why**: Prevents accidental deletion, easier cleanup

---

## Testing Strategies

### Unit Testing Custom Adapter

```javascript
describe('CustomAdapter', () => {
    let adapter;

    beforeEach(() => {
        adapter = new CustomAdapter(config);
    });

    it('should create file', async () => {
        const filename = await adapter.createFile(
            'test.txt',
            Buffer.from('Hello'),
            'text/plain'
        );
        expect(filename).toBeDefined();
    });

    it('should validate filename', () => {
        const error = adapter.validateFilename('../etc/passwd');
        expect(error).toBeInstanceOf(Parse.Error);
    });
});
```

---

### Integration Testing Adapter Switching

```javascript
it('should switch adapters on plugin activation', async () => {
    const proxy = Actinium.FilesAdapter.getProxy();
    expect(proxy.ID).toBe('GridFSBucketAdapter');

    await Actinium.Plugin.activate('S3Adapter');

    expect(proxy.ID).toBe('S3Adapter');
});
```

---

## Summary

**FileAdapter System** provides pluggable file storage for Actinium:

| Feature | GridFS | S3 | Filesystem |
|---------|--------|----|----|
| **Setup** | Default (no config) | Requires AWS account | Simple (local dev) |
| **Scalability** | Limited | Excellent | Poor |
| **CDN** | Difficult | Easy (CloudFront) | Not applicable |
| **Cost** | MongoDB storage | AWS pricing | Local disk |
| **Use Case** | Development | Production | Testing |

**Framework Patterns**:
- **Proxy Pattern** - Transparent adapter swapping
- **Hook Integration** - `files-adapter` hook for plugin registration
- **Plugin-Based** - Activate/deactivate via plugin system
- **Settings-Driven** - Configure adapters via Actinium.Setting

**Best Practices**:
1. Use GridFS for development
2. Use S3 + CDN for production
3. Enable direct access for performance
4. Don't preserve filenames (security)
5. Set upload size limits
6. Separate buckets by environment

**Critical for**: Production deployments, scalable file storage, CDN integration, multi-environment setup, debugging file upload/access issues

**Discovered During Research**: Potential for file processing hooks (image optimization, virus scanning, metadata extraction) - proxy pattern enables future extensibility without Parse Server changes
