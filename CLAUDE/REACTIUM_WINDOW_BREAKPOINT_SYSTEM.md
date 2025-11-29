<!-- v1.0.0 -->

# Reactium Window and Breakpoint Utilities

**Complete SSR-safe window/document access and responsive breakpoint system for adaptive UI development.**

---

## Architecture Overview

The Reactium Window system provides:

- **SSR-Safe Accessors** - Conditional window/document access that doesn't crash server-side
- **Breakpoint System** - Responsive design utilities matching SCSS grid breakpoints
- **React Hooks** - Context-aware hooks for window size and breakpoints
- **Electron Detection** - Cross-platform window detection
- **WindowProvider Context** - React Context for toolkit/frame support

---

## SSR-Safe Window/Document Access

### Core Utilities

```typescript
// Returns window or undefined (never crashes SSR)
export const conditionalWindow = () =>
    typeof window !== 'undefined' ? window : undefined;

// Returns document or undefined (never crashes SSR)
export const conditionalDocument = () =>
    typeof document !== 'undefined' ? document : undefined;

// Check if window exists
export const isWindow = (iWindow?) => {
    iWindow = iWindow || conditionalWindow();
    return typeof iWindow !== 'undefined';
};

// Alias for clarity
export const isBrowserWindow = (iWindow?) => {
    return isWindow(iWindow);
};
```

**Source**: `reactium-sdk-core/src/browser/window.ts:3-26`

### Electron Detection

```typescript
export const isElectronWindow = (iWindow?): boolean => {
    iWindow = iWindow || conditionalWindow();

    return (
        typeof iWindow !== 'undefined' &&
        iWindow.process &&
        iWindow.process.type
    );
};
```

**Source**: `reactium-sdk-core/src/browser/window.ts:14-22`

**Returns `true`** when running in Electron (desktop app context)

---

## Breakpoint System

### Default Breakpoint Configuration

```typescript
export const BREAKPOINTS_DEFAULT: Breakpoints = {
    xs: 640,   // Extra small - mobile
    sm: 990,   // Small - tablet portrait
    md: 1280,  // Medium - tablet landscape / small desktop
    lg: 1440,  // Large - desktop
    xl: 1600,  // Extra large - wide desktop
};
```

**Source**: `reactium-sdk-core/src/browser/window.ts:32-38`

**Synchronized with SCSS**: These match `$breakpoints-max` SCSS map in Reactium styles

### SCSS Integration

The breakpoint values are **encoded in CSS** as `:after` pseudo-element content, allowing JavaScript to read SCSS configuration:

```scss
// In SCSS (overridable)
$breakpoints-max: (
    'xs': 640,
    'sm': 990,
    'md': 1280,
    'lg': 1440,
    'xl': 1600
) !default;

// Encoded in stylesheet as CSS content
body:after {
    content: '{"xs":640,"sm":990,"md":1280,"lg":1440,"xl":1600}';
    display: none;
}
```

**Single Source of Truth**: Change SCSS, JavaScript automatically reads new values

### Runtime Breakpoint Access

```typescript
// Get current breakpoint configuration (SCSS or default)
export const breakpoints = (iWindow?): Breakpoints => {
    iWindow = iWindow || conditionalWindow();
    return iWindow.breakpoints || BREAKPOINTS_DEFAULT;
};
```

**Source**: `reactium-sdk-core/src/browser/window.ts:40-43`

**Customization Pattern**:

```javascript
// Override breakpoints globally
window.breakpoints = {
    xs: 600,
    sm: 900,
    md: 1200,
    lg: 1400,
    xl: 1800,
};
```

### Determine Current Breakpoint

```typescript
export const breakpoint = (
    width?: number,
    iWindow?: Window,
    iDocument?: Document,
) => {
    iWindow = iWindow || conditionalWindow();
    iDocument = iDocument || conditionalDocument();

    width = width ? width : isWindow(iWindow) ? window.innerWidth : undefined;

    if (!width) {
        return 'sm'; // Default for SSR
    }

    const breaks = breakpoints(iWindow);
    const keys = Object.keys(breaks);
    const vals = Object.values(breaks);

    const index = _.sortedIndex(vals, width);

    if (index >= keys.length) {
        return keys.pop(); // Return 'xl' if width > max
    }
    if (index <= 0) {
        return keys.shift(); // Return 'xs' if width < min
    }

    return keys[index];
};
```

**Source**: `reactium-sdk-core/src/browser/window.ts:45-69`

**Algorithm**: Binary search (via `_.sortedIndex`) for O(log n) lookup

**Examples**:

```javascript
breakpoint(500);  // 'xs' (500 < 640)
breakpoint(800);  // 'sm' (640 < 800 < 990)
breakpoint(1100); // 'md' (990 < 1100 < 1280)
breakpoint(1500); // 'lg' (1440 < 1500 < 1600)
breakpoint(2000); // 'xl' (2000 > 1600)
```

---

## React Hooks

### useWindow() - Context-Aware Window Access

```javascript
import { useWindow } from '@atomic-reactor/reactium-core/sdk';

export default () => {
    const window = useWindow();

    useEffect(() => {
        if (Reactium.Utils.isWindow(window)) {
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);
};
```

**Source**: `reactium-core/sdk/named-exports/window.js:47-50`

**Why Not `window` Directly?**

- **SSR Safety** - Returns `undefined` on server
- **Frame Support** - Returns correct window when inside `react-frame-component` (toolkit)
- **Testing** - Can mock window object via WindowProvider

### useDocument() - Context-Aware Document Access

```javascript
import { useDocument } from '@atomic-reactor/reactium-core/sdk';

export const ScrollToTop = () => {
    const document = useDocument();

    const handleClick = () => {
        if (document) {
            document.documentElement.scrollTop = 0;
        }
    };

    return <button onClick={handleClick}>Back to Top</button>;
};
```

**Source**: `reactium-core/sdk/named-exports/window.js:59-62`

### useBreakpoints() - Get Breakpoint Configuration

```javascript
import { useBreakpoints } from '@atomic-reactor/reactium-core/sdk';

export const BreakpointInfo = () => {
    const breakpoints = useBreakpoints();

    return (
        <div>
            {Object.entries(breakpoints).map(([name, maxWidth]) => (
                <div key={name}>
                    {name}: {maxWidth}px
                </div>
            ))}
        </div>
    );
};
```

**Source**: `reactium-core/sdk/named-exports/window.js:81-85`

### useBreakpoint(width) - Get Breakpoint for Specific Width

```javascript
import { useBreakpoint } from '@atomic-reactor/reactium-core/sdk';

export const WidthChecker = ({ width }) => {
    const bp = useBreakpoint(width);

    return <div>{width}px is breakpoint: {bp}</div>;
};
```

**Source**: `reactium-core/sdk/named-exports/window.js:102-107`

### useWindowSize() - Reactive Window Size with Breakpoint

**Most Important Hook** - Provides window dimensions and current breakpoint with automatic updates on resize.

```javascript
import React from 'react';
import { useWindowSize } from '@atomic-reactor/reactium-core/sdk';

const Mobile = () => <div>Mobile View</div>;
const Tablet = () => <div>Tablet View</div>;
const Desktop = () => <div>Desktop View</div>;

export default () => {
    const { width, height, breakpoint } = useWindowSize();

    switch (breakpoint) {
        case 'xl':
        case 'lg':
            return <Desktop />;

        case 'md':
            return <Tablet />;

        case 'xs':
        case 'sm':
        default:
            return <Mobile />;
    }
};
```

**Source**: `reactium-core/sdk/named-exports/window.js:166-220`

**Return Value**:

```typescript
{
    width: number,       // window.innerWidth
    height: number,      // window.innerHeight
    breakpoint: string,  // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    scrollX?: number,    // window.scrollX (if scrolled)
    scrollY?: number     // window.scrollY (if scrolled)
}
```

**Parameters**:

```typescript
useWindowSize({
    defaultWidth: 1,      // Width when window undefined (SSR)
    defaultHeight: 1,     // Height when window undefined (SSR)
    delay: 0,             // Debounce delay for resize events (ms)
});
```

**Performance Optimization**:

```javascript
// Debounce resize events (reduce re-renders)
const { breakpoint } = useWindowSize({ delay: 200 });
```

**Implementation Details**:

```javascript
export const useWindowSize = (params = {}) => {
    const iWin = useWindow();
    const iDoc = useDocument();
    const hasWindow = isWindow(iWin);

    let { defaultWidth = 1, defaultHeight = 1, delay = 0 } = params;

    const getSize = () => {
        return hasWindow
            ? {
                  width: iWin.innerWidth,
                  height: iWin.innerHeight,
                  breakpoint: breakpoint(iWin.innerWidth, iWin, iDoc),
              }
            : {
                  width: defaultWidth,
                  height: defaultHeight,
                  breakpoint: breakpoint(defaultWidth),
              };
    };

    const sizeRef = useRef(getSize());
    const [, update] = useState(sizeRef.current);

    const setWindowSize = _.debounce(() => {
        sizeRef.current = { ...sizeRef.current, ...getSize() };
        update(sizeRef.current);
    }, delay);

    const setScrollPosition = _.debounce(() => {
        sizeRef.current = {
            ...sizeRef.current,
            scrollX: iWin.scrollX,
            scrollY: iWin.scrollY,
        };
        update(sizeRef.current);
    }, delay);

    useEffect(() => {
        if (!hasWindow) {
            return;
        }

        iWin.addEventListener('resize', setWindowSize);
        iWin.addEventListener('scroll', setScrollPosition);

        return () => {
            iWin.removeEventListener('resize', setWindowSize);
            iWin.removeEventListener('scroll', setScrollPosition);
        };
    }, [delay, defaultWidth, defaultHeight]);

    return sizeRef.current;
};
```

**Source**: `reactium-core/sdk/named-exports/window.js:166-220`

**Key Features**:

- **Ref-Based Storage** - Doesn't trigger re-render unless size actually changes
- **Debounced Updates** - Configurable delay prevents excessive re-renders
- **Scroll Tracking** - Automatically includes scroll position when scrolled
- **SSR Defaults** - Returns sensible defaults when window unavailable

---

## Real-World Patterns

### Pattern 1: Responsive Component Rendering

```javascript
import { useWindowSize } from '@atomic-reactor/reactium-core/sdk';

export const Header = () => {
    const { breakpoint } = useWindowSize();

    if (breakpoint === 'xs' || breakpoint === 'sm') {
        return <MobileHeader />;
    }

    return <DesktopHeader />;
};
```

### Pattern 2: Conditional Feature Loading

```javascript
import { useWindowSize } from '@atomic-reactor/reactium-core/sdk';
import { lazy, Suspense } from 'react';

const DesktopFeature = lazy(() => import('./DesktopFeature'));

export const Feature = () => {
    const { breakpoint } = useWindowSize();
    const isDesktop = ['lg', 'xl'].includes(breakpoint);

    if (!isDesktop) {
        return <MobileAlternative />;
    }

    return (
        <Suspense fallback={<Loading />}>
            <DesktopFeature />
        </Suspense>
    );
};
```

### Pattern 3: Dynamic Columns Based on Breakpoint

```javascript
import { useWindowSize } from '@atomic-reactor/reactium-core/sdk';

export const Grid = ({ items }) => {
    const { breakpoint } = useWindowSize();

    const columns = {
        xs: 1,
        sm: 2,
        md: 3,
        lg: 4,
        xl: 5,
    }[breakpoint];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {items.map((item) => (
                <GridItem key={item.id} {...item} />
            ))}
        </div>
    );
};
```

### Pattern 4: Debounced Window Size for Performance

```javascript
// Prevent excessive re-renders on rapid resize
const { width, breakpoint } = useWindowSize({ delay: 300 });
```

### Pattern 5: SSR-Safe Window Access

```javascript
import { conditionalWindow, isWindow } from '@atomic-reactor/reactium-core/sdk';

export const analytics = () => {
    const window = conditionalWindow();

    if (isWindow(window)) {
        window.gtag('event', 'page_view');
    }
};
```

### Pattern 6: Electron-Specific Features

```javascript
import { isElectronWindow } from '@atomic-reactor/reactium-core/sdk';

export const App = () => {
    const window = useWindow();
    const isElectron = isElectronWindow(window);

    return (
        <div>
            {isElectron && <ElectronMenuBar />}
            <MainContent />
        </div>
    );
};
```

---

## SCSS Breakpoint Integration

### SCSS Mixin Usage

The JavaScript breakpoints match SCSS breakpoint mixins:

```scss
.my-component {
    padding: 10px;

    @include breakpoint(sm) {
        padding: 20px;
    }

    @include breakpoint(md) {
        padding: 30px;
    }

    @include breakpoint(lg) {
        padding: 40px;
    }
}
```

**Real Examples**: `reactium-admin-core/Theme/_reactium-style-organisms-admin-layout.scss:39`, `reactium-admin-core/Login/_reactium-style-organisms-admin-login.scss:10`

### Breakpoint-Only Targeting

```scss
// Only apply at specific breakpoint (not above/below)
.desktop-only {
    display: none;

    @include breakpoint(lg) {
        display: block;
    }

    @include breakpoint(xl) {
        display: none; // Hide on xl
    }
}
```

### Mobile-First vs Desktop-First

**Mobile-First (Recommended)**:

```scss
.component {
    // Base styles for mobile
    font-size: 14px;

    @include breakpoint(sm) {
        font-size: 16px; // Tablet and up
    }

    @include breakpoint(lg) {
        font-size: 18px; // Desktop and up
    }
}
```

**Desktop-First**:

```scss
.component {
    // Base styles for desktop
    font-size: 18px;

    @include breakpoint(md, max) {
        font-size: 16px; // Tablet and down
    }

    @include breakpoint(sm, max) {
        font-size: 14px; // Mobile
    }
}
```

---

## WindowProvider Context (Advanced)

For toolkit/frame support, Reactium wraps components in `WindowProvider`:

```javascript
import WindowProvider from '@atomic-reactor/reactium-core/components/WindowProvider';

// Automatically provided in Reactium apps
<WindowProvider>
    <App />
</WindowProvider>
```

**Context Value**:

```javascript
{
    iWindow: window,   // Current window object
    iDocument: document // Current document object
}
```

**Source**: `reactium-core/sdk/named-exports/window.js:1,48,60`

**Use Case**: When component rendered inside `react-frame-component` (sandboxed iframe), `useWindow()` returns the **frame's** window, not parent window.

---

## Best Practices

### SSR Safety

1. **Always Use Conditional Accessors** - Never use `window` directly in shared code
2. **Check Before Using** - Use `isWindow()` before accessing window properties
3. **Default Breakpoint** - `breakpoint()` returns `'sm'` when window unavailable

### Performance

1. **Debounce useWindowSize** - Use `delay` parameter for components that re-render heavily
2. **Memoize Breakpoint Logic** - Avoid re-calculating on every render
3. **Avoid Inline Functions** - Extract event handlers to prevent re-registration

### Responsive Design

1. **Mobile-First** - Design for smallest screen, enhance for larger
2. **Use Breakpoint Hooks** - Prefer `useWindowSize()` over manual resize listeners
3. **Sync with SCSS** - Keep JavaScript and SCSS breakpoints aligned
4. **Test All Breakpoints** - Verify layout at every breakpoint threshold

### Testing

1. **Mock WindowProvider** - Inject custom window object for testing
2. **Test SSR** - Verify components render without window
3. **Test Resize** - Simulate resize events and verify breakpoint changes

---

## Common Gotchas

### Window Not Available on Server

**Problem**: `window is not defined` error during SSR

**Cause**: Direct `window` access in shared code

**Solution**:

```javascript
// ❌ BAD
const width = window.innerWidth;

// ✅ GOOD
import { conditionalWindow, isWindow } from '@atomic-reactor/reactium-core/sdk';

const window = conditionalWindow();
const width = isWindow(window) ? window.innerWidth : 0;
```

### Breakpoint Calculation Off by One

**Problem**: Width 990 returns `'md'` instead of `'sm'`

**Cause**: `_.sortedIndex` uses binary search for **insertion point** (next higher breakpoint)

**Example**:

```javascript
breakpoint(990); // Returns 'md' (next breakpoint after 990)
breakpoint(989); // Returns 'sm' (still under 990 threshold)
```

**Behavior**: Breakpoint changes **at** the threshold, not after

### useWindowSize Not Re-rendering

**Problem**: Component doesn't update on resize

**Cause**: Debounce delay set too high, or component not reading returned value

**Solution**:

```javascript
// Ensure you're reading the returned value
const { breakpoint } = useWindowSize(); // ✅
const windowSize = useWindowSize(); // ✅

useWindowSize(); // ❌ Not reading value
```

### SCSS and JavaScript Breakpoints Out of Sync

**Problem**: JavaScript breakpoint doesn't match SCSS media query

**Cause**: Modified SCSS `$breakpoints-max` but not updated JavaScript defaults

**Solution**: Override `window.breakpoints` or ensure CSS encoding working

```javascript
// Read from CSS (automatic if encoded)
const breaks = breakpoints(window); // Reads from window.breakpoints or CSS
```

### Electron Detection False Positive

**Problem**: `isElectronWindow()` returns `true` in unusual environments

**Cause**: Some environments add `window.process` object (e.g., Webpack dev server)

**Solution**: Check more specific properties:

```javascript
const isElectron =
    isElectronWindow(window) && window.process.type === 'renderer';
```

### useWindowSize Returns Stale Scroll Position

**Problem**: `scrollX`/`scrollY` don't update on scroll

**Cause**: Scroll event listener only attached if `hasWindow` true

**Solution**: Ensure component mounted before scrolling, or check return value includes scroll properties

---

## Integration with Other Systems

### Zone System

Zones can render different components based on breakpoint:

```javascript
Reactium.Zone.addFilter('my-zone', Enums.priority.highest, (components) => {
    const { breakpoint } = useWindowSize();

    if (breakpoint === 'xs' || breakpoint === 'sm') {
        return components.filter((c) => c.mobile !== false);
    }

    return components;
});
```

### Handle System

Export breakpoint via Handle for cross-component access:

```javascript
const MyComponent = () => {
    const { breakpoint } = useWindowSize();

    useRegisterHandle('AppBreakpoint', () => ({
        breakpoint,
        isMobile: ['xs', 'sm'].includes(breakpoint),
        isTablet: breakpoint === 'md',
        isDesktop: ['lg', 'xl'].includes(breakpoint),
    }));

    return <div>Current: {breakpoint}</div>;
};

// Other components
const OtherComponent = () => {
    const { breakpoint, isMobile } = useHandle('AppBreakpoint');
    return isMobile ? <MobileView /> : <DesktopView />;
};
```

### Routing System

Set route-specific breakpoint behavior:

```javascript
export default {
    path: ['/dashboard'],
    component: 'Dashboard',
    load: async (params, search) => {
        const { breakpoint } = await import(
            '@atomic-reactor/reactium-core/sdk'
        ).then((m) => m.useWindowSize());

        if (breakpoint === 'xs' || breakpoint === 'sm') {
            return { layout: 'mobile' };
        }

        return { layout: 'desktop' };
    },
};
```

---

## Debugging Techniques

### Log Current Breakpoint

```javascript
const { width, breakpoint } = useWindowSize();
console.log(`Width: ${width}px → Breakpoint: ${breakpoint}`);
```

### Inspect Breakpoint Thresholds

```javascript
import { breakpoints } from '@atomic-reactor/reactium-core/sdk';

console.log('Breakpoints:', breakpoints(window));
// Output: { xs: 640, sm: 990, md: 1280, lg: 1440, xl: 1600 }
```

### Test Breakpoint Calculation

```javascript
import { breakpoint } from '@atomic-reactor/reactium-core/sdk';

[500, 640, 990, 1280, 1440, 1600, 2000].forEach((w) => {
    console.log(`${w}px → ${breakpoint(w)}`);
});
```

### Verify SSR Safety

```javascript
// Run on server
const window = conditionalWindow();
console.log('Window exists:', window !== undefined); // false on server
```

---

## Comparison with Alternatives

| Feature                 | Reactium Window/Breakpoint | CSS Media Queries | matchMedia API   | window-size lib    |
| ----------------------- | -------------------------- | ----------------- | ---------------- | ------------------ |
| **SSR Safe**            | ✅ Yes                     | ✅ Yes            | ❌ No            | ❌ No              |
| **React Hooks**         | ✅ Yes                     | ❌ No             | ⚠️ Manual        | ⚠️ Manual          |
| **SCSS Integration**    | ✅ Yes                     | ✅ Yes            | ❌ No            | ❌ No              |
| **Breakpoint Names**    | ✅ Yes                     | ⚠️ Custom         | ⚠️ Manual        | ❌ No              |
| **Debounce Built-in**   | ✅ Yes                     | N/A               | ❌ No            | ⚠️ Sometimes       |
| **Electron Detection**  | ✅ Yes                     | ❌ No             | ❌ No            | ❌ No              |
| **Frame Context Aware** | ✅ Yes                     | ✅ Yes            | ⚠️ Requires work | ❌ No              |
| **Performance**         | ✅ Debounced               | ✅ Native         | ✅ Good          | ⚠️ Varies          |

**Use Reactium Window/Breakpoint when:** Building Reactium apps, need SSR safety, want SCSS sync

**Use CSS Media Queries when:** Pure styling, no JavaScript logic needed

**Use matchMedia API when:** Need more control, non-React context

---

## Summary

The Reactium Window and Breakpoint system provides:

- ✅ **SSR-Safe Accessors** - `conditionalWindow()`, `conditionalDocument()`, `isWindow()`
- ✅ **Breakpoint System** - Matches SCSS `$breakpoints-max` configuration
- ✅ **React Hooks** - `useWindow()`, `useDocument()`, `useBreakpoints()`, `useBreakpoint()`, `useWindowSize()`
- ✅ **Responsive Utilities** - Binary search breakpoint calculation, debounced resize handling
- ✅ **Electron Detection** - `isElectronWindow()` for cross-platform apps
- ✅ **WindowProvider Context** - Frame/toolkit support for sandboxed components
- ✅ **SCSS Integration** - Single source of truth for breakpoint values

**Critical for:** Responsive design, SSR-safe window access, adaptive component rendering, cross-platform support, Reactium Toolkit development

**Comprehensive source references**: `reactium-sdk-core/src/browser/window.ts:1-70`, `reactium-core/sdk/named-exports/window.js:1-221`
