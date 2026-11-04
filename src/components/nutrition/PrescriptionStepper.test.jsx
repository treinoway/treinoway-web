import { renderWithRouter, screen } from '../../test/test-utils';
import PrescriptionStepper from './PrescriptionStepper';

describe('PrescriptionStepper', () => {
  it('numbers the pills, marks the current step and links the others', () => {
    renderWithRouter(<PrescriptionStepper patientId="p1" currentStep="menu" />);
    const nav = screen.getByRole('navigation', { name: 'Etapas da prescrição' });
    expect(nav).toHaveClass('wizard-stepper');
    expect(screen.getByText('Cardápio').closest('[aria-current="step"]')).toHaveTextContent('2Cardápio');
    expect(screen.getByRole('link', { name: /Metas e gasto energético/ })).toHaveAttribute('href', '/nutritionist/patients/p1/plan/goals');
    expect(screen.getByRole('link', { name: /Orientações/ })).toHaveAttribute('href', '/nutritionist/patients/p1/plan/guidance');
    expect(screen.queryByRole('link', { name: /Cardápio/ })).not.toBeInTheDocument();
  });
});
