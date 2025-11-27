<!-- v1.0.0 -->

# CLI Template System and Generator Pattern

**Purpose**: Document the Reactium CLI template generation system including handlebars integration, template discovery patterns, variable substitution, generator abstraction, and template-driven file creation.

**Target Audience**: Claude Code assisting developers creating custom CLI generators, building reusable command templates, and understanding the template processing pipeline.

---

## Overview

The Reactium CLI uses **Handlebars** templates to generate files from commands. Templates support variable substitution, conditional generation, and hook-driven customization. The generator pattern wraps ActionSequence for consistent error handling and progress reporting.

**Key Mechanisms**:

- Handlebars template engine for variable substitution
- Template discovery via `template/` directories in command structure
- Generator abstraction wrapping ActionSequence
- Hook-driven file content transformation
- Conditional file generation based on parameters
- Template helpers for common transformations

---

## Architecture Components

### 1. Template Engine Bootstrap

**Source**: `CLI/bootstrap.js:3,53`

Handlebars is loaded globally and available to all commands:

```javascript
// CLI/bootstrap.js:3
import handlebars from 'handlebars';

// CLI/bootstrap.js:53 - Added to global arcli object
global.arcli = {
  // ... other utilities
  handlebars,
  generator, // Generator wrapper function
  // ...
};
```

**Template processing flow**:
1. Command reads template file from `template/` directory
2. Handlebars compiles template string
3. Template rendered with params object as context
4. Output written to destination file

---

### 2. Template Directory Structure

**Convention**: Commands place templates in `template/` subdirectory

**Example: Component command templates**:

```
Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/
└── .cli/commands/reactium/component/
    ├── reactium-arcli.js              # Command registration
    ├── componentGen.cjs                # Generator logic
    └── template/                       # Template directory
        ├── index-functional.hbs        # Component template
        ├── route.hbs                   # Route template
        ├── domain.hbs                  # Domain template
        ├── reactium-hooks.hbs          # Hooks template
        └── reactium-style.hbs          # Stylesheet template
```

**Example: CLI command templates**:

```
CLI/commands/cli/command/
├── index.js                # CLI command generator
└── template/               # Templates for generating new commands
    ├── index.js.hbs        # Command registration template
    ├── actions.js.hbs      # Actions template
    └── generator.js.hbs    # Generator wrapper template
```

---

### 3. Template Syntax and Variables

Templates use standard Handlebars syntax for variable substitution.

#### Basic Variable Substitution

**Template**: `template/index-functional.hbs`

```handlebars
import { useSyncState } from '@atomic-reactor/reactium-core/sdk';
import React from 'react';

/**
 * Component: {{name}}
 */
export const {{name}} = ({ className }) => {
    const state = useSyncState({ content: '{{name}}' });

    return <div className={className}>{state.get('content')}</div>;
};

{{name}}.defaultProps = {
    className: '{{className}}'
};

export default {{name}};
```

**Context params**:
```javascript
{
  name: 'AboutPage',        // PascalCase component name
  className: 'aboutpage'    // lowercase className
}
```

**Generated output**:
```javascript
import { useSyncState } from '@atomic-reactor/reactium-core/sdk';
import React from 'react';

/**
 * Component: AboutPage
 */
export const AboutPage = ({ className }) => {
    const state = useSyncState({ content: 'AboutPage' });

    return <div className={className}>{state.get('content')}</div>;
};

AboutPage.defaultProps = {
    className: 'aboutpage'
};

export default AboutPage;
```

---

#### Triple-Brace Unescaped Output

Use `{{{variable}}}` for unescaped output (e.g., arrays, JSON):

**Template**: `template/route.hbs`

```handlebars
import { {{name}} as component } from './{{name}}';

export default [
    {
        id: 'route-{{name}}-1',
        exact: true,
        component,
        path: {{{route}}},
    },
];
```

**Context params**:
```javascript
{
  name: 'AboutPage',
  route: '["/about", "/about-us"]'  // Array as string
}
```

**Generated output**:
```javascript
import { AboutPage as component } from './AboutPage';

export default [
    {
        id: 'route-AboutPage-1',
        exact: true,
        component,
        path: ["/about", "/about-us"],  // Unescaped - renders as array
    },
];
```

**Why triple-brace**: Double-brace `{{route}}` would escape as `&quot;[&quot;/about&quot;]&quot;` (broken)

---

#### Handlebars Helpers (Standard)

Handlebars provides built-in helpers:

**Conditionals**:
```handlebars
{{#if hooks}}
// Include hooks code
{{/if}}

{{#unless simple}}
// Include complex code
{{/unless}}
```

**Iteration**:
```handlebars
{{#each routes}}
  path: '{{this.path}}',
{{/each}}
```

**Note**: Custom helpers not widely used in Reactium CLI templates, but can be registered via `handlebars.registerHelper()`

---

### 4. Generator Pattern and ActionSequence

**Source**: `CLI/lib/generator.js:1-20`

The `generator()` function wraps ActionSequence with consistent error handling:

```javascript
export default async ({ actions, params, props }) => {
    const { Spinner: spinner, ActionSequence, chalk } = arcli;

    console.log('');
    spinner.start();

    try {
        const success = await ActionSequence({
            actions,
            options: { arcli, params, props },
        });

        spinner.succeed('complete!');
        return success;
    } catch (error) {
        spinner.fail(error.message ? error.message : 'failed!');
        console.error(chalk.red('Error'), error.message ? error.message : error);
        throw error;
    }
};
```

**Usage in commands**:

```javascript
// CLI/commands/init/index.js:85-89
return generator({
    actions: actions(Spinner),
    params,
    props,
}).catch(err => message(op.get(err, 'message', CANCELED)));
```

**Benefits**:
- Consistent spinner feedback (start → succeed/fail)
- Centralized error handling
- Standard return value propagation
- Spinner stop on error

---

### 5. Component Generator Pattern

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/component/componentGen.cjs:1-86`

The component generator demonstrates the complete template processing pattern:

```javascript
const { fs, chalk, Reactium } = arcli;
const handlebars = require('handlebars');

const componentGen = async props => {
    const { params, spinner } = props;

    // 1. Define template directory
    const templateDir = arcli.normalizePath(__dirname, 'template');

    // 2. Define templates with conditional creation
    const templates = {
        hooks: {
            file: `reactium-hooks-${params.className}.js`,
            template: 'reactium-hooks.hbs',
            create: params.hooks,  // Only create if --hooks flag
        },
        component: {
            file: `${params.name}.jsx`,
            template: 'index-functional.hbs',
            create: params.index,
        },
        domain: {
            file: `reactium-domain-${params.className}.js`,
            template: 'domain.hbs',
            create: params.domain,  // Only create if --domain flag
        },
        route: {
            file: `reactium-route-${params.className}.js`,
            template: 'route.hbs',
            create: params.route !== '[]',  // Only if route provided
        },
        style: {
            file: `${params.styleType}-${params.name}.scss`,
            template: 'reactium-style.hbs',
            create: params.style,  // Only create if --style flag
        },
    };

    // 3. Ensure destination directory exists
    fs.ensureDirSync(params.destination);

    // 4. Process each template
    for (const item of Object.values(templates)) {
        if (!item.create) continue;  // Skip if not requested

        const filePath = arcli.normalizePath(params.destination, item.file);

        // 5. Overwrite confirmation (if file exists)
        if (fs.existsSync(filePath) && !params.unattended) {
            const { overwrite } = await arcli.props.inquirer.prompt([
                {
                    default: false,
                    type: 'confirm',
                    name: 'overwrite',
                    message: `Overwrite existing ${item.file} file?`,
                    prefix: arcli.prefix,
                    suffix: chalk.magenta(': '),
                },
            ]);
            if (!overwrite) continue;
        }

        // 6. Handle template-less files
        if (!item.template) {
            fs.ensureFileSync(filePath);
            continue;
        }

        // 7. Read and compile template
        const templateFilePath = arcli.normalizePath(
            templateDir,
            item.template,
        );

        let fileContent = handlebars.compile(
            fs.readFileSync(templateFilePath, 'utf-8'),
        )(params);

        // 8. Hook-driven file content transformation
        try {
            await Reactium.Hook.run('arcli-file-gen', fileContent, props);
        } catch (err) {
            spinner.stop();
            console.log(err);
            spinner.start();
        }

        // 9. Write file
        fs.writeFileSync(filePath, fileContent);
    }
};

module.exports = componentGen;
```

**Key patterns**:
1. **Template directory**: `arcli.normalizePath(__dirname, 'template')`
2. **Conditional creation**: `create` flag determines if file generated
3. **Template compilation**: `handlebars.compile(templateString)(params)`
4. **Hook integration**: `arcli-file-gen` hook for content transformation
5. **Overwrite protection**: Prompt before overwriting existing files
6. **Error handling**: Spinner stop/start around hook execution

---

### 6. Hook-Driven File Transformation

Templates can be modified after rendering via hooks:

**Hook**: `arcli-file-gen`

**Purpose**: Transform generated file content before writing

**Example use cases**:
- Add custom headers/footers
- Inject organization-specific imports
- Apply code formatting/linting
- Add license headers
- Transform syntax (e.g., class → functional)

**Hook signature**:
```javascript
await Reactium.Hook.run('arcli-file-gen', fileContent, props);
```

**Example hook registration** (hypothetical):

```javascript
// arcli-hooks.js
Reactium.Hook.register('arcli-file-gen', async (fileContent, props) => {
    // Add license header to all generated files
    const header = '// Copyright 2025 MyOrg\n\n';
    return header + fileContent;
}, Reactium.Enums.priority.highest);
```

**Note**: Hook must return transformed content or original content

---

## Template Discovery Patterns

### 1. Component Command Templates

**Location**: `@atomic-reactor/reactium-core/.cli/commands/reactium/component/template/`

**Templates**:
- `index-functional.hbs` - Functional component with useSyncState
- `route.hbs` - Route definition array
- `domain.hbs` - Domain declaration
- `reactium-hooks.hbs` - Component registration hook
- `reactium-style.hbs` - Empty stylesheet (just comment)

**Discovery**: Hard-coded in `componentGen.cjs`

---

### 2. CLI Command Templates

**Location**: `CLI/commands/cli/command/template/`

**Templates**:
- `index.js.hbs` - Command registration structure
- `actions.js.hbs` - Action sequence skeleton
- `generator.js.hbs` - Generator wrapper

**Discovery**: Hard-coded in CLI command generator

---

### 3. Custom Template Locations

Custom generators can use any template location:

```javascript
const templateDir = arcli.normalizePath(__dirname, 'my-templates');
const templatePath = arcli.normalizePath(templateDir, 'custom.hbs');
const template = fs.readFileSync(templatePath, 'utf-8');
const output = handlebars.compile(template)(params);
```

**Best practices**:
- Keep templates in `template/` subdirectory of command
- Use relative paths from `__dirname`
- Template filename matches purpose (e.g., `component.hbs`, `route.hbs`)

---

## Variable Substitution Patterns

### Common Template Variables

**Component command params**:
```javascript
{
  name: 'AboutPage',              // PascalCase component name
  className: 'aboutpage',         // lowercase class name
  route: '["/about"]',            // Route path(s) as JSON string
  destination: '/full/path/to/component',
  hooks: true,                    // Generate hooks file
  domain: true,                   // Generate domain file
  style: true,                    // Generate stylesheet
  styleType: 'scss',              // Stylesheet type
  index: true,                    // Generate index file
  unattended: false,              // Skip prompts
}
```

**CLI command params**:
```javascript
{
  command: 'my-command',          // Command name
  // ... other command-specific params
}
```

**Path resolution params**:
```javascript
{
  cwd: '/current/working/dir',    // Current directory
  root: '/cli/install/dir',       // CLI root
}
```

---

### Variable Transformation Helpers

**Source**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/component/reactium-arcli.js:90-122`

Commands transform parameters before template rendering:

```javascript
const CONFORM = async ({ params }) => {
    // Transform destination path
    params.destination = formatDestination(params.destination);

    // Transform component name
    if (typeof params.name === 'string') {
        params.className = String(params.name).toLowerCase();
        params.name = cc(params.name);  // camelcase with pascalCase: true
        params.index = true;

        // Append name to destination if not present
        if (!String(params.destination).endsWith(params.name)) {
            params.destination = arcli.normalizePath(
                params.destination,
                params.name,
            );
        }
    }

    // Transform style parameter
    if (typeof params.style === 'string') {
        params.styleType = params.style;
        params.style = true;
    }

    if (params.style === true) {
        const styleType =
            _.findWhere(styleTypes, { name: params.styleType }) ||
            _.first(styleTypes);

        params.styleType = styleType.value;
    }

    // Transform route parameter
    if (typeof params.route === 'string') {
        params.route = formatRoute(params.route);
    }
};
```

**Transformations**:
- `name` → PascalCase
- `className` → lowercase
- `destination` → appends component name
- `style` → boolean + `styleType` property
- `route` → formatted route string/array

---

## Real-World Template Examples

### Example 1: Functional Component Template

**Template**: `template/index-functional.hbs`

```handlebars
import { useSyncState } from '@atomic-reactor/reactium-core/sdk';
import React from 'react';

/**
 * -----------------------------------------------------------------------------
 * Component: {{name}}
 * -----------------------------------------------------------------------------
 */
export const {{name}} = ({ className }) => {
    const state = useSyncState({ content: '{{name}}' });

    return <div className={className}>{state.get('content')}</div>;
};

{{name}}.defaultProps = {
    className: '{{className}}'
};

export default {{name}};
```

**Input params**:
```javascript
{ name: 'Button', className: 'button' }
```

**Output**:
```javascript
import { useSyncState } from '@atomic-reactor/reactium-core/sdk';
import React from 'react';

/**
 * -----------------------------------------------------------------------------
 * Component: Button
 * -----------------------------------------------------------------------------
 */
export const Button = ({ className }) => {
    const state = useSyncState({ content: 'Button' });

    return <div className={className}>{state.get('content')}</div>;
};

Button.defaultProps = {
    className: 'button'
};

export default Button;
```

---

### Example 2: Route Template

**Template**: `template/route.hbs`

```handlebars
import { {{name}} as component } from './{{name}}';

export default [
    {
        id: 'route-{{name}}-1',
        exact: true,
        component,
        path: {{{route}}},
    },
];
```

**Input params**:
```javascript
{ name: 'AboutPage', route: '["/about", "/about-us"]' }
```

**Output**:
```javascript
import { AboutPage as component } from './AboutPage';

export default [
    {
        id: 'route-AboutPage-1',
        exact: true,
        component,
        path: ["/about", "/about-us"],
    },
];
```

---

### Example 3: Component Registration Hook

**Template**: `template/reactium-hooks.hbs`

```handlebars
/**
 * -----------------------------------------------------------------------------
 * Reactium Plugin {{name}}
 * -----------------------------------------------------------------------------
 */
(async () => {
    const { Hook, Enums, Component } = await import('@atomic-reactor/reactium-core/sdk');

    Hook.register('plugin-init', async () => {
        const { {{name}} } = await import('./{{name}}');
        Component.register('{{name}}', {{name}});
    }, Enums.priority.neutral, 'plugin-init-{{name}}');
})();
```

**Input params**:
```javascript
{ name: 'Button' }
```

**Output**:
```javascript
/**
 * -----------------------------------------------------------------------------
 * Reactium Plugin Button
 * -----------------------------------------------------------------------------
 */
(async () => {
    const { Hook, Enums, Component } = await import('@atomic-reactor/reactium-core/sdk');

    Hook.register('plugin-init', async () => {
        const { Button } = await import('./Button');
        Component.register('Button', Button);
    }, Enums.priority.neutral, 'plugin-init-Button');
})();
```

---

### Example 4: Domain Declaration Template

**Template**: `template/domain.hbs`

```handlebars
/**
 * -----------------------------------------------------------------------------
 * DDD Domain {{name}} - Change name to place domain artifacts in this directory
 * in a different domain.
 * -----------------------------------------------------------------------------
 */
module.exports = {
    name: '{{name}}',
};
```

**Input params**:
```javascript
{ name: 'User' }
```

**Output**:
```javascript
/**
 * -----------------------------------------------------------------------------
 * DDD Domain User - Change name to place domain artifacts in this directory
 * in a different domain.
 * -----------------------------------------------------------------------------
 */
module.exports = {
    name: 'User',
};
```

---

### Example 5: CLI Command Template

**Template**: `template/index.js.hbs`

```handlebars
import actions from './actions.js';

const { Spinner, chalk, generator, message, op, prefix, flagsToParams } = arcli;

export const NAME = '{{{command}}}';
const CANCELED = '{{{command}}} canceled!';
const DESC = 'The description of the command';

const HELP = () => console.log(`
Example:
  $ arcli {{{command}}} -h
`);

// ... INPUT, CONFIRM, CONFORM, PREFLIGHT functions ...

const ACTION = async ({ opt, props }) => {
    const flags = ['sample'];
    let params = flagsToParams({ opt, flags });

    const userInput = await INPUT(props, params);
    Object.entries(userInput).forEach(([key, val]) => (params[key] = val));

    params = CONFORM(params, props);
    PREFLIGHT({ params });

    const { confirm } = await CONFIRM(props);
    if (confirm !== true) {
        message(CANCELED);
        return;
    }

    return generator({
        actions: actions(Spinner),
        params,
        props,
    }).catch((err) => message(op.get(err, 'message', CANCELED)));
};

export const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action((opt) => ACTION({ opt, props }))
        .option('-s, --sample [sample]', 'Sample parameter.')
        .on('--help', HELP);

export const ID = NAME;
```

**Input params**:
```javascript
{ command: 'deploy' }
```

**Output**: Complete CLI command structure with `deploy` as command name

---

## Init Command Special Pattern: NPM Package Download

**Source**: `CLI/commands/init/actions.js:1-114`

The `init` command uses a unique pattern: downloading and extracting GitHub repos instead of handlebars templates:

```javascript
const PAYLOAD = {
    app: [
        'config.reactium.repo',
        'https://github.com/Atomic-Reactor/Reactium/archive/master.zip',
    ],
    api: [
        'config.actinium.repo',
        'https://github.com/Atomic-Reactor/Actinium/archive/master.zip',
    ]
};

return {
    download: ({ params, props, action }) => {
        const { cwd } = props;
        const { type, tag } = params;

        // Get download URL from config or default
        let URL = String(op.get(props, ...PAYLOAD[type]));

        // Support tagged releases
        if (tag && tag !== 'latest' && URL.endsWith('/master.zip')) {
            URL = URL.replace('/master.zip', `/refs/tags/${tag}.zip`);
        }

        // Download with axios stream
        return new Promise((resolve, reject) => {
            axios(URL, { responseType: 'stream' }).then(({ data }) => {
                data.pipe(
                    fs.createWriteStream(
                        normalize(cwd, 'tmp', 'package.zip'),
                    ),
                )
                .on('close', () => resolve({ action, status: 200 }));
            })
        });
    },

    unzip: ({ params, props, action }) => {
        const { cwd } = props;
        const zipFile = normalize(cwd, 'tmp', 'package.zip');

        // Extract with strip:1 (removes top-level directory)
        return decompress(zipFile, cwd, { strip: 1 });
    },

    cleanup: ({ params, props, action }) => {
        const { cwd } = props;
        // Remove tmp directory
        return fs.remove(normalize(cwd, 'tmp'));
    },
};
```

**Pattern**:
1. **Download**: Axios stream → ZIP file
2. **Extract**: `decompress` with `strip: 1` (flattens structure)
3. **Cleanup**: Remove temp files

**Why not templates**: Init command scaffolds entire project structure (hundreds of files), not feasible with templates

**Configuration**: URLs customizable via `config.reactium.repo` and `config.actinium.repo` in CLI config

---

## Best Practices

### 1. Use Triple-Brace for Unescaped Output

```handlebars
✅ Correct: path: {{{route}}}
❌ Wrong: path: {{route}}  (escapes quotes)
```

### 2. Provide Sensible Default Content

Templates should generate working code, not just placeholders:

```handlebars
✅ Correct:
export const {{name}} = () => {
    return <div>{{name}}</div>;
};

❌ Wrong:
export const {{name}} = () => {
    // TODO: Implement component
};
```

### 3. Use Conditional File Generation

Don't generate unnecessary files:

```javascript
const templates = {
    route: {
        file: 'route.js',
        template: 'route.hbs',
        create: params.route !== '[]',  // Only if route provided
    },
};
```

### 4. Transform Parameters Before Templates

Normalize inputs in CONFORM hook:

```javascript
// Transform component name to PascalCase before template
params.name = camelcase(params.name, { pascalCase: true });
```

### 5. Use Descriptive Template Names

```
✅ Correct: index-functional.hbs, index-class.hbs
❌ Wrong: template1.hbs, template2.hbs
```

### 6. Organize Templates by Command

```
commands/
  ├── component/
  │   └── template/          # Component-specific templates
  │       ├── component.hbs
  │       └── route.hbs
  └── cloud/
      └── template/          # Cloud function templates
          └── function.hbs
```

### 7. Document Template Variables

Add comments to templates:

```handlebars
/**
 * Component: {{name}}          (PascalCase component name)
 * ClassName: {{className}}     (lowercase for CSS)
 */
```

### 8. Handle Overwrite Gracefully

Always prompt before overwriting existing files:

```javascript
if (fs.existsSync(filePath) && !params.unattended) {
    const { overwrite } = await inquirer.prompt([
        { type: 'confirm', name: 'overwrite', message: 'Overwrite?' }
    ]);
    if (!overwrite) continue;
}
```

### 9. Use Hook System for Extensibility

Allow hook-driven content transformation:

```javascript
let fileContent = handlebars.compile(template)(params);
await Reactium.Hook.run('arcli-file-gen', fileContent, props);
fs.writeFileSync(filePath, fileContent);
```

### 10. Ensure Directory Exists Before Writing

```javascript
fs.ensureDirSync(params.destination);  // Create parent directories
fs.writeFileSync(filePath, content);
```

---

## Common Gotchas

### 1. Escaped vs Unescaped Output

**Problem**: Route renders as `path: &quot;[&quot;/about&quot;]&quot;`

**Solution**: Use triple-brace `{{{route}}}` instead of `{{route}}`

---

### 2. Template File Extension

**Problem**: Template not found

**Solution**: Verify template filename has `.hbs` extension:
```javascript
✅ Correct: template: 'component.hbs'
❌ Wrong: template: 'component.js'
```

---

### 3. Context Variable Undefined

**Problem**: Template renders `{{name}}` literally

**Solution**: Ensure `params` object contains `name` property before template compilation

---

### 4. Path Resolution Issues

**Problem**: Template not found in `template/` directory

**Solution**: Use `__dirname` for relative paths:
```javascript
const templateDir = arcli.normalizePath(__dirname, 'template');
const templatePath = arcli.normalizePath(templateDir, 'component.hbs');
```

---

### 5. Hook Return Value

**Problem**: File content empty after hook

**Solution**: Hooks must return content (not mutate):
```javascript
❌ Wrong:
Hook.register('arcli-file-gen', (content) => {
    // Mutates but doesn't return
    content = '// Header\n' + content;
});

✅ Correct:
Hook.register('arcli-file-gen', (content) => {
    return '// Header\n' + content;
});
```

---

### 6. Conditional File Generation

**Problem**: All files generated even when flags false

**Solution**: Check `create` flag before processing:
```javascript
for (const item of Object.values(templates)) {
    if (!item.create) continue;  // Skip if not requested
    // ... process template
}
```

---

### 7. File Encoding

**Problem**: Non-ASCII characters garbled

**Solution**: Always specify UTF-8 encoding:
```javascript
fs.readFileSync(templatePath, 'utf-8')
fs.writeFileSync(filePath, content, 'utf-8')
```

---

### 8. ActionSequence Error Propagation

**Problem**: Errors swallowed, no user feedback

**Solution**: Use `generator()` wrapper for consistent error handling:
```javascript
return generator({
    actions: actions(Spinner),
    params,
    props,
}).catch(err => message(err.message));
```

---

### 9. Template Variable Casing

**Problem**: Variable names don't match params

**Solution**: Document expected param structure and ensure consistency:
```javascript
// Expected params for template
const params = {
    name: 'MyComponent',        // Must match template {{name}}
    className: 'my-component',  // Must match template {{className}}
};
```

---

### 10. Handlebars Compilation Caching

**Problem**: Template changes not reflected after edit

**Solution**: Handlebars compiles fresh each time - restart CLI if issue persists

---

## Debugging Template Issues

### 1. Verify Template Content

```javascript
const template = fs.readFileSync(templatePath, 'utf-8');
console.log('Template:', template);
```

### 2. Inspect Params Object

```javascript
console.log('Template params:', JSON.stringify(params, null, 2));
```

### 3. Test Template Compilation

```javascript
const compiled = handlebars.compile(template);
const output = compiled(params);
console.log('Generated output:', output);
```

### 4. Check Template Path Resolution

```javascript
const templatePath = arcli.normalizePath(__dirname, 'template', 'component.hbs');
console.log('Template path:', templatePath);
console.log('Exists:', fs.existsSync(templatePath));
```

### 5. Test Hook Execution

```javascript
let content = '// Original content';
console.log('Before hook:', content);
await Reactium.Hook.run('arcli-file-gen', content, props);
console.log('After hook:', content);
```

---

## Integration with CLI Command System

Templates integrate with command discovery and registration:

**Command structure**:
```
.cli/commands/my-command/
├── index.js              # Command registration (NAME, COMMAND, ID exports)
├── actions.js            # ActionSequence steps
├── generator.js          # Optional: custom generator (or use default)
└── template/             # Template directory
    ├── file1.hbs         # Template for generated file 1
    └── file2.hbs         # Template for generated file 2
```

**Command index.js**:
```javascript
import actions from './actions.js';

export const NAME = 'my-command';

const ACTION = async ({ opt, props }) => {
    let params = flagsToParams({ opt, flags });
    // ... collect user input, conform params ...

    return generator({
        actions: actions(Spinner),
        params,
        props,
    });
};

export const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description('My custom command')
        .action(opt => ACTION({ opt, props }));

export const ID = NAME;
```

**Actions with template generation**:
```javascript
export default (Spinner) => {
    const { fs, handlebars } = arcli;

    return {
        generateFiles: ({ params, props }) => {
            const templateDir = arcli.normalizePath(__dirname, 'template');

            const templates = [
                { file: 'output1.js', template: 'file1.hbs' },
                { file: 'output2.js', template: 'file2.hbs' },
            ];

            for (const item of templates) {
                const templatePath = arcli.normalizePath(templateDir, item.template);
                const template = fs.readFileSync(templatePath, 'utf-8');
                const content = handlebars.compile(template)(params);

                const outputPath = arcli.normalizePath(params.destination, item.file);
                fs.writeFileSync(outputPath, content);
            }

            return Promise.resolve({ action: 'generateFiles', status: 200 });
        },
    };
};
```

---

## Source Reference Index

- **Handlebars Bootstrap**: `CLI/bootstrap.js:3,53`
- **Generator Wrapper**: `CLI/lib/generator.js:1-20`
- **Component Generator**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/component/componentGen.cjs:1-86`
- **Component Templates**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/component/template/`
- **CLI Command Templates**: `CLI/commands/cli/command/template/`
- **Init Download Pattern**: `CLI/commands/init/actions.js:1-114`
- **Component Command Hooks**: `Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/component/reactium-arcli.js:90-159`

---

## Related Documentation

- [CLI Command Discovery and Extensibility](./CLI_COMMAND_SYSTEM.md) - Command discovery architecture
- [CLI Commands Reference](./CLI_COMMANDS_REFERENCE.md) - Workflow-oriented command guide
- [Hook System](./HOOK_SYSTEM.md) - Hook-driven extensibility patterns
- [ActionSequence Pattern](./ACTION_SEQUENCE.md) - Sequential action execution
- [DDD Discovery](./DDD_DISCOVERY.md) - Auto-discovery of generated artifacts
