/**
 * -----------------------------------------------------------------------------
 * Reactium Plugin AdvancedLoader
 * -----------------------------------------------------------------------------
 */
(async () => {
    const { Hook, Enums, Component } = await import('@atomic-reactor/reactium-core/sdk');

    Hook.register('plugin-init', async () => {
        const { AdvancedLoader } = await import('./AdvancedLoader');        
        Component.register('AdvancedLoader', AdvancedLoader);
    }, Enums.priority.normal, 'plugin-init-AdvancedLoader');
})();
