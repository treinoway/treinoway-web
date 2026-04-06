import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test/test-utils';
import StudentBonusSheet from './StudentBonusSheet';

const mockStudent = {
  studentId: 's1',
  firstName: 'Ana',
  lastName: 'Silva',
  avatarUrl: null,
  points: 120,
};

describe('StudentBonusSheet', () => {
  it('renders student info and quick chips', () => {
    render(
      <StudentBonusSheet
        student={mockStudent}
        onAward={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('120 pts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conceder 10 pontos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conceder 25 pontos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conceder 50 pontos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conceder 100 pontos' })).toBeInTheDocument();
  });

  it('calls onAward with chip value when chip is clicked', async () => {
    const user = userEvent.setup();
    const onAward = vi.fn();
    render(
      <StudentBonusSheet
        student={mockStudent}
        onAward={onAward}
        onClose={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Conceder 25 pontos' }));
    expect(onAward).toHaveBeenCalledWith(25, undefined);
  });

  it('shows reason helper text', () => {
    render(
      <StudentBonusSheet
        student={mockStudent}
        onAward={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/aluno verá este motivo/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <StudentBonusSheet
        student={mockStudent}
        onAward={vi.fn()}
        onClose={onClose}
      />
    );
    await user.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalled();
  });
});
