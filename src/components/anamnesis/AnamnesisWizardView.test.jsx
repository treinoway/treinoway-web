import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import AnamnesisWizardView from './AnamnesisWizardView';

const buildWizard = (overrides = {}) => ({
  steps: [{ id: 's1', title: 'Saúde' }, { id: 'review', title: 'Revisão' }],
  stepIndex: 0,
  isReview: false,
  isFirstStep: true,
  currentSection: { id: 's1', description: 'Conte sobre sua saúde.' },
  visibleQuestions: [],
  answers: {},
  errors: {},
  summaries: [{ id: 's1', title: 'Saúde', stepIndex: 0, answered: 1, total: 1, pending: 0 }],
  hasPending: false,
  focusQuestionId: null,
  clearFocusRequest: vi.fn(),
  goNext: vi.fn(),
  goBack: vi.fn(),
  goToStep: vi.fn(),
  setAnswer: vi.fn(),
  ...overrides,
});

const renderView = (wizardOverrides, props = {}) => {
  const handlers = { onSubmit: vi.fn(), onExit: vi.fn() };
  const wizard = buildWizard(wizardOverrides);
  render(
    <AnamnesisWizardView
      wizard={wizard}
      title="Anamnese de Saúde"
      submitLabel="Salvar respostas"
      submitting={false}
      {...handlers}
      {...props}
    />,
  );
  return { wizard, ...handlers, user: userEvent.setup() };
};

describe('AnamnesisWizardView', () => {
  it('renders the title, the extras, the step heading and its description', () => {
    renderView({}, { headerExtra: <p>Preenchendo por Maria</p>, banner: <p>Aviso</p> });
    expect(screen.getByRole('heading', { level: 1, name: 'Anamnese de Saúde' })).toBeInTheDocument();
    expect(screen.getByText('Preenchendo por Maria')).toBeInTheDocument();
    expect(screen.getByText('Aviso')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Saúde' })).toBeInTheDocument();
    expect(screen.getByText('Conte sobre sua saúde.')).toBeInTheDocument();
  });

  it('shows the stepper for a short wizard when jumping is allowed', async () => {
    const { wizard, user } = renderView({}, { allowJumpAhead: true });
    await user.click(screen.getByRole('button', { name: /Revisão/ }));
    expect(wizard.goToStep).toHaveBeenCalledWith(1);
  });

  it('does not render the stepper for two steps in the student flow', () => {
    renderView();
    expect(screen.queryByRole('navigation', { name: 'Etapas da anamnese' })).not.toBeInTheDocument();
  });

  it('keeps future steps unclickable in the student flow', () => {
    const steps = [
      { id: 's1', title: 'Saúde' },
      { id: 's2', title: 'Rotina' },
      { id: 'review', title: 'Revisão' },
    ];
    renderView({ steps });
    expect(screen.queryByRole('button', { name: /Rotina/ })).not.toBeInTheDocument();
  });

  it('exits from "Voltar" on the first step and goes back otherwise', async () => {
    const first = renderView();
    await first.user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(first.onExit).toHaveBeenCalledTimes(1);
    expect(first.wizard.goBack).not.toHaveBeenCalled();
  });

  it('goes back a step when not on the first step', async () => {
    const { user, wizard, onExit } = renderView({ isFirstStep: false, stepIndex: 1 });
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(wizard.goBack).toHaveBeenCalledTimes(1);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('continues to the next step', async () => {
    const { user, wizard } = renderView();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(wizard.goNext).toHaveBeenCalledTimes(1);
  });

  it('shows the given submit label and hint on the review step and submits', async () => {
    const { user, onSubmit } = renderView({ isReview: true, stepIndex: 1, currentSection: null }, { reviewHint: 'Confira antes.' });
    expect(screen.getByText('Confira antes.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar respostas' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables submit while pending questions remain', () => {
    renderView({ isReview: true, stepIndex: 1, currentSection: null, hasPending: true });
    expect(screen.getByRole('button', { name: 'Salvar respostas' })).toBeDisabled();
  });

  it('disables the buttons and shows "Carregando..." while submitting', () => {
    renderView({ isReview: true, stepIndex: 1, currentSection: null }, { submitting: true });
    expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();
  });

  describe('autosave indicator', () => {
    it('renders nothing when autosave is not active', () => {
      renderView();
      expect(screen.queryByText(/Rascunho salvo/)).not.toBeInTheDocument();
      expect(screen.queryByText('Salvando...')).not.toBeInTheDocument();
      expect(document.querySelector('[aria-live="polite"]')).not.toBeInTheDocument();
    });

    it('keeps an empty polite live region while idle', () => {
      renderView({}, { saveState: { status: 'idle', savedAt: null } });
      const region = document.querySelector('[aria-live="polite"]');
      expect(region).toBeInTheDocument();
      expect(region).toBeEmptyDOMElement();
    });

    it('announces "Salvando..." while saving', () => {
      renderView({}, { saveState: { status: 'saving', savedAt: null } });
      expect(screen.getByText('Salvando...')).toHaveAttribute('aria-live', 'polite');
    });

    it('shows the local time of the last save', () => {
      const savedAt = new Date(2026, 8, 30, 14, 32);
      renderView({}, { saveState: { status: 'saved', savedAt } });
      expect(screen.getByText('Rascunho salvo às 14:32')).toHaveAttribute('aria-live', 'polite');
    });

    it('shows the retry message on error', () => {
      renderView({}, { saveState: { status: 'error', savedAt: null } });
      expect(screen.getByText('Não foi possível salvar — tentando de novo')).toBeInTheDocument();
    });

    it('updates the same live region when the state changes', () => {
      const wizard = buildWizard();
      const props = { title: 'Anamnese', submitLabel: 'Salvar', submitting: false, onSubmit: vi.fn(), onExit: vi.fn() };
      const { rerender } = render(<AnamnesisWizardView wizard={wizard} {...props} saveState={{ status: 'saving', savedAt: null }} />);
      const region = document.querySelector('[aria-live="polite"]');
      rerender(<AnamnesisWizardView wizard={wizard} {...props} saveState={{ status: 'saved', savedAt: new Date(2026, 8, 30, 9, 5) }} />);
      expect(document.querySelector('[aria-live="polite"]')).toBe(region);
      expect(region).toHaveTextContent('Rascunho salvo às 09:05');
    });
  });
});
