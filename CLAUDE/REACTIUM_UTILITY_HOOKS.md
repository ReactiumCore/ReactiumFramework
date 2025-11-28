<!-- v1.0.0 -->

# Reactium Utility Hooks Collection - Advanced React Patterns

**Source**: `reactium-sdk-core/src/browser/use*.ts`

## Overview

Reactium provides **7 specialized React hooks** for common patterns: async side effects, derived state from props, type-safe status management, focus handling, scroll control, DOM hierarchy checking, and promise fulfillment tracking.

**Key Concept**: These hooks extend React's built-in hooks with framework-specific patterns optimized for Reactium applications.

---

## useAsyncEffect - Async Side Effects with Mount Safety

**Source**: `reactium-sdk-core/src/browser/useAsyncEffect.ts:1-72`

### Purpose

Perform async side effects with automatic mount checking to prevent state updates on unmounted components.

### Signature

```typescript
useAsyncEffect(
    cb: (isMounted: () => boolean) => Promise<void | (() => void)>,
    deps?: DependencyList
): void
```

### Parameters

- `cb`: Async callback receiving `isMounted` function that returns boolean
  - Returns cleanup function or void
  - Cleanup function runs on component unmount
- `deps`: Dependency array (like `useEffect`)

### How It Works

```typescript
class AsyncUpdate {
    __mounted = true;
    isMounted = () => this.__mounted;
}

useEffect(() => {
    const updater = new AsyncUpdate();
    updater.mounted = true;
    const effectPromise = doEffect(updater);

    return () => {
        updater.mounted = false;  // Mark unmounted immediately
        effectPromise.then(unmountCB => {
            if (typeof unmountCB === 'function') {
                unmountCB();  // Run cleanup after async completes
            }
        });
    };
}, deps);
```

**Source**: `useAsyncEffect.ts:58-71`

### Real-World Example

```typescript
import { useAsyncEffect } from '@atomic-reactor/reactium-sdk-core';

const DataLoader = () => {
    const [data, setData] = useState(null);

    useAsyncEffect(async (isMounted) => {
        const response = await fetch('/api/data');
        const json = await response.json();

        // Check if still mounted before updating state
        if (!isMounted()) return;

        setData(json);

        // Cleanup function
        return () => {
            console.log('Cleanup async operation');
        };
    }, []);

    return <div>{JSON.stringify(data)}</div>;
};
```

### Comparison with useEffect

| Feature                    | useEffect + async IIFE | useAsyncEffect          |
| -------------------------- | ---------------------- | ----------------------- |
| Mount checking             | Manual                 | Automatic               |
| Cleanup after async        | Complex                | Built-in                |
| TypeScript support         | Generic                | Typed isMounted         |
| Async/await support        | Wrapped in IIFE        | Direct in callback      |

### Best Practices

 **DO**: Use for data fetching
```typescript
useAsyncEffect(async (isMounted) => {
    const data = await loadData();
    if (!isMounted()) return;
    setData(data);
}, []);
```

 **DO**: Return cleanup function for subscriptions
```typescript
useAsyncEffect(async (isMounted) => {
    const subscription = await createSubscription();
    return () => subscription.unsubscribe();
}, []);
```

L **DON'T**: Forget mount check before state updates
```typescript
useAsyncEffect(async (isMounted) => {
    const data = await fetch();
    setData(data);  // ê WRONG: No mount check
}, []);
```

### Common Gotchas

1. **Cleanup Timing**: Cleanup function runs AFTER async completes, not immediately on unmount
2. **Multiple Async Calls**: If deps change before first call completes, cleanup won't cancel previous call - you need manual cancellation logic

---

## useDerivedState - Prop-to-State with Selective Subscriptions

**Source**: `reactium-sdk-core/src/browser/useDerivedState.ts:1-180`

### Purpose

Derive component state from props with **selective prop subscriptions** - only re-render when specific prop paths change (shallow comparison).

### Signature

```typescript
useDerivedState<StateType, PropsType>(
    props: PropsType,
    subscriptions: (string | number)[] = [],
    updateAll: boolean = false
): [StateType, (newState: Partial<StateType>, silent?: boolean) => void, () => void]
```

### Parameters

- `props`: Component props object
- `subscriptions`: Array of object-path strings to watch for changes (e.g., `['user.name', 'settings.theme']`)
- `updateAll`: When true, ALL props imprinted on state when ANY subscribed prop changes (default: false)

### Returns

`[state, setState, forceRefresh]`
- `state`: Derived state object (full props, not just subscriptions)
- `setState`: Merge new state (always triggers re-render unless `silent: true`)
- `forceRefresh`: Force re-render without changing state

### How It Works

```typescript
// Internal state tracking
const derivedStateRef = useRef({ ...props });  // Full props
const subscribedRef = useRef(getDerivedState(props));  // Just subscribed paths

// Compare subscribed props on each render
const changedDerived = getChanges(derivedState);

// If subscribed prop changed, update internal state and re-render
useEffect(() => {
    if (changedDerived.length > 0) {
        const shouldRerender = changedDerived.reduce(
            (hasPropUpdates, path) => {
                return hasPropUpdates || internalPropSetState(path, newValue);
            },
            false
        );
        if (shouldRerender) {
            if (updateAll) {
                setState({ ...props });  // All props
            } else {
                forceRefresh();  // Just subscribed paths
            }
        }
    }
}, [subscriptions.sort().join('|'), propsVersion.current]);
```

**Source**: `useDerivedState.ts:155-176`

### Real-World Example

```typescript
import { useDerivedState } from '@atomic-reactor/reactium-sdk-core';
import op from 'object-path';

interface UserComponentProps {
    user: {
        name: string;
        email: string;
        settings: {
            theme: string;
            notifications: boolean;
        };
    };
    metadata: any;  // Not watched
}

const UserComponent: React.FC<UserComponentProps> = (props) => {
    // Only re-render when user.name or user.settings.theme changes
    const [state, setState] = useDerivedState<UserComponentProps, UserComponentProps>(
        props,
        ['user.name', 'user.settings.theme']
    );

    const userName = op.get(state, 'user.name', 'Unknown');
    const theme = op.get(state, 'user.settings.theme', 'light');

    // Internal state change (not from props)
    const handleLocalUpdate = () => {
        setState({
            user: {
                ...state.user,
                settings: {
                    ...state.user.settings,
                    theme: 'dark',
                },
            },
        });
    };

    return (
        <div>
            <div>Name: {userName}</div>
            <div>Theme: {theme}</div>
            <button onClick={handleLocalUpdate}>Toggle Theme</button>
        </div>
    );
};
```

**Behavior**:
- `props.user.email` changes í **No re-render** (not subscribed)
- `props.metadata` changes í **No re-render** (not subscribed)
- `props.user.name` changes í **Re-render** (subscribed)
- `props.user.settings.theme` changes í **Re-render** (subscribed)
- `setState()` called í **Always re-renders** (manual state update)

### Comparison with useState

| Feature                    | useState                    | useDerivedState            |
| -------------------------- | --------------------------- | -------------------------- |
| Initial state from props   | Manual initialization       | Automatic                  |
| Prop updates               | Ignored                     | Selective subscriptions    |
| Internal state updates     | Always respected            | Always respected           |
| Re-render control          | Every setState              | Subscribed props or setState |
| Shallow comparison         | No                          | Yes (per subscribed path)  |

### Best Practices

 **DO**: Use for controlled components that accept initial state from props
```typescript
const [state, setState] = useDerivedState(props, ['initialValue']);
```

 **DO**: Subscribe only to props that affect rendering
```typescript
const [state] = useDerivedState(props, ['user.id', 'user.name']);
// user.metadata changes won't trigger re-render
```

 **DO**: Use object-path notation for nested props
```typescript
const [state] = useDerivedState(props, ['settings.ui.theme', 'settings.locale']);
```

L **DON'T**: Subscribe to entire objects when only specific fields matter
```typescript
const [state] = useDerivedState(props, ['user']);  // ê WRONG: Any user prop change re-renders
const [state] = useDerivedState(props, ['user.name', 'user.email']);  // ê CORRECT
```

### Common Gotchas

1. **Empty Subscriptions Array**: State initialized from props, but NEVER updates from prop changes
2. **Shallow Comparison Only**: Deep object changes not detected unless object reference changes
3. **setState Always Re-renders**: Even if subscribed props haven't changed, manual setState always triggers re-render (unless `silent: true`)
4. **updateAll Behavior**: When true, ANY subscribed prop change causes ALL props to imprint on state (performance impact)

---

## useStatus - Type-Safe Status Management

**Source**: `reactium-sdk-core/src/browser/useStatus.ts:1-58`

### Purpose

Manage component status with **type-safe string enums** and efficient status checking without re-renders.

### Signature

```typescript
useStatus<S extends string = string>(
    initialStatus: S = 'pending' as S
): [S, (newStatus: S, forceRender?: boolean) => void, (statuses: S | S[]) => boolean, () => S]
```

### Parameters

- `initialStatus`: Initial status string (default: `'pending'`)

### Returns

`[status, setStatus, isStatus, getStatus]`
- `status`: Current status (reactive, triggers re-render on change)
- `setStatus(newStatus, forceRender)`: Set status (forceRender: true to re-render)
- `isStatus(statuses)`: Check if current status matches (accepts single status or array)
- `getStatus()`: Get current status without triggering re-render

### How It Works

```typescript
const statusRef = useRef<S>(initialStatus);  // Non-reactive status storage
const [, rerender] = useState({});  // Trigger re-renders

const setStatus = (newStatus: S, forceRender = false) => {
    if (statusRef.current === newStatus) return;  // Skip if unchanged
    statusRef.current = newStatus;
    if (forceRender) rerender({ updated: Date.now() });  // Optional re-render
};

const isStatus = (statuses: S | S[]) =>
    (_.flatten([statuses]) as S[]).includes(statusRef.current);

const getStatus = () => statusRef.current;

return [statusRef.current as S, setStatus, isStatus, getStatus];
```

**Source**: `useStatus.ts:42-56`

**Key Insight**: Status stored in ref (non-reactive) with opt-in re-renders via `forceRender` flag.

### Real-World Example

```typescript
import { useStatus } from '@atomic-reactor/reactium-sdk-core';

type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

const DataLoader = () => {
    const [status, setStatus, isStatus, getStatus] = useStatus<LoadingStatus>('idle');
    const [data, setData] = useState(null);

    const loadData = async () => {
        setStatus('loading', true);  // Re-render to show loading UI

        try {
            const response = await fetch('/api/data');
            const json = await response.json();
            setData(json);
            setStatus('success', true);  // Re-render to show success UI
        } catch (error) {
            setStatus('error', true);  // Re-render to show error UI
        }
    };

    // Check status without re-rendering
    if (isStatus(['idle', 'error'])) {
        return (
            <div>
                <button onClick={loadData}>
                    {isStatus('error') ? 'Retry' : 'Load Data'}
                </button>
            </div>
        );
    }

    if (isStatus('loading')) {
        return <div>Loading...</div>;
    }

    return <div>{JSON.stringify(data)}</div>;
};
```

### Type Safety with Enums

```typescript
// Define status enum
const ENUMS = {
    STATUS: {
        IDLE: 'idle',
        LOADING: 'loading',
        SUCCESS: 'success',
        ERROR: 'error',
    } as const,
};

type Status = typeof ENUMS.STATUS[keyof typeof ENUMS.STATUS];

// Type-safe status hook
const [status, setStatus, isStatus] = useStatus<Status>(ENUMS.STATUS.IDLE);

setStatus(ENUMS.STATUS.LOADING, true);  //  Type-safe
setStatus('invalid', true);  // L TypeScript error
```

### Best Practices

 **DO**: Use string literal types for status
```typescript
type Status = 'pending' | 'loading' | 'success' | 'error';
const [status, setStatus] = useStatus<Status>('pending');
```

 **DO**: Use `forceRender: true` only when UI needs to update
```typescript
setStatus('loading', true);  // Show loading spinner
```

 **DO**: Use `isStatus()` for conditional rendering
```typescript
if (isStatus(['loading', 'pending'])) {
    return <Spinner />;
}
```

L **DON'T**: Forget to pass `forceRender: true` when status change affects UI
```typescript
setStatus('error');  // ê WRONG: UI won't update
setStatus('error', true);  // ê CORRECT
```

### Common Gotchas

1. **No Auto-Rerender**: `setStatus()` without `forceRender: true` updates status but doesn't trigger re-render
2. **Status Comparison**: `isStatus()` compares by value, not reference - safe for strings
3. **Type Widening**: Without explicit type parameter, status type inferred as `string` (not literal union)

---

## useFocusEffect - Auto-Focus on Render

**Source**: `reactium-sdk-core/src/browser/useFocusEffect.ts:1-75`

### Purpose

Automatically focus on a specific element within a container on component render using `data-focus` attribute or custom selector.

### Signature

```typescript
useFocusEffect(
    container: RefObject<Element> | Element,
    deps: DependencyList,
    selectors: string = '*[data-focus]'
): [Element | undefined, Dispatch<SetStateAction<Element | undefined>>]
```

### Parameters

- `container`: DOM element or ref containing the focus target
- `deps`: Dependency array (focus runs when deps change)
- `selectors`: CSS selector to find focus target (default: `'*[data-focus]'`)

### Returns

`[focused, setFocused]`
- `focused`: Currently focused element (or undefined)
- `setFocused`: Manually set focused element

### Real-World Example

```typescript
import { useFocusEffect } from '@atomic-reactor/reactium-sdk-core';
import cn from 'classnames';
import React, { useRef } from 'react';

const LoginForm = () => {
    const formRef = useRef<HTMLFormElement>(null);
    const [focused] = useFocusEffect(formRef, []);

    return (
        <form ref={formRef}>
            <input
                type="text"
                name="username"
                data-focus  {/* ê Auto-focused on mount */}
                className={cn({ focused })}
            />
            <input type="password" name="password" />
            <button type="submit">Login</button>
        </form>
    );
};
```

### Custom Selector Example

```typescript
const MyForm = () => {
    const containerRef = useRef(null);
    const [focused] = useFocusEffect(
        containerRef,
        [],
        'input[name="email"]'  // Custom selector
    );

    return (
        <div ref={containerRef}>
            <input name="username" />
            <input name="email" />  {/* ê Auto-focused */}
        </div>
    );
};
```

### Best Practices

 **DO**: Use for form auto-focus on mount
```typescript
<input data-focus />
```

 **DO**: Use empty deps array for mount-only focus
```typescript
const [focused] = useFocusEffect(containerRef, []);
```

L **DON'T**: Focus on every render (creates poor UX)
```typescript
const [focused] = useFocusEffect(containerRef, [value]);  // ê Re-focuses on every value change
```

### Common Gotchas

1. **Container Not Rendered**: Hook skips if container ref is null/undefined
2. **Multiple Focus Elements**: Only first match focused (querySelector behavior)
3. **Already Focused**: Hook skips if element already focused (prevents focus stealing)

---

## useScrollToggle - Body Scroll Control

**Source**: `reactium-sdk-core/src/browser/useScrollToggle.ts:1-123`

### Purpose

Control document body scroll with position preservation - useful for modals, overlays, and fixed-position UI.

### Signature

```typescript
useScrollToggle(): AttachedScrollHandle

interface AttachedScrollHandle extends ReactiumSyncState<{ enabled: boolean }> {
    enable: () => void;
    disable: () => void;
    toggle: () => void;
}
```

### Returns

Handle object with methods:
- `enable()`: Enable scroll, restore position
- `disable()`: Disable scroll, preserve position
- `toggle()`: Toggle scroll state
- Also inherits ReactiumSyncState methods (get/set/subscribe)

### How It Works

```typescript
// Disable scroll: Fix body position with negative margin
const disable = () => {
    setPos({ x: X(), y: Y() });  // Save current position

    document.body.style.position = 'fixed';
    document.body.style.overflow = 'visible';
    document.body.style.marginTop = `-${pos.y}px`;  // Preserve visual position
    document.body.style.marginLeft = `-${pos.x}px`;
};

// Enable scroll: Restore body and scroll to saved position
const enable = () => {
    const pos = POS();

    document.body.style.marginTop = '0';
    document.body.style.marginLeft = '0';
    document.body.style.position = 'relative';
    document.body.style.overflow = 'auto';
    window.scrollTo(pos.x, pos.y);  // Restore scroll position
};
```

**Source**: `useScrollToggle.ts:62-85`

### Real-World Example

```typescript
import { useScrollToggle } from '@atomic-reactor/reactium-sdk-core';

const Modal = ({ isOpen, onClose }) => {
    const scrollHandle = useScrollToggle();

    useEffect(() => {
        if (isOpen) {
            scrollHandle.disable();  // Prevent background scroll
        } else {
            scrollHandle.enable();  // Restore scroll
        }

        return () => scrollHandle.enable();  // Cleanup on unmount
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button onClick={onClose}>Close</button>
                {/* Modal content */}
            </div>
        </div>
    );
};
```

### Best Practices

 **DO**: Disable scroll when showing modals
```typescript
scrollHandle.disable();
```

 **DO**: Always enable on cleanup
```typescript
useEffect(() => {
    scrollHandle.disable();
    return () => scrollHandle.enable();
}, []);
```

L **DON'T**: Forget to re-enable scroll
```typescript
// ê WRONG: Scroll never restored
if (showModal) scrollHandle.disable();
```

### Common Gotchas

1. **Global Handle**: Handle registered as `BodyScroll` in Handle registry - affects all components
2. **Visual Jump**: When enabling, scroll position restored but may jump if content height changed
3. **Mobile Safari**: Fixed position behavior differs on iOS - test thoroughly

---

## useIsContainer - DOM Hierarchy Check

**Source**: `reactium-sdk-core/src/browser/useIsContainer.ts:1-28`

### Purpose

Determine if an element is a descendant of a container by traversing parent nodes.

### Signature

```typescript
useIsContainer(element: Node, match: Node): boolean
```

### Parameters

- `element`: Starting node (innermost)
- `match`: Target container (outermost)

### Returns

`boolean` - True if element is descendant of match

### How It Works

```typescript
export const useIsContainer = (element: Node, match: Node) => {
    let isContainer = false;
    const nodes = [element];

    if (!element || !match) return false;

    while (nodes.length > 0) {
        const node = nodes.shift() as Node;

        isContainer = node === match ? true : isContainer;

        if (isContainer === true) break;
        if (node.parentNode) nodes.push(node.parentNode);
    }

    return isContainer;
};
```

**Source**: `useIsContainer.ts:11-27`

### Real-World Example

```typescript
import { useIsContainer } from '@atomic-reactor/reactium-sdk-core';
import { useRef, useEffect } from 'react';

const Dropdown = () => {
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            const clickedInside = useIsContainer(e.target, dropdownRef.current);

            if (!clickedInside) {
                // Close dropdown
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return <div ref={dropdownRef}>{/* Dropdown content */}</div>;
};
```

### Best Practices

 **DO**: Use for click-outside detection
```typescript
const clickedInside = useIsContainer(event.target, containerRef.current);
if (!clickedInside) closeDropdown();
```

L **DON'T**: Call repeatedly in render (use useCallback)
```typescript
// ê WRONG: New function every render
const isInside = useIsContainer(element, container);

// ê CORRECT: Memoized callback
const checkInside = useCallback(() => {
    return useIsContainer(element, container);
}, [element, container]);
```

### Common Gotchas

1. **Not a Hook**: Despite name, doesn't use React hooks internally - naming inconsistency
2. **Node Comparison**: Uses strict equality (`===`) - elements must be exact same reference
3. **Null Safety**: Returns false if either element or match is null/undefined

---

## useFulfilledObject - Promise Fulfillment Tracking

**Source**: `reactium-sdk-core/src/browser/useFullfilledObject.ts:1-47`

### Purpose

Wait for specific object properties to become defined (resolve promises, async loading, etc.) with polling.

### Signature

```typescript
useFulfilledObject(
    obj: object = {},
    keys: string[] = [],
    delay: number = 1
): [boolean, object, number]
```

### Parameters

- `obj`: Object to monitor
- `keys`: Array of object-path keys to check (e.g., `['user.id', 'settings.theme']`)
- `delay`: Polling interval in milliseconds (default: 1ms)

### Returns

`[ready, obj, count]`
- `ready`: True when all keys defined
- `obj`: The monitored object
- `count`: Number of polling attempts

### How It Works

```typescript
const validate = () =>
    new Promise<boolean>((resolve) => {
        clear();
        ival.current = setInterval(() => {
            count.current += 1;
            const completed = keys.filter(
                (key) => typeof op.get(obj, key) !== 'undefined'
            );
            if (completed.length !== keys.length) return;  // Keep polling
            clear();
            resolve(true);  // All keys fulfilled
        }, delay);
    });

useAsyncEffect(
    async (mounted) => {
        if (ready === true) return clear();
        const results = await validate();
        if (mounted()) setReady(results);
        clear();
    },
    [obj, keys, count.current]
);
```

**Source**: `useFulfilledObject.ts:21-43`

### Real-World Example

```typescript
import { useFulfilledObject } from '@atomic-reactor/reactium-sdk-core';

const AsyncDataDisplay = ({ dataLoader }) => {
    const [data, setData] = useState({});

    useEffect(() => {
        // Simulate async data loading
        setTimeout(() => setData({ user: { id: 123 } }), 100);
        setTimeout(() => setData(prev => ({ ...prev, settings: { theme: 'dark' } })), 200);
    }, []);

    const [ready, fulfilledData, attempts] = useFulfilledObject(
        data,
        ['user.id', 'settings.theme'],
        10  // Poll every 10ms
    );

    if (!ready) {
        return <div>Loading... (attempt {attempts})</div>;
    }

    return (
        <div>
            <div>User ID: {fulfilledData.user.id}</div>
            <div>Theme: {fulfilledData.settings.theme}</div>
        </div>
    );
};
```

### Best Practices

 **DO**: Use for complex async initialization
```typescript
const [ready] = useFulfilledObject(state, ['user', 'settings', 'permissions']);
```

 **DO**: Use reasonable polling interval
```typescript
const [ready] = useFulfilledObject(data, keys, 50);  // 50ms
```

L **DON'T**: Use for simple loading states (use useStatus instead)
```typescript
// ê WRONG: Overkill for simple loading
const [ready] = useFulfilledObject({ data }, ['data']);

// ê CORRECT: Use status
const [status, setStatus] = useStatus('loading');
```

### Common Gotchas

1. **Infinite Polling**: If keys never fulfilled, polls forever (set timeout externally if needed)
2. **Performance**: Low delay (e.g., 1ms) can cause performance issues with many checks
3. **Type Checking**: Only checks `typeof !== 'undefined'` - `null`, `false`, `0` are considered fulfilled

---

## Summary

| Hook                 | Purpose                              | Key Feature                   |
| -------------------- | ------------------------------------ | ----------------------------- |
| useAsyncEffect       | Async side effects                   | Auto mount checking           |
| useDerivedState      | Prop-to-state with subscriptions     | Selective re-renders          |
| useStatus            | Type-safe status management          | Opt-in re-renders             |
| useFocusEffect       | Auto-focus on render                 | data-focus attribute          |
| useScrollToggle      | Body scroll control                  | Position preservation         |
| useIsContainer       | DOM hierarchy check                  | Parent traversal              |
| useFulfilledObject   | Promise fulfillment tracking         | Polling until fulfilled       |

**Critical for**: Async data loading, controlled components, status-driven UI, form auto-focus, modal scroll prevention, click-outside detection, complex async state initialization.

---

## Related Documentation

- [ReactiumSyncState Deep Dive](./REACTIUM_SYNC_STATE.md) - useScrollToggle uses ReactiumSyncState
- [Handle System](./HANDLE_SYSTEM.md) - useScrollToggle registers BodyScroll handle
- [Testing Strategies](./TESTING_STRATEGIES.md) - Testing custom hooks patterns

---

**Version**: 1.0.0
**Last Updated**: Nov 28, 2025
**Discovered During**: Third exploration - substantial utility hook library with complex implementations
