import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import AnamnesisEditorHeader from './AnamnesisEditorHeader';

const ownAnamnesis = { id: 'a1', title: 'Anamnese de Saúde', version: 2, isGeneral: false, parentId: 'p1' };
const generalAnamnesis = { id: 'a2', title: 'Anamnese Geral', version: 1, isGeneral: true, parentId: null };

const buildHandlers = () => ({
  onPreview: vi.fn(),
  onAssign: vi.fn(),
  onFork: vi.fn(),
  onCopy: vi.fn(),
});

const renderHeader = (anamnesis, props = {}) => {
  const handlers = buildHandlers();
  render(<AnamnesisEditorHeader anamnesis={anamnesis} hasSections {...handlers} {...props} />);
  return handlers;
};

describe('AnamnesisEditorHeader', () => {
  it('renders the title as h1 with version and origin badges', () => {
    renderHeader(ownAnamnesis);
    expect(screen.getByRole('heading', { level: 1, name: 'Anamnese de Saúde' })).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('Derivada')).toBeInTheDocument();
    expect(screen.queryByText('Geral')).not.toBeInTheDocument();
  });

  it('does not render the breadcrumb eyebrow', () => {
    renderHeader(ownAnamnesis);
    expect(screen.queryByText(/treinador/i)).not.toBeInTheDocument();
  });

  it('has "Enviar para alunos" as the primary action and calls onAssign', async () => {
    const user = userEvent.setup();
    const handlers = renderHeader(ownAnamnesis);
    await user.click(screen.getByRole('button', { name: 'Enviar para alunos' }));
    expect(handlers.onAssign).toHaveBeenCalledTimes(1);
  });

  it('opens the preview and disables it when there are no sections', async () => {
    const user = userEvent.setup();
    const handlers = renderHeader(ownAnamnesis);
    await user.click(screen.getByRole('button', { name: 'Pré-visualizar' }));
    expect(handlers.onPreview).toHaveBeenCalledTimes(1);
  });

  it('disables the preview button without sections', () => {
    renderHeader(ownAnamnesis, { hasSections: false });
    expect(screen.getByRole('button', { name: 'Pré-visualizar' })).toBeDisabled();
  });

  it('puts "Nova versão" in the actions menu for own anamneses', async () => {
    const user = userEvent.setup();
    const handlers = renderHeader(ownAnamnesis);
    expect(screen.queryByRole('button', { name: 'Nova versão' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mais ações da anamnese' }));
    await user.click(screen.getByRole('button', { name: 'Nova versão' }));
    expect(handlers.onFork).toHaveBeenCalledTimes(1);
  });

  it('shows the busy label and disables the fork item while forking', async () => {
    const user = userEvent.setup();
    renderHeader(ownAnamnesis, { forking: true });
    await user.click(screen.getByRole('button', { name: 'Mais ações da anamnese' }));
    expect(screen.getByRole('button', { name: 'Criando...' })).toBeDisabled();
  });

  it('general anamnesis: read-only note, Geral badge, copy as primary and assign in the menu', async () => {
    const user = userEvent.setup();
    const handlers = renderHeader(generalAnamnesis);
    expect(screen.getByText('Geral')).toBeInTheDocument();
    expect(screen.getByText(/não pode ser editada/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copiar para minha coleção' }));
    expect(handlers.onCopy).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Mais ações da anamnese' }));
    await user.click(screen.getByRole('button', { name: 'Enviar para alunos' }));
    expect(handlers.onAssign).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Nova versão' })).not.toBeInTheDocument();
  });

  it('shows "Copiando..." and disables copy while copying', () => {
    renderHeader(generalAnamnesis, { copying: true });
    expect(screen.getByRole('button', { name: 'Copiando...' })).toBeDisabled();
  });
});
