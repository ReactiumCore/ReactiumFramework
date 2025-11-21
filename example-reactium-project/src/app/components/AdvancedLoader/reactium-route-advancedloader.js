import { AdvancedLoader as component } from './AdvancedLoader';
import { Enums } from '@atomic-reactor/reactium-core/sdk';

export default [
    {
        id: 'route-AdvancedLoader-1',
        exact: true,
        component,
        path: ['/advanced-loader/:id'],
        handleId: 'AdvancedLoaderHandle',
        persistHandle: true,
        order: Enums.priority.high,
        loadState: async ({ params, search }) => {
            console.log(`AdvancedLoader: loadState called for id: ${params.id}`);
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        data: {
                            message: `Data for user ${params.id}`,
                            timestamp: Date.now(),
                            params,
                            search,
                        },
                        loading: false,
                    });
                }, 1000);
            });
        },
    },
]; 
