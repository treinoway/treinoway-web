import { render, screen, within } from '../test/test-utils';
import InviteContext from './InviteContext';

describe('InviteContext', () => {
  it('renders the beta pill, the impersonal title, steps and code chip', () => {
    render(<InviteContext code="TF-7BCA-YAZS-BD" firstStepLabel="Criar conta" />);

    expect(screen.getByText('Beta fechado')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Você foi convidado(a) para o teste fechado' })
    ).toBeInTheDocument();
    expect(screen.getByText('TF-7BCA-YAZS-BD')).toBeInTheDocument();

    const [first, second] = within(screen.getByRole('list', { name: /etapas do convite/i }))
      .getAllByRole('listitem');
    expect(first).toHaveTextContent('Criar conta');
    expect(first).toHaveAttribute('aria-current', 'step');
    expect(second).toHaveTextContent('Acesso liberado');
    expect(second).not.toHaveAttribute('aria-current');
  });

  it('can hide the steps and omits the chip without a code', () => {
    render(<InviteContext firstStepLabel="Entrar" showSteps={false} />);

    expect(screen.queryByRole('list', { name: /etapas do convite/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Código')).not.toBeInTheDocument();
  });
});
