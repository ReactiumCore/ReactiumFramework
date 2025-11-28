<!-- v1.0.0 -->

# Reactium Utility Helpers: cxFactory and SplitParts

**Complete guide to two essential Reactium utility helpers for component styling and template string processing**

## Overview

Reactium provides two specialized utility helpers that simplify common development patterns:

1. **cxFactory** - Namespace-based classname generation for consistent BEM-style component styling
2. **SplitParts** - Token-based string template system for dynamic content substitution

Both utilities are exposed via the Reactium SDK and widely used throughout the framework's core plugins.

**Source References:**
- `reactium-sdk-core/src/browser/classnames.ts:1-21` (cxFactory)
- `reactium-sdk-core/src/browser/splitter.ts:1-163` (SplitParts)

---

## cxFactory - Namespaced Classname Generation

### Architecture

**Purpose**: Creates a factory function that automatically prefixes all CSS classnames with a component namespace, enabling consistent BEM-style naming without repetitive string concatenation.

**Integration**: Wraps the popular `classnames` NPM package with automatic namespace prefixing.

**Pattern**: Factory function returns a configured classname generator bound to a specific namespace.

### API

```typescript
const cxFactory = (namespace: string) => (...params: ArgumentArray) => string
```

**Parameters:**
- `namespace` (string) - The prefix to apply to all generated classnames

**Returns:** Function that accepts `classnames` library arguments and returns namespaced class string

**Accessed via:** `Reactium.Utils.cxFactory(namespace)`

### How It Works

1. Accepts a namespace string (e.g., `'admin-sidebar'`)
2. Returns a function that wraps `classnames` library
3. Generated classnames are split on spaces
4. Each classname is prefixed with `{namespace}-{classname}`
5. Empty namespaces or classnames are compacted (ignored)
6. Final string is space-separated classnames

**Source Implementation** (`reactium-sdk-core/src/browser/classnames.ts:14-20`):
```typescript
export const cxFactory =
    (namespace: string) =>
    (...params: ArgumentArray) =>
        cn(...params)
            .split(' ')
            .map((cls) => _.compact([namespace, cls]).join('-'))
            .join(' ');
```

### Usage Patterns

#### Basic Component Namespace

```javascript
import Reactium from '@atomic-reactor/reactium-core/sdk';

const MyComponent = ({ namespace = 'my-component' }) => {
    const cx = Reactium.Utils.cxFactory(namespace);

    return (
        <div className={cx()}>              {/* 'my-component' */}
            <header className={cx('header')}> {/* 'my-component-header' */}
                <h1 className={cx('title')}>  {/* 'my-component-title' */}
                    Hello World
                </h1>
            </header>
        </div>
    );
};
```

#### Integration with classnames Library

The returned `cx` function accepts all `classnames` library patterns:

```javascript
const cx = Reactium.Utils.cxFactory('sidebar');

// Conditional classes
cx('menu', { active: isActive, collapsed: !isExpanded });
// → 'sidebar-menu sidebar-active' (if isActive=true, isExpanded=true)

// Array syntax
cx(['header', 'primary']);
// → 'sidebar-header sidebar-primary'

// Mixed syntax
cx('container', { hidden: !visible }, ['flex', 'column']);
// → 'sidebar-container sidebar-flex sidebar-column' (if visible=true)
```

#### Real-World: AdminSidebar Component

From `reactium-admin-core/Sidebar/index.js:46-169`:

```javascript
let AdminSidebar = ({ namespace, ...props }) => {
    const cx = Reactium.Utils.cxFactory(namespace); // namespace = 'admin-sidebar'

    const [status, setStatus, isStatus] = useStatus('expanded');

    return (
        <>
            <div className={cn(cx('spacer'), status)}>
                {/* 'admin-sidebar-spacer expanded' */}
            </div>
            <div className={cn(cx(), status)}>
                {/* 'admin-sidebar expanded' */}
                <div className={cx('container')}>
                    {/* 'admin-sidebar-container' */}
                    <div className={cx('header')}>
                        {/* 'admin-sidebar-header' */}
                        <Zone zone="admin-sidebar-header" />
                    </div>
                    <div className={cx('menu')}>
                        {/* 'admin-sidebar-menu' */}
                        <Zone zone="admin-sidebar-menu" />
                    </div>
                    <div className={cx('footer')}>
                        {/* 'admin-sidebar-footer' */}
                        <Zone zone="admin-sidebar-footer" />
                    </div>
                </div>
            </div>
        </>
    );
};
```

#### Real-World: Dashboard Component

From `reactium-admin-core/Dashboard/index.js:30-48`:

```javascript
let Dashboard = (props) => {
    const { title, namespace } = props; // namespace = 'admin-dashboard'
    const cx = Reactium.Utils.cxFactory(namespace);

    return (
        <div className={cx()}>  {/* 'admin-dashboard' */}
            <Helmet>
                <title>{title}</title>
            </Helmet>
            {Reactium.Dashboard.list.map(({ id, component: Component }) => (
                <Component
                    key={id}
                    id={id}
                    cx={cx}  // Pass cx factory to child components
                    data={data}
                    setData={setData}
                />
            ))}
        </div>
    );
};
```

#### Real-World: Body Class Management

From `reactium-admin-core/Sidebar/index.js:125-136`:

```javascript
useEffect(() => {
    if (typeof window === 'undefined') return;
    const body = _.first(document.getElementsByTagName('BODY'));

    if (isCollapsed()) {
        body.classList.add(cx('collapsed'));    // 'admin-sidebar-collapsed'
        body.classList.remove(cx('expanded'));
    } else {
        body.classList.add(cx('expanded'));     // 'admin-sidebar-expanded'
        body.classList.remove(cx('collapsed'));
    }
});
```

### Best Practices

1. **Consistent Namespace Convention**: Use lowercase kebab-case (e.g., `'admin-sidebar'`, `'content-editor'`)

2. **Pass cx to Child Components**: For sub-components, pass the `cx` function as a prop:
   ```javascript
   <ChildComponent cx={cx} />
   ```

3. **BEM-Style Element Naming**: Use element descriptors without block prefix:
   ```javascript
   cx('header')  // ✓ 'my-component-header'
   cx('my-component-header')  // ✗ 'my-component-my-component-header'
   ```

4. **Combine with External Classes**: Use `classnames` (`cn`) for mixing namespaced and external classes:
   ```javascript
   import cn from 'classnames';

   <div className={cn(cx('container'), 'third-party-class', status)}>
   ```

5. **Pass Namespace via Props**: Allow namespace override for theming/testing:
   ```javascript
   const MyComponent = ({ namespace = 'my-component', ...props }) => {
       const cx = Reactium.Utils.cxFactory(namespace);
   }
   ```

### Common Gotchas

1. **Empty String Returns Namespace**: `cx()` with no arguments returns just the namespace:
   ```javascript
   const cx = Reactium.Utils.cxFactory('sidebar');
   cx() // → 'sidebar' (not empty string!)
   ```

2. **Double Namespacing**: Don't include namespace in classname strings:
   ```javascript
   const cx = Reactium.Utils.cxFactory('nav');
   cx('nav-item')  // ✗ 'nav-nav-item'
   cx('item')      // ✓ 'nav-item'
   ```

3. **Spaces Create Multiple Prefixed Classes**: Space-separated strings get individual prefixes:
   ```javascript
   cx('header title') // → 'my-component-header my-component-title'
   ```

4. **Not Reactive to Namespace Changes**: Create new `cx` if namespace changes:
   ```javascript
   // In component body, not in useEffect
   const cx = Reactium.Utils.cxFactory(namespace);
   ```

5. **Classnames Argument Types**: The `cx` function accepts same arguments as `classnames` library - strings, objects, arrays, or mixed.

---

## SplitParts - Token-Based String Templates

### Architecture

**Purpose**: Provides a class-based API for splitting strings with replacement tokens (`%key%`) and progressively substituting values, useful for dynamic internationalized strings or template-based content generation.

**Pattern**: Immutable-style builder pattern with method chaining.

**TypeScript Support**: Fully typed with generic support for key/value types.

### API

#### Constructor

```typescript
new SplitParts(original: string)
```

**Factory Function:**
```typescript
Reactium.Utils.splitParts(original: string): SplitParts
```

#### Methods

**`.replace<KeyType, ValType>(key: KeyType, value?: ValType): SplitParts`**
- Replaces all instances of `%key%` with `value`
- Supports object parameter for multiple replacements: `.replace({ key1: val1, key2: val2 })`
- Returns `this` for chaining

**`.reset(): SplitParts`**
- Resets parts to original string
- Returns `this` for chaining

**`.value(): Part[]`**
- Returns array of part objects with `{ key, value, type }` structure
- Type is `'part'` (unreplaced string) or `'replacement'` (substituted value)

**`.toString(): string`**
- Returns final string with all replacements applied
- Calls `.toString()` on non-string values
- Falls back to `[key]` for non-stringable values

#### Part Type

```typescript
type Part = {
    key: string;
    value: any;
    type: 'part' | 'replacement';
};
```

### How It Works

1. Original string stored with replacement tokens (`%email%`, `%username%`, etc.)
2. `.replace(key, value)` finds all `%key%` instances
3. String is split into array of `Part` objects (unreplaced strings + replacement objects)
4. Multiple `.replace()` calls progressively split the string further
5. `.toString()` reassembles the final string with all replacements
6. `.value()` provides structured access to parts for custom rendering (e.g., React components)

**Internal Algorithm** (`reactium-sdk-core/src/browser/splitter.ts:3-45`):
- Uses regex `/%(key)%/g` to find tokens
- Replaces with delimiter `|FOUND_IT|` to mark split points
- Splits on `|` and maps to Part objects or strings
- Recursively processes arrays for nested replacements
- Flattens results with `_.flatten()`

### Usage Patterns

#### Basic String Replacement

```javascript
import Reactium from '@atomic-reactor/reactium-core/sdk';

const template = Reactium.Utils.splitParts('Hello %name%, your email is %email%');

template
    .replace('name', 'John Doe')
    .replace('email', 'john@example.com');

console.log(template.toString());
// → 'Hello John Doe, your email is john@example.com'
```

#### Object-Based Multiple Replacements

```javascript
const template = Reactium.Utils.splitParts(
    'User %username% (ID: %userId%) logged in at %timestamp%'
);

template.replace({
    username: 'alice',
    userId: 42,
    timestamp: new Date().toISOString(),
});

console.log(template.toString());
// → 'User alice (ID: 42) logged in at 2025-11-28T10:30:00.000Z'
```

#### Reset and Reuse

```javascript
const template = Reactium.Utils.splitParts('Hello %name%');

template.replace('name', 'Alice');
console.log(template.toString()); // → 'Hello Alice'

template.reset().replace('name', 'Bob');
console.log(template.toString()); // → 'Hello Bob'
```

#### React Component Integration

```javascript
const template = Reactium.Utils.splitParts('Click %link% to continue');

template.replace('link', <a href="/next">here</a>);

// Use .value() to get parts for rendering
const parts = template.value();

return (
    <p>
        {parts.map(({ key, value, type }, index) => (
            <React.Fragment key={index}>
                {type === 'replacement' ? value : value}
            </React.Fragment>
        ))}
    </p>
);
// Renders: Click <a href="/next">here</a> to continue
```

#### Real-World: Activity Log Messages

From `reactium-admin-content/Content/ActivityLog/ActivityUpdates.js:30-82`:

```javascript
const getDescriptionParts = (who, changeType, meta) => {
    // Get internationalized template string
    const parts = Reactium.Utils.splitParts(
        op.get(
            ENUMS.CHANGES,
            [changeType, scope],
            ENUMS.CHANGES.DEFAULT[scope],
        ),
    );

    // Template: '%type% %slug% revised by %who%. Version %version%'

    switch (changeType) {
        case 'REVISED':
        case 'CREATED_BRANCH':
        case 'SET_REVISION': {
            const { branch, revision } = op.get(meta, 'history');
            const label = op.get(meta, 'branch.label', branch);
            const rev = revision !== undefined ? ` v${revision + 1}` : '';
            const version = `${label}${rev}`;
            parts.replace('version', version); // Dynamic version string
            break;
        }
        case 'SET_STATUS': {
            parts.replace('status', op.get(meta, 'status', ''));
            break;
        }
        case 'SLUG_CHANGED': {
            parts.replace('originalSlug', op.get(meta, 'originalSlug', ''));
            break;
        }
    }

    // Common replacements
    parts.replace('who', who ? who : __('Unknown'));
    parts.replace('slug', op.get(meta, 'slug', ''));
    parts.replace('type', op.get(meta, 'type.objectId'));

    return parts.value(); // Return parts array for rendering
};
```

**Template Strings** (`reactium-admin-content/Content/ActivityLog/enums.js:5-49`):
```javascript
export default {
    CHANGES: {
        DEFAULT: {
            general: __('Change %changetype% to %slug% made by %who%'),
            specific: __('Change %changetype% made by %who%'),
        },
        CREATED: {
            general: __('%type% %slug% created by %who%'),
            specific: __('Created by %who%'),
        },
        REVISED: {
            general: __('%type% %slug% revised by %who%. Version %version%'),
            specific: __('Revised by %who%. Version %version%'),
        },
        SLUG_CHANGED: {
            general: __('%type% %originalSlug% slug changed to %slug% by %who%'),
            specific: __('Slug changed to %slug% by %who%'),
        },
        SET_STATUS: {
            general: __('%who% set status to %status% on %type% %slug%'),
            specific: __('%who% set status'),
        },
    },
};
```

### Best Practices

1. **Use for Internationalized Templates**: Perfect for i18n strings with dynamic values:
   ```javascript
   const msg = Reactium.Utils.splitParts(__('Welcome %username%, you have %count% messages'));
   msg.replace({ username: user.name, count: user.messageCount });
   ```

2. **React Component Tokens**: Use `.value()` to render mixed content (text + components):
   ```javascript
   parts.replace('link', <Link to="/docs">documentation</Link>);
   return <p>{parts.value().map(({ value }, i) => <Fragment key={i}>{value}</Fragment>)}</p>;
   ```

3. **Preserve Original for Reuse**: Original template is immutable, store SplitParts instance:
   ```javascript
   const EMAIL_TEMPLATE = Reactium.Utils.splitParts('Hi %name%, your code is %code%');

   // Reuse for multiple emails
   users.forEach(user => {
       const email = EMAIL_TEMPLATE.reset().replace({
           name: user.name,
           code: generateCode(),
       }).toString();
   });
   ```

4. **Handle Missing Values Gracefully**: Unreplaced tokens remain as-is:
   ```javascript
   const t = Reactium.Utils.splitParts('Hello %first% %last%');
   t.replace('first', 'John');
   t.toString(); // → 'Hello John %last%'
   ```

5. **Type-Safe with TypeScript**: Use generics for type safety:
   ```typescript
   interface UserData {
       username: string;
       email: string;
   }

   const parts = new SplitParts('User: %username% (%email%)');
   parts.replace<keyof UserData, string>('username', 'alice');
   ```

### Common Gotchas

1. **Token Format Must Be Exact**: Only `%key%` syntax works (case-sensitive):
   ```javascript
   parts.replace('name', 'Alice');
   'Hello %name%'  // ✓ Replaced
   'Hello %Name%'  // ✗ Not replaced (case mismatch)
   'Hello {name}'  // ✗ Not replaced (wrong syntax)
   ```

2. **Tokens Not in Original String**: Silent no-op if key doesn't exist:
   ```javascript
   const t = Reactium.Utils.splitParts('Hello %name%');
   t.replace('username', 'Alice'); // No effect
   t.toString(); // → 'Hello %name%' (unchanged)
   ```

3. **Replace Mutates Parts Array**: Each `.replace()` modifies internal state:
   ```javascript
   const t = Reactium.Utils.splitParts('Hello %name%');
   t.replace('name', 'Alice');
   t.replace('name', 'Bob'); // Replaces 'Alice' with 'Bob' in parts
   t.toString(); // → 'Hello Bob' (last replacement wins)
   ```

4. **Non-String Values Need toString()**: Objects without `toString()` show as `[key]`:
   ```javascript
   parts.replace('obj', { foo: 'bar' }); // Calls obj.toString() → '[object Object]'
   parts.replace('arr', [1, 2, 3]);      // Calls arr.toString() → '1,2,3'
   ```

5. **Partial Matches Not Supported**: Only exact `%key%` tokens are replaced:
   ```javascript
   'Hello %user.name%' // ✗ Can't use object paths
   'Hello %name%'      // ✓ Simple key only
   ```

6. **React Component Values**: When using components as values, use `.value()` not `.toString()`:
   ```javascript
   parts.replace('link', <Link to="/home">Home</Link>);

   // ✗ parts.toString() → calls React.toString() → '[object Object]'
   // ✓ parts.value() → returns array with component in it
   ```

---

## Comparison with Alternatives

### cxFactory vs Manual String Concatenation

**cxFactory:**
```javascript
const cx = Reactium.Utils.cxFactory('nav');
<div className={cx('item', { active })}>  // 'nav-item nav-active'
```

**Manual:**
```javascript
<div className={cn('nav-item', { 'nav-active': active })}>  // Repetitive 'nav-' prefix
```

**Advantage**: Automatic prefix consistency, less typing, easier to change namespace.

### cxFactory vs CSS Modules

**cxFactory** is complementary to CSS Modules, not a replacement:

- **CSS Modules**: Handles scope isolation via build-time transformation
- **cxFactory**: Handles runtime classname generation with namespace consistency

You can combine both:
```javascript
import styles from './MyComponent.module.scss';
const cx = Reactium.Utils.cxFactory('my-component');

<div className={cn(cx('wrapper'), styles.wrapper)}>
```

### SplitParts vs Template Literals

**SplitParts:**
```javascript
const t = Reactium.Utils.splitParts('Hello %name%, you have %count% messages');
t.replace({ name: user.name, count: user.messageCount });
```

**Template Literals:**
```javascript
const t = `Hello ${user.name}, you have ${user.messageCount} messages`;
```

**Advantages of SplitParts:**
- Works with internationalized strings (i18n systems return strings, not template literals)
- Reusable templates (original preserved, can reset and reuse)
- Structured access to parts (`.value()` for React rendering)
- Progressive replacement (can replace keys conditionally)

**When to use Template Literals:**
- Simple, one-time string generation
- Values known at template creation time
- No i18n requirements

### SplitParts vs Handlebars/Mustache

**SplitParts** is simpler and runtime-focused:

- **No compilation step**: SplitParts is pure runtime JavaScript
- **No template logic**: No conditionals, loops, or helpers
- **Smaller API surface**: Just split and replace
- **React-friendly**: `.value()` returns array compatible with JSX

**When to use Handlebars:**
- Complex templates with conditionals/loops
- Server-side template rendering
- Full-featured template engine needs

**When to use SplitParts:**
- Simple token replacement in UI strings
- Internationalized content with dynamic values
- Mixed text/React component content

---

## Integration with Reactium Framework

### SDK Access

Both utilities are exposed via the Reactium SDK:

```javascript
import Reactium from '@atomic-reactor/reactium-core/sdk';

// cxFactory
const cx = Reactium.Utils.cxFactory('my-namespace');

// SplitParts
const parts = Reactium.Utils.splitParts('Template string with %tokens%');
```

### Common Integration Patterns

#### Component + Handle Pattern

```javascript
const MyComponent = ({ namespace = 'my-component' }) => {
    const cx = Reactium.Utils.cxFactory(namespace);

    const handle = useRegisterHandle('MyComponent', () => ({
        cx,  // Expose cx in handle for external styling
        container: refs.get('container'),
    }), []);

    return <div className={cx()} ref={el => refs.set('container', el)} />;
};
```

#### Internationalization + SplitParts

```javascript
import { __ } from '@atomic-reactor/reactium-core/sdk';

const WelcomeMessage = ({ user }) => {
    const template = Reactium.Utils.splitParts(
        __('Welcome back, %username%! Last login: %lastLogin%')
    );

    template.replace({
        username: user.name,
        lastLogin: moment(user.lastLogin).fromNow(),
    });

    return <p>{template.toString()}</p>;
};
```

---

## TypeScript Support

### cxFactory Types

```typescript
import { ArgumentArray } from 'classnames';

const cxFactory: (namespace: string) => (...params: ArgumentArray) => string;
```

**ArgumentArray** accepts:
- Strings: `'class1'`, `'class2'`
- Objects: `{ active: true, disabled: false }`
- Arrays: `['class1', 'class2']`
- Mixed: `'base', { active }, ['extra', 'classes']`

### SplitParts Types

```typescript
class SplitParts {
    constructor(strVal: string);

    replace<KeyType = string | object, ValType = any>(
        key: KeyType,
        value?: ValType
    ): SplitParts;

    reset(): SplitParts;
    value(): Part[];
    toString(): string;

    get original(): string;
    set original(strVal: string);
}

type Part = {
    key: string;
    value: any;
    type: 'part' | 'replacement';
};

const splitParts: (original: string) => SplitParts;
```

---

## Summary

### cxFactory

**Use when:**
- Building reusable components with consistent BEM-style naming
- Need automatic namespace prefixing for CSS classes
- Want to leverage `classnames` library with less repetition
- Building component libraries or design systems

**Don't use when:**
- Simple one-off components with 1-2 classes
- Using CSS-in-JS solutions that handle scoping (styled-components, emotion)
- Classnames don't need namespace consistency

### SplitParts

**Use when:**
- Internationalized strings with dynamic token replacement
- Templates need to be reusable with different values
- Rendering mixed text + React components
- Need structured access to template parts

**Don't use when:**
- Simple one-time string interpolation (use template literals)
- Complex template logic needed (use Handlebars/Mustache)
- Server-side template rendering (use template engines)

Both utilities are lightweight, focused tools that solve specific problems elegantly. They complement each other and integrate seamlessly with Reactium's component-based architecture.
