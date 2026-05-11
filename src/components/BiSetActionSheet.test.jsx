import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import BiSetActionSheet from './BiSetActionSheet';

describe('BiSetActionSheet', () => {
  it('renders nothing when closed', () => {
    render(
      <BiSetActionSheet open={false} onDissolve={() => {}} onClose={() => {}} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the Desfazer bi-set entry when open', () => {
    render(<BiSetActionSheet open onDissolve={() => {}} onClose={() => {}} />);
    expect(
      screen.getByRole('button', { name: /Desfazer bi-set/i })
    ).toBeInTheDocument();
  });

  it('clicking Desfazer fires onDissolve', async () => {
    const user = userEvent.setup();
    const onDissolve = vi.fn();
    render(<BiSetActionSheet open onDissolve={onDissolve} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Desfazer bi-set/i }));
    expect(onDissolve).toHaveBeenCalledOnce();
  });

  it('clicking the close button fires onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BiSetActionSheet open onDissolve={() => {}} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /Fechar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders Editar ordem entry when onEditOrder is supplied', () => {
    render(
      <BiSetActionSheet
        open
        onDissolve={() => {}}
        onEditOrder={() => {}}
        onClose={() => {}}
      />
    );
    expect(
      screen.getByRole('button', { name: /Editar ordem dos membros/i })
    ).toBeInTheDocument();
  });
});
