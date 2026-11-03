import { screen, render } from '../../test/test-utils';
import RoleBadges from './RoleBadges';

describe('RoleBadges', () => {
  it('renders role labels plus student when linked', () => {
    render(<RoleBadges roles={['trainer']} isStudent />);

    expect(screen.getByText('Treinador')).toBeInTheDocument();
    expect(screen.getByText('Aluno')).toBeInTheDocument();
  });

  it('renders the deleted badge for soft-deleted accounts', () => {
    render(<RoleBadges roles={[]} deletedAt="2026-10-01T12:00:00.000Z" />);

    expect(screen.getByText(/exclu/i)).toBeInTheDocument();
  });

  it('renders no deleted badge for active accounts', () => {
    render(<RoleBadges roles={['trainer']} />);

    expect(screen.queryByText(/exclu/i)).not.toBeInTheDocument();
  });
});
