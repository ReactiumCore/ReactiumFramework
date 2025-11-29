<!-- v1.0.0 -->

# CLI Command Discovery and Extensibility System

**Purpose**: Document the Reactium CLI (aka ARCLI) command discovery architecture, including globby-based multi-location discovery, two-phase initialization, command module structure, and hook-driven extensibility patterns.

**Target Audience**: Claude Code assisting developers creating custom CLI commands, debugging discovery issues, or building reusable command packages.

---

## Overview

The Reactium/Actinium CLI (`npx reactium`) uses a sophisticated command discovery system that finds and loads command modules from multiple locations with configurable depth limits. Commands can be extended via Hook system integration at both global and command-specific levels.

**Note on Naming**: The CLI command is `npx reactium` (current user-facing name), but internal code uses the `arcli` global object for historical reasons. Old documentation may reference `arcli`, but users should always run `npx reactium`.

**Key Mechanisms**:

- Multi-location globby-based discovery pattern
- Two-phase initialization (shortInit vs longInit for performance)
- Commander.js program registration
- Hook-driven extensibility (global + command-specific hooks)
- Workspace module support (reactium_modules, actinium_modules, node_modules)

---

## Architecture Components

### 1. Bootstrap Process

**Source**: `CLI/bootstrap.js:1-247`

The bootstrap phase initializes the global `arcli` object and loads configuration files:

```javascript
// Global arcli object provides utilities to all commands
global.arcli = {
  _,
  ActionSequence,
  Actinium,
  Spinner,
  axios,
  chalk,
  commands,
  crypto,
  decompress,
  fs,
  path,
  generator,
  globby,
  handlebars,
  importer,
  inquirer,
  mergeActions,
  moment,
  normalizePath,
  op,
  ora,
  portscanner,
  prettier,
  prompt,
  props,
  root,
  rootCommands,
  runCommand,
  semver,
  slugify,
  table,
  tar,
  targetApp,
  tmp,
  useSpinner,
  SDK,
};
```

**Configuration Hierarchy** (later configs override earlier):

1. `CLI/config.json` - Base CLI configuration
2. `[cwd]/CLI/.cli/config.json` - Application config (legacy, rarely exists)
3. `[homedir]/.arcli/config.json` - User-specific config
4. `[cwd]/.cli/config.json` - Project-specific config

**Hook Loading** (`bootstrap.js:104-110`):

```javascript
// Import all arcli-hooks.js files (global hooks)
const hooks = globby([path.join(cwd, '/**/arcli-hooks.js')]);
while (hooks.length > 0) {
  const hook = hooks.shift();
  await importer(hook);
}
```

---

### 2. Command Discovery Locations

**Source**: `CLI/config.json:7-13`, `CLI/bootstrap.js:174-185`

Commands are discovered from multiple locations in priority order:

```json
{
  "commands": [
    "[root]/commands", // Reactium CLI built-in commands
    "[cwd]/.cli/commands", // Project-specific commands
    "[cwd]/actinium_modules/**/.cli", // Actinium workspace modules
    "[cwd]/node_modules/**/.cli", // NPM packages with CLI
    "[cwd]/reactium_modules/**/.cli" // Reactium workspace modules
  ],
  "depth": 25
}
```

**Glob Pattern Resolution** (`bootstrap.js:144-152`):

```javascript
const normalizeCommandPath = (dir) =>
  path
    .normalize(
      String(`${dir}/**/*index.js`)
        .replace(/\[root\]/gi, global.arcli.props.root)
        .replace(/\[cwd\]/gi, global.arcli.props.cwd)
    )
    .split(/[\\\/]/g)
    .join(path.posix.sep);
```

**Discovery Depth**: Configurable via `depth` field (default: 25 levels deep)

---

### 3. Two-Phase Initialization

**Source**: `CLI/arcli-node.js:111-194`

Reactium CLI uses two-phase initialization for performance optimization:

#### Phase 1: Short Init (Fast Path)

**Purpose**: Quickly execute root commands without scanning all locations

```javascript
const shortInit = () =>
  new Promise(async (resolve, reject) => {
    const program = createCommand();
    program.allowUnknownOption(true); // Allow unknown options
    program.exitOverride(); // Prevent exit on error

    // Load ONLY root commands ([root]/commands)
    await cmds(arcli.rootCommands());

    // Parse options to detect help flags
    const { operands = [], unknown: flags = [] } = program.parseOptions([
      ...process.argv,
    ]);

    // Trigger long init if help requested or unknown command
    if (flags.find((flag) => flag === '-h' || flag === '--help')) {
      reject('help');
      return;
    }

    if (commandOperand && !program._findCommand(commandOperand)) {
      reject('unknown command');
      return;
    }

    program.parse(process.argv);
    resolve();
  });
```

**When Short Init is Used**:

- Command is a built-in root command
- No help flag present
- Command exists in root commands

#### Phase 2: Long Init (Comprehensive Discovery)

**Purpose**: Full command discovery across all locations

```javascript
const longInit = async () => {
  const program = createCommand();

  // Search ALL configured command locations
  await cmds(arcli.commands());

  // Attach all discovered commands
  attachCommands({ program, props, arcli });

  // Validate and execute
  if (!validArguments(program)) process.exit(1);
  program.parse(process.argv);

  // Show help if no args provided
  if (!process.argv.slice(2).length) program.help();
};
```

**When Long Init is Used**:

- Help flag detected in short init
- Unknown command in short init
- No command specified (show help)

**Initialization Flow** (`arcli-node.js:185-194`):

```javascript
const initialize = async () => {
  // Try short init, fallback to long init on error
  try {
    await shortInit().catch(longInit);
  } catch (err) {}
};
```

---

### 4. Command Module Structure

**Required Exports**:

Commands MUST export specific properties for discovery:

```javascript
// Simple command (registers at root level)
export const NAME = 'mycommand';
export const COMMAND = ({ program, props }) => {
  return program
    .command(NAME)
    .description('My command description')
    .action((opt) => ACTION({ opt, props }))
    .option('-f, --flag [value]', 'Flag description');
};

// Subcommand (namespaced)
export const ID = 'parent.child'; // Uses dot notation for nesting
export const COMMAND = ({ program, props }) => {
  /* ... */
};
```

**Discovery Logic** (`arcli-node.js:30-63`):

```javascript
const cmds = async (globs) => {
  const commands = props.commands;
  const subcommands = props.subcommands;

  for (let i = 0; i < globs.length; i++) {
    const cmd = globs[i];
    const req = await import(`file://${cmd}`);

    // Check for COMMAND function export
    if (op.has(req, 'COMMAND') && typeof req.COMMAND === 'function') {
      if (op.has(req, 'NAME')) {
        // Root-level command
        commands[req.NAME] = req;
      } else if (op.has(req, 'ID')) {
        // Subcommand (uses ID for namespacing)
        let { ID } = req;
        ID = String(ID).replace(/\<|\>/g, '').replace(/\s/g, '.');
        subcommands[ID] = req;
      }
    }
  }
};
```

---

### 5. Command Structure Pattern

**Example**: `CLI/commands/label/index.js:1-249`

Standard command anatomy:

```javascript
const { chalk, fs, message, op, prettier } = arcli; // Internal global object

// 1. NAME: Command identifier
export const NAME = 'label';

// 2. DESC: Description for help text
const DESC = 'Label a directory for use in other commands.';

// 3. CANCELED: Error message
const CANCELED = 'Action canceled!';

// 4. FLAGS: Command-line flags
const FLAGS = ['path', 'key'];

// 5. SCHEMA: Input validation schema (for prompt library)
const SCHEMA = ({ props }) => ({
  properties: {
    path: {
      description: 'Path:',
      required: true,
      default: props.cwd,
      conform: (value) => fs.existsSync(value),
      message: 'Path must be a valid existing path.',
    },
  },
});

// 6. CONFIRM: Confirmation prompt
const CONFIRM = ({ props, params, msg }) => {
  return new Promise((resolve, reject) => {
    prompt.get(
      {
        properties: {
          confirmed: {
            description: `${msg} ${chalk.cyan('(Y/N):')}`,
            pattern: /^y|n|Y|N/,
            before: (val) => String(val).toUpperCase() === 'Y',
          },
        },
      },
      (error, input = {}) => {
        if (error || !input.confirmed) {
          reject(error);
        } else {
          resolve(params);
        }
      }
    );
  });
};

// 7. ACTION: Main command logic
const ACTION = async ({ opt, props }) => {
  const { prompt } = props;
  const schema = SCHEMA({ props });
  const ovr = FLAGS_TO_PARAMS({ opt });

  prompt.override = ovr;
  prompt.start();

  return new Promise((resolve, reject) => {
    prompt.get(schema, (err, input = {}) => {
      if (err) {
        reject(`${NAME} ${err.message}`);
        return;
      }
      const params = CONFORM({ input, props });
      resolve();
    });
  })
    .then(() => CONFIRM({ props, params }))
    .then(() => GENERATOR({ params, props }))
    .catch((err) => message(err.message));
};

// 8. HELP: Custom help text
const HELP = () => {
  console.log('');
  console.log('Example:');
  console.log(
    `   $ npx reactium ${NAME} --path '[cwd]/some/path' --key 'labels.key'`
  );
  console.log('');
};

// 9. COMMAND: Commander.js registration
export const COMMAND = ({ program, props }) =>
  program
    .command(NAME)
    .description(DESC)
    .action((opt) => ACTION({ opt, props }))
    .option('-p, --path [path]', 'Path to label.')
    .option('-k, --key [key]', 'Key to use for label.')
    .on('--help', HELP);
```

---

### 6. Hook-Driven Extensibility

Commands can be extended via the Hook system at two levels:

#### Global Hooks (arcli-hooks.js)

**Location**: `[cwd]/**/arcli-hooks.js`

**Purpose**: Register hooks that apply across multiple commands

**Discovery**: `bootstrap.js:104-110` - Loaded during bootstrap phase

**Example**: Global validation hook

```javascript
// [cwd]/arcli-hooks.js
import { Hook } from '@atomic-reactor/reactium-sdk-core/core';

Hook.register(
  'arcli-before-command',
  async ({ command, params }) => {
    // Global pre-command validation
    if (params.requiresAuth && !isAuthenticated()) {
      throw new Error('Authentication required');
    }
  },
  Hook.Enums.priority.highest
);
```

#### Command-Specific Hooks (reactium-arcli.js)

**Location**: `[command-dir]/reactium-arcli.js`

**Purpose**: Extend specific commands with custom behavior

**Discovery Pattern** (example from `reactium-core/.cli/commands/reactium/component/index.js:66-81`):

```javascript
const ACTION = async ({ opt, props }) => {
  // Load command-specific hooks
  for (const file of arcli
    .globby([
      './src/**/reactium-arcli.js',
      './reactium_modules/**/reactium-arcli.js',
      './node_modules/**/reactium-arcli.js',
    ])
    .map(normalizeWindows)) {
    await import(file);
  }

  // Hook integration points throughout command lifecycle
  await Reactium.Hook.run('arcli-component-init', { props, params, ENUMS });
  await Reactium.Hook.run('arcli-component-input', { props, params, ENUMS });
  await Reactium.Hook.run('arcli-component-conform', { props, params, ENUMS });
  await Reactium.Hook.run('arcli-component-confirm', { props, params, ENUMS });
  await Reactium.Hook.run('arcli-component-actions', {
    props,
    params,
    actions,
  });
};
```

**Command Hook Registration Example** (`reactium-core/.cli/commands/reactium/component/reactium-arcli.js:125-158`):

```javascript
// Default hooks for component command
const { Reactium } = arcli;

// Hook: Modify input prompts
Reactium.Hook.register(
  'arcli-component-input',
  async ({ inquirer, params }) => {
    const input = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Component Name',
      },
      {
        type: 'confirm',
        name: 'hooks',
        message: 'Reactium Hooks?',
        default: true,
      },
    ]);
    Object.entries(input).forEach(([key, val]) => (params[key] = val));
  },
  Reactium.Enums.priority.highest,
  'arcli-component-input'
);

// Hook: Modify parameter conforming
Reactium.Hook.register(
  'arcli-component-conform',
  async ({ params }) => {
    params.destination = formatDestination(params.destination);
    params.name = camelcase(params.name, { pascalCase: true });
  },
  Reactium.Enums.priority.highest
);

// Hook: Add generator actions
Reactium.Hook.register(
  'arcli-component-actions',
  ({ actions }) => {
    actions['component'] = componentGen;
  },
  Reactium.Enums.priority.highest
);
```

---

### 7. ActionSequence Pattern

**Source**: `CLI/lib/generator.js:1-21`

Commands typically use ActionSequence for multi-step file generation:

```javascript
export default async ({ actions, params, props }) => {
  const { Spinner: spinner, ActionSequence, chalk } = arcli;

  spinner.start();

  try {
    const success = await ActionSequence({
      actions, // Object with priority-based actions
      options: { arcli, params, props },
    });

    spinner.succeed('complete!');
    return success;
  } catch (error) {
    spinner.fail(error.message ? error.message : 'failed!');
    console.error(chalk.red('Error'), error.message);
    throw error;
  }
};
```

**Actions Object Structure**:

```javascript
const actions = {
  'create-directory': async ({ params, props }) => {
    fs.ensureDirSync(params.destination);
  },
  'generate-files': async ({ params, props }) => {
    // File generation logic
  },
  'register-component': async ({ params, props }) => {
    // Registration logic
  },
};
```

Actions execute in key order, support async/await, and can throw errors to halt execution.

---

## Real-World Usage Patterns

### Pattern 1: Project-Specific Command

**Location**: `[project]/.cli/commands/deploy/index.js`

```javascript
export const NAME = 'deploy';
export const COMMAND = ({ program, props }) =>
  program
    .command(NAME)
    .description('Deploy this project to production')
    .option('-e, --env [environment]', 'Target environment', 'production')
    .action(async (opt) => {
      const { env } = opt;
      console.log(`Deploying to ${env}...`);

      // Project-specific deployment logic
      await arcli.runCommand('npm', ['run', 'build']);
      await arcli.runCommand('rsync', ['-avz', 'build/', `server:${env}/`]);
    });
```

**Discovery**: Picked up via `[cwd]/.cli/commands` glob pattern

### Pattern 2: Reusable NPM Package Command

**Package Structure**:

```
my-cli-package/
├── package.json
├── .cli/
│   ├── commands/
│   │   └── mytool/
│   │       └── index.js
│   └── config.json
```

**Discovery**: Picked up via `[cwd]/node_modules/**/.cli` glob pattern

**Installation**:

```bash
npm install my-cli-package
npx reactium mytool --option value  # Command auto-discovered
```

### Pattern 3: Extending Core Commands

**Location**: `[project]/src/components/MyComponent/reactium-arcli.js`

```javascript
// Extend core component command to add custom templates
const { Reactium } = arcli;

Reactium.Hook.register(
  'arcli-component-actions',
  ({ actions, params }) => {
    // Add custom component template generation
    if (params.template === 'custom') {
      actions['custom-template'] = async ({ params }) => {
        // Generate from custom template
      };
    }
  },
  Reactium.Enums.priority.high
);

Reactium.Hook.register(
  'arcli-component-input',
  async ({ inquirer, params }) => {
    // Add custom template option to prompts
    const { template } = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: 'Component template',
        choices: ['default', 'custom', 'advanced'],
      },
    ]);
    params.template = template;
  },
  Reactium.Enums.priority.high
);
```

### Pattern 4: Workspace Module Commands

**Location**: `reactium_modules/@my-org/my-plugin/.cli/commands/generate/index.js`

```javascript
export const NAME = 'my-plugin:generate';
export const COMMAND = ({ program, props }) =>
  program
    .command(NAME)
    .description('Generate my-plugin artifacts')
    .action(async () => {
      // Plugin-specific generation logic
    });
```

**Discovery**: Picked up via `[cwd]/reactium_modules/**/.cli` glob pattern

---

## Common Hook Patterns for Commands

### Input Hook (Prompts)

**Purpose**: Collect user input via inquirer prompts

```javascript
Reactium.Hook.register(
  'arcli-[command]-input',
  async ({ inquirer, params, props }) => {
    const answers = await inquirer.prompt([
      { type: 'input', name: 'field1', message: 'Field 1?' },
      { type: 'confirm', name: 'field2', message: 'Field 2?', default: true },
    ]);
    Object.entries(answers).forEach(([key, val]) => (params[key] = val));
  }
);
```

### Conform Hook (Parameter Transformation)

**Purpose**: Transform/validate parameters before execution

```javascript
Reactium.Hook.register('arcli-[command]-conform', async ({ params, props }) => {
  params.destination = path.resolve(params.destination);
  params.name = camelcase(params.name, { pascalCase: true });

  // Validation
  if (!fs.existsSync(params.destination)) {
    throw new Error('Destination does not exist');
  }
});
```

### Confirm Hook (Pre-execution Confirmation)

**Purpose**: Show summary and confirm before execution

```javascript
Reactium.Hook.register(
  'arcli-[command]-confirm',
  async ({ inquirer, params }) => {
    console.log('Summary:', JSON.stringify(params, null, 2));

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed?',
        default: false,
      },
    ]);

    params.confirm = confirm;
  }
);
```

### Actions Hook (Generator Actions)

**Purpose**: Register file generation actions

```javascript
Reactium.Hook.register('arcli-[command]-actions', ({ actions, params }) => {
  actions['create-structure'] = async ({ params, props }) => {
    fs.ensureDirSync(params.destination);
  };

  actions['generate-files'] = async ({ params, props, spinner }) => {
    spinner.text = 'Generating files...';
    // File generation logic
  };
});
```

---

## Configuration Customization

### Project-Specific Config

**Location**: `[project]/.cli/config.json`

```json
{
  "commands": [
    "[root]/commands",
    "[cwd]/.cli/commands",
    "[cwd]/custom_modules/**/.cli",
    "[cwd]/reactium_modules/**/.cli"
  ],
  "depth": 10,
  "custom": {
    "deployment": {
      "staging": "staging.example.com",
      "production": "example.com"
    }
  }
}
```

**Access in Commands**:

```javascript
const { config } = arcli.props;
const stagingUrl = op.get(config, 'custom.deployment.staging');
```

---

## Debugging Command Discovery

### Enable Discovery Logging

Add temporary logging to bootstrap:

```javascript
// CLI/bootstrap.js (temporary for debugging)
const commands = () => {
  const dirs = config.commands || [];
  const globs = dirs.map((dir) => normalizeCommandPath(dir));

  console.log('Searching for commands in:', globs);

  const deep = op.get(config, 'depth', 25);
  const found = globby(globs, { deep });

  console.log('Found commands:', found);

  return found;
};
```

### Check Command Export Structure

```javascript
// Test command exports
import * as cmd from './path/to/command/index.js';

console.log('Has NAME?', 'NAME' in cmd);
console.log('Has ID?', 'ID' in cmd);
console.log('Has COMMAND?', 'COMMAND' in cmd);
console.log('COMMAND is function?', typeof cmd.COMMAND === 'function');
```

### Verify Command Registration

```bash
# List all discovered commands
npx reactium --help

# Verbose mode (if implemented)
DEBUG=arcli:* npx reactium mycommand  # Note: Internal debug namespace still uses 'arcli'
```

---

## Best Practices

### 1. Command Naming Conventions

- **Root commands**: Use simple lowercase names (`component`, `deploy`, `test`)
- **Namespaced commands**: Use colon separator (`my-plugin:generate`, `toolkit:build`)
- **Avoid conflicts**: Check existing commands with `npx reactium --help`

### 2. File Organization

```
.cli/
├── commands/
│   ├── mycommand/
│   │   ├── index.js          # Main command export
│   │   ├── actions.js        # ActionSequence actions
│   │   ├── generator.js      # Generator logic (optional)
│   │   ├── reactium-arcli.js # Command-specific hooks (optional)
│   │   └── template/         # Template files
│   └── another/
│       └── index.js
└── config.json               # Optional custom config
```

### 3. Hook Naming Conventions

- Prefix with `arcli-` for CLI hooks
- Include command name: `arcli-component-input`, `arcli-deploy-confirm`
- Use consistent suffixes: `-init`, `-input`, `-conform`, `-confirm`, `-actions`

### 4. Error Handling

Always provide clear error messages:

```javascript
const ACTION = async ({ opt, props }) => {
  try {
    await doSomething();
  } catch (error) {
    arcli.message(
      chalk.red('Error:'),
      error.message || 'Unknown error occurred'
    );
    console.error(error);
    process.exit(1);
  }
};
```

### 5. Unattended Mode Support

Support scripting with unattended flags:

```javascript
const ACTION = async ({ opt, props }) => {
  let params = arcli.flagsToParams({
    opt,
    flags: ['name', 'destination', 'unattended'],
  });

  if (params.unattended !== true) {
    // Show prompts
    await getInput(params);
    await confirmAction(params);
  } else {
    // Skip prompts, use defaults or flags
    if (!params.name) throw new Error('--name required in unattended mode');
  }
};
```

### 6. Testing Commands

Test commands in isolation:

```bash
# Direct execution
node --loader ./commands/mycommand/index.js

# Via CLI
npx reactium mycommand --flag value

# Unattended mode for CI
npx reactium mycommand --unattended --name Test --destination ./output
```

---

## Common Gotchas

### 1. Command Not Discovered

**Symptom**: `npx reactium mycommand` shows "Invalid command"

**Causes**:

- Missing `NAME` or `ID` export
- Missing `COMMAND` function export
- File not named `index.js` (or not matching glob pattern)
- Directory outside configured search paths
- Depth limit exceeded (default: 25)

**Fix**: Verify exports and location:

```javascript
// REQUIRED exports
export const NAME = 'mycommand'; // OR export const ID = 'parent.child';
export const COMMAND = ({ program, props }) => {
  /* ... */
};
```

### 2. Global arcli Not Available

**Symptom**: `ReferenceError: arcli is not defined`

**Cause**: Command executed before bootstrap completes

**Fix**: Commands are auto-bootstrapped, but if testing directly:

```javascript
import bootstrap from '@atomic-reactor/cli/bootstrap.js';
await bootstrap();
// Now arcli global is available
```

### 3. Hook Load Order Issues

**Symptom**: Hook doesn't fire or fires too late

**Causes**:

- `reactium-arcli.js` loaded after hook execution point
- Priority too low (default or neutral beats your hook)

**Fix**: Ensure hooks loaded before command action runs, use high priority:

```javascript
// In command ACTION before hooks run:
for (const file of arcli.globby(['./src/**/reactium-arcli.js'])) {
  await import(file);
}

// In reactium-arcli.js:
Reactium.Hook.register(
  'arcli-component-input',
  myHook,
  Reactium.Enums.priority.highest // Or .high
);
```

### 4. Windows Path Issues

**Symptom**: Commands not found on Windows

**Cause**: Path separator mismatch (backslash vs forward slash)

**Fix**: Normalize paths (CLI does this automatically):

```javascript
const normalizeWindows = (p) =>
  path
    .normalize(p)
    .split(/[\\\/]/g)
    .join(path.posix.sep)
    .replace(/^([a-z]{1}):/i, '/$1:');
```

### 5. ActionSequence Errors Not Caught

**Symptom**: Command hangs or fails silently

**Cause**: Missing catch handler on ActionSequence promise

**Fix**: Always catch ActionSequence errors:

```javascript
return ActionSequence({ actions, options })
  .then((success) => {
    spinner.succeed('complete!');
    return success;
  })
  .catch((error) => {
    spinner.fail('error!');
    console.error(error);
    throw error; // Re-throw to exit
  });
```

### 6. Config Override Not Working

**Symptom**: Custom config ignored

**Cause**: Config hierarchy not respected (later configs should override)

**Check Priority**: `bootstrap.js:103-139`

1. Base: `CLI/config.json`
2. App: `[cwd]/.core/.cli/config.json` (legacy, usually doesn't exist)
3. User: `[homedir]/.arcli/config.json`
4. Project: `[cwd]/.cli/config.json` (highest priority)

**Fix**: Place config in `[cwd]/.cli/config.json` to override

---

## Integration with Reactium/Actinium

### Commands Provided by Core Plugins

**Reactium Core** (`reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/`):

- `component` - Generate React components with routing, hooks, styles
- `route` - Register routes
- `hook` - Create custom hooks
- `domain` - Create domain files
- `style` - Generate stylesheets

**Discovery**: Auto-discovered via `[cwd]/reactium_modules/**/.cli` pattern

### Extending Core Commands

Projects can customize core command behavior:

```javascript
// [project]/src/components/CustomTemplate/reactium-arcli.js
const { Reactium } = arcli;

// Add custom template option to component command
Reactium.Hook.register(
  'arcli-component-input',
  async ({ inquirer, params }) => {
    const { template } = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: 'Component template',
        choices: ['default', 'custom-layout', 'data-driven'],
      },
    ]);
    params.template = template;
  },
  Reactium.Enums.priority.high
);

Reactium.Hook.register(
  'arcli-component-actions',
  ({ actions, params }) => {
    if (params.template === 'custom-layout') {
      actions['custom-layout'] = async ({ params, props }) => {
        // Generate custom template files
      };
    }
  },
  Reactium.Enums.priority.high
);
```

---

## Source File References

**Core Files**:

- `CLI/arcli-node.js:1-230` - Main CLI entry point, two-phase initialization
- `CLI/bootstrap.js:1-247` - Bootstrap process, global arcli object, hook loading
- `CLI/config.json:1-44` - Default command discovery configuration
- `CLI/lib/generator.js:1-21` - ActionSequence wrapper pattern

**Command Examples**:

- `CLI/commands/label/index.js:1-249` - Simple command structure
- `CLI/commands/cli/command/index.js:1-255` - Commander command (creates commands)
- `CLI/commands/init/index.js:1-104` - Init command (creates projects)

**Hook-Driven Commands**:

- `reactium-core/.cli/commands/reactium/component/index.js:1-213` - Hook integration pattern
- `reactium-core/.cli/commands/reactium/component/reactium-arcli.js:1-159` - Command-specific hooks

**Discovery Patterns**:

- `CLI/bootstrap.js:104-110` - Global hook discovery (arcli-hooks.js)
- `reactium-core/.cli/commands/reactium/component/index.js:66-81` - Command hook discovery (reactium-arcli.js)

---

## Comparison with Other CLI Systems

| Feature                   | Reactium CLI         | Angular CLI       | Create React App | Yeoman              |
| ------------------------- | -------------------- | ----------------- | ---------------- | ------------------- |
| Multi-location discovery  | ✅ Yes (5 locations) | ❌ Single         | ❌ Single        | ⚠️ Via generators   |
| Hook extensibility        | ✅ Yes (2 levels)    | ⚠️ Via schematics | ❌ Ejection only | ⚠️ Via templates    |
| Workspace modules         | ✅ Yes               | ✅ Yes            | ❌ No            | ❌ No               |
| Two-phase init            | ✅ Yes (performance) | ❌ No             | ❌ No            | ❌ No               |
| NPM package commands      | ✅ Auto-discovered   | ❌ Manual install | ❌ No            | ✅ Yes (generators) |
| Project-specific commands | ✅ .cli/commands     | ❌ Limited        | ❌ No            | ❌ No               |

**Reactium CLI Advantages**:

- Automatic command discovery from multiple sources
- Zero-config extensibility (drop files in .cli/commands)
- Hook system for fine-grained customization
- Performance optimization (short init for common cases)
- Framework-agnostic (works with Reactium, Actinium, standalone)

---

## Summary

The Reactium CLI (`npx reactium`) command discovery system provides:

1. **Multi-location Discovery**: Commands discovered from 5+ locations (root, project, workspace modules, NPM packages)
2. **Two-Phase Initialization**: Fast path for common commands, comprehensive discovery when needed
3. **Hook-Driven Extensibility**: Global and command-specific hooks for customization
4. **Standard Command Structure**: NAME/ID + COMMAND exports, ActionSequence pattern
5. **Zero-Config Extensibility**: Drop command files in .cli/commands, auto-discovered
6. **Workspace Module Support**: Plugins/packages can provide commands automatically

**Key Insight**: The CLI architecture mirrors Reactium's DDD philosophy - extensibility through discovery and hooks, not configuration.

**Naming Note**: Internally the CLI uses the `arcli` global object (legacy), but the command users run is `npx reactium`.
