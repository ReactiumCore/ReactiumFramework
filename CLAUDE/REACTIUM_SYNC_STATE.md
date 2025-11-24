<!-- v1.0.0 -->

# ReactiumSyncState Architecture

**ReactiumSyncState** is the foundational observable state pattern that powers Reactium's state management ecosystem. It provides an EventTarget-based observable object with object-path addressing, smart merging, and extensibility.

**Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:68-532`

## Core Concept

ReactiumSyncState extends native EventTarget to create observable state objects that:
- Emit events on state changes (before/after lifecycle)
- Support deep path addressing via object-path
- Merge objects intelligently (with hook-based customization)
- Allow custom method extensions
- Provide synchronous state access

**Unlike `useState`**: ReactiumSyncState is synchronous, returns an observable object (not array), and integrates with Reactium's event system.

## Architecture Overview

```typescript
class ReactiumSyncState<StateType extends object> extends EventTarget {
    [INITIAL_STATE]: StateType;  // Immutable copy of initial state
    [STATE]: StateType;           // Current mutable state
    op: ObjectPathBound;          // object-path bound to current state
    listeners: EventListenerRegistry;  // Track listeners by ID
    options: SyncStateOptions;    // { noMerge?: boolean }
}
```

**Key Implementation Details**:
- Uses Symbol-based private properties for state storage
- Binds object-path library for nested property access
- Extends native addEventListener to track listener IDs
- Provides event lifecycle: `before-set` → `set` → `change`

## Event System

### Event Types

ReactiumSyncState dispatches events for all state modifications:

| Event | When Fired | Payload |
|-------|-----------|---------|
| `before-set` | Before setting value | `{ path, value }` |
| `set` | After setting value | `{ path, value }` |
| `change` | After value actually changed | `{ path, value }` |
| `before-del` | Before deleting path | `{ path }` |
| `del` | After deleting path | `{ path }` |
| `before-insert` | Before array insertion | `{ path, value, index }` |
| `insert` | After array insertion | `{ path, value, index }` |

**Important**: `change` only fires if the value **actually changed** (deep equality check with underscore's `_.isEqual`).

### Event Listening Patterns

**Basic addEventListener**:
```javascript
const state = new ReactiumSyncState({ count: 0 });

state.addEventListener('set', (event) => {
    console.log('State set:', event.path, event.value);
});

state.set('count', 1); // Triggers 'set' event
```

**With ID tracking** (auto-cleanup):
```javascript
const unsubscribe = state.addEventListener('change', handler, options, 'my-listener-id');

// Later: automatic cleanup
unsubscribe();

// Or: remove by ID
state.removeEventListenerById('change', 'my-listener-id');

// Or: remove all listeners of type
state.removeAllEventListeners('change');
```

**Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:103-127`

## Core API

### Constructor

```typescript
new ReactiumSyncState<StateType>(initialState: StateType, options?: SyncStateOptions)
```

**Options**:
- `noMerge`: `true` = replace objects entirely, `false` (default) = shallow merge

**Example**:
```javascript
// With merging (default)
const state1 = new ReactiumSyncState({ user: { name: 'Alice' } });
state1.set('user', { age: 30 });
// Result: { user: { name: 'Alice', age: 30 } }

// Without merging
const state2 = new ReactiumSyncState({ user: { name: 'Alice' } }, { noMerge: true });
state2.set('user', { age: 30 });
// Result: { user: { age: 30 } }
```

**Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:87-128`

### get(path, defaultValue)

Retrieve value at path using object-path syntax.

```typescript
state.get<ReturnType>(path: Path, defaultValue?: any): ReturnType
```

**Examples**:
```javascript
const state = new ReactiumSyncState({
    user: { name: 'Alice', address: { city: 'NYC' } },
    items: ['a', 'b', 'c']
});

state.get('user.name');           // 'Alice'
state.get(['user', 'address', 'city']); // 'NYC'
state.get('items.1');             // 'b'
state.get('missing', 'default');  // 'default'
state.get();                      // Returns entire state object
```

**Path Types**:
- String: `'user.name'`
- Array: `['user', 'name']`
- Omitted: Returns entire state

**Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:209-215`

### set(path, value, update?, forceMerge?)

Set value at path with optional event suppression and merge control.

```typescript
// Set at path
state.set(path: Path, value: any, update = true, forceMerge = false): this

// Replace entire state
state.set(value: StateType, undefined, update = true, forceMerge = false): this
state.set(false, value: StateType, update = true, forceMerge = false): this
```

**Parameters**:
- `path`: Object path (string/array) or `false` to replace entire state
- `value`: New value
- `update`: `false` = suppress events (silent update)
- `forceMerge`: `true` = merge even if `noMerge: true` option set

**Examples**:
```javascript
const state = new ReactiumSyncState({ user: { name: 'Alice' } });

// Set nested property
state.set('user.age', 30);
// Result: { user: { name: 'Alice', age: 30 } }

// Replace entire state
state.set({ newProp: 'value' });
// Result: { user: { name: 'Alice', age: 30 }, newProp: 'value' }

// Replace entire state (explicit)
state.set(false, { reset: true });
// Result: { reset: true }

// Silent update (no events)
state.set('user.name', 'Bob', false);

// Force merge even if noMerge option set
state.set('user', { city: 'LA' }, true, true);
```

**Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:485-516`

### del(path, update?)

Delete property at path.

```typescript
state.del(path: Path, update = true): this
```

**Examples**:
```javascript
const state = new ReactiumSyncState({ user: { name: 'Alice', age: 30 } });

state.del('user.age');
// Result: { user: { name: 'Alice' } }

state.del('user.name', false); // Silent delete
```

**Warning**: Cannot delete root state. Use `state.state = {}` setter instead.

**Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:409-433`

### insert(path, value, index, update?)

Insert value into array at specific index.

```typescript
state.insert(path: Path, value: any, index: number, update = true): this
```

**Examples**:
```javascript
const state = new ReactiumSyncState({ items: ['a', 'b', 'c'] });

state.insert('items', 'x', 1);
// Result: { items: ['a', 'x', 'b', 'c'] }
```

**Warning**: Only works on array properties. Cannot insert into root state.

**Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:373-398`

### reset()

Reset state to initial state (from constructor).

```typescript
state.reset(): this
```

**Example**:
```javascript
const state = new ReactiumSyncState({ count: 0 });
state.set('count', 5);
state.reset();
console.log(state.get('count')); // 0
```

**Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:164-168`

### dispatch(type, payload?)

Manually dispatch custom events.

```typescript
state.dispatch<Payload>(type: string, payload?: Payload): this
```

**Example**:
```javascript
const state = new ReactiumSyncState({ count: 0 });

state.addEventListener('custom-event', (event) => {
    console.log('Custom:', event.data, event.count);
});

state.dispatch('custom-event', { data: 'test', count: 42 });
```

**Note**: Uses `ComponentEvent` class which spreads payload properties onto event object.

**Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:525-531`

### extend(prop, method)

Add custom methods to state instance.

```typescript
state.extend(prop: string, method: (...args: any[]) => any): void
```

**Example**:
```javascript
const state = new ReactiumSyncState({ count: 0 });

state.extend('increment', function() {
    this.set('count', this.get('count') + 1);
});

state.extend('decrementBy', function(amount) {
    this.set('count', this.get('count') - amount);
});

state.increment();        // count = 1
state.decrementBy(5);     // count = -4
```

**TypeScript Support**:
```typescript
type MyStateType = ReactiumSyncState<{ count: number }> & {
    increment: () => void;
    decrementBy: (amount: number) => void;
};

const state = new ReactiumSyncState({ count: 0 }) as MyStateType;
state.extend('increment', function() { this.set('count', this.get('count') + 1); });
state.increment(); // Type-safe!
```

**Security**: Prevents prototype pollution by blocking `__proto__` and `proto__`.

**Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:304-311`

### Utility Methods

```typescript
state.has(path: Path): boolean                     // Check if path exists
state.ensureExists(): this                         // No-op (legacy)
state.coalesce(paths: Path[], defaultValue): any   // Get first defined value
```

**Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:328-356`

## Smart Merging System

### Default Merge Behavior

When setting an object at an existing path, ReactiumSyncState **shallow merges** by default:

```javascript
const state = new ReactiumSyncState({ user: { name: 'Alice', age: 30 } });

state.set('user', { city: 'NYC' });
// Result: { user: { name: 'Alice', age: 30, city: 'NYC' } }
```

### No-Merge Conditions

Merging is **skipped** if any of these conditions are true:

1. **Type mismatch**: Previous and next values are different types
2. **Primitive values**: Next value is boolean, string, number, date, etc.
3. **Non-object types**: Next value is array, regex, error, symbol, null, DOM element
4. **Constructor option**: `noMerge: true` in options
5. **Custom conditions**: Added via `use-sync-state-merge-conditions` hook

**Built-in no-merge conditions** (source: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:232-246`):
```javascript
const noMergeConditions = [
    (prev, next) => !_.isObject(prev) || !_.isObject(next),
    (prev, next) => typeof prev !== typeof next,
    (prev, next) => _.isElement(next),
    (prev, next) => _.isBoolean(next),
    (prev, next) => _.isArray(next),
    (prev, next) => _.isString(next),
    (prev, next) => _.isNumber(next),
    (prev, next) => _.isDate(next),
    (prev, next) => _.isError(next),
    (prev, next) => _.isRegExp(next),
    (prev, next) => _.isNull(next),
    (prev, next) => _.isSymbol(next),
];
```

### Custom Merge Conditions Hook

Plugins can add custom no-merge conditions via the `use-sync-state-merge-conditions` hook:

```javascript
import { Hook } from '@atomic-reactor/reactium-sdk-core';

Hook.registerSync('use-sync-state-merge-conditions', (conditions, stateInstance) => {
    // Add custom condition: don't merge if next value has _replace flag
    conditions.push((prev, next) => next && next._replace === true);
});

// Usage:
const state = new ReactiumSyncState({ user: { name: 'Alice', age: 30 } });
state.set('user', { name: 'Bob', _replace: true });
// Result: { user: { name: 'Bob', _replace: true } } (NOT merged)
```

**Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:248-253`

### Force Merge Override

Use `forceMerge` parameter to merge even when conditions say no:

```javascript
const state = new ReactiumSyncState({ user: { name: 'Alice' } }, { noMerge: true });

// Normal set: no merge due to noMerge option
state.set('user', { age: 30 });
// Result: { user: { age: 30 } }

// Force merge: merge despite noMerge option
state.set('user', { city: 'NYC' }, true, true);
// Result: { user: { age: 30, city: 'NYC' } }
```

## Integration with Framework

### 1. useSyncState Hook

`useSyncState` creates a component-local ReactiumSyncState instance with reactive updates:

```javascript
import { useSyncState } from '@atomic-reactor/reactium-sdk-core';

const MyComponent = () => {
    const state = useSyncState({ count: 0 });

    const increment = () => state.set('count', state.get('count') + 1);

    return (
        <div>
            <p>Count: {state.get('count')}</p>
            <button onClick={increment}>+</button>
        </div>
    );
};
```

**How it works**:
1. Creates ReactiumSyncState in useRef (persists across renders)
2. Subscribes to `set` event (configurable) via useEventEffect
3. Triggers React re-render on event via useState updater

**Source**: `reactium-sdk-core/src/browser/useSyncState.ts:38-45`

### 2. Global State Singleton

`Reactium.State` is a global ReactiumSyncState instance:

```javascript
import Reactium from '@atomic-reactor/reactium-core/sdk';

// Set global state
Reactium.State.set('currentUser', { id: 1, name: 'Alice' });

// Get global state
const user = Reactium.State.get('currentUser');

// Listen to changes
Reactium.State.addEventListener('change', (event) => {
    if (event.path === 'currentUser') {
        console.log('User changed:', event.value);
    }
});
```

**Initialization**: `export const State = new ReactiumSyncState(window.state || {});`

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/named-exports/state.js:14`

### 3. RegisteredComponents Registry

The Component registry extends ReactiumSyncState:

```javascript
export class RegisteredComponents extends ReactiumSyncState<ComponentRegistry> {
    constructor() {
        super({}, { noMerge: true }); // Components never merge, always replace
    }

    register(id, component) {
        this.set(id, component);
    }

    unregister(id) {
        this.del(id);
    }
}
```

**Why noMerge**: Components are replaced entirely, not merged.

**Source**: `reactium-sdk-core/src/browser/RegisteredComponents.ts:18-39`

### 4. Handle System

Handles use ReactiumSyncState internally for observable state:

```javascript
import { Handle } from '@atomic-reactor/reactium-sdk-core';

const myHandle = new Handle('MyHandle', { count: 0 });
myHandle.current = new ReactiumSyncState({ count: 0 });

// Handles automatically wrap state in ReactiumSyncState
Handle.register('MyHandle', myHandle);
```

**Integration**: `useRegisterSyncHandle` wraps useSyncState in Handle registration.

**Source**: See CLAUDE/HANDLE_SYSTEM.md

### 5. Routing System

Route data loading stores results in ReactiumSyncState-based handles:

```javascript
export const MyPage = () => {
    const handle = useSyncHandle(MyPage.handleId);
    const data = handle?.get('data');

    return <div>{JSON.stringify(data)}</div>;
};

MyPage.loadState = async ({ params }) => {
    const data = await fetchData(params);
    return { data }; // Stored in ReactiumSyncState handle
};

MyPage.handleId = 'MyPageHandle';
```

**Source**: See CLAUDE/ROUTING_SYSTEM.md

## Real-World Usage Examples

### Example 1: Local Component State

**From**: `Reactium-Core-Plugins/src/app/components/Test/StateLoader/StateLoader.jsx:17`

```javascript
import { useSyncState, useStateEffect } from '@atomic-reactor/reactium-core/sdk';

export const StateLoader = () => {
    const state = useSyncState({ content: 'StateLoader' });

    useStateEffect({
        'state-load-one': () => state.set('event', 'one'),
        'state-load-two': () => state.set('event', 'two'),
    });

    return (
        <div>
            {state.get('event') && <div>Event: {state.get('event')}</div>}
        </div>
    );
};
```

**Pattern**: Component-local state with external event integration.

### Example 2: Routing State Synchronization

**From**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/app/RoutedContent.jsx:11`

```javascript
import { useSyncState } from '@atomic-reactor/reactium-core/sdk';

const useRoutes = () => {
    const routeState = useSyncState(Reactium.Routing.get());
    const setState = () => {
        routeState.set(Reactium.Routing.get());
    };

    useEffect(() => {
        setState();
        return Reactium.Routing.subscribe(setState);
    }, []);

    return routeState;
};
```

**Pattern**: Sync external observable (Routing) with component state.

### Example 3: Extended State Methods

**From**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/named-exports/state.js:15`

```javascript
export const State = new ReactiumSyncState(window.state || {});

State.extend('registerDataLoader', (config = {}) => {
    const eventType = config.eventType || 'dataLoaded';
    const path = config.path;
    const callback = config.callback;

    const dispatchingDataLoad = async (...context) => {
        try {
            const data = await callback(config, ...context);
            State.set(path, data);
            State.dispatch(eventType, { data, config, context });
        } catch (error) {
            State.dispatch(`${eventType}-error`, { error, config, context });
        }
    };

    // Register hook, route listener, event listener, pulse, etc.
    // Based on config.loadAt options
});
```

**Pattern**: Add framework-level capabilities to global state via extend.

### Example 4: Test Suite Validation

**From**: `reactium-sdk-core/test/useSyncState.test.tsx:25-50`

```javascript
const MyComponent = ({ spy }) => {
    const syncState = useSyncState({ count: 0 }, 'set');

    useEffect(() => {
        syncState.addEventListener('set', () => spy(syncState.get('count')));
    }, []);

    const handleClick = () => {
        syncState.set('count', syncState.get('count') + 1);
    };

    const reset = () => {
        syncState.reset();
        syncState.dispatch('set'); // Manual dispatch needed after reset
    };

    return (
        <div>
            <h1>Count: {syncState.get('count')}</h1>
            <button onClick={handleClick}>Increment</button>
            <button onClick={reset}>Reset</button>
        </div>
    );
};
```

**Key insight**: After `reset()`, must manually `dispatch()` if you want listeners to fire.

## Comparison with Other Patterns

### vs useState

| Feature | useState | ReactiumSyncState |
|---------|----------|-------------------|
| Timing | Asynchronous | Synchronous |
| API | `[value, setter]` | `state.get() / state.set()` |
| Events | None | Full EventTarget integration |
| Paths | No nested access | object-path support |
| Merging | Replace only | Smart merge with hooks |
| Extensibility | None | Custom methods via extend |

**When to use ReactiumSyncState**:
- Need synchronous state access
- Want event-driven subscriptions
- Need deep path addressing
- Building observable state patterns
- Integrating with framework hooks/handles

**When to use useState**:
- Simple component-local state
- No event subscriptions needed
- React-only patterns

### vs MobX

| Feature | MobX | ReactiumSyncState |
|---------|------|-------------------|
| Philosophy | Automatic tracking | Explicit subscriptions |
| Reactivity | Proxy-based | EventTarget-based |
| Learning curve | Steep (decorators, observables) | Shallow (just EventTarget) |
| Framework coupling | None | Reactium integrated |
| Size | ~16kb (min+gzip) | Included in SDK |

**ReactiumSyncState advantages**:
- Native EventTarget API (familiar to web developers)
- No magic proxy tracking
- Explicit event lifecycle
- Hook-based extensibility

### vs Redux

| Feature | Redux | ReactiumSyncState |
|---------|-------|-------------------|
| Architecture | Centralized store + reducers | Distributed observables |
| State updates | Actions + reducers | Direct mutation |
| Middleware | Redux middleware | Hook system |
| DevTools | Redux DevTools | Browser EventTarget inspection |
| Boilerplate | High | Low |

**ReactiumSyncState advantages**:
- Zero boilerplate
- Direct state mutation (simpler)
- Framework-integrated hooks
- Multiple independent instances

## Best Practices

### 1. Choose the Right Update Event

```javascript
// Default: 'set' event fires on every set() call
const state1 = useSyncState({ count: 0 }, 'set');

// Better: 'change' event only fires when value actually changes
const state2 = useSyncState({ count: 0 }, 'change');

// Custom: Use custom events for specific workflows
const state3 = useSyncState({ items: [] }, 'items-updated');
state3.addEventListener('items-updated', handler);
```

**Recommendation**: Use `'change'` for most cases to avoid unnecessary re-renders.

### 2. Namespace Global State

```javascript
// Bad: Polluting global state
Reactium.State.set('count', 0);
Reactium.State.set('user', {});
Reactium.State.set('items', []);

// Good: Namespace by feature
Reactium.State.set('myPlugin.count', 0);
Reactium.State.set('myPlugin.user', {});
Reactium.State.set('myPlugin.items', []);
```

**Recommendation**: Always use dot-notation namespacing for global state.

### 3. Use extend for Reusable Logic

```javascript
// Bad: Repetitive logic
state.set('count', state.get('count') + 1);
state.set('count', state.get('count') + 1);

// Good: Encapsulated logic
state.extend('increment', function() {
    this.set('count', this.get('count') + 1);
});
state.increment();
state.increment();
```

**Recommendation**: Extract common state mutations into extended methods.

### 4. Silent Updates for Batch Changes

```javascript
// Bad: Triggers 3 events, 3 re-renders
state.set('a', 1);
state.set('b', 2);
state.set('c', 3);

// Good: Batched update, 1 event, 1 re-render
state.set('a', 1, false); // Silent
state.set('b', 2, false); // Silent
state.set('c', 3);        // Final update triggers event
```

**Recommendation**: Use `update = false` for intermediate updates in batch operations.

### 5. Cleanup Event Listeners

```javascript
// Bad: Listener never cleaned up
useEffect(() => {
    state.addEventListener('change', handler);
}, []);

// Good: Cleanup on unmount
useEffect(() => {
    const unsubscribe = state.addEventListener('change', handler);
    return unsubscribe; // Auto-cleanup
}, []);

// Better: Use useEventEffect
import { useEventEffect } from '@atomic-reactor/reactium-sdk-core';
useEventEffect(state, { change: handler });
```

**Recommendation**: Always use useEventEffect for event subscriptions in React components.

### 6. TypeScript Type Safety

```typescript
// Define state type
interface MyState {
    count: number;
    user: { name: string; age: number };
}

// Type-safe state instance
const state = new ReactiumSyncState<MyState>({
    count: 0,
    user: { name: 'Alice', age: 30 }
});

// Type-safe get
const count = state.get<number>('count'); // type: number
const name = state.get<string>('user.name'); // type: string

// Type-safe extended methods
type ExtendedState = ReactiumSyncState<MyState> & {
    increment: () => void;
};

const typedState = state as ExtendedState;
typedState.extend('increment', function() {
    this.set('count', this.get<number>('count') + 1);
});
```

## Common Gotchas

### 1. change Event Doesn't Fire

**Problem**: Set value but `change` event doesn't fire.

**Cause**: Value didn't actually change (deep equality check).

```javascript
const state = new ReactiumSyncState({ user: { name: 'Alice' } });

state.addEventListener('change', () => console.log('Changed!'));

state.set('user', { name: 'Alice' }); // No event: value unchanged
state.set('user', { name: 'Bob' });   // Event fires: value changed
```

**Solution**: Use `set` event instead of `change` if you need to track all set operations.

### 2. Merging Arrays (Always Replaces)

**Problem**: Setting an array doesn't merge, always replaces.

**Cause**: Arrays are in the no-merge conditions list.

```javascript
const state = new ReactiumSyncState({ items: ['a', 'b'] });

state.set('items', ['c', 'd']);
// Result: ['c', 'd'] (NOT ['a', 'b', 'c', 'd'])
```

**Solution**: Manually merge arrays or use `insert()` method:

```javascript
const current = state.get('items', []);
state.set('items', [...current, 'c', 'd']);

// Or use insert
state.insert('items', 'c', state.get('items').length);
```

### 3. reset() Doesn't Trigger Events

**Problem**: After `reset()`, listeners don't fire.

**Cause**: `reset()` only sets internal state, doesn't dispatch events.

```javascript
const state = new ReactiumSyncState({ count: 5 });
state.addEventListener('change', () => console.log('Changed!'));

state.reset(); // No event fired
```

**Solution**: Manually dispatch after reset:

```javascript
state.reset();
state.dispatch('change'); // Now listeners fire
```

### 4. Direct State Mutation Bypasses Events

**Problem**: Modifying `state.state` directly doesn't trigger events.

**Cause**: Direct property access bypasses the set() method.

```javascript
const state = new ReactiumSyncState({ count: 0 });
state.addEventListener('change', () => console.log('Changed!'));

state.state.count = 5; // No event!
console.log(state.get('count')); // 5 (state changed, but no event)
```

**Solution**: Always use `set()` method:

```javascript
state.set('count', 5); // Correct: fires events
```

### 5. noMerge Option Applies to All Sets

**Problem**: `noMerge: true` option affects **all** set operations globally.

**Cause**: Option is instance-wide, not per-operation.

```javascript
const state = new ReactiumSyncState({ user: { name: 'Alice' } }, { noMerge: true });

state.set('user', { age: 30 });
// Result: { user: { age: 30 } } - name is lost!
```

**Solution**: Use `forceMerge` parameter for specific merges:

```javascript
state.set('user', { age: 30 }, true, true); // forceMerge = true
// Result: { user: { name: 'Alice', age: 30 } }
```

### 6. Path Confusion (String vs Array)

**Problem**: String paths with dots work differently than expected.

**Cause**: object-path treats dots as separators.

```javascript
const state = new ReactiumSyncState({});

state.set('user.name', 'Alice');
// Creates nested: { user: { name: 'Alice' } }

state.set(['user.name'], 'Bob');
// Creates single key: { 'user.name': 'Bob' }
```

**Solution**: Use consistent path format. Prefer string for nested, array for keys with dots:

```javascript
// Nested paths: use string
state.set('user.name', 'Alice');

// Literal key with dot: use array
state.set(['user.name'], 'Bob');
```

### 7. extend() Method Binding

**Problem**: Extended method loses `this` context when passed around.

**Cause**: Methods are bound to instance, but can be unbound.

```javascript
const state = new ReactiumSyncState({ count: 0 });
state.extend('increment', function() {
    this.set('count', this.get('count') + 1);
});

const { increment } = state;
increment(); // Works: method is pre-bound in extend()

const callback = state.increment;
callback(); // Works: still bound
```

**Note**: extend() automatically binds methods to instance, so this is usually not a problem. But be aware of the binding.

### 8. Event Listener ID Collision

**Problem**: Registering same listener ID twice warns and replaces.

**Cause**: addEventListener tracks by ID to prevent duplicates.

```javascript
const state = new ReactiumSyncState({ count: 0 });

const handler1 = () => console.log('Handler 1');
const handler2 = () => console.log('Handler 2');

state.addEventListener('change', handler1, {}, 'my-id');
state.addEventListener('change', handler2, {}, 'my-id'); // Warning + replaces handler1
```

**Solution**: Use unique IDs or omit ID parameter (auto-generated):

```javascript
state.addEventListener('change', handler1); // Auto ID
state.addEventListener('change', handler2); // Different auto ID
```

## Debugging Techniques

### 1. Log All Events

```javascript
const state = new ReactiumSyncState({ count: 0 });

['before-set', 'set', 'change', 'before-del', 'del'].forEach(type => {
    state.addEventListener(type, (event) => {
        console.log(`[${type}]`, event.path, event.value);
    });
});
```

### 2. Inspect Listeners

```javascript
console.log(state.listeners);
// { change: { 'uuid-1': [Function], 'uuid-2': [Function] } }
```

### 3. Track State Changes

```javascript
state.addEventListener('change', (event) => {
    console.log('State changed:', {
        path: event.path,
        oldValue: event.path ? state.initial : undefined,
        newValue: event.value,
        fullState: state.state,
    });
});
```

### 4. Use Browser DevTools

ReactiumSyncState extends EventTarget, so you can use browser DevTools:

1. Store reference in console: `window.debugState = state;`
2. Monitor events: Right-click in console → Monitor Events → `monitorEvents(debugState)`
3. Inspect state: `debugState.state`, `debugState.listeners`

## Performance Considerations

### Event Overhead

Each state change triggers event dispatch. For high-frequency updates:

```javascript
// Bad: 1000 events
for (let i = 0; i < 1000; i++) {
    state.set('count', i);
}

// Good: 1000 silent updates + 1 final event
for (let i = 0; i < 999; i++) {
    state.set('count', i, false); // Silent
}
state.set('count', 999); // Final update with event
```

### Deep Equality Checks

The `change` event uses `_.isEqual()` for deep comparison. For large objects:

```javascript
// Expensive: Deep equality on large object
const state = new ReactiumSyncState({ largeArray: new Array(10000) });
state.set('largeArray', new Array(10000)); // Deep comparison runs
```

**Solution**: Use `set` event instead of `change` to skip equality check.

### Memory Leaks

Event listeners persist until explicitly removed:

```javascript
// Bad: Listener persists after component unmount
const state = useSyncState({ count: 0 });
state.addEventListener('change', expensiveHandler);

// Good: Cleanup on unmount
useEffect(() => {
    const unsubscribe = state.addEventListener('change', expensiveHandler);
    return unsubscribe;
}, []);

// Best: Use useEventEffect
useEventEffect(state, { change: expensiveHandler });
```

## Summary

**ReactiumSyncState** is the foundational observable state pattern in Reactium:

- **EventTarget-based**: Native browser API, familiar and debuggable
- **Object-path addressing**: Deep nested property access
- **Smart merging**: Hook-extensible merge conditions
- **Synchronous**: Immediate state access (unlike useState)
- **Extensible**: Add custom methods via extend()
- **Framework-integrated**: Powers useSyncState, State singleton, Component registry, Handle system, routing

**Use Cases**:
- Component-local state with events (useSyncState)
- Global state with observability (Reactium.State)
- Custom registries (RegisteredComponents pattern)
- Observable handles (Handle system)
- Route data management (Routing system)

**Key Principle**: If you need observable state in Reactium, ReactiumSyncState is the building block.

**Related Documentation:**
- [ComponentEvent System](COMPONENT_EVENT_SYSTEM.md) - Event payload flattening and useEventEffect hook
- [Handle System Architecture](HANDLE_SYSTEM.md) - Global handle registry using ReactiumSyncState
- [hookableComponent System](HOOKABLE_COMPONENT.md) - Component registry (RegisteredComponents) using ReactiumSyncState
