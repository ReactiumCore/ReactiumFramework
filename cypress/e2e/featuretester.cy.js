describe('FeatureTester Component', () => {
    it('should display loaded data on the /feature-tester route', () => {
        cy.visit('http://localhost:3000/feature-tester');

        /**
         * Assertions true befoe the data loads:
         */
        // Initially, the component should show "Loading data..." - Assert before the delay
        // The test you had here in this assertion was incorrect "Loading or No Data" isn't in the component, so I've corrected it
        cy.contains('Loading data...').should('be.visible');

        cy.contains('Query params: {}').should('be.visible'); // Same as above, not theretically possible after the wait

        /**
         * Wait for data to load.
         */
        cy.wait(2000); // Explicit delay as instructed

        cy.contains(
            'Loaded Data: Data loaded by static loadState for route-FeatureTester-1.',
        ).should('be.visible');

        /**
         * Assertions that are true after the data loads.
         */

        // Check if the component title is displayed - Good, after 2000ms delay, we'd expect the data to be loaded
        cy.get('.featuretester h1').should('contain', 'FeatureTester');

        // Confirm the initial loading message is gone - Correct, after data loads, this message should not be present
        cy.contains('Loading data...').should('not.exist');
    });
});
