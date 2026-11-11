import PropTypes from 'prop-types';
import { MemoryRouter, Link } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import useInternalLinkGuard from './useInternalLinkGuard';

// Stops jsdom from trying a real navigation after the guard let a click through
const keepPage = (event) => event.preventDefault();

// Page with the guard on and links of every kind
const Harness = ({ active, onIntercept, onNavigate }) => {
  useInternalLinkGuard(active, onIntercept);
  return (
    <MemoryRouter>
      <Link to="/trainer/students" onClick={onNavigate}>Alunos</Link>
      <a href="https://example.org/fora" onClick={keepPage}>Externo</a>
      <a href={window.location.pathname} onClick={keepPage}>Mesma página</a>
      <a href="/trainer/students" target="_blank" rel="noreferrer" onClick={keepPage}>Nova aba</a>
    </MemoryRouter>
  );
};

Harness.propTypes = {
  active: PropTypes.bool.isRequired,
  onIntercept: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
};

describe('useInternalLinkGuard', () => {
  it('PAN-44 hands the path of an internal link to onIntercept and blocks the navigation while active', async () => {
    const onIntercept = vi.fn();
    const onNavigate = vi.fn();
    render(<Harness active onIntercept={onIntercept} onNavigate={onNavigate} />);

    await userEvent.setup().click(screen.getByRole('link', { name: 'Alunos' }));

    expect(onIntercept).toHaveBeenCalledWith('/trainer/students');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('lets the link navigate when not active', async () => {
    const onIntercept = vi.fn();
    const onNavigate = vi.fn();
    render(<Harness active={false} onIntercept={onIntercept} onNavigate={onNavigate} />);

    await userEvent.setup().click(screen.getByRole('link', { name: 'Alunos' }));

    expect(onIntercept).not.toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it.each(['Externo', 'Mesma página', 'Nova aba'])('ignores the %s link', async (name) => {
    const onIntercept = vi.fn();
    render(<Harness active onIntercept={onIntercept} onNavigate={vi.fn()} />);

    await userEvent.setup().click(screen.getByRole('link', { name }));

    expect(onIntercept).not.toHaveBeenCalled();
  });

  it('ignores a click with a modifier key held', async () => {
    const onIntercept = vi.fn();
    render(<Harness active onIntercept={onIntercept} onNavigate={vi.fn()} />);
    const user = userEvent.setup();

    await user.keyboard('{Control>}');
    await user.click(screen.getByRole('link', { name: 'Alunos' }));
    await user.keyboard('{/Control}');

    expect(onIntercept).not.toHaveBeenCalled();
  });
});
