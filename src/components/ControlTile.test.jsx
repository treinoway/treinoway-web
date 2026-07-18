import userEvent from '@testing-library/user-event';
import { screen } from '../test/test-utils';
import { renderWithRouter } from '../test/test-utils';
import ControlTile from './ControlTile';

describe('ControlTile', () => {
  it('renders the label and value as plain text', () => {
    renderWithRouter(<ControlTile label="Planos expirados" value={3} severity="critical" />);
    expect(screen.getByText('Planos expirados')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders as a router Link with the given href when `to` is set', () => {
    renderWithRouter(
      <ControlTile
        label="Planos expirados"
        value={3}
        severity="critical"
        to="/trainer/students?status=vencido"
        ariaLabel="3 planos expirados, ver detalhes"
      />
    );
    expect(screen.getByRole('link', { name: '3 planos expirados, ver detalhes' }))
      .toHaveAttribute('href', '/trainer/students?status=vencido');
  });

  it('renders as a button and fires onAction when using the onAction affordance', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderWithRouter(
      <ControlTile
        label="Pagamentos em atraso"
        value={3}
        severity="critical"
        onAction={onAction}
        ariaLabel="3 pagamentos em atraso, ver detalhes"
      />
    );

    const button = screen.getByRole('button', { name: '3 pagamentos em atraso, ver detalhes' });
    await user.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('never renders as a link or button when neither `to` nor `onAction` is given', () => {
    renderWithRouter(<ControlTile label="Rotinas vencidas" value={2} severity="critical" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('never renders as a link or button for "neutral" severity readouts without to/onAction', () => {
    renderWithRouter(<ControlTile label="Recebido no mês" value="R$ 2.500,00" severity="neutral" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('R$ 2.500,00')).toBeInTheDocument();
  });

  it('shows the subcue text when provided', () => {
    renderWithRouter(
      <ControlTile label="Renovação em até 7 dias" value={2} severity="warn" subcue="Vence em até 7 dias" />
    );
    expect(screen.getByText('Vence em até 7 dias')).toBeInTheDocument();
  });

  it('omits the subcue entirely when not provided', () => {
    const { container } = renderWithRouter(
      <ControlTile label="Rotinas vencidas" value={0} severity="neutral" />
    );
    // Only the label + value text nodes should be present — no third subcue line.
    expect(container.textContent).toBe('Rotinas vencidas0');
  });

  it('renders children in place of label/value/subcue when provided, keeping the card shell', () => {
    renderWithRouter(
      <ControlTile severity="neutral">
        <span>Conteúdo customizado</span>
      </ControlTile>
    );
    expect(screen.getByText('Conteúdo customizado')).toBeInTheDocument();
  });

  it('uses the explicit `icon` override instead of the severity default', () => {
    const CustomIcon = () => <svg data-icon="custom" />;
    const { container } = renderWithRouter(
      <ControlTile label="Alunos inativos 7d+" value={0} severity="neutral" icon={CustomIcon} />
    );
    expect(container.querySelector('[data-icon="custom"]')).toBeInTheDocument();
  });
});
