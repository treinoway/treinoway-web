// Shared fixtures for the advanced-techniques tests (service contract: item + ref shapes).

// Test helper: makeTechnique.
export const makeTechnique = (overrides = {}) => ({
  id: 'tech-drop',
  key: 'drop_set',
  name: 'Drop set',
  description: 'Na falha, reduz a carga e continua sem descanso.',
  videoUrl: null,
  gifUrl: null,
  isSystem: true,
  trainerId: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

export const DROP_SET = makeTechnique();
export const REST_PAUSE = makeTechnique({ id: 'tech-rest', key: 'rest_pause', name: 'Rest-pause', description: 'Pausa curta na falha.' });
export const CLUSTER_SET = makeTechnique({ id: 'tech-cluster', key: 'cluster_set', name: 'Cluster set', description: 'Blocos com pausas curtas.' });
export const OWN_TECHNIQUE = makeTechnique({
  id: 'tech-own',
  key: null,
  name: 'Tempo 3-1-3',
  description: 'Fase excêntrica de três segundos.',
  isSystem: false,
  trainerId: 'trainer-1',
});

// Response ref embedded in exercise payloads (service contract), ordered by `order`.
export const toRef = (technique, order) => ({
  id: technique.id,
  key: technique.key,
  name: technique.name,
  description: technique.description,
  videoUrl: technique.videoUrl,
  gifUrl: technique.gifUrl,
  order,
});

// Backend pagination envelope as axios would return it.
export const techniqueEnvelope = (data, total = data.length) => ({ data: { data, total, page: 1, limit: 20 } });
