import { describe, it, expect } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import BriefingStrip from './BriefingStrip';

const briefing = {
  activeStudents: 24,
  returningThisWeek: 2,
  stagnantProgress: 3,
  inactiveStudents: 5,
  overallAdherence: '87.40',
  adherenceDeltaPp: '-4.00',
  computedAt: '2026-05-15T22:00:00.000Z',
};

describe('BriefingStrip', () => {
  it('renders the four metrics with their support text', () => {
    render(<BriefingStrip briefing={briefing} loading={false} error={null} />);

    const tiles = within(screen.getByLabelText('Briefing de alunos')).getAllByRole('listitem');
    expect(tiles).toHaveLength(4);
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('-4pp vs mês ant.')).toBeInTheDocument();
    expect(screen.getByText('+2 esta semana')).toBeInTheDocument();
  });

  it('keeps the labels and hides the numbers while loading', () => {
    render(<BriefingStrip briefing={null} loading error={null} />);

    expect(screen.getByText('Alunos ativos')).toBeInTheDocument();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByText('24')).not.toBeInTheDocument();
  });

  it('shows only the error banner when the briefing failed', () => {
    render(<BriefingStrip briefing={null} loading={false} error="Não foi possível carregar o briefing" />);

    expect(screen.getByText('Não foi possível carregar o briefing')).toBeInTheDocument();
    expect(screen.queryByText('Alunos ativos')).not.toBeInTheDocument();
  });
});
