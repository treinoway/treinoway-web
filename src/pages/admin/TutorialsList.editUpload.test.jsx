import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, within } from '../../test/test-utils';
import TutorialsList from './TutorialsList';
import { useToast } from '../../contexts/ToastContext';
import {
  listAdminTutorials,
  updateTutorial,
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

const uploadTutorial = {
  id: 'b',
  title: 'Criando rotinas',
  description: null,
  videoSource: 'upload',
  videoUrl: 'https://cdn.example/signed/b.mp4',
  videoKey: 'tutorials/b.mp4',
  order: 0,
};

describe('TutorialsList edit upload tutorial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    listAdminTutorials.mockResolvedValue({ items: [uploadTutorial] });
  });

  it('uploads a replacement file then updates with the new videoKey', async () => {
    requestTutorialUploadUrl.mockResolvedValue({ uploadUrl: 'https://s3.example/put', videoKey: 'tutorials/new.mp4' });
    uploadTutorialVideo.mockResolvedValue();
    updateTutorial.mockResolvedValue({ ...uploadTutorial, videoKey: 'tutorials/new.mp4' });
    const user = userEvent.setup();
    renderWithRouter(<TutorialsList />);
    await screen.findByText('Criando rotinas');

    await user.click(screen.getByRole('button', { name: 'Ações de Criando rotinas' }));
    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar tutorial' });
    const file = new File(['x'], 'novo.mp4', { type: 'video/mp4' });
    await user.upload(within(dialog).getByLabelText('Arquivo de vídeo'), file);
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await screen.findByText('Criando rotinas');
    expect(requestTutorialUploadUrl).toHaveBeenCalledWith({ contentType: 'video/mp4', fileSize: file.size });
    expect(uploadTutorialVideo).toHaveBeenCalledWith('https://s3.example/put', file, expect.any(Function));
    expect(updateTutorial).toHaveBeenCalledWith(
      'b',
      expect.objectContaining({ videoSource: 'upload', videoKey: 'tutorials/new.mp4' }),
    );
  });
});
