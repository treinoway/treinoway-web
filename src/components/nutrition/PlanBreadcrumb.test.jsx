import { renderWithRouter, screen } from '../../test/test-utils';
import PlanBreadcrumb from './PlanBreadcrumb';

describe('PlanBreadcrumb', () => {
  it('links back to the patients list and marks the plan as the current page', () => {
    renderWithRouter(<PlanBreadcrumb patientName="Luiza Andrade" />);
    expect(screen.getByRole('link', { name: 'Meus Pacientes' })).toHaveAttribute('href', '/nutritionist/patients');
    expect(screen.getByText('Luiza Andrade')).toBeInTheDocument();
    expect(screen.getByText('Plano alimentar')).toHaveAttribute('aria-current', 'page');
  });

  it('inside the prescription links the patient and the plan, and marks Prescrição as current', () => {
    renderWithRouter(<PlanBreadcrumb patientName="Luiza Andrade" patientId="p1" inPrescription />);
    expect(screen.getByRole('link', { name: 'Luiza Andrade' })).toHaveAttribute('href', '/nutritionist/patients/p1/plan');
    expect(screen.getByRole('link', { name: 'Plano alimentar' })).toHaveAttribute('href', '/nutritionist/patients/p1/plan');
    expect(screen.getByText('Prescrição')).toHaveAttribute('aria-current', 'page');
  });
});
