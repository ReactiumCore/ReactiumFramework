import { useSyncState } from '@atomic-reactor/reactium-core/sdk';
import React from 'react';

/**
 * -----------------------------------------------------------------------------
 * Component: Greeter
 * -----------------------------------------------------------------------------
 */
export const Greeter = ({ className }) => {
    const state = useSyncState({
        name: '',
        greeting: 'Greeter',
    });

    const handleNameChange = e => {
        state.set('name', e.target.value);
    };

    const handleGreetClick = () => {
        const name = state.get('name');
        if (name) {
            state.set('greeting', `Hello, ${name}!`);
        }
    };

    return (
        <div className={className}>
            <h1>{state.get('greeting')}</h1>
            <input
                type='text'
                value={state.get('name')}
                onChange={handleNameChange}
                placeholder='Enter your name'
            />
            <button onClick={handleGreetClick}>Greet</button>
        </div>
    );
};

Greeter.defaultProps = {
    className: 'greeter',
};

export default Greeter;
