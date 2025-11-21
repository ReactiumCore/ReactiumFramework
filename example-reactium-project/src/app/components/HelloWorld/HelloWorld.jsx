import { useSyncState } from '@atomic-reactor/reactium-core/sdk';
import React from 'react';

/**
 * -----------------------------------------------------------------------------
 * Component: HelloWorld
 * -----------------------------------------------------------------------------
 */
export const HelloWorld = ({ className }) => {
    const state = useSyncState({ content: 'HelloWorld' });
    
    return <div className={className}>{state.get('content')}</div>;
};

HelloWorld.defaultProps = {
    className: 'helloworld'
}; 

export default HelloWorld;
