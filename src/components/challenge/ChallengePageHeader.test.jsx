import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import ChallengePageHeader from './ChallengePageHeader';

const TODAY = '2026-11-18';

// Weekly championship as GET /trainer/challenges/:id returns it
const challengeOf = (overrides = {}) => ({
  id: 'c1',
  name: 'Verão 2027',
  description: 'Prêmio: uma camiseta para o 1º lugar',
  status: 'active',
  format: 'weeks',
  startDate: '2026-11-02',
  endDate: '2026-11-29',
  participantCount: 18,
  ...overrides,
});

// Renders the header with spies for the back link and the bonus button
const renderHeader = (challenge = challengeOf(), props = {}) => {
  const onBack = vi.fn();
  const onBonus = vi.fn();
  const { container } = render(
    <ChallengePageHeader challenge={challenge} today={TODAY} showDescription onBack={onBack} onBonus={onBonus} {...props} />,
  );
  return { onBack, onBonus, container };
};

describe('ChallengePageHeader', () => {
  it('CPD-30 shows back link, title, status tag, dates with participants, description and Dar bônus', async () => {
    const user = userEvent.setup();
    const { onBack, onBonus, container } = renderHeader();

    expect(screen.getByRole('heading', { level: 1, name: 'Verão 2027' })).toBeInTheDocument();
    const tag = container.querySelector('.badge');
    expect(tag).toHaveTextContent('Ativo');
    expect(tag).toHaveClass('badge--tag', 'badge--success');
    expect(screen.getByText('02/11 – 29/11/2026 · 18 participantes')).toBeInTheDocument();
    expect(screen.getByText('Prêmio: uma camiseta para o 1º lugar')).toBeInTheDocument();
    expect(container.querySelector('.card')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Campeonatos' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Dar bônus' })).toHaveClass('btn', 'btn--neutral');
    await user.click(screen.getByRole('button', { name: 'Dar bônus' }));
    expect(onBonus).toHaveBeenCalledTimes(1);
  });

  it('CPD-30 says 1 participante and hides the description of a dates championship', () => {
    renderHeader(challengeOf({ format: 'dates', participantCount: 1 }), { showDescription: false });

    expect(screen.getByText('02/11 – 29/11/2026 · 1 participante')).toBeInTheDocument();
    expect(screen.queryByText('Prêmio: uma camiseta para o 1º lugar')).not.toBeInTheDocument();
  });

  it('CPD-46 hides Dar bônus and tags a closed championship Concluído', () => {
    const { container } = renderHeader(challengeOf({ status: 'completed' }));

    expect(container.querySelector('.badge')).toHaveTextContent('Concluído');
    expect(container.querySelector('.badge')).toHaveClass('badge--tag', 'badge--brand');
    expect(screen.queryByRole('button', { name: 'Dar bônus' })).not.toBeInTheDocument();
  });

  it('CPD-45 shows no Dar bônus in the header of a scheduled championship', () => {
    const { container } = renderHeader(challengeOf({ status: 'scheduled', startDate: '2026-11-23', endDate: '2026-12-20' }));

    expect(container.querySelector('.badge')).toHaveTextContent('Agendado');
    expect(screen.queryByRole('button', { name: 'Dar bônus' })).not.toBeInTheDocument();
  });

  it('CPD-51 hides Dar bônus and tags a cancelled championship Cancelado', () => {
    const { container } = renderHeader(challengeOf({ status: 'cancelled' }));

    expect(container.querySelector('.badge')).toHaveTextContent('Cancelado');
    expect(screen.queryByRole('button', { name: 'Dar bônus' })).not.toBeInTheDocument();
  });
});
