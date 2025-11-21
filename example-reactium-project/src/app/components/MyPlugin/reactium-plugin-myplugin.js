/**
 * -----------------------------------------------------------------------------
 * Reactium Plugin MyPlugin
 * -----------------------------------------------------------------------------
 */
(async () => {
    const { Hook, Enums, Component, ZoneRegistry, Plugin } = await import(
        '@atomic-reactor/reactium-core/sdk'
    );

    // Register the plugin
    Plugin.register('MyPlugin').then(() => {
        // Import the component to be registered
        const {
            default: MyPluginComponent,
        } = require('./MyPluginComponent').default;

        // Register the component to a Zone
        ZoneRegistry.addComponent({
            id: 'MyPluginComponentInZone',
            zone: 'my-test-zone',
            component: MyPluginComponent,
            message: 'This is my first Reactium plugin component!',
            order: Enums.priority.neutral,
        });
    });
})();
