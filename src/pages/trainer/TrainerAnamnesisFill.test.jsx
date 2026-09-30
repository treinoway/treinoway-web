import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import TrainerAnamnesisFill from './TrainerAnamnesisFill';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { wizardAnamnesis, wizardResponse } from '../../test/anamnesisWizardFixtures';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const ROUTE_PATH = '/trainer/students/:studentId/anamneses/:anamnesisId/fill';
const FILL_URL = '/trainer/students/student-1/anamneses/anamnesis-1/fill';
const POST_URL = '/trainer/students/student-1/anamneses/anamnesis-1/response';
const DOSSIER_PATH = '/trainer/students/student-1/anamneses/anamnesis-1/response';
const LIST_PATH = '/trainer/students/student-1/anamneses';

const student = { id: 'student-1', firstName: 'Maria', lastName: 'Silva', email: 'maria@example.com' };

const httpError = (status, data) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

const studentDraft = {
  id: 'response-1',
  status: 'draft',
  statusLabel: 'Rascunho',
  filledBy: 'student',
  filledByLabel: 'Aluno',
  submittedAt: null,
  answers: [
    { questionId: 'q-train', value: 'no' },
    { questionId: 'q-shift', value: 'Noite' },
    { questionId: 'q-note', value: '   ' },
  ],
};

const trainerSubmission = {
  ...wizardResponse,
  status: 'awaiting_confirmation',
  statusLabel: 'Aguardando confirmação',
  filledBy: 'trainer',
  filledByLabel: 'Professor',
};

const setupApi = ({
  studentResult = { data: student },
  fill = { anamnesis: wizardAnamnesis, response: null, canFinalize: true },
  fillError,
} = {}) => {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/students/student-1') {
      return studentResult instanceof Error ? Promise.reject(studentResult) : Promise.resolve(studentResult);
    }
    if (url === FILL_URL) {
      return fillError ? Promise.reject(fillError) : Promise.resolve({ data: fill });
    }
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
};

const renderPage = (route = '/trainer/students/student-1/anamneses/anamnesis-1/fill') =>
  renderWithRoute(<TrainerAnamnesisFill />, { route, path: ROUTE_PATH });

const startFilling = async (route) => {
  const user = userEvent.setup();
  renderPage(route);
  await user.click(await screen.findByRole('checkbox', { name: /O aluno está presente/ }));
  await user.click(screen.getByRole('button', { name: 'Começar' }));
  return user;
};

const stepHeading = (name) => screen.getByRole('heading', { level: 2, name });
const clickContinue = (user) => user.click(screen.getByRole('button', { name: 'Continuar' }));

const fillAllSteps = async (user) => {
  await user.click(screen.getByRole('radio', { name: 'Não' }));
  await clickContinue(user);
  await user.click(screen.getByRole('radio', { name: 'Manhã' }));
  await clickContinue(user);
  await user.type(screen.getByRole('textbox', { name: /Qual seu objetivo\?/ }), 'Emagrecer');
  await clickContinue(user);
};

describe('TrainerAnamnesisFill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockReset();
    api.post.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  });

  describe('presence gate', () => {
    it('shows the loading screen while the student loads', () => {
      api.get.mockImplementation(() => new Promise(() => {}));
      renderPage();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
      expect(screen.queryByText('Aluno não encontrado')).not.toBeInTheDocument();
    });

    it('shows the student and blocks "Começar" until the presence is confirmed', async () => {
      setupApi();
      const user = userEvent.setup();
      renderPage();
      expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
      const checkbox = screen.getByRole('checkbox', {
        name: 'O aluno está presente e autorizou que eu registre estas respostas',
      });
      expect(checkbox).not.toBeChecked();
      expect(screen.getByRole('button', { name: 'Começar' })).toBeDisabled();
      await user.click(checkbox);
      expect(screen.getByRole('button', { name: 'Começar' })).toBeEnabled();
      await user.click(checkbox);
      expect(screen.getByRole('button', { name: 'Começar' })).toBeDisabled();
    });

    it('does not request the response before "Começar"', async () => {
      setupApi();
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('checkbox', { name: /O aluno está presente/ }));
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('/trainer/students/student-1');
      expect(api.get).not.toHaveBeenCalledWith(FILL_URL, expect.anything());
    });

    it('requests the response with studentPresent=true only after "Começar"', async () => {
      setupApi();
      await startFilling();
      expect(await screen.findByRole('heading', { level: 1, name: 'Anamnese de Saúde' })).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith(FILL_URL, { params: { studentPresent: true } });
    });

    it('cancels without calling the fill endpoint', async () => {
      setupApi();
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
      expect(mockNavigate).toHaveBeenCalledWith(LIST_PATH);
      expect(api.get).not.toHaveBeenCalledWith(FILL_URL, expect.anything());
    });

    it('shows "aluno não encontrado" only after the student request fails with 404', async () => {
      setupApi({ studentResult: httpError(404) });
      renderPage();
      expect(screen.queryByText('Aluno não encontrado')).not.toBeInTheDocument();
      expect(await screen.findByText('Aluno não encontrado')).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('shows an error state and a toast when the student request fails', async () => {
      setupApi({ studentResult: Object.assign(new Error('x'), { userMessage: 'Falha ao carregar' }) });
      renderPage();
      expect(await screen.findByText('Não foi possível carregar')).toBeInTheDocument();
      expect(mockShowToast).toHaveBeenCalledWith('Falha ao carregar', 'error');
    });

    it('falls back to the email when the student has no name', async () => {
      setupApi({ studentResult: { data: { id: 'student-1', email: 'maria@example.com' } } });
      renderPage();
      expect(await screen.findByText('maria@example.com')).toBeInTheDocument();
    });
  });

  describe('loading the response', () => {
    it('shows the loading screen while the fill request is pending', async () => {
      api.get.mockImplementation((url) =>
        url === FILL_URL ? new Promise(() => {}) : Promise.resolve({ data: student }),
      );
      await startFilling();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('shows "não encontrada" after a 404 from the fill endpoint', async () => {
      setupApi({ fillError: httpError(404, { messageCode: 'anamnesis.notLinkedToStudent' }) });
      await startFilling();
      expect(await screen.findByText('Anamnese não encontrada')).toBeInTheDocument();
      expect(screen.getByText('Esta anamnese não está vinculada a este aluno.')).toBeInTheDocument();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('shows an error state and a toast when the fill request fails', async () => {
      setupApi({ fillError: Object.assign(httpError(500), { userMessage: 'Erro no servidor' }) });
      await startFilling();
      expect(await screen.findByText('Não foi possível carregar')).toBeInTheDocument();
      expect(mockShowToast).toHaveBeenCalledWith('Erro no servidor', 'error');
    });

    it('goes back to the list from the error state', async () => {
      setupApi({ fillError: httpError(500) });
      const user = await startFilling();
      await user.click(await screen.findByRole('button', { name: 'Voltar para anamneses' }));
      expect(mockNavigate).toHaveBeenCalledWith(LIST_PATH);
    });
  });

  describe('read-only state', () => {
    it('explains that the student already submitted and links to the dossier', async () => {
      setupApi({
        fill: {
          anamnesis: wizardAnamnesis,
          response: { ...studentDraft, status: 'submitted', filledBy: 'student' },
          canFinalize: false,
        },
      });
      const user = await startFilling();
      expect(await screen.findByText('Maria já enviou esta anamnese pelo app.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Ver respostas' }));
      expect(mockNavigate).toHaveBeenCalledWith(DOSSIER_PATH);
    });

    it('explains that another trainer filled the anamnesis', async () => {
      setupApi({
        fill: { anamnesis: wizardAnamnesis, response: trainerSubmission, canFinalize: false },
      });
      await startFilling();
      expect(await screen.findByText('Esta anamnese foi preenchida por outro professor.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Salvar respostas' })).not.toBeInTheDocument();
    });
  });

  describe('wizard', () => {
    it('starts blank without a banner when there is no response', async () => {
      setupApi();
      await startFilling();
      expect(await screen.findByText('Preenchendo por Maria Silva')).toBeInTheDocument();
      expect(stepHeading('Saúde')).toBeInTheDocument();
      expect(screen.queryByRole('note')).not.toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Sim' })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: 'Não' })).not.toBeChecked();
    });

    it('pre-fills the student draft and tells how many questions were answered', async () => {
      setupApi({ fill: { anamnesis: wizardAnamnesis, response: studentDraft, canFinalize: true } });
      await startFilling();
      expect(
        await screen.findByText('Maria já respondeu 2 perguntas pelo app. Vamos continuar a partir delas.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Não' })).toBeChecked();
    });

    it('uses the singular when the student answered a single question', async () => {
      setupApi({
        fill: {
          anamnesis: wizardAnamnesis,
          response: { ...studentDraft, answers: [studentDraft.answers[0]] },
          canFinalize: true,
        },
      });
      await startFilling();
      expect(
        await screen.findByText('Maria já respondeu 1 pergunta pelo app. Vamos continuar a partir delas.'),
      ).toBeInTheDocument();
    });

    it('shows no banner for a draft without answers', async () => {
      setupApi({
        fill: { anamnesis: wizardAnamnesis, response: { ...studentDraft, answers: [] }, canFinalize: true },
      });
      await startFilling();
      await screen.findByText('Preenchendo por Maria Silva');
      expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });

    it('warns that saving again replaces a previous trainer submission', async () => {
      setupApi({ fill: { anamnesis: wizardAnamnesis, response: trainerSubmission, canFinalize: true } });
      await startFilling();
      expect(
        await screen.findByText(
          'Você já registrou esta anamnese. Salvar de novo substitui as respostas e pede que Maria confirme novamente.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Sim' })).toBeChecked();
    });

    it('validates each step like the student wizard', async () => {
      setupApi();
      const user = await startFilling();
      await screen.findByText('Preenchendo por Maria Silva');
      await clickContinue(user);
      expect(screen.getByRole('alert')).toHaveTextContent('Esta pergunta é obrigatória.');
      expect(stepHeading('Saúde')).toBeInTheDocument();
    });

    it('leaves to the student anamnesis list from "Voltar" on the first step', async () => {
      setupApi();
      const user = await startFilling();
      await screen.findByText('Preenchendo por Maria Silva');
      await user.click(screen.getByRole('button', { name: 'Voltar' }));
      expect(mockNavigate).toHaveBeenCalledWith(LIST_PATH);
    });

    it('warns before leaving the page once an answer changed', async () => {
      setupApi();
      const user = await startFilling();
      await screen.findByText('Preenchendo por Maria Silva');
      const untouched = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(untouched);
      expect(untouched.defaultPrevented).toBe(false);
      await user.click(screen.getByRole('radio', { name: 'Sim' }));
      const dirty = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(dirty);
      expect(dirty.defaultPrevented).toBe(true);
    });

    it('shows a message when the anamnesis has no questions', async () => {
      setupApi({
        fill: { anamnesis: { ...wizardAnamnesis, sections: [] }, response: null, canFinalize: true },
      });
      await startFilling();
      expect(await screen.findByText('Anamnese sem perguntas')).toBeInTheDocument();
    });
  });

  describe('saving', () => {
    it('labels the final button "Salvar respostas" and sends the attestation with the visible answers', async () => {
      setupApi();
      api.post.mockResolvedValue({ data: { id: 'r-1', status: 'awaiting_confirmation' } });
      const user = await startFilling();
      await screen.findByText('Preenchendo por Maria Silva');
      await fillAllSteps(user);

      expect(stepHeading('Revisão')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Enviar respostas' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Salvar respostas' }));

      await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
      expect(api.post).toHaveBeenCalledWith(POST_URL, {
        answers: [
          { questionId: 'q-train', value: 'no' },
          { questionId: 'q-shift', value: 'Manhã' },
          { questionId: 'q-goal', value: 'Emagrecer' },
        ],
        attestation: { studentPresent: true },
      });
    });

    it('toasts and opens the dossier on success', async () => {
      setupApi();
      api.post.mockResolvedValue({ data: {} });
      const user = await startFilling();
      await screen.findByText('Preenchendo por Maria Silva');
      await fillAllSteps(user);
      await user.click(screen.getByRole('button', { name: 'Salvar respostas' }));
      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith('Anamnese registrada. Maria vai confirmar pelo app.', 'success'),
      );
      expect(mockNavigate).toHaveBeenCalledWith(DOSSIER_PATH);
    });

    it('disables the buttons and shows "Carregando..." while saving', async () => {
      setupApi({ fill: { anamnesis: wizardAnamnesis, response: trainerSubmission, canFinalize: true } });
      let resolvePost;
      api.post.mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }));
      const user = await startFilling('/trainer/students/student-1/anamneses/anamnesis-1/fill?step=4');
      await user.click(await screen.findByRole('button', { name: 'Salvar respostas' }));
      expect(await screen.findByRole('button', { name: 'Carregando...' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();
      resolvePost({ data: {} });
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(DOSSIER_PATH));
    });

    it('maps 400 details onto the question and jumps to its step', async () => {
      setupApi({ fill: { anamnesis: wizardAnamnesis, response: trainerSubmission, canFinalize: true } });
      api.post.mockRejectedValue(
        httpError(400, {
          error: 'VALIDATION_ERROR',
          details: [{ questionId: 'q-goal', message: 'Descreva o objetivo.' }],
        }),
      );
      const user = await startFilling('/trainer/students/student-1/anamneses/anamnesis-1/fill?step=4');
      await user.click(await screen.findByRole('button', { name: 'Salvar respostas' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Descreva o objetivo.');
      expect(stepHeading('Objetivos')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('toasts the error message for other failures and stays on the wizard', async () => {
      setupApi({ fill: { anamnesis: wizardAnamnesis, response: trainerSubmission, canFinalize: true } });
      api.post.mockRejectedValue(Object.assign(httpError(500), { userMessage: 'Erro no servidor' }));
      const user = await startFilling('/trainer/students/student-1/anamneses/anamnesis-1/fill?step=4');
      await user.click(await screen.findByRole('button', { name: 'Salvar respostas' }));
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Erro no servidor', 'error'));
      expect(screen.getByRole('button', { name: 'Salvar respostas' })).toBeEnabled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it.each([
      ['ANAMNESIS_RESPONSE_SUBMITTED_BY_STUDENT', 'O aluno já enviou esta anamnese.', 'student'],
      ['ANAMNESIS_RESPONSE_FILLED_BY_ANOTHER_TRAINER', 'Esta anamnese foi preenchida por outro professor.', 'trainer'],
    ])('on 409 %s toasts, reloads and shows the read-only state', async (code, message, filledBy) => {
      let fillCalls = 0;
      api.get.mockImplementation((url) => {
        if (url === '/trainer/students/student-1') return Promise.resolve({ data: student });
        fillCalls += 1;
        return Promise.resolve({
          data:
            fillCalls === 1
              ? { anamnesis: wizardAnamnesis, response: trainerSubmission, canFinalize: true }
              : {
                  anamnesis: wizardAnamnesis,
                  response: { ...trainerSubmission, filledBy },
                  canFinalize: false,
                },
        });
      });
      api.post.mockRejectedValue(Object.assign(httpError(409, { error: code }), { userMessage: message }));
      const user = await startFilling('/trainer/students/student-1/anamneses/anamnesis-1/fill?step=4');
      await user.click(await screen.findByRole('button', { name: 'Salvar respostas' }));

      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(message, 'error'));
      expect(await screen.findByRole('button', { name: 'Ver respostas' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Salvar respostas' })).not.toBeInTheDocument();
      expect(fillCalls).toBe(2);
      expect(
        screen.getByText(
          filledBy === 'student'
            ? 'Maria já enviou esta anamnese pelo app.'
            : 'Esta anamnese foi preenchida por outro professor.',
        ),
      ).toBeInTheDocument();
    });

    it('translates a 409 without userMessage from the messageCode', async () => {
      setupApi({ fill: { anamnesis: wizardAnamnesis, response: trainerSubmission, canFinalize: true } });
      api.post.mockRejectedValue(
        httpError(409, {
          error: 'ANAMNESIS_RESPONSE_SUBMITTED_BY_STUDENT',
          messageCode: 'anamnesis.response.submittedByStudent',
        }),
      );
      const user = await startFilling('/trainer/students/student-1/anamneses/anamnesis-1/fill?step=4');
      await user.click(await screen.findByRole('button', { name: 'Salvar respostas' }));
      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith('O aluno já enviou esta anamnese.', 'error'),
      );
    });
  });
});
