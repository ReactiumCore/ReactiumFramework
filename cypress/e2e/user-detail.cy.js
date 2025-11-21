describe('User Detail Page', () => {
    it('should display the UserDetail component with the correct user ID', () => {
        cy.visit('/user/123');

        // Assert that the UserDetail component is visible
        cy.get('.user-detail').should('be.visible');
        cy.get('.user-detail h2').should('contain', 'User Detail');
        cy.get('.user-detail p').should('contain', 'User ID: 123');

        cy.visit('/user/abc');

        // Assert that the UserDetail component is visible with a different ID
        cy.get('.user-detail').should('be.visible');
        cy.get('.user-detail h2').should('contain', 'User Detail');
        cy.get('.user-detail p').should('contain', 'User ID: abc');
    });
});
