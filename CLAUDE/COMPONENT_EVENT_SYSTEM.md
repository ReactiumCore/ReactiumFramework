<!-- v1.0.0 -->

# ComponentEvent System Architecture

**Purpose**: Type-safe custom event class providing payload flattening, prototype pollution protection, and framework-wide event communication backbone.

**Source**: `reactium-sdk-core/src/browser/Events.ts:21-78`

## Overview

ComponentEvent is a specialized CustomEvent subclass used throughout Reactium for type-safe event communication. It automatically "flattens" event payloads by spreading detail properties directly onto the event object, providing convenient access without nested `.detail` references.

**Critical Integration**: This is the event foundation for:
- ReactiumSyncState events (`set`, `change`, `del`, `insert`)
- Component registry events
- Handle system communication
- Global State dispatches
- Plugin-to-plugin communication

## Core Architecture

### ComponentEvent Class

```typescript
// Source: reactium-sdk-core/src/browser/Events.ts:21-48
export class ComponentEvent<T extends EventPayload | undefined> extends CustomEvent<T> {
  constructor(type: string, data?: T) {
    super(type, { detail: data });

    // Remove reserved properties from data
    if (data) {
      op.del(data, 'type');
      op.del(data, 'target');
    }

    // Flatten payload properties onto event object
    Object.entries(data || {}).forEach(([key, value]) => {
      // Prototype pollution protection
      if (key === 'proto__' || key === '__proto__') return;

      // Collision resolution: prefix with __ if property exists
      if (!this[key]) {
        try {
          this[key] = value;
        } catch (err) { }
      } else {
        key = `__${key}`;
        this[key] = value;
      }
    });
  }
}
```

### EventPayload Interface

```typescript
// Source: reactium-sdk-core/src/browser/Events.ts:10-14
export interface EventPayload {
  type?: string,
  target?: EventTarget,
  [key: string]: any,  // Flexible additional properties
}
```

## Key Features

### 1. Payload Flattening

**Before (Standard CustomEvent)**:
```javascript
const event = new CustomEvent('myEvent', { detail: { count: 5, name: 'Alice' } });
console.log(event.detail.count);  // 5
console.log(event.count);          // undefined
```

**After (ComponentEvent)**:
```javascript
const event = new ComponentEvent('myEvent', { count: 5, name: 'Alice' });
console.log(event.detail.count);  // 5 (still available)
console.log(event.count);          // 5 (flattened!)
console.log(event.name);           // 'Alice'
```

### 2. Prototype Pollution Protection

```javascript
// These malicious keys are ignored
const event = new ComponentEvent('test', {
  __proto__: { polluted: true },
  proto__: { alsoBad: true },
  normalKey: 'safe'
});

console.log(event.normalKey);  // 'safe'
console.log(event.__proto__);  // [Object prototype] (unchanged)
console.log(event.proto__);    // undefined (filtered)
```

**Source**: `reactium-sdk-core/src/browser/Events.ts:36`

### 3. Property Collision Resolution

If a payload key already exists on the event object (e.g., native Event properties), it's prefixed with `__`:

```javascript
const event = new ComponentEvent('test', {
  type: 'custom-type',        // Collides with event.type
  bubbles: true,              // Collides with event.bubbles
  customProp: 'no collision'
});

console.log(event.type);        // 'test' (event type, not payload)
console.log(event.__type);      // 'custom-type' (payload value)
console.log(event.__bubbles);   // true (payload value)
console.log(event.customProp);  // 'no collision'
```

**Source**: `reactium-sdk-core/src/browser/Events.ts:42-45`

### 4. Reserved Property Removal

`type` and `target` are automatically removed from the payload before flattening to avoid confusion with native Event properties:

```javascript
const event = new ComponentEvent('myEvent', {
  type: 'should-be-ignored',
  target: someElement,
  data: 'preserved'
});

console.log(event.type);    // 'myEvent' (constructor arg)
console.log(event.target);  // (event target, not payload)
console.log(event.data);    // 'preserved'
```

**Source**: `reactium-sdk-core/src/browser/Events.ts:31-33`

## Integration with ReactiumSyncState

Every ReactiumSyncState event uses ComponentEvent:

```typescript
// Source: reactium-sdk-core/src/browser/ReactiumSyncState.ts:525-531
public dispatch<Payload extends EventPayload>(
    type: string,
    payload?: Payload,
) {
    this.dispatchEvent(new ComponentEvent<Payload>(type, payload));
    return this;
}
```

**Example** - State change events:

```javascript
const state = useSyncState({ count: 0 });

// Listen for set events
state.addEventListener('set', (event) => {
  console.log(event.path);   // Flattened from payload
  console.log(event.value);  // Flattened from payload
});

// Listen for change events (only fires if value actually changed)
state.addEventListener('change', (event) => {
  console.log(event.path);   // 'count'
  console.log(event.value);  // 5
});

state.set('count', 5);  // Triggers both 'set' and 'change'
```

**Source**: `reactium-sdk-core/src/browser/ReactiumSyncState.ts:510-512`

## useEventEffect Hook

The primary React hook for subscribing to ComponentEvent targets:

```typescript
// Source: reactium-sdk-core/src/browser/useEventEffect.ts:29-58
export const useEventEffect = <Target extends EventTarget>(
    target: Target,
    handlers: EventHandlers = {},
    deps: any[] | undefined = undefined,
) => {
    useEffect(() => {
        if (!target || !isTarget(target)) return;

        const subs: EventHandlers = {};

        // Sanitize handlers
        Object.entries(handlers).forEach(([type, cb]) => {
            if (typeof cb === 'function') {
                subs[type] = cb;
            }
        });

        // Add listeners
        Object.entries(subs).forEach(([type, cb]) =>
            target.addEventListener(type, cb),
        );

        // Cleanup on unmount
        return () => {
            if (!isTarget(target)) return;

            Object.entries(subs).forEach(([type, cb]) =>
                target.removeEventListener(type, cb),
            );
        };
    }, deps);
};
```

### isTarget Helper

```typescript
// Source: reactium-sdk-core/src/browser/useEventEffect.ts:8-12
export const isTarget = (target) =>
    target &&
    typeof target === 'object' &&
    target.addEventListener &&
    target.removeEventListener;
```

## Real-World Usage Patterns

### Pattern 1: ReactiumSyncState Event Subscription

```javascript
import { useSyncState, useEventEffect } from '@atomic-reactor/reactium-core/sdk';

const MyComponent = () => {
  const state = useSyncState({ items: [] });

  // Subscribe to all state changes
  useEventEffect(state, {
    set: (event) => {
      console.log('Property set:', event.path, event.value);
    },
    change: (event) => {
      console.log('Value changed:', event.path, event.value);
    },
    del: (event) => {
      console.log('Property deleted:', event.path);
    },
  });

  return <button onClick={() => state.set('items', [1, 2, 3])}>Update</button>;
};
```

**Source**: Test pattern from `reactium-sdk-core/test/useEventEffect.test.tsx:36-73`

### Pattern 2: Global State Dispatcher

```javascript
// Source: Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/named-exports/state.js:158-167
export const useDispatcher = ({ props = {}, state = State }) => (type, obj) => {
    obj = _.isObject(obj) ? obj : {};

    const evt = new ComponentEvent(type, obj);
    const cb = op.get(props, cc(`on-${type}`));

    // One-time listener from props
    if (_.isFunction(cb)) state.addEventListener(type, cb);
    state.dispatchEvent(evt);
    if (_.isFunction(cb)) state.removeEventListener(type, cb);
};
```

**Usage**:
```javascript
const MyComponent = (props) => {
  const dispatch = useDispatcher({ props });

  const handleClick = () => {
    dispatch('item-clicked', { itemId: 123, name: 'Product' });
  };

  return <button onClick={handleClick}>Click Me</button>;
};

// Parent component
<MyComponent
  on-item-clicked={(event) => {
    console.log(event.itemId);  // 123 (flattened!)
    console.log(event.name);    // 'Product'
  }}
/>
```

### Pattern 3: Component Registry Events

```javascript
import { Component, useEventEffect } from '@atomic-reactor/reactium-core/sdk';

const MyComponent = () => {
  // Listen for component registration changes
  useEventEffect(Component, {
    set: (event) => {
      console.log('Component registered:', event.path);
    },
    del: (event) => {
      console.log('Component unregistered:', event.path);
    },
  });

  return <div>Monitoring component registry...</div>;
};
```

**Source**: RegisteredComponents extends ReactiumSyncState at `reactium-sdk-core/src/browser/RegisteredComponents.ts:17-69`

### Pattern 4: Handle System Communication

```javascript
import { Handle, useEventEffect } from '@atomic-reactor/reactium-core/sdk';

const CartHandle = Handle.get('CartHandle');

// Listen to cart changes from anywhere
useEventEffect(CartHandle, {
  change: (event) => {
    if (event.path === 'total') {
      console.log('Cart total changed:', event.value);
    }
  },
});

// Update cart (triggers 'change' event)
CartHandle.set('total', 99.99);
```

## ComponentTarget Class

Optional utility for creating EventTarget instances with updatable state:

```typescript
// Source: reactium-sdk-core/src/browser/Events.ts:65-78
export class ComponentTarget extends EventTarget {
  constructor(handle: IComponentEventHandle) {
    delete handle.update;  // Remove update method from handle
    super();
    this.update(handle);   // Spread initial properties
  }

  public update = (values) =>
    Object.entries(values).forEach(
      ([key, value]) => (this[key] = value),
    )
}
```

**Use Case**: Creating custom event sources with mutable state.

## Type Safety with TypeScript

```typescript
import { ComponentEvent, EventPayload } from '@atomic-reactor/reactium-core/sdk';

// Define custom payload type
interface CartEventPayload extends EventPayload {
  itemId: number;
  quantity: number;
  price: number;
}

// Create type-safe event
const event = new ComponentEvent<CartEventPayload>('add-to-cart', {
  itemId: 42,
  quantity: 2,
  price: 29.99,
});

// TypeScript knows these properties exist
console.log(event.itemId);    // number
console.log(event.quantity);  // number
console.log(event.price);     // number
```

## Common Event Naming Conventions

**State Events** (from ReactiumSyncState):
- `set` - Property set (fires before change check)
- `change` - Property changed (only fires if value differs)
- `before-set` - Before property set
- `del` - Property deleted
- `before-del` - Before property delete
- `insert` - Array element inserted
- `before-insert` - Before array insert

**Component Events** (plugin communication):
- `<feature>-init` - Feature initialization
- `<feature>-ready` - Feature ready
- `<action>-before` - Before action
- `<action>-after` - After action
- `<entity>-created` - Entity created
- `<entity>-updated` - Entity updated
- `<entity>-deleted` - Entity deleted

**Naming Pattern**: Use kebab-case, be descriptive, include context.

## Best Practices

### ✅ DO

1. **Use ComponentEvent for all framework events** - Consistency and flattening benefits
   ```javascript
   const event = new ComponentEvent('my-event', { data: 'value' });
   target.dispatchEvent(event);
   ```

2. **Leverage payload flattening** - Access properties directly
   ```javascript
   state.addEventListener('change', (event) => {
     console.log(event.path, event.value);  // Not event.detail.path
   });
   ```

3. **Use useEventEffect in components** - Automatic cleanup
   ```javascript
   useEventEffect(state, {
     change: handleChange,
   });
   ```

4. **Define TypeScript interfaces for complex payloads** - Type safety
   ```typescript
   interface MyPayload extends EventPayload {
     userId: string;
     action: 'create' | 'update' | 'delete';
   }
   ```

5. **Use descriptive event names** - Clarity over brevity
   ```javascript
   new ComponentEvent('user-profile-updated', { userId: 123 });
   ```

### ❌ DON'T

1. **Don't use native CustomEvent** - Lose flattening and framework integration
   ```javascript
   // Bad
   const event = new CustomEvent('my-event', { detail: { data } });

   // Good
   const event = new ComponentEvent('my-event', { data });
   ```

2. **Don't access `.detail` unnecessarily** - Flattened properties available directly
   ```javascript
   // Bad
   state.addEventListener('change', (event) => {
     console.log(event.detail.path);
   });

   // Good
   state.addEventListener('change', (event) => {
     console.log(event.path);
   });
   ```

3. **Don't use reserved keys in payload** - Will be removed
   ```javascript
   // Bad - 'type' and 'target' ignored
   new ComponentEvent('my-event', { type: 'custom', target: el });

   // Good
   new ComponentEvent('my-event', { eventType: 'custom', element: el });
   ```

4. **Don't trust payload with `__proto__`** - Automatically filtered
   ```javascript
   // This is safe - __proto__ ignored by ComponentEvent
   const untrustedData = JSON.parse(userInput);
   new ComponentEvent('user-input', untrustedData);
   ```

5. **Don't manually manage listeners in components** - Use useEventEffect
   ```javascript
   // Bad - no cleanup
   useEffect(() => {
     state.addEventListener('change', handleChange);
   }, []);

   // Good - automatic cleanup
   useEventEffect(state, { change: handleChange });
   ```

## Common Gotchas

### 1. Property Collision with Native Event Properties

**Issue**: Payload keys matching native Event properties get prefixed with `__`.

```javascript
const event = new ComponentEvent('test', { bubbles: true, custom: 'safe' });

console.log(event.bubbles);    // false (native Event.bubbles)
console.log(event.__bubbles);  // true (payload value)
console.log(event.custom);     // 'safe' (no collision)
```

**Solution**: Avoid payload keys matching Event properties (`type`, `target`, `bubbles`, `cancelable`, etc.).

### 2. Flattened Properties in `.detail` Too

**Issue**: Properties exist both flattened AND in `.detail`.

```javascript
const event = new ComponentEvent('test', { count: 5 });

console.log(event.count);        // 5 (flattened)
console.log(event.detail.count); // 5 (original)
```

**Solution**: Choose one access pattern and stick with it. Prefer flattened access for brevity.

### 3. Reserved Properties Silently Removed

**Issue**: `type` and `target` in payload are deleted.

```javascript
const event = new ComponentEvent('my-event', {
  type: 'custom-type',  // Removed!
  target: element,      // Removed!
  data: 'preserved'
});

console.log(event.type);    // 'my-event' (constructor arg, not payload)
console.log(event.__type);  // undefined (payload removed)
```

**Solution**: Use different keys like `eventType`, `targetElement`, etc.

### 4. Silent Property Assignment Failures

**Issue**: `try/catch` swallows errors when setting read-only properties.

```javascript
// Source: reactium-sdk-core/src/browser/Events.ts:39-41
if (!this[key]) {
  try {
    this[key] = value;
  } catch (err) { }  // Silently fails for read-only properties
}
```

**Symptom**: Property not accessible directly, may be in `.detail` only.

**Solution**: Avoid payload keys matching read-only Event properties.

### 5. useEventEffect Deps Array Gotcha

**Issue**: Forgetting deps array causes listeners to never update.

```javascript
// Bad - deps=undefined means listeners NEVER update
useEventEffect(state, { change: handleChange });

// Good - listeners update when state changes
useEventEffect(state, { change: handleChange }, [state]);
```

**Solution**: Always provide deps array when target or handlers can change.

## Comparison with Alternatives

### vs Native CustomEvent

| Feature | CustomEvent | ComponentEvent |
|---------|-------------|----------------|
| Payload access | `event.detail.prop` | `event.prop` |
| Type safety | Generic `detail: any` | Generic payload type |
| Prototype pollution | Vulnerable | Protected |
| Collision handling | None | Auto-prefix with `__` |
| Framework integration | No | Yes (ReactiumSyncState, State, Component, Handle) |

### vs React Synthetic Events

| Feature | Synthetic Event | ComponentEvent |
|---------|-----------------|----------------|
| Usage | React DOM events | Custom application events |
| Event pooling | Yes (React <17) | No |
| Cross-browser | Yes | Yes (via EventTarget) |
| Custom payloads | No | Yes |
| Framework integration | React only | Reactium-wide |

## Debugging Techniques

### 1. Log All Events on a Target

```javascript
const logAllEvents = (target, prefix = 'EVENT') => {
  const originalDispatch = target.dispatchEvent.bind(target);

  target.dispatchEvent = (event) => {
    console.log(`${prefix}:`, event.type, event);
    return originalDispatch(event);
  };
};

// Usage
logAllEvents(State, 'STATE');
logAllEvents(Component, 'COMPONENT');
```

### 2. Inspect Flattened Properties

```javascript
state.addEventListener('change', (event) => {
  console.group(`Event: ${event.type}`);
  console.log('Flattened properties:');
  Object.keys(event).forEach(key => {
    if (!key.startsWith('_') && typeof event[key] !== 'function') {
      console.log(`  ${key}:`, event[key]);
    }
  });
  console.log('Original detail:', event.detail);
  console.groupEnd();
});
```

### 3. Track Event Listener Count

```javascript
const countListeners = (target) => {
  // Access internal listeners registry (ReactiumSyncState)
  if (target.listeners) {
    Object.entries(target.listeners).forEach(([type, listeners]) => {
      console.log(`${type}: ${Object.keys(listeners).length} listeners`);
    });
  }
};

countListeners(State);
```

## Performance Considerations

1. **Flattening overhead** - Minimal (simple property copy)
2. **Prototype pollution checks** - Two string comparisons per property
3. **Event listener cleanup** - Always use useEventEffect for automatic cleanup
4. **Memory** - Events are garbage collected normally; no pooling

## Summary

ComponentEvent is the event communication backbone of Reactium, providing:

- **Payload flattening** for convenient property access
- **Prototype pollution protection** for security
- **Property collision resolution** for reliability
- **Type safety** with TypeScript generics
- **Framework integration** with ReactiumSyncState, State, Component, Handle

**Use ComponentEvent** for all custom framework events and leverage useEventEffect for automatic listener management in React components.

**Related Documentation**:
- [ReactiumSyncState Deep Dive](REACTIUM_SYNC_STATE.md) - State event lifecycle
- [Handle System Architecture](HANDLE_SYSTEM.md) - Handle event patterns
- [hookableComponent System](HOOKABLE_COMPONENT.md) - Component registry events
