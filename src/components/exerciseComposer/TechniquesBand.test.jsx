import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import TechniquesBand from './TechniquesBand';
import { DROP_SET } from '../../test/advancedTechniqueFixtures';

vi.mock('../../api/advancedTechniques');

describe('TechniquesBand', () => {
  it('renders the label and the selected techniques', () => {
    render(<TechniquesBand value={[DROP_SET]} onChange={vi.fn()} />);
    expect(screen.getByText('Técnicas avançadas')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Técnicas selecionadas' })).toHaveTextContent('Drop set');
  });

  it('forwards removal through onChange', async () => {
    const onChange = vi.fn();
    render(<TechniquesBand value={[DROP_SET]} onChange={onChange} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Remover Drop set' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
