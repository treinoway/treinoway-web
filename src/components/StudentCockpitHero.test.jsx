import { render, screen } from '../test/test-utils';
import StudentCockpitHero from './StudentCockpitHero';

const student = { firstName: 'Lucas', lastName: 'Ferreira', email: 'lucas@email.com' };

describe('StudentCockpitHero', () => {
  it('renders the student name as the page heading and the email', () => {
    render(<StudentCockpitHero student={student} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Lucas Ferreira' })).toBeInTheDocument();
    expect(screen.getByText('lucas@email.com')).toBeInTheDocument();
  });

  it('renders the initials avatar hidden from assistive tech', () => {
    render(<StudentCockpitHero student={student} />);
    expect(screen.getByText('LF')).toHaveAttribute('aria-hidden', 'true');
  });

  it('joins the active routine and the plan in the context line', () => {
    render(<StudentCockpitHero student={student} routineName="Protocolo 03" planName="Plano trimestral" />);
    expect(screen.getByText('Protocolo 03 · Plano trimestral')).toBeInTheDocument();
  });

  it('says there is no active routine instead of dropping the context line', () => {
    render(<StudentCockpitHero student={student} planName="Plano trimestral" />);
    expect(screen.getByText('Sem rotina ativa · Plano trimestral')).toBeInTheDocument();
  });

  it('keeps the context line for a student without routine nor plan', () => {
    render(<StudentCockpitHero student={student} />);
    expect(screen.getByText('Sem rotina ativa')).toBeInTheDocument();
  });

  it('shows the trainer in charge when known', () => {
    render(<StudentCockpitHero student={student} trainerName="João Lucas" />);
    expect(screen.getByText('Treinador responsável')).toBeInTheDocument();
    expect(screen.getByText('João Lucas')).toBeInTheDocument();
  });

  it('omits the trainer block without a name', () => {
    render(<StudentCockpitHero student={student} />);
    expect(screen.queryByText('Treinador responsável')).not.toBeInTheDocument();
  });

  it('falls back to the email when the student has no name', () => {
    render(<StudentCockpitHero student={{ email: 'sem.nome@email.com' }} />);
    expect(screen.getByRole('heading', { level: 1, name: 'sem.nome@email.com' })).toBeInTheDocument();
  });

  it('renders a placeholder while the student is unknown', () => {
    render(<StudentCockpitHero student={null} />);
    expect(screen.getByRole('heading', { level: 1, name: '—' })).toBeInTheDocument();
  });

  describe('while loading', () => {
    it('keeps the known name and hides the context line until everything is ready', () => {
      render(<StudentCockpitHero student={student} routineName="Protocolo 03" planName="Plano trimestral" loading />);
      expect(screen.getByRole('heading', { level: 1, name: 'Lucas Ferreira' })).toBeInTheDocument();
      expect(screen.queryByText(/Protocolo 03/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Sem rotina ativa/)).not.toBeInTheDocument();
      expect(screen.getByRole('banner')).toHaveAttribute('aria-busy', 'true');
    });

    it('announces loading in the heading instead of a "—" placeholder when the student is unknown', () => {
      render(<StudentCockpitHero student={null} loading />);
      expect(screen.getByRole('heading', { level: 1, name: 'Carregando aluno' })).toBeInTheDocument();
      expect(screen.queryByText('—')).not.toBeInTheDocument();
    });
  });
});
