<!-- v1.0.0 -->

# Reactium Utility Hooks Collection

**Complete reference for specialized React hooks in Reactium SDK**

---

## Overview

Reactium provides 6 specialized utility hooks beyond standard React hooks for common patterns:

| Hook | Purpose | Use Case |
|------|---------|----------|
| `useAsyncEffect` | Async side effects with mount safety | Data fetching, async initialization |
| `useEventEffect` | Event listener lifecycle management | DOM events, window events, custom events |
| `useFulfilledObject` | Promise fulfillment tracking | Complex async initialization |
| `useIsContainer` | DOM hierarchy checking | Click-outside detection, event delegation |
| `useScrollToggle` | Body scroll control | Modals, overlays, fixed positioning |
| `useDerivedState` | Prop-to-state derivation | Controlled components |
| `useStatus` | Type-safe status management | UI state machines |
| `useFocusEffect` | Auto-focus on render | Form accessibility |

---

## useAsyncEffect

**Purpose**: Perform async side effects with mount safety check.

**Source**: `reactium-sdk-core/src/browser/useAsyncEffect.ts:1-72`

### API

```typescript
useAsyncEffect(
    callback: (isMounted: () => boolean) => Promise<void | Function>,
    deps?: DependencyList
): void
```

### How It Works

1. Creates `AsyncUpdate` class instance with `isMounted()` method
2. Calls async callback with `isMounted` function
3. Sets `mounted = false` on cleanup
4. Waits for async operation to complete before calling cleanup function

### Real-World Example

From `reactium-admin-core/User/useAvatar.js`:

```javascript
import { useAsyncEffect } from '@atomic-reactor/reactium-sdk-core';

useAsyncEffect(async (isMounted) => {
    const user = await Reactium.User.current();

    if (!isMounted()) return; // Component unmounted during fetch

    setAvatar(user.avatar);
}, []);
```

### Best Practices

✅ **Always check `isMounted()` before state updates after async operations**

```javascript
useAsyncEffect(async (isMounted) => {
    const data = await fetchData();

    if (!isMounted()) return; // Prevent state update on unmounted component

    setData(data);
}, []);
```

✅ **Return cleanup function for subscriptions**

```javascript
useAsyncEffect(async (isMounted) => {
    const subscription = await subscribe();

    return () => subscription.unsubscribe(); // Cleanup runs after async completes
}, []);
```

### Common Gotchas

❌ **Cleanup timing**: Cleanup function runs AFTER async operation completes, not immediately on unmount

```javascript
// ❌ WRONG - cleanup might run after delay
useAsyncEffect(async (isMounted) => {
    await delay(5000);
    return () => console.log('cleanup'); // Runs 5 seconds after unmount
}, []);

// ✅ CORRECT - cleanup immediate resources
useAsyncEffect(async (isMounted) => {
    const abort = new AbortController();
    fetch('/api', { signal: abort.signal });

    return () => abort.abort(); // Runs immediately on unmount
}, []);
```

❌ **Forgetting mount check**

```javascript
// ❌ WRONG - state update on unmounted component
useAsyncEffect(async (isMounted) => {
    const data = await fetch('/api');
    setState(data); // ERROR if component unmounted
}, []);

// ✅ CORRECT
useAsyncEffect(async (isMounted) => {
    const data = await fetch('/api');
    if (!isMounted()) return;
    setState(data);
}, []);
```

---

## useEventEffect

**Purpose**: Add/remove event listeners with automatic cleanup.

**Source**: `reactium-sdk-core/src/browser/useEventEffect.ts:1-59`

### API

```typescript
useEventEffect<Target extends EventTarget>(
    target: Target,
    handlers: { [event: string]: (e: Event) => void },
    deps?: any[]
): void
```

### How It Works

1. Validates target has `addEventListener`/`removeEventListener`
2. Filters handlers to only functions
3. Adds all event listeners on mount/deps change
4. Removes all listeners on cleanup

### Real-World Example

From `reactium-admin-core/reactium-ui/EventForm/index.js`:

```javascript
import { useEventEffect } from '@atomic-reactor/reactium-sdk-core';

const EventForm = ({ onSubmit }) => {
    const formRef = useRef();

    useEventEffect(
        formRef.current,
        {
            submit: (e) => {
                e.preventDefault();
                onSubmit(e);
            },
            change: (e) => {
                // Handle form changes
            },
            keydown: (e) => {
                if (e.key === 'Enter') {
                    // Handle enter key
                }
            }
        },
        [onSubmit]
    );

    return <form ref={formRef}>...</form>;
};
```

### Best Practices

✅ **Use for multiple event listeners on same target**

```javascript
// ✅ GOOD - multiple events managed together
useEventEffect(window, {
    resize: handleResize,
    scroll: handleScroll,
    keydown: handleKeydown
}, [handleResize, handleScroll, handleKeydown]);

// ❌ VERBOSE - multiple useEffect calls
useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
}, [handleResize]);
// ... repeat for scroll, keydown
```

✅ **Include handler functions in deps for closure updates**

```javascript
useEventEffect(element, {
    click: () => console.log(count) // Captures count
}, [count]); // Re-attach listener when count changes
```

### Common Gotchas

❌ **Target not ready on first render**

```javascript
// ❌ WRONG - ref.current is null on first render
const ref = useRef();
useEventEffect(ref.current, { click: handler }, []); // target is null

// ✅ CORRECT - use conditional or useLayoutEffect
useEffect(() => {
    if (!ref.current) return;
    // Manually add listeners, or use separate effect
}, []);
```

❌ **Invalid target type**

```javascript
// ❌ WRONG - plain object not EventTarget
useEventEffect({ name: 'test' }, { click: handler }); // No-op

// ✅ CORRECT - DOM element or EventTarget
useEventEffect(document.getElementById('btn'), { click: handler });
```

---

## useFulfilledObject

**Purpose**: Wait for object properties to be defined via polling.

**Source**: `reactium-sdk-core/src/browser/useFullfilledObject.ts:1-47`

### API

```typescript
useFulfilledObject(
    obj: object,
    keys: string[], // Object-path keys to check
    delay: number = 1 // Polling interval in ms
): [ready: boolean, obj: object, count: number]
```

### How It Works

1. Polls object every `delay` ms
2. Checks if all `keys` are defined via `object-path.get()`
3. Sets `ready = true` when all keys exist
4. Returns `[ready, obj, pollCount]`

### Real-World Example

```javascript
import { useFulfilledObject } from '@atomic-reactor/reactium-sdk-core';

const MyComponent = () => {
    const globalState = useRef({});

    // Wait for async initialization to complete
    const [ready, state, attempts] = useFulfilledObject(
        globalState.current,
        ['user.profile', 'settings.theme', 'data.loaded'],
        100 // Poll every 100ms
    );

    if (!ready) return <Loading attempts={attempts} />;

    return <div>User: {state.user.profile.name}</div>;
};
```

### Best Practices

✅ **Use for complex async initialization patterns**

```javascript
// ✅ GOOD - wait for multiple async sources
const [ready] = useFulfilledObject(appState, [
    'sdk.initialized',
    'router.ready',
    'user.loaded'
], 50);
```

### Common Gotchas

❌ **Infinite polling if keys never fulfilled**

```javascript
// ❌ WRONG - typo in key, polls forever
const [ready] = useFulfilledObject(obj, ['user.proifle'], 1); // Never ready

// ✅ CORRECT - verify keys exist eventually or add timeout
const [ready, obj, count] = useFulfilledObject(obj, ['user.profile'], 100);
if (count > 100) {
    console.error('Timeout waiting for user.profile');
}
```

❌ **Polling too fast causes performance issues**

```javascript
// ❌ BAD - polls every 1ms
const [ready] = useFulfilledObject(obj, keys, 1);

// ✅ BETTER - poll every 50-100ms
const [ready] = useFulfilledObject(obj, keys, 50);
```

---

## useIsContainer

**Purpose**: Check if element is child of container (DOM traversal).

**Source**: `reactium-sdk-core/src/browser/useIsContainer.ts:1-28`

### API

```typescript
useIsContainer(
    element: Node,
    container: Node
): boolean
```

### How It Works

1. Traverses up DOM tree from `element` using `parentNode`
2. Checks strict equality (`===`) against `container`
3. Returns `true` if match found, `false` otherwise

### Real-World Example

```javascript
import { useIsContainer } from '@atomic-reactor/reactium-sdk-core';

const Dropdown = () => {
    const dropdownRef = useRef();

    useEffect(() => {
        const handleClick = (e) => {
            const isInside = useIsContainer(e.target, dropdownRef.current);

            if (!isInside) {
                setOpen(false); // Click outside - close dropdown
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return <div ref={dropdownRef}>...</div>;
};
```

### Best Practices

✅ **Use for click-outside detection**

```javascript
const handleOutsideClick = (e) => {
    if (!useIsContainer(e.target, modalRef.current)) {
        closeModal();
    }
};
```

### Common Gotchas

❌ **Not actually a hook** - doesn't use React hooks internally, safe to call conditionally

```javascript
// ✅ SAFE - despite "use" prefix, this is a plain function
if (someCondition) {
    const isInside = useIsContainer(element, container);
}
```

❌ **Strict equality only**

```javascript
// ❌ WRONG - cloned nodes won't match
const clone = container.cloneNode(true);
useIsContainer(element, clone); // Always false

// ✅ CORRECT - same reference
useIsContainer(element, container);
```

---

## useScrollToggle

**Purpose**: Disable/enable body scroll (for modals/overlays).

**Source**: `reactium-sdk-core/src/browser/useScrollToggle.ts:1-123`

### API

```typescript
useScrollToggle(): {
    enable: () => void;
    disable: () => void;
    toggle: () => void;
    get: (path: string) => any;
    set: (path: string, value: any) => void;
}
```

### How It Works

1. Creates global `BodyScroll` handle (singleton ReactiumSyncState)
2. Saves scroll position in `window._scrollTogglePosition`
3. `disable()`: Sets body to `position: fixed` with negative margin
4. `enable()`: Restores `position: relative` and scrolls to saved position
5. All components share same handle state

### Real-World Example

```javascript
import { useScrollToggle } from '@atomic-reactor/reactium-sdk-core';

const Modal = ({ isOpen }) => {
    const scroll = useScrollToggle();

    useEffect(() => {
        if (isOpen) {
            scroll.disable(); // Freeze scroll
        } else {
            scroll.enable(); // Restore scroll
        }
    }, [isOpen]);

    return isOpen ? <div className="modal">...</div> : null;
};
```

### Best Practices

✅ **Always re-enable scroll on cleanup**

```javascript
useEffect(() => {
    scroll.disable();
    return () => scroll.enable(); // Cleanup
}, []);
```

✅ **Use for modals, sidebars, overlays**

```javascript
const Sidebar = ({ visible }) => {
    const scroll = useScrollToggle();

    useEffect(() => {
        scroll[visible ? 'disable' : 'enable']();
    }, [visible]);
};
```

### Common Gotchas

❌ **Global handle affects all components**

```javascript
// ❌ PROBLEM - Component A enables scroll, affects Component B's modal
const ComponentA = () => {
    const scroll = useScrollToggle();
    scroll.enable(); // Closes all modals everywhere!
};

// ✅ SOLUTION - coordinate scroll state or use ref counting
```

❌ **Handle not reactive without `useSyncHandle`**

```javascript
// ❌ WRONG - won't re-render on state change
const scroll = useScrollToggle();
console.log(scroll.get('enabled')); // Doesn't trigger re-render

// ✅ CORRECT - useScrollToggle already calls useSyncHandle internally
```

---

## useDerivedState

**Purpose**: Derive state from props with selective subscriptions.

**Source**: `reactium-sdk-core/src/browser/useDerivedState.ts:1-180`

**Note**: Already documented in UTILITY_HOOKS_PHASE_2.md (Nov 28, 2025). See RESEARCH_PLAN.md:220-222 for complete coverage.

---

## useStatus

**Purpose**: Type-safe status management with ref-based storage.

**Source**: `reactium-sdk-core/src/browser/useStatus.ts:1-58`

**Note**: Already documented in UTILITY_HOOKS_PHASE_2.md (Nov 28, 2025). See RESEARCH_PLAN.md:220-222 for complete coverage.

---

## useFocusEffect

**Purpose**: Auto-focus element on render.

**Source**: `reactium-sdk-core/src/browser/useFocusEffect.ts`

**Note**: Already documented in UTILITY_HOOKS_PHASE_2.md (Nov 28, 2025). See RESEARCH_PLAN.md:220-222 for complete coverage.

---

## Comparison with Standard React Hooks

| Reactium Hook | Standard Alternative | Advantage |
|--------------|---------------------|-----------|
| `useAsyncEffect` | `useEffect` + manual cleanup | Built-in mount checking, async-first |
| `useEventEffect` | `useEffect` + addEventListener | Declarative multiple listeners |
| `useFulfilledObject` | Custom polling loop | Reusable polling pattern |
| `useIsContainer` | Manual DOM traversal | Concise API |
| `useScrollToggle` | Manual body style manipulation | Position preservation, global handle |
| `useDerivedState` | `useEffect` + `useState` | Selective prop subscriptions |
| `useStatus` | `useState` | Type-safe, ref-based non-reactive |
| `useFocusEffect` | `useEffect` + `element.focus()` | Automatic selector, focus-once |

---

## Integration Patterns

### Async Data Fetching with Mount Safety

```javascript
import { useAsyncEffect } from '@atomic-reactor/reactium-sdk-core';

const DataComponent = ({ id }) => {
    const [data, setData] = useState(null);

    useAsyncEffect(async (isMounted) => {
        const response = await fetch(`/api/items/${id}`);
        const json = await response.json();

        if (!isMounted()) return;

        setData(json);
    }, [id]);

    return data ? <div>{data.name}</div> : <Loading />;
};
```

### Modal with Scroll Prevention

```javascript
import { useScrollToggle } from '@atomic-reactor/reactium-sdk-core';

const Modal = ({ isOpen, onClose }) => {
    const scroll = useScrollToggle();

    useEffect(() => {
        if (isOpen) {
            scroll.disable();
        } else {
            scroll.enable();
        }

        return () => scroll.enable(); // Always restore on unmount
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">...</div>
        </div>
    );
};
```

### Click-Outside Detection

```javascript
import { useEventEffect, useIsContainer } from '@atomic-reactor/reactium-sdk-core';

const Popover = ({ onClickOutside }) => {
    const popoverRef = useRef();

    useEventEffect(
        document,
        {
            click: (e) => {
                if (!useIsContainer(e.target, popoverRef.current)) {
                    onClickOutside();
                }
            }
        },
        [onClickOutside]
    );

    return <div ref={popoverRef}>...</div>;
};
```

### Complex Async Initialization

```javascript
import { useFulfilledObject } from '@atomic-reactor/reactium-sdk-core';

const App = () => {
    const appState = useRef({});

    // Parallel async initialization
    useEffect(() => {
        loadSDK().then(sdk => appState.current.sdk = sdk);
        loadUser().then(user => appState.current.user = user);
        loadConfig().then(config => appState.current.config = config);
    }, []);

    const [ready] = useFulfilledObject(
        appState.current,
        ['sdk', 'user', 'config'],
        100
    );

    if (!ready) return <Splash />;

    return <MainApp state={appState.current} />;
};
```

---

## When to Use Each Hook

### useAsyncEffect
- ✅ Data fetching with cancellation
- ✅ Async subscription setup
- ✅ Any async operation that updates state
- ❌ Simple synchronous side effects (use `useEffect`)

### useEventEffect
- ✅ Multiple event listeners on same element
- ✅ Window/document events
- ✅ Dynamic event handler updates
- ❌ Single event listener (use `useEffect`)
- ❌ React synthetic events (use props)

### useFulfilledObject
- ✅ Waiting for multiple async sources
- ✅ Global state initialization
- ✅ Complex startup sequences
- ❌ Simple async/await (use `useAsyncEffect`)
- ❌ Known async patterns (use Promises)

### useIsContainer
- ✅ Click-outside detection
- ✅ Event delegation checks
- ✅ DOM hierarchy validation
- ❌ React component hierarchy (use Context)

### useScrollToggle
- ✅ Modals that prevent scroll
- ✅ Fullscreen overlays
- ✅ Fixed position UI
- ❌ Scroll position tracking (use `window.scrollY`)
- ❌ Smooth scrolling (use `window.scrollTo`)

### useDerivedState
- ✅ Controlled components with local state
- ✅ Prop-derived state with complex logic
- ✅ Selective prop subscriptions
- ❌ Simple prop mirroring (pass props directly)

### useStatus
- ✅ Type-safe UI state machines
- ✅ Non-reactive status flags
- ✅ Status checks without re-renders
- ❌ Reactive status (use `useState`)

### useFocusEffect
- ✅ Form accessibility
- ✅ Modal auto-focus
- ✅ Focus-once behavior
- ❌ Programmatic focus control (use refs)

---

## TypeScript Support

All hooks have full TypeScript definitions:

```typescript
import { useAsyncEffect, useEventEffect, useFulfilledObject } from '@atomic-reactor/reactium-sdk-core';

// Type-safe async callback
useAsyncEffect(async (isMounted: () => boolean) => {
    const data: User = await fetchUser();
    if (!isMounted()) return;
    setUser(data);
}, []);

// Type-safe event handlers
useEventEffect<HTMLDivElement>(
    divRef.current,
    {
        click: (e: MouseEvent) => console.log(e.clientX),
        keydown: (e: KeyboardEvent) => console.log(e.key)
    },
    []
);

// Type-safe object fulfillment
const [ready, obj] = useFulfilledObject<AppState>(
    state,
    ['user', 'config'],
    100
);
```

---

## Summary

Reactium utility hooks provide specialized patterns for:

1. **Async Safety**: `useAsyncEffect` prevents state updates on unmounted components
2. **Event Management**: `useEventEffect` declaratively manages event listeners
3. **Async Coordination**: `useFulfilledObject` waits for multiple async sources
4. **DOM Utilities**: `useIsContainer` for click-outside, hierarchy checks
5. **Scroll Control**: `useScrollToggle` for modal/overlay scroll prevention
6. **Derived State**: `useDerivedState` for controlled components with local state
7. **Status Management**: `useStatus` for type-safe, non-reactive flags
8. **Focus Management**: `useFocusEffect` for accessibility

**Choose utility hooks when:**
- Pattern is common across codebase
- Standard hooks require boilerplate
- Type safety and consistency matter
- Framework integration is needed (Handle, ReactiumSyncState)

**Use standard React hooks when:**
- Pattern is unique to component
- Simple one-off logic
- No framework integration needed
