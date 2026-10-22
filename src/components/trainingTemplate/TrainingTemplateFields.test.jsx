import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import TrainingTemplateFields from './TrainingTemplateFields';

const formData = { name: 'Treino A', description: '', category: 'strength', bodySegment: '', isPublic: false };

describe('TrainingTemplateFields', () => {
  it('renders the fields with their current values', () => {
    render(<TrainingTemplateFields formData={formData} canSetVisibility onChange={vi.fn()} />);
    expect(screen.getByLabelText(/^nome$/i)).toHaveValue('Treino A');
    expect(screen.getByRole('switch', { name: /tornar este modelo público/i })).not.toBeChecked();
  });

  it('reports field changes with the field name', async () => {
    const onChange = vi.fn();
    render(<TrainingTemplateFields formData={{ ...formData, name: '' }} onChange={onChange} />);
    await userEvent.setup().type(screen.getByLabelText(/^nome$/i), 'B');
    expect(onChange).toHaveBeenCalledWith('name', 'B');
  });

  it('toggles visibility through onChange', async () => {
    const onChange = vi.fn();
    render(<TrainingTemplateFields formData={formData} canSetVisibility onChange={onChange} />);
    await userEvent.setup().click(screen.getByRole('switch', { name: /tornar este modelo público/i }));
    expect(onChange).toHaveBeenCalledWith('isPublic', true);
  });

  it('shows field errors as alerts', () => {
    render(<TrainingTemplateFields formData={formData} errors={{ name: 'Informe o nome.', category: 'Selecione.' }} onChange={vi.fn()} />);
    expect(screen.getAllByRole('alert').map((el) => el.textContent)).toEqual(['Informe o nome.', 'Selecione.']);
  });

  it('disables the inputs when disabled', () => {
    render(<TrainingTemplateFields formData={formData} disabled onChange={vi.fn()} />);
    expect(screen.getByLabelText(/^nome$/i)).toBeDisabled();
  });

  it('hides the visibility switch unless the user can set visibility', () => {
    render(<TrainingTemplateFields formData={formData} onChange={vi.fn()} />);
    expect(screen.queryByRole('switch', { name: /tornar este modelo público/i })).not.toBeInTheDocument();
  });
});
