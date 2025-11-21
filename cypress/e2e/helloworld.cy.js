describe('HelloWorld Component', () => {
    it('should display "HelloWorld" on the /helloworld route', () => {
        cy.visit('http://localhost:3000/helloworld');
        cy.contains('HelloWorld').should('be.visible');
    });
});
