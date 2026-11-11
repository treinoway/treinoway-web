import { render, screen } from '../../test/test-utils';
import PlanStatusBadges from './PlanStatusBadges';

describe('PlanStatusBadges', () => {
  it('shows "Sem plano" without a plan', () => {
    render(<PlanStatusBadges plan={null} />);
    expect(screen.getByText('Sem plano')).toBeInTheDocument();
  });

  it('shows Rascunho for a draft', () => {
    render(<PlanStatusBadges plan={{ status: 'draft', hasUnpublishedChanges: false }} />);
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
  });

  it('shows Publicado and the unpublished changes flag', () => {
    render(<PlanStatusBadges plan={{ status: 'published', hasUnpublishedChanges: true }} />);
    expect(screen.getByText('Publicado')).toBeInTheDocument();
    expect(screen.getByText('Alterações não publicadas')).toBeInTheDocument();
  });
});
