import api from './axios';

// All nutritionist endpoints live here so contract changes stay in one file.

const BASE = '/nutritionist';
const FOOD_SOURCES = 'taco,tbca,custom';
const FOOD_SEARCH_LIMIT = 20;
const MY_FOODS_LIMIT = 100;

// Unwraps the response body.
const data = (response) => response.data;

// Path of a patient resource.
const patientPath = (patientId, suffix = '') => `${BASE}/patients/${patientId}${suffix}`;

// GET /nutritionist/patients → { items }
export const listPatients = () => api.get(`${BASE}/patients`).then(data);

// DELETE /nutritionist/patients/:id (soft unlink)
export const unlinkPatient = (patientId) => api.delete(patientPath(patientId));

// POST /nutritionist/patient-invites → { outcome: 'invited', invite } ('linked' kept for compatibility)
export const inviteByEmail = (email) => api.post(`${BASE}/patient-invites`, { email }).then(data);

// GET /nutritionist/patient-invites?status=<status> → { items }
const listInvitesByStatus = (status) => api.get(`${BASE}/patient-invites`, { params: { status } }).then(data);

// Open invites for the Convites tab: pending and declined (two calls), newest first.
export const listPendingInvites = async () => {
  const [pending, declined] = await Promise.all([listInvitesByStatus('pending'), listInvitesByStatus('declined')]);
  const byId = new Map([...pending.items, ...declined.items].map((invite) => [invite.id, invite]));
  const items = [...byId.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return { items };
};

// POST /nutritionist/patient-invites/:id/resend → Invite
export const resendInvite = (inviteId) => api.post(`${BASE}/patient-invites/${inviteId}/resend`).then(data);

// DELETE /nutritionist/patient-invites/:id
export const revokeInvite = (inviteId) => api.delete(`${BASE}/patient-invites/${inviteId}`);

// GET /nutritionist/patients/:id/sheet
export const getSheet = (patientId) => api.get(patientPath(patientId, '/sheet')).then(data);

// PUT /nutritionist/patients/:id/sheet (replaces the whole sheet)
export const saveSheet = (patientId, sheet) => api.put(patientPath(patientId, '/sheet'), sheet).then(data);

// GET /nutritionist/patients/:id/overview
export const getOverview = (patientId) => api.get(patientPath(patientId, '/overview')).then(data);

// GET /nutritionist/patients/:id/plan (creates the draft on first call)
export const getPlan = (patientId) => api.get(patientPath(patientId, '/plan')).then(data);

// PATCH /nutritionist/plans/:id/goals → Plan
export const patchGoals = (planId, goals) => api.patch(`${BASE}/plans/${planId}/goals`, goals).then(data);

// PATCH /nutritionist/plans/:id/guidance → Plan
export const patchGuidance = (planId, guidance) => api.patch(`${BASE}/plans/${planId}/guidance`, guidance).then(data);

// POST /nutritionist/plans/:id/publish → Plan
export const publishPlan = (planId) => api.post(`${BASE}/plans/${planId}/publish`).then(data);

// POST /nutritionist/plans/:id/meals → Plan
export const addMeal = (planId, meal) => api.post(`${BASE}/plans/${planId}/meals`, meal).then(data);

// PATCH /nutritionist/meals/:id → Plan
export const patchMeal = (mealId, changes) => api.patch(`${BASE}/meals/${mealId}`, changes).then(data);

// DELETE /nutritionist/meals/:id → Plan
export const deleteMeal = (mealId) => api.delete(`${BASE}/meals/${mealId}`).then(data);

// PUT /nutritionist/plans/:id/meals/order → Plan (full id list)
export const reorderMeals = (planId, mealIds) => api.put(`${BASE}/plans/${planId}/meals/order`, { mealIds }).then(data);

// DELETE /nutritionist/meal-options/:id → Plan (position 1 cannot be deleted)
export const deleteOption = (optionId) => api.delete(`${BASE}/meal-options/${optionId}`).then(data);

// POST /nutritionist/meals/:id/options → Plan (copies option 1)
export const addOption = (mealId) => api.post(`${BASE}/meals/${mealId}/options`).then(data);

// POST /nutritionist/meal-options/:id/items → Plan
export const addItem = (optionId, item) => api.post(`${BASE}/meal-options/${optionId}/items`, item).then(data);

// PATCH /nutritionist/items/:id → Plan (quantity, swapBasis, …)
export const patchItem = (itemId, changes) => api.patch(`${BASE}/items/${itemId}`, changes).then(data);

// DELETE /nutritionist/items/:id → Plan
export const deleteItem = (itemId) => api.delete(`${BASE}/items/${itemId}`).then(data);

// POST /nutritionist/items/:id/substitutes → Plan
export const addSubstitute = (itemId, foodId) => api.post(`${BASE}/items/${itemId}/substitutes`, { foodId }).then(data);

// DELETE /nutritionist/substitutes/:id → Plan
export const deleteSubstitute = (substituteId) => api.delete(`${BASE}/substitutes/${substituteId}`).then(data);

// GET /food-groups → { items }
export const listFoodGroups = () => api.get('/food-groups').then(data);

// GET /foods → { items }; `sources` defaults to every source.
export const searchFoods = ({ q, groupId, sources = FOOD_SOURCES, limit = FOOD_SEARCH_LIMIT }) => {
  const params = { sources, limit };
  if (q) params.q = q;
  if (groupId) params.groupId = groupId;
  return api.get('/foods', { params }).then(data);
};

// GET /foods restricted to the nutritionist own foods.
export const listMyFoods = () => searchFoods({ sources: 'custom', limit: MY_FOODS_LIMIT });

// POST /nutritionist/foods → Food
export const createMyFood = (food) => api.post(`${BASE}/foods`, food).then(data);

// PATCH /nutritionist/foods/:id → Food
export const updateMyFood = (foodId, food) => api.patch(`${BASE}/foods/${foodId}`, food).then(data);

// DELETE /nutritionist/foods/:id
export const deleteMyFood = (foodId) => api.delete(`${BASE}/foods/${foodId}`);

// PATCH /become-nutritionist (no body) → new tokens
export const becomeNutritionist = () => api.patch('/become-nutritionist').then(data);
