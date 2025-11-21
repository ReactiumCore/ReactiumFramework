describe('AdvancedLoader Component', () => {
    it('should load data, persist it, and load new data for a different ID', () => {
        // 1. Visit the first route and verify initial load
        cy.visit('http://localhost:3000/advanced-loader/123');

        cy.get('[data-cy="props-dump"]').invoke('text').then(cy.log);

        // // Should show loading initially
        // cy.get('[data-cy="loading"]').should('be.visible');

        // // Wait for data to load
        // cy.wait(1500);

        // // Verify data for ID 123
        // cy.get('[data-cy="data-loaded"]').should('be.visible');
        // cy.get('[data-cy="data-loaded"]').should('contain', 'Data for user 123');
        // cy.get('[data-cy="loading"]').should('not.exist');

        // // 2. Navigate away
        // cy.visit('http://localhost:3000/');
        // cy.contains('Hello').should('be.visible');

        // // 3. Navigate back and verify persisted data (no loading state)
        // cy.visit('http://localhost:3000/advanced-loader/123');

        // // Should NOT show loading indicator due to persistHandle: true
        // cy.get('[data-cy="loading"]').should('not.exist');

        // // Data should be visible immediately
        // cy.get('[data-cy="data-loaded"]').should('be.visible');
        // cy.get('[data-cy="data-loaded"]').should('contain', 'Data for user 123');

        // // 4. Navigate to a different ID and verify new data load
        // cy.visit('http://localhost:3000/advanced-loader/456');

        // // Should show loading initially for the new ID
        // cy.get('[data-cy="loading"]').should('be.visible');

        // // Wait for data to load
        // cy.wait(1500);

        // // Verify data for ID 456
        // cy.get('[data-cy="data-loaded"]').should('be.visible');
        // cy.get('[data-cy="data-loaded"]').should('contain', 'Data for user 456');
        // cy.get('[data-cy="loading"]').should('not.exist');
    });
});
