import {
  canFillLink,
  canViewLinkResponses,
  getLinkStatusInfo,
  sortLinksByResponseStatus,
} from './anamnesisLinkStatus';
import { buildAnamnesisLink, linkResponses } from '../test/anamnesisLinkFixtures';

const localDate = (value) => new Date(value).toLocaleDateString('pt-BR');
const link = (response, extra = {}) => buildAnamnesisLink({ id: 'a', title: 'A', response, ...extra });

describe('getLinkStatusInfo', () => {
  it('is pending without a response, including when the field is missing', () => {
    expect(getLinkStatusInfo(link(null))).toMatchObject({ key: 'pending', label: 'Pendente', badgeClass: 'badge-yellow', detail: null });
    expect(getLinkStatusInfo(buildAnamnesisLink({ id: 'a', title: 'A' })).label).toBe('Pendente');
    expect(getLinkStatusInfo(undefined).label).toBe('Pendente');
  });

  it('describes a draft with its answer count', () => {
    expect(getLinkStatusInfo(link(linkResponses.draft))).toMatchObject({
      key: 'draft',
      label: 'Em preenchimento',
      badgeClass: 'badge-gray',
      detail: '4 respostas',
    });
  });

  it('pluralizes the answer count and omits it when unknown', () => {
    expect(getLinkStatusInfo(link({ ...linkResponses.draft, answeredCount: 1 })).detail).toBe('1 resposta');
    expect(getLinkStatusInfo(link({ ...linkResponses.draft, answeredCount: 0 })).detail).toBe('0 respostas');
    expect(getLinkStatusInfo(link({ ...linkResponses.draft, answeredCount: undefined })).detail).toBeNull();
  });

  it('uses the API label for awaiting confirmation and hints, with the date, when the trainer filled it', () => {
    expect(getLinkStatusInfo(link(linkResponses.awaitingByTrainer))).toMatchObject({
      label: 'Aguardando confirmação',
      badgeClass: 'badge-blue',
      detail: `Preenchida por você em ${localDate(linkResponses.awaitingByTrainer.submittedAt)}`,
    });
    expect(getLinkStatusInfo(link({ ...linkResponses.awaitingByTrainer, submittedAt: null })).detail).toBe('Preenchida por você');
    expect(getLinkStatusInfo(link({ ...linkResponses.awaitingByTrainer, statusLabel: 'Waiting' })).label).toBe('Waiting');
    expect(getLinkStatusInfo(link({ ...linkResponses.awaitingByTrainer, statusLabel: undefined })).label).toBe('Aguardando confirmação');
    expect(getLinkStatusInfo(link({ ...linkResponses.awaitingByTrainer, filledBy: 'student' })).detail).toBeNull();
  });

  it('describes a submitted response with a labelled local submission date', () => {
    const info = getLinkStatusInfo(link(linkResponses.submitted));
    expect(info).toMatchObject({ key: 'submitted', label: 'Respondida', badgeClass: 'badge-green' });
    expect(info.detail).toBe(`Respondida em ${localDate(linkResponses.submitted.submittedAt)}`);
    expect(getLinkStatusInfo(link({ ...linkResponses.submitted, submittedAt: null })).detail).toBeNull();
  });

  it('falls back to the API label for an unknown status', () => {
    expect(getLinkStatusInfo(link({ status: 'archived', statusLabel: 'Arquivada' }))).toMatchObject({
      label: 'Arquivada',
      badgeClass: 'badge-gray',
    });
  });
});

describe('canFillLink / canViewLinkResponses', () => {
  it('allows filling unless the backend says otherwise', () => {
    expect(canFillLink(link(null, { canFill: true }))).toBe(true);
    expect(canFillLink(link(null, { canFill: false }))).toBe(false);
    expect(canFillLink(link(null))).toBe(true);
  });

  it('allows viewing responses only after a submission', () => {
    expect(canViewLinkResponses(link(linkResponses.submitted))).toBe(true);
    expect(canViewLinkResponses(link(linkResponses.awaitingByTrainer))).toBe(true);
    expect(canViewLinkResponses(link(linkResponses.draft))).toBe(false);
    expect(canViewLinkResponses(link(null))).toBe(false);
  });

  it('keeps offering the responses when the backend does not send the response field', () => {
    expect(canViewLinkResponses(buildAnamnesisLink({ id: 'a', title: 'A' }))).toBe(true);
    expect(canViewLinkResponses(undefined)).toBe(true);
  });
});

describe('sortLinksByResponseStatus', () => {
  const titled = (title, response) => buildAnamnesisLink({ id: title, title, response });

  it('orders pending, draft, awaiting, submitted and is stable within a group', () => {
    const sorted = sortLinksByResponseStatus([
      titled('sub', linkResponses.submitted),
      titled('pend1', null),
      titled('await', linkResponses.awaitingByTrainer),
      titled('draft', linkResponses.draft),
      titled('pend2', null),
    ]);
    expect(sorted.map((item) => item.anamnesis.title)).toEqual(['pend1', 'pend2', 'draft', 'await', 'sub']);
  });

  it('does not mutate the input and treats missing fields as pending', () => {
    const input = [titled('sub', linkResponses.submitted), buildAnamnesisLink({ id: 'old', title: 'old' })];
    expect(sortLinksByResponseStatus(input).map((item) => item.anamnesis.title)).toEqual(['old', 'sub']);
    expect(input[0].anamnesis.title).toBe('sub');
  });
});
