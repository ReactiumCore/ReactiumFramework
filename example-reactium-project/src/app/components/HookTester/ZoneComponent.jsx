import React from 'react';

const ZoneComponent = ({ message }) => {
    return (
        <div
            style={{
                border: '1px dashed blue',
                padding: '10px',
                margin: '10px 0',
            }}>
            <h3>Zone Component</h3>
            <p>{message}</p>
        </div>
    );
};

export default ZoneComponent;
