<!-- v1.0.0 -->
# Server-Side Rendering (SSR) Architecture

Complete documentation of Reactium's template-based SSR system for Front-End Only (FEO) and hybrid rendering modes.

---

## Overview

Reactium uses a **template-driven FEO (Front-End Only)** architecture that generates HTML templates with React bind points, injected scripts, styles, and global state. This approach supports both:

1. **FEO Mode**: Template with bind points, React hydrates on client
2. **SSR Mode** (future): Template with server-rendered React markup

**Current Implementation**: FEO template generation with hook-extensible registries for assets, headers, and bind points.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     SSR TEMPLATE SYSTEM                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Express Request                                                 │
│         │                                                        │
│         ├─→ renderer/index.mjs:288 (default export)             │
│         │      │                                                 │
│         │      ├─→ Create Request Registries                    │
│         │      │   ├─ Server.AppHeaders                         │
│         │      │   ├─ Server.AppScripts                         │
│         │      │   ├─ Server.AppStyleSheets                     │
│         │      │   ├─ Server.AppBindings                        │
│         │      │   ├─ Server.AppGlobals                         │
│         │      │   └─ Server.AppSnippets                        │
│         │      │                                                 │
│         │      ├─→ Hook: Server.beforeApp                       │
│         │      │                                                 │
│         │      ├─→ Hook: Server.AppGlobals                      │
│         │      │      └─→ Serialize window globals              │
│         │      │                                                 │
│         │      ├─→ Hook: Server.AppHeaders                      │
│         │      │      └─→ Aggregate <head> tags                 │
│         │      │                                                 │
│         │      ├─→ Hook: Server.AppScripts                      │
│         │      │      └─→ Aggregate webpack bundles             │
│         │      │                                                 │
│         │      ├─→ Hook: Server.AppStyleSheets                  │
│         │      │      └─→ Aggregate CSS files                   │
│         │      │                                                 │
│         │      ├─→ Hook: Server.AppBindings                     │
│         │      │      └─→ Generate bind point markup            │
│         │      │                                                 │
│         │      ├─→ Hook: Server.AppSnippets                     │
│         │      │      └─→ Add tracking/analytics code           │
│         │      │                                                 │
│         │      ├─→ Hook: Server.afterApp                        │
│         │      │                                                 │
│         │      └─→ feo.js template(req)                         │
│         │             └─→ Generate HTML                         │
│         │                                                        │
│         └─→ Return HTML Response                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Request Registry System

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/server/renderer/index.mjs:252-286`

### Registry Factory Pattern

```javascript
const requestRegistries = () => {
    const Server = {};
    Server.AppHeaders = ReactiumBoot.registryFactory(
        'AppHeaders',
        'name',
        ReactiumBoot.Registry.MODES.CLEAN,
    );
    Server.AppScripts = ReactiumBoot.registryFactory(
        'AppScripts',
        'name',
        ReactiumBoot.Registry.MODES.CLEAN,
    );
    Server.AppSnippets = ReactiumBoot.registryFactory(
        'AppSnippets',
        'name',
        ReactiumBoot.Registry.MODES.CLEAN,
    );
    Server.AppStyleSheets = ReactiumBoot.registryFactory(
        'AppStyleSheets',
        'name',
        ReactiumBoot.Registry.MODES.CLEAN,
    );
    Server.AppBindings = ReactiumBoot.registryFactory(
        'AppBindings',
        'name',
        ReactiumBoot.Registry.MODES.CLEAN,
    );
    Server.AppGlobals = ReactiumBoot.registryFactory(
        'AppGlobals',
        'name',
        ReactiumBoot.Registry.MODES.CLEAN,
    );

    return Server;
};
```

**Key Pattern**: Each request gets fresh registry instances (CLEAN mode) - no shared state between requests.

### Request Object Structure

**Source**: `index.mjs:288-298`

```javascript
export default async (req, res, context) => {
    const Server = (req.Server = requestRegistries());

    req.Server = Server;
    req.scripts = '';           // Footer scripts markup
    req.headerScripts = '';     // Header scripts markup
    req.styles = '';            // Stylesheet link tags
    req.appGlobals = '';        // Serialized window globals
    req.appAfterScripts = '';   // Tracking/snippet code
    req.headTags = '';          // <head> tag content
    req.appBindings = '';       // React bind point markup

    // ... template rendering
}
```

---

## Template System

### Template Discovery

**Source**: `index.mjs:183-207`

```javascript
ReactiumBoot.Hook.register(
    'Server.beforeApp',
    async req => {
        // Check for local template override
        if (fs.existsSync(`${rootPath}/src/app/server/template/feo.js`)) {
            let { default: localTemplate } = await import(
                `${rootPath}/src/app/server/template/feo.js`
            );

            let templateVersion = sanitizeTemplateVersion(
                localTemplate.version,
            );

            // Check semver compatibility with core
            if (semver.satisfies(templateVersion, reactiumConfig.semver)) {
                req.template = localTemplate.template;
            } else {
                console.warn(
                    `Local template is out of date, will not be used.`,
                );
            }
        }
    },
    ReactiumBoot.Enums.priority.highest,
    'SERVER-BEFORE-APP-CORE-TEMPLATES',
);
```

**Template Resolution Priority**:
1. Local template: `src/app/server/template/feo.js` (if version compatible)
2. Core template: `@atomic-reactor/reactium-core/server/template/feo.js`

**Version Compatibility**: Uses semver to ensure local templates match core API

### Core Template Structure

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/server/template/feo.js`

```javascript
module.exports = {
    version: '%TEMPLATE_VERSION%',
    template: req => {
        return `<!DOCTYPE html>
        <html>
            <head>
                ${req.headTags}
                ${req.styles}
            </head>
            <body>
                ${req.headerScripts}
                ${req.appBindings}

                <script>
                    window.defines = ${serialize(defines)};
                    ${req.appGlobals}
                </script>
                ${req.scripts}
                ${req.appAfterScripts}
            </body>
        </html>`;
    },
};
```

**Key Elements**:
- **headTags**: Meta tags, favicons, canonical URLs
- **styles**: CSS link tags (ordered by priority)
- **headerScripts**: Scripts loaded before React
- **appBindings**: React mount points (`<div data-reactium-bind="App">`)
- **appGlobals**: Serialized window globals for client hydration
- **scripts**: Main webpack bundles (footer)
- **appAfterScripts**: Analytics, tracking snippets

---

## Hook System Integration

### 1. Server.beforeApp

**Source**: `index.mjs:311-312`

**Purpose**: Pre-processing before template rendering starts

```javascript
ReactiumBoot.Hook.runSync('Server.beforeApp', req, Server);
await ReactiumBoot.Hook.run('Server.beforeApp', req, Server);
```

**Use Case**: Load custom templates, set request-specific configuration

**Example**:
```javascript
ReactiumBoot.Hook.register('Server.beforeApp', async (req, Server) => {
    // Add request-specific data
    req.seoData = await fetchSEOData(req.path);
});
```

### 2. Server.AppGlobals

**Source**: `index.mjs:337-347`

**Purpose**: Define window globals available to client-side code

```javascript
ReactiumBoot.Hook.registerSync(
    'Server.AppGlobals',
    (req, AppGlobals) => {
        AppGlobals.register('environment', {
            name: 'environment',
            value: 'local',
        });
    }
);
```

**Serialization** (`index.mjs:341-347`):
```javascript
_.sortBy(Object.values(Server.AppGlobals.list), 'order').forEach(
    ({ name, value, serverValue }) => {
        // Set global for nodejs SSR
        global[name] = typeof serverValue !== 'undefined' ? serverValue : value;

        // Serialize for client
        req.appGlobals += `window["${name}"] = ${serialize(value)};\n`;
    },
);
```

**Global Options**:
- `name`: Global variable name
- `value`: Value for browser window
- `serverValue`: Optional different value for nodejs global
- `order`: Registration priority

**Core Globals** (`index.mjs:209-227`):
```javascript
AppGlobals.register('resourceBaseUrl', {
    name: 'resourceBaseUrl',
    value: process.env.NODE_ENV === 'development'
        ? '/'
        : process.env.WEBPACK_RESOURCE_BASE || '/assets/js/',
});

if (process.env.DISABLE_HMR === 'on') {
    AppGlobals.register('disableHMRReload', {
        name: 'disableHMRReload',
        value: true,
    });
}
```

### 3. Server.AppHeaders

**Source**: `index.mjs:375-388`

**Purpose**: Register `<head>` tags (meta, links, etc.)

```javascript
ReactiumBoot.Hook.register('Server.AppHeaders', async (req, AppHeaders) => {
    if (req.seo) {
        if (req.seo.canonicalURL) {
            AppHeaders.register('canonical-url', {
                header: `<link rel="canonical" href="${req.seo.canonicalURL}" />`
            });
        }
        if (req.seo.description) {
            AppHeaders.register('meta-description', {
                header: `<meta name="description" content="${req.seo.description}"/>`
            });
        }
    }
});
```

**Header Options**:
- `header`: Raw HTML string
- `order`: Registration priority

**Core Headers** (`index.mjs:129-154`):
```javascript
AppHeaders.register('shortcut', {
    header: '<link rel="shortcut icon" type="image/x-icon" href="/assets/images/favicon.ico" />',
    order: ReactiumBoot.Enums.priority.highest,
});
AppHeaders.register('favicon', {
    header: '<link rel="icon" type="image/x-icon" href="/assets/images/favicon.ico" />',
    order: ReactiumBoot.Enums.priority.highest,
});
AppHeaders.register('viewport', {
    header: '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
    order: ReactiumBoot.Enums.priority.highest,
});
AppHeaders.register('charset', {
    header: '<meta charset="UTF-8" />',
    order: ReactiumBoot.Enums.priority.highest,
});
```

### 4. Server.AppScripts

**Source**: `index.mjs:422-467`

**Purpose**: Register JavaScript files to load

```javascript
ReactiumBoot.Hook.register('Server.AppScripts', async (req, AppScripts) => {
    AppScripts.register('my-onsite-script', {
        path: '/assets/js/some-additional.js',
        footer: true,
        order: 1,
    });

    AppScripts.register('my-cdn-script', {
        path: 'https://cdn.example.com/cdn.loaded.js',
        header: true,
        order: 1,
    });
});
```

**Script Options**:
- `path`: URL or relative path to script
- `footer` (default: true): Load in footer
- `header` (default: false): Load in header
- `charset` (default: 'UTF-8')
- `type`: Script type attribute
- `defer` (default: false)
- `async` (default: false)
- `content`: Inline script content
- `order`: Loading priority

**Webpack Asset Discovery** (`index.mjs:76-126`):

**Development Mode** (`index.mjs:80-93`):
```javascript
if (process.env.NODE_ENV === 'development') {
    const { stats: context } = res.locals.webpack.devMiddleware;
    const stats = context.toJson();
    _.pluck(stats.namedChunkGroups.main.assets, 'name').forEach(
        path => {
            AppScripts.register(path, {
                path: `/${path}`,
                order: ReactiumBoot.Enums.priority.highest,
                footer: true,
            });
        },
    );
    return;
}
```

**Production Mode** (`index.mjs:96-123`):
```javascript
try {
    const webpackAssets = JSON.parse(
        fs.readFileSync(
            path.resolve(
                rootPath,
                'src/app/server/webpack-manifest.json',
            ),
        ),
    );

    ReactiumBoot.Hook.runSync('webpack-server-assets', webpackAssets);

    webpackAssets.forEach(asset =>
        AppScripts.register(asset, {
            path: `${global.resourceBaseUrl}${asset}`,
            order: ReactiumBoot.Enums.priority.highest,
            footer: true,
        }),
    );
} catch (error) {
    console.error(
        'webpack-manifest.json not found or invalid',
        error,
    );
    process.exit(1);
}
```

**Key Pattern**: Webpack manifest (`webpack-manifest.json`) generated during build contains chunk file names.

### 5. Server.AppStyleSheets

**Source**: `index.mjs:497-574`

**Purpose**: Register CSS files to load

```javascript
ReactiumBoot.Hook.register('Server.AppStyleSheets', async (req, AppStyleSheets) => {
    AppStyleSheets.register('my-stylesheet', {
        href: '/assets/css/some-additional.css'
    });

    AppStyleSheets.register('my-cdn-stylesheet', {
        href: 'https://cdn.example.com/cdn.loaded.css',
        order: 1,
    });
});
```

**StyleSheet Options**:
- `path` or `href`: URL to stylesheet
- `rel` (default: 'stylesheet'): Link relationship
- `crossorigin`: CORS setting
- `referrerpolicy`: Referrer policy
- `hrefLang`: Language
- `media`: Media query
- `sizes`: Icon sizes (if rel=icon)
- `type`: MIME type
- `when`: Function to conditionally include
- `order`: Loading priority

**Core StyleSheet Discovery** (`index.mjs:13-74`):
```javascript
ReactiumBoot.Hook.registerSync(
    'Server.AppStyleSheets',
    (req, AppStyleSheets) => {
        const theme = op.get(
            req,
            'query.theme',
            process.env.DEFAULT_THEME || 'style',
        );

        const defaultStylesheet = `${theme}.css`;

        let publicDir = process.env.PUBLIC_DIRECTORY ||
            path.resolve(process.cwd(), 'public');
        let styleDir = path.normalize(
            path.join(publicDir, '/assets/style'),
        );

        const when = (req, itemPath) => {
            const includes = [defaultStylesheet];
            ReactiumBoot.Hook.runSync(
                'Server.AppStyleSheets.includes',
                includes,
            );

            const excludes = ['core.css', 'toolkit.css'];
            ReactiumBoot.Hook.runSync(
                'Server.AppStyleSheets.excludes',
                excludes,
            );

            const included = Boolean(
                includes.find(search => itemPath.indexOf(search) >= 0),
            );
            const excluded = Boolean(
                excludes.find(search => itemPath.indexOf(search) >= 0),
            );

            return included && !excluded;
        };

        fs.readdirSync(styleDir).forEach(item => {
            const itemPath = path.normalize(path.join(styleDir, item));
            AppStyleSheets.register(path.basename(itemPath), {
                path: itemPath.split(publicDir).join(''),
                when,
            });
        });
    },
    ReactiumBoot.Enums.priority.highest,
    'SERVER-APP-STYLESHEETS-CORE',
);
```

**Theme Selection**:
- Query param: `?theme=dark` → loads `dark.css`
- Env var: `DEFAULT_THEME` → default theme
- Fallback: `style.css`

### 6. Server.AppBindings

**Source**: `index.mjs:603-605`

**Purpose**: Register React mount points in HTML

```javascript
ReactiumBoot.Hook.registerSync(
    'Server.AppBindings',
    (req, AppBindings) => {
        // Find registered component "DevTools" and bind it
        AppBindings.register('DevTools', {
            component: 'DevTools',
        });

        // Add ordinary markup for React to bind to
        AppBindings.register('router', {
            markup: '<div data-reactium-bind="App"></div>',
        });

        // Use template function for dynamic markup
        AppBindings.register('sidebar', {
            template: (context) => `<div data-reactium-bind="Sidebar" data-user="${context.userId}"></div>`,
            requestParams: ['userId'], // Extract these from req
        });
    },
    ReactiumBoot.Enums.priority.highest,
);
```

**Binding Options**:
- `component`: String name of component (webpack search context)
- `markup`: Static HTML string
- `template`: Function returning HTML (receives request context)
- `requestParams`: Array of req properties to pass to template function
- `order`: Registration priority

**Binding Markup Generation** (`index.mjs:230-250`):
```javascript
export const renderAppBindings = req => {
    let bindingsMarkup = '';
    _.sortBy(Object.values(req.Server.AppBindings.list), 'order').forEach(
        ({ component, markup, template, requestParams = [] }) => {
            // Component string (React will resolve)
            if (component && typeof component === 'string') {
                bindingsMarkup += `<Component type="${component}"></Component>`;
            }
            // Static markup
            else if (markup && typeof markup === 'string') {
                bindingsMarkup += markup;
            }
            // Dynamic template
            else if (template && typeof template === 'function') {
                const context = {};
                requestParams.forEach(name => {
                    context[name] = req[name] || '';
                });
                bindingsMarkup += template(context);
            }
        },
    );

    return bindingsMarkup;
};
```

**Core Bindings** (`index.mjs:156-174`):
```javascript
AppBindings.register('router', {
    template: () => {
        const binding = '<div data-reactium-bind="App"></div>';
        return binding;
    },
});
AppBindings.register('shell-bind-point', {
    template: () => {
        const binding = '<div data-reactium-shell></div>';
        return binding;
    },
});
```

### 7. Server.AppSnippets

**Source**: `index.mjs:630-638`

**Purpose**: Add entire code snippets (analytics, tracking, etc.)

```javascript
ReactiumBoot.Hook.register('Server.AppSnippets', async (req, AppSnippets) => {
    AppSnippets.register('ga-tracking', {
        snippet: `<script>
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', '', 'auto');
ga('send', 'pageview');
</script>`,
        order: 1,
    });
});
```

**Snippet Options**:
- `snippet`: Raw HTML/JS code
- `order`: Registration priority

### 8. Server.afterApp

**Source**: `index.mjs:648-649`

**Purpose**: Post-processing after all registries populated

```javascript
ReactiumBoot.Hook.runSync('Server.afterApp', req, Server);
await ReactiumBoot.Hook.run('Server.afterApp', req, Server);
```

**Use Case**: Final modifications before template rendering

---

## Real-World Use Cases

### 1. Dynamic SEO Meta Tags

```javascript
// In reactium-boot.js
ReactiumBoot.Hook.register('Server.AppHeaders', async (req, AppHeaders) => {
    // Extract route-specific SEO data
    const route = await getRouteConfig(req.path);

    if (route.seo) {
        AppHeaders.register('og-title', {
            header: `<meta property="og:title" content="${route.seo.title}" />`,
            order: 100,
        });

        AppHeaders.register('og-description', {
            header: `<meta property="og:description" content="${route.seo.description}" />`,
            order: 100,
        });

        AppHeaders.register('og-image', {
            header: `<meta property="og:image" content="${route.seo.image}" />`,
            order: 100,
        });
    }
});
```

### 2. Conditional Analytics Loading

```javascript
ReactiumBoot.Hook.register('Server.AppSnippets', async (req, AppSnippets) => {
    // Only load analytics in production
    if (process.env.NODE_ENV === 'production') {
        AppSnippets.register('google-analytics', {
            snippet: `
                <script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
                <script>
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', 'GA_TRACKING_ID');
                </script>
            `,
            order: 1,
        });
    }
});
```

### 3. User-Specific Initial State

```javascript
ReactiumBoot.Hook.register('Server.AppGlobals', async (req, AppGlobals) => {
    // Serialize user session for client hydration
    if (req.user) {
        AppGlobals.register('initialUser', {
            name: 'initialUser',
            value: {
                objectId: req.user.id,
                username: req.user.get('username'),
                roles: req.user.get('roles'),
            },
        });
    }
});
```

### 4. Theme-Based Stylesheet Loading

```javascript
ReactiumBoot.Hook.registerSync('Server.AppStyleSheets', (req, AppStyleSheets) => {
    const theme = req.cookies.theme || 'light';

    AppStyleSheets.register('theme-stylesheet', {
        href: `/assets/css/theme-${theme}.css`,
        order: 50,
    });
});
```

### 5. A/B Test Variant Scripts

```javascript
ReactiumBoot.Hook.register('Server.AppScripts', async (req, AppScripts) => {
    const variant = req.query.variant || 'control';

    if (variant === 'experimental') {
        AppScripts.register('ab-test-script', {
            path: '/assets/js/experimental-features.js',
            footer: true,
            order: 100,
        });
    }
});
```

---

## Best Practices

### ✅ DO

1. **Use Hook Priority**: Order matters for head tags, scripts, styles
   ```javascript
   AppHeaders.register('critical-meta', {
       header: '<meta name="critical" content="value" />',
       order: ReactiumBoot.Enums.priority.highest, // Loads first
   });
   ```

2. **Serialize Safely**: Always use `serialize-javascript` for globals
   ```javascript
   import serialize from 'serialize-javascript';
   AppGlobals.register('config', {
       name: 'config',
       value: { apiKey: process.env.API_KEY },
   });
   ```

3. **Conditional Loading**: Use `when` for stylesheets
   ```javascript
   AppStyleSheets.register('print-styles', {
       href: '/assets/css/print.css',
       media: 'print',
       when: (req) => !req.query.noPrint,
   });
   ```

4. **Request-Specific Registries**: Never share state between requests
   ```javascript
   // GOOD: Each request gets fresh registries (CLEAN mode)
   const Server = requestRegistries();
   ```

5. **Template Version Compatibility**: Always version custom templates
   ```javascript
   module.exports = {
       version: '1.2.0',
       template: (req) => { /* ... */ }
   };
   ```

### ❌ DON'T

1. **Don't Share Registries**: Each request must have isolated state
   ```javascript
   // BAD: Global registry shared across requests
   const globalRegistry = ReactiumBoot.registryFactory('Shared');

   // GOOD: Request-scoped registries
   const Server = requestRegistries(); // Fresh per request
   ```

2. **Don't Forget Order**: Scripts load order matters
   ```javascript
   // BAD: jQuery plugin before jQuery
   AppScripts.register('plugin', {
       path: '/js/plugin.js',
       order: 1,
   });
   AppScripts.register('jquery', {
       path: '/js/jquery.js',
       order: 2, // Loads AFTER plugin!
   });

   // GOOD: Explicit ordering
   AppScripts.register('jquery', {
       path: '/js/jquery.js',
       order: 1,
   });
   AppScripts.register('plugin', {
       path: '/js/plugin.js',
       order: 2,
   });
   ```

3. **Don't Inline Sensitive Data**: Never expose secrets to client
   ```javascript
   // BAD: Exposes API key to browser
   AppGlobals.register('secrets', {
       name: 'secrets',
       value: { apiKey: process.env.SECRET_KEY },
   });

   // GOOD: Use serverValue for nodejs-only
   AppGlobals.register('apiUrl', {
       name: 'apiUrl',
       value: 'https://api.example.com',
       serverValue: process.env.INTERNAL_API_URL, // Server only
   });
   ```

4. **Don't Assume Webpack Manifest**: Handle missing files gracefully
   ```javascript
   // BAD: Crashes on missing manifest
   const manifest = JSON.parse(fs.readFileSync('webpack-manifest.json'));

   // GOOD: Graceful error handling
   try {
       const manifest = JSON.parse(fs.readFileSync('webpack-manifest.json'));
   } catch (error) {
       console.error('Webpack manifest not found', error);
       process.exit(1);
   }
   ```

5. **Don't Block Rendering**: Keep hooks fast
   ```javascript
   // BAD: Slow database query blocks every request
   ReactiumBoot.Hook.register('Server.beforeApp', async (req) => {
       req.data = await slowDatabaseQuery(); // Blocks rendering!
   });

   // GOOD: Cache or fetch in parallel
   ReactiumBoot.Hook.register('Server.beforeApp', async (req) => {
       req.data = await getFromCache() || await slowDatabaseQuery();
   });
   ```

---

## Common Gotchas

### 1. Registry Mode Confusion

**Problem**: Using HISTORY mode causes state leakage between requests

```javascript
// BAD: HISTORY mode accumulates across requests
const Server = {};
Server.AppHeaders = ReactiumBoot.registryFactory(
    'AppHeaders',
    'name',
    ReactiumBoot.Registry.MODES.HISTORY, // WRONG!
);
```

**Solution**: Always use CLEAN mode for request registries

```javascript
// GOOD: CLEAN mode creates fresh registry per request
Server.AppHeaders = ReactiumBoot.registryFactory(
    'AppHeaders',
    'name',
    ReactiumBoot.Registry.MODES.CLEAN,
);
```

### 2. Template Version Mismatch

**Problem**: Local template out of sync with core API changes

```javascript
// Core expects req.appBindings but local template uses old API
template: req => `<html><body>${req.bindings}</body></html>` // Wrong property!
```

**Solution**: Core validates template version using semver

```javascript
if (semver.satisfies(templateVersion, reactiumConfig.semver)) {
    req.template = localTemplate.template;
} else {
    console.warn('Template version incompatible with core');
}
```

### 3. Webpack Manifest Not Found

**Problem**: Production build fails silently if manifest missing

**Solution**: Core exits process on missing manifest (`index.mjs:117-123`)

```javascript
try {
    const webpackAssets = JSON.parse(
        fs.readFileSync(path.resolve(rootPath, 'webpack-manifest.json')),
    );
} catch (error) {
    console.error('webpack-manifest.json not found or invalid JSON', error);
    process.exit(1); // Hard exit
}
```

### 4. Global Variable Serialization

**Problem**: `serialize-javascript` required for safe JSON serialization

```javascript
// BAD: JSON.stringify doesn't handle undefined, functions, etc.
window.data = ${JSON.stringify(data)};

// GOOD: serialize-javascript handles edge cases
window.data = ${serialize(data)};
```

### 5. Bind Point Markup Not Appearing

**Problem**: Bind point registered after `Server.AppBindings` hook fires

**Solution**: Register bindings before or during `Server.AppBindings` hook, not after

---

## Future SSR Implementation

**Current**: FEO template with client-side hydration

**Future**: Server-side React rendering with `renderToString`

```javascript
// Future SSR pattern (not yet implemented)
import { renderToString } from 'react-dom/server';

ReactiumBoot.Hook.register('Server.AppBindings', async (req, AppBindings) => {
    const App = await import('./App');
    const markup = renderToString(<App />);

    AppBindings.register('ssr-app', {
        markup: markup, // Pre-rendered React markup
    });
});
```

**Challenges**:
- State serialization for hydration
- Async data loading before render
- Component code splitting with SSR
- CSS extraction for server rendering

---

## Summary

Reactium's SSR architecture provides:
- ✅ Template-based FEO rendering with React bind points
- ✅ Hook-extensible registries for assets, headers, globals
- ✅ Request-scoped registry isolation (no state leakage)
- ✅ Webpack asset auto-discovery (dev and prod modes)
- ✅ Theme-based stylesheet selection
- ✅ Semver-based template compatibility
- ✅ Comprehensive hook lifecycle for customization

**Current State**: Fully functional FEO template system with client-side React hydration.
**Future State**: Full SSR with `renderToString` planned but not yet implemented.
