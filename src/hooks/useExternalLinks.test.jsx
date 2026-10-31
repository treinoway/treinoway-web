import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import useExternalLinks from './useExternalLinks';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn(), openExternalUrl: vi.fn() }));
vi.mock('../platform', () => platform);

// Renders links of every kind with the hook active.
const Links = () => {
  useExternalLinks();
  return (
    <div>
      <a href="https://example.com/docs">Docs externos</a>
      <a href="/trainer/students">Alunos</a>
      <a href="mailto:suporte@teufit.com.br">E-mail</a>
      <a href={`${window.location.origin}/privacy-policy`}>Privacidade</a>
    </div>
  );
};

describe('useExternalLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platform.isNative.mockReturnValue(true);
    platform.openExternalUrl.mockResolvedValue(undefined);
  });

  it('opens a link to another origin in the system browser and cancels the in-app navigation', async () => {
    const user = userEvent.setup();
    render(<Links />);

    await user.click(screen.getByRole('link', { name: 'Docs externos' }));

    expect(platform.openExternalUrl).toHaveBeenCalledWith('https://example.com/docs');
  });

  it.each(['Alunos', 'E-mail', 'Privacidade'])('leaves the %s link to the app', async (name) => {
    const user = userEvent.setup();
    render(<Links />);

    await user.click(screen.getByRole('link', { name }));

    expect(platform.openExternalUrl).not.toHaveBeenCalled();
  });

  it('does nothing on the website', async () => {
    platform.isNative.mockReturnValue(false);
    const user = userEvent.setup();
    render(<Links />);

    await user.click(screen.getByRole('link', { name: 'Docs externos' }));

    expect(platform.openExternalUrl).not.toHaveBeenCalled();
  });
});
