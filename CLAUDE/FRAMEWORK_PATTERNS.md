<!-- v1.0.0 -->

# Reactium & Actinium Framework Patterns

> **Purpose**: This guide catalogs proven patterns, anti-patterns, and best practices for building applications with Reactium and Actinium frameworks. Each pattern includes rationale, implementation examples, and common pitfalls to avoid.

## Table of Contents

1. [Reactium Patterns](#reactium-patterns)
2. [Actinium Patterns](#actinium-patterns)
3. [Integration Patterns](#integration-patterns)
4. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
5. [Performance Patterns](#performance-patterns)
6. [Testing Patterns](#testing-patterns)

---

## Reactium Patterns

### Pattern 1: Domain-Driven Component Organization

**Problem**: Components scattered across technical layers make features hard to locate and maintain.

**Solution**: Organize components by domain/feature, with all related artifacts together.

**Good**:

```
src/app/components/
├── UserAuthentication/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── ForgotPassword.jsx
│   ├── reactium-hooks-auth.js
│   ├── reactium-route-auth.js
│   ├── auth-service.js
│   └── _reactium-style.scss
├── Dashboard/
│   ├── Dashboard.jsx
│   ├── DashboardWidget.jsx
│   ├── reactium-hooks-dashboard.js
│   ├── reactium-route-dashboard.js
│   └── _reactium-style.scss
```

**Bad**:

```
src/
├── components/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx
├── routes/
│   ├── authRoutes.js
│   ├── dashboardRoutes.js
├── hooks/
│   ├── authHooks.js
│   ├── dashboardHooks.js
├── styles/
│   ├── login.scss
│   ├── dashboard.scss
```

**Why**: Domain-driven organization makes features self-contained, easier to understand, test, and potentially extract as plugins.

---

### Pattern 2: Static Method Data Loading

**Problem**: Route data loading scattered across multiple files, hard to trace.

**Solution**: Define `loadState` as a static method on the component itself.

**Good**:

```javascript
// UserProfile.jsx
export const UserProfile = ({ params }) => {
  const handle = useSyncHandle(UserProfile.handleId);
  const user = handle?.get('user');

  return <div>{user?.get('username')}</div>;
};

// Static method - colocated with component
UserProfile.loadState = async ({ route, params, search }) => {
  const { userId } = params;
  const query = new Parse.Query('_User');
  const user = await query.get(userId);

  return { user, loading: false };
};

UserProfile.handleId = 'UserProfileHandle';

export default UserProfile;
```

**Bad**:

```javascript
// route.js (separate file)
export default [
  {
    path: '/user/:userId',
    component: UserProfile,
    loadState: async ({ params }) => {
      // Data loading logic separated from component
      const user = await fetchUser(params.userId);
      return { user };
    },
    handleId: 'UserProfileHandle',
  },
];
```

**Why**: Colocation improves maintainability. The component knows what data it needs and how to load it.

---

### Pattern 3: Handle-Based Shared State

**Problem**: Multiple components need to access the same data without prop drilling.

**Solution**: Use Handles for shared, observable state containers.

**Good**:

```javascript
// In a service or plugin initialization
import { Handle } from 'reactium-core/sdk';

const cartHandle = new Handle('ShoppingCart', {
  items: [],
  total: 0,
});

Handle.register('ShoppingCart', cartHandle);

export const CartService = {
  addItem: (item) => {
    const handle = Handle.get('ShoppingCart');
    const items = [...handle.get('items'), item];
    const total = items.reduce((sum, i) => sum + i.price, 0);

    handle.set({ items, total });
  },

  removeItem: (itemId) => {
    const handle = Handle.get('ShoppingCart');
    const items = handle.get('items').filter((i) => i.id !== itemId);
    const total = items.reduce((sum, i) => sum + i.price, 0);

    handle.set({ items, total });
  },
};
```

```javascript
// Component A - Adds items
import { useSyncHandle } from 'reactium-core/sdk';

const ProductCard = ({ product }) => {
  const cartHandle = useSyncHandle('ShoppingCart');

  const addToCart = () => {
    CartService.addItem(product);
  };

  return <button onClick={addToCart}>Add to Cart</button>;
};
```

```javascript
// Component B - Displays cart
import { useSyncHandle } from 'reactium-core/sdk';

const CartSummary = () => {
  const cartHandle = useSyncHandle('ShoppingCart');
  const items = cartHandle?.get('items') || [];
  const total = cartHandle?.get('total') || 0;

  return (
    <div>
      <p>Items: {items.length}</p>
      <p>Total: ${total}</p>
    </div>
  );
};
```

**Why**: Handles provide reactive state without prop drilling or complex context providers. Multiple components automatically re-render when Handle data changes.

---

### Pattern 4: Hook-Based Plugin Architecture

**Problem**: Hard-coded features make the application inflexible.

**Solution**: Use Reactium's hook system to create extension points.

**Good**:

```javascript
// Core feature - provides hooks
import Reactium from 'reactium-core/sdk';

const processCheckout = async (cart) => {
  // Allow plugins to modify cart before checkout
  const context = await Reactium.Hook.run('before-checkout', cart);

  // Process checkout
  const result = await submitOrder(context.cart);

  // Allow plugins to react to successful checkout
  await Reactium.Hook.run('after-checkout', result);

  return result;
};
```

```javascript
// Plugin A - adds discount code
Reactium.Hook.register(
  'before-checkout',
  async (cart, context) => {
    if (cart.discountCode) {
      const discount = await validateDiscountCode(cart.discountCode);
      context.cart.discount = discount;
      context.cart.total -= discount;
    }
  },
  Reactium.Enums.priority.neutral
);
```

```javascript
// Plugin B - sends confirmation email
Reactium.Hook.register(
  'after-checkout',
  async (result, context) => {
    await sendConfirmationEmail(result.user, result.order);
  },
  Reactium.Enums.priority.neutral
);
```

**Why**: Hooks create extensibility without tight coupling. Plugins can enhance functionality without modifying core code.

---

### Pattern 5: Transition State Management

**Problem**: Page transitions feel abrupt, no loading feedback during data fetching.

**Solution**: Use Reactium's transition system with explicit state progression.

**Good**:

```javascript
// Route definition
export default [
  {
    path: '/data-heavy-page',
    component: DataPage,
    transitions: true,
    transitionStates: [
      { state: 'LOADING', active: 'current' },
      { state: 'ENTERING', active: 'current' },
      { state: 'READY', active: 'current' },
    ],
  },
];
```

```javascript
// Component with transition handling
import Reactium from 'reactium-core/sdk';
import { useEffect } from 'react';

export const DataPage = ({ transitionState }) => {
  const handle = useSyncHandle(DataPage.handleId);

  useEffect(() => {
    if (transitionState === 'LOADING') {
      // Data already loaded by loadState
      // Just advance after brief delay
      setTimeout(() => {
        Reactium.Routing.nextState();
      }, 300);
    } else if (transitionState === 'ENTERING') {
      // Play enter animation
      setTimeout(() => {
        Reactium.Routing.nextState();
      }, 400);
    }
    // READY state - no action needed
  }, [transitionState]);

  if (transitionState === 'LOADING') {
    return <div className="loading-spinner">Loading...</div>;
  }

  const data = handle?.get('data');

  return (
    <div className={`data-page transition-${transitionState}`}>
      {/* Component content */}
    </div>
  );
};

DataPage.loadState = async ({ params }) => {
  const data = await fetchHeavyData(params);
  return { data, loading: false };
};

DataPage.handleId = 'DataPageHandle';
```

**Why**: Explicit transition states provide better UX and allow fine-grained control over page transitions and animations.

---

### Pattern 6: Component Registry Pattern

**Problem**: Dynamic component resolution at runtime.

**Solution**: Register components with the Component registry, retrieve by name.

**Good**:

```javascript
// Register components during plugin-init
Reactium.Hook.register(
  'plugin-init',
  async () => {
    const { Button } = await import('./Button');
    const { Input } = await import('./Input');
    const { Select } = await import('./Select');

    Reactium.Component.register('FormButton', Button);
    Reactium.Component.register('FormInput', Input);
    Reactium.Component.register('FormSelect', Select);
  },
  Reactium.Enums.priority.neutral
);
```

```javascript
// Dynamic component resolution
import { useHookComponent } from 'reactium-core/sdk';

const FormField = ({ type, ...props }) => {
    const componentName = `Form${type}`;  // 'FormButton', 'FormInput', etc.
    const Component = useHookComponent(componentName);

    if (!Component) {
        return <div>Unknown field type: {type}</div>;
    }

    return <Component {...props} />;
};

// Usage
<FormField type="Input" name="email" />
<FormField type="Button" label="Submit" />
```

**Why**: Component registry enables dynamic, pluggable UIs where components can be replaced or extended at runtime.

---

### Pattern 7: Conditional Route Registration

**Problem**: Not all routes should be available in all contexts (e.g., feature flags, user permissions).

**Solution**: Use the `register-route` hook to conditionally register routes.

**Good**:

```javascript
// Plugin hook
Reactium.Hook.register(
  'register-route',
  async (route, context) => {
    // Check feature flag
    if (route.id === 'beta-feature-route') {
      const betaEnabled = await Reactium.Setting.get('beta.enabled');

      if (!betaEnabled) {
        // Prevent route registration
        context.route = null;
        return;
      }
    }

    // Check user role for admin routes
    if (route.path?.startsWith('/admin')) {
      const currentUser = Parse.User.current();
      const isAdmin =
        currentUser && (await Reactium.Roles.User.is(currentUser, 'Admin'));

      if (!isAdmin) {
        context.route = null;
        return;
      }
    }
  },
  Reactium.Enums.priority.neutral
);
```

**Why**: Conditional route registration provides fine-grained control over application routing based on context, reducing the need for route guards and improving security.

---

## Actinium Patterns

### Pattern 8: Plugin SDK Pattern

**Problem**: Plugin logic scattered across multiple files.

**Solution**: Centralize plugin logic in an SDK, export via `sdk.js`.

**Good**:

```javascript
// api/src/app/analytics/analytics-service.js
class AnalyticsService {
  async trackEvent(eventName, userId, metadata) {
    const Event = Actinium.Object.extend('AnalyticsEvent');
    const event = new Event();

    event.set('name', eventName);
    event.set('userId', userId);
    event.set('metadata', metadata);
    event.set('timestamp', new Date());

    await event.save(null, { useMasterKey: true });

    return event;
  }

  async getEventsByUser(userId, limit = 100) {
    const query = new Actinium.Query('AnalyticsEvent');
    query.equalTo('userId', userId);
    query.descending('timestamp');
    query.limit(limit);

    return query.find({ useMasterKey: true });
  }

  async aggregateEvents(eventName, startDate, endDate) {
    // Aggregation logic
  }
}

export default new AnalyticsService();
```

```javascript
// api/src/app/analytics/sdk.js
import AnalyticsService from './analytics-service.js';

export default {
  trackEvent: AnalyticsService.trackEvent.bind(AnalyticsService),
  getEventsByUser: AnalyticsService.getEventsByUser.bind(AnalyticsService),
  aggregateEvents: AnalyticsService.aggregateEvents.bind(AnalyticsService),
};
```

```javascript
// api/src/app/analytics/plugin.js
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';
import SDK from './sdk.js';

const MOD = () => {
  // Attach SDK to Actinium global
  Actinium.Analytics = Actinium.Analytics || SDK;

  Actinium.Plugin.register(PLUGIN, true);

  // Cloud Functions
  Actinium.Cloud.define(PLUGIN.ID, 'trackEvent', async (req) => {
    const { eventName, metadata } = req.params;
    return SDK.trackEvent(eventName, req.user.id, metadata);
  });

  Actinium.Cloud.define(PLUGIN.ID, 'getUserEvents', async (req) => {
    const { limit } = req.params;
    return SDK.getEventsByUser(req.user.id, limit);
  });
};

export default MOD();
```

**Why**: SDK pattern provides clear separation between business logic (service), external interface (SDK), and framework integration (plugin). Makes testing easier and improves reusability.

---

### Pattern 9: Hook-Based Data Validation

**Problem**: Data validation logic duplicated across Cloud Functions.

**Solution**: Use `before-save` hooks for centralized validation.

**Good**:

```javascript
// Centralized validation in hook
Actinium.Hook.register(
  'before-save-Product',
  async (req, context) => {
    const { object } = req;

    // Validate required fields
    if (!object.get('name')) {
      throw new Parse.Error(
        Parse.Error.VALIDATION_ERROR,
        'Product name is required'
      );
    }

    if (!object.get('price') || object.get('price') <= 0) {
      throw new Parse.Error(
        Parse.Error.VALIDATION_ERROR,
        'Product price must be greater than 0'
      );
    }

    // Validate SKU uniqueness
    if (object.get('sku')) {
      const query = new Actinium.Query('Product');
      query.equalTo('sku', object.get('sku'));

      if (object.id) {
        query.notEqualTo('objectId', object.id);
      }

      const existing = await query.first({ useMasterKey: true });

      if (existing) {
        throw new Parse.Error(
          Parse.Error.DUPLICATE_VALUE,
          'SKU already exists'
        );
      }
    }

    // Auto-generate slug from name
    if (!object.get('slug')) {
      const slug = object
        .get('name')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      object.set('slug', slug);
    }
  },
  Actinium.Enums.priority.neutral
);
```

**Why**: Hooks provide a single point of validation regardless of how objects are saved (Cloud Functions, REST API, SDK). Reduces duplication and ensures consistency.

---

### Pattern 10: Capability-Based Authorization

**Problem**: Permission checks scattered throughout code, hard to maintain.

**Solution**: Define capabilities centrally, check before operations.

**Good**:

```javascript
// Define capabilities in plugin
const PLUGIN = {
  ID: 'ProductManager',
  // ...
  capabilities: [
    {
      capability: 'product.create',
      roles: { allowed: ['ProductManager', 'Admin'] },
    },
    {
      capability: 'product.update',
      roles: { allowed: ['ProductManager', 'Admin'] },
    },
    {
      capability: 'product.delete',
      roles: { allowed: ['Admin'] },
    },
    {
      capability: 'product.view',
      roles: { allowed: ['anonymous'] }, // Public
    },
  ],
};
```

```javascript
// Cloud Function with capability check
Actinium.Cloud.define(PLUGIN.ID, 'createProduct', async (req) => {
  // Check capability
  const canCreate = await Actinium.Capability.User.can(
    req.user,
    'product.create'
  );

  if (!canCreate) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      'Insufficient permissions'
    );
  }

  // Create product
  const { name, price, sku } = req.params;

  const Product = Actinium.Object.extend('Product');
  const product = new Product();

  product.set('name', name);
  product.set('price', price);
  product.set('sku', sku);

  await product.save(null, { useMasterKey: true });

  return product;
});
```

**Why**: Capability-based authorization provides fine-grained, declarative permissions. Easy to audit and modify as requirements change.

---

### Pattern 11: Schema Initialization Pattern

**Problem**: Database schemas not created consistently across environments.

**Solution**: Initialize schemas in `schema-created` hook.

**Good**:

```javascript
Actinium.Hook.register(
  'schema-created',
  async () => {
    const schemas = [
      {
        className: 'Product',
        fields: {
          name: 'String',
          description: 'String',
          price: 'Number',
          sku: 'String',
          stock: 'Number',
          active: 'Boolean',
          category: 'Pointer<Category>',
        },
        indexes: {
          sku_index: { sku: 1 },
          active_index: { active: 1 },
        },
      },
      {
        className: 'Category',
        fields: {
          name: 'String',
          slug: 'String',
          parent: 'Pointer<Category>',
        },
        indexes: {
          slug_index: { slug: 1 },
        },
      },
    ];

    for (const schemaConfig of schemas) {
      const schema = new Actinium.Schema(schemaConfig.className);

      try {
        // Check if schema exists
        await schema.get({ useMasterKey: true });
        console.log(`Schema ${schemaConfig.className} already exists`);
      } catch (err) {
        // Schema doesn't exist, create it
        for (const [fieldName, fieldType] of Object.entries(
          schemaConfig.fields
        )) {
          if (fieldType === 'String') {
            schema.addString(fieldName);
          } else if (fieldType === 'Number') {
            schema.addNumber(fieldName);
          } else if (fieldType === 'Boolean') {
            schema.addBoolean(fieldName);
          } else if (fieldType.startsWith('Pointer<')) {
            const targetClass = fieldType.match(/Pointer<(.+)>/)[1];
            schema.addPointer(fieldName, targetClass);
          }
        }

        // Add indexes
        if (schemaConfig.indexes) {
          for (const [indexName, indexFields] of Object.entries(
            schemaConfig.indexes
          )) {
            schema.addIndex(indexName, indexFields);
          }
        }

        await schema.save(null, { useMasterKey: true });
        console.log(`Schema ${schemaConfig.className} created`);
      }
    }
  },
  Actinium.Enums.priority.neutral,
  'ProductManager-schema'
);
```

**Why**: Centralized schema initialization ensures consistent database structure across development, staging, and production environments.

---

### Pattern 12: Plugin Dependency Management

**Problem**: Plugin B requires Plugin A to be loaded first.

**Solution**: Use `pluginDependencies` and `order` in plugin metadata.

**Good**:

```javascript
// Plugin A (base plugin)
// api/src/app/base-auth/info.js
const PLUGIN = {
  ID: 'BaseAuth',
  name: 'Base Authentication',
  order: 100, // Load early
  // ...
};

export default PLUGIN;
```

```javascript
// Plugin B (depends on Plugin A)
// api/src/app/advanced-auth/info.js
const PLUGIN = {
  ID: 'AdvancedAuth',
  name: 'Advanced Authentication',
  order: 200, // Load after BaseAuth
  pluginDependencies: ['BaseAuth'], // Explicit dependency
  // ...
};

export default PLUGIN;
```

```javascript
// Plugin B can safely use Plugin A's SDK
const MOD = () => {
  Actinium.Plugin.register(PLUGIN, true);

  // Use BaseAuth SDK
  Actinium.Cloud.define(PLUGIN.ID, 'advancedLogin', async (req) => {
    // BaseAuth is guaranteed to be loaded
    const result = await Actinium.BaseAuth.validateCredentials(req.params);

    // Additional advanced logic
    const twoFactorValid = await validate2FA(req.params.code);

    return { success: result && twoFactorValid };
  });
};
```

**Why**: Explicit dependencies prevent race conditions and ensure plugins load in the correct order.

---

### Pattern 13: Middleware Priority Pattern

**Problem**: Middleware executes in wrong order, breaking functionality.

**Solution**: Use priority levels to control middleware execution order.

**Good**:

```javascript
// CORS - must run first
Actinium.Middleware.register(
  'cors',
  (app) => {
    app.use(cors());
  },
  Actinium.Enums.priority.highest,
  'cors-middleware'
);

// Body parser - early
Actinium.Middleware.register(
  'body-parser',
  (app) => {
    app.use(express.json());
  },
  Actinium.Enums.priority.high,
  'body-parser-middleware'
);

// Authentication - normal priority
Actinium.Middleware.register(
  'auth',
  (app) => {
    app.use(authenticationMiddleware);
  },
  Actinium.Enums.priority.neutral,
  'auth-middleware'
);

// Custom routes - normal priority
Actinium.Middleware.register(
  'custom-routes',
  (app) => {
    app.get('/api/custom', handler);
  },
  Actinium.Enums.priority.neutral,
  'custom-routes'
);

// Error handler - must run last
Actinium.Middleware.register(
  'error-handler',
  (app) => {
    app.use((err, req, res, next) => {
      // Handle errors
    });
  },
  Actinium.Enums.priority.lowest,
  'error-handler'
);
```

**Why**: Proper middleware ordering prevents bugs and ensures features like CORS, authentication, and error handling work correctly.

---

## Integration Patterns

### Pattern 14: Optimistic UI Updates

**Problem**: UI feels slow waiting for backend confirmation.

**Solution**: Update UI immediately, rollback on error.

**Good**:

```javascript
// Frontend component
const TodoItem = ({ todo }) => {
  const state = useSyncState({ todo });

  const handleToggle = async () => {
    // Optimistically update UI
    const originalCompleted = state.get('todo').get('completed');
    state.get('todo').set('completed', !originalCompleted);
    state.set('todo', state.get('todo')); // Trigger re-render

    try {
      // Update backend
      await Parse.Cloud.run('updateTodo', {
        todoId: todo.id,
        completed: !originalCompleted,
      });
    } catch (error) {
      // Rollback on error
      state.get('todo').set('completed', originalCompleted);
      state.set('todo', state.get('todo'));
      alert('Failed to update todo');
    }
  };

  return (
    <div>
      <input
        type="checkbox"
        checked={state.get('todo').get('completed')}
        onChange={handleToggle}
      />
      {state.get('todo').get('title')}
    </div>
  );
};
```

**Why**: Optimistic updates provide instant feedback, improving perceived performance. Rollback ensures consistency on failure.

---

### Pattern 15: Backend Caching Pattern

**Problem**: Expensive external API calls repeated unnecessarily.

**Solution**: Cache results in Parse database with TTL.

**Good**:

```javascript
// Backend Cloud Function with caching
Actinium.Cloud.define(PLUGIN.ID, 'getCryptoPrice', async (req) => {
  const { symbol } = req.params;
  const CACHE_TTL = 60 * 1000; // 1 minute

  // Check cache
  const query = new Actinium.Query('PriceCache');
  query.equalTo('symbol', symbol);
  query.descending('createdAt');

  const cached = await query.first({ useMasterKey: true });

  if (cached) {
    const age = Date.now() - cached.get('createdAt').getTime();

    if (age < CACHE_TTL) {
      console.log('Returning cached price for', symbol);
      return cached.get('data');
    }
  }

  // Cache miss or expired, fetch fresh data
  console.log('Fetching fresh price for', symbol);
  const freshData = await externalAPI.getPrice(symbol);

  // Store in cache
  const PriceCache = Actinium.Object.extend('PriceCache');
  const cacheEntry = new PriceCache();

  cacheEntry.set('symbol', symbol);
  cacheEntry.set('data', freshData);
  cacheEntry.set('createdAt', new Date());

  await cacheEntry.save(null, { useMasterKey: true });

  return freshData;
});
```

**Why**: Caching reduces external API costs, improves response times, and provides resilience if external service is down.

---

### Pattern 16: Webhook Pattern

**Problem**: Need to notify external services when data changes.

**Solution**: Use `after-save` hooks to trigger webhooks.

**Good**:

```javascript
// Backend webhook integration
Actinium.Hook.register(
  'after-save-Order',
  async (req, context) => {
    const { object: order } = req;

    // Only trigger webhook for new orders
    if (!order.existed()) {
      const webhookURL = process.env.ORDER_WEBHOOK_URL;

      if (webhookURL) {
        const payload = {
          orderId: order.id,
          userId: order.get('user').id,
          total: order.get('total'),
          items: order.get('items'),
          timestamp: order.get('createdAt').toISOString(),
        };

        try {
          await fetch(webhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          console.log('Webhook sent for order', order.id);
        } catch (error) {
          console.error('Webhook failed:', error);
          // Don't throw - webhook failure shouldn't block order creation
        }
      }
    }
  },
  Actinium.Enums.priority.low
); // Run after other hooks
```

**Why**: Webhooks enable integration with external systems without tight coupling. Using hooks keeps webhook logic separate from business logic.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Editing Generated Manifest

**Problem**: Manually editing `src/manifest.js`.

**Impact**: Changes are overwritten on next build.

**Solution**: Never edit manifest directly. Add/rename files following conventions, regenerate manifest.

```bash
# Correct approach
npx reactium manifest
```

---

### Anti-Pattern 2: Forgetting IIFE in Hooks Files

**Problem**: Top-level `await` without IIFE wrapper.

**Bad**:

```javascript
// reactium-hooks-mycomponent.js
const { Hook } = await import('reactium-core/sdk');
Hook.register('plugin-init', ...);  // Never executes!
```

**Good**:

```javascript
// reactium-hooks-mycomponent.js
(async () => {
    const { Hook } = await import('reactium-core/sdk');
    Hook.register('plugin-init', ...);
})();
```

**Why**: Without IIFE, the async code is never executed.

---

### Anti-Pattern 3: Using `useState` Instead of `useSyncState`

**Problem**: Using React's `useState` when `useSyncState` is more appropriate.

**Bad**:

```javascript
const [count, setCount] = useState(0);

// Later in code, passing state around is cumbersome
someFunction(count, setCount);
```

**Good**:

```javascript
const state = useSyncState({ count: 0 });

// State object is easily passed around
someFunction(state);

// Inside someFunction
const increment = () => state.set('count', state.get('count') + 1);
```

**Why**: `useSyncState` provides an observable object that's easier to pass around and integrate with Reactium's reactive systems.

---

### Anti-Pattern 4: Not Calling MOD() in Plugin

**Problem**: Forgetting to execute plugin function.

**Bad**:

```javascript
// plugin.js
const MOD = () => {
  Actinium.Plugin.register(PLUGIN, true);
  // Registration code
};

export default MOD; // Function not executed!
```

**Good**:

```javascript
// plugin.js
const MOD = () => {
  Actinium.Plugin.register(PLUGIN, true);
  // Registration code
};

export default MOD(); // Execute immediately
```

**Why**: Plugin code must execute on import. Exporting the function without calling it means the plugin never registers.

---

### Anti-Pattern 5: Using `require` in Actinium

**Problem**: Using CommonJS syntax in ES module environment.

**Bad**:

```javascript
// Will fail in Actinium
const Actinium = require('@atomic-reactor/actinium-core');
```

**Good**:

```javascript
import Actinium from '@atomic-reactor/actinium-core';
```

**Why**: Actinium requires ES modules (`"type": "module"` in `package.json`). CommonJS syntax causes errors.

---

### Anti-Pattern 6: Not Using Master Key for Backend Operations

**Problem**: ACL restrictions block backend operations.

**Bad**:

```javascript
// In Cloud Function
const query = new Actinium.Query('SensitiveData');
const results = await query.find(); // May fail due to ACLs
```

**Good**:

```javascript
// In Cloud Function
const query = new Actinium.Query('SensitiveData');
const results = await query.find({ useMasterKey: true });
```

**Why**: Backend code runs with privileges. Using master key bypasses ACLs appropriately for trusted backend operations.

---

### Anti-Pattern 7: Blocking Hook Execution

**Problem**: Long-running synchronous operations in hooks.

**Bad**:

```javascript
Reactium.Hook.register(
  'plugin-init',
  async () => {
    // Synchronous CPU-intensive operation
    for (let i = 0; i < 1000000000; i++) {
      // Blocking operation
    }
  },
  priority
);
```

**Good**:

```javascript
Reactium.Hook.register(
  'plugin-init',
  async () => {
    // Defer heavy work
    setTimeout(() => {
      // Heavy operation in background
      performHeavyWork();
    }, 0);

    // Or use async operation
    await performAsyncWork();
  },
  priority
);
```

**Why**: Hooks block application initialization. Long-running synchronous operations delay startup.

---

### Anti-Pattern 8: Ignoring Hook Priority

**Problem**: Assuming hooks execute in registration order.

**Bad**:

```javascript
// Plugin A
Hook.register('init', setupA); // Default priority: 0

// Plugin B (depends on A)
Hook.register('init', setupB); // Default priority: 0
// May run before setupA!
```

**Good**:

```javascript
// Plugin A
Hook.register('init', setupA, Enums.priority.high); // -100

// Plugin B (depends on A)
Hook.register('init', setupB, Enums.priority.neutral); // 0
// Guaranteed to run after setupA
```

**Why**: Without explicit priorities, execution order is undefined. Use priorities to enforce dependencies.

---

### Anti-Pattern 9: Not Handling Parse Errors

**Problem**: Generic error messages confuse users.

**Bad**:

```javascript
try {
  await Parse.Cloud.run('someFunction', params);
} catch (error) {
  alert(error.message); // Might be technical jargon
}
```

**Good**:

```javascript
try {
  await Parse.Cloud.run('someFunction', params);
} catch (error) {
  let userMessage = 'An error occurred. Please try again.';

  switch (error.code) {
    case Parse.Error.INVALID_SESSION_TOKEN:
      userMessage = 'Your session has expired. Please log in again.';
      window.location.href = '/login';
      break;
    case Parse.Error.CONNECTION_FAILED:
      userMessage = 'Network connection failed. Check your internet.';
      break;
    case Parse.Error.OBJECT_NOT_FOUND:
      userMessage = 'The requested item was not found.';
      break;
    default:
      userMessage = error.message || userMessage;
  }

  alert(userMessage);
}
```

**Why**: Parse errors include technical details. Translate to user-friendly messages for better UX.

---

### Anti-Pattern 10: Over-Using Global State

**Problem**: Putting everything in `Reactium.State` or handles.

**Bad**:

```javascript
// Every tiny piece of state becomes global
Reactium.State.set('buttonHoverState', true);
Reactium.State.set('modalScrollPosition', 42);
Reactium.State.set('tempFormValue', 'xyz');
```

**Good**:

```javascript
// Local component state for UI-only concerns
const state = useSyncState({
  buttonHovered: false,
  modalScroll: 0,
  tempValue: '',
});

// Global state only for truly shared data
Reactium.State.set('currentUser', user);
Reactium.State.set('appConfig', config);
```

**Why**: Global state creates coupling and makes debugging harder. Keep state as local as possible, global only when necessary.

---

## Performance Patterns

### Pattern 17: Code Splitting with Dynamic Imports

**Problem**: Large bundle size slows initial page load.

**Solution**: Use dynamic imports for routes and components.

**Good**:

```javascript
// Route with code splitting
export default [
  {
    path: '/admin/dashboard',
    component: 'AdminDashboard', // String reference, lazy loaded
    exact: true,
  },
];
```

```javascript
// Component registration with dynamic import
Reactium.Hook.register(
  'plugin-init',
  async () => {
    // Only loaded when component is used
    const { AdminDashboard } = await import('./AdminDashboard');
    Reactium.Component.register('AdminDashboard', AdminDashboard);
  },
  priority
);
```

**Why**: Code splitting reduces initial bundle size, improving time-to-interactive.

---

### Pattern 18: Debounced Parse Queries

**Problem**: Search inputs trigger excessive API calls.

**Solution**: Debounce user input before querying.

**Good**:

```javascript
import { useSyncState } from 'reactium-core/sdk';
import { useEffect } from 'react';
import _ from 'lodash';

const SearchComponent = () => {
  const state = useSyncState({
    query: '',
    results: [],
  });

  useEffect(() => {
    const debouncedSearch = _.debounce(async (searchQuery) => {
      if (searchQuery.length < 3) {
        state.set('results', []);
        return;
      }

      const query = new Parse.Query('Product');
      query.matches('name', new RegExp(searchQuery, 'i'));
      query.limit(10);

      const results = await query.find();
      state.set('results', results);
    }, 300);

    debouncedSearch(state.get('query'));
  }, [state.get('query')]);

  return (
    <div>
      <input
        value={state.get('query')}
        onChange={(e) => state.set('query', e.target.value)}
        placeholder="Search products..."
      />
      <ul>
        {state.get('results').map((result) => (
          <li key={result.id}>{result.get('name')}</li>
        ))}
      </ul>
    </div>
  );
};
```

**Why**: Debouncing reduces API calls, improving performance and reducing backend load.

---

### Pattern 19: Pagination Pattern

**Problem**: Loading large datasets crashes the app or is very slow.

**Solution**: Implement pagination with Parse queries.

**Backend**:

```javascript
Actinium.Cloud.define(PLUGIN.ID, 'getProducts', async (req) => {
  const { page = 1, limit = 20, category } = req.params;

  const query = new Actinium.Query('Product');

  if (category) {
    query.equalTo('category', category);
  }

  query.limit(limit);
  query.skip((page - 1) * limit);
  query.descending('createdAt');

  const [results, total] = await Promise.all([
    query.find({ useMasterKey: true }),
    query.count({ useMasterKey: true }),
  ]);

  return {
    results,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
});
```

**Frontend**:

```javascript
const ProductList = () => {
  const state = useSyncState({
    products: [],
    currentPage: 1,
    totalPages: 1,
    loading: false,
  });

  const loadProducts = async (page) => {
    state.set('loading', true);

    const result = await Parse.Cloud.run('getProducts', {
      page,
      limit: 20,
    });

    state.set({
      products: result.results,
      currentPage: result.page,
      totalPages: result.pages,
      loading: false,
    });
  };

  useEffect(() => {
    loadProducts(state.get('currentPage'));
  }, [state.get('currentPage')]);

  return (
    <div>
      {/* Product list */}
      <button
        onClick={() => state.set('currentPage', state.get('currentPage') - 1)}
        disabled={state.get('currentPage') === 1}
      >
        Previous
      </button>
      <span>
        Page {state.get('currentPage')} of {state.get('totalPages')}
      </span>
      <button
        onClick={() => state.set('currentPage', state.get('currentPage') + 1)}
        disabled={state.get('currentPage') === state.get('totalPages')}
      >
        Next
      </button>
    </div>
  );
};
```

**Why**: Pagination reduces memory usage and improves load times for large datasets.

---

## Testing Patterns

### Pattern 20: Cypress Component Testing

**Problem**: Hard to test Reactium components in isolation.

**Solution**: Use Cypress component testing with proper setup.

**Good**:

```javascript
// cypress/component/DataLoader.cy.js
import { DataLoader } from '../../src/app/components/DataLoader/DataLoader';
import Parse from 'parse';

describe('DataLoader Component', () => {
  beforeEach(() => {
    // Initialize Parse SDK
    Parse.initialize('test-app-id', 'test-js-key');
    Parse.serverURL = 'http://localhost:9000/parse';

    // Mock Parse Cloud Function
    cy.stub(Parse.Cloud, 'run').resolves({
      data: { test: 'data' },
    });
  });

  it('should display loading state initially', () => {
    cy.mount(<DataLoader />);
    cy.get('[data-cy=loading]').should('exist');
  });

  it('should display loaded data', () => {
    cy.mount(<DataLoader />);
    cy.get('[data-cy=data-loaded]').should('exist');
    cy.get('[data-cy=data-loaded]').should('contain', 'test');
  });
});
```

**Why**: Component testing catches bugs early without requiring full application setup.

---

## Summary

These patterns represent battle-tested approaches to building applications with Reactium and Actinium:

**Key Takeaways**:

1. **Embrace Conventions**: Both frameworks thrive on convention-over-configuration
2. **Use Hooks for Extensibility**: Hooks are the primary extension mechanism
3. **Colocation is Good**: Keep related files together in domain directories
4. **Handles for Shared State**: Use Handles when multiple components need reactive shared state
5. **SDKs for Plugins**: Expose plugin functionality through clean SDK interfaces
6. **Explicit Priorities**: Always specify hook and middleware priorities
7. **Master Key Appropriately**: Use master key for backend operations, never expose to clients
8. **Error Handling Matters**: Translate technical errors to user-friendly messages
9. **Performance is a Feature**: Use code splitting, caching, and pagination
10. **Test Early and Often**: Component tests catch issues before integration

By following these patterns and avoiding anti-patterns, you'll build more maintainable, performant, and extensible applications.

For more details, see:

- [REACTIUM_FRAMEWORK.md](REACTIUM_FRAMEWORK.md)
- [ACTINIUM_FRAMEWORK.md](ACTINIUM_FRAMEWORK.md)
- [FRAMEWORK_INTEGRATION.md](FRAMEWORK_INTEGRATION.md)
