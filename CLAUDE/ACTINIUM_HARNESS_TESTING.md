<!-- v1.0.0 -->
# Actinium Harness Testing System

Development-only test runner for rapid functional testing during Actinium startup, enabling quick validation without full test suite execution.

---

## Table of Contents

1. [Overview](#overview)
2. [Test Registration API](#test-registration-api)
3. [Test Execution Lifecycle](#test-execution-lifecycle)
4. [Setup and Teardown](#setup-and-teardown)
5. [Assertion Patterns](#assertion-patterns)
6. [Real-World Examples](#real-world-examples)
7. [Integration with Plugin Development](#integration-with-plugin-development)
8. [Best Practices](#best-practices)
9. [Common Gotchas](#common-gotchas)

---

## Overview

The Harness system provides a lightweight test runner for Actinium:

**Key Features**:
- **Boot-time execution** - Tests run during Actinium startup
- **Development-only** - Gated by `ENV.RUN_TEST === true`
- **Hook-based** - Tests registered as hooks on `tests` domain
- **Node.js assert** - Standard assertion library
- **Lifecycle support** - Optional setup/teardown functions
- **Priority ordering** - Control test execution order

**Use Cases**:
- Plugin development validation
- Core API smoke tests
- Database schema verification
- Cloud function integration tests
- Quick regression checks

**NOT a replacement for**:
- Full Jest/Mocha test suites
- CI/CD integration tests
- Production monitoring

**Source Files**:
- `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/harness.js:1-101`

---

## Test Registration API

### Actinium.Harness.test()

**Signature**:
```javascript
Actinium.Harness.test(
  description,  // String
  cb,           // AsyncFunction(assert)
  setup,        // AsyncFunction (optional)
  teardown,     // AsyncFunction (optional)
  order         // Number (default: 100)
)
```

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `description` | String | Yes | - | Test description (displayed in output) |
| `cb` | AsyncFunction | Yes | - | Test callback, receives `assert` object |
| `setup` | AsyncFunction | No | - | Setup executed before test |
| `teardown` | AsyncFunction | No | - | Cleanup executed after test (even on failure) |
| `order` | Number | No | 100 | Priority for test execution (lower = earlier) |

**Return**: `undefined` (registration is synchronous, execution is async)

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/harness.js:58-97`

---

## Test Execution Lifecycle

### Startup Sequence

```
1. Actinium boot process starts
   └─ ENV.RUN_TEST checked

2. If ENV.RUN_TEST === true:
   ├─ Harness.run() called
   ├─ Hook.run('tests') executed
   └─ All registered tests run by priority order

3. Per-test execution:
   ├─ [Optional] setup() called
   ├─ cb(assert) called
   ├─ [Success] Log green [OK]
   ├─ [Failure] Log red [FAIL] + error details
   └─ [Always] teardown() called (if provided)

4. Boot continues after all tests complete
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/harness.js:9-16`

### Test Context

Each test callback receives a slugified key in the Hook context:

```javascript
Actinium.Harness.test('My Test Name', async assert => {
  // This test registered as context['my-test-name']
});
```

**Context key generation**: `slugify(description)`

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/harness.js:59,69`

---

## Setup and Teardown

### Setup Function

Executed before test, ideal for:
- Creating test data
- Initializing Parse objects
- Setting up user contexts

**Example**:
```javascript
const setup = async () => {
  const user = new Parse.User();
  user.set("username", "testUser");
  user.set("password", "testPassword");
  user.set("email", "test@example.com");
  await user.save(null, { useMasterKey: true });
  await Actinium.Roles.User.add(user.id, 'contributor', { useMasterKey: true });
};
```

### Teardown Function

Executed after test (even if test fails), ideal for:
- Deleting test data
- Cleaning up Parse objects
- Resetting state

**Example**:
```javascript
const teardown = async () => {
  const query = new Parse.Query('_User');
  query.equalTo('username', 'testUser');
  const user = await query.first({ useMasterKey: true });
  if (user) {
    await user.destroy({ useMasterKey: true });
  }
};
```

**Critical**: Teardown ALWAYS runs, even if test throws error.

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/harness.js:65-67,78-84`

---

## Assertion Patterns

### Node.js Assert Module

Harness uses the standard Node.js `assert` module:

**Common Assertions**:

```javascript
Actinium.Harness.test('Assertion Examples', async assert => {
  // Basic assertion
  assert(true, 'Should be truthy');
  assert(value, 'Value should exist');

  // Strict equality
  assert.strictEqual(actual, expected, 'Should be exactly equal');
  assert.strictEqual(user.get('username'), 'testUser');

  // Deep equality (objects/arrays)
  assert.deepStrictEqual(actual, expected, 'Should match structure');
  assert.deepStrictEqual(result, { status: 'ok', count: 5 });

  // Truthiness checks
  assert.ok(value, 'Should be truthy');
  assert.ok(Actinium.Plugin.isActive('Settings'));

  // Type checks (via custom logic)
  assert.strictEqual(typeof value, 'string', 'Should be string');
  assert.strictEqual(Array.isArray(result), true, 'Should be array');

  // Throws assertion
  await assert.rejects(
    async () => { throw new Error('Expected error'); },
    /Expected error/,
    'Should throw expected error'
  );

  // Does not throw
  await assert.doesNotReject(
    async () => { return 'success'; },
    'Should not throw'
  );
});
```

**Source**: Node.js assert module, `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/harness.js:4`

---

## Real-World Examples

### Example 1: Simple Assertion Test

```javascript
Actinium.Harness.test(
  'Actinium SDK Available',
  async assert => {
    assert.strictEqual(typeof Actinium, 'object', 'Actinium SDK should exist');
    assert.ok(Actinium.Hook, 'Hook system should be available');
    assert.ok(Actinium.Plugin, 'Plugin system should be available');
  }
);
```

### Example 2: Core Features Validation

Real example from actinium-features plugin:

```javascript
if (ENV.RUN_TEST === true) {
  Actinium.Hook.register(
    'init',
    () => coreFeatures.forEach((ID) => FEATURES.register(ID)),
    -1000000,
  );

  Actinium.Hook.register('start', () =>
    FEATURES.list
      .map(({ id }) => id)
      .sort()
      .forEach(
        (key) =>
          Actinium.Harness.test(
            `Actinium.${key}`,
            (assert) =>
              assert.strictEqual(Actinium.Utils.isSDK(key), true),
            null,
            null,
            -1000,
          ),
        1000000,
      ),
  );
}
```

**What it does**:
- Registers all core features on `init` hook
- On `start` hook, validates each feature exists on Actinium SDK
- Uses high priority (-1000) to run early
- No setup/teardown needed

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/plugin/actinium-features/plugin.js:4-28`

### Example 3: User Creation Test (with Setup/Teardown)

```javascript
const setup = async () => {
  const user = new Parse.User();
  user.set("username", "myName");
  user.set("password", ";lajksdf;lajsdf");
  user.set("email", "email@example.com");
  await user.save(null, { useMasterKey: true });
  await Actinium.Roles.User.add(user.id, 'super-admin', { useMasterKey: true });
};

const teardown = async () => {
  const query = new Parse.Query('_User');
  query.equalTo('username', 'myName');
  const user = await query.first({ useMasterKey: true });
  await user.destroy({ useMasterKey: true });
};

Actinium.Harness.test('User Creation and Role Assignment', async assert => {
  const query = new Parse.Query('_User');
  query.equalTo('username', 'myName');
  const user = await query.first({ useMasterKey: true });

  assert(user, 'User myName should exist.');
  assert.strictEqual(user.get('username'), 'myName', 'Username should match');

  const roles = await Actinium.Roles.User.get(user.id);
  const isSuperAdmin = roles.some(role => role.name === 'super-admin');
  assert.ok(isSuperAdmin, 'User should have super-admin role');
}, setup, teardown);
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/harness.js:35-55`

### Example 4: Cloud Function Integration Test

```javascript
Actinium.Harness.test('Settings Cloud Function', async assert => {
  // Test setting save
  const result = await Actinium.Cloud.run('setting-set', {
    key: 'test.harness.setting',
    value: 'testValue',
  }, { useMasterKey: true });

  assert.ok(result, 'Setting should be saved');

  // Test setting retrieval
  const setting = await Actinium.Cloud.run('setting-get', {
    key: 'test.harness.setting',
  }, { useMasterKey: true });

  assert.strictEqual(setting.value, 'testValue', 'Setting value should match');
}, null, async () => {
  // Cleanup in teardown
  await Actinium.Cloud.run('setting-del', {
    key: 'test.harness.setting',
  }, { useMasterKey: true });
});
```

### Example 5: Plugin Activation Test

```javascript
Actinium.Harness.test('Plugin Activation Lifecycle', async assert => {
  const pluginId = 'TestPlugin';

  // Check plugin registered
  const plugin = Actinium.Plugin.get(pluginId);
  assert.ok(plugin, `Plugin ${pluginId} should be registered`);

  // Check plugin active
  const isActive = Actinium.Plugin.isActive(pluginId);
  assert.strictEqual(isActive, true, 'Plugin should be active');

  // Check plugin version
  assert.ok(plugin.version, 'Plugin should have version');
  assert.ok(plugin.version.plugin, 'Plugin should have plugin version');
});
```

---

## Integration with Plugin Development

### Pattern: Plugin Self-Test

```javascript
// In plugin.js
import PLUGIN from './info.js';

if (ENV.RUN_TEST === true) {
  Actinium.Hook.register('start', async () => {
    // Only test if plugin is active
    if (!Actinium.Plugin.isActive(PLUGIN.ID)) return;

    Actinium.Harness.test(`${PLUGIN.ID} Cloud Functions`, async assert => {
      // Test cloud function registration
      const cloudFunc = Actinium.Cloud.get(`${PLUGIN.ID}-test-function`);
      assert.ok(cloudFunc, 'Cloud function should be registered');

      // Test actual cloud function execution
      const result = await Actinium.Cloud.run(`${PLUGIN.ID}-test-function`, {
        test: true,
      }, { useMasterKey: true });

      assert.strictEqual(result.status, 'ok', 'Should return success');
    });
  }, 1000);
}
```

### Pattern: Schema Validation

```javascript
if (ENV.RUN_TEST === true) {
  Actinium.Harness.test('Plugin Schema Created', async assert => {
    const query = new Parse.Query('MyCollection');
    query.limit(1);

    // Try to query collection (will fail if schema doesn't exist)
    const results = await query.find({ useMasterKey: true });

    // Collection exists if query succeeds (even if empty)
    assert.ok(true, 'Schema should exist');
  }, null, null, 500);  // Run after schema hooks (priority 500)
}
```

### Pattern: Capability Registration Check

```javascript
if (ENV.RUN_TEST === true) {
  Actinium.Harness.test('Plugin Capabilities Registered', async assert => {
    const capabilities = [
      'MyPlugin.create',
      'MyPlugin.retrieve',
      'MyPlugin.update',
      'MyPlugin.delete',
    ];

    capabilities.forEach(cap => {
      const capability = Actinium.Capability.get(cap);
      assert.ok(capability, `Capability ${cap} should be registered`);
    });
  });
}
```

---

## Best Practices

### 1. Environment Gating

**Always** gate harness tests with `ENV.RUN_TEST`:

```javascript
// Good
if (ENV.RUN_TEST === true) {
  Actinium.Harness.test('My Test', async assert => {
    // ...
  });
}

// Bad - runs in production!
Actinium.Harness.test('My Test', async assert => {
  // ...
});
```

### 2. Descriptive Test Names

**Good**:
- `"User Creation with Role Assignment"`
- `"Settings Cloud Function - Save and Retrieve"`
- `"Plugin Activation Lifecycle - Schema Creation"`

**Bad**:
- `"Test 1"`
- `"User test"`
- `"Check stuff"`

### 3. Cleanup in Teardown

**Always** clean up test data:

```javascript
Actinium.Harness.test('Test', async assert => {
  // Test creates data
}, null, async () => {
  // Teardown deletes data
  // Even if test fails, this runs
});
```

### 4. Master Key Usage

Use `{ useMasterKey: true }` for test operations:

```javascript
// Bypass ACLs and capabilities during tests
await user.save(null, { useMasterKey: true });
await query.find({ useMasterKey: true });
```

### 5. Priority Ordering

Use priority to control test execution order:

```javascript
// Early tests (schema validation)
Actinium.Harness.test('Schema Exists', ..., null, null, -1000);

// Normal tests
Actinium.Harness.test('Normal Test', ..., null, null, 100);  // Default

// Late tests (integration tests)
Actinium.Harness.test('Full Workflow', ..., null, null, 1000);
```

### 6. Async/Await

Always use `async`/`await` for test callbacks:

```javascript
// Good
Actinium.Harness.test('Test', async assert => {
  const result = await Actinium.Cloud.run('my-function');
  assert.ok(result);
});

// Bad - Promise not awaited
Actinium.Harness.test('Test', assert => {
  Actinium.Cloud.run('my-function').then(result => {
    assert.ok(result);  // Won't execute before test completes
  });
});
```

### 7. Scope Test Data

Keep test data unique to avoid collisions:

```javascript
// Good - unique identifier
const testUsername = `test-user-${Date.now()}`;

// Bad - hardcoded (collisions if tests run in parallel)
const testUsername = 'testUser';
```

---

## Common Gotchas

### 1. Missing ENV.RUN_TEST Check

**Problem**: Tests run in production, causing errors or performance issues.

**Symptom**: Boot-time errors in production, unexpected test output.

**Fix**: Always gate with `ENV.RUN_TEST`:
```javascript
if (ENV.RUN_TEST === true) {
  Actinium.Harness.test(...);
}
```

### 2. Teardown Not Cleaning Up

**Problem**: Test data persists after tests, pollutes database.

**Symptom**: Database fills with test users/objects, slow queries.

**Fix**: Always implement teardown:
```javascript
Actinium.Harness.test('Test', async assert => {
  // ...
}, null, async () => {
  // Clean up ALL test data
});
```

### 3. Async Not Awaited

**Problem**: Test completes before async operations finish.

**Symptom**: Assertions not executed, false positives.

**Fix**: Use `async`/`await`:
```javascript
// Bad
Actinium.Harness.test('Test', assert => {
  fetch('/api').then(result => {
    assert.ok(result);  // Doesn't run
  });
});

// Good
Actinium.Harness.test('Test', async assert => {
  const result = await fetch('/api');
  assert.ok(result);  // Runs correctly
});
```

### 4. Forgetting Master Key

**Problem**: Test operations fail with permission errors.

**Symptom**: "Permission denied" errors during test execution.

**Fix**: Use `{ useMasterKey: true }`:
```javascript
await user.save(null, { useMasterKey: true });
await query.find({ useMasterKey: true });
await Actinium.Cloud.run('function', params, { useMasterKey: true });
```

### 5. Test Order Dependencies

**Problem**: Tests pass when run in order, fail when run individually.

**Cause**: Test B depends on data created by Test A.

**Fix**: Each test should be independent (create own data in setup):
```javascript
// Bad - depends on previous test
Actinium.Harness.test('Test A', async assert => {
  await createUser('testUser');
}, null, null, 100);

Actinium.Harness.test('Test B', async assert => {
  const user = await findUser('testUser');  // Assumes Test A ran first
}, null, null, 101);

// Good - independent
Actinium.Harness.test('Test B', async assert => {
  const user = await findUser('testUser');
}, async () => {
  await createUser('testUser');  // Create own data
}, async () => {
  await deleteUser('testUser');  // Clean up own data
});
```

### 6. Teardown Errors Silent

**Problem**: Teardown throws error, but test still shows [OK].

**Cause**: Harness catches teardown errors, logs them, but doesn't fail test.

**Fix**: Make teardown defensive:
```javascript
const teardown = async () => {
  try {
    const query = new Parse.Query('_User');
    query.equalTo('username', 'testUser');
    const user = await query.first({ useMasterKey: true });
    if (user) {  // Check exists before destroying
      await user.destroy({ useMasterKey: true });
    }
  } catch (error) {
    console.error('Teardown error:', error);
    // Don't throw - teardown should be best-effort
  }
};
```

**Source**: `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/harness.js:78-84`

### 7. Priority Confusion

**Problem**: Tests run in unexpected order.

**Cause**: Lower priority runs EARLIER (opposite of Hook priority convention).

**Fix**: Remember priority scale:
- `-1000000` = very early
- `-1000` = early
- `100` = default (normal)
- `1000` = late
- `1000000` = very late

### 8. Hook Context Conflicts

**Problem**: Test name slugifies to existing hook ID.

**Cause**: Two tests with similar names:
- `"My Test"` → `my-test`
- `"My-Test"` → `my-test` (conflict!)

**Fix**: Use unique, descriptive test names.

### 9. Not Checking Plugin Active State

**Problem**: Test runs before plugin activates, causes errors.

**Fix**: Check plugin state in test:
```javascript
if (ENV.RUN_TEST === true) {
  Actinium.Hook.register('start', async () => {
    if (!Actinium.Plugin.isActive('MyPlugin')) return;

    Actinium.Harness.test('MyPlugin Test', async assert => {
      // ...
    });
  });
}
```

### 10. Assertion Error Messages Unclear

**Problem**: Test fails but unclear why.

**Fix**: Always provide descriptive assertion messages:
```javascript
// Bad
assert(user);
assert.strictEqual(result, 5);

// Good
assert(user, 'User should exist after creation');
assert.strictEqual(result, 5, 'Result count should be 5');
```

---

## Summary

Harness system provides:
- ✅ **Rapid development testing** - Quick validation during boot
- ✅ **Development-only execution** - ENV.RUN_TEST gate
- ✅ **Hook-based architecture** - Tests registered on `tests` hook
- ✅ **Lifecycle support** - Setup/teardown for data management
- ✅ **Standard assertions** - Node.js assert module
- ✅ **Priority ordering** - Control test execution sequence

**Critical for**:
- Plugin development validation
- Core API smoke tests
- Quick regression checks
- Database schema verification

**NOT for**:
- CI/CD integration (use Jest/Mocha instead)
- Production monitoring
- Load/performance testing

**Complete reference chain**: CLAUDEDB → this file → `Actinium-Plugins/actinium_modules/@atomic-reactor/actinium-core/lib/harness.js:1-101`
