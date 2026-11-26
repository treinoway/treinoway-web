export const WEEK_STARTS = [
  '2026-10-05',
  '2026-10-12',
  '2026-10-19',
  '2026-10-26',
  '2026-11-02',
  '2026-11-09',
  '2026-11-16',
  '2026-11-23',
];

export const WEEK_LABELS = ['05/10', '12/10', '19/10', '26/10', '02/11', '09/11', '16/11', '23/11'];

export const TIERS = ['FREE', 'PRO', 'PLATINUM', 'DIAMOND', 'BETA'];

// Overview payload of GET /admin/manager/overview with distinctive numbers; `overrides` replaces top-level keys.
export const buildOverview = (overrides = {}) => ({
  period: '30d',
  generatedAt: '2026-11-24T12:00:00.000Z',
  range: { from: '2026-10-25T12:00:00.000Z', to: '2026-11-24T12:00:00.000Z' },
  previousRange: { from: '2026-09-25T12:00:00.000Z', to: '2026-10-25T12:00:00.000Z' },
  kpis: {
    newTrainers: { current: 18, previous: 12 },
    newStudents: { current: 47, previous: 50 },
    activeTrainers: { current: 9, previous: 9 },
    completedSessions: { current: 312, previous: 280 },
  },
  weeklySignups: WEEK_STARTS.map((weekStart, index) => ({ weekStart, trainers: index + 1, students: index + 4 })),
  ai: {
    month: '2026-11',
    inputTokens: 200,
    outputTokens: 100,
    cacheReadTokens: 600,
    cacheWriteTokens: 50,
    totalTokens: 950,
    interactions: 37,
    trainers: 23,
    estimatedCostUsd: 12.34,
    costComplete: true,
    topTrainers: [
      { trainerId: 't-1', firstName: 'Carla', lastName: 'Mendes', email: 'carla@example.com', tier: 'PRO', totalTokens: 600, estimatedCostUsd: 8.1 },
      { trainerId: 't-2', firstName: null, lastName: null, email: 'diego@example.com', tier: 'BETA', totalTokens: 350, estimatedCostUsd: 4.24 },
    ],
  },
  plans: [
    { tier: 'FREE', count: 20 },
    { tier: 'PRO', count: 10 },
    { tier: 'PLATINUM', count: 5 },
    { tier: 'DIAMOND', count: 0 },
    { tier: 'BETA', count: 15 },
  ],
  pending: { pendingInvites: 4, newFeedbacks: 2, trainersWithoutStudents: 3 },
  latestTrainers: [
    { userId: 'u-7', firstName: 'Bruno', lastName: 'Costa', email: 'bruno@example.com', tier: 'FREE', studentCount: 0, createdAt: '2026-11-20T15:00:00.000Z' },
    { userId: 'u-8', firstName: null, lastName: null, email: 'elisa@example.com', tier: 'BETA', studentCount: 3, createdAt: '2026-11-18T15:00:00.000Z' },
  ],
  ...overrides,
});

// Overview payload where every counter is zero and every list is empty except the fixed 8 weeks and 5 tiers.
export const buildZeroOverview = () => ({
  ...buildOverview(),
  kpis: {
    newTrainers: { current: 0, previous: 0 },
    newStudents: { current: 0, previous: 0 },
    activeTrainers: { current: 0, previous: 0 },
    completedSessions: { current: 0, previous: 0 },
  },
  weeklySignups: WEEK_STARTS.map((weekStart) => ({ weekStart, trainers: 0, students: 0 })),
  ai: {
    month: '2026-11',
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 0,
    interactions: 0,
    trainers: 0,
    estimatedCostUsd: 0,
    costComplete: true,
    topTrainers: [],
  },
  plans: TIERS.map((tier) => ({ tier, count: 0 })),
  pending: { pendingInvites: 0, newFeedbacks: 0, trainersWithoutStudents: 0 },
  latestTrainers: [],
});
