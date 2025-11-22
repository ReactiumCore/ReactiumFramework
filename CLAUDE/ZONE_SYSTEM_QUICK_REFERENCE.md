# Zone System Quick Reference

## Core API

### Zone Component

```javascript
import { Zone } from '@atomic-reactor/reactium-core/sdk';

// Basic usage
<Zone zone="my-zone" />

// With props passed to zone components
<Zone zone="toolbar" user={user} theme={theme} />

// PassThrough mode - components provided to children
<Zone zone="content" passThrough>
    <CustomRenderer />
</Zone>
```

### Component Registration

```javascript
// Add component to zone
Reactium.Zone.addComponent({
    id: 'MY-COMPONENT',              // Required: Unique identifier
    zone: 'my-zone',                  // Required: String or array
    component: MyComponent,           // Required: Component or string ref
    order: 100,                       // Optional: Render order (default: 0)
    // ...any additional props passed to component
});

// Update component
Reactium.Zone.updateComponent('MY-COMPONENT', {
    order: 200,
    newProp: 'value',
});

// Remove component
Reactium.Zone.removeComponent('MY-COMPONENT');
```

### Filters

```javascript
// Add filter - returns ID
const filterId = Reactium.Zone.addFilter(
    'zone-name',
    (component) => component.type !== 'hidden',
    Reactium.Enums.priority.neutral  // Optional
);

// Remove filter
Reactium.Zone.removeFilter(filterId);
```

### Mappers

```javascript
// Add mapper - returns ID
const mapperId = Reactium.Zone.addMapper(
    'zone-name',
    (component) => ({ ...component, enhanced: true }),
    Reactium.Enums.priority.neutral  // Optional
);

// Remove mapper
Reactium.Zone.removeMapper(mapperId);
```

### Sorters

```javascript
// Add sort - returns ID
const sortId = Reactium.Zone.addSort(
    'zone-name',
    'propertyName',   // Property to sort by (default: 'order')
    false,            // Reverse? (default: false)
    Reactium.Enums.priority.neutral  // Optional
);

// Remove sort
Reactium.Zone.removeSort(sortId);
```

### Query Functions

```javascript
// Get all components in zone (filtered, mapped, sorted)
const components = Reactium.Zone.getZoneComponents('my-zone');

// Get raw components (no filters, mappers, or sorts)
const rawComponents = Reactium.Zone.getZoneComponents('my-zone', true);

// Get specific component
const component = Reactium.Zone.getZoneComponent('my-zone', 'MY-COMPONENT');

// Check if component exists
const exists = Reactium.Zone.hasZoneComponent('my-zone', 'MY-COMPONENT');
```

### Subscription

```javascript
// Subscribe to zone changes
const unsubscribe = Reactium.Zone.subscribe('my-zone', (components) => {
    console.log('Zone updated', components);
});

// Always unsubscribe when done
unsubscribe();
```

### React Hook

```javascript
import { useZoneComponents } from '@atomic-reactor/reactium-core/sdk';

// Hook that subscribes to zone changes
const components = useZoneComponents('my-zone');

// Non-dereferenced (returns ReactiumSyncState object)
const zoneState = useZoneComponents('my-zone', false);
const components = zoneState.get();
```

## Priority Constants

```javascript
Reactium.Enums.priority.highest   // 1000
Reactium.Enums.priority.high      // 500
Reactium.Enums.priority.neutral   // 0
Reactium.Enums.priority.low       // -500
Reactium.Enums.priority.lowest    // -1000
```

## Common Patterns

### Plugin Registration Pattern

```javascript
Hook.register(
    'plugin-init',
    async () => {
        const { MyComponent } = await import('./MyComponent');

        Component.register('MyComponent', MyComponent);

        ZoneRegistry.addComponent({
            id: 'PLUGIN-MY-COMPONENT',
            zone: 'target-zone',
            component: 'MyComponent',  // String reference
            order: Enums.priority.neutral,
        });
    },
    Enums.priority.normal,
    'plugin-init-MyPlugin',
);
```

### Conditional Registration

```javascript
const registerPlugin = async () => {
    await Reactium.Plugin.register('MyPlugin');

    const canView = await Reactium.Capability.check(['my.view'], false);

    if (canView) {
        Reactium.Zone.addComponent({
            id: 'MY-COMPONENT',
            component: MyComponent,
            zone: ['admin-content'],
            order: 100,
        });
    }
};
```

### Multi-Zone Registration

```javascript
Reactium.Zone.addComponent({
    id: 'SHARED-COMPONENT',
    zone: ['admin-header', 'admin-sidebar', 'admin-footer'],
    component: MyComponent,
    order: Reactium.Enums.priority.neutral,
});
```

### Capability-Based Filter

```javascript
const registerPlugin = async () => {
    const permissions = await Reactium.User.can(['admin.view', 'vip.view']);

    const filter = (component) => {
        if (!component.requiredCapability) return true;
        return permissions[component.requiredCapability];
    };

    Reactium.Zone.addFilter('protected-zone', filter, Enums.priority.highest);
};
```

### Component Enhancement Mapper

```javascript
const mapper = (component) => {
    return {
        ...component,
        children: [
            ...(component.children || []),
            <Badge key="badge" text={component.badge} />
        ],
    };
};

Reactium.Zone.addMapper('zone-with-badges', mapper);
```

## Zone Component Props

Components rendered in zones receive:

```javascript
const MyZoneComponent = (props) => {
    const {
        zone,           // Zone name
        id,             // Component ID
        order,          // Component order
        ...zoneProps,   // Props passed to <Zone />
        ...customProps, // Props from registration
    } = props;

    return <div>Zone: {zone}, ID: {id}</div>;
};
```

## Common Admin Zone Names

- `admin-header` - Top application header
- `admin-sidebar` - Main sidebar container
- `admin-sidebar-menu` - Sidebar navigation items
- `admin-sidebar-header` - Top of sidebar (usually profile)
- `admin-sidebar-settings` - Settings section in sidebar
- `admin-content` - Main content area
- `admin-actions` - Action buttons/controls
- `admin-toolbar` - Toolbar area
- `admin-logo` - Logo/branding area
- `admin-dashboard` - Dashboard content

## Processing Pipeline

When `<Zone zone="my-zone" />` renders:

1. Get all components registered to "my-zone"
2. Apply all filters in order (removes components)
3. Apply all mappers in order (transforms components)
4. Apply all sorters in order (reorders components)
5. Render each component with merged props

## Performance Tips

1. Use `getZoneComponents(zone, true)` for raw access (skips processing)
2. Memoize zone components with `React.memo()`
3. Avoid heavy operations in filters/mappers
4. Batch zone operations when possible
5. Use PassThrough mode for virtualized lists
6. Pre-compute permissions before creating filters
7. Unsubscribe from zones in cleanup

## Hooks

```javascript
// Called when component added
Hook.register('zone-add-component', (registration) => {
    console.log('Added:', registration.id);
});

// Called when component updated
Hook.register('zone-update-component', (registration) => {
    console.log('Updated:', registration.id);
});

// Called when component removed
Hook.register('zone-remove-component', (registration) => {
    console.log('Removed:', registration.id);
});

// Called during Zone.init() to set defaults
Hook.register('zone-defaults', (context) => {
    context.controls = {
        filter: (component) => true,
        mapper: (component) => component,
        sort: { sortBy: 'order', reverse: false },
    };
    context.components = [];  // Initial components
});
```

## Troubleshooting

### Component Not Rendering
- Check zone name (case-sensitive)
- Verify component registered if using string reference
- Check filter functions
- Verify plugin registered

### Wrong Render Order
- Check `order` property values
- Lower numbers render first
- Verify sort configuration

### Performance Issues
- Profile with React DevTools
- Check filter/mapper complexity
- Reduce subscribers
- Use raw access for read-only

### Memory Leaks
- Always unsubscribe in cleanup
- Remove components on plugin unregister
- Avoid capturing large objects in closures
