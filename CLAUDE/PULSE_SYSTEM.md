<!-- v1.0.0 -->
# Pulse System Architecture

Complete documentation of Reactium's recurring task scheduler for background operations, polling, and timed execution.

---

## Overview

The **Pulse** system is a registry-based recurring task scheduler that provides controlled, repeatable execution of asynchronous operations. Think of it as "cron for React" - managing background tasks like polling APIs, auto-save, health checks, and real-time data refresh.

**Key Features**:
- Registry-based task management with object-path IDs
- Configurable retry logic with attempt limits
- Automatic repeat control (finite or infinite)
- Task lifecycle management (start, stop, reset, retry)
- TypeScript generic support for type-safe task parameters
- Isolated task state (no shared state between tasks)

**Source**: `reactium-sdk-core/src/core/Pulse/index.ts`

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      PULSE TASK LIFECYCLE                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Pulse.register(ID, callback, options, ...params)                │
│         │                                                        │
│         ├─→ Create PulseTask instance                           │
│         │      │                                                 │
│         │      ├─→ autostart = true?                            │
│         │      │      │                                          │
│         │      │      └─→ YES: task.start()                     │
│         │      │              │                                  │
│         │      │              ├─→ setTimeout(delay)              │
│         │      │              │                                  │
│         │      │              └─→ task.now()                    │
│         │      │                     │                           │
│         │      │                     ├─→ Execute callback        │
│         │      │                     │                           │
│         │      │                     ├─→ Success?               │
│         │      │                     │   ├─ YES: onSuccess()    │
│         │      │                     │   │   ├─ count++         │
│         │      │                     │   │   ├─ complete?       │
│         │      │                     │   │   │   ├─ YES: stop() │
│         │      │                     │   │   │   └─ NO: start() │
│         │      │                     │   │                      │
│         │      │                     │   └─ NO: onError()       │
│         │      │                     │       ├─ attempt++       │
│         │      │                     │       └─ retry()         │
│         │      │                     │           ├─ failed?     │
│         │      │                     │           │   ├─ YES: stop() │
│         │      │                     │           │   └─ NO: start() │
│         │      │                                                │
│         │      └─→ Store in registry[ID]                        │
│         │                                                        │
│         └─→ Return PulseTask instance                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Core Classes

### PulseTask<Params>

**Source**: `index.ts:68-497`

Represents a single recurring task with lifecycle management.

#### Constructor

**Source**: `index.ts:111-141`

```typescript
constructor(options: PulseTaskOptions, ...params: Params)
```

**Options**:
- `callback`: Function to execute (required)
- `ID`: Unique task identifier (auto-generated if not provided)
- `attempts`: Max retry attempts on error (default: -1 = unlimited)
- `autostart`: Start immediately on creation (default: true)
- `delay`: Milliseconds before first execution (default: 0)
- `repeat`: Number of times to repeat (default: -1 = infinite)
- `debug`: Enable console logging (default: false)

**Example**:
```typescript
const task = new PulseTask<[string, number]>(
    {
        callback: async (task, msg, count) => {
            console.log(msg, count);
            return count > 10 ? false : true; // Stop if count > 10
        },
        attempts: 3,
        autostart: true,
        delay: 1000,
        repeat: 5,
        debug: true,
    },
    'Hello',  // First param
    0         // Second param
);
```

#### Task State Properties

**Source**: `index.ts:175-332`

**Getters**:
- `ID`: Unique task identifier (string)
- `status`: Current task status (STATUS enum)
- `attempt`: Current retry attempt number
- `attempts`: Maximum retry attempts
- `count`: Number of successful executions
- `delay`: Milliseconds delay before execution
- `repeat`: Number of times to repeat
- `progress`: Fractional progress (0-1, or 0 if infinite)
- `complete`: Boolean, true when progress === 1
- `failed`: Boolean, true when attempts exhausted
- `error`: Last error (if any)
- `timer`: Internal setTimeout ID

**Setters**:
- `attempts`: Update max retry attempts
- `delay`: Update execution delay
- `repeat`: Update repeat count

#### Task Control Methods

**1. start()**

**Source**: `index.ts:466-474`

Starts task execution after `delay` milliseconds.

```typescript
task.start();
```

**Behavior**:
- Creates timeout using `delay`
- Does nothing if timer already exists
- Returns task instance for chaining

**2. stop()**

**Source**: `index.ts:482-496`

Stops task execution.

```typescript
task.stop();
```

**Behavior**:
- If task is RUNNING: sets pending stop (waits for completion)
- Otherwise: clears timeout, sets status to STOPPED
- Returns task instance for chaining

**3. reset()**

**Source**: `index.ts:426-437`

Resets task state and restarts.

```typescript
task.reset();
```

**Behavior**:
- Stops current execution
- Resets `attempt`, `count`, `complete`, `error` to initial state
- Starts task again
- Returns task instance for chaining

**4. now()**

**Source**: `index.ts:392-418`

Executes task immediately (bypasses delay).

```typescript
await task.now();
```

**Behavior**:
- Stops any pending execution
- Sets status to RUNNING
- Increments `attempt` and `count`
- Executes callback with task instance and params
- On success: calls `onSuccess(result)`
- On error: calls `onError(err)`
- Returns task instance

**5. retry()**

**Source**: `index.ts:447-461`

Attempts to retry failed execution.

```typescript
task.retry();
```

**Behavior**:
- If `attempts` < 0: unlimited retries (stop → start)
- If `attempt` >= `attempts`: stop (failed)
- Otherwise: stop → start
- Returns task instance

#### Lifecycle Callbacks

**1. onSuccess(result)**

**Source**: `index.ts:341-367`

Called when task execution succeeds.

```typescript
task.onSuccess(result);
```

**Behavior**:
- If pending stop: calls `stop()`
- Resets `timer`, `error`, `attempt`
- Sets status to READY
- If `repeat === -1`: restarts (infinite loop)
- If `complete`: stops (finished)
- Otherwise: restarts (next iteration)

**2. onError(err)**

**Source**: `index.ts:376-382`

Called when task execution fails.

```typescript
task.onError(err);
```

**Behavior**:
- Stores error in `error` property
- Sets status to ERROR
- Decrements `count` (rollback failed execution)
- Calls `retry()`

---

### PulseSDK

**Source**: `index.ts:502-644`

Singleton registry for managing multiple tasks with object-path addressing.

#### Methods

**1. register(ID, callback, options, ...params)**

**Source**: `index.ts:527-556`

Registers new task with given ID.

```typescript
Pulse.register<[string, number]>(
    'my-polling-task',
    async (task, url, interval) => {
        const data = await fetch(url).then(r => r.json());
        console.log('Polled:', data);
        return true;
    },
    {
        delay: 5000,
        repeat: -1,  // Infinite
        attempts: 3,
    },
    'https://api.example.com/status',
    5000
);
```

**Parameters**:
- `ID`: Object-path string (e.g., `app.polling.status`)
- `callback`: Task callback function
- `options`: PulseTaskOptions
- `...params`: Parameters passed to callback

**Returns**: PulseTask instance

**Behavior**:
- Throws error if ID or callback missing
- Generates unique internal ID
- Creates PulseTask instance
- Stores in registry by ID
- Returns task for method chaining

**2. get(ID)**

**Source**: `index.ts:514-516`

Retrieves task by ID.

```typescript
const task = Pulse.get('my-polling-task');
console.log(task.status, task.progress);
```

**3. unregister(ID)**

**Source**: `index.ts:567-584`

Stops and removes task from registry.

```typescript
Pulse.unregister('my-polling-task');
```

**Behavior**:
- Gets task by ID
- Stops task execution
- Waits for task to finish (polling interval)
- Removes from registry
- Returns Pulse instance for chaining

**4. start(ID)**

**Source**: `index.ts:592-599`

Starts specific task by ID.

```typescript
Pulse.start('my-polling-task');
```

**5. startAll()**

**Source**: `index.ts:606-613`

Starts all registered tasks that are not already started.

```typescript
Pulse.startAll();
```

**6. stop(ID)**

**Source**: `index.ts:621-628`

Stops specific task by ID.

```typescript
Pulse.stop('my-polling-task');
```

**7. stopAll()**

**Source**: `index.ts:635-640`

Stops all registered tasks.

```typescript
Pulse.stopAll();
```

---

## Task Lifecycle States

**Source**: `index.ts:2` (imports STATUS enum from `./enums`)

```typescript
enum STATUS {
    READY,    // Task initialized, ready to start
    RUNNING,  // Task callback currently executing
    STOPPED,  // Task manually stopped
    ERROR,    // Task failed with error
}
```

**State Transitions**:
```
     ┌─────────────────────────────────┐
     │          READY                  │
     │  (Initialized/Reset)            │
     └──────────┬──────────────────────┘
                │
                │ start()
                │
                ▼
     ┌─────────────────────────────────┐
     │         RUNNING                 │
     │  (Callback executing)           │
     └──────────┬──────────────────────┘
                │
         ┌──────┴──────┐
         │             │
   Success?         Error?
         │             │
         ▼             ▼
    ┌────────┐    ┌────────┐
    │ READY  │    │ ERROR  │
    │        │    │        │
    │ repeat?│    │ retry? │
    └────┬───┘    └────┬───┘
         │             │
         └──────┬──────┘
                │
            stop()
                │
                ▼
     ┌─────────────────────────────────┐
     │         STOPPED                 │
     │  (Execution halted)             │
     └─────────────────────────────────┘
```

---

## Real-World Use Cases

### 1. API Polling

```typescript
// Poll API every 5 seconds indefinitely
Pulse.register(
    'api.health-check',
    async (task) => {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();

            if (data.status !== 'healthy') {
                console.warn('API unhealthy:', data);
            }

            return true; // Continue polling
        } catch (err) {
            console.error('Health check failed:', err);
            return false; // Stop on error (retry logic will handle)
        }
    },
    {
        delay: 5000,
        repeat: -1,      // Infinite
        attempts: 3,     // Retry 3 times on failure
        autostart: true,
    }
);
```

### 2. Auto-Save Draft

```typescript
// Auto-save every 30 seconds
let draftContent = '';

const saveDraft = async (task, content) => {
    if (!content) return true; // Skip if empty

    try {
        await fetch('/api/drafts', {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
        console.log('Draft saved');
        return true;
    } catch (err) {
        console.error('Draft save failed:', err);
        return false; // Retry on error
    }
};

Pulse.register(
    'editor.auto-save',
    saveDraft,
    {
        delay: 30000,
        repeat: -1,
        attempts: 3,
    },
    draftContent
);

// Update draft content
const updateDraft = (newContent) => {
    draftContent = newContent;
    // Task will use updated content on next execution
};
```

### 3. Progress Tracking Task

```typescript
// Process items with progress tracking
const processItems = async (task, items) => {
    const currentItem = items[task.count];

    if (!currentItem) {
        console.log('All items processed');
        return false; // Stop when done
    }

    console.log(`Processing ${task.count + 1}/${items.length}`);
    console.log(`Progress: ${(task.progress * 100).toFixed(0)}%`);

    await processItem(currentItem);
    return true; // Continue
};

const items = ['item1', 'item2', 'item3', 'item4', 'item5'];

Pulse.register(
    'batch.process',
    processItems,
    {
        delay: 1000,
        repeat: items.length, // Run exactly N times
        attempts: 2,
        debug: true,
    },
    items
);
```

### 4. Retry with Exponential Backoff

```typescript
// Custom retry with exponential backoff
const fetchWithRetry = async (task, url) => {
    // Calculate backoff delay based on attempt number
    const backoffDelay = Math.pow(2, task.attempt) * 1000;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Request failed');

        const data = await response.json();
        console.log('Fetched:', data);
        return true;
    } catch (err) {
        console.error(`Attempt ${task.attempt} failed:`, err);

        // Update delay for next attempt
        task.delay = backoffDelay;

        return false; // Trigger retry
    }
};

Pulse.register(
    'api.fetch-with-backoff',
    fetchWithRetry,
    {
        delay: 1000,       // Initial delay: 1s
        attempts: 5,       // Max 5 attempts
        repeat: 1,         // Single execution (with retries)
        autostart: true,
    },
    'https://api.example.com/data'
);

// Backoff sequence: 1s, 2s, 4s, 8s, 16s (stop if still failing)
```

### 5. Conditional Task Control

```typescript
// Start/stop task based on visibility
const pollData = async (task) => {
    const data = await fetchData();
    updateUI(data);
    return true;
};

const pollTask = Pulse.register(
    'ui.data-polling',
    pollData,
    {
        delay: 2000,
        repeat: -1,
        autostart: false, // Manual start
    }
);

// Pause polling when tab hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        Pulse.stop('ui.data-polling');
        console.log('Polling paused');
    } else {
        Pulse.start('ui.data-polling');
        console.log('Polling resumed');
    }
});

// Start initially
Pulse.start('ui.data-polling');
```

---

## Integration Patterns

### React Hook Integration

```typescript
// Custom hook for Pulse task lifecycle
const usePulseTask = (id, callback, options, ...params) => {
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Register task
        const task = Pulse.register(id, callback, options, ...params);

        // Poll task state
        const interval = setInterval(() => {
            setStatus(task.status);
            setProgress(task.progress);
        }, 100);

        // Cleanup
        return () => {
            clearInterval(interval);
            Pulse.unregister(id);
        };
    }, [id]);

    return {
        status,
        progress,
        start: () => Pulse.start(id),
        stop: () => Pulse.stop(id),
        reset: () => Pulse.get(id)?.reset(),
    };
};

// Usage in component
const PollingComponent = () => {
    const { status, progress, start, stop } = usePulseTask(
        'my-task',
        async () => {
            await pollAPI();
            return true;
        },
        { delay: 5000, repeat: -1 }
    );

    return (
        <div>
            <p>Status: {status}</p>
            <p>Progress: {(progress * 100).toFixed(0)}%</p>
            <button onClick={start}>Start</button>
            <button onClick={stop}>Stop</button>
        </div>
    );
};
```

### Hook System Integration

```javascript
// Register Pulse task via Reactium hook
Reactium.Hook.register('app-ready', () => {
    Pulse.register(
        'app.background-sync',
        async () => {
            await syncData();
            return true;
        },
        {
            delay: 60000,  // Every minute
            repeat: -1,
            attempts: 3,
        }
    );
});

// Stop tasks on logout
Reactium.Hook.register('user.before.logout', () => {
    Pulse.stopAll();
});

// Resume tasks on login
Reactium.Hook.register('user.after.login', () => {
    Pulse.startAll();
});
```

---

## Best Practices

### ✅ DO

1. **Use Object-Path IDs**: Namespace tasks logically
   ```typescript
   Pulse.register('api.polling.user-status', ...);
   Pulse.register('api.polling.notifications', ...);
   Pulse.register('editor.auto-save', ...);
   ```

2. **Return Boolean from Callback**: Control task continuation
   ```typescript
   callback: async (task) => {
       const success = await doWork();
       return success; // true = continue, false = stop
   }
   ```

3. **Handle Errors Gracefully**: Let Pulse retry logic work
   ```typescript
   callback: async (task) => {
       try {
           await riskyOperation();
           return true;
       } catch (err) {
           console.error('Task failed:', err);
           return false; // Triggers retry
       }
   }
   ```

4. **Use Debug Mode During Development**: See task lifecycle
   ```typescript
   Pulse.register(id, callback, {
       debug: true, // Logs lifecycle events
   });
   ```

5. **Clean Up on Unmount**: Always unregister tasks
   ```typescript
   useEffect(() => {
       Pulse.register('my-task', callback, options);
       return () => Pulse.unregister('my-task');
   }, []);
   ```

### ❌ DON'T

1. **Don't Share Task State**: Each task is isolated
   ```typescript
   // BAD: Trying to share state between tasks
   let sharedState = {};
   Pulse.register('task1', () => { sharedState.x = 1; });
   Pulse.register('task2', () => { console.log(sharedState.x); }); // Undefined timing

   // GOOD: Use external state management
   let state = {};
   Pulse.register('task1', () => { state.x = 1; return true; });
   Pulse.register('task2', () => { console.log(state.x); return true; });
   ```

2. **Don't Assume Immediate Execution**: Tasks have delay
   ```typescript
   // BAD: Expecting immediate execution
   Pulse.register('my-task', callback, { delay: 5000, autostart: true });
   console.log('Task started'); // Logs immediately, but task runs in 5s

   // GOOD: Use now() for immediate execution
   const task = Pulse.register('my-task', callback, { autostart: false });
   await task.now(); // Executes immediately
   ```

3. **Don't Forget Cleanup**: Memory leaks from infinite tasks
   ```typescript
   // BAD: Infinite task never cleaned up
   Pulse.register('my-task', callback, { repeat: -1 });
   // Component unmounts, task keeps running!

   // GOOD: Cleanup in useEffect
   useEffect(() => {
       Pulse.register('my-task', callback, { repeat: -1 });
       return () => Pulse.unregister('my-task');
   }, []);
   ```

4. **Don't Use Pulse for One-Time Operations**: Use promises
   ```typescript
   // BAD: Pulse for single execution
   Pulse.register('one-time', callback, { repeat: 1, delay: 1000 });

   // GOOD: Use setTimeout or Promise
   setTimeout(callback, 1000);
   ```

5. **Don't Ignore Task Status**: Check before operations
   ```typescript
   // BAD: Starting already running task
   Pulse.start('my-task');

   // GOOD: Check status first
   const task = Pulse.get('my-task');
   if (task && task.status !== STATUS.RUNNING) {
       Pulse.start('my-task');
   }
   ```

---

## Common Gotchas

### 1. Task Parameters Not Updating

**Problem**: Parameters passed to `register()` are captured at registration time

```typescript
let data = 'initial';

Pulse.register('my-task', async (task, param) => {
    console.log(param); // Always logs 'initial'
}, { repeat: -1, delay: 1000 }, data);

data = 'updated'; // Task still uses 'initial'
```

**Solution**: Use closure or external reference

```typescript
let data = 'initial';

Pulse.register('my-task', async (task) => {
    console.log(data); // Uses current value
}, { repeat: -1, delay: 1000 });

data = 'updated'; // Task will see 'updated'
```

### 2. Progress Always 0 for Infinite Tasks

**Problem**: Progress calculation returns 0 when `repeat === -1`

```typescript
const task = Pulse.register('my-task', callback, { repeat: -1 });
console.log(task.progress); // Always 0 (infinite progress)
```

**Solution**: Use `count` for tracking instead

```typescript
console.log(task.count); // Actual execution count
```

### 3. Retry Logic Confusion

**Problem**: `attempts` controls retries per execution, not total task executions

```typescript
// This allows 3 retry attempts PER execution
Pulse.register('my-task', callback, {
    repeat: 5,     // 5 executions
    attempts: 3,   // 3 retries per execution (max 15 callback runs)
});
```

**Solution**: Understand attempts are per-execution retries, not task-level

### 4. Stop While Running

**Problem**: Calling `stop()` while task is running doesn't stop immediately

```typescript
const task = Pulse.register('my-task', async () => {
    await longRunningOperation(); // 10 seconds
}, { repeat: -1 });

task.stop(); // Sets pending stop, waits for callback to finish
```

**Solution**: Task stops after current execution completes

### 5. Error Return vs Thrown Error

**Problem**: Both stop execution but behave differently

```typescript
// Returning false: Treated as error, triggers retry
callback: async () => {
    return false; // onError() → retry()
}

// Throwing error: Same behavior
callback: async () => {
    throw new Error('Failed'); // onError() → retry()
}
```

**Solution**: Both patterns are equivalent - use whichever is clearer

---

## Comparison with Alternatives

| Feature | Pulse | setInterval | setTimeout | Promises |
|---------|-------|-------------|------------|----------|
| **Retry Logic** | ✅ Built-in | ❌ Manual | ❌ Manual | ❌ Manual |
| **Progress Tracking** | ✅ Built-in | ❌ Manual | ❌ Manual | ❌ No |
| **Lifecycle Control** | ✅ start/stop/reset | ✅ clear | ✅ clear | ❌ No |
| **Async Support** | ✅ Native | ❌ Manual | ❌ Manual | ✅ Native |
| **Registry** | ✅ Object-path | ❌ No | ❌ No | ❌ No |
| **Error Handling** | ✅ Automatic | ❌ Manual | ❌ Manual | ✅ try/catch |

**When to Use Pulse**:
- ✅ Recurring tasks with retry logic
- ✅ Progress tracking needed
- ✅ Complex lifecycle control (start/stop/reset)
- ✅ Registry-based task management

**When to Use Alternatives**:
- ❌ Simple one-time delays → `setTimeout`
- ❌ Basic intervals without retry → `setInterval`
- ❌ One-time async operations → `Promise`

---

## TypeScript Patterns

```typescript
// Type-safe task registration
interface DataFetchParams {
    url: string;
    retries: number;
}

const fetchData = async (
    task: PulseTask<[DataFetchParams]>,
    params: DataFetchParams
): Promise<boolean> => {
    try {
        const response = await fetch(params.url);
        const data = await response.json();
        console.log('Fetched:', data);
        return true;
    } catch (err) {
        console.error(`Attempt ${task.attempt}/${params.retries}`, err);
        return false;
    }
};

Pulse.register<[DataFetchParams]>(
    'api.fetch',
    fetchData,
    {
        attempts: 3,
        delay: 1000,
        repeat: -1,
    },
    { url: 'https://api.example.com/data', retries: 3 }
);
```

---

## Summary

The **Pulse** system provides:
- ✅ Registry-based recurring task scheduler
- ✅ Built-in retry logic with attempt limits
- ✅ Lifecycle management (start, stop, reset, retry)
- ✅ Progress tracking for finite tasks
- ✅ TypeScript generic support for type-safe params
- ✅ Isolated task state (no shared state)
- ✅ Async-first design with error handling

**Use Cases**: API polling, auto-save, background sync, health checks, progress tracking, retry-heavy operations.

**Critical Patterns**:
- Return boolean from callback to control continuation
- Use object-path IDs for logical task organization
- Clean up tasks on component unmount to prevent memory leaks
- Leverage retry logic for resilient background operations
