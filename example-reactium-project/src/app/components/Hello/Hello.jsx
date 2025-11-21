import { useSyncState } from '@atomic-reactor/reactium-core/sdk';
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * -----------------------------------------------------------------------------
 * Component: Hello
 * -----------------------------------------------------------------------------
 */
export const Hello = ({ className }) => {
    const state = useSyncState({ content: 'Hello' });

    return (
        <div className={className}>
            <h1>{state.get('content')}</h1>
            <nav>
                <ul>
                    <li>
                        <Link to='/transition'>Go to Transition Page</Link>
                    </li>
                    <li>
                        <Link to='/user/123'>Go to User 123 Page</Link>
                    </li>
                    <li>
                        <Link to='/hook-tester'>Go to Hook Tester Page</Link>
                    </li>
                    <li>
                        <Link to='/data-loader'>Go to Data Loader Page</Link>
                    </li>
                    <li>
                        <Link to='/advanced-loader/123'>Go to Advanced Loader 123</Link>
                    </li>
                    <li>
                        <Link to='/advanced-loader/456'>Go to Advanced Loader 456</Link>
                    </li>

                </ul>
            </nav>
        </div>
    );
};

Hello.defaultProps = {
    className: 'hello',
};

export default Hello;
