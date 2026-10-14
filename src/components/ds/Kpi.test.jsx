import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/test-utils';
import Kpi from './Kpi';

describe('Kpi', () => {
  it('renders label, value and support', () => {
    render(<Kpi label="A receber" value="R$ 300,00" support="3 cobranças" />);
    expect(screen.getByText('A receber')).toBeInTheDocument();
    expect(screen.getByText('R$ 300,00')).toBeInTheDocument();
    expect(screen.getByText('3 cobranças')).toBeInTheDocument();
  });

  it('tints only the value with the tone', () => {
    render(<Kpi label="Em atraso" value="R$ 10,00" tone="error" />);
    expect(screen.getByText('R$ 10,00')).toHaveClass('kpi-value--error');
    expect(screen.getByText('Em atraso')).not.toHaveClass('kpi-value--error');
  });
});
