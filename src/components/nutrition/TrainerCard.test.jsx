import { render, screen } from '../../test/test-utils';
import TrainerCard from './TrainerCard';

describe('TrainerCard', () => {
  it('shows the trainer name under "Personal"', () => {
    render(<TrainerCard trainer={{ id: 't', firstName: 'José', lastName: 'Teste', avatarUrl: null }} />);
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('José Teste')).toBeInTheDocument();
  });

  it('does not link to a weekly training (v2: no endpoint)', () => {
    render(<TrainerCard trainer={{ id: 't', firstName: 'José', lastName: 'Teste', avatarUrl: null }} />);
    expect(screen.queryByText('Ver treino da semana')).not.toBeInTheDocument();
  });

  it('renders nothing without a trainer', () => {
    const { container } = render(<TrainerCard trainer={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
