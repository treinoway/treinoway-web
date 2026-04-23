import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import AnamnesisPreviewModal from './AnamnesisPreviewModal';

const makeAnamnesis = (overrides = {}) => ({
  id: 'a1',
  title: 'Anamnese de Saúde',
  sections: [
    {
      id: 's1',
      title: 'Histórico Clínico',
      order: 0,
      questions: [
        { id: 'q1', text: 'Você tem diabetes?',      type: 'dichotomous',     required: true,  order: 0, options: [], config: null },
        { id: 'q2', text: 'Descreva sua rotina',     type: 'free_text',       required: false, order: 1, options: [], config: null },
        { id: 'q3', text: 'Nível de dor',            type: 'numeric',         required: true,  order: 2, options: [], config: { min: 0, max: 10, unit: 'pts' } },
        { id: 'q4', text: 'Refeições por dia',       type: 'single_choice',   required: false, order: 3, options: [{ text: '1-2' }, { text: '3-4' }], config: null },
        { id: 'q5', text: 'Sintomas frequentes',     type: 'multiple_choice', required: false, order: 4, options: [{ text: 'Fadiga' }, { text: 'Tontura' }], config: null },
        { id: 'q6', text: 'Avalie os exercícios',    type: 'matrix',          required: false, order: 5, options: [], config: { rows: ['Força', 'Cardio'], columns: ['Ruim', 'Bom'] } },
      ],
    },
  ],
  ...overrides,
});

const renderModal = (props = {}) =>
  render(
    <AnamnesisPreviewModal
      anamnesis={makeAnamnesis()}
      open={true}
      onClose={vi.fn()}
      {...props}
    />
  );

describe('AnamnesisPreviewModal', () => {
  it('renders the anamnesis title', () => {
    renderModal();
    expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
  });

  it('renders the section title', () => {
    renderModal();
    expect(screen.getByText('Histórico Clínico')).toBeInTheDocument();
  });

  it('renders all question labels', () => {
    renderModal();
    expect(screen.getByText(/Você tem diabetes\?/)).toBeInTheDocument();
    expect(screen.getByText(/Descreva sua rotina/)).toBeInTheDocument();
    expect(screen.getByText(/Nível de dor/)).toBeInTheDocument();
    expect(screen.getByText(/Refeições por dia/)).toBeInTheDocument();
    expect(screen.getByText(/Sintomas frequentes/)).toBeInTheDocument();
    expect(screen.getByText(/Avalie os exercícios/)).toBeInTheDocument();
  });

  it('marks required questions with asterisk', () => {
    renderModal();
    const asterisks = screen.getAllByLabelText('obrigatória');
    expect(asterisks.length).toBeGreaterThanOrEqual(2);
  });

  it('renders dichotomous question as two disabled radios (Sim / Não)', () => {
    renderModal();
    const radios = screen.getAllByRole('radio');
    const simLabel = screen.getByText('Sim');
    const naoLabel = screen.getByText('Não');
    expect(simLabel).toBeInTheDocument();
    expect(naoLabel).toBeInTheDocument();
    // All radios must be disabled
    radios.forEach((r) => expect(r).toBeDisabled());
  });

  it('renders free_text question as a disabled textarea', () => {
    renderModal();
    const textareas = screen.getAllByPlaceholderText(/Resposta do aluno/i);
    expect(textareas.length).toBeGreaterThanOrEqual(1);
    textareas.forEach((ta) => expect(ta).toBeDisabled());
  });

  it('renders single_choice question as disabled radios for each option', () => {
    renderModal();
    expect(screen.getByText('1-2')).toBeInTheDocument();
    expect(screen.getByText('3-4')).toBeInTheDocument();
  });

  it('renders multiple_choice question as disabled checkboxes', () => {
    renderModal();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    checkboxes.forEach((cb) => expect(cb).toBeDisabled());
    expect(screen.getByText('Fadiga')).toBeInTheDocument();
    expect(screen.getByText('Tontura')).toBeInTheDocument();
  });

  it('renders numeric question as a disabled number input with unit', () => {
    renderModal();
    expect(screen.getByText('pts')).toBeInTheDocument();
    const numInput = screen.getByPlaceholderText(/0–10/i);
    expect(numInput).toBeDisabled();
  });

  it('renders matrix question as a table with rows and columns', () => {
    renderModal();
    expect(screen.getByText('Força')).toBeInTheDocument();
    expect(screen.getByText('Cardio')).toBeInTheDocument();
    expect(screen.getByText('Ruim')).toBeInTheDocument();
    expect(screen.getByText('Bom')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });
    await user.click(screen.getByRole('button', { name: /fechar pré-visualização/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AnamnesisPreviewModal
        anamnesis={makeAnamnesis()}
        open={true}
        onClose={onClose}
      />
    );
    // Click the dialog itself (aria role) — in jsdom this fires on the overlay element
    const dialog = screen.getByRole('dialog');
    await user.click(dialog);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when open is false', () => {
    render(
      <AnamnesisPreviewModal
        anamnesis={makeAnamnesis()}
        open={false}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText('Anamnese de Saúde')).not.toBeInTheDocument();
  });

  it('shows empty state when anamnesis has no sections', () => {
    renderModal({ anamnesis: makeAnamnesis({ sections: [] }) });
    expect(screen.getByText(/não possui seções/i)).toBeInTheDocument();
  });
});
