import { challengeTagOf, filterParticipantsByName, pointsKpisOf } from './challengeDisplay';

const TODAY = '2026-09-30';

describe('challengeDisplay', () => {
  it('CPD-62 tags Em andamento, Último dia, Começa amanhã, Agendado, Encerrado and Cancelado by date', () => {
    expect(challengeTagOf({ status: 'active', startDate: '2026-09-01', endDate: '2026-10-04' }, TODAY))
      .toEqual({ label: 'Em andamento', tone: 'brand' });
    expect(challengeTagOf({ status: 'active', startDate: '2026-09-17', endDate: '2026-09-30' }, TODAY))
      .toEqual({ label: 'Último dia', tone: 'warning' });
    expect(challengeTagOf({ status: 'scheduled', startDate: '2026-10-01', endDate: '2026-10-07' }, TODAY))
      .toEqual({ label: 'Começa amanhã', tone: 'neutral' });
    expect(challengeTagOf({ status: 'scheduled', startDate: '2026-10-05', endDate: '2026-10-11' }, TODAY))
      .toEqual({ label: 'Agendado', tone: 'neutral' });
    expect(challengeTagOf({ status: 'completed', startDate: '2026-08-01', endDate: '2026-08-31' }, TODAY))
      .toEqual({ label: 'Encerrado', tone: 'success' });
    expect(challengeTagOf({ status: 'cancelled', startDate: '2026-07-01', endDate: '2026-07-14' }, TODAY))
      .toEqual({ label: 'Cancelado', tone: 'error' });
  });

  it('CPD-46 tags a closed championship Concluído in the detail', () => {
    const closed = { status: 'completed', startDate: '2026-08-01', endDate: '2026-08-31' };
    expect(challengeTagOf(closed, TODAY, { detail: true })).toEqual({ label: 'Concluído', tone: 'brand' });
    expect(challengeTagOf({ status: 'active', startDate: '2026-09-01', endDate: '2026-10-04' }, TODAY, { detail: true }))
      .toEqual({ label: 'Ativo', tone: 'success' });
    expect(challengeTagOf({ status: 'active', startDate: '2026-09-17', endDate: '2026-09-30' }, TODAY, { detail: true }))
      .toEqual({ label: 'Ativo', tone: 'success' });
    expect(challengeTagOf({ status: 'cancelled', startDate: '2026-07-01', endDate: '2026-07-14' }, TODAY, { detail: true }))
      .toEqual({ label: 'Cancelado', tone: 'error' });
  });

  it('CPD-35 filters participants by name ignoring case and accents', () => {
    const rows = [
      { studentId: '1', name: 'Ana Júlia Souza', displayName: 'Ana S.' },
      { studentId: '2', name: 'JOÃO Pedro', displayName: 'JOÃO P.' },
      { studentId: '3', firstName: 'Lúcia', lastName: 'Ferraz' },
      { studentId: '4', name: 'Marcos Silva', displayName: 'Marcos S.' },
      { studentId: '5', name: 'Ana Lima', displayName: 'Ana L.' },
    ];
    expect(filterParticipantsByName(rows, 'julia').map((row) => row.studentId)).toEqual(['1']);
    expect(filterParticipantsByName(rows, 'joao').map((row) => row.studentId)).toEqual(['2']);
    expect(filterParticipantsByName(rows, 'LUCIA FER').map((row) => row.studentId)).toEqual(['3']);
    expect(filterParticipantsByName(rows, 'silva').map((row) => row.studentId)).toEqual(['4']);
    expect(filterParticipantsByName(rows, 'Lima').map((row) => row.studentId)).toEqual(['5']);
    expect(filterParticipantsByName(rows, 'ana l.').map((row) => row.studentId)).toEqual(['5']);
    expect(filterParticipantsByName(rows, 'zzz')).toEqual([]);
    expect(filterParticipantsByName(rows, '  ')).toEqual(rows);
  });

  it('CPD-38 sums the XP cards from the ranking entries', () => {
    const entries = [
      { position: 1, studentId: 'a', points: 320, workouts: 9, bonusPoints: 50, pointsThisWeek: 40 },
      { position: 2, studentId: 'b', points: 275, workouts: 8, bonusPoints: 0, pointsThisWeek: 0 },
      { position: 3, studentId: 'c', points: 120, workouts: 4, bonusPoints: 20, pointsThisWeek: 15 },
    ];
    expect(pointsKpisOf(entries)).toEqual({
      participants: 3,
      scoredThisWeek: 2,
      leaderPoints: 320,
      leaderLead: 45,
      workouts: 21,
      bonusPoints: 70,
      bonusStudents: 2,
    });
    expect(pointsKpisOf([entries[0]])).toMatchObject({ participants: 1, leaderPoints: 320, leaderLead: null });
    expect(pointsKpisOf([])).toEqual({
      participants: 0, scoredThisWeek: 0, leaderPoints: null, leaderLead: null, workouts: 0, bonusPoints: 0, bonusStudents: 0,
    });
  });
});
