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

  it('renders dichotomous question as two interactive radios (Sim / Não)', () => {
    renderModal();
    const simLabel = screen.getByText('Sim');
    const naoLabel = screen.getByText('Não');
    expect(simLabel).toBeInTheDocument();
    expect(naoLabel).toBeInTheDocument();
    // In the new preview behavior, dichotomous / single / multiple radios are
    // interactive so the trainer can toggle parent answers and see conditional
    // children appear/disappear. Only free-text / numeric / matrix inputs remain disabled.
    expect(screen.getByRole('radio', { name: 'Sim' })).not.toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Não' })).not.toBeDisabled();
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

  it('renders multiple_choice question as interactive checkboxes', () => {
    renderModal();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    // Checkboxes are interactive in the new preview so trainers can toggle parents.
    checkboxes.forEach((cb) => expect(cb).not.toBeDisabled());
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

  // ── Conditional visibility ────────────────────────────────

  const makeConditionalAnamnesis = () => ({
    id: 'a-cond',
    title: 'Anamnese com Condicionais',
    sections: [
      {
        id: 's1',
        title: 'Treino',
        order: 0,
        questions: [
          {
            id: 'parent-dich',
            text: 'Você treina atualmente?',
            type: 'dichotomous',
            required: true,
            order: 0,
            options: [],
            config: null,
            parentQuestionId: null,
            condition: null,
          },
          {
            id: 'child-numeric',
            text: 'Há quantos anos você treina?',
            type: 'numeric',
            required: false,
            order: 1,
            options: [],
            config: { unit: 'anos' },
            parentQuestionId: 'parent-dich',
            condition: { operator: 'equals', value: 'yes' },
          },
        ],
      },
    ],
  });

  it('hides a conditional child until the parent answer matches', async () => {
    const user = userEvent.setup();
    renderModal({ anamnesis: makeConditionalAnamnesis() });

    // The child starts hidden because the parent is unanswered
    expect(screen.queryByText('Há quantos anos você treina?')).not.toBeInTheDocument();

    // Answer parent "Sim" → child appears
    await user.click(screen.getByRole('radio', { name: 'Sim' }));
    expect(screen.getByText('Há quantos anos você treina?')).toBeInTheDocument();

    // Switch parent to "Não" → child disappears
    await user.click(screen.getByRole('radio', { name: 'Não' }));
    expect(screen.queryByText('Há quantos anos você treina?')).not.toBeInTheDocument();
  });

  it('renders the conditional hint above a visible conditional child', async () => {
    const user = userEvent.setup();
    renderModal({ anamnesis: makeConditionalAnamnesis() });

    await user.click(screen.getByRole('radio', { name: 'Sim' }));
    // The hint text includes parent and formatted trigger value
    expect(
      screen.getByText(/condicional: mostrado se «você treina atualmente\?» = «sim»/i)
    ).toBeInTheDocument();
  });

  it('formats single_choice trigger by option text in the hint', async () => {
    const singleChoiceAnamnesis = {
      id: 'a-single',
      title: 'a',
      sections: [
        {
          id: 's1',
          title: 'Seção',
          order: 0,
          questions: [
            {
              id: 'parent-single',
              text: 'Qual tipo de treino?',
              type: 'single_choice',
              required: false,
              order: 0,
              options: [
                { id: 'opt-force', text: 'Força' },
                { id: 'opt-cardio', text: 'Cardio' },
              ],
              config: null,
              parentQuestionId: null,
              condition: null,
            },
            {
              id: 'child',
              text: 'Detalhes sobre força?',
              type: 'free_text',
              required: false,
              order: 1,
              options: [],
              config: null,
              parentQuestionId: 'parent-single',
              condition: { operator: 'equals', optionId: 'opt-force' },
            },
          ],
        },
      ],
    };
    const user = userEvent.setup();
    renderModal({ anamnesis: singleChoiceAnamnesis });

    // Child hidden initially
    expect(screen.queryByText('Detalhes sobre força?')).not.toBeInTheDocument();

    // Select "Força" → child appears with hint showing the option text
    await user.click(screen.getByRole('radio', { name: 'Força' }));
    expect(screen.getByText('Detalhes sobre força?')).toBeInTheDocument();
    expect(screen.getByText(/«força»/i)).toBeInTheDocument();
  });

  // ── Read-only template mode ───────────────────────────────

  describe('readOnly (template preview)', () => {
    const renderTemplate = (props = {}) => {
      const handlers = { onClose: vi.fn(), onUse: vi.fn() };
      render(
        <AnamnesisPreviewModal
          anamnesis={makeAnamnesis({ description: 'Para alunos novos' })}
          open={true}
          readOnly
          {...handlers}
          {...props}
        />,
      );
      return handlers;
    };

    it('shows the numbered sections, question count and estimated time', () => {
      renderTemplate();
      expect(screen.getByRole('dialog', { name: 'Anamnese de Saúde' })).toBeInTheDocument();
      expect(screen.getByText('Pré-visualização')).toBeInTheDocument();
      // 4 closed × 10 s + 1 numeric × 15 s + 1 free text × 40 s = 95 s → 2 min
      expect(screen.getByText('6 perguntas · Cerca de 2 min')).toBeInTheDocument();
      expect(screen.getByText('Para alunos novos')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Histórico Clínico', level: 3 })).toBeInTheDocument();
      expect(screen.getByText('Você tem diabetes?')).toBeInTheDocument();
    });

    it('is read-only: no answer inputs are rendered', () => {
      renderTemplate();
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('calls onUse from the CTA and onClose from the close button', async () => {
      const user = userEvent.setup();
      const { onUse, onClose } = renderTemplate();
      await user.click(screen.getByRole('button', { name: 'Usar este modelo' }));
      await user.click(screen.getByRole('button', { name: 'Fechar pré-visualização' }));
      expect(onUse).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows a skeleton and disables the CTA while loading', () => {
      renderTemplate({ anamnesis: { title: 'Anamnese de Saúde' }, loading: true });
      expect(screen.getByRole('status', { name: 'Carregando modelo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Usar este modelo' })).toBeDisabled();
    });

    it('shows "Carregando..." and blocks closing while copying', () => {
      renderTemplate({ using: true });
      expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Fechar pré-visualização' })).toBeDisabled();
    });

    it('hides the time estimate when the anamnesis has no questions', () => {
      renderTemplate({ anamnesis: makeAnamnesis({ sections: [] }) });
      expect(screen.getByText('Nenhuma pergunta')).toBeInTheDocument();
      expect(screen.queryByText(/min$/)).not.toBeInTheDocument();
    });
  });
});
