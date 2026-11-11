import { renderWithRouter, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import PrescriptionFooter from './PrescriptionFooter';

// Test helper: renders the footer on the menu step with overridable props.
const setup = (props = {}) => {
  const onLinkClick = vi.fn(() => () => {});
  renderWithRouter(<PrescriptionFooter step="menu" basePath="/p/1" onLinkClick={onLinkClick} {...props} />);
  return { onLinkClick };
};

describe('PrescriptionFooter', () => {
  it('shows the save status text, falling back to the autosave message', () => {
    setup({ saveStatusText: 'Salvo às 10:00' });
    expect(screen.getByRole('status')).toHaveTextContent('Salvo às 10:00');
  });

  it('uses the default text when there is no status', () => {
    setup();
    expect(screen.getByRole('status')).toHaveTextContent('As alterações são salvas automaticamente.');
  });

  it('links back and next on a middle step', () => {
    setup();
    expect(screen.getByRole('link', { name: /Metas/ })).toHaveAttribute('href', '/p/1/goals');
    expect(screen.getByRole('link', { name: /Próximo: Orientações/ })).toHaveAttribute('href', '/p/1/guidance');
  });

  it('has no back link on the first step and no next link on the last', () => {
    setup({ step: 'goals' });
    expect(screen.queryByRole('link', { name: /^Metas/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Próximo: Cardápio/ })).toBeInTheDocument();
  });

  it('has no next link on the last step', () => {
    setup({ step: 'guidance' });
    expect(screen.queryByRole('link', { name: /Próximo/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cardápio/ })).toBeInTheDocument();
  });

  it('builds the click handler from the target path', async () => {
    const handler = vi.fn((event) => event.preventDefault());
    const onLinkClick = vi.fn(() => handler);
    setup({ onLinkClick });
    expect(onLinkClick).toHaveBeenCalledWith('/p/1/guidance');
    await userEvent.click(screen.getByRole('link', { name: /Próximo: Orientações/ }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('offers a retry action only when the save failed', async () => {
    const onRetrySave = vi.fn();
    setup({ saveFailed: true, onRetrySave });
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetrySave).toHaveBeenCalledTimes(1);
  });

  it('hides retry when the save did not fail', () => {
    setup({ saveFailed: false, onRetrySave: vi.fn() });
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('renders the extra slot', () => {
    setup({ extra: <button type="button">Concluir</button> });
    expect(screen.getByRole('button', { name: 'Concluir' })).toBeInTheDocument();
  });
});
