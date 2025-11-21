describe('DataLoader Component', () => {
    it('should display loaded data on the /data-loader route', () => {
        cy.visit('http://localhost:3000/data-loader');

        // Initially, the component should show "Loading..."
        cy.get('[data-cy="loading"]').should('be.visible');

        // Wait for data to load (simulated 1000ms delay in loadState + buffer)
        cy.wait(1500);

        // Check if the loaded data is displayed
        cy.get('[data-cy="data-loaded"]').should('be.visible');
        cy.get('[data-cy="data-loaded"]').should('contain', 'This data was loaded from loadState!');

        // Confirm the initial loading message is gone
        cy.get('[data-cy="loading"]').should('not.exist');
    });
});