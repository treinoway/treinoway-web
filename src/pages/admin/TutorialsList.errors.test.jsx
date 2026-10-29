import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, within } from '../../test/test-utils';
import TutorialsList from './TutorialsList';
import { useToast } from '../../contexts/ToastContext';
import {
  listAdminTutorials,
  createTutorial,
  requestTutorialUploadUrl,
  uploadTutorialVideo,
} from '../../api/tutorials';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));

vi.mock('../../api/tutorials', () => ({
  listAdminTutorials: vi.fn(),
  createTutorial: vi.fn(),
  updateTutorial: vi.fn(),
  deleteTutorial: vi.fn(),
  reorderTutorials: vi.fn(),
  requestTutorialUploadUrl: vi.fn(),
  uploadTutorialVideo: vi.fn(),
}));

// Builds an axios-like 400 rejection carrying only a messageCode.
const rejectWithCode = (messageCode) => ({ response: { status: 400, data: { messageCode } } });

// Opens the create modal and fills a valid link tutorial, then submits.
const submitLinkTutorial = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Novo tutorial' }));
  const dialog = await screen.findByRole('dialog', { name: 'Novo tutorial' });
  await user.type(within(dialog).getByLabelText('Título'), 'Aula');
  await user.type(within(dialog).getByLabelText('Link do vídeo'), 'https://youtu.be/dQw4w9WgXcQ');
  await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
  return dialog;
};

describe('TutorialsList error messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    listAdminTutorials.mockResolvedValue({ items: [] });
  });

  it.each([
    ['tutorial.invalidVideoType', 'Formato de vídeo inválido. Use MP4, WebM ou MOV.'],
    ['tutorial.videoTooLarge', 'O vídeo deve ter no máximo 500 MB.'],
    ['tutorial.invalidVideoKey', 'Arquivo de vídeo inválido. Envie o vídeo novamente.'],
    ['tutorial.invalidOrder', 'A lista de tutoriais mudou. Atualizamos a ordem, tente de novo.'],
    ['tutorial.notFound', 'Tutorial não encontrado.'],
  ])('shows the specific text for %s on a 400 without userMessage', async (code, text) => {
    createTutorial.mockRejectedValue(rejectWithCode(code));
    const user = userEvent.setup();
    renderWithRouter(<TutorialsList />);
    await screen.findByText(/nenhum tutorial/i);

    const dialog = await submitLinkTutorial(user);

    expect(await within(dialog).findByText(text)).toBeInTheDocument();
  });

  it('prefers userMessage over the messageCode translation', async () => {
    createTutorial.mockRejectedValue({ ...rejectWithCode('tutorial.notFound'), userMessage: 'Mensagem do servidor' });
    const user = userEvent.setup();
    renderWithRouter(<TutorialsList />);
    await screen.findByText(/nenhum tutorial/i);

    const dialog = await submitLinkTutorial(user);

    expect(await within(dialog).findByText('Mensagem do servidor')).toBeInTheDocument();
    expect(within(dialog).queryByText('Tutorial não encontrado.')).not.toBeInTheDocument();
  });

  it('shows the dedicated upload error when the video PUT fails without userMessage', async () => {
    requestTutorialUploadUrl.mockResolvedValue({ uploadUrl: 'https://s3.example/put', videoKey: 'tutorials/x.mp4' });
    uploadTutorialVideo.mockRejectedValue({ response: { status: 403 } });
    const user = userEvent.setup();
    renderWithRouter(<TutorialsList />);
    await screen.findByText(/nenhum tutorial/i);

    await user.click(screen.getByRole('button', { name: 'Novo tutorial' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo tutorial' });
    await user.type(within(dialog).getByLabelText('Título'), 'Aula');
    await user.click(within(dialog).getByLabelText('Enviar do computador'));
    await user.upload(within(dialog).getByLabelText('Arquivo de vídeo'), new File(['x'], 'a.mp4', { type: 'video/mp4' }));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialog).findByText('Não foi possível enviar o vídeo. Tente novamente.')).toBeInTheDocument();
    expect(createTutorial).not.toHaveBeenCalled();
  });
});
