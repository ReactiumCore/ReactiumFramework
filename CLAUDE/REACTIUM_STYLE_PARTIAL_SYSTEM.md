<!-- v1.0.0 -->

# Reactium Style Partial System (Gulp)

**Purpose**: Registry-based SCSS partial discovery and aggregation system with priority-based compilation order following Atomic Design principles.

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:559-770`

## Overview

The Style Partial System automatically discovers `_reactium-style*.scss` files throughout your project, sorts them by priority (following Atomic Design hierarchy), and aggregates them into a single import file (`_modules.scss`) for Sass compilation.

**Key Benefits**:
- **Auto-discovery**: No manual imports required
- **Priority-based**: VARIABLES → MIXINS → BASE → ATOMS → MOLECULES → ORGANISMS → OVERRIDES
- **Hook-extensible**: Plugins can register custom patterns and priorities
- **Workspace-aware**: Handles `reactium_modules/` with special import syntax

## Priority Levels (Enums.style)

```javascript
// Source: Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.bootup.js:15-23
ReactiumGulp.Enums.style = {
    MIXINS: -1000,      // Compile first (Sass mixins must be defined before use)
    VARIABLES: -900,    // Compile second (variables used throughout)
    BASE: -800,         // Compile third (base styles, resets)
    ATOMS: 0,           // Atomic Design: smallest components
    MOLECULES: 800,     // Atomic Design: simple component groups
    ORGANISMS: 900,     // Atomic Design: complex components
    OVERRIDES: 1000,    // Compile last (final overrides)
};
```

**Lower numbers = compiled earlier** (same as Hook priority system).

## Naming Patterns

### Core Patterns (Pre-Registered)

**Two naming conventions supported**:

1. **Directory-based** (classic):
   ```
   src/app/
   ├── variables/
   │   └── _reactium-style.scss        # Enums.style.VARIABLES
   ├── mixins/
   │   └── _reactium-style.scss        # Enums.style.MIXINS
   ├── base/
   │   └── _reactium-style.scss        # Enums.style.BASE
   ├── atoms/
   │   └── _reactium-style.scss        # Enums.style.ATOMS
   ├── molecules/
   │   └── _reactium-style.scss        # Enums.style.MOLECULES
   ├── organisms/
   │   └── _reactium-style.scss        # Enums.style.ORGANISMS
   └── overrides/
       └── _reactium-style.scss        # Enums.style.OVERRIDES
   ```

2. **DDD-based** (component-colocated):
   ```
   src/app/components/
   ├── Button/
   │   ├── Button.jsx
   │   └── _reactium-style-atoms.scss      # Enums.style.ATOMS
   ├── Card/
   │   ├── Card.jsx
   │   └── _reactium-style-molecules.scss  # Enums.style.MOLECULES
   └── Header/
       ├── Header.jsx
       └── _reactium-style-organisms.scss  # Enums.style.ORGANISMS
   ```

**Supported suffixes**: `atoms`, `atom`, `molecules`, `molecule`, `organisms`, `organism`, `mixins`, `mixin`, `variables`, `variable`, `base`, `overrides`, `override`

### Pre-Registered Patterns

```javascript
// Source: Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/gulp.tasks.js:560-642
const sassPartialPreRegistrations = SassPartial => {
    // Directory-based patterns
    SassPartial.register('mixins-dir', {
        pattern: /mixins?\/_reactium-style/,
        exclude: false,
        priority: Enums.style.MIXINS,
    });

    // DDD patterns
    SassPartial.register('mixins-ddd', {
        pattern: /_reactium-style-mixins?/,
        exclude: false,
        priority: Enums.style.MIXINS,
    });

    // ... similar patterns for VARIABLES, BASE, ATOMS, MOLECULES, ORGANISMS, OVERRIDES
};
```

**Full pattern list** (12 pre-registered):
- `mixins-dir`, `mixins-ddd`
- `variables-dir`, `variables-ddd`
- `base-dir`, `base-ddd`
- `atoms-dir`, `atoms-ddd`
- `molecules-dir`, `molecules-ddd`
- `organisms-dir`, `organisms-ddd`
- `overrides-dir`, `overrides-ddd`

## File Discovery Process

### 1. SassPartialRegistry Creation

```javascript
// Source: gulp.tasks.js:646-650
const SassPartialRegistry = registryFactory(
    'SassPartialRegistry',
    'id',
    Registry.MODES.CLEAN,
);
```

Uses Registry pattern (same as Routing, Webpack, etc.)

### 2. Pre-Registration + Hook Extension

```javascript
// Source: gulp.tasks.js:652-653
sassPartialPreRegistrations(SassPartialRegistry);
Hook.runSync('ddd-styles-partial', SassPartialRegistry);
```

**Hook**: `ddd-styles-partial`
- **When**: During Gulp `styles:partials` task
- **Purpose**: Plugins can register custom patterns
- **Arguments**: `SassPartialRegistry`

### 3. Glob Pattern Collection

```javascript
// Source: gulp.tasks.js:664-666
const styleDDD = [config.src.styleDDD];
Hook.runSync('ddd-styles-partial-glob', styleDDD);
```

**Hook**: `ddd-styles-partial-glob`
- **When**: After pattern registration
- **Purpose**: Plugins can add custom glob paths
- **Arguments**: `styleDDD` (array of glob patterns)
- **Default**: `['src/**/_reactium-style*.scss']`

### 4. File Discovery

```javascript
// Source: gulp.tasks.js:668-695
const stylePartials = globby
    .sync(_.flatten(styleDDD))
    .map(partial => {
        // Transform reactium_modules/ paths to use '+' prefix
        if (/^reactium_modules\//.test(partial)) {
            return partial.replace('reactium_modules/', '+');
        }

        // Make relative to output directory
        return path
            .relative(
                path.dirname(config.dest.modulesPartial),
                path.resolve(rootPath, partial),
            )
            .split(/[\\\/]/g)
            .join(path.posix.sep);
    })
    .map(partial => partial.replace(/\.scss$/, ''))
    .map(partial => {
        // Match against registered patterns
        const match =
            SassPartialRegistry.list.find(({ pattern }) =>
                pattern.test(partial),
            ) || {};
        return {
            partial,
            match,
            output: op.get(match, 'output', config.dest.modulesPartial),
        };
    })
    .filter(({ match }) => !op.get(match, 'exclude', false));
```

**Path transformation for workspace modules**:
```
reactium_modules/@scope/package/styles/_reactium-style-atoms.scss
→ +@scope/package/styles/_reactium-style-atoms
```

The `+` prefix is required by `@atomic-reactor/node-sass-reactium-importer` to resolve workspace imports.

### 5. Multi-Level Sorting

```javascript
// Source: gulp.tasks.js:700-746
const stylePartials = partials
    // Sort by directory basename (alphabetical)
    .sort(({ partial: a }, { partial: b }) => {
        const aBase = path.basename(path.dirname(a)).toLocaleLowerCase();
        const bBase = path.basename(path.dirname(b)).toLocaleLowerCase();
        if (aBase > bBase) return 1;
        if (aBase < bBase) return -1;
        return 0;
    })
    // Sort by file basename (alphabetical)
    .sort(({ partial: a }, { partial: b }) => {
        const aBase = path.basename(a).toLocaleLowerCase();
        const bBase = path.basename(b).toLocaleLowerCase();
        if (aBase > bBase) return 1;
        if (aBase < bBase) return -1;
        return 0;
    })
    // Sort by numbers in basename (numeric)
    .sort(({ partial: a }, { partial: b }) => {
        const aBase = path.basename(a).toLocaleLowerCase();
        const bBase = path.basename(b).toLocaleLowerCase();
        const aNumber = aBase.match(/(\d+)/) || 0;
        const bNumber = bBase.match(/(\d+)/) || 0;
        if (aNumber > bNumber) return 1;
        if (aNumber < bNumber) return -1;
        return 0;
    })
    // Sort by priority (FINAL SORT)
    .sort(({ match: a }, { match: b }) => {
        const aPriority = op.get(a, 'priority', Enums.style.ORGANISMS);
        const bPriority = op.get(b, 'priority', Enums.style.ORGANISMS);

        if (aPriority > bPriority) return 1;
        else if (bPriority > aPriority) return -1;
        return 0;
    });
```

**Sort order** (applied sequentially):
1. Directory basename (alphabetical)
2. File basename (alphabetical)
3. Numeric prefix in filename
4. **Priority level** (FINAL - determines compilation order)

### 6. Template Generation

```javascript
// Source: gulp.tasks.js:655-762
const template = handlebars.compile(`
// WARNING: Do not directly edit this file !!!!
// File generated by gulp styles:partials task

{{#each this}}
@import '{{ this }}';
{{/each}}
`);

// Generate _modules.scss
const newPartial = template(
    stylePartials.map(({ partial }) => partial),
);

fs.writeFileSync(output, newPartial, 'utf8');
```

**Output**: `src/assets/style/_modules.scss` (default)

**Example**:
```scss
// WARNING: Do not directly edit this file !!!!
// File generated by gulp styles:partials task

@import '../../../variables/_reactium-style';
@import '+@atomic-reactor/reactium-core/theme/variables';
@import '../../../mixins/_reactium-style';
@import '+@atomic-reactor/reactium-core/theme/mixins';
@import '../../../base/_reactium-style';
@import '../../../components/Button/_reactium-style-atoms';
@import '+@my-plugin/components/Alert/_reactium-style-atoms';
@import '../../../components/Card/_reactium-style-molecules';
@import '../../../components/Header/_reactium-style-organisms';
@import '../../../overrides/_reactium-style';
```

## Real-World Usage

### Pattern 1: Component Styles (DDD)

```
src/app/components/Button/
├── Button.jsx
├── index.js
└── _reactium-style-atoms.scss
```

```scss
// _reactium-style-atoms.scss
.btn {
    display: inline-flex;
    padding: 0.5rem 1rem;
    border-radius: 4px;

    &--primary {
        background-color: $color-primary;
        color: white;
    }

    &--secondary {
        background-color: $color-secondary;
        color: white;
    }
}
```

**Auto-discovered**: Matches `/_reactium-style-atoms?/` pattern → `Enums.style.ATOMS` priority

### Pattern 2: Global Variables (Directory-Based)

```
src/app/variables/
└── _reactium-style.scss
```

```scss
// _reactium-style.scss
$color-primary: #007bff;
$color-secondary: #6c757d;
$color-success: #28a745;

$spacing-unit: 0.5rem;
$border-radius: 4px;
```

**Auto-discovered**: Matches `/variables?\/_reactium-style/` → `Enums.style.VARIABLES` priority

### Pattern 3: Plugin Styles

```
reactium_modules/@my-plugin/
└── styles/
    └── _reactium-style-organisms.scss
```

```scss
// _reactium-style-organisms.scss
.my-plugin-header {
    background: linear-gradient(90deg, $color-primary, $color-secondary);
    padding: $spacing-unit * 4;
}
```

**Auto-discovered**: Matches `/_reactium-style-organisms?/` → `Enums.style.ORGANISMS` priority
**Import path**: `+@my-plugin/styles/_reactium-style-organisms`

### Pattern 4: Custom Priority Registration

```javascript
// reactium-gulp.js
const { Hook, Enums } = ReactiumGulp;

Hook.register('ddd-styles-partial', SassPartial => {
    // Register custom pattern with specific priority
    SassPartial.register('custom-utilities', {
        pattern: /_reactium-style-utilities/,
        exclude: false,
        priority: Enums.style.OVERRIDES + 500, // After all overrides
    });
});
```

### Pattern 5: Excluding Files

```javascript
// reactium-gulp.js
Hook.register('ddd-styles-partial', SassPartial => {
    // Exclude test/demo styles from production
    SassPartial.register('exclude-demos', {
        pattern: /_reactium-style-demo/,
        exclude: true, // Won't be included in _modules.scss
        priority: Enums.style.ATOMS,
    });
});
```

### Pattern 6: Custom Output Location

```javascript
// reactium-gulp.js
Hook.register('ddd-styles-partial', SassPartial => {
    // Generate separate partial file for admin styles
    SassPartial.register('admin-styles', {
        pattern: /_reactium-style-admin/,
        exclude: false,
        priority: Enums.style.ORGANISMS,
        output: 'src/assets/admin/_admin-modules.scss', // Custom output
    });
});
```

## Compilation Workflow

### Full Build Process

```
1. gulp styles:partials
   ├── Create SassPartialRegistry
   ├── Pre-register patterns (12 default)
   ├── Fire 'ddd-styles-partial' hook (plugins register patterns)
   ├── Fire 'ddd-styles-partial-glob' hook (plugins add globs)
   ├── Discover files via globby
   ├── Transform paths (reactium_modules/ → +)
   ├── Match against registered patterns
   ├── Multi-level sort
   ├── Generate _modules.scss
   └── Write to disk

2. gulp styles
   ├── Compile _modules.scss with Sass
   ├── Apply autoprefixer
   ├── Generate sourcemaps (dev)
   ├── Minify with cleanCSS (production)
   └── Output to dist/
```

### Watch Mode

During `npm run local`:
```javascript
// Watches for _reactium-style*.scss changes
gulp.watch(
    config.watch.style,
    gulp.series('styles:partials', 'styles')
);
```

**Auto-regenerates** `_modules.scss` whenever you create/modify/delete `_reactium-style*.scss` files.

## Common Naming Conventions

### By Atomic Design Level

```
_reactium-style-atoms.scss        # Enums.style.ATOMS (0)
_reactium-style-molecules.scss    # Enums.style.MOLECULES (800)
_reactium-style-organisms.scss    # Enums.style.ORGANISMS (900)
```

### By Purpose

```
_reactium-style-variables.scss    # Enums.style.VARIABLES (-900)
_reactium-style-mixins.scss       # Enums.style.MIXINS (-1000)
_reactium-style-base.scss         # Enums.style.BASE (-800)
_reactium-style-overrides.scss    # Enums.style.OVERRIDES (1000)
```

### With Numeric Ordering

```
_reactium-style-01-reset.scss     # Numeric sort applied
_reactium-style-02-typography.scss
_reactium-style-03-layout.scss
```

Files with numbers are sorted numerically WITHIN their priority level.

## Best Practices

### ✅ DO

1. **Use descriptive suffixes** - Makes priority clear
   ```scss
   // Good
   _reactium-style-atoms.scss
   _reactium-style-molecules.scss

   // Bad (unclear priority)
   _reactium-style.scss
   _styles.scss
   ```

2. **Colocate with components** - DDD pattern
   ```
   MyComponent/
   ├── MyComponent.jsx
   └── _reactium-style-molecules.scss
   ```

3. **Use variables/mixins first** - Define before use
   ```scss
   // _reactium-style-variables.scss (compiled first)
   $btn-padding: 0.5rem 1rem;

   // _reactium-style-atoms.scss (compiled later)
   .btn {
       padding: $btn-padding;
   }
   ```

4. **Leverage priority levels** - Atomic Design hierarchy
   ```
   Atoms (0) → Molecules (800) → Organisms (900)
   ```

5. **Use numeric prefixes for order within level**
   ```
   _reactium-style-01-colors.scss
   _reactium-style-02-spacing.scss
   _reactium-style-03-typography.scss
   ```

### ❌ DON'T

1. **Don't edit _modules.scss manually** - Auto-generated, will be overwritten
   ```scss
   // BAD - Will be lost on next build
   // _modules.scss
   @import 'my-custom-import';
   ```

2. **Don't use wrong priority** - Breaks compilation order
   ```scss
   // BAD - Variables defined AFTER usage
   // _reactium-style-overrides.scss (priority: 1000)
   $color-primary: blue;

   // _reactium-style-atoms.scss (priority: 0)
   .btn { background: $color-primary; } // Error: undefined variable
   ```

3. **Don't use inconsistent naming** - Won't be discovered
   ```scss
   // BAD - Doesn't match any pattern
   _my-styles.scss
   _component-styles.scss

   // GOOD
   _reactium-style-atoms.scss
   ```

4. **Don't forget workspace prefix** - Manual imports break
   ```scss
   // BAD - Won't resolve
   @import '@my-plugin/styles/theme';

   // GOOD - Auto-generated uses '+'
   @import '+@my-plugin/styles/theme';
   ```

5. **Don't rely on alphabetical order across priorities**
   ```scss
   // BAD - Priority overrides alphabetical
   // _reactium-style-zebra.scss (priority: ATOMS = 0)
   // compiles BEFORE
   // _reactium-style-aardvark.scss (priority: OVERRIDES = 1000)
   ```

## Common Gotchas

### 1. Priority Confusion

**Issue**: Expecting alphabetical order, but priority wins.

```scss
// These compile in PRIORITY order, not alphabetical:
_reactium-style-overrides.scss    # Priority: 1000 (last)
_reactium-style-atoms.scss        # Priority: 0 (first)
```

**Solution**: Use correct suffix for desired compilation order.

### 2. Variables Not Available

**Issue**: Using variable before it's defined.

```scss
// _reactium-style-atoms.scss (priority: 0)
.btn { background: $color-primary; } // Error!

// _reactium-style-overrides.scss (priority: 1000)
$color-primary: blue; // Defined too late
```

**Solution**: Define variables with `VARIABLES` priority (-900).

### 3. Workspace Import Path Confusion

**Issue**: Manual imports use `@scope/package`, but auto-generated uses `+scope/package`.

```scss
// Manual import (WRONG)
@import '@my-plugin/styles/theme';

// Auto-generated (CORRECT)
@import '+@my-plugin/styles/_reactium-style-atoms';
```

**Solution**: Never manually import. Let system handle workspace paths.

### 4. File Not Discovered

**Issue**: File doesn't match any registered pattern.

```
MyComponent/_my-styles.scss  // Doesn't match /_reactium-style/
```

**Solution**: Use correct naming convention:
```
MyComponent/_reactium-style-molecules.scss
```

### 5. _modules.scss Out of Sync

**Issue**: Created new style file, but not imported.

**Cause**: `_modules.scss` not regenerated.

**Solution**: Run `gulp styles:partials` or wait for watch task to detect change.

### 6. Circular Imports

**Issue**: Two partials import each other.

**Cause**: Manual `@import` statements in partials.

**Solution**: Remove manual imports between `_reactium-style*.scss` files. They're all imported via `_modules.scss`.

## Debugging Techniques

### 1. Inspect Generated _modules.scss

```bash
cat src/assets/style/_modules.scss
```

Verify import order matches expectations.

### 2. Check Pattern Matching

```javascript
// reactium-gulp.js
Hook.register('ddd-styles-partial', SassPartial => {
    console.log('Registered patterns:', SassPartial.list);
});
```

### 3. List Discovered Files

```javascript
// In gulp.tasks.js (temporary debug)
console.log('Discovered style partials:', stylePartials.map(p => p.partial));
```

### 4. Verify Priority Values

```javascript
// reactium-gulp.js
const { Enums } = ReactiumGulp;
console.log('Style priorities:', Enums.style);
```

### 5. Force Regeneration

```bash
# Delete generated file and rebuild
rm src/assets/style/_modules.scss
gulp styles:partials
```

## Integration with Build System

### Entry Point

```scss
// src/assets/style/main.scss
@import 'variables';  // Your custom variables
@import 'modules';    // Auto-generated imports
@import 'overrides';  // Final overrides
```

### Sass Importer

Uses `@atomic-reactor/node-sass-reactium-importer` to resolve `+` prefix:

```javascript
// gulp.tasks.js
sass({
    importer: reactiumImporter(),
    // ...
})
```

**Resolves**:
```
+@scope/package/file  →  reactium_modules/@scope/package/file.scss
```

## Summary

**Reactium Style Partial System** provides:

- **Auto-discovery**: Files matching `_reactium-style*.scss` automatically included
- **Priority-based compilation**: VARIABLES → MIXINS → BASE → ATOMS → MOLECULES → ORGANISMS → OVERRIDES
- **Hook-extensible**: Plugins can register custom patterns via `ddd-styles-partial` hook
- **Workspace-aware**: Handles `reactium_modules/` with `+` prefix
- **Atomic Design integration**: Built-in priorities match design system hierarchy
- **DDD-compatible**: Component-colocated styles work seamlessly

**Use Cases**:
- Component-specific styles (DDD pattern)
- Global variables and mixins
- Plugin style injection
- Theme customization
- Priority-based override system

**Key Principle**: Let the system discover and order your styles. Use correct naming conventions and priorities instead of manual import management.

**Related Documentation**:
- [Registry System Architecture](REGISTRY_SYSTEM.md) - Foundation for SassPartialRegistry
- [Reactium Framework](REACTIUM_FRAMEWORK.md) - Build system overview
