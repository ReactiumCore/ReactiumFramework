<!-- v1.0.0 -->

# Reactium Internationalization (i18n) System

**Complete gettext-based translation architecture with webpack po-loader integration and Jed.js runtime**

## Overview

Reactium provides a complete internationalization (i18n) system based on the industry-standard **gettext** workflow. The system enables developers to wrap strings in translation functions (`__()` and `_n()`), extract them to `.pot` template files, translate them to locale-specific `.po` files, and load them at runtime via Jed.js.

**Key Components:**

1. **i18n Singleton** - Locale detection and Jed.js instance management
2. **Translation Functions** - `__()` for singular, `_n()` for plural forms
3. **Webpack po-loader** - Compiles `.po`/`.pot` files to JSON at build time
4. **CLI Extraction** - `npx reactium i18n` extracts translatable strings
5. **Locale Detection** - Browser-based automatic locale selection with fallback

**Complete Workflow:**

```
Developer wraps strings → Extract with CLI → Translate .po files →
Compile with webpack → Load at runtime → Render translated UI
```

**Source References:**
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/i18n/index.js:1-60` - i18n singleton
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/sdk/named-exports/i18n.js:1-48` - `__()` and `_n()` exports
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/webpack.config.js:70-81` - po-loader configuration
- `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/i18n/` - CLI extraction command
- `.gettext.json` - Extraction configuration

---

## i18n Singleton Class

### Architecture

**Purpose**: Manages locale detection, .po file loading, and Jed.js instance creation for gettext translation.

**Lifecycle**: Instantiated once at framework boot, accessible via `Reactium.i18n` (internal, not public API).

**Locale Detection**: Automatic browser locale detection with `en_US` fallback for SSR.

### Implementation

**Source**: `reactium-core/sdk/i18n/index.js:4-60`

```javascript
class i18n {
    locale = 'en_US';

    constructor() {
        this.setDefaultLocale();
    }

    async setDefaultLocale() {
        if (!isBrowserWindow()) {
            this.locale = 'en_US';  // SSR fallback
        } else {
            // Browser locale detection
            const langRaw = window.navigator.userLanguage || window.navigator.language;
            const [lang, location] = langRaw.replace('-', '_').split('_');
            this.locale = `${lang}_${location}`;  // e.g., 'es_ES', 'fr_FR'
        }

        return Hook.run('set-default-locale', this);
    }

    getStrings() {
        const defaultStrings = { strings: JSON.stringify({}) };

        try {
            if (isBrowserWindow()) {
                // Dynamic require.context for .po/.pot files
                const context = require.context(
                    'babel-loader!@atomic-reactor/webpack-po-loader!reactium-translations',
                    true,
                    /.pot?$/,
                );

                // Try locale-specific .po file first
                if (context.keys().find(translation => translation === `./${this.locale}.po`)) {
                    return context(`./${this.locale}.po`);
                }

                // Fallback to template.pot (untranslated strings)
                return context('./template.pot');
            } else {
                return defaultStrings;  // SSR returns empty
            }
        } catch (error) {
            return defaultStrings;  // Fallback on error
        }
    }

    getJed() {
        return new Jed(JSON.parse(this.getStrings().strings));
    }
}

export default new i18n();
```

### Key Mechanisms

**Locale Format**: Uses `{language}_{region}` format (e.g., `en_US`, `es_MX`, `fr_CA`)
- Derived from `navigator.language` (e.g., `'en-US'` → `'en_US'`)
- Hyphens replaced with underscores for gettext compatibility

**File Resolution**:
1. Check for locale-specific file: `{locale}.po` (e.g., `es_ES.po`)
2. Fallback to `template.pot` (untranslated original strings)
3. Return empty translations on error or SSR

**Webpack Integration**: `require.context()` with chained loaders:
- `babel-loader` - Transpiles if needed
- `@atomic-reactor/webpack-po-loader` - Converts `.po`/`.pot` to JSON
- `reactium-translations` - Directory alias (configured in webpack)

### Hook Integration

**`set-default-locale` Hook**

**Purpose**: Customize locale detection logic before Jed.js initialization.

**Signature**: `Hook.register('set-default-locale', async (i18nInstance) => { ... })`

**Use Cases**:
- Override locale from URL query param (`?locale=fr_FR`)
- Load locale from user preferences (`User.Pref.get('locale')`)
- Detect locale from subdomain (`fr.example.com` → `fr_FR`)
- Set locale from server-side session

**Example**:
```javascript
// Override locale from URL query param
Hook.register('set-default-locale', async (i18n) => {
    const urlParams = new URLSearchParams(window.location.search);
    const localeParam = urlParams.get('locale');

    if (localeParam) {
        i18n.locale = localeParam.replace('-', '_');
    }
});
```

---

## Translation Functions

### `__()` - Singular Translation

**Purpose**: Wraps string literals to mark them for translation extraction and runtime translation.

**API**:
```typescript
__(text: string): string
```

**Source**: `reactium-core/sdk/named-exports/i18n.js:21`

**Implementation**:
```javascript
export const __ = (...params) => i18n.getJed().gettext(...params);
```

**How It Works**:
1. Calls `i18n.getJed()` to get Jed.js instance
2. Calls `gettext(text)` method on Jed instance
3. Returns translated string if translation exists in loaded `.po` file
4. Returns original string if no translation found (graceful fallback)

**Usage**:
```javascript
import { __ } from '@atomic-reactor/reactium-core/sdk';

// JSX
<h1>{__('Welcome to Reactium')}</h1>

// String concatenation
const message = __('Hello') + ', ' + __('World');

// Template replacement (use SplitParts for tokens)
const template = Reactium.Utils.splitParts(__('Hello %name%'));
template.replace('name', 'Alice');
console.log(template.toString()); // → 'Hello Alice' (translated)
```

**Real-World Examples**:

From `Reactium-Admin-Plugins/src/app/components/plugin-src/reset/BigRed.js:14-60`:
```javascript
const title = __('Actinium Reset');

const showModal = () =>
    Modal.show(
        <ConfirmBox
            message={__('Are you sure? This is a destructive operation.')}
            onCancel={() => Modal.hide()}
            onConfirm={confirm}
            title={title}
        />
    );

return (
    <Dialog>
        <Button onClick={showModal}>
            {__('Reset Actinium')}
        </Button>
    </Dialog>
);
```

From `Reactium-Admin-Plugins/src/app/components/plugin-src/s3-adapter/Settings/index.js:5-61`:
```javascript
const settings = {
    title: __('S3 Adapter Settings'),
    group: 'S3Adapter',
    inputs: {
        'S3Adapter.bucket': {
            type: 'text',
            label: __('Bucket name'),
            tooltip: __('The S3 bucket name. See your CDN provider for this setting.'),
        },
        'S3Adapter.directAccess': {
            type: 'toggle',
            label: __('Access Files Directly'),
            tooltip: __('If turned on, the URL provided will go directly to your CDN...'),
        },
    },
};
```

### `_n()` - Plural Translation

**Purpose**: Handles singular/plural forms based on count, supporting languages with complex plural rules.

**API**:
```typescript
_n(singular: string, plural: string, count: number): string
```

**Source**: `reactium-core/sdk/named-exports/i18n.js:47`

**Implementation**:
```javascript
export const _n = (...params) => i18n.getJed().ngettext(...params);
```

**How It Works**:
1. Calls `i18n.getJed()` to get Jed.js instance
2. Calls `ngettext(singular, plural, count)` method
3. Jed.js selects correct plural form based on count and locale's plural rules
4. Returns appropriate string (singular or plural)
5. Supports languages with multiple plural forms (e.g., Polish has 3 forms)

**Usage**:
```javascript
import { _n } from '@atomic-reactor/reactium-core/sdk';

// Basic plural
const count = 5;
const label = _n('%s item', '%s items', count).replace('%s', count);
console.log(label); // → '5 items'

// In JSX
<p>
    {_n('You have %s message', 'You have %s messages', messageCount)
        .replace('%s', messageCount)}
</p>

// With SplitParts for complex templates
const template = Reactium.Utils.splitParts(
    _n('Deleted %s file from %s', 'Deleted %s files from %s', count)
);
template.replace({ count, directory: '/uploads' });
```

**Real-World Example** (from API documentation):
```javascript
import React from 'react';
import { _n } from '@atomic-reactor/reactium-core/sdk';

export default props => {
    const count = props.count;

    // singular / plural translation
    const label = _n('%s thing', '%s things', count).replace('%s', count);

    return <div>{label}</div>;
};
```

**Plural Forms by Language**:
- **English** (2 forms): `n != 1` → "1 item" vs "2 items"
- **French** (2 forms): `n > 1` → "0 item" vs "2 items"
- **Polish** (3 forms): Complex rules for 1, 2-4, 5+
- **Russian** (3 forms): Different endings for 1, 2-4, 5+
- **Japanese** (1 form): No plural distinction

Jed.js handles all plural rules automatically based on `.po` file `Plural-Forms` header.

### Important Constraints

**String Literals Only** - Variables NOT supported:
```javascript
// ✓ GOOD - Literal strings
const msg = __('Welcome');

// ✗ BAD - Variables not extracted
const key = 'Welcome';
const msg = __(key);  // CLI won't find this!

// ✗ BAD - Template literals not supported
const msg = __(`Welcome ${user}`);  // Extraction fails!
```

**Template Tokens** - Use `%placeholder%` format with SplitParts:
```javascript
// ✓ GOOD - Translatable template with SplitParts
const template = Reactium.Utils.splitParts(__('Welcome %username%'));
template.replace('username', user);

// ✗ BAD - Template literal mixes untranslatable code
const msg = __('Welcome ' + user);  // Only "Welcome " is translatable
```

**Reason**: The `npx reactium i18n` CLI command uses static analysis (regex parsing) to extract strings. It cannot evaluate variables or template literals at extraction time.

---

## Webpack po-loader Integration

### Configuration

**Source**: `reactium-core/webpack.config.js:70-81`

```javascript
sdk.addRule('po-loader', {
    test: [/\.pot?$/],
    use: [
        {
            loader: '@atomic-reactor/webpack-po-loader',
            options: {
                format: 'jed1.x',
                domain: 'messages',
            },
        },
    ],
});
```

### How It Works

**Build-Time Transformation**:
1. Webpack encounters `.po` or `.pot` file import
2. `po-loader` parses gettext file format
3. Converts to JSON structure compatible with Jed.js 1.x
4. Returns JavaScript module with `{ strings: '{"key":"value",...}' }`

**Runtime Loading** (via `require.context`):
```javascript
// This line in i18n/index.js triggers po-loader
const context = require.context(
    'babel-loader!@atomic-reactor/webpack-po-loader!reactium-translations',
    true,
    /.pot?$/,
);

// Loads and returns: { strings: '{"locale_data":{"messages":{...}}}' }
const poFile = context('./es_ES.po');
```

**Webpack Alias** (`webpack.config.js:62-64`):
```javascript
sdk.addContext('reactium-modules-context', {
    from: /reactium-translations$/,
    to: path.resolve('./src/reactium-translations'),
});
```

This maps `reactium-translations` import to `src/reactium-translations/` directory.

### Jed.js Format

**po-loader Output Structure**:
```json
{
    "strings": "{
        \"locale_data\": {
            \"messages\": {
                \"\": {
                    \"domain\": \"messages\",
                    \"lang\": \"es_ES\",
                    \"plural_forms\": \"nplurals=2; plural=(n != 1);\"
                },
                \"Welcome\": [\"Bienvenido\"],
                \"Hello %s\": [\"Hola %s\"],
                \"%s item\": [\"%s artículo\", \"%s artículos\"]
            }
        }
    }"
}
```

**Jed.js Initialization**:
```javascript
const data = JSON.parse(poFile.strings);
const jed = new Jed(data);

jed.gettext('Welcome');  // → 'Bienvenido'
jed.ngettext('%s item', '%s items', 5);  // → '%s artículos'
```

---

## CLI Extraction Command

### `npx reactium i18n`

**Purpose**: Extracts all translatable strings from source code to `template.pot` file.

**Source**: `reactium-core/.cli/commands/i18n/`
- `index.js:1-171` - Command definition
- `actions.js:1-28` - Extraction logic
- `generator.js:1-27` - Action sequence wrapper

**Implementation**:
```javascript
// actions.js:16-24
const generator = new ShowConfigCli([]);  // gettext-extract NPM package
generator.run();
```

**NPM Package**: `gettext-extract@^2.0.1` - Parses JavaScript files for gettext function calls.

### Configuration File

**File**: `.gettext.json` (project root)

**Structure**:
```json
{
    "js": {
        "parsers": [
            {
                "expression": "__",
                "arguments": {
                    "text": 0
                }
            },
            {
                "expression": "_n",
                "arguments": {
                    "text": 0,
                    "textPlural": 1
                }
            },
            {
                "expression": "gettext",
                "arguments": {
                    "text": 0
                }
            },
            {
                "expression": "ngettext",
                "arguments": {
                    "text": 0,
                    "textPlural": 1
                }
            },
            {
                "expression": "pgettext",
                "arguments": {
                    "context": 0,
                    "text": 1
                }
            }
        ],
        "glob": {
            "pattern": "src/app/**/*.js"
        }
    },
    "headers": {
        "Language": "en_US"
    },
    "output": "src/reactium-translations/template.pot"
}
```

**Configuration Fields**:
- `parsers` - Function names to search for (`__`, `_n`, `gettext`, etc.)
- `arguments` - Which parameter index contains the translatable text
- `glob.pattern` - Which files to scan (default: `src/app/**/*.js`)
- `output` - Where to write extracted strings (default: `src/reactium-translations/template.pot`)

**Supported Functions**:
- `__()` - Singular translation
- `_n()` - Plural translation
- `gettext()` - Standard gettext singular
- `ngettext()` - Standard gettext plural
- `pgettext()` - Context-aware translation (not commonly used in Reactium)

### Extraction Workflow

**Step 1: Wrap Strings**
```javascript
// src/app/components/MyComponent.js
import { __ } from '@atomic-reactor/reactium-core/sdk';

export default () => (
    <div>
        <h1>{__('Welcome to Reactium')}</h1>
        <p>{__('This is a translatable string.')}</p>
    </div>
);
```

**Step 2: Run Extraction**
```bash
npx reactium i18n
```

**Step 3: Check Output** (`src/reactium-translations/template.pot`)
```pot
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\n"
"Language: en_US\n"

#: src/app/components/MyComponent.js:6
msgid "Welcome to Reactium"
msgstr ""

#: src/app/components/MyComponent.js:7
msgid "This is a translatable string."
msgstr ""
```

**Step 4: Create Translations**

Copy `template.pot` to locale-specific `.po` files:
```bash
cp src/reactium-translations/template.pot src/reactium-translations/es_ES.po
```

**Step 5: Translate** (edit `es_ES.po`)
```pot
msgid "Welcome to Reactium"
msgstr "Bienvenido a Reactium"

msgid "This is a translatable string."
msgstr "Esta es una cadena traducible."
```

**Step 6: Build**

Webpack automatically compiles `.po` files to JSON during build.

### Generated template.pot

**Real Example** from `Reactium-Admin-Plugins/src/reactium-translations/template.pot`:
```pot
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\n"
"Language: en_US\n"

#: reactium_modules/@atomic-reactor/reactium-admin-core/Settings/AppSettings/enums.js:68
msgid "Able to access any capability regardless."
msgstr ""

#: src/app/components/plugin-src/s3-adapter/Settings/index.js:71
msgid "Able to see S3 File Adapter plugin settings, but not necessarily change them."
msgstr ""

#: src/app/components/plugin-src/reset/BigRed.js:14
msgid "Actinium Reset"
msgstr ""
```

Each entry includes:
- `#:` - Source file and line number
- `msgid` - Original English string
- `msgstr` - Translation (empty in template, filled in `.po` files)

---

## Translation File Structure

### Directory Layout

```
src/
  reactium-translations/
    template.pot       # Extracted strings (source of truth)
    en_US.po          # English (optional, usually just use template.pot)
    es_ES.po          # Spanish (Spain)
    es_MX.po          # Spanish (Mexico)
    fr_FR.po          # French (France)
    fr_CA.po          # French (Canada)
    de_DE.po          # German
    ja_JP.po          # Japanese
    zh_CN.po          # Chinese (Simplified)
```

### .pot File (Template)

**Purpose**: Master template containing all extractable strings.

**Generated By**: `npx reactium i18n` CLI command

**Do NOT edit manually** - Regenerated on every extraction.

**Structure**:
```pot
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\n"
"Language: en_US\n"

#: src/app/components/MyComponent.js:10
msgid "Hello World"
msgstr ""

#: src/app/components/OtherComponent.js:5
#, javascript-format
msgid "You have %s messages"
msgid_plural "You have %s messages"
msgstr[0] ""
msgstr[1] ""
```

### .po File (Translations)

**Purpose**: Locale-specific translations.

**Created By**: Copy `template.pot` and rename to `{locale}.po`.

**Edited By**: Translators (manually or via Poedit tool).

**Structure**:
```po
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\n"
"Language: es_ES\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\n"

#: src/app/components/MyComponent.js:10
msgid "Hello World"
msgstr "Hola Mundo"

#: src/app/components/OtherComponent.js:5
#, javascript-format
msgid "You have %s messages"
msgid_plural "You have %s messages"
msgstr[0] "Tienes %s mensaje"
msgstr[1] "Tienes %s mensajes"
```

**Key Differences from .pot**:
- `Language` header set to locale (e.g., `es_ES`)
- `Plural-Forms` header defines plural rules
- `msgstr` fields filled with translated text
- `msgstr[0]`, `msgstr[1]` for plural forms

### Plural Forms Header

**Format**: `Plural-Forms: nplurals=N; plural=(EXPRESSION);\n`

**Common Languages**:
```pot
# English (2 forms)
"Plural-Forms: nplurals=2; plural=(n != 1);\n"

# French (2 forms)
"Plural-Forms: nplurals=2; plural=(n > 1);\n"

# Polish (3 forms)
"Plural-Forms: nplurals=3; plural=(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);\n"

# Russian (3 forms)
"Plural-Forms: nplurals=3; plural=(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);\n"

# Japanese (1 form - no plurals)
"Plural-Forms: nplurals=1; plural=0;\n"
```

Jed.js evaluates the `plural` expression to determine which `msgstr[N]` to use.

---

## Locale Detection and Fallback

### Browser Locale Detection

**Source**: `reactium-core/sdk/i18n/index.js:11-21`

```javascript
async setDefaultLocale() {
    if (!isBrowserWindow()) {
        this.locale = 'en_US';  // SSR fallback
    } else {
        // navigator.language: 'en-US', 'es-ES', 'fr-CA', etc.
        const langRaw = window.navigator.userLanguage || window.navigator.language;

        // Convert 'en-US' → 'en_US' (gettext format)
        const [lang, location] = langRaw.replace('-', '_').split('_');
        this.locale = `${lang}_${location}`;
    }

    return Hook.run('set-default-locale', this);
}
```

**Browser Locale Sources** (in order of precedence):
1. `navigator.userLanguage` (IE legacy)
2. `navigator.language` (Standard, e.g., `'en-US'`)

**Format Conversion**:
- Browser: `en-US` (hyphen)
- Gettext: `en_US` (underscore)

### Fallback Chain

**File Resolution** (`getStrings()` method):

```
1. Try: {detected_locale}.po      (e.g., es_MX.po)
2. Fallback: template.pot          (untranslated English strings)
3. Fallback: Empty translations    (on error or SSR)
```

**Example Scenarios**:

**Scenario 1: Translation Exists**
- Browser locale: `es_ES`
- File exists: `src/reactium-translations/es_ES.po`
- Result: Spanish translations loaded

**Scenario 2: Translation Missing**
- Browser locale: `pt_BR` (Portuguese Brazil)
- File missing: `src/reactium-translations/pt_BR.po`
- Fallback: `template.pot` (original English strings)
- Result: English displayed (graceful degradation)

**Scenario 3: SSR (Server-Side)**
- Environment: Node.js server rendering
- Result: Empty translations, original strings displayed
- Reason: `require.context()` only works in browser webpack build

### Customizing Locale

**Via `set-default-locale` Hook**:

```javascript
// Priority 1: URL Query Parameter
Hook.register('set-default-locale', async (i18n) => {
    const params = new URLSearchParams(window.location.search);
    const locale = params.get('locale');
    if (locale) {
        i18n.locale = locale.replace('-', '_');
    }
});

// Priority 2: User Preference
Hook.register('set-default-locale', async (i18n) => {
    const userLocale = await Reactium.User.Pref.get('locale');
    if (userLocale) {
        i18n.locale = userLocale;
    }
}, Enums.priority.highest);  // Run before URL param hook

// Priority 3: Subdomain Detection
Hook.register('set-default-locale', async (i18n) => {
    const subdomain = window.location.hostname.split('.')[0];
    const localeMap = {
        'es': 'es_ES',
        'fr': 'fr_FR',
        'de': 'de_DE',
    };

    if (localeMap[subdomain]) {
        i18n.locale = localeMap[subdomain];
    }
});
```

**Manual Override** (for testing):
```javascript
// In browser console or initialization code
Reactium.i18n.locale = 'fr_FR';
window.location.reload();  // Reload to apply new locale
```

---

## Integration with SplitParts

### Why Combine i18n with SplitParts?

**Problem**: Translated strings often need dynamic content:
```javascript
// ❌ BAD - Concatenation breaks translation
__('Welcome') + ', ' + username  // "Welcome, Alice" can't be reordered in other languages

// ❌ BAD - Template literals not extractable
__(`Welcome, ${username}`)  // CLI can't extract this
```

**Solution**: Use `%placeholder%` tokens in translatable strings:
```javascript
// ✓ GOOD - Translatable template
const template = Reactium.Utils.splitParts(__('Welcome, %username%!'));
template.replace('username', 'Alice');
console.log(template.toString());  // → "Welcome, Alice!" (translated)
```

**Why This Works**:
1. CLI extracts `"Welcome, %username%!"` as a complete string
2. Translators see full sentence context: `"Bienvenido, %username%!"`
3. Token order can change per language: `"%username%, Bienvenue!"` (French)
4. Runtime replacement happens AFTER translation

### Usage Pattern

**Step 1: Wrap Translatable Template**
```javascript
import { __ } from '@atomic-reactor/reactium-core/sdk';

const template = Reactium.Utils.splitParts(
    __('User %username% uploaded %count% files to %directory%.')
);
```

**Step 2: Replace Tokens**
```javascript
template.replace({
    username: 'Alice',
    count: 5,
    directory: '/uploads',
});
```

**Step 3: Render**
```javascript
console.log(template.toString());
// → "User Alice uploaded 5 files to /uploads." (English)
// → "Utilisateur Alice a téléchargé 5 fichiers vers /uploads." (French)
// → "Usuario Alice subió 5 archivos a /uploads." (Spanish)
```

**Note**: Token order can differ per language without breaking functionality.

### Real-World Example

From `reactium-admin-content/Content/ActivityLog/ActivityUpdates.js:393-429` (documented in REACTIUM_UTILITY_HELPERS.md):

```javascript
const getDescriptionParts = (who, changeType, meta) => {
    // Get internationalized template string from ENUMS
    const parts = Reactium.Utils.splitParts(
        op.get(
            ENUMS.CHANGES,
            [changeType, scope],
            ENUMS.CHANGES.DEFAULT[scope],
        ),
    );

    // Template examples:
    // - "%type% %slug% revised by %who%. Version %version%"
    // - "%type% %slug% status set to %status% by %who%"
    // - "%type% slug changed from %originalSlug% to %slug% by %who%"

    switch (changeType) {
        case 'REVISED':
        case 'CREATED_BRANCH':
        case 'SET_REVISION': {
            const { branch, revision } = op.get(meta, 'history');
            const label = op.get(meta, 'branch.label', branch);
            const rev = revision !== undefined ? ` v${revision + 1}` : '';
            const version = `${label}${rev}`;
            parts.replace('version', version);
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

    // Common replacements for all change types
    parts.replace('who', who ? who : __('Unknown'));  // Translated fallback
    parts.replace('slug', op.get(meta, 'slug', ''));
    parts.replace('type', op.get(meta, 'type.objectId'));

    return parts.value();  // Return parts array for React rendering
};
```

**Key Patterns**:
1. Template stored in ENUMS (not hardcoded) → All templates extractable
2. Conditional replacements based on `changeType`
3. Fallback to `__('Unknown')` when data missing
4. Returns `.value()` array for React component rendering

### Plural Forms with SplitParts

```javascript
import { _n, __ } from '@atomic-reactor/reactium-core/sdk';

const count = 3;

// Get plural-aware template
const template = Reactium.Utils.splitParts(
    _n(
        'Deleted %count% file from %directory%',
        'Deleted %count% files from %directory%',
        count
    )
);

// Replace tokens
template.replace({
    count: count,
    directory: '/uploads',
});

console.log(template.toString());
// count = 1 → "Deleted 1 file from /uploads"
// count = 3 → "Deleted 3 files from /uploads"
// (Translated appropriately in other languages)
```

---

## Best Practices

### 1. String Wrapping

**✓ DO: Wrap complete sentences**
```javascript
__('Welcome to the administration panel.')
```

**✗ DON'T: Wrap sentence fragments**
```javascript
__('Welcome') + ' ' + __('to the administration panel.')
// Translators can't see full context, may translate incorrectly
```

**✓ DO: Use SplitParts for dynamic content**
```javascript
const msg = Reactium.Utils.splitParts(__('Welcome, %username%!'));
msg.replace('username', user);
```

**✗ DON'T: Use template literals**
```javascript
__(`Welcome, ${user}!`)  // Not extractable!
```

### 2. Context for Translators

**✓ DO: Provide clear context with comments**
```javascript
// Translator note: "Settings" refers to application configuration, not user preferences
const title = __('Settings');
```

**✓ DO: Use descriptive strings**
```javascript
__('Click here to save your changes')  // Clear action
```

**✗ DON'T: Use ambiguous single words**
```javascript
__('Save')  // Save what? File? Settings? Document?
```

### 3. Plural Forms

**✓ DO: Always use `_n()` for countable nouns**
```javascript
_n('%s file', '%s files', count)
```

**✗ DON'T: Manually handle plurals**
```javascript
count === 1 ? __('file') : __('files')  // Breaks in languages with 3+ plural forms
```

### 4. Token Naming

**✓ DO: Use descriptive token names**
```javascript
__('User %username% created %documentTitle%')
```

**✗ DON'T: Use numbered placeholders**
```javascript
__('User %1 created %2')  // Unclear what %1 and %2 represent
```

### 5. Extraction Configuration

**✓ DO: Keep `.gettext.json` in sync with codebase**
```json
{
    "glob": {
        "pattern": "src/app/**/*.{js,jsx,ts,tsx}"  // Include all file types
    }
}
```

**✓ DO: Run extraction regularly**
```bash
npx reactium i18n  # Before every release
```

**✓ DO: Commit `template.pot` to version control**
- Allows tracking string changes over time
- Enables translators to see diffs

### 6. Locale Files

**✓ DO: Create locale files as needed**
```bash
# Copy template for new language
cp src/reactium-translations/template.pot src/reactium-translations/fr_FR.po
```

**✓ DO: Use Poedit or similar tools for translation**
- Visual context for strings
- Automatic plural form validation
- Fuzzy matching for similar strings

**✗ DON'T: Edit `.pot` file manually**
- Regenerated on every `npx reactium i18n` run
- Manual edits will be lost

### 7. Testing Translations

**✓ DO: Test with browser locale**
```javascript
// Chrome DevTools → Settings → Languages → Add language
// Set browser to 'es-ES' (Spanish)
// Reload app → Should show Spanish strings
```

**✓ DO: Test fallback behavior**
```javascript
// Set browser to unsupported locale (e.g., 'pt-BR')
// Should fallback to English (template.pot)
```

**✓ DO: Test plural forms**
```javascript
// Test with counts: 0, 1, 2, 5, 100
// Verify correct plural form in each language
```

### 8. Performance

**✓ DO: Extract strings at build time** (automatic with po-loader)

**✓ DO: Lazy-load large translation files** (already handled by `require.context`)

**✗ DON'T: Fetch translations at runtime**
- Adds network latency
- po-loader compiles to webpack bundle

### 9. Dynamic Locale Switching

**✓ DO: Use hook for dynamic locale**
```javascript
Hook.register('set-default-locale', async (i18n) => {
    const userLocale = await Reactium.User.Pref.get('locale');
    if (userLocale) i18n.locale = userLocale;
});
```

**✓ DO: Reload page after locale change**
```javascript
Reactium.User.Pref.update('locale', 'fr_FR');
window.location.reload();  // Required - translations loaded at boot
```

**✗ DON'T: Expect hot-swapping of translations**
- i18n singleton initialized once at boot
- Jed.js instance created once
- Locale changes require page reload

---

## Common Gotchas

### 1. Template Literals Not Extractable

**Problem**:
```javascript
const name = 'Alice';
const msg = __(`Hello, ${name}!`);  // ❌ CLI can't extract this
```

**Reason**: `gettext-extract` uses static regex parsing. Template literals with interpolation are dynamic expressions, not string literals.

**Solution**:
```javascript
const msg = Reactium.Utils.splitParts(__('Hello, %name%!'));
msg.replace('name', name);
```

### 2. Variables Not Extracted

**Problem**:
```javascript
const key = 'Welcome';
const msg = __(key);  // ❌ CLI doesn't extract 'Welcome'
```

**Reason**: Static analysis can't evaluate variable values.

**Solution**:
```javascript
const msg = __('Welcome');  // ✓ Always use string literals
```

### 3. Missing Translations Fallback to English

**Problem**: Added new strings to code, but translations don't appear in other languages.

**Reason**: Forgot to run `npx reactium i18n` after adding new strings.

**Solution**:
```bash
# 1. Extract new strings
npx reactium i18n

# 2. Update .po files with new msgid entries
# (Open in Poedit or edit manually)

# 3. Rebuild webpack bundle
npm run build
```

### 4. Locale Change Requires Reload

**Problem**: Changed locale programmatically, but UI still shows old language.

**Reason**: i18n singleton loads translations once at boot. Jed.js instance not recreated.

**Solution**:
```javascript
Reactium.i18n.locale = 'fr_FR';
window.location.reload();  // Required
```

**Alternative**: Implement custom locale switching with dynamic `require.context()` and state management (advanced).

### 5. SSR Returns Untranslated Strings

**Problem**: Server-side rendered HTML always shows English.

**Reason**: `require.context()` only works in browser webpack builds, not Node.js.

**Current Behavior** (`getStrings()` method):
```javascript
if (!isBrowserWindow()) {
    return { strings: JSON.stringify({}) };  // Empty translations on server
}
```

**Implication**: Server-rendered HTML is always in English. Client hydration applies translations.

**Workaround** (if SSR translations critical):
1. Use different i18n library (e.g., `i18next` with server support)
2. OR: Implement custom server-side .po file loader
3. OR: Accept English-only SSR (translations apply on client hydration)

### 6. Plural Forms Must Use `_n()`, Not Conditional

**Problem**:
```javascript
const msg = count === 1 ? __('item') : __('items');  // ❌ Breaks in Polish/Russian
```

**Reason**: Languages like Polish have 3 plural forms (1, 2-4, 5+). Simple `count === 1` check doesn't handle all cases.

**Solution**:
```javascript
const msg = _n('item', 'items', count);  // ✓ Jed.js handles all plural rules
```

### 7. `.po` File Encoding

**Problem**: Non-ASCII characters display as mojibake (e.g., `Ã©` instead of `é`).

**Reason**: `.po` file not saved with UTF-8 encoding.

**Solution**:
```pot
# Ensure this header is in ALL .po files:
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\n"
```

Save file as UTF-8 (not Latin-1 or Windows-1252).

### 8. Webpack Alias Not Configured

**Problem**: `require.context('reactium-translations')` throws module not found.

**Reason**: Webpack alias not configured in custom webpack override.

**Solution** (verify in `webpack.config.js`):
```javascript
sdk.addContext('reactium-modules-context', {
    from: /reactium-translations$/,
    to: path.resolve('./src/reactium-translations'),
});
```

### 9. Forgetting to Create `.po` Files

**Problem**: Extracted strings to `template.pot`, but browser still shows English.

**Reason**: No locale-specific `.po` file exists. Fallback to `template.pot` (untranslated).

**Solution**:
```bash
# Create .po file for each supported locale
cp src/reactium-translations/template.pot src/reactium-translations/es_ES.po
cp src/reactium-translations/template.pot src/reactium-translations/fr_FR.po

# Translate msgstr entries in each .po file
```

### 10. `Plural-Forms` Header Missing

**Problem**: Plural forms always show singular.

**Reason**: `.po` file missing `Plural-Forms` header.

**Solution** (add to `.po` file header):
```pot
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\n"
"Language: es_ES\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\n"
```

Consult [GNU gettext plural forms](https://www.gnu.org/software/gettext/manual/html_node/Plural-forms.html) for correct expression per language.

---

## Summary

**Reactium i18n System Provides**:

1. ✅ **Industry-Standard Workflow** - Gettext used by WordPress, Django, GNU projects
2. ✅ **Developer-Friendly API** - Simple `__()` and `_n()` wrappers
3. ✅ **Build-Time Compilation** - No runtime parsing overhead (po-loader)
4. ✅ **Automatic Locale Detection** - Browser language used by default
5. ✅ **Graceful Fallback** - Missing translations show English
6. ✅ **Plural Form Support** - Handles complex plural rules via Jed.js
7. ✅ **SplitParts Integration** - Dynamic content in translated strings
8. ✅ **CLI Extraction** - `npx reactium i18n` discovers all translatable strings
9. ✅ **Extensible** - `set-default-locale` hook for custom locale detection

**Workflow Recap**:

```
1. Developer: Wrap strings in __() or _n()
2. Developer: Run `npx reactium i18n`
3. Translator: Copy template.pot → locale.po
4. Translator: Fill msgstr fields in Poedit
5. Developer: Rebuild with webpack
6. Browser: Loads locale.po based on navigator.language
7. User: Sees translated UI
```

**When to Use**:
- ✓ Multi-language applications
- ✓ CMS with content in multiple languages
- ✓ Admin interfaces for international teams
- ✓ SaaS products with global user base

**When NOT to Use**:
- ✗ Single-language applications (overhead not justified)
- ✗ SSR-critical translations (browser-only support)
- ✗ Dynamic locale switching without reload (requires custom implementation)

**Key Takeaway**: Reactium i18n is a **browser-first**, **build-time compiled**, **gettext-based** translation system optimized for developer productivity and runtime performance.
