import {
    useSyncState,
    useSyncHandle,
} from '@atomic-reactor/reactium-core/sdk';
import React from 'react';

export const DataLoader = ({ className }) => {
    const handle = useSyncHandle(DataLoader.handleId);
    const loadedData = handle ? handle.get('data') : null;
    const isLoading = handle.get('loading', true);

    return (
        <div className={className}>
            <h1>Data Loader</h1>
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

DataLoader.loadState = async ({ route, params, search }) => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                data: {
                    message: 'This data was loaded from loadState!',
                    timestamp: Date.now(),
                    params,
                    search,
                },
                loading: false,
            });
        }, 1000);
    });
};

DataLoader.handleId = 'DataLoaderHandle';

DataLoader.defaultProps = {
    className: 'data-loader',
};

export default DataLoader;