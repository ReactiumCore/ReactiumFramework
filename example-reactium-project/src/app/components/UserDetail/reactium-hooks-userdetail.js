/**
 * -----------------------------------------------------------------------------
 * Reactium Hook: UserDetail
 * -----------------------------------------------------------------------------
 */
(async () => {
    const { Hook, Enums, Component, Routing } = await import(
        '@atomic-reactor/reactium-core/sdk'
    );

    Hook.register(
        'plugin-init',
        async () => {
            const { UserDetail } = await import('./UserDetail');

            Component.register('UserDetail', UserDetail);

            Routing.register({
                path: '/user/:id',
                exact: true,
                component: UserDetail,
                order: Enums.priority.high,
            });
        },
        Enums.priority.normal,
        'user-detail-hooks',
    );
})();
