import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import AnamnesisResponseDetail from './AnamnesisResponseDetail';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ studentId: 'student-1', anamnesisId: 'anamnesis-1' }),
  };
});

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
}));

const mockShowToast = vi.fn();

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockStudent = {
  id: 'student-1',
  firstName: 'João',
  lastName: 'Silva',
  email: 'joao@example.com',
  birthDate: '1992-03-15',
  weight: 84,
  height: 178,
};

const mockAnamnesis = {
  id: 'anamnesis-1',
  title: 'Saúde Geral',
  version: 2,
  sections: [
    {
      id: 'sec-1',
      title: 'Dados Gerais',
      order: 0,
      questions: [
        { id: 'q-text', text: 'Qual seu objetivo?', type: 'free_text', order: 0, config: null },
        { id: 'q-num', text: 'Qual seu peso?', type: 'numeric', order: 1, config: { unit: 'kg' } },
        { id: 'q-bool', text: 'Pratica exercício?', type: 'dichotomous', order: 2, config: null },
        {
          id: 'q-single',
          text: 'Turno preferido?',
          type: 'single_choice',
          order: 3,
          config: { options: ['Manhã', 'Tarde', 'Noite'] },
        },
        {
          id: 'q-multi',
          text: 'Atividades praticadas?',
          type: 'multiple_choice',
          order: 4,
          config: { options: ['Musculação', 'Corrida', 'Natação'] },
        },
        {
          id: 'q-matrix',
          text: 'Disponibilidade semanal?',
          type: 'matrix',
          order: 5,
          config: {
            rows: ['Manhã', 'Tarde'],
            cols: ['Seg', 'Ter'],
          },
        },
      ],
    },
  ],
};

const mockResponse = {
  submittedAt: '2024-04-15T10:00:00Z',
  answers: [
    { id: 'a1', questionId: 'q-text', value: 'Ganhar massa muscular' },
    { id: 'a2', questionId: 'q-num', value: '84' },
    { id: 'a3', questionId: 'q-bool', value: 'true' },
    { id: 'a4', questionId: 'q-single', value: 'Manhã' },
    { id: 'a5', questionId: 'q-multi', value: ['Musculação', 'Corrida'] },
    {
      id: 'a6',
      questionId: 'q-matrix',
      value: { Manhã: { Seg: true }, Tarde: { Ter: true } },
    },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const renderPage = () =>
  renderWithRoute(<AnamnesisResponseDetail />, {
    route: '/trainer/students/student-1/anamneses/anamnesis-1/response',
    path: '/trainer/students/:studentId/anamneses/:anamnesisId/response',
  });

const setupApi = ({ responseStatus = 200 } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/students/student-1') return Promise.resolve({ data: mockStudent });
    if (url === '/trainer/anamneses/anamnesis-1') return Promise.resolve({ data: mockAnamnesis });
    if (url === '/trainer/students/student-1/anamneses/anamnesis-1/response') {
      if (responseStatus === 404) {
        const err = new Error('Not found');
        err.response = { status: 404 };
        return Promise.reject(err);
      }
      return Promise.resolve({ data: mockResponse });
    }
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
};

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useToast.mockReturnValue({ showToast: mockShowToast });
  Element.prototype.scrollIntoView = vi.fn();
});

describe('AnamnesisResponseDetail', () => {
  it('shows loading screen initially', () => {
    setupApi();
    // Make API hang to catch the loading state
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders student name in hero after load', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());
  });

  it('computes and shows IMC stat', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());
    // IMC = 84 / (1.78^2) = 26.5
    expect(screen.getByText('26.5')).toBeInTheDocument();
  });

  it('shows age badge computed from birthDate', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());
    // born 1992-03-15 → age depends on current date, just check badge contains "anos"
    const ageBadge = screen.getByText(/\d+ anos/);
    expect(ageBadge).toBeInTheDocument();
  });

  it('hides Peso stat when weight is missing', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students/student-1')
        return Promise.resolve({ data: { ...mockStudent, weight: null, weightKg: null } });
      if (url === '/trainer/anamneses/anamnesis-1') return Promise.resolve({ data: mockAnamnesis });
      if (url.includes('response')) return Promise.resolve({ data: mockResponse });
      return Promise.reject(new Error('unexpected'));
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());
    expect(screen.queryByText('Peso')).not.toBeInTheDocument();
    // Altura should still be visible
    expect(screen.getByText('Altura')).toBeInTheDocument();
  });

  it('renders FREE_TEXT answer as blockquote', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(screen.getByText('Ganhar massa muscular')).toBeInTheDocument());
    const blockquote = screen.getByText('Ganhar massa muscular').closest('blockquote');
    expect(blockquote).toHaveClass('qa-answer-text');
  });

  it('renders NUMERIC answer with unit', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());
    // The qa-answer-numeric-value span contains '84'; hero also shows 84 — check the numeric class
    const numericValue = document.querySelector('.qa-answer-numeric-value');
    expect(numericValue).not.toBeNull();
    expect(numericValue.textContent).toBe('84');
    // Unit label inside the qa block (lowercase from config)
    const numericUnit = document.querySelector('.qa-answer-numeric-unit');
    expect(numericUnit).not.toBeNull();
    expect(numericUnit.textContent.toLowerCase()).toBe('kg');
  });

  it('renders DICHOTOMOUS answer as Sim', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(screen.getByText('Sim')).toBeInTheDocument());
  });

  it('renders SINGLE_CHOICE answer as selected chip', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());
    // Find the selected chip among all elements with the class
    const selectedChips = document.querySelectorAll('.qa-answer-chip--selected');
    const manhãChip = Array.from(selectedChips).find((el) => el.textContent === 'Manhã');
    expect(manhãChip).toBeTruthy();
  });

  it('renders MULTIPLE_CHOICE with selected and unselected chips', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(screen.getByText('Musculação')).toBeInTheDocument());
    const selected = screen.getByText('Musculação');
    expect(selected).toHaveClass('qa-answer-chip--selected');
    const unselected = screen.getByText('Natação');
    expect(unselected).not.toHaveClass('qa-answer-chip--selected');
  });

  it('renders MATRIX answer as a table', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(screen.getByText('Disponibilidade semanal?')).toBeInTheDocument());
    // Table must exist inside the qa-answer-matrix container
    const matrix = document.querySelector('.qa-answer-matrix');
    expect(matrix).not.toBeNull();
    expect(matrix.querySelector('table')).not.toBeNull();
    // Column headers are in <th>
    const ths = Array.from(matrix.querySelectorAll('th'));
    expect(ths.some((th) => th.textContent === 'Seg')).toBe(true);
    expect(ths.some((th) => th.textContent === 'Ter')).toBe(true);
    // Row label cells
    const labelCells = Array.from(matrix.querySelectorAll('td.qa-answer-matrix-label'));
    expect(labelCells.some((td) => td.textContent === 'Manhã')).toBe(true);
    expect(labelCells.some((td) => td.textContent === 'Tarde')).toBe(true);
  });

  it('shows submitted date in meta bar when response exists', async () => {
    setupApi();
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Respondida em/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/V2 do Template/i)).toBeInTheDocument();
  });

  it('shows "Aguardando resposta" and "Sem resposta" on 404', async () => {
    setupApi({ responseStatus: 404 });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Aguardando resposta')).toBeInTheDocument(),
    );
    const emptyAnswers = screen.getAllByText('Sem resposta');
    expect(emptyAnswers.length).toBeGreaterThan(0);
  });

  it('sidebar nav click calls scrollIntoView', async () => {
    setupApi();
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    // Desktop sidebar nav button
    const navButtons = screen.getAllByRole('button', { name: 'Dados Gerais' });
    await user.click(navButtons[0]);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('mobile stepper renders section list', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());
    // The stepper nav (aria-label) contains the section
    const stepperNav = screen.getByRole('navigation', { name: 'Seções da anamnese' });
    expect(stepperNav).toBeInTheDocument();
    expect(stepperNav).toHaveTextContent('Dados Gerais');
  });

  it('back button calls navigate(-1)', async () => {
    setupApi();
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /voltar/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('print button calls window.print', async () => {
    setupApi();
    const user = userEvent.setup();
    const printMock = vi.fn();
    vi.stubGlobal('print', printMock);
    renderPage();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /exportar pdf/i }));
    expect(printMock).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
