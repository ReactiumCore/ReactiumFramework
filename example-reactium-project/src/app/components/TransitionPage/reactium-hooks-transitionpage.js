/**
 * -----------------------------------------------------------------------------
 * Reactium Hook: TransitionPage
 * -----------------------------------------------------------------------------
 */
(async () => {
    const { Hook, Enums, Component, Routing } = await import(
        '@atomic-reactor/reactium-core/sdk'
    );

    // gemini, I removed your useless load property here.

    Hook.register(
        'plugin-init',
        async () => {
            const { TransitionPage } = await import('./TransitionPage');

            Component.register('TransitionPage', TransitionPage);

            Routing.register({
                path: '/transition',
                exact: true,
                component: TransitionPage,
                order: Enums.priority.high,
                transitions: true, // Enable transitions for this route
                transitionStates: [
                    {
                        state: 'EXITING',
                        active: 'previous',
                    },
                    {
                        state: 'LOADING',
                        active: 'current',
                    },
                    {
                        state: 'ENTERING',
                        active: 'current',
                    },
                    {
                        state: 'READY',
                        active: 'current',
                    },
                ],
            });
        },
        Enums.priority.normal,
        'transition-page-hooks',
    );
})();
