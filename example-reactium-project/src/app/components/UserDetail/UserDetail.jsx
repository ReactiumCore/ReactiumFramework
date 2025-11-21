import React from 'react';
import Reactium, {
    useHookComponent,
    useRouteParams,
} from '@atomic-reactor/reactium-core/sdk';

export const UserDetail = ({ className }) => {
    const { id } = useRouteParams();

    return (
        <div className={className}>
            <h2>User Detail</h2>
            <p>User ID: {id}</p>
        </div>
    );
};

UserDetail.defaultProps = {
    className: 'user-detail',
};

export default UserDetail;
