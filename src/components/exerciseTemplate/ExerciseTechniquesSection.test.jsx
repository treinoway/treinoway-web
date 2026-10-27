import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseTechniquesSection from './ExerciseTechniquesSection';
import { DROP_SET } from '../../test/advancedTechniqueFixtures';

vi.mock('../../api/advancedTechniques');

describe('ExerciseTechniquesSection', () => {
  it('renders the heading, hint and selected techniques in a labelled section', () => {
    render(<ExerciseTechniquesSection className="section-card" value={[DROP_SET]} onChange={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Técnicas avançadas' })).toBeInTheDocument();
    expect(screen.getByText(/a ordem da lista é a ordem de execução/i)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Técnicas selecionadas' })).toHaveTextContent('Drop set');
  });

  it('forwards changes through onChange', async () => {
    const onChange = vi.fn();
    render(<ExerciseTechniquesSection className="section-card" value={[DROP_SET]} onChange={onChange} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Remover Drop set' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
