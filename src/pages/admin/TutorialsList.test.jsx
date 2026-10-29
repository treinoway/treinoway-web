import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, waitFor, within, act } from '../../test/test-utils';
import TutorialsList from './TutorialsList';
import { useToast } from '../../contexts/ToastContext';
import {
  listAdminTutorials,
  createTutorial,
  updateTutorial,
  deleteTutorial,
  reorderTutorials,
  requestTutorialUploadUrl,
  uploadTutorialVideo,
} from '../../api/tutorials';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/tutorials', () => ({
  listAdminTutorials: vi.fn(),
  createTutorial: vi.fn(),
  updateTutorial: vi.fn(),
  deleteTutorial: vi.fn(),
  reorderTutorials: vi.fn(),
  requestTutorialUploadUrl: vi.fn(),
  uploadTutorialVideo: vi.fn(),
}));

const mockShowToast = vi.fn();

const tutorialA = {
  id: 'a',
  title: 'Boas-vindas',
  description: 'Primeiros passos',
  videoSource: 'link',
  videoUrl: 'https://youtu.be/abc123',
  videoKey: null,
  order: 0,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
};
const tutorialB = {
  id: 'b',
  title: 'Criando rotinas',
  description: null,
  videoSource: 'upload',
  videoUrl: 'https://cdn.example/signed/b.mp4',
  videoKey: 'tutorials/b.mp4',
  order: 1,
  createdAt: '2026-10-02T12:00:00.000Z',
  updatedAt: '2026-10-02T12:00:00.000Z',
};
const tutorialC = {
  id: 'c',
  title: 'Financeiro',
  description: 'Cobranças',
  videoSource: 'link',
  videoUrl: 'https://vimeo.com/123',
  videoKey: null,
  order: 2,
  createdAt: '2026-10-03T12:00:00.000Z',
  updatedAt: '2026-10-03T12:00:00.000Z',
};
const tutorials = [tutorialA, tutorialB, tutorialC];

// Builds a File with a controllable size without allocating its bytes.
const makeFile = ({ name = 'aula.mp4', type = 'video/mp4', size = 1024 } = {}) => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Opens the three-dot menu of a tutorial row.
const openRowMenu = async (user, title) => {
  await user.click(screen.getByRole('button', { name: `Ações de ${title}` }));
};

// Opens the create modal and returns its dialog.
const openCreateModal = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Novo tutorial' }));
  return screen.findByRole('dialog', { name: 'Novo tutorial' });
};

// Titles of the fixture tutorials in their original order.
const getTitles = () => tutorials.map((item) => item.title);

describe('TutorialsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    listAdminTutorials.mockResolvedValue({ items: tutorials });
  });

  describe('listing', () => {
    it('renders the page heading and the new tutorial button', async () => {
      renderWithRouter(<TutorialsList />);

      expect(screen.getByRole('heading', { name: 'Tutoriais' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Novo tutorial' })).toBeInTheDocument();
      await screen.findByText('Boas-vindas');
    });

    it('lists the tutorials returned by the API in order', async () => {
      renderWithRouter(<TutorialsList />);

      await screen.findByText('Boas-vindas');
      const rendered = getTitles().map((title) => screen.getByText(title));
      expect(rendered).toHaveLength(3);
      expect(rendered[0].compareDocumentPosition(rendered[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(rendered[1].compareDocumentPosition(rendered[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(listAdminTutorials).toHaveBeenCalled();
    });

    it('shows the empty state when there are no tutorials', async () => {
      listAdminTutorials.mockResolvedValue({ items: [] });
      renderWithRouter(<TutorialsList />);

      expect(await screen.findByText(/nenhum tutorial/i)).toBeInTheDocument();
    });

    it('shows the API userMessage when loading fails', async () => {
      listAdminTutorials.mockRejectedValue({ userMessage: 'Falha de rede' });
      renderWithRouter(<TutorialsList />);

      expect(await screen.findByText('Falha de rede')).toBeInTheDocument();
    });
  });

  describe('create via link', () => {
    it('posts the link payload and lists the new tutorial', async () => {
      const created = { ...tutorialA, id: 'n', title: 'Novo vídeo', description: 'Desc', videoUrl: 'https://youtu.be/xyz' };
      listAdminTutorials.mockResolvedValueOnce({ items: [] }).mockResolvedValue({ items: [created] });
      createTutorial.mockResolvedValue(created);
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText(/nenhum tutorial/i);

      const dialog = await openCreateModal(user);
      await user.type(within(dialog).getByLabelText('Título'), 'Novo vídeo');
      await user.type(within(dialog).getByLabelText('Descrição'), 'Desc');
      await user.click(within(dialog).getByRole('radio', { name: 'Link' }));
      await user.type(within(dialog).getByLabelText('Link do vídeo'), 'https://youtu.be/xyz');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() => {
        expect(createTutorial).toHaveBeenCalledWith({
          title: 'Novo vídeo',
          description: 'Desc',
          videoSource: 'link',
          videoUrl: 'https://youtu.be/xyz',
        });
      });
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo tutorial' })).not.toBeInTheDocument());
      expect(await screen.findByText('Novo vídeo')).toBeInTheDocument();
      expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'success');
    });

    it('rejects a link that is not an http(s) url without calling the API', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      const dialog = await openCreateModal(user);
      await user.type(within(dialog).getByLabelText('Título'), 'Novo vídeo');
      await user.click(within(dialog).getByRole('radio', { name: 'Link' }));
      await user.type(within(dialog).getByLabelText('Link do vídeo'), 'ftp://example.com/video');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(await within(dialog).findByText(/link válido/i)).toBeInTheDocument();
      expect(createTutorial).not.toHaveBeenCalled();
    });

    it('requires a title', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      const dialog = await openCreateModal(user);
      await user.click(within(dialog).getByRole('radio', { name: 'Link' }));
      await user.type(within(dialog).getByLabelText('Link do vídeo'), 'https://youtu.be/xyz');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(await within(dialog).findByText(/título/i, { selector: '[role="alert"], .field-error' })).toBeInTheDocument();
      expect(createTutorial).not.toHaveBeenCalled();
    });

    it('shows the API userMessage and keeps the modal open when creation fails', async () => {
      createTutorial.mockRejectedValue({ userMessage: 'Tutorial inválido.' });
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      const dialog = await openCreateModal(user);
      await user.type(within(dialog).getByLabelText('Título'), 'Novo vídeo');
      await user.click(within(dialog).getByRole('radio', { name: 'Link' }));
      await user.type(within(dialog).getByLabelText('Link do vídeo'), 'https://youtu.be/xyz');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(await within(dialog).findByText('Tutorial inválido.')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Novo tutorial' })).toBeInTheDocument();
    });

    it('closes the modal without calling the API on cancel', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      const dialog = await openCreateModal(user);
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog', { name: 'Novo tutorial' })).not.toBeInTheDocument();
      expect(createTutorial).not.toHaveBeenCalled();
    });
  });

  describe('create via upload', () => {
    const fillTitleAndChooseUpload = async (user, dialog) => {
      await user.type(within(dialog).getByLabelText('Título'), 'Aula gravada');
      await user.click(within(dialog).getByRole('radio', { name: 'Enviar do computador' }));
    };

    it('rejects a file with an unsupported type without requesting an upload url', async () => {
      const user = userEvent.setup({ applyAccept: false });
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      const dialog = await openCreateModal(user);
      await fillTitleAndChooseUpload(user, dialog);
      await user.upload(
        within(dialog).getByLabelText('Arquivo de vídeo'),
        makeFile({ name: 'doc.pdf', type: 'application/pdf' }),
      );
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(await within(dialog).findByText(/MP4, WebM ou MOV/)).toBeInTheDocument();
      expect(requestTutorialUploadUrl).not.toHaveBeenCalled();
      expect(createTutorial).not.toHaveBeenCalled();
    });

    it('rejects a file larger than 500MB without requesting an upload url', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      const dialog = await openCreateModal(user);
      await fillTitleAndChooseUpload(user, dialog);
      await user.upload(
        within(dialog).getByLabelText('Arquivo de vídeo'),
        makeFile({ size: 500 * 1024 * 1024 + 1 }),
      );
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(await within(dialog).findByText(/500\s?MB/)).toBeInTheDocument();
      expect(requestTutorialUploadUrl).not.toHaveBeenCalled();
      expect(createTutorial).not.toHaveBeenCalled();
    });

    it('requires a file when upload is chosen', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      const dialog = await openCreateModal(user);
      await fillTitleAndChooseUpload(user, dialog);
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
      expect(requestTutorialUploadUrl).not.toHaveBeenCalled();
      expect(createTutorial).not.toHaveBeenCalled();
    });

    it('requests the upload url, uploads with progress, then creates with the videoKey', async () => {
      const file = makeFile({ size: 2048 });
      requestTutorialUploadUrl.mockResolvedValue({
        uploadUrl: 'https://s3.example/put?sig=1',
        videoKey: 'tutorials/new.mp4',
        expiresIn: 900,
      });
      let finishUpload;
      let reportProgress;
      uploadTutorialVideo.mockImplementation((_url, _file, onProgress) => {
        reportProgress = onProgress;
        return new Promise((resolve) => {
          finishUpload = resolve;
        });
      });
      createTutorial.mockResolvedValue({ ...tutorialB, id: 'n' });
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      const dialog = await openCreateModal(user);
      await fillTitleAndChooseUpload(user, dialog);
      await user.upload(within(dialog).getByLabelText('Arquivo de vídeo'), file);
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() => {
        expect(requestTutorialUploadUrl).toHaveBeenCalledWith({ contentType: 'video/mp4', fileSize: 2048 });
      });
      await waitFor(() => {
        expect(uploadTutorialVideo).toHaveBeenCalledWith('https://s3.example/put?sig=1', file, expect.any(Function));
      });
      expect(createTutorial).not.toHaveBeenCalled();

      act(() => reportProgress(45));
      const progress = await within(dialog).findByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '45');
      expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeDisabled();

      await act(async () => finishUpload());

      await waitFor(() => {
        expect(createTutorial).toHaveBeenCalledWith({
          title: 'Aula gravada',
          videoSource: 'upload',
          videoKey: 'tutorials/new.mp4',
        });
      });
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo tutorial' })).not.toBeInTheDocument());
    });

    it('shows the userMessage and does not create when the upload fails', async () => {
      requestTutorialUploadUrl.mockResolvedValue({ uploadUrl: 'https://s3.example/put', videoKey: 'tutorials/x.mp4', expiresIn: 900 });
      uploadTutorialVideo.mockRejectedValue({ userMessage: 'Falha no envio do vídeo.' });
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      const dialog = await openCreateModal(user);
      await fillTitleAndChooseUpload(user, dialog);
      await user.upload(within(dialog).getByLabelText('Arquivo de vídeo'), makeFile());
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(await within(dialog).findByText('Falha no envio do vídeo.')).toBeInTheDocument();
      expect(createTutorial).not.toHaveBeenCalled();
    });

    it('shows the userMessage when the upload url request fails', async () => {
      requestTutorialUploadUrl.mockRejectedValue({ userMessage: 'Tipo de vídeo inválido.' });
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      const dialog = await openCreateModal(user);
      await fillTitleAndChooseUpload(user, dialog);
      await user.upload(within(dialog).getByLabelText('Arquivo de vídeo'), makeFile());
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(await within(dialog).findByText('Tipo de vídeo inválido.')).toBeInTheDocument();
      expect(uploadTutorialVideo).not.toHaveBeenCalled();
      expect(createTutorial).not.toHaveBeenCalled();
    });
  });

  describe('edit', () => {
    it('prefills the form from the tutorial and patches the changes', async () => {
      updateTutorial.mockResolvedValue({ ...tutorialA, title: 'Boas-vindas 2' });
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      await openRowMenu(user, 'Boas-vindas');
      await user.click(screen.getByRole('button', { name: 'Editar' }));
      const dialog = await screen.findByRole('dialog', { name: 'Editar tutorial' });

      const titleInput = within(dialog).getByLabelText('Título');
      expect(titleInput).toHaveValue('Boas-vindas');
      expect(within(dialog).getByLabelText('Descrição')).toHaveValue('Primeiros passos');
      expect(within(dialog).getByRole('radio', { name: 'Link' })).toBeChecked();
      expect(within(dialog).getByLabelText('Link do vídeo')).toHaveValue('https://youtu.be/abc123');

      await user.clear(titleInput);
      await user.type(titleInput, 'Boas-vindas 2');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() => {
        expect(updateTutorial).toHaveBeenCalledWith('a', expect.objectContaining({
          title: 'Boas-vindas 2',
          videoSource: 'link',
          videoUrl: 'https://youtu.be/abc123',
        }));
      });
      expect(createTutorial).not.toHaveBeenCalled();
    });

    it('keeps the existing uploaded video when no new file is chosen', async () => {
      updateTutorial.mockResolvedValue({ ...tutorialB, title: 'Rotinas' });
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Criando rotinas');

      await openRowMenu(user, 'Criando rotinas');
      await user.click(screen.getByRole('button', { name: 'Editar' }));
      const dialog = await screen.findByRole('dialog', { name: 'Editar tutorial' });
      expect(within(dialog).getByRole('radio', { name: 'Enviar do computador' })).toBeChecked();

      const titleInput = within(dialog).getByLabelText('Título');
      await user.clear(titleInput);
      await user.type(titleInput, 'Rotinas');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(updateTutorial).toHaveBeenCalledWith('b', expect.objectContaining({ title: 'Rotinas' })));
      const payload = updateTutorial.mock.calls[0][1];
      expect(payload).not.toHaveProperty('videoKey');
      expect(requestTutorialUploadUrl).not.toHaveBeenCalled();
      expect(uploadTutorialVideo).not.toHaveBeenCalled();
    });

    it('shows the API userMessage when the update fails', async () => {
      updateTutorial.mockRejectedValue({ userMessage: 'Tutorial não encontrado.' });
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      await openRowMenu(user, 'Boas-vindas');
      await user.click(screen.getByRole('button', { name: 'Editar' }));
      const dialog = await screen.findByRole('dialog', { name: 'Editar tutorial' });
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(await within(dialog).findByText('Tutorial não encontrado.')).toBeInTheDocument();
    });
  });

  describe('delete', () => {
    it('asks for confirmation, deletes and removes the tutorial from the list', async () => {
      deleteTutorial.mockResolvedValue();
      listAdminTutorials
        .mockResolvedValueOnce({ items: tutorials })
        .mockResolvedValue({ items: [tutorialA, tutorialC] });
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Criando rotinas');

      await openRowMenu(user, 'Criando rotinas');
      await user.click(screen.getByRole('button', { name: 'Excluir' }));
      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toHaveAccessibleName(/Criando rotinas/);
      expect(deleteTutorial).not.toHaveBeenCalled();

      await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

      await waitFor(() => expect(deleteTutorial).toHaveBeenCalledWith('b'));
      await waitFor(() => expect(screen.queryByText('Criando rotinas')).not.toBeInTheDocument());
      expect(screen.getByText('Boas-vindas')).toBeInTheDocument();
      expect(screen.getByText('Financeiro')).toBeInTheDocument();
    });

    it('does not delete when the confirmation is cancelled', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Criando rotinas');

      await openRowMenu(user, 'Criando rotinas');
      await user.click(screen.getByRole('button', { name: 'Excluir' }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      expect(deleteTutorial).not.toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getByText('Criando rotinas')).toBeInTheDocument();
    });

    it('surfaces the userMessage as an error toast when deletion fails', async () => {
      deleteTutorial.mockRejectedValue({ userMessage: 'Não foi possível excluir.' });
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Criando rotinas');

      await openRowMenu(user, 'Criando rotinas');
      await user.click(screen.getByRole('button', { name: 'Excluir' }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Não foi possível excluir.', 'error'));
    });
  });

  describe('reorder', () => {
    const rowTitlesInOrder = () => {
      const nodes = getTitles().map((title) => screen.getByText(title));
      return [...nodes].sort((x, y) => (x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
        .map((node) => node.textContent);
    };

    it('moves a tutorial up by sending the new orderedIds and rendering the result', async () => {
      const reordered = [tutorialB, tutorialA, tutorialC];
      reorderTutorials.mockResolvedValue({ items: reordered });
      listAdminTutorials.mockResolvedValueOnce({ items: tutorials }).mockResolvedValue({ items: reordered });
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Criando rotinas');

      await openRowMenu(user, 'Criando rotinas');
      await user.click(screen.getByRole('button', { name: 'Mover para cima' }));

      await waitFor(() => expect(reorderTutorials).toHaveBeenCalledWith(['b', 'a', 'c']));
      await waitFor(() => expect(rowTitlesInOrder()).toEqual(['Criando rotinas', 'Boas-vindas', 'Financeiro']));
    });

    it('moves a tutorial down by sending the new orderedIds', async () => {
      const reordered = [tutorialB, tutorialA, tutorialC];
      reorderTutorials.mockResolvedValue({ items: reordered });
      listAdminTutorials.mockResolvedValueOnce({ items: tutorials }).mockResolvedValue({ items: reordered });
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      await openRowMenu(user, 'Boas-vindas');
      await user.click(screen.getByRole('button', { name: 'Mover para baixo' }));

      await waitFor(() => expect(reorderTutorials).toHaveBeenCalledWith(['b', 'a', 'c']));
    });

    it('disables moving the first tutorial up and the last one down', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Boas-vindas');

      await openRowMenu(user, 'Boas-vindas');
      expect(screen.getByRole('button', { name: 'Mover para cima' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Mover para baixo' })).toBeEnabled();
      await user.keyboard('{Escape}');
      await user.click(document.body);

      await openRowMenu(user, 'Financeiro');
      expect(screen.getByRole('button', { name: 'Mover para baixo' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Mover para cima' })).toBeEnabled();
    });

    it('shows the userMessage as an error toast when reordering fails', async () => {
      reorderTutorials.mockRejectedValue({ userMessage: 'Ordem inválida.' });
      const user = userEvent.setup();
      renderWithRouter(<TutorialsList />);
      await screen.findByText('Criando rotinas');

      await openRowMenu(user, 'Criando rotinas');
      await user.click(screen.getByRole('button', { name: 'Mover para cima' }));

      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Ordem inválida.', 'error'));
    });
  });
});
