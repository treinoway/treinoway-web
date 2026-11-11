// Shared builders for the nutritionist screens: shapes follow the epic's "Planned contract".

export const PATIENT_ID = 'patient-1';
export const PLAN_ID = 'plan-1';

// Builds a Nutrients object (grams except kcal).
export const nutrients = (kcal = 0, protein = 0, carbs = 0, fat = 0, fiber = 0) => ({
  kcal, protein, carbs, fat, fiber,
});

// Builds a Substitute from the contract.
export const buildSubstitute = (overrides = {}) => ({
  id: 'sub-1',
  foodId: 'food-patinho',
  name: 'Patinho grelhado',
  source: 'taco',
  householdMeasure: '1 filé pequeno',
  quantity: 106.96,
  nutrients: nutrients(180, 38.4, 0, 3, 0),
  ...overrides,
});

// Builds an Item from the contract (quantity 100 g of a 100 kcal / 10 g protein food by default).
export const buildItem = (overrides = {}) => ({
  id: 'item-1',
  foodId: 'food-cuscuz',
  name: 'Cuscuz de milho cozido',
  source: 'taco',
  householdMeasure: '1 fatia média',
  quantity: 100,
  unit: 'g',
  per100g: nutrients(100, 10, 20, 1, 2),
  nutrients: nutrients(100, 10, 20, 1, 2),
  swapBasis: 'protein',
  substitutes: [],
  order: 1,
  ...overrides,
});

// Builds an Option from the contract.
export const buildOption = (overrides = {}) => ({
  id: 'opt-1',
  position: 1,
  items: [buildItem()],
  totals: nutrients(100, 10, 20, 1, 2),
  ...overrides,
});

// Builds a Meal from the contract.
export const buildMeal = (overrides = {}) => ({
  id: 'meal-1',
  name: 'Café da manhã',
  time: '07:00',
  order: 1,
  tip: null,
  options: [buildOption()],
  ...overrides,
});

// Test helper: build goals.
export const buildGoals = (overrides = {}) => ({
  bmrFormula: 'mifflin',
  activityFactor: 1.2,
  activities: [
    { name: 'Musculação', met: 5, minutes: 60, perWeek: 4, included: true, fromTraining: true },
    { name: 'Caminhada', met: 3.5, minutes: 40, perWeek: 3, included: true, fromTraining: false },
  ],
  objective: 'deficit_20',
  kcalTarget: 1550,
  proteinPerKg: 1.8,
  fatPerKg: 0.8,
  carbPerKg: null,
  carbIsRemainder: true,
  fiberMinG: 25,
  ...overrides,
});

// Test helper: build guidance.
export const buildGuidance = (overrides = {}) => ({
  waterTargetMl: 2500,
  freeMealsPerWeek: 1,
  freeMealText: 'De preferência no fim de semana.',
  supplements: [{ name: 'Whey protein concentrado', dose: '30 g', when: 'Depois do treino' }],
  observations: 'Mantém intervalos de 3 a 4 horas entre as refeições.',
  patientMessage: 'Bora pra semana!',
  ...overrides,
});

// Test helper: build macros.
export const buildMacros = (overrides = {}) => ({
  protein: { grams: 118.8, kcal: 475.2, pct: 30.66 },
  carbs: { grams: 149.9, kcal: 599.6, pct: 38.68 },
  fat: { grams: 52.8, kcal: 475.2, pct: 30.66 },
  totalKcal: 1550,
  diffKcal: 0,
  ...overrides,
});

// Two meals (breakfast 100 kcal + lunch 300 kcal) so the day total is 400 kcal.
export const buildPlan = (overrides = {}) => ({
  id: PLAN_ID,
  patientId: PATIENT_ID,
  status: 'draft',
  version: 1,
  publishedAt: null,
  hasUnpublishedChanges: false,
  goals: buildGoals({ kcalTarget: 400 }),
  guidance: buildGuidance(),
  meals: [
    buildMeal(),
    buildMeal({
      id: 'meal-2',
      name: 'Almoço',
      time: '12:30',
      order: 2,
      options: [
        buildOption({
          id: 'opt-2',
          items: [
            buildItem({
              id: 'item-2',
              foodId: 'food-arroz',
              name: 'Arroz integral cozido',
              householdMeasure: '4 col. de sopa',
              quantity: 300,
              per100g: nutrients(100, 5, 20, 1, 2),
              nutrients: nutrients(300, 15, 60, 3, 6),
            }),
          ],
          totals: nutrients(300, 15, 60, 3, 6),
        }),
      ],
    }),
  ],
  computed: {
    bmr: 1385.25,
    tee: 1916.87,
    suggestedKcal: 1533.5,
    macros: buildMacros({
      protein: { grams: 40, kcal: 160, pct: 40 },
      carbs: { grams: 80, kcal: 320, pct: 80 },
      fat: { grams: 4, kcal: 36, pct: 9 },
      totalKcal: 400,
      diffKcal: 0,
    }),
    dayTotals: nutrients(400, 25, 80, 4, 8),
    dayStatus: { kcal: 'ok', protein: 'low', carbs: 'ok', fat: 'ok', fiber: 'low' },
  },
  ...overrides,
});

// Test helper: build patient row.
export const buildPatientRow = (overrides = {}) => ({
  id: PATIENT_ID,
  firstName: 'Luiza',
  lastName: 'Andrade',
  email: 'luiza@example.com',
  avatarUrl: null,
  age: 29,
  weightKg: 66,
  objective: 'deficit_20',
  plan: { id: PLAN_ID, status: 'published', publishedAt: '2026-10-20T12:00:00.000Z', hasUnpublishedChanges: false },
  adherence7d: { done: 23, expected: 28, percent: 82 },
  linkedAt: '2026-09-01T12:00:00.000Z',
  ...overrides,
});

// Test helper: build invite.
export const buildInvite = (overrides = {}) => ({
  id: 'inv-1',
  email: 'maria@example.com',
  status: 'pending',
  expiresAt: '2026-11-20T12:00:00.000Z',
  lastSentAt: '2026-11-01T12:00:00.000Z',
  sendCount: 1,
  createdAt: '2026-11-01T12:00:00.000Z',
  ...overrides,
});

// Test helper: build sheet.
export const buildSheet = (overrides = {}) => ({
  sex: 'female',
  birthDate: '1997-03-10',
  age: 29,
  weightKg: 66,
  heightCm: 165,
  bodyFatPct: 28,
  leanMassKg: 47.52,
  assessedAt: '2026-10-12',
  ...overrides,
});

// Test helper: build overview.
export const buildOverview = (overrides = {}) => ({
  patient: buildPatientRow(),
  trainer: { id: 'trainer-1', firstName: 'José', lastName: 'Teste', avatarUrl: null },
  adherence7d: {
    mealsDone: 23,
    mealsExpected: 28,
    percent: 82,
    swaps: { total: 6, topPair: { from: 'frango', to: 'patinho' } },
    ateDifferent: { total: 3, topMealName: 'Lanche da tarde' },
  },
  ...overrides,
});

// Test helper: build food.
export const buildFood = (overrides = {}) => ({
  id: 'food-1',
  name: 'Cuscuz de milho cozido',
  source: 'taco',
  groupId: 'g-cereais',
  groupName: 'Cereais e tubérculos',
  portion: { label: '1 fatia média', grams: 100 },
  per100g: nutrients(113, 2.2, 25.3, 0.7, 2.1),
  ...overrides,
});

// Test helper: build food groups.
export const buildFoodGroups = () => ({
  items: [
    { id: 'g-cereais', name: 'Cereais e tubérculos', code: 'cereais' },
    { id: 'g-carnes', name: 'Carnes e ovos', code: 'carnes' },
  ],
});
