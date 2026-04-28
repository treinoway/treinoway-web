import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import { selectOption } from '../../test-utils/selectOption';
import VideoForm from './VideoForm';

describe('VideoForm', () => {
  let onSubmit;
  let onCancel;

  beforeEach(() => {
    onSubmit = vi.fn();
    onCancel = vi.fn();
  });

  it('renders empty form with required submit label', () => {
    renderWithRouter(
      <VideoForm submitLabel="Criar" onSubmit={onSubmit} onCancel={onCancel} />
    );

    expect(screen.getByLabelText(/título/i)).toHaveValue('');
    expect(screen.getByLabelText(/descrição/i)).toHaveValue('');
    expect(screen.getByLabelText(/url do vídeo/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument();
  });

  it('fills required fields and submits payload', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <VideoForm submitLabel="Criar" onSubmit={onSubmit} onCancel={onCancel} />
    );

    await user.type(screen.getByLabelText(/título/i), 'Agachamento livre');
    await user.type(screen.getByLabelText(/url do vídeo/i), 'https://video.example.com/squat');
    await selectOption(user, screen.getByLabelText(/categoria/i), 'strength');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Agachamento livre',
        url: 'https://video.example.com/squat',
        category: 'strength',
        tags: [],
      })
    );
  });

  it('does not submit when required fields are empty', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <VideoForm submitLabel="Criar" onSubmit={onSubmit} onCancel={onCancel} />
    );

    await user.click(screen.getByRole('button', { name: 'Criar' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('omits optional fields from payload when empty', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <VideoForm submitLabel="Criar" onSubmit={onSubmit} onCancel={onCancel} />
    );

    await user.type(screen.getByLabelText(/título/i), 'Cardio HIIT');
    await user.type(screen.getByLabelText(/url do vídeo/i), 'https://video.example.com/hiit');
    await selectOption(user, screen.getByLabelText(/categoria/i), 'cardio');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).not.toHaveProperty('description');
    expect(payload).not.toHaveProperty('thumbnailUrl');
    expect(payload).not.toHaveProperty('duration');
    expect(payload).not.toHaveProperty('bodySegment');
  });

  it('includes optional fields when provided', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <VideoForm submitLabel="Criar" onSubmit={onSubmit} onCancel={onCancel} />
    );

    await user.type(screen.getByLabelText(/título/i), 'Mobilidade ombro');
    await user.type(screen.getByLabelText(/descrição/i), 'Aquecimento articular');
    await user.type(screen.getByLabelText(/url do vídeo/i), 'https://video.example.com/sh');
    await user.type(screen.getByLabelText(/url da miniatura/i), 'https://img.example.com/sh.jpg');
    await user.type(screen.getByLabelText(/duração/i), '90');
    await selectOption(user, screen.getByLabelText(/categoria/i), 'mobility');
    await selectOption(user, screen.getByLabelText(/segmento corporal/i), 'upper');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Mobilidade ombro',
      description: 'Aquecimento articular',
      url: 'https://video.example.com/sh',
      thumbnailUrl: 'https://img.example.com/sh.jpg',
      duration: 90,
      category: 'mobility',
      bodySegment: 'upper',
      tags: [],
    });
  });

  it('adds tags when Enter is pressed and removes them on click', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <VideoForm submitLabel="Criar" onSubmit={onSubmit} onCancel={onCancel} />
    );

    const tagsInput = screen.getByLabelText(/adicionar tag/i);
    await user.type(tagsInput, 'mobilidade{Enter}');
    await user.type(tagsInput, 'aquecimento{Enter}');

    expect(screen.getByText('mobilidade')).toBeInTheDocument();
    expect(screen.getByText('aquecimento')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remover tag mobilidade/i }));

    expect(screen.queryByText('mobilidade')).not.toBeInTheDocument();
    expect(screen.getByText('aquecimento')).toBeInTheDocument();
  });

  it('adds a tag when comma is typed', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <VideoForm submitLabel="Criar" onSubmit={onSubmit} onCancel={onCancel} />
    );

    const tagsInput = screen.getByLabelText(/adicionar tag/i);
    await user.type(tagsInput, 'cardio,');

    expect(screen.getByText('cardio')).toBeInTheDocument();
  });

  it('does not add duplicate tags', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <VideoForm submitLabel="Criar" onSubmit={onSubmit} onCancel={onCancel} />
    );

    const tagsInput = screen.getByLabelText(/adicionar tag/i);
    await user.type(tagsInput, 'cardio{Enter}');
    await user.type(tagsInput, 'cardio{Enter}');

    expect(screen.getAllByText('cardio')).toHaveLength(1);
  });

  it('submits with tags array populated', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <VideoForm submitLabel="Criar" onSubmit={onSubmit} onCancel={onCancel} />
    );

    await user.type(screen.getByLabelText(/título/i), 'Treino A');
    await user.type(screen.getByLabelText(/url do vídeo/i), 'https://example.com/v');
    await selectOption(user, screen.getByLabelText(/categoria/i), 'strength');

    const tagsInput = screen.getByLabelText(/adicionar tag/i);
    await user.type(tagsInput, 'forca{Enter}');
    await user.type(tagsInput, 'iniciante{Enter}');

    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].tags).toEqual(['forca', 'iniciante']);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <VideoForm submitLabel="Criar" onSubmit={onSubmit} onCancel={onCancel} />
    );

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders initialValues into the form', () => {
    renderWithRouter(
      <VideoForm
        submitLabel="Salvar"
        onSubmit={onSubmit}
        onCancel={onCancel}
        initialValues={{
          title: 'Edit title',
          description: 'Edit desc',
          url: 'https://example.com/x',
          thumbnailUrl: 'https://example.com/x.jpg',
          duration: 120,
          category: 'cardio',
          bodySegment: 'lower',
          tags: ['existing'],
        }}
      />
    );

    expect(screen.getByLabelText(/título/i)).toHaveValue('Edit title');
    expect(screen.getByLabelText(/descrição/i)).toHaveValue('Edit desc');
    expect(screen.getByLabelText(/url do vídeo/i)).toHaveValue('https://example.com/x');
    expect(screen.getByText('existing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('shows generic error above the form', () => {
    renderWithRouter(
      <VideoForm
        submitLabel="Criar"
        onSubmit={onSubmit}
        onCancel={onCancel}
        error="Não foi possível salvar o vídeo."
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar o vídeo.');
  });

  it('shows field-level errors from fieldErrors mapped by field', () => {
    renderWithRouter(
      <VideoForm
        submitLabel="Criar"
        onSubmit={onSubmit}
        onCancel={onCancel}
        fieldErrors={[{ field: 'title', message: 'Título é obrigatório' }]}
      />
    );

    expect(screen.getByText('Título é obrigatório')).toBeInTheDocument();
  });

  it('disables the submit button while submitting', () => {
    renderWithRouter(
      <VideoForm
        submitLabel="Criar"
        onSubmit={onSubmit}
        onCancel={onCancel}
        isSubmitting
      />
    );

    expect(screen.getByRole('button', { name: /salvando/i })).toBeDisabled();
  });
});
