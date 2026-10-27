import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import InlineTechniqueForm from './InlineTechniqueForm';
import { createAdvancedTechnique } from '../../api/advancedTechniques';
import { OWN_TECHNIQUE } from '../../test/advancedTechniqueFixtures';

vi.mock('../../api/advancedTechniques');

// Renders the inline form inside a parent form (spy on its submit) and returns the handlers.
const renderForm = () => {
  const handlers = { onCreated: vi.fn(), onCancel: vi.fn() };
  const onParentSubmit = vi.fn((event) => event.preventDefault());
  render(
    <form onSubmit={onParentSubmit}>
      <InlineTechniqueForm idPrefix="t" {...handlers} />
    </form>,
  );
  return { ...handlers, onParentSubmit };
};

describe('InlineTechniqueForm', () => {
  beforeEach(() => {
    vi.mocked(createAdvancedTechnique).mockReset();
  });

  it('shows required errors and does not call the API on an empty submit', async () => {
    renderForm();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Criar técnica' }));
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(createAdvancedTechnique).not.toHaveBeenCalled();
  });

  it('Enter in a text input creates the technique and never submits the parent form', async () => {
    const user = userEvent.setup();
    createAdvancedTechnique.mockResolvedValue(OWN_TECHNIQUE);
    const { onCreated, onParentSubmit } = renderForm();

    await user.type(screen.getByLabelText('Descrição da técnica'), 'Fase excêntrica lenta');
    await user.type(screen.getByLabelText('Nome da técnica'), 'Tempo 3-1-3{Enter}');

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(OWN_TECHNIQUE));
    expect(createAdvancedTechnique).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Tempo 3-1-3', description: 'Fase excêntrica lenta' }),
    );
    expect(onParentSubmit).not.toHaveBeenCalled();
  });

  it('Enter inside the description textarea does not submit', async () => {
    const user = userEvent.setup();
    const { onParentSubmit } = renderForm();
    await user.type(screen.getByLabelText('Descrição da técnica'), 'linha 1{Enter}linha 2');
    expect(createAdvancedTechnique).not.toHaveBeenCalled();
    expect(onParentSubmit).not.toHaveBeenCalled();
  });

  it('shows the API error and re-enables the button', async () => {
    const user = userEvent.setup();
    createAdvancedTechnique.mockRejectedValue({ userMessage: 'Nome já existe' });
    const { onCreated } = renderForm();
    await user.type(screen.getByLabelText('Nome da técnica'), 'X');
    await user.type(screen.getByLabelText('Descrição da técnica'), 'Y');
    await user.click(screen.getByRole('button', { name: 'Criar técnica' }));

    expect(await screen.findByText('Nome já existe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar técnica' })).toBeEnabled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('calls onCancel', async () => {
    const { onCancel } = renderForm();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
