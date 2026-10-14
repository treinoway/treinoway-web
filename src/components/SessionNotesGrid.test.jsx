import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import SessionNotesGrid from './SessionNotesGrid';
import { useToast } from '../contexts/ToastContext';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

const mockShowToast = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  useToast.mockReturnValue({ showToast: mockShowToast });
});

describe('SessionNotesGrid', () => {
  it('renders student note section', () => {
    render(
      <SessionNotesGrid
        studentNote="Costas pesaram no aquecimento."
        finishedAt="2026-05-13T19:30:00.000Z"
      />,
    );
    expect(screen.getByText('Costas pesaram no aquecimento.')).toBeInTheDocument();
    expect(screen.getByText(/Anotação do aluno/i)).toBeInTheDocument();
  });

  it('renders empty student note message when note is null', () => {
    render(
      <SessionNotesGrid studentNote={null} finishedAt={null} />,
    );
    expect(screen.getByText(/Nenhuma anotação registrada/i)).toBeInTheDocument();
  });

  it('renders trainer note stub section', () => {
    render(
      <SessionNotesGrid studentNote={null} finishedAt={null} />,
    );
    expect(screen.getByText(/Anotação do treinador/i)).toBeInTheDocument();
    expect(screen.getByText(/Recurso em breve/i)).toBeInTheDocument();
  });

  it('renders Edit button for trainer note', () => {
    render(
      <SessionNotesGrid studentNote={null} finishedAt={null} />,
    );
    expect(screen.getByRole('button', { name: /editar anotação do treinador/i })).toBeInTheDocument();
  });

  it('fires "Em breve" toast when Edit is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SessionNotesGrid studentNote={null} finishedAt={null} />,
    );
    await user.click(screen.getByRole('button', { name: /editar anotação do treinador/i }));
    expect(mockShowToast).toHaveBeenCalledWith('Em breve', 'info');
  });

  it('renders the timestamp next to the student note title', () => {
    render(<SessionNotesGrid studentNote="Ótima sessão." finishedAt="2026-05-13T19:30:00.000Z" />);
    expect(screen.getByText(/^1[34] Mai 2026, \d{2}h\d{2}$/)).toBeInTheDocument();
  });

  it('does not render the timestamp when finishedAt is null', () => {
    render(<SessionNotesGrid studentNote="Nota aqui." finishedAt={null} />);
    expect(screen.queryByText(/\d{4}, \d{2}h\d{2}/)).not.toBeInTheDocument();
  });

  it('renders both notes as labelled regions', () => {
    render(<SessionNotesGrid studentNote={null} finishedAt={null} />);
    expect(screen.getByRole('region', { name: 'Anotação do aluno' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Anotação do treinador' })).toBeInTheDocument();
  });
});
