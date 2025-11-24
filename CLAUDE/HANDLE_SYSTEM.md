<!-- v1.0.0 -->

# Handle System Architecture

## Overview

The Handle system is Reactium's **global component communication** and **cross-component state sharing** mechanism. It's a publish-subscribe registry that allows components to register, share, and consume data/APIs anywhere in the application without prop drilling or Context providers.

**Source:** `reactium-sdk-core/src/browser/Handle.ts`

**Key Characteristics:**
- **Global singleton registry** - One `ReactiumHandle` instance per app
- **object-path addressing** - Supports nested IDs like `'user.profile'` or `['cart', 'items']`
- **Publish-subscribe model** - Subscribers notified on handle registration/unregistration
- **React hooks integration** - Seamlessly integrates with React component lifecycle
- **No Context providers required** - Direct global access

## Core Architecture

### The Handle Registry

**Source:** `reactium-sdk-core/src/browser/Handle.ts:8-104`

```typescript
class Handle {
    handles = {};               // Storage for all registered handles (object-path nested)
    subscriptions = {};         // Callbacks invoked on handle changes

    // Register a handle (updates subscribers)
    register<HandleType>(id: Path, ref, update = true)

    // Unregister a handle (updates subscribers)
    unregister(id: Path)

    // Retrieve a handle (no subscription)
    get<HandleType>(id: Path, defaultReturn?)

    // Check if handle exists
    has(id: Path): boolean

    // List all handles
    list(): object

    // Subscribe to all handle changes (returns unsubscribe function)
    subscribe(cb: Function): () => void
}

const ReactiumHandle = new Handle(); // Singleton
export { ReactiumHandle as Handle };
```

**Critical Pattern:** Handles are stored using `object-path`, allowing hierarchical organization:

```javascript
Handle.register('user.profile', profileData);
Handle.register('user.settings', settingsData);
Handle.get('user'); // { profile: {...}, settings: {...} }
```

## React Hook Integration

### Provider Pattern: `useRegisterHandle`

**Source:** `reactium-sdk-core/src/browser/useRegisterHandle.ts:22-35`

**Purpose:** Register a handle from a component (handle provider)

```typescript
useRegisterHandle<HandleType>(
    ID: Path,                    // Handle identifier (string or array)
    cb: () => HandleType,        // Factory function creating handle value
    deps: DependencyList = []    // When to re-create handle
): void
```

**Lifecycle:**
1. Component mounts → `cb()` executed → `Handle.register(ID, ref)` called
2. `deps` change → `cb()` re-executed → handle updated
3. Component unmounts → `Handle.unregister(ID)` called

**Example - Simple API Exposure:**

```javascript
// Source pattern from routing system (Reactium-Core-Plugins/.../routing/index.js:129)
import { useRegisterHandle } from '@atomic-reactor/reactium-core/sdk';

const ApiService = () => {
    useRegisterHandle('api', () => ({
        async fetchUser(id) {
            return fetch(`/api/users/${id}`).then(r => r.json());
        },
        async saveUser(data) {
            return fetch('/api/users', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
    }), []); // Empty deps - created once

    return null; // No UI needed
};
```

**Example - Dynamic Handle Based on Props:**

```javascript
const UserProvider = ({ userId }) => {
    useRegisterHandle('current-user', async () => {
        const user = await fetch(`/api/users/${userId}`).then(r => r.json());
        return { user, isAdmin: user.role === 'admin' };
    }, [userId]); // Re-fetch when userId changes

    return null;
};
```

### Consumer Pattern: `useHandle`

**Source:** `reactium-sdk-core/src/browser/useHandle.ts:20-45`

**Purpose:** Retrieve handle WITHOUT subscribing to state changes inside it

```typescript
useHandle<HandleType>(ID: Path): HandleType | undefined
```

**Behavior:**
- ✅ **Subscribes to Handle registry changes** (re-renders when handle registered/unregistered)
- ❌ **Does NOT subscribe to handle's internal state** (no re-render when handle data changes)

**When to Use:**
- Reading static API objects
- One-time data reads
- When you'll manually subscribe with `useEventEffect`

**Example:**

```javascript
import { useHandle } from '@atomic-reactor/reactium-core/sdk';

const UserProfile = () => {
    const api = useHandle('api'); // Gets API object

    const handleClick = async () => {
        const user = await api.fetchUser(123); // Works fine
        console.log(user);
    };

    // WARNING: Component won't re-render if 'api' handle changes internally!
    return <button onClick={handleClick}>Fetch User</button>;
};
```

### Reactive Consumer Pattern: `useSyncHandle`

**Source:** `reactium-sdk-core/src/browser/useSyncHandle.ts:25-35`

**Purpose:** Retrieve handle AND subscribe to its internal state changes

```typescript
useSyncHandle<T extends object>(
    ID: Path,
    updateEvent: string = 'set'  // Event to trigger re-render
): ReactiumSyncState<T>
```

**Behavior:**
- ✅ **Subscribes to Handle registry changes** (re-renders when handle registered/unregistered)
- ✅ **Subscribes to handle's internal events** (re-renders when specified event fires)

**When to Use:**
- Handle contains `ReactiumSyncState` (observable state)
- Component needs reactive updates when handle data changes
- **This is the pattern for global state consumption**

**Example:**

```javascript
import { useSyncHandle } from '@atomic-reactor/reactium-core/sdk';

const ThemeSwitcher = () => {
    const themeHandle = useSyncHandle('app-theme'); // Re-renders on 'set' event

    const theme = themeHandle?.get('mode', 'light');

    const toggle = () => {
        const newMode = theme === 'light' ? 'dark' : 'light';
        themeHandle.set('mode', newMode); // Triggers re-render automatically
    };

    return (
        <button onClick={toggle}>
            Current: {theme}
        </button>
    );
};
```

### Observable State Provider: `useRegisterSyncHandle`

**Source:** `reactium-sdk-core/src/browser/useRegisterSyncHandle.ts:33-47`

**Purpose:** Register a **ReactiumSyncState** as a global handle (observable global state)

```typescript
useRegisterSyncHandle<T extends object>(
    ID: Path,
    initialState: T,
    updateEvent: string = 'set'
): ReactiumSyncState<T>
```

**What it does:**
1. Creates `ReactiumSyncState` instance with `initialState`
2. Wraps it in a `ref` object
3. Registers ref as handle: `Handle.register(ID, ref)`
4. Returns the `ReactiumSyncState` instance for local use

**Pattern - Global State with Methods:**

```javascript
import { useRegisterSyncHandle } from '@atomic-reactor/reactium-core/sdk';

const CartProvider = () => {
    const cart = useRegisterSyncHandle('shopping-cart', {
        items: [],
        total: 0
    });

    // Extend with methods
    cart.extend('addItem', (item) => {
        const items = cart.get('items', []);
        cart.set('items', [...items, item]);
        cart.set('total', cart.get('total', 0) + item.price);
    });

    cart.extend('clear', () => {
        cart.set({ items: [], total: 0 });
    });

    return null;
};

// Consumer component
const CartSummary = () => {
    const cart = useSyncHandle('shopping-cart');
    const total = cart?.get('total', 0);

    return <div>Total: ${total}</div>; // Re-renders on cart changes
};
```

### Selective Re-rendering: `useSelectHandle`

**Source:** `reactium-sdk-core/src/browser/useSelectHandle.ts:31-78`

**Purpose:** Subscribe to specific properties of a handle (performance optimization)

```typescript
useSelectHandle<T extends ReactiumSyncState<object>>(
    ID: Path,
    selector: Path | ((state: T) => any),
    defaultValue?: any
): { handle: T, selected: any }
```

**Behavior:**
- Only re-renders when **selected data** changes (not entire handle)
- Supports path-based selection or callback function

**Example - Path Selector:**

```javascript
import { useSelectHandle } from '@atomic-reactor/reactium-core/sdk';

const UserName = () => {
    const { selected: name } = useSelectHandle('app-state', 'user.name', 'Guest');

    // Only re-renders when user.name changes (not other app-state changes)
    return <span>Welcome, {name}</span>;
};
```

**Example - Callback Selector:**

```javascript
const ItemCount = () => {
    const { handle, selected: count } = useSelectHandle(
        'shopping-cart',
        (cart) => cart.get('items', []).length
    );

    // Only re-renders when items.length changes (not when total changes)
    return <div>{count} items</div>;
};
```

## Real-World Usage Patterns

### Pattern 1: Global State (Reactium.State)

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/named-exports/state.js:14`

Reactium provides a free global state Handle:

```javascript
export const State = new ReactiumSyncState(window.state || {});
// State is NOT registered in Handle registry - it's a standalone singleton
```

**However**, you can create your own global state Handles:

```javascript
// Provider
const AppStateProvider = () => {
    const state = useRegisterSyncHandle('app-state', {
        user: null,
        theme: 'light',
        notifications: []
    });

    // Extend with business logic
    state.extend('login', async (credentials) => {
        const user = await fetch('/api/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        }).then(r => r.json());
        state.set('user', user);
    });

    return null;
};

// Consumer
const UserGreeting = () => {
    const state = useSyncHandle('app-state');
    const user = state?.get('user');

    return user ? <div>Hello, {user.name}</div> : <div>Please log in</div>;
};
```

### Pattern 2: Route Data Loading

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/routing/index.js:121-159`

Routing system uses Handles to store loaded data per route:

```javascript
// Simplified from routing/index.js:121-159
const handleFrontEndDataLoading = async (updates) => {
    const loadState = updates.active.match.route.component.loadState;
    const handleId = updates.active.match.route.component.handleId || uuid();

    if (typeof loadState === 'function') {
        // Create handle with ReactiumSyncState
        Handle.register(handleId, {
            routeId: updates.active.match.route.id,
            persistHandle: false,
            current: new ReactiumSyncState({})
        });

        // Load data
        const content = await loadState({ route, params, search });

        // Update handle
        const handle = Handle.get([handleId, 'current']);
        if (handle) handle.set(content);
    }
};
```

**Component consumption:**

```javascript
export const ProductPage = ({ handleId }) => {
    const handle = useSyncHandle(handleId);
    const product = handle?.get('product');

    return product ? <div>{product.name}</div> : <div>Loading...</div>;
};

ProductPage.loadState = async ({ params }) => {
    const product = await fetch(`/api/products/${params.id}`).then(r => r.json());
    return { product };
};

ProductPage.handleId = 'ProductPageHandle';
```

### Pattern 3: Route Handle Cleanup

**Source:** `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/routing/index.js:93-107`

Routing system automatically cleans up route handles on navigation:

```javascript
// On route change, unregister handles from previous route
Object.entries(Handle.handles)
    .filter(([, handle]) => {
        return handle.routeId === updates.previous.match.route.id;
    })
    .filter(([id]) => {
        return Handle.get(id)?.persistHandle !== true;
    })
    .forEach(([id]) => {
        Handle.unregister(id);
    });
```

**Persistent handles:** Set `persistHandle: true` on route configuration to prevent cleanup:

```javascript
export default [{
    path: '/dashboard',
    component: Dashboard,
    persistHandle: true, // Handle survives route navigation
    handleId: 'DashboardHandle'
}];
```

### Pattern 4: Plugin Communication

**Example - Plugin exposes API via Handle:**

```javascript
// Plugin A - Provider
const AnalyticsPlugin = () => {
    useRegisterHandle('analytics', () => ({
        trackEvent(name, data) {
            console.log('Event:', name, data);
            // Send to analytics service
        },
        trackPageView(path) {
            console.log('Page view:', path);
        }
    }), []);

    return null;
};

// Plugin B - Consumer
const NavigationPlugin = () => {
    const analytics = useHandle('analytics');

    const handleNavigation = (path) => {
        analytics?.trackPageView(path);
    };

    return <nav onClick={() => handleNavigation('/about')}>About</nav>;
};
```

### Pattern 5: Component Instance Communication

**Example - Parent controls child via Handle:**

```javascript
// Child component exposes API
const VideoPlayer = () => {
    useRegisterHandle('video-player', () => ({
        play: () => videoRef.current?.play(),
        pause: () => videoRef.current?.pause(),
        seek: (time) => { videoRef.current.currentTime = time; }
    }), []);

    const videoRef = useRef();
    return <video ref={videoRef} />;
};

// Parent controls child
const VideoControls = () => {
    const player = useHandle('video-player');

    return (
        <div>
            <button onClick={() => player?.play()}>Play</button>
            <button onClick={() => player?.pause()}>Pause</button>
        </div>
    );
};
```

## Integration with ReactiumSyncState

**Key Insight:** Handles can store **any value**, but using `ReactiumSyncState` enables reactive patterns.

**See also:** [REACTIUM_SYNC_STATE.md](REACTIUM_SYNC_STATE.md) for comprehensive ReactiumSyncState documentation.

**Three state management approaches:**

### 1. Static Handle (no reactivity)

```javascript
// Provider
useRegisterHandle('config', () => ({
    apiUrl: 'https://api.example.com',
    version: '1.0.0'
}), []);

// Consumer (no re-renders on changes)
const api = useHandle('config');
```

### 2. Observable Handle (ReactiumSyncState)

```javascript
// Provider
const state = useRegisterSyncHandle('user-prefs', {
    theme: 'light',
    language: 'en'
});

// Consumer (re-renders on state.set())
const prefs = useSyncHandle('user-prefs');
const theme = prefs?.get('theme');
```

### 3. Hybrid (Handle wraps ReactiumSyncState with methods)

```javascript
// Provider
const state = useRegisterSyncHandle('app-data', { count: 0 });

state.extend('increment', () => {
    state.set('count', state.get('count', 0) + 1);
});

useRegisterHandle('app-api', () => ({
    increment: () => state.increment(),
    reset: () => state.set('count', 0),
    getState: () => state
}), [state]);

// Consumer (uses API)
const api = useHandle('app-api');
api.increment();

// Consumer (reactive state)
const state = useSyncHandle('app-data');
const count = state?.get('count'); // Re-renders on changes
```

## Comparison with Other Patterns

### Handle vs React Context

| Feature | Handle | Context |
|---------|--------|---------|
| **Setup** | Register anywhere | Requires Provider wrapper |
| **Access** | Global, direct | Must be within Provider tree |
| **Performance** | Selective subscriptions | All consumers re-render |
| **Dynamism** | Register/unregister anytime | Provider must be in tree |
| **Use Case** | Cross-plugin APIs, global state | Theme, auth, localization |

**Example equivalence:**

```javascript
// Context pattern
<ThemeProvider>
    <App />
</ThemeProvider>

// Handle pattern (no Provider needed)
const ThemeManager = () => {
    useRegisterSyncHandle('theme', { mode: 'light' });
    return null;
};
// Use anywhere: useSyncHandle('theme')
```

### Handle vs Redux/MobX

| Feature | Handle | Redux/MobX |
|---------|--------|------------|
| **Boilerplate** | Minimal | Actions, reducers, stores |
| **Learning Curve** | Low | Medium/High |
| **DevTools** | None | Excellent |
| **Time Travel** | No | Yes (Redux) |
| **Use Case** | Reactium apps, simple state | Complex state, debugging |

**When to use Handle:**
- ✅ Reactium applications (native pattern)
- ✅ Plugin communication
- ✅ Simple global state
- ✅ API exposure patterns

**When to use Redux:**
- ❌ Need DevTools and time travel debugging
- ❌ Complex state logic requiring middleware
- ❌ Team familiar with Redux patterns

## Lifecycle Integration

**Hook Timing (Browser-Side):**

```
plugin-dependencies
  → plugin-init (plugins register handles here)
    → routes-init
      → register-route
        → component-bindings
          → app-context-provider
            → app-router
              → ReactDOM.render (components can now consume handles)
```

**Best Practice:** Register handles during `plugin-init` hook:

```javascript
// reactium-hooks-MyPlugin.js
import { Hook, Enums } from '@atomic-reactor/reactium-core/sdk';

const { neutral } = Enums.priority;

Hook.register('plugin-init', async () => {
    const { MyService } = await import('./MyService');

    Handle.register('my-service', {
        current: new MyService()
    });
}, neutral, 'my-plugin-handle-registration');
```

## Performance Considerations

### 1. Selective Subscriptions with `useSelectHandle`

```javascript
// ❌ BAD - Re-renders on ANY cart change
const Cart = () => {
    const cart = useSyncHandle('cart');
    const itemCount = cart?.get('items', []).length;
    return <div>{itemCount} items</div>;
};

// ✅ GOOD - Only re-renders when items.length changes
const Cart = () => {
    const { selected: itemCount } = useSelectHandle(
        'cart',
        (c) => c.get('items', []).length
    );
    return <div>{itemCount} items</div>;
};
```

### 2. Avoid Over-Subscribing

```javascript
// ❌ BAD - Creates subscription on every render
const MyComponent = () => {
    const handle = useSyncHandle('data'); // Subscription overhead
    // ... but never uses handle
};

// ✅ GOOD - Only retrieve if needed
const MyComponent = () => {
    const handleClick = () => {
        const handle = Handle.get('data'); // No subscription
        console.log(handle.get('value'));
    };
};
```

### 3. Cleanup Unused Handles

```javascript
// Automatically cleaned by useRegisterHandle on unmount
// But for manual registration:
const MyComponent = () => {
    useEffect(() => {
        Handle.register('temp-data', tempValue);

        return () => {
            Handle.unregister('temp-data'); // Cleanup
        };
    }, []);
};
```

## Common Gotchas

### 1. `useHandle` vs `useSyncHandle` Confusion

**Problem:** Using `useHandle` when you need reactive updates.

```javascript
// ❌ WRONG - Component won't re-render when count changes
const Counter = () => {
    const state = useHandle('counter'); // ReactiumSyncState instance
    const count = state?.get('count', 0);
    return <div>{count}</div>; // Stale value!
};

// ✅ CORRECT
const Counter = () => {
    const state = useSyncHandle('counter'); // Subscribes to 'set' events
    const count = state?.get('count', 0);
    return <div>{count}</div>; // Updates on state.set()
};
```

**Rule of Thumb:**
- **`useHandle`**: For static APIs, one-time reads
- **`useSyncHandle`**: For ReactiumSyncState that changes

### 2. Handle Not Yet Registered

**Problem:** Consumer renders before provider registers handle.

```javascript
// ❌ PROBLEM - 'api' might be undefined initially
const MyComponent = () => {
    const api = useHandle('api');
    api.fetchData(); // ERROR if api is undefined
};

// ✅ SOLUTION 1 - Null-safe access
const MyComponent = () => {
    const api = useHandle('api');
    useEffect(() => {
        api?.fetchData();
    }, [api]);
};

// ✅ SOLUTION 2 - Conditional rendering
const MyComponent = () => {
    const api = useHandle('api');
    if (!api) return <div>Loading...</div>;

    return <button onClick={() => api.fetchData()}>Fetch</button>;
};
```

### 3. Forgetting `deps` in `useRegisterHandle`

**Problem:** Handle doesn't update when dependencies change.

```javascript
// ❌ WRONG - userId change doesn't update handle
const UserProvider = ({ userId }) => {
    useRegisterHandle('user', () => ({
        id: userId,
        name: `User ${userId}`
    }), []); // Empty deps - created once!
};

// ✅ CORRECT
const UserProvider = ({ userId }) => {
    useRegisterHandle('user', () => ({
        id: userId,
        name: `User ${userId}`
    }), [userId]); // Re-creates handle when userId changes
};
```

### 4. Mutating Handle State Directly

**Problem:** Changing handle value without notifying subscribers.

```javascript
// ❌ WRONG - Direct mutation (ReactiumSyncState)
const state = useSyncHandle('app-state');
state.state.count = 5; // No event dispatched!

// ✅ CORRECT - Use .set() method
const state = useSyncHandle('app-state');
state.set('count', 5); // Dispatches 'set' event → re-renders consumers
```

### 5. Object-Path Confusion

**Problem:** Not understanding nested handle access.

```javascript
Handle.register('user.profile', { name: 'John' });
Handle.register('user.settings', { theme: 'dark' });

// Both work:
Handle.get('user.profile'); // { name: 'John' }
Handle.get(['user', 'profile']); // Same result

// Parent access:
Handle.get('user'); // { profile: {...}, settings: {...} }
```

## Best Practices

### 1. Naming Conventions

```javascript
// ✅ GOOD - Descriptive, hierarchical
Handle.register('shopping-cart.items', []);
Handle.register('user.preferences.theme', 'light');
Handle.register('analytics.tracker', trackerAPI);

// ❌ BAD - Vague, flat
Handle.register('data', someData);
Handle.register('thing', thing);
```

### 2. Handle IDs as Constants

```javascript
// ✅ GOOD - Centralized IDs
export const HANDLE_IDS = {
    CART: 'shopping-cart',
    USER: 'current-user',
    ANALYTICS: 'analytics-service'
};

useRegisterHandle(HANDLE_IDS.CART, ...);
const cart = useSyncHandle(HANDLE_IDS.CART);
```

### 3. Type Safety (TypeScript)

```javascript
// ✅ GOOD - Typed handles
interface CartState {
    items: CartItem[];
    total: number;
}

const cart = useRegisterSyncHandle<CartState>('cart', {
    items: [],
    total: 0
});

// Consumer has full type safety
const cartHandle = useSyncHandle<ReactiumSyncState<CartState>>('cart');
const items: CartItem[] = cartHandle?.get('items', []);
```

### 4. Documentation in Provider Components

```javascript
// ✅ GOOD - Documented API
/**
 * Provides global analytics service
 * Handle ID: 'analytics'
 * Methods:
 *   - trackEvent(name, data)
 *   - trackPageView(path)
 */
const AnalyticsProvider = () => {
    useRegisterHandle('analytics', () => ({
        trackEvent(name, data) { /* ... */ },
        trackPageView(path) { /* ... */ }
    }), []);

    return null;
};
```

## Debugging Handles

### Inspect All Handles

```javascript
// Browser console
import { Handle } from '@atomic-reactor/reactium-core/sdk';

// List all registered handles
console.log(Handle.list());

// Check if specific handle exists
Handle.has('my-handle'); // true/false

// Get handle value
Handle.get('my-handle');
```

### Monitor Handle Changes

```javascript
// Subscribe to all handle registry changes
const unsubscribe = Handle.subscribe(() => {
    console.log('Handle registry changed:', Handle.list());
});

// Unsubscribe when done
unsubscribe();
```

### Track ReactiumSyncState Events

```javascript
const state = useSyncHandle('app-state');

useEffect(() => {
    const unsub = state?.addEventListener('set', (e) => {
        console.log('State updated:', e.detail);
    });

    return unsub;
}, [state]);
```

## Summary

**Handle System = Global PubSub Registry + React Hooks**

**Core Hooks:**
- `useRegisterHandle` - Register static API/data
- `useRegisterSyncHandle` - Register observable state
- `useHandle` - Consume handle (no reactivity to internal changes)
- `useSyncHandle` - Consume handle (reactive to internal changes)
- `useSelectHandle` - Consume specific properties (optimized re-renders)

**Use Cases:**
- ✅ Global state management (alternative to Redux)
- ✅ Plugin communication and APIs
- ✅ Route data loading and caching
- ✅ Component instance control
- ✅ Cross-component messaging

**When NOT to use:**
- ❌ Simple component state (use `useState`/`useSyncState`)
- ❌ Truly local state (use React state)
- ❌ Need advanced debugging tools (consider Redux)

**Related Documentation:**
- [ReactiumSyncState Deep Dive](REACTIUM_SYNC_STATE.md) - Foundation for handle observability
- [ComponentEvent System](COMPONENT_EVENT_SYSTEM.md) - Event communication backbone
- [Routing System Architecture](ROUTING_SYSTEM.md) - Route data loading with handles
