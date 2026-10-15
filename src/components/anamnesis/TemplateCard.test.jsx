import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import TemplateCard from './TemplateCard';

const template = {
  id: 'tpl-1',
  title: 'Triagem PAR-Q',
  description: 'Prontidão para atividade física',
  category: 'screening',
  categoryLabel: 'Triagem',
  questionCount: 7,
};

const renderCard = (props = {}) => {
  const handlers = { onPreview: vi.fn(), onUse: vi.fn() };
  render(<TemplateCard template={template} {...handlers} {...props} />);
  return handlers;
};

describe('TemplateCard', () => {
  it('renders title, category, description and question count', () => {
    renderCard();
    expect(screen.getByRole('article', { name: 'Triagem PAR-Q' })).toBeInTheDocument();
    expect(screen.getByText('Triagem')).toBeInTheDocument();
    expect(screen.getByText('Prontidão para atividade física')).toBeInTheDocument();
    expect(screen.getByText('7 perguntas')).toBeInTheDocument();
  });

  it('renders an item from the older API without category or count', () => {
    const { container } = render(
      <TemplateCard
        template={{ id: 'old', title: 'Anamnese geral', description: null }}
        onPreview={vi.fn()}
        onUse={vi.fn()}
      />,
    );
    expect(screen.getByRole('article', { name: 'Anamnese geral' })).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/undefined|null|NaN/);
    expect(screen.queryByText(/pergunta/)).not.toBeInTheDocument();
  });

  it('calls onPreview and onUse with the template', async () => {
    const user = userEvent.setup();
    const { onPreview, onUse } = renderCard();
    await user.click(screen.getByRole('button', { name: 'Pré-visualizar' }));
    await user.click(screen.getByRole('button', { name: 'Usar este modelo' }));
    expect(onPreview).toHaveBeenCalledWith(template);
    expect(onUse).toHaveBeenCalledWith(template);
  });

  it('shows "Carregando..." and disables both actions while copying', () => {
    renderCard({ using: true });
    expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pré-visualizar' })).toBeDisabled();
  });

  it('disables the actions while another template is being copied', () => {
    renderCard({ disabled: true });
    expect(screen.getByRole('button', { name: 'Usar este modelo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pré-visualizar' })).toBeDisabled();
  });
});
