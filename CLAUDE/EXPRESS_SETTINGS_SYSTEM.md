<!-- v1.0.0 -->

# Express Settings System (Actinium.Exp)

## Overview

The Express Settings System provides centralized configuration for the Express application instance in Actinium. It runs early in the initialization lifecycle (before middleware and plugins) to configure core Express app settings like view engines, static paths, security headers, and proxy trust.

**Key Characteristics:**
- Fires BEFORE middleware registration
- Configured via `ENV.EXPRESS_OPTIONS` environment variable
- Applies settings via `app.set(key, value)`
- Hook-extensible via `init` hook for custom configuration
- Simple, predictable key-value configuration model

## Architecture

### Initialization Sequence

```
Actinium.init() called
  ├─ 1. Express app created (line 77)
  ├─ 2. Actinium.Exp.init(app, options) (line 81) ← EXPRESS SETTINGS APPLIED HERE
  ├─ 3. Actinium.Middleware.init(app) (line 84)
  ├─ 4. Actinium.Plugin.init() (line 87)
  ├─ 5. Hook: 'init' (line 101) ← Custom Express config can hook here
  └─ 6. Ready state, server can start
```

**Source:** `actinium-core/actinium.js:77-101`

### Core Implementation

**File:** `actinium-core/lib/express-settings.js:1-16`

```javascript
export default {
    init: (app, opt) => {
        const options = { ...ENV.EXPRESS_OPTIONS, ...opt };
        Object.entries(options).forEach(([key, value]) => {
            app.set(key, value);
            BOOT(
                chalk.cyan('  Express'),
                `${key}`,
                chalk.cyan('→'),
                chalk.magenta(value),
            );
        });
    },
};
```

**How it works:**
1. Merges `ENV.EXPRESS_OPTIONS` (from environment) with runtime `opt` parameter
2. Iterates all key-value pairs
3. Calls `app.set(key, value)` for each setting
4. Logs each setting to boot console

## Configuration

### Default Settings

**File:** `actinium-core/globals.js:70-74`

```javascript
const defaults = {
    express: {
        views: APP_DIR + '/view',
        'view engine': 'ejs',
        'x-powered-by': false,
    },
};
```

**Loaded at:** `actinium-core/globals.js:109-111`

```javascript
ENV.EXPRESS_OPTIONS = stringToObject(
    op.get(ENV, 'EXPRESS_OPTIONS', defaults.express),
);
```

### Environment Variable Configuration

Set via `.env` file or environment:

```bash
# Option 1: JSON string (recommended for multiple settings)
EXPRESS_OPTIONS='{"view engine": "pug", "trust proxy": true, "x-powered-by": false}'

# Option 2: Programmatic (in custom boot script)
process.env.EXPRESS_OPTIONS = JSON.stringify({
    'view engine': 'ejs',
    'views': '/path/to/views',
    'trust proxy': 1,
    'x-powered-by': false,
    'etag': 'strong',
    'json spaces': 2,
});
```

### Runtime Configuration

Pass options to `Actinium.init()`:

```javascript
await Actinium.init({
    'view engine': 'handlebars',
    'trust proxy': 'loopback, linklocal, uniquelocal',
});
```

Runtime options **override** `ENV.EXPRESS_OPTIONS` via spread operator merge.

## Common Express Settings

### View Engine Configuration

```javascript
ENV.EXPRESS_OPTIONS = {
    'views': '/path/to/templates',      // Template directory
    'view engine': 'ejs',                // Default: 'ejs'
    'view cache': true,                  // Cache compiled templates (production)
};
```

**Use cases:**
- Custom template engines (Pug, Handlebars, Nunjucks)
- Server-side rendering with custom views
- Email template rendering

### Proxy Configuration

```javascript
ENV.EXPRESS_OPTIONS = {
    'trust proxy': true,                 // Trust first proxy
    'trust proxy': 1,                    // Trust first hop
    'trust proxy': 'loopback',           // Trust localhost only
    'trust proxy': ['loopback', '10.0.0.0/8'], // Trust specific subnets
};
```

**Critical for:**
- Load balancers (AWS ELB, nginx, HAProxy)
- Correct IP address detection (`req.ip`)
- HTTPS redirect detection (`req.protocol`)
- Cookie security (`secure` flag)

**Source:** Express documentation on `trust proxy` setting

### Security Headers

```javascript
ENV.EXPRESS_OPTIONS = {
    'x-powered-by': false,               // Default: false (hide Express)
    'etag': 'weak',                      // ETag generation: 'weak', 'strong', false
};
```

### JSON Response Formatting

```javascript
ENV.EXPRESS_OPTIONS = {
    'json spaces': 2,                    // Pretty-print JSON responses
    'json replacer': null,               // JSON.stringify replacer function
    'json escape': true,                 // Escape JSON for HTML safety
};
```

### Static File Serving

```javascript
ENV.EXPRESS_OPTIONS = {
    'case sensitive routing': false,     // /Foo != /foo when true
    'strict routing': false,             // /foo/ != /foo when true
};
```

## Hook Integration

### Custom Express Configuration via `init` Hook

The `init` hook fires **after** `Actinium.Exp.init()` but before middleware, allowing plugins to add custom Express configuration:

**Hook signature:** `Actinium.Hook.run('init', app, options)`

**Example: Custom Setting via Hook**

```javascript
// In plugin file or custom initialization
Actinium.Hook.register('init', async (app, options) => {
    // Add custom Express settings
    app.set('custom setting', 'value');

    // Configure trust proxy for AWS ELB
    app.set('trust proxy', 1);

    // Disable etag for API responses
    app.set('etag', false);

    // Configure JSON formatting
    app.set('json spaces', process.env.NODE_ENV === 'production' ? 0 : 2);
});
```

**File:** `actinium-core/actinium.js:101`

## Real-World Usage Patterns

### Pattern 1: Load Balancer Deployment

**Scenario:** Actinium behind nginx/AWS ELB

```javascript
// .env
EXPRESS_OPTIONS='{"trust proxy": 1, "x-powered-by": false}'
```

**Why:** Ensures `req.ip` reflects actual client IP, not proxy IP.

### Pattern 2: Custom Template Engine

**Scenario:** Using Handlebars instead of EJS

```javascript
// In custom plugin
import handlebars from 'express-handlebars';

Actinium.Hook.register('init', async (app) => {
    // Configure Handlebars engine
    app.engine('hbs', handlebars({
        extname: '.hbs',
        defaultLayout: 'main',
    }));

    // Set as default view engine
    app.set('view engine', 'hbs');
    app.set('views', path.join(BASE_DIR, 'templates'));
});
```

### Pattern 3: Environment-Specific Configuration

```javascript
// boot.js or custom initialization
const expressOptions = {
    'x-powered-by': false,
    'etag': 'strong',
};

if (process.env.NODE_ENV === 'production') {
    expressOptions['view cache'] = true;        // Cache templates
    expressOptions['json spaces'] = 0;          // Minify JSON
} else {
    expressOptions['view cache'] = false;       // No cache for dev
    expressOptions['json spaces'] = 2;          // Pretty JSON
}

process.env.EXPRESS_OPTIONS = JSON.stringify(expressOptions);
```

### Pattern 4: Multi-Tenant Custom Domains

```javascript
Actinium.Hook.register('init', async (app) => {
    // Enable subdomain routing
    app.set('subdomain offset', 2);

    // Trust proxy for correct hostname detection
    app.set('trust proxy', true);
});
```

## Integration with Middleware System

Express settings **MUST** be configured before middleware registration because:

1. **Middleware order matters** - Settings affect how middleware interprets requests
2. **Trust proxy affects middleware behavior**:
   - `req.ip` detection in logging middleware
   - `req.protocol` in CORS middleware
   - Cookie `secure` flag enforcement
3. **View engine needed for error handlers** - Some middleware render error pages

**Execution order (guaranteed):**

```
Actinium.Exp.init(app)        ← Settings applied
     ↓
Actinium.Middleware.init(app) ← Middleware uses settings
     ↓
Actinium.Plugin.init()        ← Plugins loaded
```

**Source:** `actinium-core/actinium.js:81-87`

## Environment Variables Reference

| Variable            | Type   | Default                                      | Description                        |
| ------------------- | ------ | -------------------------------------------- | ---------------------------------- |
| `EXPRESS_OPTIONS`   | JSON   | `{"view engine": "ejs", "x-powered-by": false, "views": "/path/to/app/view"}` | Express app.set() key-value pairs |
| `APP_DIR`           | String | `{BASE_DIR}/src/app`                        | Application directory (used in views path) |

**Source:** `actinium-core/globals.js:38, 70-74, 109-111`

## Complete Express Settings Reference

**Commonly used Express settings** (subset relevant to Actinium):

| Setting                 | Type              | Default | Description                                   |
| ----------------------- | ----------------- | ------- | --------------------------------------------- |
| `view engine`           | String            | `ejs`   | Default template engine                       |
| `views`                 | String/Array      | `APP_DIR + '/view'` | Template directory path(s)          |
| `view cache`            | Boolean           | `false` (dev) | Cache compiled templates                |
| `trust proxy`           | Boolean/String/Array | `false` | Trust proxy headers (X-Forwarded-*)      |
| `x-powered-by`          | Boolean           | `false` | Send X-Powered-By: Express header             |
| `etag`                  | String/Boolean    | `weak`  | ETag generation: `weak`, `strong`, `false`    |
| `json spaces`           | Number            | `0`     | JSON.stringify spaces (pretty-print)          |
| `json replacer`         | Function          | `null`  | JSON.stringify replacer                       |
| `json escape`           | Boolean           | `true`  | Escape JSON for HTML contexts                 |
| `case sensitive routing`| Boolean           | `false` | Treat `/Foo` and `/foo` as different          |
| `strict routing`        | Boolean           | `false` | Treat `/foo/` and `/foo` as different         |
| `subdomain offset`      | Number            | `2`     | Dots to remove for subdomain access           |

**Full list:** [Express API Documentation - app.set()](http://expressjs.com/en/4x/api.html#app.set)

## Best Practices

### ✅ DO

1. **Set `trust proxy` when behind load balancer**
   ```javascript
   EXPRESS_OPTIONS='{"trust proxy": 1}'
   ```

2. **Disable `x-powered-by` for security**
   ```javascript
   EXPRESS_OPTIONS='{"x-powered-by": false}'
   ```

3. **Use environment-specific configuration**
   ```javascript
   const opts = process.env.NODE_ENV === 'production'
       ? { 'view cache': true, 'json spaces': 0 }
       : { 'view cache': false, 'json spaces': 2 };
   ```

4. **Configure via `ENV.EXPRESS_OPTIONS` for static settings**
   - Use `.env` file for deployment-specific configuration

5. **Use `init` hook for dynamic/conditional settings**
   - Programmatic configuration based on runtime conditions

### ❌ DON'T

1. **Don't configure Express settings in middleware**
   - Too late in initialization sequence
   - Settings won't affect earlier middleware

2. **Don't forget `trust proxy` behind reverse proxies**
   - Breaks IP detection, HTTPS redirects, cookie security
   - Common deployment mistake

3. **Don't hardcode production settings in code**
   - Use environment variables for deployment flexibility

4. **Don't override settings inconsistently**
   - Choose ONE source: `ENV.EXPRESS_OPTIONS` OR `init()` parameter OR `init` hook
   - Multiple sources create confusion

## Common Gotchas

### 1. **Settings Applied Too Late**

**Problem:** Trying to configure Express settings in a plugin's `start` hook

```javascript
// ❌ WRONG - Too late, middleware already initialized
Actinium.Hook.register('start', async (app) => {
    app.set('trust proxy', true); // Won't affect middleware
});
```

**Solution:** Use `init` hook or `ENV.EXPRESS_OPTIONS`

```javascript
// ✅ CORRECT - Runs before middleware
Actinium.Hook.register('init', async (app) => {
    app.set('trust proxy', true);
});
```

### 2. **JSON Parsing in Environment Variables**

**Problem:** `EXPRESS_OPTIONS` not parsed as JSON

```bash
# ❌ WRONG - Interpreted as string, not object
EXPRESS_OPTIONS={"view engine": "pug"}
```

**Solution:** Properly quote JSON string

```bash
# ✅ CORRECT - Single quotes around JSON
EXPRESS_OPTIONS='{"view engine": "pug"}'
```

### 3. **Trust Proxy Misconfiguration**

**Problem:** `req.ip` shows proxy IP instead of client IP

```javascript
// Behind AWS ELB, but trust proxy not set
console.log(req.ip); // → "10.0.0.5" (load balancer IP)
```

**Solution:** Enable trust proxy

```javascript
app.set('trust proxy', 1);
console.log(req.ip); // → "203.0.113.42" (actual client IP)
```

### 4. **View Engine Not Found**

**Problem:** Custom view engine not registered before use

```javascript
// ❌ WRONG - Setting engine before registering
app.set('view engine', 'hbs'); // Error: Cannot find module 'hbs'
```

**Solution:** Register engine THEN set as default

```javascript
// ✅ CORRECT
app.engine('hbs', handlebars({ /* options */ }));
app.set('view engine', 'hbs');
```

## Debugging

### View Current Settings

```javascript
Actinium.Hook.register('init', async (app) => {
    console.log('View Engine:', app.get('view engine'));
    console.log('Views Path:', app.get('views'));
    console.log('Trust Proxy:', app.get('trust proxy'));
    console.log('X-Powered-By:', app.get('x-powered-by'));
});
```

### Boot Log Output

Settings are logged during startup:

```
[12:34:56] [Actinium] Initializing...
[12:34:56] [Actinium]   Express view engine → ejs
[12:34:56] [Actinium]   Express views → /app/src/app/view
[12:34:56] [Actinium]   Express x-powered-by → false
```

## Source References

| File                                 | Lines      | Description                                 |
| ------------------------------------ | ---------- | ------------------------------------------- |
| `actinium-core/lib/express-settings.js` | 1-16    | Core implementation                         |
| `actinium-core/actinium.js`          | 77-101     | Initialization sequence, `init` hook        |
| `actinium-core/globals.js`           | 70-74, 109-111 | Default settings, ENV loading           |
| `actinium-core/boot.js`              | 1-100      | Environment variable processing             |

## Related Documentation

- [Middleware Auto-Discovery](./MIDDLEWARE_AUTO_DISCOVERY.md) - Runs AFTER Express settings
- [Parse Server Cloud Function Patterns](./PARSE_SERVER_CLOUD_FUNCTIONS.md) - Uses Express app
- [SSR Architecture](./SSR_ARCHITECTURE.md) - Requires view engine configuration

## Key Takeaways

1. **Timing is critical** - Express settings MUST be configured before middleware
2. **ENV.EXPRESS_OPTIONS** is the primary configuration mechanism
3. **`init` hook** allows programmatic/dynamic configuration
4. **Trust proxy** is the most commonly needed setting for production deployments
5. **All standard Express settings** are supported via `app.set(key, value)`
6. **Settings are logged** to boot console for visibility

Express Settings System provides the foundation for Express app configuration in Actinium, running early in the initialization sequence to ensure all middleware and plugins operate with correct settings.
