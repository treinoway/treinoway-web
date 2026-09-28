import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import AnamnesisWizard from './AnamnesisWizard';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import {
  singleSectionAnamnesis,
  wizardAnamnesis,
  wizardLink,
  wizardResponse,
} from '../../test/anamnesisWizardFixtures';

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

const ROUTE_PATH = '/my/anamneses/:anamnesisId/answer';

const notFoundError = () => Object.assign(new Error('Not found'), { response: { status: 404 } });

const validationError = (details) =>
  Object.assign(new Error('Bad request'), {
    response: { status: 400, data: { error: 'VALIDATION_ERROR', details } },
  });

const setupApi = ({ links = [wizardLink], response = null, linksError, responseError } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === '/my/anamneses') {
      return linksError ? Promise.reject(linksError) : Promise.resolve({ data: links });
    }
    if (url === '/my/anamneses/anamnesis-1/response') {
      if (responseError) return Promise.reject(responseError);
      return response ? Promise.resolve({ data: response }) : Promise.reject(notFoundError());
    }
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
};

const renderWizard = (route = '/my/anamneses/anamnesis-1/answer') =>
  renderWithRoute(<AnamnesisWizard />, { route, path: ROUTE_PATH });

const renderLoaded = async (route) => {
  const user = userEvent.setup();
  renderWizard(route);
  await screen.findByRole('heading', { level: 1, name: 'Anamnese de Saúde' });
  return user;
};

const stepHeading = (name) => screen.getByRole('heading', { level: 2, name });
const clickContinue = (user) => user.click(screen.getByRole('button', { name: 'Continuar' }));

const fillHealthStep = async (user) => {
  await user.click(screen.getByRole('radio', { name: 'Não' }));
  await clickContinue(user);
};

const fillRoutineStep = async (user) => {
  await user.click(screen.getByRole('radio', { name: 'Manhã' }));
  await user.click(screen.getByRole('checkbox', { name: 'Corrida' }));
  await user.click(screen.getByRole('checkbox', { name: 'Yoga' }));
  await clickContinue(user);
};

const fillGoalStep = async (user) => {
  await user.type(screen.getByRole('textbox', { name: /Qual seu objetivo\?/ }), 'Emagrecer');
  await clickContinue(user);
};

describe('AnamnesisWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockReset();
    api.post.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  });

  describe('loading', () => {
    it('shows the loading screen first and fetches the list and the response in parallel', async () => {
      api.get.mockImplementation(() => new Promise(() => {}));
      renderWizard();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
      expect(screen.queryByText('Anamnese não encontrada')).not.toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith('/my/anamneses');
      expect(api.get).toHaveBeenCalledWith('/my/anamneses/anamnesis-1/response');
    });

    it('shows "não encontrada" only after loading when the anamnesis is not linked', async () => {
      setupApi({ links: [] });
      renderWizard();
      expect(screen.queryByText('Anamnese não encontrada')).not.toBeInTheDocument();
      expect(await screen.findByText('Anamnese não encontrada')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
    });

    it('shows "não encontrada" when the response endpoint fails for an unlinked anamnesis', async () => {
      setupApi({ links: [], responseError: Object.assign(new Error('x'), { response: { status: 403 } }) });
      renderWizard();
      expect(await screen.findByText('Anamnese não encontrada')).toBeInTheDocument();
    });

    it('goes back to the list from the not-found state', async () => {
      setupApi({ links: [] });
      const user = userEvent.setup();
      renderWizard();
      await user.click(await screen.findByRole('button', { name: 'Voltar para anamneses' }));
      expect(mockNavigate).toHaveBeenCalledWith('/my/anamneses');
    });

    it('shows an error state and a toast when the list fails', async () => {
      setupApi({ linksError: { userMessage: 'Falha ao carregar' } });
      renderWizard();
      expect(await screen.findByText('Não foi possível carregar')).toBeInTheDocument();
      expect(mockShowToast).toHaveBeenCalledWith('Falha ao carregar', 'error');
    });

    it('shows an error state when the response fails with a non-404 error', async () => {
      setupApi({ responseError: { userMessage: 'Erro no servidor', response: { status: 500 } } });
      renderWizard();
      expect(await screen.findByText('Não foi possível carregar')).toBeInTheDocument();
      expect(mockShowToast).toHaveBeenCalledWith('Erro no servidor', 'error');
    });

    it('shows a message when the anamnesis has no questions', async () => {
      setupApi({ links: [{ ...wizardLink, anamnesis: { ...wizardAnamnesis, sections: [] } }] });
      renderWizard();
      expect(await screen.findByText('Anamnese sem perguntas')).toBeInTheDocument();
    });
  });

  describe('steps', () => {
    it('starts on the first section (by order) with named progress', async () => {
      setupApi();
      await renderLoaded();
      expect(stepHeading('Saúde')).toBeInTheDocument();
      expect(screen.getByText('Conte sobre sua saúde.')).toBeInTheDocument();
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '1');
      expect(progress).toHaveAttribute('aria-valuemax', '4');
      expect(screen.getByText('Etapa 1 de 4')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Voltar' })).toBeEnabled();
    });

    it('opens the step given in the URL', async () => {
      setupApi();
      await renderLoaded('/my/anamneses/anamnesis-1/answer?step=2');
      expect(stepHeading('Rotina')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    });

    it('hides the stepper with a single section but keeps the review step', async () => {
      setupApi({ links: [{ ...wizardLink, anamnesis: singleSectionAnamnesis }] });
      const user = await renderLoaded();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      await fillHealthStep(user);
      expect(stepHeading('Revisão')).toBeInTheDocument();
    });

    it('goes back between steps without validating', async () => {
      setupApi();
      const user = await renderLoaded('/my/anamneses/anamnesis-1/answer?step=2');
      await user.click(screen.getByRole('button', { name: 'Voltar' }));
      expect(stepHeading('Saúde')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('leaves the wizard from "Voltar" on the first step', async () => {
      setupApi();
      const user = await renderLoaded();
      await user.click(screen.getByRole('button', { name: 'Voltar' }));
      expect(mockNavigate).toHaveBeenCalledWith('/my/anamneses');
    });
  });

  describe('validation', () => {
    it('blocks Continuar when a required question is empty and focuses the field', async () => {
      setupApi();
      const user = await renderLoaded();
      await clickContinue(user);
      expect(screen.getByRole('alert')).toHaveTextContent('Esta pergunta é obrigatória.');
      expect(stepHeading('Saúde')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Sim' })).toHaveFocus();
    });

    it('clears the error when the student answers', async () => {
      setupApi();
      const user = await renderLoaded();
      await clickContinue(user);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      await user.click(screen.getByRole('radio', { name: 'Sim' }));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('only validates the current step', async () => {
      setupApi();
      const user = await renderLoaded();
      await fillHealthStep(user);
      expect(stepHeading('Rotina')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('rejects numeric values outside the configured bounds', async () => {
      setupApi();
      const user = await renderLoaded();
      await user.click(screen.getByRole('radio', { name: 'Sim' }));
      const years = screen.getByRole('spinbutton', { name: /Há quantos anos/ });
      await user.type(years, '80');
      await clickContinue(user);
      expect(screen.getByRole('alert')).toHaveTextContent('O valor máximo é 50.');
      expect(years).toHaveFocus();
      await user.clear(years);
      await user.type(years, '10');
      await clickContinue(user);
      expect(stepHeading('Rotina')).toBeInTheDocument();
    });
  });

  describe('conditional questions', () => {
    it('shows the child only while the parent answer matches', async () => {
      setupApi();
      const user = await renderLoaded();
      expect(screen.queryByText(/Há quantos anos/)).not.toBeInTheDocument();
      await user.click(screen.getByRole('radio', { name: 'Sim' }));
      expect(screen.getByText(/Há quantos anos/)).toBeInTheDocument();
      await user.click(screen.getByRole('radio', { name: 'Não' }));
      expect(screen.queryByText(/Há quantos anos/)).not.toBeInTheDocument();
    });

    it('keeps the child answer when the parent flips back', async () => {
      setupApi();
      const user = await renderLoaded();
      await user.click(screen.getByRole('radio', { name: 'Sim' }));
      await user.type(screen.getByRole('spinbutton', { name: /Há quantos anos/ }), '7');
      await user.click(screen.getByRole('radio', { name: 'Não' }));
      await user.click(screen.getByRole('radio', { name: 'Sim' }));
      expect(screen.getByRole('spinbutton', { name: /Há quantos anos/ })).toHaveValue(7);
    });

    it('does not require a hidden child to continue', async () => {
      setupApi();
      const user = await renderLoaded();
      await fillHealthStep(user);
      expect(stepHeading('Rotina')).toBeInTheDocument();
    });
  });

  describe('review and submit', () => {
    it('walks three sections, reviews and submits the visible answers', async () => {
      setupApi();
      api.post.mockResolvedValue({ data: { id: 'r-1' } });
      const user = await renderLoaded();

      await fillHealthStep(user);
      await fillRoutineStep(user);
      await fillGoalStep(user);

      expect(stepHeading('Revisão')).toBeInTheDocument();
      expect(screen.getByText('1 de 1 respondidas')).toBeInTheDocument();
      expect(screen.getByText('2 de 2 respondidas')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Enviar respostas' }));

      await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
      expect(api.post).toHaveBeenCalledWith('/my/anamneses/anamnesis-1/response', {
        answers: [
          { questionId: 'q-train', value: 'no' },
          { questionId: 'q-shift', value: 'Manhã' },
          { questionId: 'q-activities', value: ['Corrida', 'Yoga'] },
          { questionId: 'q-goal', value: 'Emagrecer' },
        ],
      });
      expect(mockShowToast).toHaveBeenCalledWith('Resposta enviada com sucesso!', 'success');
      expect(mockNavigate).toHaveBeenCalledWith('/my/anamneses');
    });

    it('sends numeric answers as numbers and drops a hidden child answer', async () => {
      setupApi({ links: [{ ...wizardLink, anamnesis: singleSectionAnamnesis }] });
      api.post.mockResolvedValue({ data: {} });
      const user = await renderLoaded();
      await user.click(screen.getByRole('radio', { name: 'Sim' }));
      await user.type(screen.getByRole('spinbutton', { name: /Há quantos anos/ }), '12.5');
      await clickContinue(user);
      await user.click(screen.getByRole('button', { name: 'Enviar respostas' }));
      await waitFor(() => expect(api.post).toHaveBeenCalled());
      expect(api.post.mock.calls[0][1].answers).toEqual([
        { questionId: 'q-train', value: 'yes' },
        { questionId: 'q-years', value: 12.5 },
      ]);
    });

    it('disables submit while a required question is pending and jumps to it with "Corrigir"', async () => {
      setupApi();
      const user = await renderLoaded('/my/anamneses/anamnesis-1/answer?step=4');
      expect(stepHeading('Revisão')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enviar respostas' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Corrigir Rotina' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Corrigir Saúde' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Corrigir Rotina' }));
      expect(stepHeading('Rotina')).toBeInTheDocument();
    });

    it('counts only visible questions in the review', async () => {
      setupApi();
      await renderLoaded('/my/anamneses/anamnesis-1/answer?step=4');
      // "Saúde": q-years is hidden, q-train unanswered => 0 of 1
      expect(screen.getByText('0 de 1 respondidas')).toBeInTheDocument();
    });

    it('disables the buttons and shows "Carregando..." while submitting', async () => {
      setupApi({ response: wizardResponse });
      let resolvePost;
      api.post.mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }));
      const user = await renderLoaded('/my/anamneses/anamnesis-1/answer?step=4');
      await user.click(screen.getByRole('button', { name: 'Atualizar respostas' }));
      const submitting = await screen.findByRole('button', { name: 'Carregando...' });
      expect(submitting).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();
      resolvePost({ data: {} });
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/my/anamneses'));
    });

    it('jumps to the step of the first error returned by a 400 and shows it on the field', async () => {
      setupApi({ response: wizardResponse });
      api.post.mockRejectedValue(
        validationError([{ questionId: 'q-shift', message: 'Opção inválida para esta pergunta.' }]),
      );
      const user = await renderLoaded('/my/anamneses/anamnesis-1/answer?step=4');
      await user.click(screen.getByRole('button', { name: 'Atualizar respostas' }));

      expect(await screen.findByText('Opção inválida para esta pergunta.')).toBeInTheDocument();
      expect(stepHeading('Rotina')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Manhã' })).toHaveFocus();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('shows a toast for other errors and stays on the review', async () => {
      setupApi({ response: wizardResponse });
      api.post.mockRejectedValue({ userMessage: 'Erro ao enviar', response: { status: 500 } });
      const user = await renderLoaded('/my/anamneses/anamnesis-1/answer?step=4');
      await user.click(screen.getByRole('button', { name: 'Atualizar respostas' }));
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Erro ao enviar', 'error'));
      expect(stepHeading('Revisão')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Atualizar respostas' })).toBeEnabled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('falls back to a toast when a 400 carries no usable question errors', async () => {
      setupApi({ response: wizardResponse });
      api.post.mockRejectedValue(
        Object.assign(new Error('x'), {
          userMessage: 'Dados inválidos',
          response: { status: 400, data: { details: [{ field: 'answers' }] } },
        }),
      );
      const user = await renderLoaded('/my/anamneses/anamnesis-1/answer?step=4');
      await user.click(screen.getByRole('button', { name: 'Atualizar respostas' }));
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Dados inválidos', 'error'));
    });
  });

  describe('previous response', () => {
    it('pre-fills the answers and labels the submit button as an update', async () => {
      setupApi({ response: wizardResponse });
      const user = await renderLoaded();
      expect(screen.getByRole('radio', { name: 'Sim' })).toBeChecked();
      expect(screen.getByRole('spinbutton', { name: /Há quantos anos/ })).toHaveValue(5);
      await clickContinue(user);
      expect(screen.getByRole('radio', { name: 'Noite' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Corrida' })).toBeChecked();
      await clickContinue(user);
      expect(screen.getByRole('textbox', { name: /Qual seu objetivo\?/ })).toHaveValue('Ganhar massa');
      await clickContinue(user);
      expect(screen.getByRole('button', { name: 'Atualizar respostas' })).toBeEnabled();
      expect(screen.queryByRole('button', { name: 'Enviar respostas' })).not.toBeInTheDocument();
    });

    it('does not pre-select an option that no longer exists, so the student answers again', async () => {
      const stale = {
        ...wizardResponse,
        answers: wizardResponse.answers.map((entry) =>
          entry.questionId === 'q-shift' ? { ...entry, value: 'Tarde (removida)' } : entry,
        ),
      };
      setupApi({ response: stale });
      const user = await renderLoaded('/my/anamneses/anamnesis-1/answer?step=2');
      expect(screen.getByRole('radio', { name: 'Manhã' })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: 'Noite' })).not.toBeChecked();
      await clickContinue(user);
      expect(screen.getByRole('alert')).toHaveTextContent('Esta pergunta é obrigatória.');
    });
  });
});
