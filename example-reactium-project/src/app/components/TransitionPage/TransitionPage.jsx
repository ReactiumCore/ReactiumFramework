import React, { useEffect } from 'react';
import Reactium, {
    useRouting,
    useHandle,
} from '@atomic-reactor/reactium-core/sdk';
import op from 'object-path';

export const TransitionPage = ({ className, transitionState, ...props }) => {
    const routing = useRouting();
    const handleId = op.get(props, 'route.handleId');
    const dataHandle = useHandle(handleId);
    const loadedData = op.get(dataHandle, 'current', {});

    useEffect(() => {
        console.log(
            'TransitionPage mounted. Initial transitionState from props:',
            transitionState,
        );

        // This useEffect is now primarily for driving nextState() based on transitionState changes
        // and data loading completion.
        if (transitionState === 'LOADING') {
            console.log('TransitionPage: LOADING state detected.');
            setTimeout(() => {
                Reactium.Routing.nextState();
            }, 500);
            // The useEffect below for dataHandle will call nextState() when data is loaded.
        } else if (transitionState === 'ENTERING') {
            console.log(
                'TransitionPage: ENTERING state detected. Setting 1000ms timeout for nextState().',
            );
            setTimeout(() => {
                console.log(
                    'TransitionPage: Calling nextState() from ENTERING after 1000ms.',
                );
                Reactium.Routing.nextState();
            }, 500);
        }
    }, [transitionState]); // Re-run effect when transitionState or routing changes

    console.log('TransitionPage rendered with props:', props);

    return (
        <div className={className}>
            <h2>Transition Page</h2>
            <p data-cy='current-transition-state'>
                Current Transition State: {transitionState}
            </p>
            {transitionState === 'LOADING' && (
                <p className='loading-indicator'>Loading data...</p>
            )}
            {transitionState === 'EXITING' && (
                <p className='exiting-indicator'>Exiting previous page...</p>
            )}
            {transitionState === 'ENTERING' && (
                <p className='entering-indicator'>Entering this page...</p>
            )}
            {transitionState === 'READY' && (
                <div className='ready-indicator'>
                    <p>Page is ready!</p>
                    {loadedData.title && <h3>{loadedData.title}</h3>}
                    {loadedData.message && <p>{loadedData.message}</p>}
                    {loadedData.timestamp && (
                        <p>Loaded at: {loadedData.timestamp}</p>
                    )}
                </div>
            )}
        </div>
    );
};

TransitionPage.defaultProps = {
    className: 'transition-page',
};

export default TransitionPage;
