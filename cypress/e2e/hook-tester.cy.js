describe('HookTester Page', () => {
  it('should display the HookTester component and the Salutation component', () => {
    cy.visit('/hook-tester');
    cy.contains('HookTester');
    cy.contains('Greetings from the Salutation component!');
  });
});