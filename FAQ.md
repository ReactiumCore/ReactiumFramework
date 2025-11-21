# Reactium & Actinium Framework FAQ

Genuine frequently asked questions from developers working with these frameworks.

## Getting Started

### Q: What's the difference between Reactium and Actinium?

**A:** Reactium is the frontend React framework, Actinium is the backend Node.js framework (built on Parse Server + Express). They're designed to work together but can be used independently.

### Q: What's the difference between `npm run local` and `npm start`?

**A:** `npm run local` is for development - it runs webpack with HMR, BrowserSync, file watching, and nodemon. `npm start` just runs the production server (requires `npm run build` first). Always use `npm run local` during development.

### Q: How do I install plugins?

**A:** Use `npx reactium install @realm/package-name` (NOT npm install). This installs from the Reactium registry into `reactium_modules/` or `actinium_modules/` workspaces. Without arguments, it installs everything from ReactiumDependencies/ActiniumDependencies in package.json.

## SDK & Imports

### Q: Where should I import Reactium SDK from?

**A:** In Reactium projects, use `@atomic-reactor/reactium-core/sdk` (or the `reactium-core/sdk` alias). This is the decorated SDK with all the framework features. The bare `@atomic-reactor/reactium-sdk-core` is just the primitives used by CLI, Actinium, and as the base for Reactium.

### Q: What's the difference between `/core` and `/browser` imports?

**A:**
- `/core` - Server-safe utilities (Hook, Cache, Registry, Pulse, Enums)
- `/browser` - Browser-only (Component, Zone, Handles, React hooks, Prefs)
- Default import has both

Use these subpaths when you need to ensure server/browser compatibility.

## State Management

### Q: When should I use `useSyncState` vs `useState`?

**A:** `useSyncState` is Reactium's alternative that returns an observable object (not an array). Use it when you want synchronous updates or need to easily pass state around. Use regular `useState` if you prefer React's standard pattern.

```javascript
// useSyncState - object with .get()/.set()
const state = useSyncState({ count: 0 });
state.set('count', state.get('count') + 1);

// useState - array [value, setter]
const [count, setCount] = useState(0);
setCount(count + 1);
```

### Q: What's the difference between `useHandle` and `useSyncHandle`?

**A:** `useSyncHandle` subscribes to Handle changes and re-renders your component. `useHandle` just retrieves the Handle without subscribing. Almost always use `useSyncHandle` unless you have a specific reason not to.

### Q: When should I use Handles vs local component state?

**A:** Use Handles when multiple components need to share the same state. Use local state (`useSyncState` or `useState`) when the state is only needed in one component.

## Routing

### Q: My new route isn't showing up. What's wrong?

**A:** Check these common issues:
1. File name must match pattern: `/(routes?|reactium-routes?.*?)\.jsx?$/`
2. During `npm run local`, manifest auto-regenerates (check console for errors)
3. Path must start with `/` (e.g., `/my-path` not `my-path`)
4. Component must be imported or registered in Component registry

### Q: What's the route file naming pattern?

**A:** Routes are discovered from files matching: `/(routes?|reactium-routes?.*?)\.jsx?$/`

Valid examples:
- `route.js`
- `routes.js`
- `reactium-route.js`
- `reactium-route-myfeature.js`
- `reactium-routes-admin.js`

### Q: Can I use a string for the component in a route?

**A:** Yes! If the component is registered in the Component registry:

```javascript
// Register component
Component.register('MyComponent', MyComponent);

// Route can reference by string
export default [
    {
        path: '/my-path',
        component: 'MyComponent',  // String reference
    },
];
```

### Q: How do I load data before my route renders?

**A:** Add a static `loadState` method to your component:

```javascript
export const MyPage = () => {
    const handle = useSyncHandle(MyPage.handleId);
    const data = handle?.get('data');
    return <div>{data}</div>;
};

MyPage.loadState = async ({ params }) => {
    const data = await fetchData(params);
    return { data };
};

MyPage.handleId = 'MyPageHandle';
```

The return value gets stored in the Handle.

### Q: Can I use a string for the route component?

**A:** Yes, if you register it in the Component registry:

```javascript
Component.register('MyComponent', MyComponent);

// Then in route:
{ path: '/my-path', component: 'MyComponent' }
```

## Hooks & Priority

### Q: What priority should I use for hooks?

**A:** Use `Enums.priority.neutral` (NOT `.normal` - that doesn't exist and returns undefined). Lower numbers execute first:

```javascript
Enums.priority.highest   // -1000000
Enums.priority.neutral   // 0 (default)
Enums.priority.lowest    // 1000000
```

Only specify a different priority if you need hooks to run in a specific order.

### Q: What's the difference between `reactium-hooks-*.js` and `reactium-boot.js`?

**A:**
- `reactium-hooks-*.js` - Browser-side, runs during client bootstrap
- `reactium-boot.js` - Server-side, runs during Node/Express bootstrap

Use the appropriate file for your execution context.

### Q: What hooks are available?

**A:** Common browser hooks: `plugin-dependencies`, `plugin-init`, `routes-init`, `register-route`, `init`

Common Actinium hooks: `init`, `start`, `before-save-{ClassName}`, `after-save-{ClassName}`, `before-cloud-{functionName}`

Check the CLAUDE/ documentation for complete lists.

## Build System

### Q: Do I need to manually regenerate the manifest when I add routes?

**A:** No! During `npm run local`, Gulp watches for DDD artifact files and automatically regenerates the manifest. Just add your file and the manifest updates automatically.

### Q: Can I edit src/manifest.js?

**A:** Never edit it manually - it's auto-generated and your changes will be overwritten.

### Q: How do I extend webpack configuration?

**A:** Create a `reactium-webpack-*.js` file and use the `ReactiumWebpack` SDK. The old `webpack.override.js` pattern still works but is deprecated.

## Actinium Backend

### Q: Why do I get "require is not defined" errors?

**A:** Actinium requires ES modules. Ensure:
1. `"type": "module"` in package.json
2. Use `import`/`export`, never `require`/`module.exports`
3. Include `.js` extension on relative imports: `import './sdk.js'`

### Q: How do I create a Cloud Function?

**A:** Use `Actinium.Cloud.define()` (not `Parse.Cloud.define()`) to get hook integration:

```javascript
Actinium.Cloud.define(PLUGIN.ID, 'myFunction', async (req) => {
    const { param } = req.params;
    // req.user, req.master available
    return { result: 'success' };
});
```

### Q: When do I need `{ useMasterKey: true }`?

**A:** It depends on your security requirements. Use master key for privileged backend operations that should bypass ACLs. For user-scoped operations, use user sessions. Actinium also has a capabilities system - check actinium-core for patterns.

## Frontend/Backend Integration

### Q: Do I need to initialize Parse SDK in my Reactium app?

**A:** No, the `@atomic-reactor/reactium-api` module handles Parse initialization for you.

### Q: Do I need CORS configuration?

**A:** Usually no - Reactium proxies API requests through `/api` to avoid CORS. If you make direct API calls bypassing the proxy, you'll need CORS.

### Q: How do I call a Cloud Function from the frontend?

**A:**
```javascript
const result = await Parse.Cloud.run('functionName', { param: 'value' });
```

## Troubleshooting

### Q: My handle using component isn't re-rendering when data changes

**A:** You're probably using `useHandle` instead of `useSyncHandle`. Only `useSyncHandle` subscribes to changes:

```javascript
// Won't re-render on changes
const handle = useHandle('MyHandle');

// Will re-render on changes
const handle = useSyncHandle('MyHandle');
```

## More Information

For comprehensive documentation, see the `CLAUDE/` directory with detailed framework guides.