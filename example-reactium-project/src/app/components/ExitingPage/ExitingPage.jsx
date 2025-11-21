import React, { useEffect } from 'react';
import Reactium, {
    useSyncState,
    useRouting,
} from '@atomic-reactor/reactium-core/sdk';
import { Link } from 'react-router-dom'; // Added Link

/**
 * -----------------------------------------------------------------------------
 * Component: ExitingPage
 * -----------------------------------------------------------------------------
 */
export const ExitingPage = ({ className, transitionState }) => {
    const state = useSyncState({ content: 'ExitingPage' });
    const routing = useRouting();

    useEffect(() => {
        if (transitionState === 'EXITING') {
            console.log(
                'ExitingPage: EXITING state detected. Signaling nextState() after 500ms.',
            );
            setTimeout(() => {
                console.log(
                    'ExitingPage: Calling nextState() from EXITING after 500ms.',
                );
                Reactium.Routing.nextState();
            }, 500);
        }
    }, [transitionState]);

    return (
        <div className={className}>
            <h2>Exiting Page</h2>
            <p data-cy='current-transition-state'>
                Current Transition State: {transitionState}
            </p>
            {transitionState === 'EXITING' && (
                <p className='exiting-indicator'>Exiting this page...</p>
            )}
            {transitionState !== 'EXITING' && (
                <>
                    <p>{state.get('content')}</p>
                    <Link to='/transition' data-cy='transition-link'>
                        Go to Transition Page
                    </Link>
                    {/* Added Link */}
                </>
            )}
        </div>
    );
};

ExitingPage.defaultProps = {
    className: 'exitingpage',
};

export default ExitingPage;
