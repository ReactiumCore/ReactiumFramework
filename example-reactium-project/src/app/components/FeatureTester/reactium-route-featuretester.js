import { FeatureTester as component } from './FeatureTester';
import { Enums } from '@atomic-reactor/reactium-core/sdk'; // Import Enums

export default [
    {
        id: 'route-FeatureTester-1',
        exact: true,
        component,
        path: ['/feature-tester'],
        order: Enums.priority.highest, // Keep order to demonstrate its effect
    },
];
