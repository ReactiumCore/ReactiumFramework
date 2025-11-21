/**
 * -----------------------------------------------------------------------------
 * Reactium Plugin FeatureTester
 * -----------------------------------------------------------------------------
 */
(async () => {
    const { Hook, Enums, Component } = await import('@atomic-reactor/reactium-core/sdk');

    Hook.register('plugin-init', async () => {
        const { FeatureTester } = await import('./FeatureTester');        
        Component.register('FeatureTester', FeatureTester);
    }, Enums.priority.normal, 'plugin-init-FeatureTester');
})();
