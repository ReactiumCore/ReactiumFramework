/**
 * -----------------------------------------------------------------------------
 * Reactium Plugin HookTester
 * -----------------------------------------------------------------------------
 */
(async () => {
    const { Hook, Enums, Component, ZoneRegistry } = await import(
        '@atomic-reactor/reactium-core/sdk'
    );

    Hook.register(
        'plugin-init',
        async () => {
            const { HookTester } = await import('./HookTester');
            const { Salutation } = await import('./Salutation');
            const { default: ZoneComponent } = await import('./ZoneComponent');

            Component.register('HookTester', HookTester);
            Component.register('Salutation', Salutation);

            ZoneRegistry.addComponent({
                id: 'ZoneComponentInHookTester',
                zone: 'my-test-zone',
                component: ZoneComponent,
                message: 'This component is rendered in a Zone!',
                order: Enums.priority.neutral,
            });
        },
        Enums.priority.normal,
        'plugin-init-HookTester',
    );
})();
