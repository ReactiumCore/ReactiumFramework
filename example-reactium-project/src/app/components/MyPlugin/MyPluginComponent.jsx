import React from 'react';

const MyPluginComponent = ({ message }) => {
    return (
        <div
            style={{
                border: '1px solid green',
                padding: '10px',
                margin: '10px 0',
            }}>
            <h4>My Plugin Component</h4>
            <p>{message}</p>
        </div>
    );
};

export default MyPluginComponent;
