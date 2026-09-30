import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import InfoBanner from './InfoBanner';

describe('InfoBanner', () => {
  it('renders the provided text', () => {
    renderWithRouter(<InfoBanner text="Valores serao aplicados como padrao." />);
    expect(screen.getByText('Valores serao aplicados como padrao.')).toBeInTheDocument();
  });

  it('has note role for accessibility', () => {
    renderWithRouter(<InfoBanner text="Mensagem importante" />);
    expect(screen.getByRole('note')).toBeInTheDocument();
  });

  it('has no dismiss button by default', () => {
    renderWithRouter(<InfoBanner text="Aviso" />);
    expect(screen.queryByRole('button', { name: 'Dispensar aviso' })).not.toBeInTheDocument();
  });

  it('calls onDismiss from the dismiss button', async () => {
    const onDismiss = vi.fn();
    renderWithRouter(<InfoBanner text="Aviso" onDismiss={onDismiss} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dispensar aviso' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
