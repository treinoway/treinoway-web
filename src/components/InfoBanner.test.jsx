import { screen } from '@testing-library/react';
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
});
