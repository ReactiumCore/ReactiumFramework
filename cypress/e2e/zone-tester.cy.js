describe('Zone Tester Page', () => {
    it('should display the HookTester component and the ZoneComponent', () => {
        cy.visit('/hook-tester');

        // Assert that the HookTester component is visible
        cy.get('.hooktester').should('be.visible');
        cy.get('.hooktester h1').should('contain', 'HookTester');

        // Assert that the Salutation component is visible
        cy.get('.salutation').should('be.visible');
        cy.get('.salutation').should('contain', 'Greetings from the Salutation component!');

        // Assert that the ZoneComponent is visible within the HookTester component
        cy.get('.hooktester').find('div').contains('Zone Component').should('be.visible');
        cy.get('.hooktester').find('div').contains('This component is rendered in a Zone!').should('be.visible');
    });
});
