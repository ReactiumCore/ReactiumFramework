<!-- v1.0.0 -->

# Actinium IO WebSocket System

**Complete Socket.io integration for real-time bidirectional communication between Actinium server and browser clients.**

---

## Architecture Overview

The Actinium IO plugin provides Socket.io server infrastructure integrated with the Actinium HTTP server, enabling real-time communication patterns like live updates, notifications, collaborative editing, and presence detection.

**Key Components:**

- **Socket.io Server** - Attached to Actinium HTTP server
- **Client Registry** - Registry-based tracking of all connected clients
- **Hook-Driven Lifecycle** - Extensible connection/disconnection events
- **Custom Socket Path** - `/actinium.io` (not default `/socket.io`)
- **CORS Support** - Configurable origin policies

---

## Server-Side Architecture

### Initialization Sequence

```
Plugin Registration → start hook → io.config hook → Socket.io Server Creation → io.init hook → io.connection hook (per client)
```

**Source**: `actinium-io/plugin.js:50-69`

### Socket.io Server Configuration

Default configuration applied before `io.config` hook:

```javascript
const socketConfig = {
    path: '/actinium.io',        // Custom path (NOT /socket.io)
    serverClient: false,         // Don't serve client library
    cors: {
        origin: '*',             // Allow all origins (customize via hook)
    },
};

await Actinium.Hook.run('io.config', socketConfig);
Actinium.IO.server = new Server(Actinium.server, socketConfig);
```

**Source**: `actinium-io/plugin.js:56-66`

### Client Registry Pattern

All connected clients tracked in CLEAN mode Registry:

```javascript
Actinium.IO = {
    clients: new Registry(
        'ioClients',
        'id',
        Actinium.Utils.Registry.MODES.CLEAN,
    ),
};
```

**Registry Entry Structure:**

```javascript
{
    id: client.id,      // Socket.io client ID
    client: client      // Full Socket.io client object
}
```

**Source**: `actinium-io/plugin.js:37-43,86-91`

### Connection Lifecycle Hooks

Three hooks provide extensibility:

1. **`io.config`** - Modify Socket.io server configuration before server creation
2. **`io.init`** - Runs after server created with full `Actinium.IO` object
3. **`io.connection`** - Fires for each client connection (receives `client` object)
4. **`io.disconnecting`** - Fires when client disconnects (receives `client` object)

**Built-in Connection Handler:**

```javascript
Actinium.Hook.register(
    'io.connection',
    (client) => {
        DEBUG(`${client.id} connecting`);

        const entry = {
            id: client.id,
            client,
        };

        Actinium.IO.clients.register(client.id, entry);

        client.on('disconnecting', () => {
            DEBUG(`${client.id} disconnecting`);
            Actinium.Hook.run('io.disconnecting', client);
            Actinium.IO.clients.unregister(client.id);
        });
    },
    Actinium.Enums.priority.highest,
);
```

**Source**: `actinium-io/plugin.js:71-100`

---

## Browser-Side Integration

### Client Setup (Reactium API Plugin)

The `@atomic-reactor/reactium-api` plugin auto-configures Socket.io client:

```javascript
const io = require('socket.io-client/dist/socket.io.js');

// Determine connection URL (proxied vs direct)
let ioURL = `${protocol}//${host}${restAPI}`;

// Direct connection pattern
if (/^http/.test(apiConfig.restAPI)) {
    const API = new URL(apiConfig.restAPI);
    ioURL = API.toString();
}

ioURL = ioURL.replace('/api', '');

Actinium.IO = io(ioURL, {
    path: '/actinium.io',      // MUST match server path
    autoConnect: false,        // Manual connection control
    transports: ['polling'],   // Polling-first strategy
});
```

**Source**: `reactium-api/sdk/actinium/index.js:19-43`

**Critical Configuration:**

- **Path Match Required** - Client `path: '/actinium.io'` MUST match server
- **Manual Connection** - `autoConnect: false` allows auth before connecting
- **Polling Transport** - Starts with long-polling (upgrades to WebSocket if available)

---

## Real-World Patterns

### Pattern 1: Broadcast to All Clients

```javascript
// In cloud function or hook
Actinium.Hook.register('content-saved', async (content) => {
    // Get all connected clients
    const clients = Actinium.IO.clients.list;

    // Broadcast content update to all
    Object.values(clients).forEach(({ client }) => {
        client.emit('content-update', {
            type: content.get('type'),
            uuid: content.get('uuid'),
            action: 'saved',
        });
    });
});
```

### Pattern 2: Room-Based Broadcasting

```javascript
// Join user to content-specific room on connection
Actinium.Hook.register('io.connection', async (client) => {
    const user = await getCurrentUser(client); // Custom auth

    if (user) {
        const contentId = client.handshake.query.contentId;
        client.join(`content-${contentId}`);

        // Broadcast to room
        client.to(`content-${contentId}`).emit('user-joined', {
            userId: user.id,
            username: user.get('username'),
        });
    }
});
```

### Pattern 3: Client-Specific Targeting

```javascript
// Send notification to specific user
Actinium.Hook.register('user-notification', async ({ userId, message }) => {
    const clients = Actinium.IO.clients.list;

    // Find client by user ID (requires custom tracking)
    Object.values(clients).forEach(({ client }) => {
        if (client.userId === userId) {
            client.emit('notification', message);
        }
    });
});
```

### Pattern 4: Manual Client Connection

```javascript
// Browser-side connection after authentication
import Reactium from '@atomic-reactor/reactium-core/sdk';

// Connect after user login
Reactium.User.beforeLogin('connect-socket', async () => {
    if (!Reactium.Utils.isWindow()) return;

    const { api: Actinium } = await import('@atomic-reactor/reactium-api');

    // Connect with auth token
    Actinium.IO.auth = {
        token: Reactium.User.getSessionToken(),
    };

    Actinium.IO.connect();

    // Listen for events
    Actinium.IO.on('content-update', (data) => {
        console.log('Content updated:', data);
    });
});

// Disconnect on logout
Reactium.User.beforeLogout('disconnect-socket', async () => {
    const { api: Actinium } = await import('@atomic-reactor/reactium-api');
    Actinium.IO.disconnect();
});
```

---

## Hook Integration Patterns

### Customizing CORS Configuration

```javascript
Actinium.Hook.register('io.config', async (socketConfig) => {
    // Restrict origins in production
    if (ENV.NODE_ENV === 'production') {
        socketConfig.cors = {
            origin: ['https://myapp.com', 'https://admin.myapp.com'],
            credentials: true,
        };
    }
});
```

### Authentication Middleware

```javascript
Actinium.Hook.register('io.init', async (IO) => {
    IO.server.use(async (socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const user = await Actinium.User.sessionQuery(token);
            socket.userId = user.id;
            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });
});
```

### Presence Tracking

```javascript
// Track online users
const onlineUsers = new Set();

Actinium.Hook.register('io.connection', (client) => {
    if (client.userId) {
        onlineUsers.add(client.userId);

        // Broadcast updated presence
        Actinium.IO.server.emit('presence-update', {
            online: Array.from(onlineUsers),
        });
    }
});

Actinium.Hook.register('io.disconnecting', (client) => {
    if (client.userId) {
        onlineUsers.delete(client.userId);

        Actinium.IO.server.emit('presence-update', {
            online: Array.from(onlineUsers),
        });
    }
});
```

---

## Best Practices

### Server-Side

1. **Validate Events** - Always validate data from client events (untrusted input)
2. **Use Rooms** - Group clients by content/feature for targeted broadcasts
3. **Authenticate Connections** - Use middleware to verify session tokens
4. **Clean Up Listeners** - Remove event listeners in `io.disconnecting` hook
5. **Rate Limit** - Apply rate limiting to prevent event flooding
6. **Namespace Isolation** - Use Socket.io namespaces for different features
7. **Error Handling** - Wrap event handlers in try/catch

### Browser-Side

1. **Manual Connection** - Control when to connect (after auth, not on page load)
2. **Reconnection Strategy** - Handle reconnection with exponential backoff
3. **Event Cleanup** - Remove listeners when components unmount
4. **Connection State** - Track connection status in state management
5. **Offline Handling** - Queue events when disconnected, replay on reconnect

### Performance

1. **Minimize Broadcast Frequency** - Debounce rapid updates
2. **Use Binary Data** - Send binary for large payloads (images, files)
3. **Compress Large Payloads** - Enable compression for text-heavy data
4. **Limit Room Size** - Keep rooms under 1000 clients for performance
5. **Monitor Client Count** - Track `Actinium.IO.clients.list` size

---

## Common Gotchas

### Path Mismatch (CRITICAL)

**Problem**: Client cannot connect, shows `404 /socket.io` error

**Cause**: Client path doesn't match server path

**Solution**:

```javascript
// Server: path: '/actinium.io' (plugin.js:57)
// Client: path: '/actinium.io' (MUST MATCH)
```

### Auto-Connect Before Auth

**Problem**: Client connects before authentication, server rejects connection

**Cause**: `autoConnect: true` (default)

**Solution**:

```javascript
// Use autoConnect: false, connect manually after auth
Actinium.IO = io(ioURL, {
    path: '/actinium.io',
    autoConnect: false,  // Manual control
});

// Later, after authentication
Actinium.IO.auth = { token };
Actinium.IO.connect();
```

### Registry Not Updated on Disconnect

**Problem**: Stale clients in `Actinium.IO.clients.list`

**Cause**: Client disconnected without triggering `disconnecting` event

**Solution**: Built-in handler auto-unregisters (plugin.js:93-96), but if custom tracking, ensure cleanup in `io.disconnecting` hook

### CORS Errors in Production

**Problem**: Browser blocks Socket.io connection with CORS error

**Cause**: Default `origin: '*'` doesn't work with credentials

**Solution**:

```javascript
Actinium.Hook.register('io.config', (socketConfig) => {
    socketConfig.cors = {
        origin: process.env.ALLOWED_ORIGINS.split(','),
        credentials: true,
    };
});
```

### Client ID Not Persistent

**Problem**: `client.id` changes on reconnect

**Cause**: Socket.io generates new ID per connection

**Solution**: Use `client.userId` (custom) or session token for persistent identity

### Polling Stuck, No WebSocket Upgrade

**Problem**: Connection stays on polling, doesn't upgrade to WebSocket

**Cause**: Load balancer not configured for WebSocket

**Solution**: Configure load balancer for sticky sessions + WebSocket support, or use `transports: ['polling']` only

---

## Integration with Other Systems

### Parse Server Live Query

Actinium IO runs **alongside** Parse LiveQuery (different system):

- **Actinium.IO** - General-purpose Socket.io for custom real-time features
- **Actinium.LiveQuery** - Parse Server's real-time database queries

**Both can coexist** - IO for custom events, LiveQuery for database subscriptions

**Source**: `reactium-api/sdk/actinium/index.js:26-35,45-47`

### Hook System

All Socket.io operations integrate with Hook system for extensibility:

```javascript
// Extend connection handling
Actinium.Hook.register('io.connection', async (client) => {
    // Custom connection logic
    await logConnection(client);
    await assignRole(client);
    await sendWelcomeMessage(client);
});
```

### Cloud Functions

Broadcast from any cloud function:

```javascript
Actinium.Cloud.define('notify-users', async (req) => {
    const clients = Actinium.IO.clients.list;

    Object.values(clients).forEach(({ client }) => {
        client.emit('system-notification', {
            message: req.params.message,
            timestamp: new Date(),
        });
    });

    return { sent: Object.keys(clients).length };
});
```

---

## Debugging Techniques

### Enable Debug Logging

```bash
# Server-side Socket.io debug
DEBUG=socket.io:* npm start

# Actinium IO plugin debug (if DEBUG() used)
DEBUG=actinium:io npm start
```

### Inspect Connected Clients

```javascript
// In cloud function or REPL
const clients = Actinium.IO.clients.list;
console.log('Connected clients:', Object.keys(clients).length);
console.log('Client IDs:', Object.keys(clients));
```

### Monitor Events

```javascript
// Log all incoming events (development only)
Actinium.Hook.register('io.connection', (client) => {
    client.onAny((eventName, ...args) => {
        console.log(`Event: ${eventName}`, args);
    });
});
```

### Test Client Connection

```javascript
// Browser console
const { api: Actinium } = await import('@atomic-reactor/reactium-api');
Actinium.IO.connect();
Actinium.IO.on('connect', () => console.log('Connected!'));
Actinium.IO.on('connect_error', (err) => console.error('Error:', err));
```

---

## Comparison with Alternatives

| Feature                | Actinium IO (Socket.io) | Parse LiveQuery    | SSE (Server-Sent Events) |
| ---------------------- | ----------------------- | ------------------ | ------------------------ |
| **Bidirectional**      | ✅ Yes                  | ❌ No (query only) | ❌ No (server→client)    |
| **Custom Events**      | ✅ Yes                  | ❌ No              | ✅ Yes                   |
| **Database Subscribe** | ❌ No                   | ✅ Yes             | ❌ No                    |
| **Rooms/Namespaces**   | ✅ Yes                  | ❌ No              | ❌ No                    |
| **Fallback Support**   | ✅ Polling              | ✅ Polling         | ❌ EventSource only      |
| **Browser Support**    | ✅ All                  | ✅ All             | ⚠️ No IE11               |

**Use Actinium IO when:** Custom real-time events, bidirectional communication, presence, chat, notifications

**Use Parse LiveQuery when:** Real-time database queries, watching specific records

**Use Both:** Most Actinium apps benefit from both systems

---

## Summary

The Actinium IO WebSocket system provides:

- ✅ **Socket.io Server** - Integrated with Actinium HTTP server
- ✅ **Registry-Based Client Tracking** - All clients in `Actinium.IO.clients`
- ✅ **Hook-Driven Extensibility** - `io.config`, `io.init`, `io.connection`, `io.disconnecting` hooks
- ✅ **Custom Socket Path** - `/actinium.io` (configured in both server and client)
- ✅ **CORS Configuration** - Customizable via `io.config` hook
- ✅ **Manual Connection Control** - `autoConnect: false` for auth-first pattern
- ✅ **Browser SDK Integration** - Auto-configured in `@atomic-reactor/reactium-api`

**Critical for:** Real-time features, live updates, collaborative editing, notifications, presence tracking, chat systems

**Comprehensive source references**: `actinium-io/plugin.js:1-104`, `reactium-api/sdk/actinium/index.js:19-48`
