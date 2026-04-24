import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import AnamnesisDetail from './AnamnesisDetail';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

// Silence the AnamnesisPreviewModal in unit tests — we test it separately
vi.mock('../../components/AnamnesisPreviewModal', () => ({
  default: ({ open, onClose }) =>
    open ? (
      <div role="dialog" aria-label="Pré-visualização da anamnese">
        <button onClick={onClose} aria-label="Fechar pré-visualização">Fechar</button>
        <span>Preview aberto</span>
      </div>
    ) : null,
}));

const mockShowToast = vi.fn();

const mockAnamnesis = {
  id: 'anamnesis-1',
  title: 'Anamnese de Saúde',
  description: 'Descrição da anamnese',
  isGeneral: false,
  version: 1,
  parentId: null,
  sections: [
    {
      id: 'section-1',
      title: 'Histórico de Saúde',
      order: 0,
      questions: [
        {
          id: 'q1',
          text: 'Você tem alguma doença crônica?',
          type: 'dichotomous',
          required: true,
          order: 0,
          options: [],
          config: null,
        },
        {
          id: 'q2',
          text: 'Qual seu nível de dor?',
          type: 'numeric',
          required: false,
          order: 1,
          config: { min: 0, max: 10 },
          options: [],
        },
      ],
    },
    {
      id: 'section-2',
      title: 'Rotina de Treino',
      order: 1,
      questions: [
        {
          id: 'q3',
          text: 'Quantas vezes treina por semana?',
          type: 'single_choice',
          required: false,
          order: 0,
          options: [{ text: '1-2x' }, { text: '3-4x' }],
          config: null,
        },
      ],
    },
  ],
};

const mockAnamnesisNoSections = {
  ...mockAnamnesis,
  id: 'anamnesis-empty',
  sections: [],
};

const mockAnamnesisNoQuestions = {
  ...mockAnamnesis,
  id: 'anamnesis-no-q',
  sections: [
    { id: 'section-1', title: 'Histórico de Saúde', order: 0, questions: [] },
  ],
};

const mockGeneralAnamnesis = {
  ...mockAnamnesis,
  id: 'anamnesis-2',
  title: 'Anamnese Geral',
  isGeneral: true,
};

const mockGeneralAnamnesisNoQuestions = {
  ...mockGeneralAnamnesis,
  id: 'anamnesis-general-empty',
  sections: [
    { id: 'section-1', title: 'Histórico de Saúde', order: 0, questions: [] },
  ],
};

function renderAnamnesisDetail(anamnesisId = 'anamnesis-1') {
  return renderWithRoute(<AnamnesisDetail />, {
    route: `/trainer/anamneses/${anamnesisId}`,
    path: '/trainer/anamneses/:anamnesisId',
  });
}

describe('AnamnesisDetail', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  // ── Loading ──────────────────────────────────────────────

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderAnamnesisDetail();
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('fetches anamnesis from the correct endpoint', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail('anamnesis-1');
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1');
    });
  });

  it('shows toast and does not crash on fetch error', async () => {
    api.get.mockRejectedValue({ userMessage: 'Anamnese não encontrada.' });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese não encontrada.', 'error');
    });
  });

  // ── Renders ──────────────────────────────────────────────

  it('renders anamnesis title and version badge after loading', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
    });
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('renders section titles in the outline', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument();
      expect(screen.getByText('Rotina de Treino')).toBeInTheDocument();
    });
  });

  it('shows back button to /trainer/anamneses', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /voltar para anamneses/i })).toBeInTheDocument();
    });
  });

  it('shows version badge when version > 1', async () => {
    api.get.mockResolvedValue({ data: { ...mockAnamnesis, version: 3 } });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('v3')).toBeInTheDocument();
    });
  });

  // ── Auto-selection ───────────────────────────────────────

  it('auto-selects first section and first question after load', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      // The canvas should show the first question's editable textarea immediately
      const textarea = screen.getByRole('textbox', { name: /texto da pergunta/i });
      expect(textarea).toHaveValue('Você tem alguma doença crônica?');
    });
  });

  // ── Empty states ─────────────────────────────────────────

  it('anamnesis with 0 sections shows no-section board with correct title and CTA', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesisNoSections });
    renderAnamnesisDetail('anamnesis-empty');
    await waitFor(() => {
      expect(screen.getByText('Crie sua primeira seção')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /criar primeira seção/i })).toBeInTheDocument();
  });

  it('no-section board shows PASSO 1 DE 3 eyebrow', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesisNoSections });
    renderAnamnesisDetail('anamnesis-empty');
    await waitFor(() => {
      expect(screen.getByText('PASSO 1 DE 3')).toBeInTheDocument();
    });
  });

  it('preview button is disabled when anamnesis has 0 sections', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesisNoSections });
    renderAnamnesisDetail('anamnesis-empty');
    await waitFor(() => {
      expect(screen.getByText('Crie sua primeira seção')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /pré-visualizar/i })).toBeDisabled();
  });

  it('filling the no-section form and submitting calls POST /sections', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesisNoSections });
    api.post.mockResolvedValue({ data: { id: 'new-section-id' } });
    // After POST, return anamnesis with the new section (no questions)
    api.get
      .mockResolvedValueOnce({ data: mockAnamnesisNoSections })
      .mockResolvedValueOnce({ data: mockAnamnesisNoQuestions });
    renderAnamnesisDetail('anamnesis-empty');
    await waitFor(() => {
      expect(screen.getByText('Crie sua primeira seção')).toBeInTheDocument();
    });
    const input = screen.getByRole('textbox', { name: /título da seção/i });
    await user.type(input, 'Histórico clínico');
    await user.click(screen.getByRole('button', { name: /criar primeira seção/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-empty/sections',
        expect.objectContaining({ title: 'Histórico clínico' }),
      );
    });
  });

  it('section with 0 questions shows no-question board with correct title', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesisNoQuestions });
    renderAnamnesisDetail('anamnesis-no-q');
    await waitFor(() => {
      expect(screen.getByText('Adicione a primeira pergunta')).toBeInTheDocument();
    });
  });

  it('no-question board shows both shortcut buttons', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesisNoQuestions });
    renderAnamnesisDetail('anamnesis-no-q');
    await waitFor(() => {
      expect(screen.getByText('Adicione a primeira pergunta')).toBeInTheDocument();
    });
    // Use exact text match to avoid collision with library tile labels
    const shortcuts = screen.getAllByRole('button', { name: /texto livre/i });
    // The shortcut button says "+ Texto Livre"; library tile has aria-label "Adicionar pergunta Texto Livre"
    expect(shortcuts.some((b) => b.textContent.includes('+ Texto Livre'))).toBe(true);
    expect(screen.getByRole('button', { name: /sim\/não/i })).toBeInTheDocument();
  });

  it('clicking "+ Texto Livre" shortcut calls POST with type free_text', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesisNoQuestions });
    api.post.mockResolvedValue({ data: { id: 'new-q-id' } });
    renderAnamnesisDetail('anamnesis-no-q');
    await waitFor(() => {
      expect(screen.getByText('Adicione a primeira pergunta')).toBeInTheDocument();
    });
    // Pick the shortcut button (exact text "+ Texto Livre") from the canvas-empty-board shortcuts
    const allTextLivre = screen.getAllByRole('button', { name: /texto livre/i });
    const shortcut = allTextLivre.find((b) => b.textContent.trim() === '+ Texto Livre');
    await user.click(shortcut);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-no-q/sections/section-1/questions',
        expect.objectContaining({ type: 'free_text' }),
      );
    });
  });

  it('clicking "+ Sim/Não" shortcut calls POST with type dichotomous', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesisNoQuestions });
    api.post.mockResolvedValue({ data: { id: 'new-q-id' } });
    renderAnamnesisDetail('anamnesis-no-q');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sim\/não/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /sim\/não/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-no-q/sections/section-1/questions',
        expect.objectContaining({ type: 'dichotomous' }),
      );
    });
  });

  // ── isGeneral empty board ────────────────────────────────

  it('isGeneral anamnesis with 0 questions shows read-only board, no CTA', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesisNoQuestions });
    renderAnamnesisDetail('anamnesis-general-empty');
    await waitFor(() => {
      expect(screen.getByText('Esta anamnese geral não pode ser editada')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /criar/i })).not.toBeInTheDocument();
  });

  it('isGeneral read-only board shows SOMENTE LEITURA eyebrow', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesisNoQuestions });
    renderAnamnesisDetail('anamnesis-general-empty');
    await waitFor(() => {
      expect(screen.getByText('SOMENTE LEITURA')).toBeInTheDocument();
    });
  });

  // ── General anamnesis ────────────────────────────────────

  it('shows Geral badge and read-only notice for general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => {
      expect(screen.getByText('Geral')).toBeInTheDocument();
      expect(screen.getByText(/não pode ser editada/i)).toBeInTheDocument();
    });
  });

  it('shows "Copiar para minha coleção" button for general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copiar para minha coleção/i })).toBeInTheDocument();
    });
  });

  it('hides "Nova versão" button for general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => {
      expect(screen.getByText('Anamnese Geral')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /nova versão/i })).not.toBeInTheDocument();
  });

  it('hides "Nova seção" button for general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => {
      expect(screen.getByText('Anamnese Geral')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /nova seção/i })).not.toBeInTheDocument();
  });

  it('calls copy endpoint and navigates on success', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    api.post.mockResolvedValue({ data: { id: 'copied-id' } });
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copiar para minha coleção/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /copiar para minha coleção/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-2/copy');
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese copiada com sucesso!', 'success');
    });
  });

  // ── Outline — select section ─────────────────────────────

  it('selecting a section in the outline expands it and shows questions', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument();
    });
    // Section 1 is auto-selected; click section 2 to expand it
    const sectionBtns = screen.getAllByRole('button', { name: /rotina de treino/i });
    await user.click(sectionBtns[0]);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /quantas vezes treina por semana\?/i })[0]).toBeInTheDocument();
    });
  });

  it('selecting a question updates the canvas with question title', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument();
    });
    // q1 is auto-selected; click q2 (numeric) to switch
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /qual seu nível de dor\?/i })[0]).toBeInTheDocument();
    });
    await user.click(screen.getAllByRole('button', { name: /qual seu nível de dor\?/i })[0]);
    await waitFor(() => {
      // The canvas eyebrow for a numeric question is "NUMÉRICO" (uppercase)
      expect(screen.getByText('NUMÉRICO')).toBeInTheDocument();
    });
  });

  // ── Canvas — toggle Obrigatória ──────────────────────────

  it('toggling Obrigatória calls PATCH with required: false (was true)', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.patch.mockResolvedValue({ data: {} });
    renderAnamnesisDetail();
    // q1 is auto-selected — Obrigatória switch should be visible
    await waitFor(() => expect(screen.getByRole('switch', { name: /obrigatória/i })).toBeInTheDocument());
    await user.click(screen.getByRole('switch', { name: /obrigatória/i }));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1/sections/section-1/questions/q1',
        expect.objectContaining({ required: false }),
      );
    });
  });

  // ── Canvas — edit title blur ─────────────────────────────

  it('editing question title and blurring calls PATCH with new text', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.patch.mockResolvedValue({ data: {} });
    renderAnamnesisDetail();
    // q1 is auto-selected
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /texto da pergunta/i })).toBeInTheDocument()
    );
    const textarea = screen.getByRole('textbox', { name: /texto da pergunta/i });
    await user.clear(textarea);
    await user.type(textarea, 'Pergunta atualizada?');
    fireEvent.blur(textarea);
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1/sections/section-1/questions/q1',
        expect.objectContaining({ text: 'Pergunta atualizada?' }),
      );
    });
  });

  // ── Library — add question ───────────────────────────────

  it('clicking a library tile posts a new question of that type', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.post.mockResolvedValue({ data: { id: 'new-q-id' } });
    renderAnamnesisDetail();
    await waitFor(() => expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument());
    // Section 1 is auto-selected so library tiles are enabled
    const numericTile = screen.getByRole('button', { name: 'Adicionar pergunta Numérico' });
    await user.click(numericTile);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1/sections/section-1/questions',
        expect.objectContaining({ type: 'numeric' }),
      );
    });
  });

  it('library tile sends "Digite a pergunta…" as seed text (not a type label)', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.post.mockResolvedValue({ data: { id: 'new-q-id' } });
    renderAnamnesisDetail();
    await waitFor(() => expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument());
    const tile = screen.getByRole('button', { name: 'Adicionar pergunta Texto Livre' });
    await user.click(tile);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1/sections/section-1/questions',
        expect.objectContaining({ text: 'Digite a pergunta…' }),
      );
    });
  });

  it('canvas shortcut sends "Digite a pergunta…" as seed text', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesisNoQuestions });
    api.post.mockResolvedValue({ data: { id: 'new-q-id' } });
    renderAnamnesisDetail('anamnesis-no-q');
    await waitFor(() => expect(screen.getByText('Adicione a primeira pergunta')).toBeInTheDocument());
    const allTextLivre = screen.getAllByRole('button', { name: /texto livre/i });
    const shortcut = allTextLivre.find((b) => b.textContent.trim() === '+ Texto Livre');
    await user.click(shortcut);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-no-q/sections/section-1/questions',
        expect.objectContaining({ text: 'Digite a pergunta…' }),
      );
    });
  });

  it('preset sends its own pre-filled text, not the generic seed', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.post.mockResolvedValue({ data: { id: 'preset-q-id' } });
    renderAnamnesisDetail();
    await waitFor(() => expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument());
    // Use the library-panel preset (not canvas-empty-board preset, which requires no-question state)
    const presetBtns = screen.getAllByRole('button', { name: /histórico familiar de diabetes/i });
    await user.click(presetBtns[presetBtns.length - 1]);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1/sections/section-1/questions',
        expect.objectContaining({ text: 'Histórico familiar de diabetes' }),
      );
    });
    // Confirm it is NOT the generic seed text
    const callPayload = api.post.mock.calls[0][1];
    expect(callPayload.text).not.toBe('Digite a pergunta…');
  });

  it('after creating a new question the title textarea receives focus and selection', async () => {
    const user = userEvent.setup();
    // First GET returns anamnesis with section but no questions;
    // second GET (after POST) returns it with the new question
    const anamnesisWithNewQ = {
      ...mockAnamnesisNoQuestions,
      sections: [
        {
          id: 'section-1',
          title: 'Histórico de Saúde',
          order: 0,
          questions: [
            {
              id: 'new-q-id',
              text: 'Digite a pergunta…',
              type: 'free_text',
              required: false,
              order: 0,
              options: [],
              config: null,
            },
          ],
        },
      ],
    };
    api.get
      .mockResolvedValueOnce({ data: mockAnamnesisNoQuestions })
      .mockResolvedValue({ data: anamnesisWithNewQ });
    api.post.mockResolvedValue({ data: { id: 'new-q-id' } });
    renderAnamnesisDetail('anamnesis-no-q');
    await waitFor(() => expect(screen.getByText('Adicione a primeira pergunta')).toBeInTheDocument());
    const allTextLivre = screen.getAllByRole('button', { name: /texto livre/i });
    const shortcut = allTextLivre.find((b) => b.textContent.trim() === '+ Texto Livre');
    await user.click(shortcut);
    await waitFor(() => {
      const textarea = screen.getByRole('textbox', { name: /texto da pergunta/i });
      expect(textarea).toBeInTheDocument();
      expect(document.activeElement).toBe(textarea);
    });
  });

  it('navigating between existing questions does NOT auto-focus the title', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument());
    // q1 is auto-selected; click q2 (no justCreatedQuestionId involved)
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /qual seu nível de dor\?/i })[0]).toBeInTheDocument()
    );
    const textarea = screen.getByRole('textbox', { name: /texto da pergunta/i });
    // Blur before switching
    textarea.blur();
    await user.click(screen.getAllByRole('button', { name: /qual seu nível de dor\?/i })[0]);
    await waitFor(() => expect(screen.getByText('NUMÉRICO')).toBeInTheDocument());
    // The textarea for q2 should NOT be focused (no justCreatedQuestionId set)
    const newTextarea = screen.getByRole('textbox', { name: /texto da pergunta/i });
    expect(document.activeElement).not.toBe(newTextarea);
  });

  it('question-card-title--static class is present on isGeneral question card (no hover affordance)', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => expect(screen.getByText('Anamnese Geral')).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: /obrigatória/i })).toBeInTheDocument()
    );
    // The general question renders as a <p class="question-card-title question-card-title--static">
    // Multiple elements may contain this text (outline row + canvas); select the <p> specifically.
    const allMatches = screen.getAllByText('Você tem alguma doença crônica?');
    const titleEl = allMatches.find((el) => el.tagName === 'P' && el.classList.contains('question-card-title--static'));
    expect(titleEl).toBeTruthy();
  });

  it('clicking a preset row posts a question with pre-filled text', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.post.mockResolvedValue({ data: { id: 'preset-q-id' } });
    renderAnamnesisDetail();
    // Wait for the section title AND for the auto-selected question card to be active
    // (the useEffect that sets selectedQuestionId runs after the fetch render).
    // Without this, getAllByRole may also pick up the canvas-empty-board preset buttons,
    // which call onPresetClick (not handleAddQuestion) and don't trigger a POST.
    await waitFor(() => expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('switch', { name: /obrigatória/i })).toBeInTheDocument());
    const presetBtns = screen.getAllByRole('button', { name: /histórico familiar de diabetes/i });
    await user.click(presetBtns[0]);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1/sections/section-1/questions',
        expect.objectContaining({ text: 'Histórico familiar de diabetes' }),
      );
    });
  });

  // ── Add section — selectedQuestionId reset ───────────────

  it('after creating a new section the empty-question board for the new section is shown', async () => {
    const user = userEvent.setup();

    // Start with an anamnesis that has one section with a question already selected
    const anamnesisWithTwoSections = {
      ...mockAnamnesis,
      sections: [
        ...mockAnamnesis.sections,
        { id: 'new-section-id', title: 'Atividade Física', order: 2, questions: [] },
      ],
    };

    // First GET: original anamnesis (section-1 with q1/q2, section-2 with q3)
    // Second GET (silent refetch after POST): anamnesis with the new empty section appended
    api.get
      .mockResolvedValueOnce({ data: mockAnamnesis })
      .mockResolvedValue({ data: anamnesisWithTwoSections });
    api.post.mockResolvedValue({ data: { id: 'new-section-id' } });

    renderAnamnesisDetail();

    // Wait for auto-selection of q1 in section-1
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /texto da pergunta/i })).toBeInTheDocument()
    );

    // Open the "Nova seção" form
    await user.click(screen.getByRole('button', { name: /nova seção/i }));
    const titleInput = screen.getByRole('textbox', { name: /título da seção/i });
    await user.type(titleInput, 'Atividade Física');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    // The canvas must now show the no-question empty board for the new section
    await waitFor(() => {
      expect(screen.getByText('Adicione a primeira pergunta')).toBeInTheDocument();
    });

    // The eyebrow must contain the new section title in uppercase
    expect(screen.getByText('ATIVIDADE FÍSICA')).toBeInTheDocument();

    // The question editor card must NOT be present (selectedQuestionId was reset)
    expect(screen.queryByRole('textbox', { name: /texto da pergunta/i })).not.toBeInTheDocument();
  });

  it('after creating a new section a library tile adds a question to the new section, not the previous one', async () => {
    const user = userEvent.setup();

    const anamnesisWithTwoSections = {
      ...mockAnamnesis,
      sections: [
        ...mockAnamnesis.sections,
        { id: 'new-section-id', title: 'Atividade Física', order: 2, questions: [] },
      ],
    };

    api.get
      .mockResolvedValueOnce({ data: mockAnamnesis })
      .mockResolvedValue({ data: anamnesisWithTwoSections });

    // First POST creates the section, second POST creates the question
    api.post
      .mockResolvedValueOnce({ data: { id: 'new-section-id' } })
      .mockResolvedValue({ data: { id: 'new-q-id' } });

    renderAnamnesisDetail();

    // Wait for q1 to be auto-selected (section-1 active)
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /texto da pergunta/i })).toBeInTheDocument()
    );

    // Create the new empty section
    await user.click(screen.getByRole('button', { name: /nova seção/i }));
    const titleInput = screen.getByRole('textbox', { name: /título da seção/i });
    await user.type(titleInput, 'Atividade Física');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    // Wait for the empty board to appear (proves activeSectionId switched)
    await waitFor(() =>
      expect(screen.getByText('Adicione a primeira pergunta')).toBeInTheDocument()
    );

    // Click a library tile — must POST to the NEW section, not section-1
    const numericTile = screen.getByRole('button', { name: 'Adicionar pergunta Numérico' });
    await user.click(numericTile);

    await waitFor(() => {
      // The second api.post call must target the new section id
      const questionCall = api.post.mock.calls.find(([url]) =>
        url.includes('/questions')
      );
      expect(questionCall).toBeDefined();
      expect(questionCall[0]).toBe(
        '/trainer/anamneses/anamnesis-1/sections/new-section-id/questions',
      );
      expect(questionCall[1]).toEqual(expect.objectContaining({ type: 'numeric' }));
    });
  });

  // ── Add section ──────────────────────────────────────────

  it('clicking "Nova seção" shows inline form and submitting calls POST', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.post.mockResolvedValue({ data: { id: 'new-section' } });
    renderAnamnesisDetail();
    await waitFor(() => expect(screen.getByRole('button', { name: /nova seção/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /nova seção/i }));
    const titleInput = screen.getByRole('textbox', { name: /título da seção/i });
    await user.type(titleInput, 'Atividade Física');
    // Use exact label to avoid matching library tile aria-labels
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1/sections',
        expect.objectContaining({ title: 'Atividade Física' }),
      );
      expect(mockShowToast).toHaveBeenCalledWith('Seção adicionada com sucesso!', 'success');
    });
  });

  // ── Delete section ───────────────────────────────────────

  it('clicking delete section opens confirm dialog then calls DELETE', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.delete.mockResolvedValue({});
    renderAnamnesisDetail();
    await waitFor(() => expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /excluir seção histórico de saúde/i }));
    expect(screen.getByText(/excluir a seção "histórico de saúde"/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1/sections/section-1');
      expect(mockShowToast).toHaveBeenCalledWith('Seção excluída com sucesso!', 'success');
    });
  });

  // ── Edit section ─────────────────────────────────────────

  it('clicking edit section shows inline form with prefilled title', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /editar seção histórico de saúde/i }));
    const titleInput = screen.getByRole('textbox', { name: /título da seção/i });
    expect(titleInput).toHaveValue('Histórico de Saúde');
  });

  it('submitting edit section calls PATCH and shows success toast', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.patch.mockResolvedValue({ data: {} });
    renderAnamnesisDetail();
    await waitFor(() => expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /editar seção histórico de saúde/i }));
    const titleInput = screen.getByRole('textbox', { name: /título da seção/i });
    await user.clear(titleInput);
    await user.type(titleInput, 'Histórico Atualizado');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1/sections/section-1',
        expect.objectContaining({ title: 'Histórico Atualizado' }),
      );
      expect(mockShowToast).toHaveBeenCalledWith('Seção atualizada com sucesso!', 'success');
    });
  });

  // ── Section drag-reorder ─────────────────────────────────

  it('dragging section A over section B and dropping calls PATCH reorder with new order', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.patch.mockResolvedValue({ data: {} });
    renderAnamnesisDetail();
    await waitFor(() => expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument());

    const sectionABtn = screen.getAllByRole('button', { name: /histórico de saúde/i })[0];
    const sectionBBtn = screen.getAllByRole('button', { name: /rotina de treino/i })[0];

    fireEvent.dragStart(sectionABtn);
    fireEvent.dragOver(sectionBBtn);
    fireEvent.drop(sectionBBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1/sections/reorder',
        { orderedIds: ['section-2', 'section-1'] },
      );
    });
  });

  // ── Fork ─────────────────────────────────────────────────

  it('shows "Nova versão" button for non-general anamneses and calls fork endpoint', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.post.mockResolvedValue({ data: { id: 'forked-id' } });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nova versão/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /nova versão/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1/fork');
      expect(mockShowToast).toHaveBeenCalledWith('Nova versão criada com sucesso!', 'success');
    });
  });

  // ── Fork conflict ─────────────────────────────────────────

  // q1 is auto-selected — just toggle required to trigger conflict
  async function triggerConflictViaToggle(user) {
    await waitFor(() => expect(screen.getByRole('switch', { name: /obrigatória/i })).toBeInTheDocument());
    await user.click(screen.getByRole('switch', { name: /obrigatória/i }));
    await waitFor(() => expect(screen.getByText(/vinculada a alunos/i)).toBeInTheDocument());
  }

  it('ANAMNESIS_HAS_STUDENT_LINKS on toggle opens fork dialog', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.patch.mockRejectedValue({
      response: { status: 409, data: { error: 'ANAMNESIS_HAS_STUDENT_LINKS' } },
    });
    renderAnamnesisDetail();
    await triggerConflictViaToggle(user);
    expect(screen.getByText(/vinculada a alunos/i)).toBeInTheDocument();
  });

  it('confirms fork from conflict dialog and navigates', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.patch.mockRejectedValue({
      response: { status: 409, data: { error: 'ANAMNESIS_HAS_STUDENT_LINKS' } },
    });
    api.post.mockResolvedValue({ data: { id: 'forked-from-conflict' } });
    renderAnamnesisDetail();
    await triggerConflictViaToggle(user);
    const forkBtn = screen.getByRole('button', { name: 'Criar nova versão' });
    await user.click(forkBtn);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1/fork');
    });
  });

  it('dismisses fork conflict dialog on cancel', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.patch.mockRejectedValue({
      response: { status: 409, data: { error: 'ANAMNESIS_HAS_STUDENT_LINKS' } },
    });
    renderAnamnesisDetail();
    await triggerConflictViaToggle(user);
    const cancelBtns = screen.getAllByRole('button', { name: 'Cancelar' });
    await user.click(cancelBtns[cancelBtns.length - 1]);
    expect(screen.queryByText(/vinculada a alunos/i)).not.toBeInTheDocument();
  });

  // ── Preview modal ─────────────────────────────────────────

  it('opens preview modal when "Pré-visualizar" is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => expect(screen.getByRole('button', { name: /pré-visualizar/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /pré-visualizar/i }));
    expect(screen.getByText('Preview aberto')).toBeInTheDocument();
  });

  it('closes preview modal when close button is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => expect(screen.getByRole('button', { name: /pré-visualizar/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /pré-visualizar/i }));
    expect(screen.getByText('Preview aberto')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /fechar pré-visualização/i }));
    expect(screen.queryByText('Preview aberto')).not.toBeInTheDocument();
  });

  // ── Mobile tabs ───────────────────────────────────────────

  it('mobile tabs switch active panel', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Canvas' })).toBeInTheDocument());

    const canvasTab = screen.getByRole('tab', { name: 'Canvas' });
    await user.click(canvasTab);
    expect(canvasTab).toHaveAttribute('aria-selected', 'true');

    const tiposTab = screen.getByRole('tab', { name: 'Tipos' });
    await user.click(tiposTab);
    expect(tiposTab).toHaveAttribute('aria-selected', 'true');
    expect(canvasTab).toHaveAttribute('aria-selected', 'false');
  });

  // ── isGeneral — disabled library ─────────────────────────

  it('library tiles are disabled for general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => expect(screen.getByText('Anamnese Geral')).toBeInTheDocument());
    const tiles = screen.getAllByRole('button', { name: /adicionar pergunta/i });
    tiles.forEach((t) => expect(t).toBeDisabled());
  });

  // ── Delete question ───────────────────────────────────────

  async function openQuestion() {
    // q1 is auto-selected — just wait for the canvas card to appear
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Excluir pergunta' })).toBeInTheDocument()
    );
  }

  it('clicking "Excluir pergunta" opens confirm dialog with question text', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await openQuestion(user);
    await user.click(screen.getByRole('button', { name: 'Excluir pergunta' }));
    expect(
      screen.getByText(/excluir a pergunta "você tem alguma doença crônica\?"/i)
    ).toBeInTheDocument();
  });

  it('confirming delete calls DELETE with the correct URL', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.delete.mockResolvedValue({});
    renderAnamnesisDetail();
    await openQuestion(user);
    await user.click(screen.getByRole('button', { name: 'Excluir pergunta' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1/sections/section-1/questions/q1',
      );
      expect(mockShowToast).toHaveBeenCalledWith('Pergunta excluída com sucesso!', 'success');
    });
  });

  it('after delete success the anamnesis is re-fetched', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.delete.mockResolvedValue({});
    renderAnamnesisDetail();
    await openQuestion(user);
    const callsBefore = api.get.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Excluir pergunta' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => {
      expect(api.get.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('isGeneral anamnese does NOT show the delete question button', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => expect(screen.getByText('Anamnese Geral')).toBeInTheDocument());
    // q1 is auto-selected — canvas shows read-only card
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: /obrigatória/i })).toBeInTheDocument()
    );
    expect(screen.queryByRole('button', { name: /excluir pergunta/i })).not.toBeInTheDocument();
  });

  it('ANAMNESIS_HAS_STUDENT_LINKS on question delete opens fork conflict dialog', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.delete.mockRejectedValue({
      response: { status: 409, data: { error: 'ANAMNESIS_HAS_STUDENT_LINKS' } },
    });
    renderAnamnesisDetail();
    await openQuestion(user);
    await user.click(screen.getByRole('button', { name: 'Excluir pergunta' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => {
      expect(screen.getByText(/vinculada a alunos/i)).toBeInTheDocument();
    });
  });

  // ── Outline — trash icon per question ────────────────────

  async function expandSection() {
    await waitFor(() => expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument());
    // Section 1 is auto-selected so questions already visible
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /excluir pergunta você tem alguma doença crônica\?/i })).toBeInTheDocument()
    );
  }

  it('outline question trash icon opens confirm dialog with question text', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await expandSection(user);
    await user.click(screen.getByRole('button', { name: /excluir pergunta você tem alguma doença crônica\?/i }));
    expect(
      screen.getByText(/excluir a pergunta "você tem alguma doença crônica\?"/i)
    ).toBeInTheDocument();
  });

  it('confirming outline question trash calls DELETE with correct URL', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.delete.mockResolvedValue({});
    renderAnamnesisDetail();
    await expandSection(user);
    await user.click(screen.getByRole('button', { name: /excluir pergunta você tem alguma doença crônica\?/i }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1/sections/section-1/questions/q1',
      );
      expect(mockShowToast).toHaveBeenCalledWith('Pergunta excluída com sucesso!', 'success');
    });
  });

  it('outline question trash click does NOT select the question (stopPropagation)', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await expandSection(user);
    // The canvas already shows q1; clicking outline trash keeps the confirm dialog without losing canvas
    await user.click(screen.getByRole('button', { name: /excluir pergunta você tem alguma doença crônica\?/i }));
    expect(screen.getByText(/excluir a pergunta/i)).toBeInTheDocument();
  });

  it('isGeneral anamnese: outline question trash icon is NOT rendered', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => expect(screen.getByText('Anamnese Geral')).toBeInTheDocument());
    // Section 1 is auto-selected so questions visible
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /você tem alguma doença crônica\?/i })).toBeInTheDocument()
    );
    expect(
      screen.queryByRole('button', { name: /excluir pergunta você tem alguma doença crônica\?/i })
    ).not.toBeInTheDocument();
  });

  // ── Conditional questions ─────────────────────────────────

  describe('conditional questions (Condição de exibição)', () => {
    const makeAnamnesisWithParents = () => ({
      id: 'anamnesis-c',
      title: 'Cond',
      description: null,
      isGeneral: false,
      version: 1,
      parentId: null,
      sections: [
        {
          id: 'sec-1',
          title: 'Seção',
          order: 0,
          questions: [
            // dichotomous parent
            { id: 'p-dich', text: 'Você treina?', type: 'dichotomous', required: false, order: 0, options: [], config: null, parentQuestionId: null, condition: null },
            // single-choice parent
            { id: 'p-single', text: 'Qual tipo?', type: 'single_choice', required: false, order: 1, options: [{ id: 'o-a', text: 'Força' }, { id: 'o-b', text: 'Cardio' }], config: null, parentQuestionId: null, condition: null },
            // multiple-choice parent
            { id: 'p-multi', text: 'Quais sintomas?', type: 'multiple_choice', required: false, order: 2, options: [{ id: 'm-a', text: 'Fadiga' }, { id: 'm-b', text: 'Tontura' }], config: null, parentQuestionId: null, condition: null },
            // free-text (ineligible as parent)
            { id: 'p-free', text: 'Comentários?', type: 'free_text', required: false, order: 3, options: [], config: null, parentQuestionId: null, condition: null },
            // numeric child (will be linked in tests)
            { id: 'c-numeric', text: 'Há quanto tempo?', type: 'numeric', required: false, order: 4, options: [], config: {}, parentQuestionId: null, condition: null },
          ],
        },
      ],
    });

    const renderCondDetail = () => renderAnamnesisDetail('anamnesis-c');

    // Helper: select a question in the outline (or via navigation)
    async function selectQuestion(user, name) {
      const btns = screen.getAllByRole('button', { name: new RegExp(name, 'i') });
      await user.click(btns[0]);
    }

    it('dropdown lists eligible parents (dichotomous, single, multiple) in the same section', async () => {
      api.get.mockResolvedValue({ data: makeAnamnesisWithParents() });
      renderCondDetail();
      // Wait until the first question is auto-selected and condition editor is rendered
      await waitFor(() =>
        expect(screen.getByLabelText('Pergunta pai para exibição condicional')).toBeInTheDocument()
      );
      // Select the numeric child
      const user = userEvent.setup();
      await selectQuestion(user, 'Há quanto tempo\\?');
      const select = screen.getByLabelText('Pergunta pai para exibição condicional');
      const optionTexts = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
      expect(optionTexts).toContain('Você treina?');
      expect(optionTexts).toContain('Qual tipo?');
      expect(optionTexts).toContain('Quais sintomas?');
      // The free-text question must NOT be eligible
      expect(optionTexts).not.toContain('Comentários?');
      // The question itself must NOT be eligible
      expect(optionTexts).not.toContain('Há quanto tempo?');
    });

    it('selecting a dichotomous parent renders Sim/Não radios and saves on pick', async () => {
      api.get.mockResolvedValue({ data: makeAnamnesisWithParents() });
      api.patch.mockResolvedValue({ data: {} });
      renderCondDetail();
      const user = userEvent.setup();
      await waitFor(() =>
        expect(screen.getByLabelText('Pergunta pai para exibição condicional')).toBeInTheDocument()
      );
      // Focus the numeric child
      await selectQuestion(user, 'Há quanto tempo\\?');
      const select = screen.getByLabelText('Pergunta pai para exibição condicional');
      await user.selectOptions(select, 'p-dich');
      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          '/trainer/anamneses/anamnesis-c/sections/sec-1/questions/c-numeric',
          expect.objectContaining({
            parentQuestionId: 'p-dich',
            condition: { operator: 'equals', value: 'yes' },
          }),
        );
      });
    });

    it('selecting a single-choice parent renders radios of its options', async () => {
      const anamnesis = makeAnamnesisWithParents();
      // Pre-link the numeric child to the single-choice parent so the trigger picker renders
      anamnesis.sections[0].questions[4].parentQuestionId = 'p-single';
      anamnesis.sections[0].questions[4].condition = { operator: 'equals', optionId: 'o-a' };
      api.get.mockResolvedValue({ data: anamnesis });
      renderCondDetail();
      const user = userEvent.setup();
      await waitFor(() =>
        expect(screen.getByLabelText('Pergunta pai para exibição condicional')).toBeInTheDocument()
      );
      await selectQuestion(user, 'Há quanto tempo\\?');
      // Force radio should be checked; Cardio should be present
      // Use within the condition fieldset to avoid matching the parent card's own option list
      expect(screen.getByRole('radio', { name: 'Força' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Cardio' })).toBeInTheDocument();
    });

    it('selecting a multiple-choice parent renders checkboxes', async () => {
      const anamnesis = makeAnamnesisWithParents();
      anamnesis.sections[0].questions[4].parentQuestionId = 'p-multi';
      anamnesis.sections[0].questions[4].condition = { operator: 'includesAny', optionIds: [] };
      api.get.mockResolvedValue({ data: anamnesis });
      renderCondDetail();
      const user = userEvent.setup();
      await waitFor(() =>
        expect(screen.getByLabelText('Pergunta pai para exibição condicional')).toBeInTheDocument()
      );
      await selectQuestion(user, 'Há quanto tempo\\?');
      expect(screen.getByRole('checkbox', { name: 'Fadiga' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Tontura' })).toBeInTheDocument();
    });

    it('"Remover condição" clears parent + condition via PATCH nulls', async () => {
      const anamnesis = makeAnamnesisWithParents();
      anamnesis.sections[0].questions[4].parentQuestionId = 'p-dich';
      anamnesis.sections[0].questions[4].condition = { operator: 'equals', value: 'yes' };
      api.get.mockResolvedValue({ data: anamnesis });
      api.patch.mockResolvedValue({ data: {} });
      renderCondDetail();
      const user = userEvent.setup();
      await waitFor(() =>
        expect(screen.getByLabelText('Pergunta pai para exibição condicional')).toBeInTheDocument()
      );
      await selectQuestion(user, 'Há quanto tempo\\?');
      const removeBtn = screen.getByRole('button', { name: /remover condição/i });
      await user.click(removeBtn);
      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          '/trainer/anamneses/anamnesis-c/sections/sec-1/questions/c-numeric',
          expect.objectContaining({ parentQuestionId: null, condition: null }),
        );
      });
    });

    it('shows hint "Nenhuma pergunta elegível nesta seção." when no candidates exist', async () => {
      const anamnesis = {
        id: 'a-none',
        title: 'none',
        description: null,
        isGeneral: false,
        version: 1,
        parentId: null,
        sections: [
          {
            id: 'sec-1',
            title: 's',
            order: 0,
            questions: [
              // Only numeric + free-text; neither can be a parent
              { id: 'n1', text: 'Peso', type: 'numeric', required: false, order: 0, options: [], config: null, parentQuestionId: null, condition: null },
              { id: 'n2', text: 'Altura', type: 'numeric', required: false, order: 1, options: [], config: null, parentQuestionId: null, condition: null },
            ],
          },
        ],
      };
      api.get.mockResolvedValue({ data: anamnesis });
      renderAnamnesisDetail('a-none');
      await waitFor(() =>
        expect(screen.getByText(/nenhuma pergunta elegível nesta seção/i)).toBeInTheDocument()
      );
    });

    it('shows type-locked hint when a question has dependents', async () => {
      const anamnesis = makeAnamnesisWithParents();
      // Link the numeric child to the dichotomous parent → dichotomous parent has a dependent
      anamnesis.sections[0].questions[4].parentQuestionId = 'p-dich';
      anamnesis.sections[0].questions[4].condition = { operator: 'equals', value: 'yes' };
      api.get.mockResolvedValue({ data: anamnesis });
      renderCondDetail();
      const user = userEvent.setup();
      await waitFor(() =>
        expect(screen.getAllByText('Você treina?').length).toBeGreaterThan(0)
      );
      // Select the parent (it has dependents) — click the outline row
      await selectQuestion(user, 'Você treina\\?');
      await waitFor(() =>
        expect(
          screen.getByText(/não é possível alterar o tipo enquanto houver perguntas condicionais vinculadas/i)
        ).toBeInTheDocument()
      );
    });

    it('outline renders conditional child with indentation class and badge', async () => {
      const anamnesis = makeAnamnesisWithParents();
      anamnesis.sections[0].questions[4].parentQuestionId = 'p-dich';
      anamnesis.sections[0].questions[4].condition = { operator: 'equals', value: 'yes' };
      api.get.mockResolvedValue({ data: anamnesis });
      renderCondDetail();
      await waitFor(() =>
        expect(screen.getByText('Há quanto tempo?')).toBeInTheDocument()
      );
      // The conditional child's outline row has the conditional modifier class
      const childRows = screen.getAllByRole('button', { name: /há quanto tempo\?/i });
      const outlineRow = childRows.find((el) => el.className.includes('outline-question-btn--conditional'));
      expect(outlineRow).toBeTruthy();
      // The "↳ condicional" badge is rendered inside
      const badge = screen.getByLabelText('Pergunta condicional');
      expect(badge).toBeInTheDocument();
    });
  });

  it('pressing Enter on outline question div selects the question (a11y)', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument());
    // Section 1 auto-selected — q2 question row visible; focus and press Enter
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /qual seu nível de dor\?/i })[0]).toBeInTheDocument()
    );
    const questionRow = screen.getAllByRole('button', { name: /qual seu nível de dor\?/i })[0];
    questionRow.focus();
    await user.keyboard('{Enter}');
    await waitFor(() =>
      // The canvas eyebrow for a numeric question is the exact uppercase string "NUMÉRICO"
      expect(screen.getByText('NUMÉRICO')).toBeInTheDocument()
    );
  });
});
