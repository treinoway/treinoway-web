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

  it('renders only the parts that exist', () => {
    render(<StudentCockpitHero student={student} planName="Plano trimestral" />);
    expect(screen.getByText('Plano trimestral')).toBeInTheDocument();
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
});
