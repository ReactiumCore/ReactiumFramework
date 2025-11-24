<!-- v1.0.0 -->

# AppContext Provider System

## Overview

The **AppContext Provider System** enables plugins to register React Context providers that wrap the entire Reactium application. This is critical for integrating context-dependent libraries like Apollo Client, Redux, Material-UI themes, React Query, or any React Context API-based library.

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/named-exports/app-context.js`

## Core Architecture

### Registry Pattern

AppContext is a Registry instance created via `registryFactory`:

```javascript
// Source: app-context.js:50-54
export const AppContext = registryFactory(
  'AppContext', // Registry name
  'name', // ID field (NOT 'id', but 'name')
  Registry.MODES.CLEAN // Clean mode (no history tracking)
);
```

**Key characteristics**:

- Uses `'name'` as the ID field (unique identifier for each provider)
- Operates in CLEAN mode (no history, better performance)
- Items are automatically sorted by `order` property (from Registry.listById getter)
- Standard Registry API: `register()`, `unregister()`, `list`, `subscribe()`

**Source reference**: `reactium-sdk-core/src/core/Registry.ts:170-192` - listById getter performs `_.sortBy('order')` on all active items

### Provider Composition Component

The `<AppContexts>` component wraps all registered providers around the application:

```javascript
// Source: app-context.js:60-76
export const AppContexts = ({ children }) => {
  const [, update] = useState(new Date());

  // Subscribe to registry changes
  useEffect(() => {
    return AppContext.subscribe(() => update(new Date()));
  }, []);

  // Reduce providers into nested structure (INNERMOST to OUTERMOST)
  return AppContext.list.reduce(
    (content, { name, provider: ContextProvider, ...props }) => {
      return (
        <ContextProvider key={`provider-${name}`} {...props}>
          {content}
        </ContextProvider>
      );
    },
    <Provider>{children}</Provider>
  );
};
```

**Important nesting behavior**: The `reduce()` pattern creates **inside-out** nesting:

- First registered provider → **OUTERMOST** wrapper
- Last registered provider → **INNERMOST** wrapper (closest to app content)

This means providers with **lower order values wrap around higher order values**.

**Source reference**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/index.jsx:156-162` - AppContexts wraps the entire application

## Lifecycle Integration

### Hook Timeline

```
init
  └─> sdk-init
      └─> plugin-init
          └─> plugin-dependencies
              └─> plugin-ready
                  └─> component-bindings
                      └─> app-context-provider ← REGISTER HERE
                          └─> app-router
                              └─> ReactDOM.render(<AppContexts>...</AppContexts>)
                                  └─> app-ready
```

**Critical timing**: The `app-context-provider` hook fires **after** all plugins initialize but **before** ReactDOM rendering.

**Source reference**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/index.jsx:124-129`

### Registration Pattern

```javascript
import Reactium, { Hook, Enums } from '@atomic-reactor/reactium-core/sdk';

Hook.register('app-context-provider', async () => {
  // Register your provider
  Reactium.AppContext.register(
    'MyProviderName', // Unique name (ID)
    {
      provider: MyProvider, // REQUIRED: React component
      // ...any other props passed to provider
      someProp: someValue,
    },
    Enums.priority.neutral // Optional: order (default: 0)
  );
});
```

**Source reference**:

- Material-UI Theme example: `app-context.js:26-47`
- Apollo Provider: `Reactium-GraphQL-Plugin/reactium_modules/@reactium/graphql/reactium-hooks-graphql-client.js:44-49`
- Redux Provider: `Reactium-Core-Plugins/reactium_modules_old/@atomic-reactor/reactium-redux/reactium-hooks.js:8-30`

## Registration API

### `Reactium.AppContext.register(name, data, [order])`

**Parameters**:

1. **`name`** (String) - Unique identifier for the provider

   - Used as the Registry ID field
   - Must be unique across all registered providers
   - Used for `key` prop in React rendering

2. **`data`** (Object) - Provider configuration object

   - **`provider`** (React Component) - **REQUIRED** - The context provider component
   - **`...props`** (any) - **OPTIONAL** - All other properties are spread to the provider component

3. **`order`** (Number) - **OPTIONAL** - Sort order (default: 0)
   - Lower values = outer wrapper (renders first)
   - Higher values = inner wrapper (renders last, closest to content)
   - Use `Enums.priority.*` constants for consistency

**Returns**: The registered provider object

### Example: Apollo GraphQL Provider

```javascript
// Source: Reactium-GraphQL-Plugin/reactium_modules/@reactium/graphql/reactium-hooks-graphql-client.js:44-49
Hook.register('app-context-provider', async () => {
  Reactium.AppContext.register('ApolloProvider', {
    provider: ApolloProvider, // The provider component
    client: Reactium.GraphQL, // Prop passed to <ApolloProvider>
  });
});
```

Renders as:

```jsx
<ApolloProvider client={Reactium.GraphQL}>{/* rest of app */}</ApolloProvider>
```

### Example: Material-UI Theme Provider

```javascript
// Source: app-context.js:27-46
import { createTheme, ThemeProvider } from '@mui/material/styles';

Hook.register('app-context-provider', async () => {
  const theme = createTheme({
    palette: {
      primary: { main: purple[500] },
      secondary: { main: '#11cb5f' },
    },
  });

  Reactium.AppContext.register('ThemeProvider', {
    provider: ThemeProvider,
    theme, // Passed as prop to ThemeProvider
  });
});
```

Renders as:

```jsx
<ThemeProvider theme={themeObject}>{/* rest of app */}</ThemeProvider>
```

### Example: Redux Provider with Priority

```javascript
// Source: Reactium-Core-Plugins/reactium_modules_old/@atomic-reactor/reactium-redux/reactium-hooks.js:14-21
Hook.register(
  'app-context-provider',
  async () => {
    const { Provider: ReduxProvider } = await import('react-redux');

    Reactium.AppContext.register(
      'ReduxProvider',
      {
        provider: ReduxProvider,
        store: Reactium.Redux.store,
      },
      Reactium.Enums.priority.neutral // Explicit priority
    );
  },
  Reactium.Enums.priority.high,
  'REDUX_PROVIDER'
);
```

**Note**: The hook itself has `priority.high`, ensuring Redux initialization happens early. The provider registration uses `priority.neutral` for nesting order.

### Example: Core RouterProvider (Framework)

```javascript
// Source: Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/reactium-hooks-App.js:92-99
Hook.register(
  'init',
  async () => {
    AppContext.register(
      'RouterProvider',
      {
        provider: RouterProvider,
        history: Routing.history,
      },
      Reactium.Enums.priority.core // -2000 (OUTERMOST wrapper)
    );
  },
  Enums.priority.core,
  'REACTIUM_INIT_CORE_COMPONENTS'
);
```

**Critical**: RouterProvider uses `priority.core` (-2000), making it the **outermost** provider wrapper.

## Nesting Order & Priority

### How Nesting Works

Given these registrations:

```javascript
AppContext.register('A', { provider: ProviderA }, -1000); // highest
AppContext.register('B', { provider: ProviderB }, 0); // neutral
AppContext.register('C', { provider: ProviderC }, 1000); // lowest
```

**Rendered structure** (lower priority = outer wrapper):

```jsx
<ProviderA>
  {' '}
  {/* order: -1000 (OUTERMOST) */}
  <ProviderB>
    {' '}
    {/* order: 0 */}
    <ProviderC>
      {' '}
      {/* order: 1000 (INNERMOST) */}
      {children}
    </ProviderC>
  </ProviderB>
</ProviderA>
```

### Priority Guidelines

Use `Enums.priority` constants for consistency:

```javascript
import { Enums } from '@atomic-reactor/reactium-core/sdk';

Enums.priority.core; // -2000 (framework core - OUTERMOST)
Enums.priority.highest; // -1000 (very high priority)
Enums.priority.high; // -500  (high priority)
Enums.priority.neutral; // 0     (default - most plugins)
Enums.priority.low; // 500   (low priority)
Enums.priority.lowest; // 1000  (INNERMOST - closest to content)
```

**Best practice**: Use `neutral` (0) unless you have a specific reason to control nesting order.

**Source reference**: `reactium-sdk-core/src/core/enums.ts` - priority enum definitions

## Reactivity

### Automatic Re-Rendering

The `<AppContexts>` component subscribes to the AppContext registry:

```javascript
// Source: app-context.js:62-64
useEffect(() => {
  return AppContext.subscribe(() => update(new Date()));
}, []);
```

**What this means**:

- If you register/unregister a provider **after initial render**, the app re-renders
- Dynamic provider registration is supported at runtime
- Useful for lazy-loaded features or conditional context providers

**Performance note**: Provider list changes trigger full app re-render - use sparingly after initial mount.

## Common Use Cases

### 1. Apollo GraphQL Client

**Problem**: Apollo Client needs `<ApolloProvider>` wrapping the app to enable `useQuery`/`useMutation` hooks.

**Solution**:

```javascript
import { ApolloClient, ApolloProvider } from '@apollo/client';
import Reactium, { Hook } from '@atomic-reactor/reactium-core/sdk';

Hook.register('sdk-init', async () => {
  // Initialize client
  const client = new ApolloClient({
    /* config */
  });
  Reactium.GraphQL = client;
});

Hook.register('app-context-provider', async () => {
  Reactium.AppContext.register('ApolloProvider', {
    provider: ApolloProvider,
    client: Reactium.GraphQL,
  });
});
```

**Source**: `Reactium-GraphQL-Plugin/reactium_modules/@reactium/graphql/reactium-hooks-graphql-client.js:1-50`

### 2. Redux Store

**Problem**: Redux requires `<Provider>` wrapping the app to enable `useSelector`/`useDispatch`.

**Solution**:

```javascript
import { Provider as ReduxProvider } from 'react-redux';
import Reactium, { Hook, Enums } from '@atomic-reactor/reactium-core/sdk';

Hook.register(
  'app-context-provider',
  async () => {
    Reactium.AppContext.register(
      'ReduxProvider',
      {
        provider: ReduxProvider,
        store: Reactium.Redux.store,
      },
      Enums.priority.neutral
    );
  },
  Enums.priority.high
);
```

**Source**: `Reactium-Core-Plugins/reactium_modules_old/@atomic-reactor/reactium-redux/reactium-hooks.js:8-30`

### 3. Material-UI Theme

**Problem**: Material-UI components need `<ThemeProvider>` for theme configuration.

**Solution**:

```javascript
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Reactium, { Hook } from '@atomic-reactor/reactium-core/sdk';

Hook.register('app-context-provider', async () => {
  const theme = createTheme({
    /* theme config */
  });

  Reactium.AppContext.register('ThemeProvider', {
    provider: ThemeProvider,
    theme,
  });
});
```

**Source**: `app-context.js:23-47`

### 4. React Query

**Example** (pattern, not from source):

```javascript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Reactium, { Hook } from '@atomic-reactor/reactium-core/sdk';

Hook.register('sdk-init', async () => {
  Reactium.QueryClient = new QueryClient();
});

Hook.register('app-context-provider', async () => {
  Reactium.AppContext.register('QueryClientProvider', {
    provider: QueryClientProvider,
    client: Reactium.QueryClient,
  });
});
```

### 5. Auth Context (Custom)

**Example** (pattern, not from source):

```javascript
import { AuthProvider } from './contexts/AuthContext';
import Reactium, { Hook } from '@atomic-reactor/reactium-core/sdk';

Hook.register('app-context-provider', async () => {
  Reactium.AppContext.register('AuthProvider', {
    provider: AuthProvider,
    // AuthProvider doesn't need props in this example
  });
});
```

## Best Practices

### 1. Initialize Dependencies in `sdk-init`

Create clients, stores, or configuration **before** registering providers:

```javascript
// GOOD: Initialize client first
Hook.register('sdk-init', async () => {
  Reactium.MyClient = createClient();
});

Hook.register('app-context-provider', async () => {
  Reactium.AppContext.register('MyProvider', {
    provider: MyProvider,
    client: Reactium.MyClient, // Client already exists
  });
});

// BAD: Inline initialization can cause timing issues
Hook.register('app-context-provider', async () => {
  const client = createClient(); // May run too late
  Reactium.AppContext.register('MyProvider', {
    provider: MyProvider,
    client,
  });
});
```

### 2. Use Unique, Descriptive Names

```javascript
// GOOD: Clear, unique names
AppContext.register('ApolloProvider', { ... });
AppContext.register('ReduxProvider', { ... });
AppContext.register('ThemeProvider', { ... });

// BAD: Generic or conflicting names
AppContext.register('Provider', { ... });  // Too generic
AppContext.register('Apollo', { ... });    // Confusing (not the provider)
```

### 3. Set Priority Only When Needed

```javascript
// GOOD: Most providers don't need explicit priority
AppContext.register('MyProvider', {
  provider: MyProvider,
  // No priority - defaults to 0 (neutral)
});

// GOOD: Explicit priority when order matters
AppContext.register(
  'RouterProvider',
  {
    provider: RouterProvider,
  },
  Enums.priority.core
); // Must wrap everything

// BAD: Arbitrary priority without reason
AppContext.register(
  'MyProvider',
  {
    provider: MyProvider,
  },
  -500
); // Why -500? Use Enums.priority constants
```

### 4. Keep Provider Props Minimal

Only pass props the provider actually needs:

```javascript
// GOOD: Only necessary props
AppContext.register('ApolloProvider', {
  provider: ApolloProvider,
  client: apolloClient,
});

// BAD: Unnecessary props
AppContext.register('ApolloProvider', {
  provider: ApolloProvider,
  client: apolloClient,
  name: 'ApolloProvider', // Already the ID
  order: 0, // Not a prop for ApolloProvider
});
```

### 5. Don't Mix Hook Priority with Provider Priority

```javascript
// GOOD: Separate concerns
Hook.register(
  'app-context-provider',
  async () => {
    // Hook priority: when this hook runs
    AppContext.register(
      'MyProvider',
      {
        provider: MyProvider,
      },
      Enums.priority.neutral
    ); // Provider priority: nesting order
  },
  Enums.priority.high
);

// Explanation:
// - Hook priority.high = runs early (before other plugins)
// - Provider priority.neutral = wraps at default level
```

## Common Gotchas

### 1. Provider Name Collisions

**Problem**: Two plugins register providers with the same name.

```javascript
// Plugin A
AppContext.register('ThemeProvider', { provider: MuiThemeProvider });

// Plugin B (overwrites Plugin A!)
AppContext.register('ThemeProvider', { provider: CustomThemeProvider });
```

**Result**: Only the last registration wins (Registry uses name as ID).

**Solution**: Use plugin-specific prefixes:

```javascript
AppContext.register('MUI-ThemeProvider', { provider: MuiThemeProvider });
AppContext.register('Custom-ThemeProvider', { provider: CustomThemeProvider });
```

### 2. ID Field is `name`, Not `id`

**Problem**: Trying to use `id` property instead of `name`.

```javascript
// WRONG: AppContext uses 'name' as ID field
AppContext.register('MyProvider', {
  id: 'MyProvider', // Ignored!
  provider: MyProvider,
});

// CORRECT: First argument IS the name/ID
AppContext.register('MyProvider', {
  // 'MyProvider' is the ID
  provider: MyProvider,
});
```

**Source reference**: `app-context.js:50-54` - `registryFactory('AppContext', 'name', ...)`

### 3. Priority Confusion (Lower = Outer)

**Problem**: Assuming higher priority = outer wrapper.

```javascript
// WRONG ASSUMPTION: "highest priority wraps innermost"
AppContext.register(
  'RouterProvider',
  {
    provider: RouterProvider,
  },
  Enums.priority.lowest
); // -2000 should be OUTERMOST!

// CORRECT: Lower numbers = outer wrapper
AppContext.register(
  'RouterProvider',
  {
    provider: RouterProvider,
  },
  Enums.priority.core
); // -2000 = OUTERMOST
```

**Mental model**: Think "execution order" not "importance". Lower priority values execute first (outer layer).

### 4. Missing `provider` Property

**Problem**: Forgetting the required `provider` field.

```javascript
// WRONG: No provider property
AppContext.register('MyProvider', {
  client: myClient, // Missing provider!
});

// Result: <undefined client={myClient}>{children}</undefined> (crashes)

// CORRECT: Always include provider
AppContext.register('MyProvider', {
  provider: MyProvider, // Required!
  client: myClient,
});
```

### 5. Registering After App Renders

**Problem**: Registering providers after `app-ready` hook fires.

```javascript
// WRONG: Too late!
Hook.register('app-ready', async () => {
  AppContext.register('LateProvider', { provider: MyProvider });
  // App already rendered without this provider
});

// CORRECT: Register during app-context-provider hook
Hook.register('app-context-provider', async () => {
  AppContext.register('MyProvider', { provider: MyProvider });
});
```

**Note**: While dynamic registration is technically supported (triggers re-render), it's better to register during bootstrap.

### 6. Using `.normal` Instead of `.neutral`

**Problem**: `Enums.priority.normal` does not exist.

```javascript
// WRONG: .normal doesn't exist
AppContext.register(
  'MyProvider',
  {
    provider: MyProvider,
  },
  Enums.priority.normal
); // Returns undefined!

// CORRECT: Use .neutral
AppContext.register(
  'MyProvider',
  {
    provider: MyProvider,
  },
  Enums.priority.neutral
); // 0
```

**Source reference**: See CLAUDE/FRAMEWORK_GOTCHAS.md for detailed explanation of this common bug.

## Advanced Patterns

### Conditional Provider Registration

```javascript
Hook.register('app-context-provider', async () => {
  // Only register in development
  if (process.env.NODE_ENV === 'development') {
    Reactium.AppContext.register('DevToolsProvider', {
      provider: DevToolsProvider,
    });
  }

  // Only register if feature flag enabled
  if (Reactium.Setting.get('enableAnalytics')) {
    Reactium.AppContext.register('AnalyticsProvider', {
      provider: AnalyticsProvider,
      trackingId: 'GA-XXXXXX',
    });
  }
});
```

### Dynamic Provider Props

```javascript
Hook.register('app-context-provider', async () => {
  // Compute props dynamically
  const themeMode = Reactium.Prefs.get('themeMode', 'light');
  const theme = createTheme({ palette: { mode: themeMode } });

  Reactium.AppContext.register('ThemeProvider', {
    provider: ThemeProvider,
    theme,
  });
});
```

### Subscribing to Provider Changes

```javascript
import { AppContext } from '@atomic-reactor/reactium-core/sdk';

// Subscribe to provider list changes
const unsubscribe = AppContext.subscribe((registry, notification) => {
  console.log('Provider change:', notification.type, notification.id);

  if (notification.type === 'register') {
    console.log('New provider registered:', notification.id);
  }
});

// Later: unsubscribe
unsubscribe();
```

**Source reference**: `reactium-sdk-core/src/core/Registry.ts` - Registry notification system

## Related Systems

- **[Routing System](ROUTING_SYSTEM.md)** - RouterProvider is registered via AppContext
- **[SDK Extension Pattern](SDK_EXTENSION_PATTERN.md)** - Plugins extend Reactium SDK before registering providers
- **[Hook Domains Deep Dive](HOOK_DOMAINS_DEEP_DIVE.md)** - Hook system domain architecture
- **[Registry System](REGISTRY_SYSTEM.md)** - AppContext is a Registry instance

## Summary

The AppContext Provider System enables seamless integration of React Context-based libraries into Reactium applications through a hook-driven, priority-ordered registry pattern. Key takeaways:

- **Hook**: `app-context-provider` - register providers here
- **API**: `Reactium.AppContext.register(name, { provider, ...props }, [order])`
- **Nesting**: Lower priority = outer wrapper
- **Timing**: Providers registered after `plugin-ready`, before ReactDOM render
- **Reactivity**: Dynamic registration supported (triggers re-render)
- **Best practice**: Use `Enums.priority.neutral` unless order matters

This system is the foundation for plugin-based architecture in Reactium, enabling plugins to extend the application with context-dependent functionality without touching core code.
