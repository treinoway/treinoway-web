export const PROTOCOL_STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo' },
  { value: 'completed', label: 'Concluído' },
  { value: 'archived', label: 'Arquivado' },
];

export function getStatusLabel(status) {
  switch (status?.toLowerCase()) {
    case 'active': return 'Ativo';
    case 'completed': return 'Concluído';
    case 'archived': return 'Arquivado';
    default: return status ?? '—';
  }
}

export function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case 'active': return 'badge badge-green';
    case 'completed': return 'badge badge-gray';
    case 'archived': return 'badge badge-red';
    default: return 'badge badge-gray';
  }
}
