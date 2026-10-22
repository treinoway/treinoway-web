import { ANAMNESIS_FILLED_BY, ANAMNESIS_RESPONSE_STATUS } from '../constants/anamnesis';
import { formatDateTimeForDisplay } from './dateFormat';

const PENDING_LABEL = 'Pendente';
const DRAFT_LABEL = 'Em preenchimento';
const AWAITING_FALLBACK_LABEL = 'Aguardando confirmação';
const SUBMITTED_LABEL = 'Respondida';
const TRAINER_FILLED_HINT = 'Preenchida por você';

const STATUS_ORDER = {
  pending: 0,
  [ANAMNESIS_RESPONSE_STATUS.DRAFT]: 1,
  [ANAMNESIS_RESPONSE_STATUS.AWAITING_CONFIRMATION]: 2,
  [ANAMNESIS_RESPONSE_STATUS.SUBMITTED]: 3,
};

const formatAnswerCount = (count) => {
  if (!Number.isFinite(count)) return null;
  return count === 1 ? '1 resposta' : `${count} respostas`;
};

/** Appends "em dd/mm/aaaa" so a date never shows up without saying what happened on it. */
const withDate = (hint, dateValue) => (dateValue ? `${hint} em ${formatDateTimeForDisplay(dateValue)}` : hint);

const BUILDERS = {
  [ANAMNESIS_RESPONSE_STATUS.DRAFT]: (response) => ({
    label: DRAFT_LABEL,
    badgeClass: 'badge-gray',
    detail: formatAnswerCount(response.answeredCount),
  }),
  [ANAMNESIS_RESPONSE_STATUS.AWAITING_CONFIRMATION]: (response) => ({
    label: response.statusLabel || AWAITING_FALLBACK_LABEL,
    badgeClass: 'badge-blue',
    detail: response.filledBy === ANAMNESIS_FILLED_BY.TRAINER ? withDate(TRAINER_FILLED_HINT, response.submittedAt) : null,
  }),
  [ANAMNESIS_RESPONSE_STATUS.SUBMITTED]: (response) => ({
    label: SUBMITTED_LABEL,
    badgeClass: 'badge-green',
    detail: response.submittedAt ? withDate(SUBMITTED_LABEL, response.submittedAt) : null,
  }),
};

/**
 * Badge label/class and secondary text for a trainer-side anamnesis link.
 * A missing `response` (null, or an older backend without the field) is pending.
 */
export const getLinkStatusInfo = (link) => {
  const response = link?.response ?? null;
  if (!response) return { key: 'pending', label: PENDING_LABEL, badgeClass: 'badge-yellow', detail: null };
  const build = BUILDERS[response.status];
  if (!build) {
    return { key: response.status, label: response.statusLabel || PENDING_LABEL, badgeClass: 'badge-gray', detail: null };
  }
  return { key: response.status, ...build(response) };
};

/** Old backends do not send `canFill`; keep filling allowed for them. */
export const canFillLink = (link) => link?.canFill !== false;

/** Old backends do not send `response`; keep offering the responses for them. `null` means pending. */
export const canViewLinkResponses = (link) => {
  if (link?.response === undefined) return true;
  return Boolean(link.response?.submittedAt);
};

/** Pending first, then draft, awaiting confirmation and submitted; stable inside each group. */
export const sortLinksByResponseStatus = (links) =>
  links
    .map((link, index) => ({ link, index, rank: STATUS_ORDER[getLinkStatusInfo(link).key] ?? STATUS_ORDER.pending }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ link }) => link);
