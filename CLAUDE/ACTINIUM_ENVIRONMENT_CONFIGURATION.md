<!-- v1.0.0 -->

# Actinium Environment-Specific Configuration System

Complete guide to Actinium's environment file resolution, configuration management, and deployment architecture.

---

## Architecture Overview

Actinium uses a **three-tier environment file resolution system** with **process.env overlay** for flexible multi-environment deployments.

**Configuration Loading Order**:
1. Resolve environment file path (ACTINIUM_ENV_FILE → ACTINIUM_ENV_ID → default)
2. Parse JSON file from resolved path
3. Overlay process.env variables (process.env wins)
4. Apply PORT resolution logic (special case)
5. Generate SERVER_URI and PUBLIC_SERVER_URI
6. Apply TLS configuration (file-based)
7. Normalize boolean/JSON strings
8. Expose as global `ENV` object

**Source References**:
- actinium-core/boot.js:174-186 (environment file resolution)
- actinium-core/boot.js:8-84 (PORT resolution logic)
- actinium-core/boot.js:87-116 (SERVER_URI generation)
- actinium-core/boot.js:121-152 (environment getter)
- actinium-core/boot.js:155-172 (dev template auto-generation)
- actinium-core/globals.js:30-148 (ENV normalization and defaults)
- actinium-core/middleware/parse/middleware.js:8-66 (Parse Server configuration)

---

## Environment File Resolution

### Three-Tier Priority System

```javascript
// actinium-core/boot.js:174-186
function environmentFile() {
    const envFile = process.env.ACTINIUM_ENV_FILE;
    const envId = process.env.ACTINIUM_ENV_ID;

    if (envFile) {
        return envFile; // Priority 1: Explicit file path
    } else if (envId) {
        validateReactorEnvId(envId); // Validates pattern: /^[.A-Za-z0-9_-]+$/
        return path.resolve(path.join(SRC_DIR, `env.${envId}.json`)); // Priority 2
    } else {
        return path.resolve(path.join(SRC_DIR, 'env.json')); // Priority 3: Default
    }
}
```

**Priority Order**:

1. **`ACTINIUM_ENV_FILE`** - Absolute path to environment file
   - Use case: Docker volumes, custom deployment paths
   - Example: `ACTINIUM_ENV_FILE=/config/actinium/production.json`

2. **`ACTINIUM_ENV_ID`** - Environment identifier (alphanumeric + `-_.`)
   - Use case: Multi-environment setup (dev, staging, prod)
   - Example: `ACTINIUM_ENV_ID=staging` → `src/env.staging.json`
   - Pattern validation: `/^[.A-Za-z0-9_-]+$/`

3. **Default** - `src/env.json`
   - Use case: Local development, single environment

---

## Configuration Merge Strategy

### File + Process.env Overlay

```javascript
// actinium-core/boot.js:122-152
const boot = {
    get environment() {
        const file = environmentFile();
        let env = { ENV_WARNING: false };

        const ENV_WARNING = envDev(); // Auto-generates env.dev.json in dev mode

        env = {
            ...env,
            ...JSON.parse(fs.readFileSync(file, 'utf8')), // Step 1: Load JSON file
            ENV_WARNING,
        };

        const PORT = ensurePortEnvironment(env); // Step 2: Special PORT resolution
        const SERVER_URI = getServerURI(env, PORT); // Step 3: Generate SERVER_URI
        const PUBLIC_SERVER_URI = getPublicServerURI(env, SERVER_URI);

        return {
            ...env,
            ...process.env, // Step 4: process.env OVERRIDES file values
            PORT,
            SERVER_URI,
            PUBLIC_SERVER_URI,
        };
    },
};
```

**Key Rules**:
- **process.env always wins** over JSON file values
- PORT, SERVER_URI, PUBLIC_SERVER_URI computed **after** merge
- Boolean/JSON strings normalized in globals.js (see ENV Normalization section)

---

## PORT Resolution Logic

### Complex Fallback Chain with PORT_VAR Indirection

Actinium has **special PORT resolution** supporting cloud platforms with dynamic port assignment.

**Without PORT_VAR** (standard mode):

```javascript
// actinium-core/boot.js:21-37
PORT = op.get(
    process.env,
    'APP_PORT', // 1. process.env.APP_PORT
    op.get(
        process.env,
        'PORT', // 2. process.env.PORT
        op.get(env, 'APP_PORT', op.get(env, 'PORT', DEFAULT_PORT)) // 3-5
    ),
);
```

**Fallback Order**:
1. `process.env.APP_PORT`
2. `process.env.PORT`
3. `env.APP_PORT` (from JSON file)
4. `env.PORT` (from JSON file)
5. `DEFAULT_PORT` (9000)

**With PORT_VAR** (cloud platform mode):

```javascript
// actinium-core/boot.js:13-19
const PORT_VAR = op.get(process.env, 'PORT_VAR', op.get(env, 'PORT_VAR'));

if (PORT_VAR) {
    // PORT_VAR specifies the env var name containing the port
    PORT = op.get(process.env, [PORT_VAR], op.get(env, [PORT_VAR]));
}
```

**Use Case**: Cloud platforms like Heroku/Railway use custom env var names (e.g., `X-Forwarded-Port`).

**Example**:
```bash
# Heroku uses X-Forwarded-Port instead of PORT
export PORT_VAR=X-Forwarded-Port
export X-Forwarded-Port=8080
# Actinium reads port from process.env['X-Forwarded-Port']
```

**Error Handling** (actinium-core/boot.js:41-76):
- Throws detailed error if PORT not found
- Shows all checked locations with values
- Different error messages for PORT_VAR vs standard mode

---

## SERVER_URI and PUBLIC_SERVER_URI Generation

### Automatic Port Adjustment

```javascript
// actinium-core/boot.js:87-106
const getServerURI = (env, PORT) => {
    const SERVER_URI = op.get(
        process.env,
        'SERVER_URI',
        op.get(env, 'SERVER_URI', `http://localhost:${DEFAULT_PORT}`),
    );

    if (PORT !== DEFAULT_PORT) {
        const url = new URL(SERVER_URI);

        // Lazy port configuration: auto-adjust if SERVER_URI still has default port
        if (Number(url.port) === DEFAULT_PORT) {
            return `${url.protocol || 'http'}//${url.hostname || 'localhost'}:${PORT}`;
        }
    }

    return SERVER_URI;
};
```

**Behavior**:
- If PORT changes from default (9000), **auto-updates** SERVER_URI port
- Prevents stale port in SERVER_URI after PORT override
- **PUBLIC_SERVER_URI** defaults to SERVER_URI if not explicitly set

**Example**:
```json
// env.json
{ "SERVER_URI": "http://localhost:9000" }
```

```bash
# Override PORT via env var
export PORT=3000
# Result: SERVER_URI = "http://localhost:3000" (auto-adjusted)
```

---

## Development Template Auto-Generation

### env.dev.json Creation

```javascript
// actinium-core/boot.js:155-172
const envDev = () => {
    if (process.env.NODE_ENV !== 'development') return false;

    // Check for env.dev.json file
    const filePath = path.resolve(path.join(SRC_DIR, 'env.dev.json'));
    if (fs.existsSync(filePath)) return false;

    // Generate env.dev.json from template
    const templatePath = path.resolve(path.join(CORE_DIR, 'env.def.json'));
    fs.copySync(templatePath, filePath);
    return true; // Sets ENV_WARNING to show developer message
};
```

**Behavior**:
- **Only in `NODE_ENV=development`**
- Checks if `src/env.dev.json` exists
- If missing: copies `actinium-core/env.def.json` → `src/env.dev.json`
- Sets `ENV_WARNING: true` to notify developer

**Use Case**: First-time project setup - generates starter config automatically.

---

## ENV Normalization and Defaults

### String-to-Type Conversion

```javascript
// actinium-core/globals.js:13-28
const stringToBoolean = (val) => {
    if (typeof val === 'string') {
        switch (String(val).toLowerCase()) {
            case 'true': return true;
            case 'false': return false;
        }
    }
    return val;
};

const stringToObject = (val) =>
    typeof val === 'string' ? JSON.parse(val) : val;
```

**Why**: Environment variables are always strings - need parsing for booleans/objects.

**Applied to** (actinium-core/globals.js:79-148):
- `LOG`, `RUN_TEST`, `NO_PARSE`, `NO_DOCS` → stringToBoolean
- `LIVE_QUERY_SERVER`, `PARSE_DASHBOARD`, etc. → stringToBoolean
- `EXPRESS_OPTIONS`, `GLOB_*`, `SETTINGS`, `ROLES` → stringToObject
- `MASTER_KEY_IPS`, `LIVE_QUERY_SETTINGS` → stringToObject

**Default Values** (actinium-core/globals.js:44-77):

```javascript
const defaults = {
    glob: {
        cloud: [`${ACTINIUM_DIR}/cloud/**/*.js`, ...],
        plugins: [`${ACTINIUM_DIR}/plugin/**/*plugin.js`, ...],
        middleware: [`${ACTINIUM_DIR}/middleware/**/*.js`, ...],
    },
    express: {
        views: APP_DIR + '/view',
        'view engine': 'ejs',
        'x-powered-by': false,
    },
    settings: {},
    static: path.normalize(`${process.cwd()}/public`),
    masterKeyIps: '["0.0.0.0/0", "::1"]', // Default: localhost only
};
```

---

## Parse Server Configuration Integration

### Environment → Parse Server Mapping

```javascript
// actinium-core/middleware/parse/middleware.js:8-66
const parseConfig = (hook) => {
    const config = {
        appId: ENV.APP_ID,
        appName: ENV.APP_NAME,
        masterKey: ENV.MASTER_KEY,
        masterKeyIps: ENV.MASTER_KEY_IPS, // Security: IP whitelist for master key
        enforcePrivateUsers: false,
        sessionLength: 31536000000, // 1 year
        databaseURI: ENV.DATABASE_URI, // MongoDB connection string
        allowExpiredAuthDataToken: true,
        serverURL: ENV.SERVER_URI + ENV.PARSE_MOUNT, // e.g., http://localhost:9000/api
        directAccess: ENV.PARSE_FILES_DIRECT_ACCESS,
        preserveFileName: ENV.PARSE_PRESERVE_FILENAME,
        publicServerURL: ENV.PUBLIC_SERVER_URI + ENV.PARSE_MOUNT,
        allowClientClassCreation: ENV.PARSE_ALLOW_CLIENT_CLASS_CREATION,
        maxUploadSize: ENV.MAX_UPLOAD_SIZE,
    };

    config.filesAdapter = FileAdapter.getProxy(config);

    // Optional API keys
    if (op.has(ENV, 'REST_API_KEY')) config['restAPIKey'] = ENV.REST_API_KEY;
    if (op.has(ENV, 'CLIENT_KEY')) config['clientKey'] = ENV.CLIENT_KEY;
    if (op.has(ENV, 'JAVASCRIPT_KEY')) config['javascriptKey'] = ENV.JAVASCRIPT_KEY;
    if (op.has(ENV, 'DOTNET_KEY')) config['dotNetKey'] = ENV.DOTNET_KEY;

    // Live Query
    if (ENV.LIVE_QUERY_SETTINGS) config['liveQuery'] = ENV.LIVE_QUERY_SETTINGS;

    // Logging
    if (ENV.LOG !== true) config.loggerAdapter = null;
    if (ENV.LOG_LEVEL) config.logLevel = ENV.PARSE_LOG_LEVEL;

    Hook.runSync('parse-server-config', config); // Extensibility point
    return config;
};
```

---

## TLS/HTTPS Configuration

### File-Based Certificate Loading

```javascript
// actinium-core/globals.js:130-140
ENV.APP_TLS_CERT_FILE = op.get(ENV, 'APP_TLS_CERT_FILE');
ENV.APP_TLS_KEY_FILE = op.get(ENV, 'APP_TLS_KEY_FILE');
ENV.APP_TLS_KEY =
    ENV.APP_TLS_KEY_FILE &&
    fs.existsSync(ENV.APP_TLS_KEY_FILE) &&
    fs.readFileSync(ENV.APP_TLS_KEY_FILE); // Read key file
ENV.APP_TLS_CERT =
    ENV.APP_TLS_CERT_FILE &&
    fs.existsSync(ENV.APP_TLS_CERT_FILE) &&
    fs.readFileSync(ENV.APP_TLS_CERT_FILE); // Read cert file
ENV.TLS_MODE = ENV.APP_TLS_KEY && ENV.APP_TLS_CERT; // Enable only if BOTH exist
```

### Server Creation with TLS

```javascript
// actinium-core/actinium.js:158-168
Actinium.server = !Actinium.server
    ? ENV.TLS_MODE
        ? https.createServer(
              {
                  cert: ENV.APP_TLS_CERT,
                  key: ENV.APP_TLS_KEY,
              },
              Actinium.app,
          )
        : http.createServer(Actinium.app)
    : Actinium.server;
```

**Configuration Example**:

```json
{
  "APP_TLS_CERT_FILE": "/etc/ssl/certs/actinium.crt",
  "APP_TLS_KEY_FILE": "/etc/ssl/private/actinium.key"
}
```

**Behavior**:
- Files read synchronously on boot
- TLS_MODE enabled only if **both** files exist and are readable
- Server logs TLS_MODE status: `[TLS MODE]` vs `[PLAIN TEXT]`

---

## Security Configuration

### Master Key IP Whitelisting

```javascript
// actinium-core/globals.js:146-148
ENV.MASTER_KEY_IPS = stringToObject(
    op.get(ENV, 'MASTER_KEY_IPS', defaults.masterKeyIps), // Default: ["0.0.0.0/0", "::1"]
);
```

**CIDR Notation** for IP ranges:
- `"0.0.0.0/0"` - All IPv4 addresses (⚠️ insecure, dev only)
- `"::1"` - IPv6 localhost
- `"192.168.1.0/24"` - Internal network range
- `"10.0.0.5"` - Single IP

**Production Best Practice**:

```json
{
  "MASTER_KEY_IPS": ["10.0.0.5", "10.0.0.6"], // Admin server IPs only
  "PARSE_DASHBOARD": false, // Disable public dashboard
  "PARSE_ALLOW_CLIENT_CLASS_CREATION": false // Prevent schema manipulation
}
```

### Parse Dashboard User Authentication

```javascript
// actinium-core/middleware/parse/middleware.js:91-105
const dashboardConfig = {
    trustProxy: 1,
    users: ENV.PARSE_DASHBOARD_USERS, // Array of { user, pass } objects
    apps: [
        {
            appId,
            appName,
            masterKey,
            masterKeyIps,
            sessionLength,
            serverURL,
            publicServerURL,
        },
    ],
};
```

**Configuration**:

```json
{
  "PARSE_DASHBOARD": true,
  "PARSE_DASHBOARD_MOUNT": "/parse",
  "PARSE_DASHBOARD_USERS": [
    { "user": "admin", "pass": "secure-password-here" }
  ],
  "PARSE_DASHBOARD_ALLOW_INSECURE_HTTP": false
}
```

**Security Notes**:
- Dashboard access requires HTTP Basic Auth
- `trustProxy: 1` enables X-Forwarded-* headers behind reverse proxy
- `allowInsecureHTTP: false` forces HTTPS in production

---

## Feature Flags

### Conditional Service Enablement

**NO_PARSE** (actinium-core/middleware/parse/middleware.js:69):
```javascript
if (ENV.NO_PARSE !== true) {
    const server = new ParseServer(parseConfig('parse-server-config'));
    // ... mount Parse Server
}
```

**NO_DOCS** (actinium-core/middleware/docs/middleware.js:6):
```javascript
if (!op.get(ENV, 'NO_DOCS', false)) {
    // ... mount API documentation
}
```

**LIVE_QUERY_SERVER** (actinium-core/actinium.js:210):
```javascript
if (!ENV.NO_PARSE && ENV.LIVE_QUERY_SERVER) {
    await ParseServer.createLiveQueryServer(Actinium.server);
}
```

**Use Cases**:
- `NO_PARSE: true` - Frontend-only server (static file serving)
- `NO_DOCS: true` - Disable public API docs in production
- `LIVE_QUERY_SERVER: false` - Reduce resource usage, disable real-time subscriptions

---

## Real-World Configuration Examples

### Development (env.dev.json)

```json
{
  "APP_ID": "Actinium",
  "APP_NAME": "Actinium Dev",
  "APP_PORT": 9000,
  "DATABASE_URI": "mongodb://localhost:27017/actinium-dev",
  "SERVER_URI": "http://localhost:9000",
  "MASTER_KEY": "dev-master-key",
  "MASTER_KEY_IPS": ["0.0.0.0/0", "::1"],
  "NO_PARSE": false,
  "NO_DOCS": false,
  "PARSE_MOUNT": "/api",
  "PARSE_DASHBOARD": true,
  "PARSE_DASHBOARD_MOUNT": "/parse",
  "PARSE_DASHBOARD_USERS": [{ "user": "admin", "pass": "admin" }],
  "PARSE_ALLOW_CLIENT_CLASS_CREATION": true,
  "LIVE_QUERY_SERVER": true,
  "LIVE_QUERY_SETTINGS": { "classNames": ["Changelog", "Message"] },
  "LOG": true,
  "LOG_LEVEL": "BOOT",
  "RUN_TEST": true,
  "MAX_UPLOAD_SIZE": "50mb"
}
```

### Staging (env.staging.json)

```json
{
  "APP_ID": "Actinium",
  "APP_NAME": "Actinium Staging",
  "DATABASE_URI": "mongodb://user:pass@mongo.staging.internal:27017/actinium",
  "SERVER_URI": "https://staging-api.example.com",
  "PUBLIC_SERVER_URI": "https://staging-api.example.com",
  "MASTER_KEY": "staging-secret-key-here",
  "MASTER_KEY_IPS": ["10.0.1.0/24"],
  "NO_PARSE": false,
  "NO_DOCS": false,
  "PARSE_DASHBOARD": true,
  "PARSE_DASHBOARD_USERS": [{ "user": "admin", "pass": "strong-password" }],
  "PARSE_DASHBOARD_ALLOW_INSECURE_HTTP": false,
  "PARSE_ALLOW_CLIENT_CLASS_CREATION": false,
  "LIVE_QUERY_SERVER": true,
  "LOG": true,
  "LOG_LEVEL": "INFO",
  "RUN_TEST": false,
  "MAX_UPLOAD_SIZE": "100mb",
  "APP_TLS_CERT_FILE": "/etc/ssl/certs/staging.crt",
  "APP_TLS_KEY_FILE": "/etc/ssl/private/staging.key"
}
```

### Production (env.prod.json)

```json
{
  "APP_ID": "Actinium",
  "APP_NAME": "Actinium Production",
  "DATABASE_URI": "mongodb://user:pass@mongo1,mongo2,mongo3:27017/actinium?replicaSet=rs0",
  "SERVER_URI": "https://api.example.com",
  "PUBLIC_SERVER_URI": "https://api.example.com",
  "MASTER_KEY": "REPLACE_WITH_SECURE_RANDOM_KEY",
  "MASTER_KEY_IPS": ["10.0.2.5", "10.0.2.6"],
  "NO_PARSE": false,
  "NO_DOCS": true,
  "PARSE_DASHBOARD": false,
  "PARSE_ALLOW_CLIENT_CLASS_CREATION": false,
  "LIVE_QUERY_SERVER": true,
  "LIVE_QUERY_SETTINGS": { "classNames": ["Changelog"] },
  "LOG": true,
  "LOG_LEVEL": "ERROR",
  "RUN_TEST": false,
  "MAX_UPLOAD_SIZE": "200mb",
  "APP_TLS_CERT_FILE": "/etc/ssl/certs/production.crt",
  "APP_TLS_KEY_FILE": "/etc/ssl/private/production.key"
}
```

**Run with**:
```bash
ACTINIUM_ENV_ID=prod node index.js
```

---

## Docker/Container Deployment Patterns

### Volume-Based Configuration

**Dockerfile**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 9000
CMD ["node", "index.js"]
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  actinium:
    build: .
    ports:
      - "9000:9000"
    environment:
      - ACTINIUM_ENV_FILE=/config/production.json
      - NODE_ENV=production
    volumes:
      - ./config/production.json:/config/production.json:ro
      - ./certs:/etc/ssl/certs:ro
    depends_on:
      - mongodb

  mongodb:
    image: mongo:6
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

### Environment Variable Override

**docker-compose.yml** (env var approach):
```yaml
services:
  actinium:
    build: .
    environment:
      - ACTINIUM_ENV_ID=prod
      - DATABASE_URI=mongodb://mongo:27017/actinium
      - MASTER_KEY=${ACTINIUM_MASTER_KEY}
      - PORT_VAR=PORT
      - PORT=9000
      - SERVER_URI=https://api.example.com
```

**.env** (Docker Compose):
```bash
ACTINIUM_MASTER_KEY=your-secret-master-key-here
```

**Run**:
```bash
docker-compose up -d
```

---

## Multi-Environment Workflow

### Project Structure

```
actinium-project/
├── src/
│   ├── env.json              # Default (not in git)
│   ├── env.dev.json          # Development (auto-generated)
│   ├── env.staging.json      # Staging (gitignored)
│   └── env.prod.json         # Production (gitignored)
├── .env.example              # Template for env vars
├── docker-compose.yml
└── package.json
```

### .gitignore

```
src/env*.json
!src/env.example.json
```

### Deployment Commands

**Development**:
```bash
NODE_ENV=development npm start
# Uses env.dev.json (auto-generated if missing)
```

**Staging**:
```bash
ACTINIUM_ENV_ID=staging NODE_ENV=production npm start
# Uses src/env.staging.json
```

**Production**:
```bash
ACTINIUM_ENV_ID=prod NODE_ENV=production npm start
# Uses src/env.prod.json
```

**Docker Production**:
```bash
docker run -e ACTINIUM_ENV_FILE=/config/prod.json \
  -v $(pwd)/config:/config:ro \
  actinium:latest
```

---

## Best Practices

### 1. **Never Commit Credentials**
- Add `src/env*.json` to `.gitignore`
- Provide `src/env.example.json` template with dummy values
- Use environment variables for secrets in CI/CD

### 2. **Use ACTINIUM_ENV_ID for Multi-Environment**
```bash
# Simple, consistent pattern
ACTINIUM_ENV_ID=dev npm start
ACTINIUM_ENV_ID=staging npm start
ACTINIUM_ENV_ID=prod npm start
```

### 3. **Leverage process.env Override**
```bash
# Override single value without editing JSON
DATABASE_URI=mongodb://newhost:27017/db ACTINIUM_ENV_ID=prod npm start
```

### 4. **Secure Production Master Key Access**
```json
{
  "MASTER_KEY_IPS": ["10.0.0.5"], // Admin server only
  "PARSE_DASHBOARD": false,       // Disable public dashboard
  "NO_DOCS": true                  // Hide API docs
}
```

### 5. **Use TLS in Production**
```json
{
  "APP_TLS_CERT_FILE": "/etc/ssl/certs/actinium.crt",
  "APP_TLS_KEY_FILE": "/etc/ssl/private/actinium.key"
}
```

### 6. **Environment-Specific Logging**
```json
// Development
{ "LOG_LEVEL": "DEBUG", "RUN_TEST": true }

// Production
{ "LOG_LEVEL": "ERROR", "RUN_TEST": false }
```

### 7. **MongoDB Connection Strings**
```json
// Development (single instance)
{ "DATABASE_URI": "mongodb://localhost:27017/actinium" }

// Production (replica set)
{ "DATABASE_URI": "mongodb://user:pass@mongo1,mongo2:27017/actinium?replicaSet=rs0&authSource=admin" }
```

---

## Common Gotchas

### 1. **PORT_VAR Confusion**
**Problem**: Setting `PORT_VAR` but not setting the target variable.

**Wrong**:
```bash
export PORT_VAR=X-Forwarded-Port
# Forgot to set X-Forwarded-Port!
```

**Error**: `No port environment variable found matching PORT_VAR`

**Fix**:
```bash
export PORT_VAR=X-Forwarded-Port
export X-Forwarded-Port=8080
```

### 2. **MASTER_KEY_IPS as String**
**Problem**: JSON array in environment variable needs parsing.

**Wrong**:
```bash
export MASTER_KEY_IPS='["10.0.0.5"]' # String, not array!
```

**Fix**: Use JSON file or rely on stringToObject parsing (works correctly).

### 3. **SERVER_URI Stale Port**
**Problem**: SERVER_URI has wrong port after PORT override.

**Wrong**:
```json
{ "SERVER_URI": "http://api.example.com:9000" }
```
```bash
export PORT=3000
# SERVER_URI still has :9000!
```

**Fix**: Let auto-adjustment work (only works if port in SERVER_URI == DEFAULT_PORT).

**Best**: Explicitly override SERVER_URI in process.env:
```bash
export PORT=3000
export SERVER_URI=http://api.example.com:3000
```

### 4. **Missing env.dev.json Template**
**Problem**: Developer doesn't have env.dev.json, doesn't know what fields to set.

**Solution**: Auto-generation creates it from env.def.json on first run in development.

**Manual Fix**:
```bash
cp actinium_modules/@atomic-reactor/actinium-core/env.def.json src/env.dev.json
```

### 5. **TLS_MODE Not Enabling**
**Problem**: Set cert/key file paths but TLS_MODE still false.

**Causes**:
- Files don't exist at specified paths
- File permissions prevent reading
- Only one file set (need BOTH)

**Debug**:
```javascript
// actinium-core/actinium.js:150-156 logs TLS settings
DEBUG({
    TLS_MODE: ENV.TLS_MODE,
    APP_TLS_CERT_FILE: ENV.APP_TLS_CERT_FILE,
    APP_TLS_KEY_FILE: ENV.APP_TLS_KEY_FILE,
    APP_TLS_CERT: ENV.APP_TLS_CERT, // Should be Buffer
    APP_TLS_KEY: ENV.APP_TLS_KEY,   // Should be Buffer
});
```

### 6. **Boolean Strings Not Converting**
**Problem**: `"NO_PARSE": "true"` treated as truthy string, not boolean.

**Solution**: Use `stringToBoolean` (already applied in globals.js).

**Works Correctly**:
```bash
export NO_PARSE=true  # String "true" → boolean true
export NO_PARSE=false # String "false" → boolean false
```

### 7. **Parse Dashboard Not Starting**
**Problem**: Set `PARSE_DASHBOARD: true` but dashboard not accessible.

**Causes**:
- `NO_PARSE: true` (disables both Parse and dashboard)
- Missing `PARSE_DASHBOARD_USERS` array
- Wrong `PARSE_DASHBOARD_MOUNT` path

**Check**:
```javascript
// actinium-core/middleware/parse/middleware.js:80
if (ENV.PARSE_DASHBOARD === true && !ENV.NO_PARSE) {
    // Dashboard mounts here
}
```

---

## Debugging Environment Configuration

### Check Loaded Environment

Add to actinium-core/actinium.js after boot:

```javascript
console.log('Loaded ENV:', {
    PORT: ENV.PORT,
    SERVER_URI: ENV.SERVER_URI,
    PUBLIC_SERVER_URI: ENV.PUBLIC_SERVER_URI,
    DATABASE_URI: ENV.DATABASE_URI,
    PARSE_MOUNT: ENV.PARSE_MOUNT,
    TLS_MODE: ENV.TLS_MODE,
    // DO NOT LOG MASTER_KEY IN PRODUCTION!
});
```

### Environment File Resolution

```javascript
// Check which file is loaded
const file = environmentFile();
console.log('Using environment file:', file);
console.log('File exists:', fs.existsSync(file));
```

### Process.env Override Verification

```javascript
// Check if process.env overrides file value
console.log('DATABASE_URI in file:', JSON.parse(fs.readFileSync(file)).DATABASE_URI);
console.log('DATABASE_URI in process.env:', process.env.DATABASE_URI);
console.log('Final DATABASE_URI:', ENV.DATABASE_URI);
```

---

## Integration with Other Systems

### Parse Server Initialization
Environment → parseConfig() → ParseServer (actinium-core/middleware/parse/middleware.js:8-66)

### Express Settings
ENV.EXPRESS_OPTIONS → app.set() (actinium-core/lib/express-settings.js:5)

### Middleware Discovery
ENV.GLOB_MIDDLEWARE → globby patterns (actinium-core/lib/middleware.js)

### Plugin Discovery
ENV.GLOB_PLUGINS → DDD auto-discovery (actinium-core/lib/plugable-config.js)

### Cloud Function Discovery
ENV.GLOB_CLOUD → DDD auto-discovery (actinium-core/lib/plugable-config.js)

### Static File Serving
ENV.STATIC_PATH → express.static() mount

---

## Complete Environment Variable Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ACTINIUM_ENV_FILE` | String | - | Absolute path to environment JSON file |
| `ACTINIUM_ENV_ID` | String | - | Environment ID (e.g., `dev`, `prod`) |
| `PORT_VAR` | String | - | Name of env var containing port (for cloud platforms) |
| `APP_PORT` | Number | 9000 | Application port (priority over PORT) |
| `PORT` | Number | 9000 | Application port (standard) |
| `SERVER_URI` | String | `http://localhost:9000` | Internal server URL |
| `PUBLIC_SERVER_URI` | String | SERVER_URI | Public-facing server URL |
| `APP_ID` | String | "Actinium" | Parse Server app ID |
| `APP_NAME` | String | "Actinium" | Application name (for logging) |
| `MASTER_KEY` | String | - | Parse Server master key (⚠️ secret) |
| `MASTER_KEY_IPS` | Array | `["0.0.0.0/0", "::1"]` | CIDR IP whitelist for master key |
| `DATABASE_URI` | String | - | MongoDB connection string |
| `PARSE_MOUNT` | String | "/api" | Parse Server mount path |
| `PARSE_DASHBOARD` | Boolean | false | Enable Parse Dashboard |
| `PARSE_DASHBOARD_MOUNT` | String | "/parse" | Dashboard mount path |
| `PARSE_DASHBOARD_USERS` | Array | - | Dashboard auth users `[{user, pass}]` |
| `PARSE_DASHBOARD_ALLOW_INSECURE_HTTP` | Boolean | true | Allow HTTP (dev only) |
| `PARSE_ALLOW_CLIENT_CLASS_CREATION` | Boolean | false | Allow client schema changes |
| `NO_PARSE` | Boolean | false | Disable Parse Server |
| `NO_DOCS` | Boolean | false | Disable API documentation |
| `LIVE_QUERY_SERVER` | Boolean | false | Enable Live Query subscriptions |
| `LIVE_QUERY_SETTINGS` | Object | - | Live Query config `{classNames: [...]}` |
| `LOG` | Boolean | true | Enable logging |
| `LOG_LEVEL` | String | "ERROR" | Log level (ERROR, WARN, INFO, DEBUG, BOOT) |
| `RUN_TEST` | Boolean | true | Enable test mode |
| `MAX_UPLOAD_SIZE` | String | "50mb" | Max file upload size |
| `APP_TLS_CERT_FILE` | String | - | Path to TLS certificate file |
| `APP_TLS_KEY_FILE` | String | - | Path to TLS private key file |
| `EXPRESS_OPTIONS` | Object | `{...}` | Express app.set() options (JSON string) |
| `GLOB_CLOUD` | Array | `[...]` | Cloud function discovery patterns |
| `GLOB_PLUGINS` | Array | `[...]` | Plugin discovery patterns |
| `GLOB_MIDDLEWARE` | Array | `[...]` | Middleware discovery patterns |
| `STATIC_PATH` | String | `./public` | Static file directory |

---

## Summary

Actinium's environment configuration system provides:

1. **Flexible resolution**: ACTINIUM_ENV_FILE → ACTINIUM_ENV_ID → default
2. **Override hierarchy**: process.env > JSON file > defaults
3. **Special PORT handling**: PORT_VAR indirection for cloud platforms
4. **Auto-generated URIs**: SERVER_URI port adjustment
5. **Dev conveniences**: Auto-generate env.dev.json from template
6. **Security features**: IP whitelisting, TLS file loading, dashboard auth
7. **Feature flags**: NO_PARSE, NO_DOCS, LIVE_QUERY_SERVER
8. **Type normalization**: String → boolean/object/array parsing

**Key insight for Claude**: Environment configuration is the **first thing loaded** in Actinium boot sequence - understanding this system is critical for debugging deployment issues, advising on multi-environment setup, and explaining configuration errors.
