export const PROTOCOL_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

export function getStatusLabel(status) {
  switch (status?.toUpperCase()) {
    case 'ACTIVE': return 'Ativo';
    case 'COMPLETED': return 'Concluído';
    case 'CANCELLED': return 'Cancelado';
    default: return status ?? '—';
  }
}

export function getStatusBadgeClass(status) {
  switch (status?.toUpperCase()) {
    case 'ACTIVE': return 'badge badge-green';
    case 'COMPLETED': return 'badge badge-gray';
    case 'CANCELLED': return 'badge badge-red';
    default: return 'badge badge-gray';
  }
}
