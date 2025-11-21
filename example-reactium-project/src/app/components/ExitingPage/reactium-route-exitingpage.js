import { ExitingPage as component } from './ExitingPage';
import { Enums } from '@atomic-reactor/reactium-core/sdk'; // Import Enums for order and default priority

export default [
    {
        id: 'route-ExitingPage-1',
        exact: true,
        component,
        path: ['/exit-route'],
        order: Enums.priority.high, // Set a high order to ensure it matches
        transitions: true, // Enable transitions for this route
        transitionStates: [
            {
                state: 'EXITING',
                active: 'previous',
            },
            {
                state: 'READY',
                active: 'current',
            },
        ],
    },
];
