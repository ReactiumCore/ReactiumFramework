import React, { useEffect } from 'react';
import Reactium, {
    useHookComponent,
    Zone,
} from '@atomic-reactor/reactium-core/sdk';

/**
 * -----------------------------------------------------------------------------
 * Component: HookTester
 * -----------------------------------------------------------------------------
 */
export const HookTester = ({ className }) => {
    const Salutation = useHookComponent('Salutation');

    return (
        <div className={className}>
            <h1>HookTester</h1>
            <Salutation />
            <Zone zone='my-test-zone' />
        </div>
    );
};

HookTester.defaultProps = {
    className: 'hooktester',
};

export default HookTester;
