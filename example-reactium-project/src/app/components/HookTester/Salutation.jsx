import React from 'react';

export const Salutation = ({ className }) => {
    return (
        <div className={className}>
            Greetings from the Salutation component!
        </div>
    );
};

Salutation.defaultProps = {
    className: 'salutation',
};

export default Salutation;
