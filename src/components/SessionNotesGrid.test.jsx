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
        studentName="Neto Santos"
        finishedAt="2026-05-13T19:30:00.000Z"
      />,
    );
    expect(screen.getByText('Costas pesaram no aquecimento.')).toBeInTheDocument();
    expect(screen.getByText(/Anotação do aluno/i)).toBeInTheDocument();
  });

  it('renders empty student note message when note is null', () => {
    render(
      <SessionNotesGrid studentNote={null} studentName="Neto Santos" finishedAt={null} />,
    );
    expect(screen.getByText(/Nenhuma anotação registrada/i)).toBeInTheDocument();
  });

  it('renders trainer note stub section', () => {
    render(
      <SessionNotesGrid studentNote={null} studentName={null} finishedAt={null} />,
    );
    expect(screen.getByText(/Anotação do treinador/i)).toBeInTheDocument();
    expect(screen.getByText(/Recurso em breve/i)).toBeInTheDocument();
  });

  it('renders Edit button for trainer note', () => {
    render(
      <SessionNotesGrid studentNote={null} studentName={null} finishedAt={null} />,
    );
    expect(screen.getByRole('button', { name: /editar anotação do treinador/i })).toBeInTheDocument();
  });

  it('fires "Em breve" toast when Edit is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SessionNotesGrid studentNote={null} studentName={null} finishedAt={null} />,
    );
    await user.click(screen.getByRole('button', { name: /editar anotação do treinador/i }));
    expect(mockShowToast).toHaveBeenCalledWith('Em breve', 'info');
  });

  it('renders student name and date in author line', () => {
    render(
      <SessionNotesGrid
        studentNote="Ótima sessão."
        studentName="Neto Santos"
        finishedAt="2026-05-13T19:30:00.000Z"
      />,
    );
    expect(screen.getByText(/Neto Santos/)).toBeInTheDocument();
  });

  it('does not render author line when finishedAt is null', () => {
    render(
      <SessionNotesGrid
        studentNote="Nota aqui."
        studentName="Neto Santos"
        finishedAt={null}
      />,
    );
    // Author line includes "ao finalizar" — should not appear
    expect(screen.queryByText(/ao finalizar/i)).not.toBeInTheDocument();
  });
});
