describe('Reactium Learning App', () => {
  it('should display the Hello component on the home page', () => {
    cy.visit('/');
    cy.contains('Hello');
  });
});