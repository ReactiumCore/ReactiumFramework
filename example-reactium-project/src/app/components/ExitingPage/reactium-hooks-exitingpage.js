/**
 * -----------------------------------------------------------------------------
 * Reactium Plugin ExitingPage
 * -----------------------------------------------------------------------------
 */
(async () => {
    const { Hook, Enums, Component } = await import('@atomic-reactor/reactium-core/sdk');

    Hook.register('plugin-init', async () => {
        const { ExitingPage } = await import('./ExitingPage');        
        Component.register('ExitingPage', ExitingPage);
    }, Enums.priority.normal, 'plugin-init-ExitingPage');
})();
