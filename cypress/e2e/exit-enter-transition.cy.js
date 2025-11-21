describe('Exit-Enter Transition Flow', () => {
    it('should correctly transition from ExitingPage to TransitionPage', () => {
        cy.log('Starting test for Exit-Enter Transition Flow');
        cy.visit('/exit-route'); // Start at ExitingPage

        // 1. Assert initial state of ExitingPage
        cy.get('.exitingpage h2').should('contain', 'Exiting Page');
        cy.get('.exitingpage p').should('contain', 'ExitingPage'); // Original content
        cy.get('[data-cy="current-transition-state"]').should('be.visible');
        cy.get('[data-cy="current-transition-state"]').should(
            'contain',
            'Current Transition State: READY',
        );

        // 2. Click link to TransitionPage to initiate navigation and EXITING transition
        cy.log('Clicking link to /transition');
        cy.get('a[href="/transition"]').click();

        // 3. Assert EXITING state of ExitingPage
        cy.get('[data-cy="current-transition-state"]').should(
            'contain',
            'Current Transition State: EXITING',
        );
        cy.get('.exitingpage .exiting-indicator').should('be.visible');

        // 4. Wait for ExitingPage's EXITING state timeout to complete (500ms + buffer)
        cy.wait(700);

        // 5. Assert that ExitingPage is no longer visible (it should have transitioned out)
        cy.log('Asserting ExitingPage is no longer visible');
        cy.get('.exitingpage').should('not.exist');

        // 6. Assert TransitionPage's LOADING state
        cy.log('Asserting TransitionPage LOADING state');
        cy.get('.transition-page')
            .find('[data-cy="current-transition-state"]')
            .should('contain', 'Current Transition State: LOADING');
        cy.get('.transition-page .loading-indicator').should('be.visible');

        // 7. Wait for TransitionPage's LOADING state timeout (500ms + buffer) to advance to ENTERING
        cy.wait(700);

        // 8. Assert TransitionPage's ENTERING state
        cy.log('Asserting TransitionPage ENTERING state');
        cy.get('.transition-page')
            .find('[data-cy="current-transition-state"]')
            .should('contain', 'Current Transition State: ENTERING');
        cy.get('.transition-page .entering-indicator').should('be.visible');

        // // 9. Wait for TransitionPage's ENTERING state timeout (500ms + buffer) to advance to READY
        cy.wait(700);

        // 10. Assert TransitionPage's READY state
        cy.log('Asserting TransitionPage READY state');
        cy.get('.transition-page')
            .find('[data-cy="current-transition-state"]')
            .should('contain', 'Current Transition State: READY');
        cy.get('.transition-page .ready-indicator').should('be.visible');
        cy.get('.transition-page h2').should('contain', 'Transition Page');
        cy.log('Transition to READY state complete and asserted.');
    });
});
