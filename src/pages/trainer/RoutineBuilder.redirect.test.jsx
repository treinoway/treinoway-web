import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { render } from '@testing-library/react';
import useRoutineBuilder from '../../hooks/useRoutineBuilder';
import useRoutineDraft from '../../hooks/useRoutineDraft';
import useProtocolDraft from '../../hooks/useProtocolDraft';
import useBisetCreate from '../../hooks/useBisetCreate';
import { useToast } from '../../contexts/ToastContext';
import RoutineBuilder from './RoutineBuilder';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7 }, loading: false }),
}));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../hooks/useRoutineBuilder');
vi.mock('../../hooks/useRoutineDraft', () => ({ default: vi.fn() }));
vi.mock('../../hooks/useProtocolDraft', () => ({ default: vi.fn() }));
vi.mock('../../hooks/useProtocolBuilder');
vi.mock('../../hooks/useBisetCreate');

// jsdom lacks IntersectionObserver; this no-op stands in.
const NoopIntersectionObserver = vi.fn(function Stub() { this.observe = vi.fn(); this.disconnect = vi.fn(); });

const HOOK_STATE = {
  loading: false,
  saving: false,
  error: null,
  data: {
    id: 'routine-123',
    name: 'Rotina Hipertrofia',
    type: '',
    trainingLevel: '',
    defaultDurationWeeks: '',
    genderOrdination: '',
    description: '',
    trainings: [{
      id: 'training-1',
      name: 'Peito & Tríceps',
      category: 'strength',
      weekDay: 'monday',
      exercises: [{ id: 'ex-1', name: 'Supino reto', type: 'strength', sets: 4, repetitions: { min: 8, max: 12 }, restInterval: 60, hasLoad: true }],
    }],
  },
  trainingTemplates: [],
  exerciseTemplates: [],
  updateMeta: vi.fn(),
  saveRoutine: vi.fn().mockResolvedValue({ id: 'routine-123' }),
  createTraining: vi.fn(),
  importTrainingsFromLibrary: vi.fn(),
  updateTraining: vi.fn(),
  updateTrainingWeekDay: vi.fn(),
  deleteTraining: vi.fn(),
  addExercise: vi.fn(),
  addExerciseFromTemplate: vi.fn(),
  updateExercise: vi.fn(),
  deleteExercise: vi.fn(),
  saveExerciseAsTemplate: vi.fn(),
};

// Exposes the landing path and onboarding hint after the redirect.
const LocationProbe = () => {
  const location = useLocation();
  return (
    <output aria-label="location">
      {location.pathname}
      {location.state?.justCompleted ? `|${location.state.justCompleted}` : ''}
    </output>
  );
};

// Renders the builder at the given route with a probe on every other route.
const renderAt = (route, path) => render(
  <MemoryRouter initialEntries={[route]}>
    <Routes>
      <Route path={path} element={<RoutineBuilder />} />
      <Route path="*" element={<LocationProbe />} />
    </Routes>
  </MemoryRouter>,
);

// Clicks the first save button and returns the landing probe.
const saveAndLand = async () => {
  await userEvent.setup().click(screen.getAllByRole('button', { name: /Salvar rotina/i })[0]);
  return screen.findByRole('status', { name: 'location' });
};

describe('RoutineBuilder redirect after saving a routine template', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    useRoutineBuilder.mockReturnValue({ ...HOOK_STATE });
    useRoutineDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
    useProtocolDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
    useToast.mockReturnValue({ showToast: vi.fn() });
    useBisetCreate.mockReturnValue({ createBiset: vi.fn(), dissolveBiset: vi.fn(), saving: false, error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('goes back to the routines list, without the onboarding hint, after editing an existing template', async () => {
    renderAt('/trainer/routines/routine-123/edit', '/trainer/routines/:id/edit');

    expect(await saveAndLand()).toHaveTextContent(/^\/trainer\/routines$/);
  });

  it('goes to the routines list when the cached status says the first routine already exists', async () => {
    localStorage.setItem('treinoway:onboardingStatus:7', JSON.stringify({
      onboarding: { firstProtocolCreated: true },
      brandingAllowed: false,
    }));
    renderAt('/trainer/routines/new', '/trainer/routines/new');

    expect(await saveAndLand()).toHaveTextContent(/^\/trainer\/routines$/);
  });
});
