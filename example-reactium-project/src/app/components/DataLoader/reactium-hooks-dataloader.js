/**
 * -----------------------------------------------------------------------------
 * Reactium Plugin DataLoader
 * -----------------------------------------------------------------------------
 */
(async () => {
    const { Hook, Enums, Component } = await import('@atomic-reactor/reactium-core/sdk');

    Hook.register('plugin-init', async () => {
        const { DataLoader } = await import('./DataLoader');        
        Component.register('DataLoader', DataLoader);
    }, Enums.priority.normal, 'plugin-init-DataLoader');
})();
