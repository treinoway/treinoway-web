import { render, screen } from '../../test/test-utils';
import StudentLatestNoteCard from './StudentLatestNoteCard';

describe('StudentLatestNoteCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-04T12:00:00'));
  });

  afterEach(() => vi.useRealTimers());

  it('quotes the note with the student, when and the training', () => {
    render(
      <StudentLatestNoteCard
        studentName="Lucas Ferreira"
        session={{ noteText: 'Semana corrida no trabalho', startedAt: '2026-10-01T12:00:00', trainingName: 'Upper' }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Última observação do aluno' })).toBeInTheDocument();
    expect(screen.getByText('“Semana corrida no trabalho”')).toBeInTheDocument();
    expect(screen.getByText('Lucas Ferreira · há 3 dias · Upper')).toBeInTheDocument();
  });

  it('keeps the card with an empty line when there is no note', () => {
    render(<StudentLatestNoteCard session={null} studentName="Lucas" />);
    expect(screen.getByRole('region', { name: 'Última observação do aluno' })).toBeInTheDocument();
    expect(screen.getByText('Nenhuma observação nas sessões recentes.')).toBeInTheDocument();
  });

  it('shows a skeleton while the sessions load — never the empty line', () => {
    render(<StudentLatestNoteCard session={null} studentName="Lucas" loading />);
    expect(screen.getByRole('region', { name: 'Última observação do aluno' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Carregando observação' })).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma observação nas sessões recentes.')).not.toBeInTheDocument();
  });
});
