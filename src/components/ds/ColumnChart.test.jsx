import { render, screen, within } from '../../test/test-utils';
import ColumnChart from './ColumnChart';

const series = [
  { id: 'trainers', label: 'Treinadores' },
  { id: 'students', label: 'Alunos' },
];

const columns = [
  { label: '05/10', values: [2, 4] },
  { label: '12/10', values: [1, 0] },
];

// Heights of every bar in document order.
const barHeights = (container) =>
  Array.from(container.querySelectorAll('.column-chart__bar')).map((bar) => bar.style.height);

describe('ColumnChart', () => {
  it('renders an image with the given accessible label and the column-chart class', () => {
    render(<ColumnChart ariaLabel="Cadastros por semana" series={series} columns={columns} />);

    const chart = screen.getByRole('img', { name: 'Cadastros por semana' });
    expect(chart).toHaveClass('column-chart');
  });

  it('renders one bar per series in each column, sized relative to the largest value', () => {
    const { container } = render(<ColumnChart ariaLabel="Cadastros" series={series} columns={columns} />);

    expect(container.querySelectorAll('.column-chart__group')).toHaveLength(2);
    expect(barHeights(container)).toEqual(['50%', '100%', '25%', '0%']);
  });

  it('shows a label under each column and a legend with the series labels', () => {
    render(<ColumnChart ariaLabel="Cadastros" series={series} columns={columns} />);

    const chart = screen.getByRole('img', { name: 'Cadastros' });
    expect(within(chart).getByText('05/10')).toBeInTheDocument();
    expect(within(chart).getByText('12/10')).toBeInTheDocument();
    expect(within(chart).getByText('Treinadores')).toBeInTheDocument();
    expect(within(chart).getByText('Alunos')).toBeInTheDocument();
  });

  it('renders zero-height bars without NaN when every value is zero', () => {
    const zeroColumns = [
      { label: '05/10', values: [0, 0] },
      { label: '12/10', values: [0, 0] },
    ];
    const { container } = render(<ColumnChart ariaLabel="Cadastros" series={series} columns={zeroColumns} />);

    expect(barHeights(container)).toEqual(['0%', '0%', '0%', '0%']);
    expect(container.innerHTML).not.toContain('NaN');
  });

  it('renders the chart without bars for empty data', () => {
    const { container } = render(<ColumnChart ariaLabel="Cadastros" series={series} columns={[]} />);

    expect(screen.getByRole('img', { name: 'Cadastros' })).toBeInTheDocument();
    expect(container.querySelectorAll('.column-chart__bar')).toHaveLength(0);
  });
});
