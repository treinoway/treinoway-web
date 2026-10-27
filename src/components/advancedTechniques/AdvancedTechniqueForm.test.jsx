import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import AdvancedTechniqueForm from './AdvancedTechniqueForm';
import { DROP_SET, OWN_TECHNIQUE } from '../../test/advancedTechniqueFixtures';

// Renders the form with spy handlers and returns them.
const renderForm = (props = {}) => {
  const handlers = { onSubmit: vi.fn(), onCancel: vi.fn(), onNameChange: vi.fn(), onDirtyChange: vi.fn() };
  render(<AdvancedTechniqueForm {...handlers} {...props} />);
  return handlers;
};

describe('AdvancedTechniqueForm', () => {
  it('blocks submit and shows errors when required fields are empty', async () => {
    const { onSubmit } = renderForm();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('submits the form values and reports name and dirty changes', async () => {
    const user = userEvent.setup();
    const { onSubmit, onNameChange, onDirtyChange } = renderForm({ technique: OWN_TECHNIQUE });
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    await user.type(screen.getByLabelText(/^nome/i), ' B');
    expect(onNameChange).toHaveBeenLastCalledWith('Tempo 3-1-3 B');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tempo 3-1-3 B' }));
  });

  it('read-only (system) mode disables fields, shows the notice and hides save/cancel', () => {
    renderForm({ technique: DROP_SET, readOnly: true });
    expect(screen.getByLabelText(/^nome/i)).toBeDisabled();
    expect(screen.getByLabelText(/^descrição/i)).toBeDisabled();
    expect(screen.getByLabelText(/url do vídeo/i)).toBeDisabled();
    expect(screen.getByText(/técnica pública/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
  });

  it('disables actions while saving', () => {
    renderForm({ saving: true });
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
