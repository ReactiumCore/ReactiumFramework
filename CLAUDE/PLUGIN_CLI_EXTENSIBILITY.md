<!-- v1.0.0 -->

# Plugin CLI Extensibility Pattern (arcli-install.js / arcli-publish.js)

**Purpose**: Allow plugins to extend CLI install/publish workflows with custom actions
**Pattern**: Dynamic discovery of plugin-specific action files during package operations
**Integration**: ActionSequence pattern, CLI command system, Plugin lifecycle

---

## Architecture Overview

### Core Concept

Plugins can provide **arcli-install.js** and **arcli-publish.js** files that export action factory functions. These actions are automatically discovered and merged into the CLI install/publish workflows.

**Key Innovation**: Plugins control their own setup/teardown without modifying core CLI code.

### Discovery Mechanism

```javascript
// Install: Post-install hook discovery
const actionFiles = globby([`${dir}/**/arcli-install.js`]);
// CLI/commands/package/install/actions.js:209

// Publish: Pre-publish hook discovery
const actionFiles = globby([`${cwd}/**/arcli-publish.js`]);
// CLI/commands/package/publish/actions.js:79
```

**Pattern**: Globby-based recursive search for files in plugin directory

---

## arcli-install.js Pattern

### File Location

**Discovered after plugin extraction**: `{app}_modules/{plugin-name}/**/arcli-install.js`

**Example**: `reactium_modules/@atomic-reactor/reactium-admin-core/arcli-install.js`

### Export Signature

```javascript
module.exports = (spinner, arcli, params, props) => {
    return {
        actionName: async ({ params, props, context, prevAction, action }) => {
            // Action implementation
        },
        // ... more actions
    };
};
```

**Parameters**:
- `spinner` - ora spinner instance for status updates
- `arcli` - Global CLI utilities (fs, chalk, globby, op, path, etc.)
- `params` - Command parameters (name, version, pluginDirectory, etc.)
- `props` - CLI props (cwd, config, etc.)

**Returns**: Object with action functions (same signature as ActionSequence actions)

### Execution Flow

```javascript
// 1. Plugin extracted to directory
// 2. Discover arcli-install.js files
const actionFiles = globby([`${dir}/**/arcli-install.js`]);

// 3. Import and execute factory for each file
const actions = {};
for (let i = 0; i < actionFiles.length; i++) {
    const file = actionFiles[i];
    const mod = await import(`file://${normalize(file)}`);
    const acts = mod(spinner, arcli, params, props); // Factory execution

    // 4. Namespace actions to avoid collisions
    Object.keys(acts).forEach(key =>
        op.set(actions, `postinstall_${i}_${key}`, acts[key]),
    );
}

// 5. Add pluginDirectory to params for plugin use
params['pluginDirectory'] = dir;

// 6. Execute merged actions via ActionSequence
await ActionSequence({ actions, options: { params, props } });
```

**Source**: CLI/commands/package/install/actions.js:206-224

### Action Namespacing

**Format**: `postinstall_{index}_{originalKey}`

**Example**: If plugin exports `{ init, prompt, inject }`, becomes:
- `postinstall_0_init`
- `postinstall_0_prompt`
- `postinstall_0_inject`

**Why**: Prevents action name collisions when multiple arcli-install.js files exist

### Available Utilities

From `arcli` global:
- **File operations**: `fs`, `globby`, `path`
- **Formatting**: `chalk`, `pad`
- **Data manipulation**: `op` (object-path), `_` (lodash)
- **User input**: `prompt` (from props), `inquirer`
- **Async control**: `ActionSequence`

### params.pluginDirectory

**Critical parameter injected by install command**:

```javascript
params['pluginDirectory'] = dir;
// dir = normalize(cwd, app + '_modules', slugify(name))
```

**Use case**: Locate plugin files for processing

---

## arcli-publish.js Pattern

### File Location

**Discovered before publish**: `{cwd}/**/arcli-publish.js`

**Example**: `./arcli-publish.js` (plugin root directory)

### Export Signature

```javascript
module.exports = (spinner) => {
    return {
        actionName: async ({ params, props, context, prevAction, action }) => {
            // Action implementation
        },
        // ... more actions
    };
};
```

**Parameters**:
- `spinner` - ora spinner instance for status updates

**Note**: Receives ONLY spinner (not full arcli/params/props like install)

**Access arcli**: Use global `arcli` object directly

**Returns**: Object with action functions

### Execution Flow

```javascript
// 1. Discover arcli-publish.js files
const actionFiles = globby([`${cwd}/**/arcli-publish.js`]);

// 2. Import and execute factory for each file
const actions = {};
for (let i = 0; i < actionFiles.length; i++) {
    const filePath = actionFiles[i];
    const mod = await import(`file://${normalize(filePath)}`);
    const acts = mod(spinner); // Factory execution

    // 3. Namespace actions to avoid collisions
    Object.keys(acts).forEach(key =>
        op.set(actions, `prepublish_${i}_${key}`, acts[key]),
    );
}

// 4. Execute merged actions via ActionSequence
return ActionSequence({
    actions,
    options: { params, props },
}).catch(err => {
    error(`Prepublish Error: ${err}`);
    exit();
});
```

**Source**: CLI/commands/package/publish/actions.js:76-99

### Action Namespacing

**Format**: `prepublish_{index}_{originalKey}`

**Example**: If plugin exports `{ init, compileCSS, complete }`, becomes:
- `prepublish_0_init`
- `prepublish_0_compileCSS`
- `prepublish_0_complete`

### Available Utilities

Access via global `arcli`:
- **File operations**: `arcli.fs`, `arcli.globby`, `arcli.path`
- **Formatting**: `arcli.chalk`
- **Data manipulation**: `arcli.op`, `arcli._`
- **Build tools**: `arcli.gulp` (if needed for compilation)

---

## Real-World Example: reactium-admin-core

### arcli-install.js - SCSS Import Integration

**File**: Reactium-Admin-Plugins/reactium_modules_old/reactium-admin-core/arcli-install.js

**Purpose**: Prompt user to inject admin styles into existing SCSS files

**Actions**:

```javascript
module.exports = spinner => {
    const { fs, chalk, globby, op } = arcli;
    let cwd, pluginDirectory, scss, styles, stylePaths, insert, append;

    return {
        init: async ({ params, props }) => {
            // Get plugin directory from params
            cwd = op.get(props, 'cwd');
            pluginDirectory = op.get(params, 'pluginDirectory');

            // Locate plugin SCSS file
            scss = normalize(pluginDirectory, 'style', '_admin.scss');

            // Find all user SCSS files
            styles = await globby([`${cwd}/src/**/*.scss`]);
            styles = styles.filter(
                file => String(path.basename(file)).substr(0, 1) !== '_',
            );

            spinner.stop(); // Stop for user prompt
        },

        updateSCSS: ({ params }) => {
            // Update relative path to node_modules in plugin SCSS
            let content = fs.readFileSync(scss, 'utf-8');
            let replacement = String(
                path.relative(
                    path.resolve(scss),
                    path.resolve(normalize(cwd, 'node_modules')),
                ),
            );
            // ... path manipulation
            fs.writeFileSync(scss, content);
        },

        prompt: ({ params }) => {
            // Skip if unattended
            const unattended = op.get(params, 'unattended');
            if (unattended === true) return;

            if (styles.length < 1) return;

            // Interactive prompt for SCSS injection
            return new Promise(resolve => {
                prompt.get([
                    {
                        name: 'insert',
                        description: 'Import Admin styles? (Y/N):',
                        pattern: /^y|n|Y|N/,
                        required: true,
                    },
                    {
                        name: 'inject',
                        description: 'Import Admin styles into: [list]',
                        ask: () => prompt.history('insert').value === true,
                        // ... select files
                    },
                    {
                        name: 'append',
                        description: 'Import at end of file? (Y/N):',
                        ask: () => prompt.history('insert').value === true,
                    },
                ], (err, input) => {
                    if (err) process.exit();
                    stylePaths = op.get(input, 'inject');
                    append = op.get(input, 'append');
                    insert = op.get(input, 'insert');
                    resolve();
                });
            });
        },

        inject: () => {
            if (!insert) return;

            // Inject @import statement into selected SCSS files
            stylePaths.forEach(filepath => {
                const importPath = `@import '${getPath(filepath, scss)}';`;
                let fileContent = String(fs.readFileSync(filepath, 'utf-8'));

                // Remove existing import if present
                fileContent = fileContent.split(importPath).join('');

                // Add import at beginning or end
                fileContent = append === true
                    ? `${fileContent}\n${importPath}`
                    : `${importPath}\n${fileContent}`;

                fs.writeFileSync(filepath, fileContent);
            });
        },

        complete: () => console.log(''),
    };
};
```

**Source**: Reactium-Admin-Plugins/reactium_modules_old/reactium-admin-core/arcli-install.js:1-187

**Pattern**: File discovery → User prompt → File injection

---

### arcli-publish.js - Asset Compilation

**File**: Reactium-Admin-Plugins/reactium_modules_old/reactium-admin-core/arcli-publish.js

**Purpose**: Compile SCSS to CSS before publishing plugin

**Actions**:

```javascript
const gulp = require('gulp');
const sass = require('gulp-sass')(require('node-sass'));
const cleanCSS = require('gulp-clean-css');
const prefix = require('gulp-autoprefixer');

module.exports = spinner => {
    let cwd;
    const message = (...text) => (spinner.text = text.join(' '));

    return {
        init: ({ props }) => {
            cwd = op.get(props, 'cwd');
        },

        compileCSS: async () => {
            const src = '**/admin-plugin.scss';
            const dest = normalize(cwd, 'static', 'assets', 'style');

            message('Generating', chalk.cyan('admin-plugin.css'));

            const styles = () => {
                return gulp
                    .src(src)
                    .pipe(sass({
                        functions: jsonFunctions,
                        importer: tildeImporter,
                        includePaths: [node_modules],
                    }))
                    .pipe(prefix('last 1 version'))
                    .pipe(cleanCSS())
                    .pipe(rename({ dirname: '' }))
                    .pipe(gulp.dest(dest));
            };

            gulp.task('styles', styles);
            await gulp.task('styles')();

            // Wait for gulp task completion
            return new Promise(resolve => setTimeout(resolve, 10000));
        },

        complete: () => {
            spinner.stopAndPersist({
                text: `Generated ${chalk.cyan('admin.css')} file`,
                symbol: chalk.green('✔'),
            });
            console.log('');
            return new Promise(resolve => setTimeout(resolve, 1000));
        },
    };
};
```

**Source**: Reactium-Admin-Plugins/reactium_modules_old/reactium-admin-core/arcli-publish.js:1-77

**Pattern**: Gulp-based asset compilation → Async wait for completion

---

## Integration with Core Workflows

### Install Command Flow

```
1. User: arcli install @scope/plugin
2. Core Actions:
   - init: Validate params, detect app type
   - check: Verify Reactium/Actinium project
   - fetch: Download plugin from registry
   - version: Resolve version (latest or specific)
   - download: Stream tar.gz to tmp directory
   - extract: Unpack tar archive
   - move: Copy to {app}_modules/{plugin}
   - registerPkg: Update package.json dependencies
   - npm: Run npm install (if --npm flag)
3. Plugin Actions (arcli-install.js):
   - postinstall_0_init: Plugin-specific setup
   - postinstall_0_prompt: User configuration
   - postinstall_0_inject: File modifications
   - postinstall_0_complete: Cleanup
4. Complete: Display success message
```

**Source**: CLI/commands/package/install/actions.js:33-230

### Publish Command Flow

```
1. User: arcli publish
2. Core Actions:
   - init: Validate authentication
   - bail: Exit if not authorized
   - validate: Check registry permissions
   - package: Update package.json
3. Plugin Actions (arcli-publish.js):
   - prepublish_0_init: Plugin-specific setup
   - prepublish_0_compileCSS: Asset compilation
   - prepublish_0_complete: Cleanup
4. Core Actions (continued):
   - tmp: Create temporary publish directory
   - compress: Create tar.gz archive
   - publish: Upload to registry
   - cleanup: Remove tmp directory
   - complete: Display success message
```

**Source**: CLI/commands/package/publish/actions.js:33-214

---

## Best Practices

### 1. Action Naming Conventions

```javascript
// ✅ GOOD: Descriptive, verb-based names
{
    init: async () => {},           // Setup/initialization
    prompt: async () => {},         // User interaction
    compile: async () => {},        // Build operations
    inject: async () => {},         // File modifications
    complete: async () => {},       // Cleanup/completion
}

// ❌ BAD: Generic names that might collide
{
    run: async () => {},            // Too generic
    do: async () => {},             // Unclear purpose
    action1: async () => {},        // Non-descriptive
}
```

**Why**: Even with namespacing, descriptive names improve debugging

### 2. Spinner State Management

```javascript
// ✅ GOOD: Stop spinner for user prompts
prompt: async ({ params }) => {
    spinner.stop(); // Stop before inquirer/prompt
    const answer = await inquirer.prompt([...]);
    return answer;
},

// ✅ GOOD: Update spinner text for progress
compileCSS: async () => {
    spinner.text = 'Compiling SCSS...';
    await gulpTask();
    spinner.text = 'Compilation complete';
},
```

**Why**: User prompts fail with active spinner; status updates aid debugging

### 3. Unattended Mode Support

```javascript
// ✅ GOOD: Respect unattended flag
prompt: async ({ params }) => {
    const unattended = op.get(params, 'unattended');
    if (unattended === true) return; // Skip interactive prompts

    // Interactive prompt only if attended
    return inquirer.prompt([...]);
},
```

**Why**: CI/CD pipelines require non-interactive installation

### 4. Error Handling

```javascript
// ✅ GOOD: Graceful error handling with cleanup
inject: async () => {
    try {
        fs.writeFileSync(filepath, content);
    } catch (error) {
        spinner.fail(`Error writing file: ${error.message}`);
        throw error; // Propagate to ActionSequence
    }
},
```

**Why**: ActionSequence catches errors and halts workflow

### 5. Async Operation Completion

```javascript
// ✅ GOOD: Wait for async operations (Gulp, streams, etc.)
compileCSS: async () => {
    await gulp.task('styles')();

    // Wait for file system operations to complete
    return new Promise(resolve => setTimeout(resolve, 10000));
},
```

**Why**: Gulp/streams may not flush immediately; ensures files written before next action

### 6. Namespace Awareness

```javascript
// Plugin exports these actions
module.exports = spinner => ({
    init: () => {},
    prompt: () => {},
    inject: () => {},
});

// Core command namespaces them as:
// postinstall_0_init
// postinstall_0_prompt
// postinstall_0_inject

// If multiple arcli-install.js files:
// postinstall_0_init (first file)
// postinstall_1_init (second file)
```

**Why**: Understanding namespacing helps debug ActionSequence execution order

---

## Common Use Cases

### 1. Database Migration/Initialization

```javascript
module.exports = (spinner, arcli, params, props) => {
    const { Actinium, Session } = arcli;

    return {
        initDB: async () => {
            spinner.text = 'Initializing database...';

            const sessionToken = Session();
            await Actinium.Cloud.run(
                'plugin-install-db',
                { pluginName: 'my-plugin' },
                { sessionToken, useMasterKey: true }
            );
        },
    };
};
```

**Pattern**: Use Actinium SDK to run cloud functions for DB setup

### 2. Configuration File Generation

```javascript
module.exports = (spinner, arcli, params, props) => {
    const { fs, path, inquirer } = arcli;
    const { pluginDirectory } = params;

    return {
        createConfig: async () => {
            const configPath = path.join(pluginDirectory, 'config.json');

            if (fs.existsSync(configPath)) {
                spinner.info('Config already exists');
                return;
            }

            const { apiKey } = await inquirer.prompt([
                { name: 'apiKey', message: 'Enter API key:' }
            ]);

            fs.writeJsonSync(configPath, { apiKey }, { spaces: 2 });
        },
    };
};
```

**Pattern**: Check existence → Prompt → Write config

### 3. User Onboarding Flow

```javascript
module.exports = (spinner, arcli, params, props) => {
    const { chalk, inquirer } = arcli;

    return {
        welcome: async () => {
            spinner.stop();
            console.log(chalk.cyan('\nWelcome to My Plugin!\n'));

            const { proceed } = await inquirer.prompt([
                {
                    name: 'proceed',
                    type: 'confirm',
                    message: 'Run setup wizard?',
                    default: true,
                }
            ]);

            if (!proceed) process.exit(0);
        },

        setupWizard: async () => {
            // Multi-step configuration
        },
    };
};
```

**Pattern**: Welcome message → Confirmation → Setup flow

### 4. Dependency Verification

```javascript
module.exports = (spinner, arcli, params, props) => {
    const { fs, path, chalk } = arcli;
    const { cwd } = props;

    return {
        checkDeps: async () => {
            const pkg = fs.readJsonSync(path.join(cwd, 'package.json'));
            const required = ['react', 'react-dom', '@atomic-reactor/reactium-core'];

            const missing = required.filter(dep =>
                !pkg.dependencies[dep] && !pkg.devDependencies[dep]
            );

            if (missing.length > 0) {
                spinner.fail(`Missing dependencies: ${chalk.cyan(missing.join(', '))}`);
                console.log('\nInstall with: npm install', missing.join(' '));
                process.exit(1);
            }
        },
    };
};
```

**Pattern**: Read package.json → Verify dependencies → Exit with instructions

### 5. Asset Compilation (Publish)

```javascript
module.exports = spinner => {
    const { fs, path, chalk } = arcli;

    return {
        buildAssets: async () => {
            spinner.text = 'Building assets...';

            // Webpack, Rollup, Gulp, etc.
            await buildProcess();

            // Verify output
            const distPath = path.join(process.cwd(), 'dist');
            if (!fs.existsSync(distPath)) {
                throw new Error('Build failed: dist directory not found');
            }
        },
    };
};
```

**Pattern**: Run build → Verify output → Throw on failure

---

## Common Gotchas

### 1. **Spinner Not Stopped Before Prompts**

```javascript
// ❌ PROBLEM: Prompt fails with active spinner
prompt: async () => {
    const answer = await inquirer.prompt([...]); // Fails!
    return answer;
},

// ✅ SOLUTION: Stop spinner first
prompt: async () => {
    spinner.stop();
    const answer = await inquirer.prompt([...]);
    return answer;
},
```

**Why**: Inquirer/prompt libraries conflict with ora spinner output

**Symptom**: Prompt displays incorrectly or hangs

---

### 2. **params.pluginDirectory Not Available in Publish**

```javascript
// ❌ PROBLEM: pluginDirectory only available in install
// arcli-publish.js
module.exports = spinner => {
    return {
        init: ({ params }) => {
            const dir = params.pluginDirectory; // undefined!
        },
    };
};

// ✅ SOLUTION: Use props.cwd (current working directory)
module.exports = spinner => {
    return {
        init: ({ props }) => {
            const dir = props.cwd; // Plugin root directory
        },
    };
};
```

**Why**: Publish runs FROM plugin directory, install runs AFTER extraction

**Symptom**: File operations fail or target wrong directory

---

### 3. **Async Operations Not Awaited**

```javascript
// ❌ PROBLEM: Gulp task doesn't complete before next action
compileCSS: async () => {
    gulp.task('styles')(); // Not awaited!
    // Next action runs before CSS compiled
},

// ✅ SOLUTION: Await + artificial delay for file system flush
compileCSS: async () => {
    await gulp.task('styles')();
    return new Promise(resolve => setTimeout(resolve, 10000));
},
```

**Why**: Gulp/streams are async; file system operations may not flush immediately

**Symptom**: Published plugin missing compiled assets

---

### 4. **Action Name Collisions (Pre-Namespacing)**

```javascript
// ❌ PROBLEM: Multiple plugins export same action names
// Plugin A: arcli-install.js
{ init: () => {}, prompt: () => {} }

// Plugin B: arcli-install.js
{ init: () => {}, prompt: () => {} }

// Result: Actions overwrite each other (if not namespaced)
```

**Why**: Core command namespaces to prevent this (`postinstall_0_init`, `postinstall_1_init`)

**Solution**: Framework handles this automatically; awareness helps debugging

---

### 5. **Direct arcli Access in Install Factory**

```javascript
// ❌ PROBLEM: Assuming global arcli in factory parameter
module.exports = (spinner, arcli, params, props) => {
    // arcli parameter is undefined (it's global)
    const { fs } = arcli; // undefined!
};

// ✅ SOLUTION: Access arcli global directly
module.exports = (spinner) => {
    const { fs, chalk, globby } = arcli; // Global arcli
    return { ... };
};
```

**Why**: `arcli` is a global object, not passed as parameter (despite signature)

**Symptom**: Utilities undefined, file operations fail

**Note**: Install DOES receive arcli parameter (actions.js:217), but best practice is global access for consistency with publish

---

### 6. **Not Respecting Unattended Flag**

```javascript
// ❌ PROBLEM: Always prompts, breaks CI/CD
prompt: async () => {
    return inquirer.prompt([...]); // Breaks automated installs
},

// ✅ SOLUTION: Skip prompts when unattended
prompt: async ({ params }) => {
    if (params.unattended === true) {
        // Use defaults
        return;
    }
    return inquirer.prompt([...]);
},
```

**Why**: CI/CD pipelines pass `--unattended` flag to skip interaction

**Symptom**: Installation hangs in CI/CD environment

---

### 7. **Modifying Core Files**

```javascript
// ❌ PROBLEM: Modifying project files without permission
inject: () => {
    fs.writeFileSync('/path/to/project/file.js', newContent);
},

// ✅ SOLUTION: Prompt user first
inject: async () => {
    if (!userConfirmed) return;
    fs.writeFileSync('/path/to/project/file.js', newContent);
},
```

**Why**: Plugins shouldn't modify project files without consent

**Best Practice**: Always prompt before modifying existing files

---

### 8. **Error Swallowing**

```javascript
// ❌ PROBLEM: Errors caught but not propagated
action: async () => {
    try {
        await riskyOperation();
    } catch (error) {
        console.log('Error:', error); // Logged but swallowed
        // ActionSequence continues!
    }
},

// ✅ SOLUTION: Rethrow errors to halt workflow
action: async () => {
    try {
        await riskyOperation();
    } catch (error) {
        spinner.fail('Operation failed');
        throw error; // Halts ActionSequence
    }
},
```

**Why**: ActionSequence only halts on uncaught errors/rejections

**Symptom**: Installation continues despite failures, incomplete setup

---

## Debugging Techniques

### 1. **Enable Verbose Logging**

```javascript
module.exports = (spinner, arcli, params, props) => {
    const DEBUG = process.env.DEBUG === 'true';

    const log = (...args) => {
        if (DEBUG) {
            spinner.stop();
            console.log('[Plugin Debug]', ...args);
            spinner.start();
        }
    };

    return {
        init: async () => {
            log('params:', params);
            log('pluginDirectory:', params.pluginDirectory);
        },
    };
};
```

**Usage**: `DEBUG=true arcli install @scope/plugin`

### 2. **Spinner Text for Progress Tracking**

```javascript
return {
    action1: async () => {
        spinner.text = 'Starting action1...';
        await operation1();
        spinner.text = 'Action1 complete';
    },
    action2: async () => {
        spinner.text = 'Starting action2...';
        await operation2();
        spinner.text = 'Action2 complete';
    },
};
```

**Why**: Helps identify where workflow hangs/fails

### 3. **File System Existence Checks**

```javascript
return {
    verify: async () => {
        const files = [
            params.pluginDirectory,
            path.join(params.pluginDirectory, 'config.json'),
        ];

        files.forEach(file => {
            const exists = fs.existsSync(file);
            console.log(`${file}: ${exists ? '✓' : '✗'}`);
        });
    },
};
```

**Why**: Confirms paths resolve correctly before operations

### 4. **ActionSequence Context Inspection**

```javascript
return {
    debug: async ({ context, prevAction }) => {
        console.log('Previous action:', prevAction?.name);
        console.log('Context:', context);
        console.log('All action results:', Object.keys(context));
    },
};
```

**Why**: ActionSequence stores return values in context; helps track data flow

---

## Integration Points

### With ActionSequence Pattern

**See**: [CLAUDE/ACTIONSEQUENCE_PATTERN.md](./ACTIONSEQUENCE_PATTERN.md)

**Key Integration**:
- Plugin actions merged with core actions
- Sequential execution with shared context
- Error propagation halts workflow
- Return values accessible via context object

### With CLI Command System

**See**: [CLAUDE/CLI_COMMAND_SYSTEM.md](./CLI_COMMAND_SYSTEM.md)

**Key Integration**:
- Discovery happens within install/publish commands
- Uses globby for file discovery (same as command discovery)
- Leverages arcli global utilities

### With Plugin Lifecycle

**Install lifecycle**:
1. Plugin downloaded/extracted
2. arcli-install.js discovered
3. Actions executed (postinstall phase)
4. Plugin ready for use

**Publish lifecycle**:
1. arcli-publish.js discovered
2. Actions executed (prepublish phase)
3. Assets compiled/prepared
4. Plugin packaged and uploaded

---

## API Reference

### Factory Function Signature (Install)

```typescript
type InstallActionFactory = (
    spinner: ora.Ora,
    arcli: ArCLI,
    params: InstallParams,
    props: CLIProps
) => ActionMap;

interface InstallParams {
    name: string;              // Plugin name (@scope/name)
    version?: string;          // Plugin version
    pluginDirectory: string;   // Extracted plugin path
    app?: string;              // Registry app ID
    server?: string;           // Registry server URL
    npm?: boolean;             // Run npm install flag
    unattended?: boolean;      // Skip prompts flag
}
```

### Factory Function Signature (Publish)

```typescript
type PublishActionFactory = (
    spinner: ora.Ora
) => ActionMap;

// Access params/props via action parameters
interface PublishParams {
    pkg: object;               // package.json contents
    version: string;           // Publish version
    private: boolean;          // Private plugin flag
    sessionToken: string;      // Auth session token
    tmpDir: string;            // Temporary publish directory
}
```

### Action Function Signature (Both)

```typescript
type ActionFunction = (options: ActionOptions) => Promise<void> | void;

interface ActionOptions {
    params: InstallParams | PublishParams;
    props: CLIProps;
    context: Record<string, any>;   // Accumulated return values
    prevAction: ActionResult | null;
    action: ActionMetadata;
}
```

**See**: [CLAUDE/ACTIONSEQUENCE_PATTERN.md](./ACTIONSEQUENCE_PATTERN.md#action-function-signature)

---

## Comparison with Other Extension Patterns

| Pattern | Scope | Discovery | Use Case |
|---------|-------|-----------|----------|
| **arcli-install.js** | Plugin install workflow | Globby recursive | Post-install setup, file injection |
| **arcli-publish.js** | Plugin publish workflow | Globby recursive | Pre-publish compilation, asset prep |
| **reactium-arcli.js** | CLI command extension | DDD (.cli directories) | Custom CLI commands |
| **arcli-hooks.js** | Global CLI hooks | Root directory | Modify ALL command workflows |
| **plugin.js** | Runtime plugin | DDD (reactium_modules) | Add runtime features |

**See**: [CLAUDE/CLI_COMMAND_SYSTEM.md](./CLI_COMMAND_SYSTEM.md#hook-integration-patterns)

---

## Summary

**Plugin CLI Extensibility Pattern** enables plugins to:
- ✅ Extend install workflow with custom setup actions
- ✅ Extend publish workflow with build/compilation steps
- ✅ Prompt users for configuration during installation
- ✅ Modify project files (with consent)
- ✅ Run database migrations or API initialization
- ✅ Compile assets before publishing
- ✅ Verify dependencies and environment
- ✅ Provide onboarding flows for complex plugins

**Critical Files**:
- CLI/commands/package/install/actions.js:206-224 (install discovery)
- CLI/commands/package/publish/actions.js:76-99 (publish discovery)
- Reactium-Admin-Plugins/reactium_modules_old/reactium-admin-core/arcli-install.js (real example)
- Reactium-Admin-Plugins/reactium_modules_old/reactium-admin-core/arcli-publish.js (real example)

**Next Steps**: Explore [CLI Template System](./CLI_TEMPLATE_SYSTEM.md) for file generation patterns, [ActionSequence Pattern](./ACTIONSEQUENCE_PATTERN.md) for workflow control.
