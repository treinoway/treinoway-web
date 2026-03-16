export const SERVICE_MODE_LABELS = {
  online: 'Online',
  in_person: 'Presencial',
  hybrid: 'Híbrido',
};

export const getServiceModeLabel = (mode) => SERVICE_MODE_LABELS[mode] ?? null;
