<!-- v1.0.0 -->
# Reactium Server-Side Routing and Middleware

Complete documentation for Express router configuration, basic authentication, health checks, custom headers, SSR integration, redirect handling, and error patterns in Reactium.

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/server/router.mjs:1-94`

---

## Overview

Reactium's server-side routing handles:
- Basic HTTP authentication via `.htpasswd` file
- Health check endpoints for load balancers
- SSR (Server-Side Rendering) for HTML requests
- Static file serving (delegated to subsequent middleware)
- Custom response headers via hooks
- Redirect handling from React Router
- Error handling with proper status codes

**NOT covered here**: Actinium server routing (separate Express app) - see Actinium middleware docs

---

## Router Architecture

### Request Flow

```
Incoming Request
  ↓
Basic Auth (if .htpasswd exists) → Skip for /elb-healthcheck
  ↓
Health Check Endpoint (GET /elb-healthcheck) → Return "Up"
  ↓
Main SSR Middleware
  ├─ File extension check (.html, .htm, '' → SSR)
  ├─ Renderer execution (React SSR)
  ├─ Redirect handling (context.url from React Router)
  ├─ Server.ResponseHeaders hook (sync + async)
  ├─ Status code determination (404 for /404 or context.notFound)
  └─ Send HTML response
  ↓
Next() for static assets (.js, .css, images, etc.)
```

**Source**: `router.mjs:35-92`

---

## Basic Authentication

### File-Based Auth with `.htpasswd`

```javascript
// Conditional basic auth
const basicAuthFile = path.resolve(process.env.BASIC_AUTH_FILE || '.htpasswd');
if (fs.existsSync(basicAuthFile)) {
    router.use((req, res, next) => {
        if (req.url !== '/elb-healthcheck') {
            let basic = httpAuth.basic({
                realm: 'Reactium.',
                file: basicAuthFile,
            });

            httpAuth.connect(basic)(req, res, next);
        } else {
            next();
        }
    });
}
```

**Source**: `router.mjs:12-26`

### Configuration

**Environment Variable**:
- `BASIC_AUTH_FILE`: Path to `.htpasswd` file (default: `./.htpasswd`)

**`.htpasswd` Format** (Apache-style):
```
username:$apr1$salt$hashedpassword
```

**Generate Credentials** (using htpasswd CLI tool):
```bash
# Install apache2-utils (Ubuntu/Debian) or httpd-tools (RHEL/CentOS)
htpasswd -c .htpasswd username
```

**Behavior**:
- If file exists → Basic auth enabled for ALL routes EXCEPT `/elb-healthcheck`
- If file doesn't exist → No authentication required
- Uses `http-auth` NPM package with Apache basic auth

**Real-World Patterns**:
1. **Staging Environment Protection**: Create `.htpasswd` in staging, omit in production
2. **Development Sharing**: Password-protect dev server when exposing publicly
3. **Preview Deployments**: Secure PR preview environments

**Common Gotchas**:
- ❌ File path relative to process.cwd(), NOT server directory
- ❌ Health check MUST skip auth or load balancers fail
- ❌ `.htpasswd` in .gitignore or credentials committed to repo
- ❌ Forgotten basic auth credentials block automated testing

---

## Health Check Endpoint

### Load Balancer Integration

```javascript
router.get('/elb-healthcheck', (req, res) => res.send('Up'));
```

**Source**: `router.mjs:28`

**Purpose**:
- AWS Elastic Load Balancer (ELB) health checks
- Kubernetes liveness/readiness probes
- Uptime monitoring services

**Why `/elb-healthcheck`**:
- Skips basic authentication
- Lightweight response (no SSR overhead)
- Standard route name for AWS deployments

**Real-World Patterns**:
```javascript
// Custom health check with dependencies
router.get('/elb-healthcheck', async (req, res) => {
    try {
        // Check database connection
        await Parse.Query(new Parse.Query('_User').limit(1).find({ useMasterKey: true }));

        // Check critical services
        if (!someRequiredService.isReady()) {
            return res.status(503).send('Service Unavailable');
        }

        res.send('Up');
    } catch (err) {
        res.status(503).send('Database Unavailable');
    }
});
```

**Common Gotchas**:
- ❌ Health check performs expensive operations (slow load balancer checks)
- ❌ Health check doesn't skip basic auth (load balancer fails authentication)
- ❌ Typo in URL (load balancer marks instance unhealthy)

---

## SSR Middleware

### Extension-Based Routing

```javascript
router.use(async (req, res, next) => {
    const [url] = req.originalUrl.split('?');
    const parsed = path.parse(path.basename(url));

    // Slim down index.html handling to paths that aren't handling a file extension
    if (['', 'htm', 'html'].includes(parsed.ext)) {
        // ... SSR logic
    } else {
        // let assets naturally 404, or be handled by subsequent middleware
        next();
    }
});
```

**Source**: `router.mjs:35-91`

**Decision Logic**:
- `parsed.ext === ''` → SSR (e.g., `/about`, `/blog/post`)
- `parsed.ext === 'html'` → SSR (e.g., `/index.html`)
- `parsed.ext === 'htm'` → SSR (rare, legacy support)
- `parsed.ext === 'js'` → `next()` → Static file middleware
- `parsed.ext === 'css'` → `next()` → Static file middleware
- `parsed.ext === 'png'` → `next()` → Static file middleware

**Why This Pattern**:
- Prevents SSR overhead for asset requests (performance)
- Allows static middleware to serve .js/.css/.png files
- Supports both `/about` and `/about.html` routes

---

### Renderer Integration

```javascript
const context = {};

try {
    const content = await renderer(req, res, context);

    // React Router redirect handling
    if (context.url) {
        INFO('Redirecting to ', context.url);
        return res.redirect(302, context.url);
    }

    // ... headers, status, send
} catch (err) {
    ERROR('React Server Error', err);
    res.status(500).send('[Reactium] Internal Server Error');
}
```

**Source**: `router.mjs:41-87`

**Context Object** (mutated by React Router):
- `context.url`: Redirect target (set by `<Redirect>` component during SSR)
- `context.notFound`: Boolean flag (set by NotFound route match)
- `context.*`: Custom properties from route components

**Real-World Example**:
```javascript
// In React component (SSR)
import { Redirect } from 'react-router-dom';

const LoginRequired = ({ user }) => {
    if (!user) {
        // Sets context.url during SSR
        return <Redirect to="/login" />;
    }
    return <Dashboard />;
};
```

**Redirect Flow**:
1. React Router detects `<Redirect>` during SSR
2. Sets `context.url = '/login'`
3. Server checks `if (context.url)` → sends 302 redirect
4. Browser requests `/login` → SSR renders login page

---

## Custom Response Headers

### Server.ResponseHeaders Hook

```javascript
const responseHeaders = {};

/**
 * @api {Hook} Server.ResponseHeaders Server.ResponseHeaders
 * @apiName Server.ResponseHeaders
 * @apiDescription On html template responses on server, this hook is called
 when HTTP headers are added to the response. Both sync and async hook is called.
 * @apiParam {Object} responseHeaders object with key pairs (header name => header value)
 * @apiParam {Object} req Node/Express request object
 * @apiParam {Object} res Node/Express response object
 * @apiGroup Hooks
 */
ReactiumBoot.Hook.runSync(
    'Server.ResponseHeaders',
    responseHeaders,
    req,
    res,
);
await ReactiumBoot.Hook.run(
    'Server.ResponseHeaders',
    responseHeaders,
    req,
    res,
);
Object.entries(responseHeaders).forEach(([key, value]) =>
    res.set(key, value),
);
```

**Source**: `router.mjs:50-76`

**Pattern**: Mutation-based header accumulation
- Hook handlers mutate `responseHeaders` object
- Both sync and async hooks supported
- Final headers applied via `res.set(key, value)`

**Real-World Examples**:

```javascript
// Security headers
ReactiumBoot.Hook.registerSync('Server.ResponseHeaders', (responseHeaders) => {
    responseHeaders['X-Frame-Options'] = 'SAMEORIGIN';
    responseHeaders['X-Content-Type-Options'] = 'nosniff';
    responseHeaders['X-XSS-Protection'] = '1; mode=block';
    responseHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
});

// CORS headers (async example)
ReactiumBoot.Hook.register('Server.ResponseHeaders', async (responseHeaders, req) => {
    const allowedOrigins = await getAllowedOrigins(); // Database lookup
    if (allowedOrigins.includes(req.headers.origin)) {
        responseHeaders['Access-Control-Allow-Origin'] = req.headers.origin;
        responseHeaders['Access-Control-Allow-Credentials'] = 'true';
    }
});

// Cache control based on route
ReactiumBoot.Hook.registerSync('Server.ResponseHeaders', (responseHeaders, req) => {
    if (req.url.startsWith('/blog')) {
        responseHeaders['Cache-Control'] = 'public, max-age=3600';
    } else {
        responseHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    }
});

// Custom headers for monitoring
ReactiumBoot.Hook.registerSync('Server.ResponseHeaders', (responseHeaders) => {
    responseHeaders['X-Rendered-By'] = 'Reactium-SSR';
    responseHeaders['X-Render-Time'] = Date.now().toString();
});
```

**Common Gotchas**:
- ❌ Setting headers AFTER response sent (use hook, not res.set directly in component)
- ❌ Conflicting header values (last hook wins, no merge logic)
- ❌ Not checking existing headers before overwriting
- ❌ Forgetting both sync AND async hooks run (duplicate headers if not careful)

---

## Status Code Handling

### 404 Detection

```javascript
let status = 200;
if (/^\/404/.test(req.path) || context.notFound) {
    status = 404;
}

res.status(status).send(content);
```

**Source**: `router.mjs:78-83`

**Two Methods**:
1. **Path-based**: URL starts with `/404` → 404 status
2. **Context-based**: React Router sets `context.notFound = true` → 404 status

**Real-World Example**:
```javascript
// In React Router config
import { Route, Switch } from 'react-router-dom';

const Routes = () => (
    <Switch>
        <Route exact path="/" component={Home} />
        <Route exact path="/about" component={About} />
        <Route component={NotFound} /> {/* Sets context.notFound during SSR */}
    </Switch>
);

// In NotFound component
const NotFound = (props) => {
    if (props.staticContext) {
        props.staticContext.notFound = true; // SSR only
    }
    return <div>404 - Page Not Found</div>;
};
```

**Why Two Methods**:
- Path-based: Quick check for explicit 404 routes
- Context-based: React Router match result (more accurate)

**Common Gotchas**:
- ❌ Returning 200 for 404 pages (bad for SEO)
- ❌ Not setting `context.notFound` in NotFound component
- ❌ Checking `req.url` instead of `req.path` (query params interfere)

---

## Error Handling

### Unhandled Promise Rejections

```javascript
process.on('unhandledRejection', (reason, p) => {
    ERROR('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});
```

**Source**: `router.mjs:30-33`

**Purpose**:
- Catch async errors not handled in try/catch
- Prevent silent failures in SSR
- Log critical errors for debugging

**Common Causes**:
- Database query errors without `.catch()`
- File I/O errors without error handling
- External API failures

**Real-World Pattern**:
```javascript
process.on('unhandledRejection', (reason, p) => {
    ERROR('Unhandled Rejection at: Promise', p, 'reason:', reason);

    // Send to error tracking service
    if (process.env.SENTRY_DSN) {
        Sentry.captureException(reason);
    }

    // In production, exit process (PM2/Docker will restart)
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});
```

### SSR Error Handling

```javascript
try {
    const content = await renderer(req, res, context);
    // ... success path
} catch (err) {
    ERROR('React Server Error', err);
    res.status(500).send('[Reactium] Internal Server Error');
}
```

**Source**: `router.mjs:84-87`

**Error Response**:
- Status: 500
- Body: `'[Reactium] Internal Server Error'`
- No stack trace exposed (security)

**Real-World Enhancement**:
```javascript
try {
    const content = await renderer(req, res, context);
    // ... success path
} catch (err) {
    ERROR('React Server Error', err);

    // Development: Send detailed error
    if (process.env.NODE_ENV === 'development') {
        res.status(500).send(`
            <h1>React Server Error</h1>
            <pre>${err.stack}</pre>
        `);
    } else {
        // Production: Generic error page
        res.status(500).send('[Reactium] Internal Server Error');
    }

    // Track error
    Sentry.captureException(err);
}
```

---

## Integration with SSR Renderer

### Hook Lifecycle During SSR

**Complete hook sequence** (see SSR_ARCHITECTURE.md for details):

1. `Server.beforeApp` → Pre-render setup
2. `Server.AppGlobals` → Global variables (window.*)
3. `Server.AppHeaders` → `<head>` meta tags, title
4. `Server.AppScripts` → `<script>` tags
5. `Server.AppStyleSheets` → `<link rel="stylesheet">` tags
6. `Server.AppBindings` → Bind point markup
7. `Server.AppSnippets` → Raw HTML snippets
8. `Server.afterApp` → Post-render cleanup
9. **`Server.ResponseHeaders`** → HTTP headers (router.mjs)

**Router's Role**:
- Calls `renderer(req, res, context)` → Full SSR lifecycle
- Runs `Server.ResponseHeaders` hook → Custom HTTP headers
- Applies status code → 200, 404, or 500
- Sends final HTML response

**Source**: `router.mjs:44-83`, `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/server/renderer/index.mjs:1-654`

---

## Best Practices

### Security

1. **Basic Auth**:
   - Never commit `.htpasswd` to version control
   - Use environment-specific files (`.htpasswd.staging`, `.htpasswd.dev`)
   - Rotate passwords regularly

2. **Headers**:
   ```javascript
   ReactiumBoot.Hook.registerSync('Server.ResponseHeaders', (responseHeaders) => {
       // Security headers
       responseHeaders['X-Frame-Options'] = 'SAMEORIGIN';
       responseHeaders['X-Content-Type-Options'] = 'nosniff';
       responseHeaders['X-XSS-Protection'] = '1; mode=block';
       responseHeaders['Referrer-Policy'] = 'strict-origin-when-cross-origin';

       // HTTPS only
       if (process.env.NODE_ENV === 'production') {
           responseHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
       }
   });
   ```

3. **Error Handling**:
   - Never expose stack traces in production
   - Log errors to external service (Sentry, LogRocket)
   - Return generic error messages

### Performance

1. **Health Check**:
   - Keep lightweight (no database queries)
   - Skip authentication
   - Return plain text (no JSON overhead)

2. **SSR**:
   - Extension check prevents SSR for assets
   - Cache rendered pages (via Server.beforeApp hook)
   - Use CDN for static files

3. **Headers**:
   - Set cache headers based on content type
   - Use sync hooks when possible (avoid await overhead)

### Deployment

1. **Load Balancer**:
   - Configure health check: `GET /elb-healthcheck`
   - Interval: 30 seconds
   - Timeout: 5 seconds
   - Healthy threshold: 2 consecutive successes

2. **Environment Variables**:
   ```bash
   # Production
   BASIC_AUTH_FILE=/dev/null  # Disable basic auth
   NODE_ENV=production

   # Staging
   BASIC_AUTH_FILE=./.htpasswd.staging
   NODE_ENV=production

   # Development
   BASIC_AUTH_FILE=./.htpasswd.dev
   NODE_ENV=development
   ```

3. **Process Manager** (PM2, Docker):
   - Restart on unhandled rejection
   - Log rotation for ERROR() calls
   - Multiple instances behind load balancer

---

## Common Gotchas

### Basic Auth

1. ❌ **Health check requires auth**: Load balancer fails
   - ✅ Solution: `if (req.url !== '/elb-healthcheck')` check in router.mjs:15

2. ❌ **Relative path confusion**: `.htpasswd` not found
   - ✅ Solution: Use absolute path via `path.resolve()`

3. ❌ **Credentials in repo**: Security risk
   - ✅ Solution: Add `.htpasswd*` to `.gitignore`

### SSR

4. ❌ **Assets trigger SSR**: Slow performance
   - ✅ Solution: Extension check (`['', 'htm', 'html'].includes(parsed.ext)`)

5. ❌ **404 returns 200**: SEO issues
   - ✅ Solution: Set `context.notFound = true` in NotFound component

6. ❌ **Headers set after send**: Error thrown
   - ✅ Solution: Use `Server.ResponseHeaders` hook, not `res.set()` directly

### Error Handling

7. ❌ **Unhandled rejections crash server**: No logs
   - ✅ Solution: `process.on('unhandledRejection')` handler in router.mjs:30

8. ❌ **Stack traces in production**: Security risk
   - ✅ Solution: Environment check before sending detailed errors

9. ❌ **Silent failures**: No error tracking
   - ✅ Solution: Integrate Sentry, LogRocket, or CloudWatch

---

## Comparison with Actinium

| Feature                  | Reactium (Frontend SSR) | Actinium (Backend API) |
|--------------------------|-------------------------|------------------------|
| **Express App**          | Single router           | Full Express app       |
| **Purpose**              | SSR + static files      | REST/GraphQL API       |
| **Basic Auth**           | File-based (.htpasswd)  | Parse Server auth      |
| **Middleware**           | Minimal (router only)   | Extensive (see MIDDLEWARE_AUTO_DISCOVERY.md) |
| **Error Handling**       | Generic 500 message     | Detailed error responses |
| **Health Check**         | `/elb-healthcheck`      | Parse Server `/health` |
| **Custom Headers**       | Server.ResponseHeaders hook | Express settings, middleware |

**Key Difference**: Reactium router focuses on SSR, Actinium focuses on API

---

## Related Documentation

- **[SSR Architecture](./SSR_ARCHITECTURE.md)** - Complete renderer lifecycle, hook sequence, template system
- **[Middleware Auto-Discovery (Actinium)](./MIDDLEWARE_AUTO_DISCOVERY.md)** - Backend middleware patterns
- **[Hook System](./HOOKS_SYSTEM.md)** - Hook registration, execution, domains
- **[Express Settings (Actinium)](./EXPRESS_SETTINGS.md)** - Actinium Express app configuration

---

## Summary

**Reactium Server-Side Routing provides**:
- ✅ File-based basic authentication (.htpasswd)
- ✅ Load balancer health check endpoint
- ✅ SSR for HTML requests, static serving for assets
- ✅ Hook-driven custom HTTP headers
- ✅ React Router redirect handling
- ✅ Proper 404/500 status codes
- ✅ Error logging and handling

**Claude Code should**:
- Use `Server.ResponseHeaders` hook for custom headers (NOT `res.set()` in components)
- Configure `.htpasswd` file for staging/preview environments
- Set `context.notFound = true` in NotFound components for proper 404s
- Add security headers via hook (X-Frame-Options, CSP, HSTS)
- Keep `/elb-healthcheck` lightweight and unauthenticated
- Handle errors gracefully with environment-aware messages
