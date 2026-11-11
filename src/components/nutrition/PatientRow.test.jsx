import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, within } from '../../test/test-utils';
import PatientRow from './PatientRow';
import { buildPatientRow } from '../../test/nutritionFixtures';

// Test helper: renders the row inside a table.
const renderRow = (patient = buildPatientRow(), onUnlink = vi.fn()) => {
  renderWithRouter(<table><tbody><PatientRow patient={patient} onUnlink={onUnlink} /></tbody></table>);
  return onUnlink;
};

describe('PatientRow', () => {
  it('shows the avatar, the name linking to the plan, the facts, the status and the adherence', () => {
    renderRow();
    const row = screen.getByRole('row');
    expect(within(row).getByText('LA')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Luiza Andrade' })).toHaveAttribute('href', '/nutritionist/patients/patient-1/plan');
    expect(within(row).getByText('29 anos')).toBeInTheDocument();
    expect(within(row).getByText('66 kg')).toBeInTheDocument();
    expect(within(row).getByText('Publicado')).toBeInTheDocument();
    expect(within(row).getByText('82%')).toBeInTheDocument();
    expect(within(row).getByText('23 de 28 refeições')).toBeInTheDocument();
  });

  it('shows dashes without adherence data', () => {
    renderRow(buildPatientRow({ adherence7d: null }));
    expect(within(screen.getByRole('row')).getByText('-')).toBeInTheDocument();
  });

  it('unlinks from the row menu', async () => {
    const onUnlink = renderRow();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ações de Luiza Andrade' }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Desvincular' }));
    expect(onUnlink).toHaveBeenCalledWith(expect.objectContaining({ id: 'patient-1' }));
  });
});
