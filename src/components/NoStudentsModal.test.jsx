import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NoStudentsModal from './NoStudentsModal';

const mockOnClose = vi.fn();
const mockOnConfirm = vi.fn();

const renderModal = (props = {}) =>
  render(
    <NoStudentsModal
      open={true}
      onClose={mockOnClose}
      onConfirm={mockOnConfirm}
      {...props}
    />
  );

describe('NoStudentsModal', () => {
  beforeEach(() => {
    mockOnClose.mockReset();
    mockOnConfirm.mockReset();
    localStorage.clear();
  });

  it('does not render when open is false', () => {
    render(
      <NoStudentsModal open={false} onClose={mockOnClose} onConfirm={mockOnConfirm} />
    );
    expect(screen.queryByRole('heading', { name: 'Nenhum aluno cadastrado' })).not.toBeInTheDocument();
  });

  it('renders title, message and buttons when open', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: 'Nenhum aluno cadastrado' })).toBeInTheDocument();
    expect(screen.getByText(/Você ainda não tem alunos cadastrados/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar Aluno' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agora não' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Não mostrar novamente/ })).toBeInTheDocument();
  });

  it('calls onConfirm when "Adicionar Aluno" is clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Adicionar Aluno' }));

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when "Agora não" is clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Agora não' }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button (✕) is clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('saves skip preference to localStorage when checkbox is checked and "Adicionar Aluno" clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('checkbox', { name: /Não mostrar novamente/ }));
    await user.click(screen.getByRole('button', { name: 'Adicionar Aluno' }));

    expect(localStorage.getItem('treinoway.skipNoStudentsWarning')).toBe('true');
  });

  it('saves skip preference to localStorage when checkbox is checked and "Agora não" clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('checkbox', { name: /Não mostrar novamente/ }));
    await user.click(screen.getByRole('button', { name: 'Agora não' }));

    expect(localStorage.getItem('treinoway.skipNoStudentsWarning')).toBe('true');
  });

  it('does not save skip preference when checkbox is not checked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Adicionar Aluno' }));

    expect(localStorage.getItem('treinoway.skipNoStudentsWarning')).toBeNull();
  });
});
