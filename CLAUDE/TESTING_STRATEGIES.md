<!-- v1.0.0 -->

# Testing Strategies and Patterns for Reactium/Actinium Applications

> **Purpose**: Comprehensive guide to testing DDD artifacts, plugins, React hooks, Handle-based state, and Parse Server cloud functions

**Source**: reactium-sdk-core/test/*.test.ts*, reactium-sdk-core/jest.config.js:1-8, reactium-sdk-core/package.json:24-72

---

## Architecture Overview

Reactium/Actinium applications have unique testing requirements due to:

1. **DDD (Domain-Driven Design)** - Auto-discovered artifacts need integration tests
2. **Hook System** - Async hook execution requires specialized testing
3. **Handle System** - Component communication via handles needs React Testing Library
4. **Registry Pattern** - Priority-based collections need state verification
5. **Cloud Functions** - Server-side Parse logic needs session token simulation
6. **Plugin Architecture** - Plugin isolation and lifecycle testing

---

## Test Infrastructure (reactium-sdk-core)

### Jest Configuration

**File**: reactium-sdk-core/jest.config.js

```javascript
module.exports = {
  transform: {
      '^.+\\.tsx?$': 'ts-jest', // TypeScript support
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/oldtest/'],
  testEnvironment: 'jsdom', // Browser environment for React tests
};
```

**Source**: reactium-sdk-core/jest.config.js:1-8

### Package Dependencies

**Testing Libraries** (reactium-sdk-core/package.json:32-57):

```json
{
  "devDependencies": {
    "@jest/globals": "^29.7.0",           // describe, test, expect
    "@testing-library/jest-dom": "^6.4.2", // DOM matchers
    "@testing-library/react": "^14.2.2",   // render, screen
    "@testing-library/user-event": "^14.5.2", // User interactions
    "@types/jest": "^29.5.12",             // TypeScript types
    "babel-jest": "^29.7.0",               // Babel transform
    "jest": "^29.7.0",                     // Test runner
    "jest-cli": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",   // DOM environment
    "jsdom": "^24.0.0",                    // Virtual DOM
    "react-test-renderer": "^18.2.0",      // Snapshot testing
    "ts-jest": "^29.1.2"                   // TypeScript transform
  }
}
```

**Source**: reactium-sdk-core/package.json:32-57

### NPM Scripts

```json
{
  "scripts": {
    "test": "jest --coverage",
    "watch:test": "jest --coverage --watch",
    "pretest": "tsc --inlineSourceMap --inlineSources"
  }
}
```

**Source**: reactium-sdk-core/package.json:64-67

---

## Hook System Testing

### Pattern: Register and Run Synchronously

**File**: reactium-sdk-core/test/Hook.test.ts

```typescript
import { Hook, HookCallback } from '../lib/core';
import { describe, expect, test } from '@jest/globals';

describe('Hook', () => {
  test('will execute when run synchronously', async () => {
    const cb = jest.fn();
    Hook.registerSync('test-hook', cb, 0, 'test-id');
    Hook.runSync('test-hook');
    expect(cb).toHaveBeenCalled();
  });

  afterEach(() => {
    Hook.unregister('test-id');
  });
});
```

**Source**: reactium-sdk-core/test/Hook.test.ts:11-16, 55-57

**Key Pattern**:
- Use `jest.fn()` to create mock callback
- Register hook with unique ID
- Clean up in `afterEach()` to prevent cross-test pollution

### Pattern: Test Async Hook Execution

```typescript
test('will execute when run asynchronously', async () => {
  const cb = jest.fn();
  Hook.register('test-hook', cb, 0, 'test-id');
  await Hook.run('test-hook');
  expect(cb).toHaveBeenCalled();
});
```

**Source**: reactium-sdk-core/test/Hook.test.ts:18-23

**Critical**: Always `await Hook.run()` in tests

### Pattern: Test Hook Arguments and Return Values

```typescript
test('will pass arguments to the callback', async () => {
  type Args = [ a: number, b: number, c: boolean ];
  const cb = jest.fn((...args: Args) => 'returned from callback as promise');

  type CB = HookCallback<Args, string>;
  Hook.register<CB>('test-hook', cb, 0, 'test-id');

  const { hook, params, ...rest } = await Hook.run('test-hook', 1, 2, true);

  expect(params).toEqual([1, 2, true]);
  expect(hook).toEqual('test-hook');
  expect(rest['test-id']).toEqual('returned from callback as promise');
});
```

**Source**: reactium-sdk-core/test/Hook.test.ts:41-53

**Return Structure**:
```typescript
{
  hook: string,        // Hook name
  params: any[],       // Arguments passed to hook
  [hookId]: any        // Return value from each registered callback
}
```

### Pattern: Test Unregister by Domain

```typescript
test('will NOT execute if unregistered by domain', async () => {
  const cb = jest.fn();
  Hook.register('test-hook', cb, 0, 'test-id', 'testing');
  Hook.unregisterDomain('test-hook', 'testing');
  await Hook.run('test-hook');
  expect(cb).not.toHaveBeenCalled();
});
```

**Source**: reactium-sdk-core/test/Hook.test.ts:33-39

**Use Case**: Testing plugin cleanup (unregister all hooks from plugin domain)

---

## Registry System Testing

### Pattern: Test Registration and Retrieval

**File**: reactium-sdk-core/test/Registry.test.ts

```typescript
import { Registry, registryFactory, NotificationTypes } from '../lib/core';

describe('Registry', () => {
  let registry: Registry;
  const allListener = jest.fn();

  beforeEach(() => {
    registry = new Registry('testRegistry');
    registry.subscribe(allListener);
  });

  afterEach(() => {
    registry.flush();
    allListener.mockClear();
  });

  test('register and get', () => {
    const item = { id: 'test', data: 'testData', order: 100 };
    registry.register(item);
    expect(registry.get('test')).toEqual(item);
  });
});
```

**Source**: reactium-sdk-core/test/Registry.test.ts:7-30

**Key Patterns**:
- Create fresh registry in `beforeEach()`
- Subscribe to all events for notification testing
- Flush registry in `afterEach()`
- Clear mock call history

### Pattern: Test Subscription Notifications

```typescript
test('subscribe and unsubscribe', () => {
  const item = { id: 'test2', data: 'testData2', order: 200 };
  const subscriber = jest.fn();
  const unsub = registry.subscribe(subscriber);

  registry.register(item);

  let notification = subscriber.mock.calls[0][1];
  expect(notification).toEqual({
    type: NotificationTypes.CLEANUP,
    id: 'test2',
  });

  notification = subscriber.mock.calls[1][1];
  expect(notification).toEqual({
    type: NotificationTypes.REGISTER,
    id: 'test2',
    data: item,
  });

  unsub();
  registry.register(item);
  expect(subscriber).toHaveBeenCalledTimes(2);
});
```

**Source**: reactium-sdk-core/test/Registry.test.ts:32-52

**Notification Types**: CLEANUP, REGISTER, UNREGISTER

### Pattern: Test Protection and Banning

```typescript
test('protecting and unprotecting items', () => {
  const item = { id: 'test', data: 'testData', order: 100 };
  registry.register(item);
  registry.protect('test');

  expect(registry.protected).toContain('test');

  registry.unregister('test');
  expect(registry.get('test')).toEqual(item); // Still there
  expect(registry.list).toContainEqual(item);

  registry.unprotect('test');
  registry.unregister('test');
  expect(registry.get('test')).not.toEqual(item); // Now gone
});

test('banning and unbanning items', () => {
  const item = { id: 'test', data: 'testData', order: 100 };
  registry.ban('test');

  expect(registry.isBanned('test')).toBe(true);
  expect(() => registry.register(item)).toThrow();
  expect(registry.get('test')).toBeUndefined();

  registry.unban('test');
  expect(() => registry.register(item)).not.toThrow();
});
```

**Source**: reactium-sdk-core/test/Registry.test.ts:64-87

### Pattern: Test Deep Path Access

```typescript
test('get by deep path', () => {
  const item = { id: 'test', data: { foo: { bar: 'baz' }}, order: 100 };
  registry.register(item);

  expect(registry.get('test.data.foo.bar')).toEqual('baz');
  expect(registry.get('test.data.foo')).toEqual({ bar: 'baz' });
  expect(registry.get('test.data')).toEqual({ foo: { bar: 'baz' } });
  expect(registry.get('test')).toEqual(item);
  expect(registry.get('test.data.foo.baz')).toBeUndefined();
  expect(registry.get(['test', 'data', 'foo', 'bar'])).toEqual('baz');
});
```

**Source**: reactium-sdk-core/test/Registry.test.ts:90-99

### Pattern: Test HISTORY Mode

```typescript
describe('in history mode', () => {
  beforeEach(() => {
    registry.mode = Registry.MODES.HISTORY;
  });

  test('unregister', () => {
    const item = { id: 'test', data: 'testData', order: 100 };
    registry.register(item);

    registry.unregister('test');

    expect(registry.get('test')).toBeUndefined();
    expect(registry.isRegistered('test')).toBe(true);
    expect(registry.isUnRegistered('test')).toBe(true);
    expect(registry.registered).toContainEqual(item);
    expect(registry.unregistered).toContain('test');
    expect(registry.list).not.toContainEqual(item);
  });
});
```

**Source**: reactium-sdk-core/test/Registry.test.ts:102-120

---

## Handle System Testing

### Pattern: Test Handle Registration and Consumption

**File**: reactium-sdk-core/test/useHandle.test.tsx

```typescript
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import React, { useState } from 'react';
import { useRegisterHandle, useHandle } from '../lib/browser';

const someHandleState = 'some state';

interface MyHandle {
  handleState: string;
}

const HandleRegisterer = () => {
  const [handleState] = useState(someHandleState);
  const handle: MyHandle = { handleState };

  useRegisterHandle<MyHandle>(
    'MyHandle',
    () => handle,
    [],
  );

  return <h1 data-testid="input">{handle.handleState}</h1>;
};

const HandleConsumer = () => {
  const handle: MyHandle | undefined = useHandle<MyHandle>('MyHandle');
  return <p data-testid="output">{handle?.handleState}</p>;
};

describe('useHandle', () => {
  test('handle state should convey from registerer to consumer', async () => {
    // Arrange
    render(<><HandleRegisterer /><HandleConsumer /></>);

    // Assert
    const input = await screen.findByTestId('input');
    const output = await screen.findByTestId('output');

    expect(input).toHaveTextContent(someHandleState);
    expect(output).toHaveTextContent(someHandleState);
  });
});
```

**Source**: reactium-sdk-core/test/useHandle.test.tsx:1-43

**Key Patterns**:
- Separate registerer and consumer components
- Use `data-testid` for reliable element selection
- Use `screen.findByTestId()` for async rendering
- Test TypeScript generics with interfaces

---

## React Component Testing Patterns

### Pattern: Testing Custom Hooks with React Testing Library

**Example from useSyncState.test.tsx** (not shown in full, but inferred):

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { useSyncState } from '../lib/browser';

const TestComponent = () => {
  const [state, setState] = useSyncState({ count: 0 });

  return (
    <div>
      <span data-testid="count">{state.count}</span>
      <button onClick={() => setState({ count: state.count + 1 })}>
        Increment
      </button>
    </div>
  );
};

test('useSyncState updates correctly', async () => {
  render(<TestComponent />);
  const countEl = screen.getByTestId('count');
  const button = screen.getByRole('button');

  expect(countEl).toHaveTextContent('0');

  fireEvent.click(button);
  await waitFor(() => expect(countEl).toHaveTextContent('1'));
});
```

**Pattern**: Wrap hook in test component, render, assert

### Pattern: Testing Zone System

**Files**: reactium-sdk-core/test/Zone.test.tsx (exists but not examined)

**Expected Pattern**:

```typescript
import { Zone } from '../lib/browser';

test('Zone renders components in priority order', () => {
  Zone.addComponent({
    id: 'comp1',
    zone: 'test-zone',
    component: () => <div>First</div>,
    order: 100,
  });

  Zone.addComponent({
    id: 'comp2',
    zone: 'test-zone',
    component: () => <div>Second</div>,
    order: 200,
  });

  const { container } = render(<Zone zone="test-zone" />);

  const divs = container.querySelectorAll('div');
  expect(divs[0]).toHaveTextContent('First');
  expect(divs[1]).toHaveTextContent('Second');
});
```

**Use Case**: Testing plugin UI injection into zones

---

## Testing Cloud Functions (Actinium)

### Pattern: Manual Testing with Cloud.run

**Server-Side Test**:

```javascript
// In actinium-users/plugin.js or similar
const find = (req) => {
  const options = CloudRunOptions(req);
  return Actinium.User.list(req.params, options);
};

// Manual test (from server console or test file)
const testFind = async () => {
  const mockReq = {
    params: { limit: 10 },
    user: { getSessionToken: () => 'valid-session-token' },
  };

  const result = await find(mockReq);
  console.log('Users found:', result.count);
};
```

**Use Case**: Quick validation of cloud function logic

### Pattern: Testing with Master Key

```javascript
// Test privileged operations
const testRoleCreation = async () => {
  const result = await Actinium.Cloud.run(
    'role-create',
    {
      roleArray: [{ name: 'test-role', label: 'Test', level: 50 }],
    },
    { useMasterKey: true },
  );

  console.assert(result['test-role'], 'Role should be created');
};
```

**Warning**: Only use in server-side tests, never expose master key to client

### Pattern: Testing Session Token Propagation

```javascript
// Verify ACL enforcement
const testACLEnforcement = async () => {
  const userSessionToken = 'user-session-token-from-login';

  // Should succeed with user's token
  const userContent = await Actinium.Cloud.run(
    'content-list',
    { status: 'PUBLISHED' },
    { sessionToken: userSessionToken },
  );

  // Should fail or return less data without token
  const anonContent = await Actinium.Cloud.run(
    'content-list',
    { status: 'PUBLISHED' },
    {}, // No session token
  );

  console.assert(
    userContent.count >= anonContent.count,
    'User should see more content than anonymous',
  );
};
```

---

## Testing DDD Artifacts

### Plugin Lifecycle Testing

**Pattern**: Verify plugin-init hooks execute in order

```javascript
// hypothetical test
const pluginInitOrder = [];

Hook.register('plugin-init', async () => {
  pluginInitOrder.push('plugin-a');
}, 100, 'plugin-a');

Hook.register('plugin-init', async () => {
  pluginInitOrder.push('plugin-b');
}, 200, 'plugin-b');

await Hook.run('plugin-init');

expect(pluginInitOrder).toEqual(['plugin-a', 'plugin-b']);
```

**Use Case**: Verify plugin dependency order

### Testing Component Binding

**Pattern**: Verify bind points render correctly

```javascript
// In test environment
test('component binds to data-reactium-bind', () => {
  const { container } = render(
    <div data-reactium-bind="test-component"></div>
  );

  Component.register('test-component', () => <span>Bound!</span>);

  // Trigger bind point discovery
  Hook.run('component-bindings');

  expect(container.querySelector('span')).toHaveTextContent('Bound!');
});
```

**Challenge**: Bind points are discovered asynchronously, need to wait for completion

### Testing Route Registration

**Pattern**: Verify routes are registered correctly

```javascript
// hypothetical test
const testRouteRegistration = () => {
  const routes = [];

  Hook.register('register-route', async (route) => {
    routes.push(route);
  });

  // Trigger route discovery
  Hook.run('routes-init');

  const homeRoute = routes.find(r => r.path === '/');
  expect(homeRoute).toBeDefined();
  expect(homeRoute.exact).toBe(true);
};
```

---

## Integration Testing Strategies

### Pattern: Testing Full Hook Pipelines

```javascript
test('content save pipeline executes all hooks', async () => {
  const hookCalls = [];

  Hook.register('content-save-sanitize', (params) => {
    hookCalls.push('sanitize');
  });

  Hook.register('content-before-save', (req) => {
    hookCalls.push('before-save');
  });

  Hook.register('content-validate', (req) => {
    hookCalls.push('validate');
  });

  // Trigger save
  await Actinium.Cloud.run('content-save', {
    type: 'test-type',
    title: 'Test Content',
  }, { useMasterKey: true });

  expect(hookCalls).toEqual(['sanitize', 'validate', 'before-save']);
});
```

**Use Case**: Verify hook execution order in complex workflows

### Pattern: Testing Cache Invalidation

```javascript
test('role update invalidates cache', async () => {
  // Populate cache
  await Actinium.Cloud.run('roles', {}, { useMasterKey: true });
  const cachedBefore = Actinium.Cache.get('roles');

  // Update role
  await Actinium.Cloud.run('role-create', {
    roleArray: [{ name: 'new-role', label: 'New', level: 50 }],
  }, { useMasterKey: true });

  const cachedAfter = Actinium.Cache.get('roles');

  expect(cachedAfter['new-role']).toBeDefined();
  expect(cachedBefore['new-role']).toBeUndefined();
});
```

**Use Case**: Verify cache refresh on afterSave hooks

---

## Best Practices

### 1. Isolate Tests

**Good**:
```typescript
beforeEach(() => {
  registry = new Registry('testRegistry');
});

afterEach(() => {
  registry.flush();
  Hook.unregister('test-id');
});
```

**Why**: Prevents state leakage between tests

### 2. Use TypeScript Generics for Type Safety

```typescript
interface MyHandle {
  getValue: () => string;
  setValue: (val: string) => void;
}

const handle = useHandle<MyHandle>('MyHandle');
expect(handle?.getValue()).toBe('expected');
```

**Why**: Catches type errors at compile time

### 3. Test Both Success and Failure Cases

```javascript
test('registry throws when registering banned item', () => {
  registry.ban('banned-id');
  const item = { id: 'banned-id', data: 'test' };
  expect(() => registry.register(item)).toThrow();
});
```

### 4. Use data-testid for Reliable Selection

**Good**:
```jsx
<button data-testid="submit-btn">Submit</button>
// Test
const btn = screen.getByTestId('submit-btn');
```

**Bad**:
```jsx
<button className="btn primary">Submit</button>
// Test (fragile)
const btn = container.querySelector('.btn.primary');
```

**Why**: Class names change, test IDs are stable

### 5. Test Async Operations with await/waitFor

```typescript
test('async hook completes', async () => {
  const cb = jest.fn();
  Hook.register('test', cb);
  await Hook.run('test'); // MUST await
  expect(cb).toHaveBeenCalled();
});
```

### 6. Clean Up Side Effects

```typescript
afterEach(() => {
  Hook.flush(); // Clear all hooks
  Zone.reset(); // Clear all zones
  Actinium.Cache.clear(); // Clear cache
});
```

### 7. Mock External Dependencies

```javascript
jest.mock('object-path', () => ({
  get: jest.fn((obj, path) => obj[path]),
  set: jest.fn((obj, path, val) => { obj[path] = val; }),
}));
```

---

## Common Gotchas

### 1. Not Awaiting Async Hooks

**Bad**:
```javascript
Hook.run('test-hook'); // Missing await!
expect(cb).toHaveBeenCalled(); // Fails!
```

**Good**:
```javascript
await Hook.run('test-hook');
expect(cb).toHaveBeenCalled(); // Passes!
```

### 2. Forgetting to Unregister Hooks

**Symptom**: Tests pass individually, fail when run together

**Solution**:
```javascript
afterEach(() => {
  Hook.unregister('test-id');
});
```

### 3. Testing Implementation Instead of Behavior

**Bad**:
```javascript
expect(component.state.count).toBe(5); // Internal state
```

**Good**:
```javascript
expect(screen.getByTestId('count')).toHaveTextContent('5'); // Rendered output
```

### 4. Not Mocking Parse Server in Unit Tests

**Symptom**: Tests require running Parse Server

**Solution**: Mock Parse SDK
```javascript
jest.mock('parse', () => ({
  Query: jest.fn(),
  Object: jest.fn(),
  User: jest.fn(),
}));
```

### 5. Testing Zone Rendering Without Waiting

**Symptom**: Zone components not rendered yet

**Solution**:
```javascript
await waitFor(() => {
  expect(screen.getByTestId('zone-content')).toBeInTheDocument();
});
```

---

## Testing Checklist

**Unit Tests**:
- [ ] Hook registration and execution
- [ ] Registry operations (register, get, unregister)
- [ ] Custom React hooks (state, refs, effects)
- [ ] Utility functions (pure logic)
- [ ] Component rendering (snapshots or assertions)

**Integration Tests**:
- [ ] Hook pipelines (multiple hooks in sequence)
- [ ] Handle communication (registerer → consumer)
- [ ] Plugin lifecycle (init → plugin-init → ready)
- [ ] Route registration and matching
- [ ] Zone component ordering

**End-to-End Tests** (if applicable):
- [ ] Full user workflows (login → create content → publish)
- [ ] Cloud function interactions (client → server → database)
- [ ] SSR rendering (server-rendered → client hydration)

---

## Running Tests

### Run All Tests

```bash
cd reactium-sdk-core
npm test
```

**Output**: Coverage report in terminal + coverage/ directory

### Watch Mode (Development)

```bash
npm run watch:test
```

**Behavior**: Re-runs tests on file change

### Run Specific Test File

```bash
npx jest test/Hook.test.ts
```

### Run Tests Matching Pattern

```bash
npx jest --testNamePattern="Hook"
```

---

## Coverage Requirements

**Recommended Coverage Targets**:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

**Critical Areas Requiring 100% Coverage**:
- Hook system core
- Registry core
- Security-related code (ACL, session tokens)
- Data validation functions

---

## Summary

**Test Types**:
1. **Unit Tests** - Individual functions, hooks, components
2. **Integration Tests** - Hook pipelines, handle communication, plugin interactions
3. **Manual Tests** - Cloud functions via Cloud.run, browser console testing

**Tools**:
- Jest (test runner)
- React Testing Library (component testing)
- @testing-library/jest-dom (DOM matchers)
- ts-jest (TypeScript support)

**Key Patterns**:
- Isolate tests with beforeEach/afterEach
- Mock external dependencies
- Test behavior, not implementation
- Use TypeScript generics for type safety
- Always await async operations

**Challenges**:
- Testing DDD auto-discovery (async lifecycle)
- Simulating Parse Server (requires mocking)
- Testing SSR (requires server environment)

---

**Related Documentation**:
- [Hook System Domains](./HOOK_DOMAINS_DEEP_DIVE.md) - Hook registration patterns
- [Handle System](./HANDLE_SYSTEM.md) - Handle communication architecture
- [Registry System](./REGISTRY_SYSTEM.md) - Registry operations and modes
- [Cloud Functions](./CLOUD_FUNCTIONS.md) - Server-side testing patterns
