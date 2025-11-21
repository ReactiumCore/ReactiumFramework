describe('Transition Page', () => {
    it('should display transition states correctly', () => {
        cy.log('Starting test for Transition Page');
        cy.visit('/'); // Start from a different page to trigger a route transition
        cy.log('Visited home page');

        cy.get('a[href="/transition"]').click(); // Navigate to the transition page
        cy.log('Clicked on transition link');

        // Assert LOADING state (instantaneous)
        cy.log('Asserting LOADING state');
        cy.get('[data-cy="current-transition-state"]').should(
            'contain',
            'Current Transition State: LOADING',
        );
        cy.get('.loading-indicator').should('be.visible');
        cy.log('LOADING state asserted');

        cy.wait(500); // Allow a very short time for LOADING to advance to ENTERING

        // Assert ENTERING state
        cy.log('Asserting ENTERING state');
        cy.get('[data-cy="current-transition-state"]').should(
            'contain',
            'Current Transition State: ENTERING',
        );
        cy.get('.entering-indicator').should('be.visible');
        cy.log('ENTERING state asserted');

        cy.wait(1000); // Wait for the ENTERING state's defined delay (250ms + buffer)

        // Assert READY state
        cy.log('Asserting READY state');
        cy.get('[data-cy="current-transition-state"]').should(
            'contain',
            'Current Transition State: READY',
        );
        cy.get('.ready-indicator').should('be.visible');
        cy.log('READY state asserted');
    });
});
