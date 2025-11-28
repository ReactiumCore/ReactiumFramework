<!-- v1.0.0 -->
# Actinium Route System (Admin API Routes)

Database-backed route management system for Actinium Admin applications, enabling dynamic route registration, capability-based access control, and blueprint-based frontend integration.

---

## Table of Contents

1. [Overview](#overview)
2. [Route Collection Schema](#route-collection-schema)
3. [Blueprint Concept](#blueprint-concept)
4. [Route CRUD Operations](#route-crud-operations)
5. [Plugin Lifecycle Integration](#plugin-lifecycle-integration)
6. [Capability-Based Access Control](#capability-based-access-control)
7. [Hook Integration](#hook-integration)
8. [Cloud Functions API](#cloud-functions-api)
9. [Real-World Plugin Examples](#real-world-plugin-examples)
10. [Best Practices](#best-practices)
11. [Common Gotchas](#common-gotchas)

---

## Overview

The Route system provides dynamic route management for Actinium Admin applications:

**Key Features**:
- **Database storage** - Routes stored in Parse Server `Route` collection
- **Blueprint-based** - Routes reference frontend blueprints for rendering
- **Capability-gated** - Access control via capabilities array
- **Plugin lifecycle** - Automatic route registration on activate/start
- **Built-in protection** - Built-in routes cannot be deleted
- **Metadata support** - Free-form metadata for custom route properties
- **Hook-extensible** - Hooks for validation, transformation, permission checks

**Use Cases**:
- Admin UI route registration (settings, users, content, etc.)
- Plugin-specific admin pages
- Dynamic route generation based on content types
- Capability-based route visibility
- Multi-app route organization (admin vs public)

**Source Files**:
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:1-288`
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/sdk.js:1-94`
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/schema.js:1-28`
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/routes.js:1-12`

---

## Route Collection Schema

### Database Fields

```javascript
{
  collection: 'Route',
  schema: {
    route: {
      type: 'String',       // Route path (e.g., '/admin/settings')
    },
    blueprint: {
      type: 'String',       // Blueprint ID for frontend rendering
    },
    meta: {
      type: 'Object',       // Free-form metadata
    },
    order: {
      type: 'Number',       // Display order (optional)
    },
  },
  indexes: ['route'],       // Index on route field for fast lookups
}
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/schema.js:1-28`

### Collection-Level Permissions (CLP)

```javascript
{
  actions: {
    addField: false,        // No dynamic field addition
    create: false,          // Create via cloud functions only
    delete: false,          // Delete via cloud functions only
    retrieve: true,         // Direct retrieval allowed
    update: false,          // Update via cloud functions only
  },
}
```

**Capability Model**:
- `Route.create` - Create new routes (moderator, contributor)
- `Route.retrieve` - Retrieve routes (moderator, contributor)
- `Route.update` - Update existing routes (moderator, contributor)
- `Route.delete` - Delete routes (moderator, contributor)
- `Route.addField` - Add fields to schema (super-admin only)

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:80-113`

---

## Blueprint Concept

### What is a Blueprint?

A **blueprint** is a frontend component ID that defines how a route is rendered in the Reactium Admin UI.

**Relationship**:
```
Route (backend) ──blueprint──> Blueprint Component (frontend)
   ↓                                    ↓
/admin/settings               SettingsBlueprint.jsx
```

**Backend (Actinium Route)**:
```javascript
{
  route: '/admin/settings',
  blueprint: 'Settings',      // References frontend blueprint
  capabilities: ['settings-ui.view'],
  meta: {
    builtIn: true,
    app: 'admin',
  },
}
```

**Frontend (Reactium Admin)**:
```javascript
// Blueprint component registered in Reactium
import SettingsBlueprint from './blueprints/Settings';

Reactium.Blueprint.register('Settings', {
  component: SettingsBlueprint,
  // ... other blueprint config
});
```

### Blueprint Integration

When admin UI renders routes:
1. Fetch routes from `routes` cloud function
2. Filter by user capabilities (only show permitted routes)
3. For each route, look up blueprint component by `blueprint` field
4. Render blueprint component for matched route path

**Common Blueprints**:
- `Admin` - Main admin dashboard
- `Settings` - Settings management UI
- `Users` - User management UI
- `Content` - Content editing UI
- `Media` - Media library UI
- `Plugin` - Plugin management UI

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/routes.js:1-12`

---

## Route CRUD Operations

### Actinium.Route.save()

Create or update a route.

**Signature**:
```javascript
Actinium.Route.save(params, options, req)
```

**Parameters**:
```javascript
{
  route: String,            // Required - Route path (e.g., '/admin/settings')
  blueprint: String,        // Required - Blueprint component ID
  capabilities: Array,      // Optional - Array of capability strings (default: [])
  meta: Object,             // Optional - Free-form metadata (default: {})
  order: Number,            // Optional - Display order (default: 100)
}
```

**Options**: Standard Parse options (e.g., `{ useMasterKey: true }`)

**Returns**: Promise<RouteObject>

**Example**:
```javascript
const route = await Actinium.Route.save({
  route: '/admin/my-plugin',
  blueprint: 'MyPlugin',
  capabilities: ['my-plugin.view'],
  meta: {
    builtIn: false,
    app: 'admin',
    category: 'tools',
  },
  order: 200,
});
```

**Behavior**:
- If route with same `route` path exists, updates it (upsert)
- If route doesn't exist, creates new
- Fires `route-before-save` and `route-saved` hooks

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/sdk.js:34-63`

---

### Actinium.Route.retrieve()

Retrieve a single route by path or objectId.

**Signature**:
```javascript
Actinium.Route.retrieve(params, options, req)
```

**Parameters**:
```javascript
{
  route: String,       // Route path (e.g., '/admin/settings')
  // OR
  objectId: String,    // Parse object ID
}
```

**Returns**: Promise<RouteObject | null>

**Example**:
```javascript
// Retrieve by route path
const route = await Actinium.Route.retrieve({
  route: '/admin/settings',
});

// Retrieve by objectId
const route = await Actinium.Route.retrieve({
  objectId: 'abc123',
});
```

**Fires hooks**:
- `route-before-retrieve` - Before query execution
- `route-retrieve` - After retrieval, receives serialized route

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/sdk.js:15-32`

---

### Actinium.Route.list()

Retrieve list of routes with pagination and filtering.

**Signature**:
```javascript
Actinium.Route.list(params, options, req)
```

**Parameters**:
```javascript
{
  limit: Number,       // Optional - Max routes to return (default: 1000)
  page: Number,        // Optional - Page number (default: 0, <1 = all routes)
}
```

**Returns**: Promise<{ routes: Array, ...queryParams }>

**Example**:
```javascript
// Get first page (50 routes)
const result = await Actinium.Route.list({
  limit: 50,
  page: 1,
});

// Get all routes
const allRoutes = await Actinium.Route.list({
  page: 0,  // or any value < 1
});
```

**Uses hookedQuery**:
- `route-list-query` hook - Modify query before execution
- `route-list-output` hook - Transform results (adds `permitted` field)

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/sdk.js:65-77`

---

### Actinium.Route.delete()

Delete a route by path or objectId.

**Signature**:
```javascript
Actinium.Route.delete(params, options, req)
```

**Parameters**:
```javascript
{
  route: String,       // Route path
  // OR
  objectId: String,    // Parse object ID
}
```

**Returns**: Promise<void>

**Example**:
```javascript
await Actinium.Route.delete({
  route: '/admin/my-plugin',
});
```

**Protection**: Built-in routes (with `meta.builtIn: true`) cannot be deleted.

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/sdk.js:79-88`

---

## Plugin Lifecycle Integration

### Standard Pattern

Plugins register routes on activation and remove them on deactivation:

```javascript
import PLUGIN_ROUTES from './routes.js';

// Save routes on startup (if plugin active)
Actinium.Hook.register('start', async () => {
  if (Actinium.Plugin.isActive(PLUGIN.ID)) {
    for (const route of PLUGIN_ROUTES) {
      await Actinium.Route.save(route);
    }
  }
});

// Save routes on plugin activation
Actinium.Hook.register('activate', async ({ ID }) => {
  if (ID === PLUGIN.ID) {
    for (const route of PLUGIN_ROUTES) {
      await Actinium.Route.save(route);
    }
  }
});

// Save routes on plugin update
Actinium.Hook.register('update', async ({ ID }) => {
  if (ID === PLUGIN.ID) {
    for (const route of PLUGIN_ROUTES) {
      await Actinium.Route.save(route);
    }
  }
});

// Remove routes on deactivation
Actinium.Hook.register('deactivate', async ({ ID }) => {
  if (ID === PLUGIN.ID) {
    for (const route of PLUGIN_ROUTES) {
      await Actinium.Route.delete(route);
    }
  }
});
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:29-67`

### Routes Definition File

**Pattern**: Create `routes.js` in plugin directory:

```javascript
// routes.js
export default [
  {
    route: '/admin/my-plugin',
    blueprint: 'MyPlugin',
    meta: {
      builtIn: true,
      app: 'admin',
    },
    capabilities: ['my-plugin.view'],
  },
  {
    route: '/admin/my-plugin/settings',
    blueprint: 'MyPluginSettings',
    meta: {
      builtIn: true,
      app: 'admin',
    },
    capabilities: ['my-plugin.settings'],
  },
];
```

**Import in plugin**:
```javascript
import PLUGIN_ROUTES from './routes.js';
```

---

## Capability-Based Access Control

### Route Capabilities

Routes can be restricted by capabilities:

```javascript
{
  route: '/admin/settings',
  blueprint: 'Settings',
  capabilities: ['settings-ui.view'],  // User must have this capability
}
```

**Capability Registration** (in plugin):
```javascript
Actinium.Capability.register('settings-ui.view', {
  allowed: ['contributor', 'moderator', 'user'],
});
```

**Frontend Integration**:
The `route-list-output` hook adds a `permitted` field to each route based on user capabilities:

```javascript
Actinium.Hook.register('route-list-output', async (...params) => {
  const [{ routes = [] }, , , , , , req] = params;

  routes.forEach((route) => {
    const capabilities = route.get('capabilities');
    if (!Array.isArray(capabilities) || capabilities.length < 1) {
      route.set('permitted', true);  // No capabilities = public route
    } else if (req) {
      route.set(
        'permitted',
        Actinium.Utils.CloudHasCapabilities(req, capabilities, false),
      );
    }
  });
});
```

**Result**: Frontend receives routes with `permitted: true/false` for visibility control.

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:159-177`

---

## Hook Integration

### Available Hooks

| Hook | When | Parameters | Purpose |
|------|------|------------|---------|
| `route-before-retrieve` | Before single route query | `query, params` | Modify query |
| `route-retrieve` | After single route retrieved | `routeObj` | Transform route object |
| `route-before-save` | Before route save | `route, params, options` | Validation, modification |
| `route-saved` | After route saved | `routeObj, params, options` | Post-save actions |
| `route-list-query` | Before list query | Query params | Modify query |
| `route-list-output` | After list query | `{ routes, ... }, ..., req` | Transform results, add permissions |
| `beforeSave-route` | Parse beforeSave | `req` | Low-level validation |
| `beforeDelete-route` | Parse beforeDelete | `req` | Low-level deletion checks |
| `afterSave-route` | Parse afterSave | `req` | Post-save side effects |

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:27-31,57-60,135-201`

### Hook Example: Required Fields Validation

```javascript
Actinium.Hook.register('route-save', async (req) => {
  const route = req.object.toJSON();

  // Validate required fields
  if (!route.route) throw 'route required.';
  if (!route.blueprint) throw 'blueprint required.';

  // Prevent duplicate routes (upsert logic)
  if (req.object.isNew()) {
    const routeObj = await Actinium.Route.retrieve({ route: route.route });
    if (routeObj) {
      req.object.id = routeObj.objectId;  // Update existing instead of create
    }
  }
});
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:135-147`

### Hook Example: Built-In Route Protection

```javascript
Actinium.Hook.register('route-delete', async (req) => {
  if (!Actinium.Plugin.isActive('Route')) return;

  const route = req.object.toJSON();

  if (op.get(route, 'meta.builtIn')) {
    throw 'Deleting built-in route not permitted.';
  }
});
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:149-156`

---

## Cloud Functions API

### route-save

Create or update a route.

**Signature**:
```javascript
Actinium.Cloud.run('route-save', params, options)
```

**Parameters**:
```javascript
{
  route: String,            // Required - Route path
  blueprint: String,        // Required - Blueprint ID
  capabilities: Array,      // Optional - Capability strings (default: [])
  meta: Object,             // Optional - Free-form metadata (default: {})
}
```

**Example**:
```javascript
await Actinium.Cloud.run('route-save', {
  route: '/admin/my-plugin',
  blueprint: 'MyPlugin',
  capabilities: ['admin-ui.view'],
  meta: {
    foo: 'bar',
  },
});
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:209-228`

---

### route-retrieve

Retrieve a single route.

**Signature**:
```javascript
Actinium.Cloud.run('route-retrieve', params, options)
```

**Parameters**:
```javascript
{
  route: String,       // Route path
}
```

**Example**:
```javascript
const route = await Actinium.Cloud.run('route-retrieve', {
  route: '/admin/my-plugin',
});
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:247-257`

---

### routes

List all routes (with pagination).

**Signature**:
```javascript
Actinium.Cloud.run('routes', params, options)
```

**Parameters**:
```javascript
{
  limit: Number,       // Optional - Max routes (default: 1000)
  page: Number,        // Optional - Page number (0 or <1 = all)
}
```

**Example**:
```javascript
// Get first page
const result = await Actinium.Cloud.run('routes', { page: 1 });

// Get all routes
const allRoutes = await Actinium.Cloud.run('routes');
```

**Returns**:
```javascript
{
  routes: [
    {
      objectId: 'abc123',
      route: '/admin/settings',
      blueprint: 'Settings',
      capabilities: ['settings-ui.view'],
      permitted: true,  // Added by route-list-output hook
      meta: { builtIn: true, app: 'admin' },
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    // ...
  ],
  count: 10,
  limit: 1000,
  page: 0,
}
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:230-245,259-273`

---

### route-delete

Delete a route.

**Signature**:
```javascript
Actinium.Cloud.run('route-delete', params, options)
```

**Parameters**:
```javascript
{
  route: String,       // Optional - Route path
  objectId: String,    // Optional - Object ID
}
```

**Example**:
```javascript
await Actinium.Cloud.run('route-delete', {
  route: '/admin/my-plugin',
});
```

**Protection**: Built-in routes cannot be deleted.

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:275-287`

---

## Real-World Plugin Examples

### Example 1: Settings Plugin

**routes.js**:
```javascript
export default [
  {
    route: '/admin/settings',
    blueprint: 'Settings',
    meta: {
      builtIn: true,
      app: 'admin',
    },
    capabilities: ['settings-ui.view'],
  },
];
```

**plugin.js** (lifecycle integration):
```javascript
import PLUGIN_ROUTES from './routes.js';

Actinium.Hook.register('start', async () => {
  if (Actinium.Plugin.isActive('Settings')) {
    for (const route of PLUGIN_ROUTES) {
      await Actinium.Route.save(route);
    }
  }
});

Actinium.Hook.register('activate', async ({ ID }) => {
  if (ID === 'Settings') {
    for (const route of PLUGIN_ROUTES) {
      await Actinium.Route.save(route);
    }
  }
});

Actinium.Hook.register('deactivate', async ({ ID }) => {
  if (ID === 'Settings') {
    for (const route of PLUGIN_ROUTES) {
      await Actinium.Route.delete(route);
    }
  }
});
```

**Capability registration**:
```javascript
Actinium.Capability.register('settings-ui.view', {
  allowed: ['contributor', 'moderator'],
});
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-settings/routes.js:1-11`

---

### Example 2: Admin Route Plugin

**routes.js**:
```javascript
export default [
  {
    route: '/admin',
    blueprint: 'Admin',
    meta: {
      builtIn: true,
      app: 'admin',
    },
    capabilities: ['admin-ui.view'],
  },
];
```

**Capability** (allow most users):
```javascript
Actinium.Capability.register('admin-ui.view', {
  allowed: ['contributor', 'moderator', 'user'],
});
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/routes.js:1-12`, `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:35-37`

---

### Example 3: Multi-Route Plugin

```javascript
// routes.js
export default [
  {
    route: '/admin/my-plugin',
    blueprint: 'MyPluginDashboard',
    meta: {
      builtIn: true,
      app: 'admin',
      category: 'tools',
    },
    capabilities: ['my-plugin.view'],
    order: 100,
  },
  {
    route: '/admin/my-plugin/settings',
    blueprint: 'MyPluginSettings',
    meta: {
      builtIn: true,
      app: 'admin',
      category: 'tools',
    },
    capabilities: ['my-plugin.settings'],
    order: 200,
  },
  {
    route: '/admin/my-plugin/reports',
    blueprint: 'MyPluginReports',
    meta: {
      builtIn: true,
      app: 'admin',
      category: 'reports',
    },
    capabilities: ['my-plugin.reports'],
    order: 300,
  },
];
```

---

## Best Practices

### 1. Always Use meta.builtIn for Plugin Routes

Mark plugin-managed routes as built-in to prevent accidental deletion:

```javascript
{
  route: '/admin/my-plugin',
  blueprint: 'MyPlugin',
  meta: {
    builtIn: true,  // Prevents deletion via UI
  },
}
```

### 2. Register Capability Before Route

Ensure capability exists before creating route:

```javascript
// In schema hook
Actinium.Capability.register('my-plugin.view', {
  allowed: ['contributor', 'moderator'],
});

// Later, in start hook
await Actinium.Route.save({
  route: '/admin/my-plugin',
  capabilities: ['my-plugin.view'],
});
```

### 3. Use meta.app for Multi-App Organization

Distinguish admin vs public routes:

```javascript
{
  route: '/admin/settings',
  meta: {
    app: 'admin',  // Admin UI route
  },
}

{
  route: '/settings',
  meta: {
    app: 'public',  // Public-facing route
  },
}
```

### 4. Clean Up on Deactivate

Always remove routes when plugin deactivates:

```javascript
Actinium.Hook.register('deactivate', async ({ ID }) => {
  if (ID === PLUGIN.ID) {
    for (const route of PLUGIN_ROUTES) {
      await Actinium.Route.delete(route);
    }
  }
});
```

### 5. Use order for Route Grouping

Control display order in UI:

```javascript
{
  route: '/admin/dashboard',
  order: 10,  // First
}

{
  route: '/admin/settings',
  order: 1000,  // Last
}
```

### 6. Validate Blueprint Exists

Ensure blueprint is registered in frontend before creating route:

```javascript
// In route-before-save hook
Actinium.Hook.register('route-before-save', async (route, params) => {
  const blueprint = params.blueprint;
  // Could validate against known blueprints list
});
```

---

## Common Gotchas

### 1. Forgetting Blueprint Field

**Problem**: Route saves but crashes frontend.

**Cause**: `blueprint` field is required for frontend rendering.

**Fix**: Always provide blueprint:
```javascript
{
  route: '/admin/my-plugin',
  blueprint: 'MyPlugin',  // Required!
}
```

### 2. Built-In Routes Not Deleting

**Problem**: Trying to delete route but operation fails silently.

**Cause**: Route has `meta.builtIn: true`.

**Fix**: Remove `meta.builtIn` or use master key to force delete (not recommended).

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:149-156`

### 3. Route Not Showing in UI

**Possible causes**:
- User lacks capability (check `capabilities` array)
- Blueprint not registered in frontend
- Route not saved (check plugin active state)
- Frontend not fetching routes

**Debug**:
```javascript
const routes = await Actinium.Cloud.run('routes', {}, { sessionToken: userToken });
// Check if route exists and permitted field
```

### 4. Duplicate Routes on Restart

**Problem**: Multiple route objects with same path.

**Cause**: Not checking for existing route before save.

**Fix**: Use upsert logic (handled by Route.save automatically):
```javascript
// Route.save automatically finds existing route by path and updates
await Actinium.Route.save({
  route: '/admin/my-plugin',
  blueprint: 'MyPlugin',
});
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-route/plugin.js:138-144`

### 5. Capability Not Registered

**Problem**: Route exists but all users see `permitted: false`.

**Cause**: Capability string doesn't match registered capability.

**Fix**: Ensure exact match:
```javascript
// Register capability
Actinium.Capability.register('my-plugin.view', { ... });

// Use in route
{
  capabilities: ['my-plugin.view'],  // Must match exactly
}
```

### 6. Routes Not Cleaning Up

**Problem**: Deactivated plugin routes still in database.

**Cause**: Forgot deactivate hook or route has `meta.builtIn`.

**Fix**: Implement deactivate hook and remove built-in flag:
```javascript
Actinium.Hook.register('deactivate', async ({ ID }) => {
  if (ID === PLUGIN.ID) {
    for (const route of PLUGIN_ROUTES) {
      await Actinium.Route.delete(route);
    }
  }
});
```

### 7. Hook Order Confusion

**Problem**: Routes saved before capabilities registered.

**Cause**: Wrong hook priorities.

**Fix**: Use hook order:
1. `schema` hook - Register capabilities (priority 1000)
2. `start` hook - Save routes (priority 100 default)

### 8. Frontend Blueprint Mismatch

**Problem**: Route shows in list but renders wrong component.

**Cause**: Blueprint ID doesn't match registered frontend component.

**Fix**: Verify frontend registration:
```javascript
// Backend
{ blueprint: 'MyPlugin' }

// Frontend (must match)
Reactium.Blueprint.register('MyPlugin', { ... });
```

### 9. Missing meta Fields

**Problem**: Route metadata lost after save.

**Cause**: Metadata not preserved in upsert.

**Fix**: Always provide full metadata:
```javascript
await Actinium.Route.save({
  route: '/admin/my-plugin',
  blueprint: 'MyPlugin',
  meta: {
    builtIn: true,
    app: 'admin',
    category: 'tools',
    // ... all metadata
  },
});
```

### 10. Query Performance

**Problem**: Slow route list queries with many routes.

**Cause**: No pagination, fetching all routes.

**Fix**: Use pagination:
```javascript
const result = await Actinium.Cloud.run('routes', {
  limit: 50,
  page: 1,
});
```

---

## Summary

Route system provides:
- ✅ **Database-backed routes** - Dynamic route management
- ✅ **Blueprint integration** - Frontend component references
- ✅ **Capability-based access** - Fine-grained route visibility
- ✅ **Plugin lifecycle integration** - Automatic registration/cleanup
- ✅ **Built-in protection** - Prevent deletion of core routes
- ✅ **Hook extensibility** - Validation, transformation, permissions
- ✅ **Cloud function API** - CRUD operations with access control

**Critical for**:
- Admin UI navigation (dynamic route lists)
- Plugin-specific admin pages
- Multi-tenant route organization
- Capability-based UI visibility
- Dynamic route generation (content types, etc.)

**Complete reference chain**: CLAUDEDB → this file → Source code (file:line references above)
