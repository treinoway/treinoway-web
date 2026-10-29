import { render, screen } from '../test/test-utils';
import PrescriptionField from './PrescriptionField';

// Renders the field next to a "Tipo" select, as a composer would.
const renderField = () =>
  render(
    <div>
      <label htmlFor="type-select">Tipo</label>
      <select id="type-select">
        <option value="a">A</option>
      </select>
      <PrescriptionField
        idPrefix="label"
        formData={{ prescriptionMode: 'reps', sets: '', repetitionsMin: '', repetitionsMax: '', duration: '' }}
        onChange={() => {}}
      />
    </div>
  );

describe('PrescriptionField segmented label', () => {
  it('exposes the mode switch as "Modo de prescrição"', () => {
    renderField();
    expect(screen.getByRole('tablist', { name: 'Modo de prescrição' })).toBeInTheDocument();
  });

  it('no longer exposes a "Tipo de prescrição" element', () => {
    renderField();
    expect(screen.queryByLabelText('Tipo de prescrição')).not.toBeInTheDocument();
  });

  it('a /^Tipo/ label query only matches the Tipo select', () => {
    renderField();
    expect(screen.getByLabelText(/^Tipo/)).toBe(screen.getByRole('combobox', { name: 'Tipo' }));
  });
});
