import { renderWithRouter, screen } from '../../test/test-utils';
import PlanBreadcrumb from './PlanBreadcrumb';

describe('PlanBreadcrumb design-system classes', () => {
  it('page mode renders the nav with wizard-breadcrumb and ancestors with wizard-breadcrumb-ancestor', () => {
    renderWithRouter(<PlanBreadcrumb patientName="Luiza Andrade" patientId="p1" />);
    expect(screen.getByRole('navigation', { name: 'Você está em' })).toHaveClass('wizard-breadcrumb');
    expect(screen.getByRole('link', { name: 'Meus Pacientes' })).toHaveClass('wizard-breadcrumb-ancestor');
    expect(screen.getByRole('link', { name: 'Luiza Andrade' })).toHaveClass('wizard-breadcrumb-ancestor');
  });

  it('inPrescription mode keeps the nav class and styles every ancestor link', () => {
    renderWithRouter(<PlanBreadcrumb patientName="Luiza Andrade" patientId="p1" inPrescription />);
    expect(screen.getByRole('navigation', { name: 'Você está em' })).toHaveClass('wizard-breadcrumb');
    expect(screen.getByRole('link', { name: 'Meus Pacientes' })).toHaveClass('wizard-breadcrumb-ancestor');
    expect(screen.getByRole('link', { name: 'Luiza Andrade' })).toHaveClass('wizard-breadcrumb-ancestor');
    expect(screen.getByRole('link', { name: 'Plano alimentar' })).toHaveClass('wizard-breadcrumb-ancestor');
  });
});
