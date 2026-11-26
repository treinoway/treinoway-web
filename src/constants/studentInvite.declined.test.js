import {
  StudentInviteStatus,
  STUDENT_INVITE_BADGE_TONE,
  STUDENT_INVITE_FILTER_ALL,
  STUDENT_INVITE_STATUS_FILTERS,
} from './studentInvite';
import ptBR from '../i18n/locales/pt-BR';
import en from '../i18n/locales/en';

describe('studentInvite constants — declined status', () => {
  it('exposes the declined status value sent by the service', () => {
    expect(StudentInviteStatus.DECLINED).toBe('declined');
  });

  it('adds declined to the status filters, keeping the existing ones and "all" first', () => {
    expect(STUDENT_INVITE_STATUS_FILTERS).toContain('declined');
    expect(STUDENT_INVITE_STATUS_FILTERS).toHaveLength(6);
    expect(STUDENT_INVITE_STATUS_FILTERS[0]).toBe(STUDENT_INVITE_FILTER_ALL);
    expect(STUDENT_INVITE_STATUS_FILTERS).toEqual(
      expect.arrayContaining(['all', 'pending', 'accepted', 'declined', 'expired', 'revoked']),
    );
  });

  it('gives declined the warning badge tone, as the nutrition invite row does', () => {
    expect(STUDENT_INVITE_BADGE_TONE.declined).toBe('warning');
  });
});

describe('studentInvites locale — declined labels', () => {
  it('pt-BR labels the filter "Recusados" and the status "Recusado"', () => {
    expect(ptBR.studentInvites.filter_declined).toBe('Recusados');
    expect(ptBR.studentInvites.status_declined).toBe('Recusado');
  });

  it('en labels both the filter and the status "Declined"', () => {
    expect(en.studentInvites.filter_declined).toBe('Declined');
    expect(en.studentInvites.status_declined).toBe('Declined');
  });
});
