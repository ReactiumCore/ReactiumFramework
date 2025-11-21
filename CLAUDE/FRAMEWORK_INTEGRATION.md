# Reactium + Actinium Integration Guide

> **Purpose**: This guide demonstrates how Reactium (frontend) and Actinium (backend) frameworks work together to create full-stack applications. It covers integration patterns, data flow, authentication, and real-world examples from this codebase.

## Table of Contents

1. [Integration Overview](#integration-overview)
2. [Project Structure](#project-structure)
3. [Data Flow Patterns](#data-flow-patterns)
4. [Authentication & Session Management](#authentication--session-management)
5. [Cloud Function Integration](#cloud-function-integration)
6. [Real-Time Communication](#real-time-communication)
7. [File Uploads](#file-uploads)
8. [Error Handling](#error-handling)
9. [Development Workflow](#development-workflow)
10. [Deployment Considerations](#deployment-considerations)
11. [Real-World Examples](#real-world-examples)

---

## Integration Overview

### Architecture at a Glance

```
┌─────────────────────────────────────┐
│         Client (Browser)            │
│  ┌──────────────────────────────┐   │
│  │  Reactium Framework          │   │
│  │  - React Components          │   │
│  │  - Client-side Routing       │   │
│  │  - State Management          │   │
│  │  - Parse SDK (JS)            │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
                 │
                 │ HTTP/WebSocket
                 │ Parse REST API
                 │ Cloud Functions
                 ▼
┌─────────────────────────────────────┐
│      Server (Node.js)               │
│  ┌──────────────────────────────┐   │
│  │  Actinium Framework          │   │
│  │  - Plugin System             │   │
│  │  - Hook System               │   │
│  │  - Express.js                │   │
│  │  - Parse Server              │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│          MongoDB                    │
│  - User authentication              │
│  - Application data                 │
│  - Sessions                         │
└─────────────────────────────────────┘
```

### Communication Protocol

**Reactium ↔ Actinium** communication happens through:

1. **Parse REST API**: Standard CRUD operations on Parse Objects
2. **Cloud Functions**: Custom backend logic exposed as API endpoints
3. **WebSockets**: Real-time updates via Parse Live Query (optional)
4. **Static Assets**: Files served directly by Express

---

## Project Structure

A typical full-stack Reactium/Actinium project:

```
project-root/
├── ui/                                    # Reactium frontend
│   ├── src/
│   │   ├── app/
│   │   │   └── components/
│   │   │       └── MyFeature/
│   │   │           ├── MyFeature.jsx
│   │   │           ├── reactium-route-myfeature.js
│   │   │           └── reactium-hooks-myfeature.js
│   │   └── manifest.js                   # Auto-generated
│   ├── reactium_modules/
│   │   └── @atomic-reactor/
│   │       └── reactium-core/            # Frontend framework
│   └── package.json
│
├── api/                                   # Actinium backend
│   ├── src/
│   │   ├── app/
│   │   │   └── my-plugin/
│   │   │       ├── plugin.js             # Plugin registration
│   │   │       ├── info.js               # Plugin metadata
│   │   │       └── sdk.js                # Plugin SDK
│   │   └── index.js                      # Server entry point
│   ├── actinium_modules/
│   │   └── @atomic-reactor/
│   │       └── actinium-core/            # Backend framework
│   ├── .env                              # Environment config
│   └── package.json
│
└── .gitignore
```

### Key Integration Points

1. **Parse SDK Configuration**: Frontend connects to backend
2. **Cloud Functions**: Backend exposes API endpoints
3. **Authentication**: Shared session management
4. **Environment Configuration**: Coordinated settings

---

## Data Flow Patterns

### Pattern 1: Component → Cloud Function → Database

**Use Case**: Fetching data from an external API via backend proxy

**Frontend (Reactium)**:

```javascript
// ui/src/app/components/CryptoData/CryptoData.jsx
import { useSyncState, useSyncHandle } from 'reactium-core/sdk';
import Parse from 'parse';
import React, { useEffect } from 'react';

export const CryptoData = () => {
    const state = useSyncState({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                state.set('loading', true);

                // Call Actinium Cloud Function
                const result = await Parse.Cloud.run('getOHLC', {
                    coinId: 'bitcoin',
                    vsCurrency: 'usd',
                    days: '7',
                });

                state.set({
                    data: result,
                    loading: false,
                    error: null,
                });
            } catch (error) {
                state.set({
                    data: null,
                    loading: false,
                    error: error.message,
                });
            }
        };

        fetchData();
    }, []);

    if (state.get('loading')) return <div>Loading...</div>;
    if (state.get('error')) return <div>Error: {state.get('error')}</div>;

    return (
        <div>
            <h1>Bitcoin OHLC Data</h1>
            <pre>{JSON.stringify(state.get('data'), null, 2)}</pre>
        </div>
    );
};

export default CryptoData;
```

**Backend (Actinium)**:

```javascript
// api/src/app/coingecko/plugin.js
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';
import SDK from './sdk.js';

const MOD = () => {
    Actinium.CoinGecko = Actinium.CoinGecko || SDK;
    Actinium.Plugin.register(PLUGIN, true);

    // Register Cloud Function
    Actinium.Cloud.define(PLUGIN.ID, 'getOHLC', async (req) => {
        const { coinId, vsCurrency, days } = req.params;

        // Call external API
        const data = await SDK.getOHLC(coinId, vsCurrency, days);

        // Optionally cache in MongoDB
        const CachedData = Actinium.Object.extend('CryptoCache');
        const cached = new CachedData();
        cached.set('coinId', coinId);
        cached.set('data', data);
        cached.set('timestamp', new Date());
        await cached.save(null, { useMasterKey: true });

        return data;
    });
};

export default MOD();
```

```javascript
// api/src/app/coingecko/sdk.js
import CoinGeckoService from './coingecko-service.js';

export default {
    getOHLC: CoinGeckoService.getOHLC.bind(CoinGeckoService),
};
```

```javascript
// api/src/app/coingecko/coingecko-service.js
class CoinGeckoService {
    async getOHLC(coinId, vsCurrency, days) {
        const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc`;
        const params = new URLSearchParams({
            vs_currency: vsCurrency,
            days: days,
        });

        const response = await fetch(`${url}?${params}`);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        return response.json();
    }
}

export default new CoinGeckoService();
```

### Pattern 2: Route-Based Data Loading with Backend

**Frontend (Reactium) with loadState**:

```javascript
// ui/src/app/components/UserProfile/UserProfile.jsx
import { useSyncHandle } from 'reactium-core/sdk';
import Parse from 'parse';
import React from 'react';

export const UserProfile = ({ params }) => {
    const handle = useSyncHandle(UserProfile.handleId);
    const user = handle ? handle.get('user') : null;
    const isLoading = handle ? handle.get('loading', true) : true;

    if (isLoading) return <div>Loading user profile...</div>;

    return (
        <div>
            <h1>{user.get('username')}</h1>
            <p>Email: {user.get('email')}</p>
            <p>Joined: {user.get('createdAt').toLocaleDateString()}</p>
        </div>
    );
};

// Static loadState - called before component renders
UserProfile.loadState = async ({ route, params, search }) => {
    const { userId } = params;

    // Query Parse User object from Actinium
    const query = new Parse.Query('_User');
    const user = await query.get(userId);

    return {
        user,
        loading: false,
    };
};

UserProfile.handleId = 'UserProfileHandle';

export default UserProfile;
```

**Route Definition**:

```javascript
// ui/src/app/components/UserProfile/reactium-route-userprofile.js
import { UserProfile as component } from './UserProfile';
import { Enums } from 'reactium-core/sdk';

export default [
    {
        id: 'route-UserProfile-1',
        exact: true,
        component,
        path: '/user/:userId',
        order: Enums.priority.neutral,
    },
];
```

**Backend (Actinium) - Extended User Model**:

```javascript
// api/src/app/user-profile/plugin.js
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';

const MOD = () => {
    Actinium.Plugin.register(PLUGIN, true);

    // Hook into User save to add custom fields
    Actinium.Hook.register('before-save-_User', async (req, context) => {
        const { object, user } = req;

        // Add custom profile fields
        if (!object.get('profileCompleted')) {
            object.set('profileCompleted', false);
        }
    }, Actinium.Enums.priority.neutral);

    // Cloud Function for updating profile
    Actinium.Cloud.define(PLUGIN.ID, 'updateProfile', async (req) => {
        const { profileData } = req.params;
        const user = req.user;

        if (!user) {
            throw new Error('Authentication required');
        }

        // Update user object
        user.set('bio', profileData.bio);
        user.set('profileCompleted', true);

        await user.save(null, { sessionToken: user.getSessionToken() });

        return { success: true };
    });
};

export default MOD();
```

### Pattern 3: Real-Time Data with Parse Live Query

**Backend Configuration**:

```javascript
// api/src/index.js or plugin
const parseConfig = {
    appId: process.env.APP_ID,
    masterKey: process.env.MASTER_KEY,
    serverURL: process.env.SERVER_URL,
    liveQuery: {
        classNames: ['CryptoPrice', 'TradingSignal'],  // Enable live queries
    },
};
```

**Frontend Subscription**:

```javascript
// ui/src/app/components/LivePrices/LivePrices.jsx
import { useSyncState } from 'reactium-core/sdk';
import Parse from 'parse';
import React, { useEffect } from 'react';

export const LivePrices = () => {
    const state = useSyncState({
        prices: [],
    });

    useEffect(() => {
        const query = new Parse.Query('CryptoPrice');
        const subscription = query.subscribe();

        subscription.on('create', (price) => {
            // New price created
            state.set('prices', [...state.get('prices'), price]);
        });

        subscription.on('update', (price) => {
            // Price updated
            const prices = state.get('prices');
            const index = prices.findIndex(p => p.id === price.id);
            if (index !== -1) {
                prices[index] = price;
                state.set('prices', [...prices]);
            }
        });

        // Cleanup
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <div>
            <h1>Live Crypto Prices</h1>
            <ul>
                {state.get('prices').map(price => (
                    <li key={price.id}>
                        {price.get('symbol')}: ${price.get('price')}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default LivePrices;
```

---

## Authentication & Session Management

### Parse SDK Initialization

**Frontend (Reactium)**:

```javascript
// ui/src/app/components/App/reactium-hooks-App.js
import Parse from 'parse';
import Reactium from 'reactium-core/sdk';

(async () => {
    const { Hook, Enums } = await import('reactium-core/sdk');

    Hook.register('plugin-init', async () => {
        // Initialize Parse SDK
        Parse.initialize(
            process.env.REACT_APP_PARSE_APP_ID || 'YOUR_APP_ID',
            process.env.REACT_APP_PARSE_JS_KEY || 'YOUR_JS_KEY'
        );
        Parse.serverURL = process.env.REACT_APP_PARSE_SERVER_URL || 'http://localhost:9000/parse';

        console.log('Parse SDK initialized');
    }, Enums.priority.highest, 'parse-sdk-init');
})();
```

### User Login

**Frontend Component**:

```javascript
// ui/src/app/components/Login/Login.jsx
import { useSyncState } from 'reactium-core/sdk';
import Parse from 'parse';
import React from 'react';

export const Login = () => {
    const state = useSyncState({
        username: '',
        password: '',
        error: null,
        loading: false,
    });

    const handleLogin = async (e) => {
        e.preventDefault();
        state.set('loading', true);

        try {
            const user = await Parse.User.logIn(
                state.get('username'),
                state.get('password')
            );

            console.log('Logged in as:', user.get('username'));

            // Store session globally
            Reactium.State.set('currentUser', user);

            // Redirect
            window.location.href = '/dashboard';
        } catch (error) {
            state.set({
                error: error.message,
                loading: false,
            });
        }
    };

    return (
        <form onSubmit={handleLogin}>
            <input
                type="text"
                placeholder="Username"
                value={state.get('username')}
                onChange={(e) => state.set('username', e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                value={state.get('password')}
                onChange={(e) => state.set('password', e.target.value)}
            />
            <button type="submit" disabled={state.get('loading')}>
                {state.get('loading') ? 'Logging in...' : 'Login'}
            </button>
            {state.get('error') && <div className="error">{state.get('error')}</div>}
        </form>
    );
};

export default Login;
```

### Protected Routes

**Frontend Route Guard**:

```javascript
// ui/src/app/components/ProtectedRoute/ProtectedRoute.jsx
import Parse from 'parse';
import React, { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';

export const ProtectedRoute = ({ component: Component, ...rest }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            const currentUser = Parse.User.current();
            setIsAuthenticated(!!currentUser);
        };
        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        return <div>Checking authentication...</div>;
    }

    if (!isAuthenticated) {
        return <Redirect to="/login" />;
    }

    return <Component {...rest} />;
};

export default ProtectedRoute;
```

### Backend Authentication Hook

```javascript
// api/src/app/auth/plugin.js
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';

const MOD = () => {
    Actinium.Plugin.register(PLUGIN, true);

    // Hook into User login
    Actinium.Hook.register('before-login', async (req, context) => {
        const { username } = req.params;
        console.log('User attempting login:', username);

        // Could add rate limiting, IP checks, etc.
    }, Actinium.Enums.priority.neutral);

    // Cloud Function to check session
    Actinium.Cloud.define(PLUGIN.ID, 'checkSession', async (req) => {
        const user = req.user;

        if (!user) {
            throw new Error('Not authenticated');
        }

        return {
            authenticated: true,
            username: user.get('username'),
            email: user.get('email'),
        };
    });
};

export default MOD();
```

---

## Cloud Function Integration

### Request/Response Pattern

**Frontend**:

```javascript
// Any component
import Parse from 'parse';

const result = await Parse.Cloud.run('functionName', {
    param1: 'value1',
    param2: 'value2',
});
```

**Backend**:

```javascript
// api/src/app/my-plugin/plugin.js
Actinium.Cloud.define(PLUGIN.ID, 'functionName', async (req) => {
    const { param1, param2 } = req.params;
    const user = req.user;  // Current user (if authenticated)
    const master = req.master;  // Master key used?

    // Perform operations
    const result = await doSomething(param1, param2);

    return result;  // Returned to frontend
});
```

### Error Handling

**Backend**:

```javascript
Actinium.Cloud.define(PLUGIN.ID, 'riskyOperation', async (req) => {
    // Validation
    if (!req.user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'Authentication required');
    }

    const { param } = req.params;
    if (!param) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'param is required');
    }

    try {
        const result = await externalAPI(param);
        return result;
    } catch (error) {
        // Log error server-side
        console.error('External API error:', error);

        // Return user-friendly error
        throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Service temporarily unavailable');
    }
});
```

**Frontend**:

```javascript
try {
    const result = await Parse.Cloud.run('riskyOperation', { param: 'value' });
    // Handle success
} catch (error) {
    if (error.code === Parse.Error.INVALID_SESSION_TOKEN) {
        // Redirect to login
        window.location.href = '/login';
    } else {
        // Show error to user
        alert(`Error: ${error.message}`);
    }
}
```

### Permission Gating with Capabilities

**Backend**:

```javascript
// Define capability
Actinium.Capability.register('trading.execute', {
    allowed: ['Trader', 'Admin'],
    excluded: ['Suspended'],
});

// Cloud Function with capability check
Actinium.Cloud.define(PLUGIN.ID, 'executeTrade', async (req) => {
    const user = req.user;

    if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'Authentication required');
    }

    // Check capability
    const canTrade = await Actinium.Capability.User.can(user, 'trading.execute');

    if (!canTrade) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions');
    }

    // Execute trade
    const { symbol, amount } = req.params;
    const result = await executeTrade(symbol, amount);

    return result;
});
```

---

## Real-Time Communication

### Parse Live Query Setup

**Backend Configuration**:

```javascript
// api/.env
PARSE_LIVE_QUERY_CLASSES=TradingSignal,CryptoPrice,Alert
```

**Backend Plugin**:

```javascript
// api/src/app/trading/plugin.js
Actinium.Cloud.define(PLUGIN.ID, 'createSignal', async (req) => {
    const { symbol, action, price } = req.params;

    // Create signal object
    const Signal = Actinium.Object.extend('TradingSignal');
    const signal = new Signal();

    signal.set('symbol', symbol);
    signal.set('action', action);
    signal.set('price', price);
    signal.set('timestamp', new Date());

    // Set ACL for public read
    const acl = new Actinium.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(false);
    signal.setACL(acl);

    await signal.save(null, { useMasterKey: true });

    // All subscribed clients will receive this immediately
    return signal;
});
```

**Frontend Subscription**:

```javascript
// ui/src/app/components/SignalFeed/SignalFeed.jsx
import { useSyncState } from 'reactium-core/sdk';
import Parse from 'parse';
import React, { useEffect } from 'react';

export const SignalFeed = () => {
    const state = useSyncState({
        signals: [],
    });

    useEffect(() => {
        // Initial query
        const loadSignals = async () => {
            const query = new Parse.Query('TradingSignal');
            query.descending('createdAt');
            query.limit(50);
            const results = await query.find();
            state.set('signals', results);
        };

        loadSignals();

        // Subscribe to live updates
        const query = new Parse.Query('TradingSignal');
        const subscription = query.subscribe();

        subscription.on('create', (signal) => {
            state.set('signals', [signal, ...state.get('signals')]);
        });

        subscription.on('update', (signal) => {
            const signals = state.get('signals');
            const index = signals.findIndex(s => s.id === signal.id);
            if (index !== -1) {
                signals[index] = signal;
                state.set('signals', [...signals]);
            }
        });

        subscription.on('delete', (signal) => {
            state.set('signals', state.get('signals').filter(s => s.id !== signal.id));
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <div>
            <h1>Trading Signals</h1>
            <ul>
                {state.get('signals').map(signal => (
                    <li key={signal.id}>
                        {signal.get('action')} {signal.get('symbol')} @ ${signal.get('price')}
                        <small> - {signal.get('timestamp').toLocaleTimeString()}</small>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SignalFeed;
```

---

## File Uploads

### Backend File Upload

**Actinium Plugin**:

```javascript
// api/src/app/file-manager/plugin.js
Actinium.Cloud.define(PLUGIN.ID, 'uploadFile', async (req) => {
    const { fileName, fileData, contentType } = req.params;

    // Create Parse File
    const file = new Actinium.File(fileName, { base64: fileData }, contentType);
    await file.save();

    // Store file reference in database
    const FileRecord = Actinium.Object.extend('FileRecord');
    const record = new FileRecord();
    record.set('file', file);
    record.set('uploadedBy', req.user);
    record.set('uploadedAt', new Date());

    await record.save(null, { useMasterKey: true });

    return {
        url: file.url(),
        name: file.name(),
    };
});
```

**Frontend Upload**:

```javascript
// ui/src/app/components/FileUpload/FileUpload.jsx
import { useSyncState } from 'reactium-core/sdk';
import Parse from 'parse';
import React from 'react';

export const FileUpload = () => {
    const state = useSyncState({
        uploading: false,
        fileUrl: null,
    });

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        state.set('uploading', true);

        try {
            // Read file as base64
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result.split(',')[1];

                // Upload via Cloud Function
                const result = await Parse.Cloud.run('uploadFile', {
                    fileName: file.name,
                    fileData: base64,
                    contentType: file.type,
                });

                state.set({
                    uploading: false,
                    fileUrl: result.url,
                });
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Upload error:', error);
            state.set('uploading', false);
        }
    };

    return (
        <div>
            <input
                type="file"
                onChange={handleFileChange}
                disabled={state.get('uploading')}
            />
            {state.get('uploading') && <div>Uploading...</div>}
            {state.get('fileUrl') && (
                <div>
                    <p>Uploaded successfully!</p>
                    <a href={state.get('fileUrl')} target="_blank" rel="noopener noreferrer">
                        View File
                    </a>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
```

---

## Error Handling

### Centralized Error Handler (Frontend)

```javascript
// ui/src/app/components/ErrorBoundary/ErrorBoundary.jsx
import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);

        // Optionally log to backend
        Parse.Cloud.run('logError', {
            error: error.toString(),
            stack: error.stack,
            componentStack: errorInfo.componentStack,
        }).catch(err => console.error('Failed to log error:', err));
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <h1>Something went wrong</h1>
                    <p>{this.state.error?.message}</p>
                    <button onClick={() => window.location.reload()}>
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
```

### Backend Error Logging

```javascript
// api/src/app/logging/plugin.js
Actinium.Cloud.define(PLUGIN.ID, 'logError', async (req) => {
    const { error, stack, componentStack } = req.params;

    const ErrorLog = Actinium.Object.extend('ErrorLog');
    const log = new ErrorLog();

    log.set('error', error);
    log.set('stack', stack);
    log.set('componentStack', componentStack);
    log.set('user', req.user);
    log.set('timestamp', new Date());

    await log.save(null, { useMasterKey: true });

    return { logged: true };
});
```

---

## Development Workflow

### Running Both Frameworks

**Terminal 1 - Backend (Actinium)**:

```bash
cd api
npm install
cp .env.example .env  # Configure environment
npm start
# Runs on http://localhost:9000
```

**Terminal 2 - Frontend (Reactium)**:

```bash
cd ui
npm install
npm run local
# Runs on http://localhost:3000
```

### Environment Configuration

**Backend (.env)**:

```bash
# api/.env
APP_ID=my-app-id
MASTER_KEY=my-master-key
JAVASCRIPT_KEY=my-js-key
SERVER_URL=http://localhost:9000
DATABASE_URI=mongodb://localhost:27017/myapp
PORT=9000

# Live Query
PARSE_LIVE_QUERY_CLASSES=TradingSignal,CryptoPrice
```

**Frontend (.env)**:

```bash
# ui/.env
REACT_APP_PARSE_APP_ID=my-app-id
REACT_APP_PARSE_JS_KEY=my-js-key
REACT_APP_PARSE_SERVER_URL=http://localhost:9000/parse
PORT=3000
```

### Hot Reloading

- **Frontend**: Webpack HMR automatically reloads on file changes
- **Backend**: Use `nodemon` or `npm-run-all` for automatic restarts

```json
// api/package.json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

---

## Deployment Considerations

### Environment Variables

**Production Backend**:

```bash
APP_ID=production-app-id
MASTER_KEY=secure-random-master-key
SERVER_URL=https://api.myapp.com
DATABASE_URI=mongodb+srv://user:pass@cluster.mongodb.net/prod
PORT=9000
NODE_ENV=production
```

**Production Frontend**:

```bash
REACT_APP_PARSE_APP_ID=production-app-id
REACT_APP_PARSE_JS_KEY=production-js-key
REACT_APP_PARSE_SERVER_URL=https://api.myapp.com/parse
NODE_ENV=production
```

### CORS Configuration

**Backend Middleware**:

```javascript
// api/src/app/cors/middleware.js
import Actinium from '@atomic-reactor/actinium-core';
import cors from 'cors';

Actinium.Middleware.register(
    'cors',
    (app) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:3000',
            'https://myapp.com',
        ];

        app.use(cors({
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
        }));
    },
    Actinium.Enums.priority.highest,
    'cors-middleware'
);
```

### Build Process

**Backend**:

```bash
cd api
npm run build  # If transpilation needed
npm start
```

**Frontend**:

```bash
cd ui
npm run build  # Creates optimized production build in /public
# Serve via Express or CDN
```

---

## Real-World Examples

### Example 1: Complete CRUD Feature

**Backend Plugin** (Actinium):

```javascript
// api/src/app/todos/plugin.js
import Actinium from '@atomic-reactor/actinium-core';
import PLUGIN from './info.js';

const MOD = () => {
    Actinium.Plugin.register(PLUGIN, true);

    // Create schema
    Actinium.Hook.register('schema-created', async () => {
        const schema = new Actinium.Schema('Todo');

        try {
            await schema.get({ useMasterKey: true });
        } catch (err) {
            schema.addString('title');
            schema.addString('description');
            schema.addBoolean('completed');
            schema.addPointer('owner', '_User');
            await schema.save(null, { useMasterKey: true });
        }
    }, Actinium.Enums.priority.neutral);

    // Cloud Functions
    Actinium.Cloud.define(PLUGIN.ID, 'createTodo', async (req) => {
        const { title, description } = req.params;
        const user = req.user;

        if (!user) throw new Error('Authentication required');

        const Todo = Actinium.Object.extend('Todo');
        const todo = new Todo();

        todo.set('title', title);
        todo.set('description', description);
        todo.set('completed', false);
        todo.set('owner', user);

        const acl = new Actinium.ACL(user);
        acl.setPublicReadAccess(false);
        todo.setACL(acl);

        await todo.save(null, { useMasterKey: true });

        return todo;
    });

    Actinium.Cloud.define(PLUGIN.ID, 'getTodos', async (req) => {
        const user = req.user;
        if (!user) throw new Error('Authentication required');

        const query = new Actinium.Query('Todo');
        query.equalTo('owner', user);
        query.descending('createdAt');

        const results = await query.find({ sessionToken: user.getSessionToken() });
        return results;
    });

    Actinium.Cloud.define(PLUGIN.ID, 'updateTodo', async (req) => {
        const { todoId, completed } = req.params;
        const user = req.user;

        if (!user) throw new Error('Authentication required');

        const query = new Actinium.Query('Todo');
        const todo = await query.get(todoId, { sessionToken: user.getSessionToken() });

        todo.set('completed', completed);
        await todo.save(null, { sessionToken: user.getSessionToken() });

        return todo;
    });

    Actinium.Cloud.define(PLUGIN.ID, 'deleteTodo', async (req) => {
        const { todoId } = req.params;
        const user = req.user;

        if (!user) throw new Error('Authentication required');

        const query = new Actinium.Query('Todo');
        const todo = await query.get(todoId, { sessionToken: user.getSessionToken() });

        await todo.destroy({ sessionToken: user.getSessionToken() });

        return { success: true };
    });
};

export default MOD();
```

**Frontend Component** (Reactium):

```javascript
// ui/src/app/components/TodoList/TodoList.jsx
import { useSyncState } from 'reactium-core/sdk';
import Parse from 'parse';
import React, { useEffect } from 'react';

export const TodoList = () => {
    const state = useSyncState({
        todos: [],
        loading: true,
        newTitle: '',
        newDescription: '',
    });

    const loadTodos = async () => {
        try {
            const todos = await Parse.Cloud.run('getTodos');
            state.set({ todos, loading: false });
        } catch (error) {
            console.error('Error loading todos:', error);
            state.set('loading', false);
        }
    };

    useEffect(() => {
        loadTodos();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();

        try {
            await Parse.Cloud.run('createTodo', {
                title: state.get('newTitle'),
                description: state.get('newDescription'),
            });

            state.set({ newTitle: '', newDescription: '' });
            loadTodos();
        } catch (error) {
            console.error('Error creating todo:', error);
        }
    };

    const handleToggle = async (todoId, currentCompleted) => {
        try {
            await Parse.Cloud.run('updateTodo', {
                todoId,
                completed: !currentCompleted,
            });
            loadTodos();
        } catch (error) {
            console.error('Error updating todo:', error);
        }
    };

    const handleDelete = async (todoId) => {
        try {
            await Parse.Cloud.run('deleteTodo', { todoId });
            loadTodos();
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    };

    if (state.get('loading')) return <div>Loading...</div>;

    return (
        <div>
            <h1>Todo List</h1>

            <form onSubmit={handleCreate}>
                <input
                    type="text"
                    placeholder="Title"
                    value={state.get('newTitle')}
                    onChange={(e) => state.set('newTitle', e.target.value)}
                    required
                />
                <textarea
                    placeholder="Description"
                    value={state.get('newDescription')}
                    onChange={(e) => state.set('newDescription', e.target.value)}
                />
                <button type="submit">Add Todo</button>
            </form>

            <ul>
                {state.get('todos').map(todo => (
                    <li key={todo.id}>
                        <input
                            type="checkbox"
                            checked={todo.get('completed')}
                            onChange={() => handleToggle(todo.id, todo.get('completed'))}
                        />
                        <span style={{ textDecoration: todo.get('completed') ? 'line-through' : 'none' }}>
                            {todo.get('title')}
                        </span>
                        <button onClick={() => handleDelete(todo.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TodoList;
```

---

## Summary

This integration guide demonstrates how Reactium and Actinium work together to create full-stack applications:

1. **Clear Separation**: Frontend (Reactium) and backend (Actinium) are distinct but interconnected
2. **Parse SDK Bridge**: Parse SDK provides the communication layer
3. **Cloud Functions**: Primary method for custom backend logic
4. **Shared Authentication**: Parse User sessions work across both frameworks
5. **Real-Time Capabilities**: Live Query enables WebSocket-based updates
6. **Convention-Based**: Both frameworks use conventions for discovery and registration

By following these patterns, you can build scalable, maintainable full-stack applications with minimal boilerplate and maximum flexibility.

For framework-specific details, see:
- [REACTIUM_FRAMEWORK.md](/home/john/reactium-framework/REACTIUM_FRAMEWORK.md) - Frontend framework guide
- [ACTINIUM_FRAMEWORK.md](/home/john/reactium-framework/ACTINIUM_FRAMEWORK.md) - Backend framework guide
