import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import OneTimeBanner from './OneTimeBanner';

describe('OneTimeBanner', () => {
  const storageKey = 'test.oneTimeBanner';

  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the text', () => {
    render(<OneTimeBanner storageKey={storageKey} text="Mudanças aqui só valem para este template." />);

    expect(screen.getByText('Mudanças aqui só valem para este template.')).toBeInTheDocument();
  });

  it('hides itself when dismissed and persists the dismissal', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <OneTimeBanner storageKey={storageKey} text="Banner educativo" />
    );

    await user.click(screen.getByRole('button', { name: /fechar aviso/i }));

    expect(screen.queryByText('Banner educativo')).not.toBeInTheDocument();
    expect(localStorage.getItem(storageKey)).toBe('1');

    unmount();
    render(<OneTimeBanner storageKey={storageKey} text="Banner educativo" />);

    expect(screen.queryByText('Banner educativo')).not.toBeInTheDocument();
  });

  it('uses a custom dismiss label', () => {
    render(<OneTimeBanner storageKey={storageKey} text="Aviso" dismissLabel="Ocultar dica" />);

    expect(screen.getByRole('button', { name: /ocultar dica/i })).toBeInTheDocument();
  });
});
