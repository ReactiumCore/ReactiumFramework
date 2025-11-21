describe('Greeter Page', () => {
  it('should display the Greeter component and update the greeting', () => {
    cy.visit('/greeter');
    cy.contains('Greeter');

    cy.get('input[type="text"]').type('World');
    cy.get('button').click();

    cy.contains('Hello, World!');
  });
});