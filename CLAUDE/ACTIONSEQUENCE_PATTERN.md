<!-- v1.0.0 -->

# ActionSequence Pattern - Sequential Async Workflow Execution

**Source**: NPM package `action-sequence@^1.1.2` (CLI/package.json:25)
**Core Repository**: https://github.com/camdagr8/ActionSequence
**Framework Usage**: CLI commands, middleware registration, multi-step workflows

---

## Overview

ActionSequence is an NPM package that provides **sequential execution of async operations** with a shared context object that accumulates results across actions. It's the foundational pattern for multi-step workflows in Reactium/Actinium CLI and server-side initialization.

**Key Characteristics**:

- **Sequential, not parallel** - actions execute one at a time in order
- **Shared context** - each action receives results from all previous actions
- **Promise-based** - returns Promise for async/await or .then()/.catch()
- **Simple API** - just `{ actions, options }` parameters

---

## Core API

### Function Signature

```javascript
ActionSequence({ actions, options })
```

**Returns**: `Promise<context>` resolving to accumulated results object

### Parameters

#### `actions` (Object)

Object where each key is an action ID and each value is an action function:

```javascript
{
  actionId1: async ({ params, props, action, context, prevAction }) => {
    // Return value stored in context[actionId1]
    return result;
  },
  actionId2: async ({ params, props, action, context, prevAction }) => {
    // Access previous action results via context
    const previousResult = context.actionId1;
    return anotherResult;
  }
}
```

**Action execution order**: Object key insertion order (guaranteed in modern JS)

#### `options` (Object)

Object spread into every action function parameter. Common pattern:

```javascript
options: { params, props }
```

### Action Function Signature

Each action function receives a single parameter object with:

```javascript
{
  // From options (spread)
  params,      // User input parameters
  props,       // CLI/framework properties

  // Added by ActionSequence
  action,      // String: current action ID
  context,     // Object: accumulated results from all previous actions
  prevAction   // String: previous action ID (undefined for first action)
}
```

**Return value**: Stored in `context[actionId]` (or `true` if undefined)

### Return Value

Resolves to a `context` object:

```javascript
{
  actionId1: resultFromAction1,
  actionId2: resultFromAction2,
  // ... all action results
}
```

---

## Error Handling Patterns

### 1. Promise Rejection

**Pattern**: Action throws or rejects → entire sequence rejects

```javascript
// CLI/lib/generator.js:8-19
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
```

### 2. Early Exit via process.exit()

**Pattern**: Action calls `process.exit()` to halt execution

```javascript
// CLI/commands/package/install/actions.js:44-47
if (!name) {
  spinner.fail('input plugin name');
  process.exit(1);
}
```

### 3. Conditional Execution

**Pattern**: Action checks flag and returns early without error

```javascript
// CLI/commands/update/actions.js:140-141, 151-153
if (cancelled === true) return;
```

### 4. Nested ActionSequence Error Handling

**Pattern**: Nested ActionSequence catches and transforms errors

```javascript
// CLI/commands/package/publish/actions.js:93-99
return ActionSequence({
  actions,
  options: { params, props },
}).catch(err => {
  error(`Prepublish Error: ${err}`);
  exit();
});
```

---

## Real-World Usage Patterns

### Pattern 1: Generator Wrapper (Standard CLI Command Pattern)

**When**: Every CLI command that generates files
**Source**: CLI/lib/generator.js:1-20

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

**Usage**: Import generator and pass actions object

```javascript
// CLI/commands/auth/generator.js:15-20
const actions = Actions(spinner);

return ActionSequence({
  actions,
  options: { params, props },
})
  .then(success => {
    spinner.succeed('complete!');
    return success;
  })
  .catch(error => {
    spinner.fail(`error! ${error.msg}`);
    return error;
  });
```

### Pattern 2: Middleware Registration (Priority-Based Sequential Execution)

**When**: Registering Express middleware in specific order
**Source**: actinium-core/lib/middleware.js:49-101

```javascript
mw.init = async (app) => {
  // Discover and import all middleware files
  await Promise.all(
    globby(ENV.GLOB_MIDDLEWARE)
      .filter((file) => isMiddleware(fs.readFileSync(file, 'utf8')))
      .map(normalizeImportPath)
      .map((file) => import(file)),
  );

  // Sort by priority order
  const sorted = _.sortBy(mw.sort, 'order');

  // Build actions object from sorted middleware
  const actions = sorted.reduce((acts, { callback = noop, id }) => {
    acts[id] = () => {
      BOOT(chalk.cyan('  Middleware'), chalk.cyan('→'), chalk.magenta(id));
      callback(app);
    };
    return acts;
  }, {});

  // Apply replacements and unregistrations
  Object.entries(mw.replacements).forEach(([id, callback]) => {
    actions[id] = () => callback(app);
  });

  _.uniq(mw.unregistered).forEach((id) => op.del(actions, id));

  mw.list = actions;

  // Execute all middleware in priority order
  return ActionSequence({ actions });
};
```

**Key insight**: Actions object built dynamically from sorted array ensures execution order

### Pattern 3: Plugin Post-Install Hooks

**When**: Running plugin-specific installation actions
**Source**: CLI/commands/package/install/actions.js:206-224

```javascript
postinstall: async ({ params, props }) => {
  if (op.get(params, 'unattended') === true) return;

  // Discover all arcli-install.js files in plugin
  const actionFiles = globby([`${dir}/**/arcli-install.js`]);
  if (actionFiles.length < 1) return;

  const actions = {};

  // Import and merge all discovered actions
  for (let i = 0; i < actionFiles.length; i++) {
    const file = actionFiles[i];
    const mod = await import(`file://${normalize(file)}`);
    const acts = mod(spinner, arcli, params, props);
    Object.keys(acts).forEach(key =>
      op.set(actions, `postinstall_${i}_${key}`, acts[key]),
    );
  }

  params['pluginDirectory'] = dir;
  await ActionSequence({ actions, options: { params, props } });
}
```

**Key insight**: Multiple action objects merged with namespaced keys to avoid collisions

### Pattern 4: Multi-Step Workflow with Spinner Feedback

**When**: Complex workflows with user feedback
**Source**: CLI/commands/update/actions.js:33-234

```javascript
const actions = {
  download: ({ params, props, action }) => {
    message('downloading payload, this may take awhile...');
    // ... download logic
    return { action, status: 200 };
  },

  unzip: ({ props }) => {
    message('unpacking...');
    // ... unzip logic
  },

  confirm: async ({ params, props }) => {
    // Interactive confirmation
    if (spinner) spinner.stop();
    const { resume } = await inquirer.prompt([...]);
    cancelled = !resume;
  },

  core: ({ params, props }) => {
    if (cancelled === true) return; // Conditional execution
    message('updating core...');
    // ... core update logic
  },

  files: async ({ params, props }) => {
    if (cancelled === true) return;
    message('updating files...');
    // ... file update logic
  },

  // ... more actions
};
```

**Key insights**:

- Actions update spinner text for progress feedback
- Shared `cancelled` variable for conditional execution
- Mix of sync/async actions

---

## Integration with Framework Systems

### CLI Command System

**Integration point**: Every CLI command with multi-step workflow
**Pattern**: Import generator wrapper, pass actions object
**Source references**:

- CLI/lib/generator.js:1-20
- CLI/commands/auth/generator.js:15-29
- CLI/commands/package/install/generator.js:12-26

### Middleware Auto-Discovery (Actinium)

**Integration point**: Server startup before plugin initialization
**Pattern**: Build actions dynamically from priority-sorted middleware array
**Source reference**: actinium-core/lib/middleware.js:49-101

### Plugin Lifecycle

**Integration point**: Post-install hooks, pre-publish hooks
**Pattern**: Discover and merge action files from plugin directories
**Source references**:

- CLI/commands/package/install/actions.js:206-224
- CLI/commands/package/publish/actions.js:76-99

---

## Best Practices

### 1. Action Naming

**DO**: Use descriptive action IDs

```javascript
{
  init: () => {},
  fetch: () => {},
  validate: () => {},
  download: () => {},
  extract: () => {}
}
```

**DON'T**: Use generic or numbered IDs

```javascript
{
  action1: () => {},
  action2: () => {},
  doStuff: () => {}
}
```

### 2. Spinner Integration

**Pattern**: Update spinner text at start of each action

```javascript
const actions = {
  download: ({ params }) => {
    message('downloading...');
    // ... download logic
  },
  unzip: ({ params }) => {
    message('unpacking...');
    // ... unzip logic
  }
};
```

### 3. Options Object Pattern

**Consistent structure**: Always pass `{ params, props }`

```javascript
ActionSequence({
  actions,
  options: { params, props }
})
```

**Rationale**: Standard signature expected by all CLI actions

### 4. Return Values for Debugging

**Pattern**: Return meaningful status objects

```javascript
download: ({ params, props, action }) => {
  // ... download logic
  return { action, status: 200 };
}
```

**Not required**: ActionSequence stores `true` if action returns undefined

### 5. Error Propagation

**Pattern**: Let errors bubble up for central handling

```javascript
// Generator wrapper catches all action errors
try {
  await ActionSequence({ actions, options });
  spinner.succeed('complete!');
} catch (error) {
  spinner.fail('failed!');
  throw error;
}
```

### 6. Action Merging for Extensibility

**Pattern**: Use namespaced keys when merging multiple action sources

```javascript
// Avoid key collisions
Object.keys(acts).forEach(key =>
  op.set(actions, `postinstall_${i}_${key}`, acts[key])
);
```

---

## Common Gotchas

### 1. Actions Execute in Order (Not Parallel)

**Gotcha**: Assuming parallel execution

```javascript
// ❌ WRONG ASSUMPTION: These run in parallel
{
  fetchA: () => fetch('/a'),
  fetchB: () => fetch('/b')
}
// ✅ REALITY: fetchB waits for fetchA to complete
```

**Solution**: Use `Promise.all()` inside a single action for parallel execution

```javascript
{
  fetchAll: async () => {
    return Promise.all([
      fetch('/a'),
      fetch('/b')
    ]);
  }
}
```

### 2. Context Object Not Passed to Options

**Gotcha**: Expecting `context` in `options` object

```javascript
// ❌ WRONG
ActionSequence({
  actions,
  options: { params, props, context } // context not available here
})
```

**Solution**: Access `context` parameter inside each action

```javascript
{
  secondAction: ({ context }) => {
    const firstResult = context.firstAction;
  }
}
```

### 3. Action Return Value Undefined = true

**Gotcha**: Forgetting to return value, expecting undefined in context

```javascript
{
  myAction: () => {
    doSomething(); // No return
  }
}
// context.myAction === true (not undefined)
```

**Solution**: Explicitly return values or accept `true` as success marker

### 4. Error in One Action Stops All Subsequent Actions

**Gotcha**: Expecting actions to continue after error

```javascript
{
  action1: () => { throw new Error('fail'); },
  action2: () => {}, // NEVER RUNS
  action3: () => {}  // NEVER RUNS
}
```

**Solution**: Handle errors inside actions if you want to continue

```javascript
{
  action1: async () => {
    try {
      await riskyOperation();
    } catch (error) {
      console.error(error);
      // Continue sequence
    }
  }
}
```

### 5. Shared Closure Variables for State

**Gotcha**: Using closure variables for state without understanding scope

```javascript
export default spinner => {
  let cancelled = false; // Shared across ALL actions

  return {
    confirm: async () => {
      cancelled = !resume;
    },
    laterAction: () => {
      if (cancelled) return; // Sees updated value
    }
  };
};
```

**Important**: This pattern works because actions execute sequentially in same scope

### 6. Spinner State During Interactive Prompts

**Gotcha**: Leaving spinner running during inquirer prompts (visual glitch)

```javascript
// ❌ WRONG: Spinner conflicts with prompt
confirm: async () => {
  const { resume } = await inquirer.prompt([...]);
}

// ✅ CORRECT: Stop spinner before prompt
confirm: async () => {
  if (spinner) spinner.stop();
  const { resume } = await inquirer.prompt([...]);
}
```

---

## Comparison with Other Patterns

### vs Promise.all()

| Feature          | ActionSequence                   | Promise.all()             |
| ---------------- | -------------------------------- | ------------------------- |
| Execution        | Sequential                       | Parallel                  |
| Context sharing  | Built-in via `context` parameter | Manual passing            |
| Error handling   | First error stops sequence       | First error rejects all   |
| Use case         | Multi-step workflows             | Independent parallel ops  |
| Return structure | Object with all results          | Array of results in order |

### vs Async/Await Chain

| Feature       | ActionSequence                    | Async/Await Chain             |
| ------------- | --------------------------------- | ----------------------------- |
| Structure     | Object of named actions           | Linear function calls         |
| Modularity    | Actions composable/reusable       | Inline logic                  |
| Dynamic steps | Actions object built at runtime   | Static code                   |
| Error detail  | Action ID in context              | Stack trace only              |
| Use case      | Configurable workflows            | Fixed workflows               |
| Extensibility | Plugins can add/remove actions    | Requires code modification    |
| Priority      | Can sort actions before execution | Order determined by call site |

### vs Hook System

| Feature          | ActionSequence                   | Hook System                        |
| ---------------- | -------------------------------- | ---------------------------------- |
| Execution        | Sequential (strict order)        | Priority-based (relative order)    |
| Registration     | Immediate (actions object)       | Deferred (register then run)       |
| Return values    | Accumulated in context           | Returned as array                  |
| Cancellation     | Throw error to stop              | Return early (no built-in cancel)  |
| Event-driven     | No                               | Yes (run hooks on events)          |
| Use case         | Single workflow execution        | Extensible event lifecycle         |
| Framework        | CLI commands, middleware         | Plugin lifecycle, component mounts |
| State management | Closure variables + context      | Hook run options + return values   |

---

## TypeScript Usage

ActionSequence is a JavaScript library without TypeScript definitions. For type safety:

```typescript
// Define action parameter type
type ActionParams<P = any, T = any> = {
  params: P;
  props: T;
  action: string;
  context: Record<string, any>;
  prevAction?: string;
};

// Define action function type
type Action<P = any, T = any, R = any> = (params: ActionParams<P, T>) => Promise<R> | R;

// Usage
const actions: Record<string, Action> = {
  init: async ({ params, props }) => {
    // Type-safe params/props if specified
  }
};

const ActionSequence = require('action-sequence');
const result = await ActionSequence({ actions, options: { params, props } });
```

---

## Testing ActionSequence Workflows

### Unit Testing Individual Actions

```javascript
// Test action in isolation
const myAction = actions.download;
const result = await myAction({
  params: mockParams,
  props: mockProps,
  action: 'download',
  context: {},
  prevAction: undefined
});

expect(result).toEqual({ status: 200 });
```

### Integration Testing Full Sequence

```javascript
const ActionSequence = require('action-sequence');

test('full workflow completes', async () => {
  const actions = {
    step1: () => ({ result: 'ok' }),
    step2: ({ context }) => {
      expect(context.step1.result).toBe('ok');
      return { done: true };
    }
  };

  const result = await ActionSequence({
    actions,
    options: { params: {}, props: {} }
  });

  expect(result.step1.result).toBe('ok');
  expect(result.step2.done).toBe(true);
});
```

### Testing Error Handling

```javascript
test('error in action stops sequence', async () => {
  const actions = {
    fail: () => { throw new Error('test error'); },
    never: jest.fn()
  };

  await expect(
    ActionSequence({ actions, options: {} })
  ).rejects.toThrow('test error');

  expect(actions.never).not.toHaveBeenCalled();
});
```

---

## Related Patterns

- **[Generator Pattern](./CLI_TEMPLATE_SYSTEM.md#generator-pattern)** - Wraps ActionSequence for consistent CLI command UX
- **[Middleware Auto-Discovery](./ACTINIUM_MIDDLEWARE.md#priority-based-execution)** - Uses ActionSequence for ordered middleware execution
- **[Hook System](./HOOK_SYSTEM.md)** - Alternative pattern for priority-based extensible workflows
- **[CLI Command System](./CLI_COMMAND_SYSTEM.md)** - Multi-step command workflows built on ActionSequence

---

## Summary

ActionSequence is the foundational pattern for **sequential async workflows** in Reactium/Actinium:

✅ **Use ActionSequence when**:

- Building multi-step CLI commands
- Registering middleware with strict execution order
- Running plugin lifecycle hooks (install/publish)
- Need shared context across sequential operations
- Want composable, reusable workflow steps

❌ **Don't use ActionSequence when**:

- Operations can run in parallel (use `Promise.all()`)
- Need event-driven extensibility (use Hook system)
- Workflow is simple linear code (use async/await)
- Need to register handlers for future execution (use Hook system)

**Core concept**: Object of named async functions → executed in order → results accumulated in context → Promise resolves with all results

**Common pattern**: Actions factory function returns object, ActionSequence executes with options spread into each action parameter.
