import {
    useSyncState,
    useSyncHandle,
    Enums,
} from '@atomic-reactor/reactium-core/sdk';
import React from 'react';

/**
 * -----------------------------------------------------------------------------
 * Component: FeatureTester
 * -----------------------------------------------------------------------------
 */
export const FeatureTester = ({ className }) => {
    const localState = useSyncState({ content: 'FeatureTester' });
    const handle = useSyncHandle(FeatureTester.handleId);
    const loadedData = handle ? handle.get('content') : null;
    const isLoading = handle.get('isLoading', true); // isLoading will be undefined until loadState resolves

    return (
        <div className={className}>
            <h1>{localState.get('content')}</h1>
            {/* Show loading only if handle exists, but no loadedData and isLoading is not explicitly false */}
            {isLoading && <p>Loading data...</p>}
            {loadedData && <p>Loaded Data: {loadedData}</p>}
            {/* If not loading and no data, show message */}
            {!handle ||
                (isLoading === false && !loadedData && (
                    <p>No data loaded or still initializing...</p>
                ))}
        </div>
    );
};

// Static loadState method on the component
FeatureTester.loadState = async ({ route, params, search }) => {
    // Corrected: async function, no dispatch
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('Static loadState called for route:', route.id);
            // Simulate data fetch
            resolve({
                content: `Data loaded by static loadState for ${route.id}. Query params: ${JSON.stringify(search)}`,
                routeParams: params,
                timestamp: new Date().toISOString(),
                isLoading: false, // Explicitly set isLoading to false when data is resolved
            });
        }, 1200); // Simulate network delay
    });
};

// Static handleId for consistency, although it can also come from route object
FeatureTester.handleId = 'FeatureTesterStaticHandle';

// Static persistHandle
FeatureTester.persistHandle = true; // Example: Persist data across route changes

FeatureTester.defaultProps = {
    className: 'featuretester',
};

export default FeatureTester;
