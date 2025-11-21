import { useSyncHandle } from '@atomic-reactor/reactium-core/sdk';
import React from 'react';

/**
 * -----------------------------------------------------------------------------
 * Component: AdvancedLoader
 * -----------------------------------------------------------------------------
 */
export const AdvancedLoader = ({ className }) => {
    const handle = useSyncHandle(AdvancedLoader.handleId);
    const loadedData = handle ? handle.get('data') : null;
    const isLoading = handle ? handle.get('loading', true) : true;

    return (
        <div className={className}>
            <h1>Advanced Loader</h1>
            {isLoading && <p data-cy='loading'>Loading...</p>}
            {loadedData && (
                <div>
                    <h2>Data:</h2>
                    <pre data-cy='data-loaded'>{JSON.stringify(loadedData, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

AdvancedLoader.handleId = 'AdvancedLoaderHandle';

AdvancedLoader.defaultProps = {
    className: 'advancedloader'
}; 

export default AdvancedLoader;
