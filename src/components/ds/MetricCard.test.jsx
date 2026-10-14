import { render, screen } from '../../test/test-utils';
import MetricCard from './MetricCard';

describe('MetricCard', () => {
  it('renders label, value and support text', () => {
    render(<MetricCard label="Pendentes" value={3} support="aguardando anamnese" tone="warning" />);
    expect(screen.getByText('Pendentes')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('aguardando anamnese')).toBeInTheDocument();
  });

  it('applies the tone modifier', () => {
    const { container } = render(<MetricCard label="Atenção" value={1} tone="error" />);
    expect(container.firstChild).toHaveClass('metric-card--error');
  });

  it('renders an optional header action next to the label', () => {
    render(<MetricCard label="Renova em" value="42 dias" action={<button type="button">Gerenciar</button>} />);
    expect(screen.getByText('Renova em')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerenciar' })).toBeInTheDocument();
  });

  it('omits the support line when not provided', () => {
    const { container } = render(<MetricCard label="Total" value={0} />);
    expect(container.querySelector('.metric-card-support')).toBeNull();
  });
});
