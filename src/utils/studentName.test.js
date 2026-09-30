import { getStudentFirstName, getStudentFullName, getStudentInitials } from './studentName';

describe('studentName', () => {
  it('joins first and last name', () => {
    expect(getStudentFullName({ firstName: 'Maria', lastName: 'Silva', email: 'm@x.com' })).toBe('Maria Silva');
  });

  it('falls back to email and then to a generic label', () => {
    expect(getStudentFullName({ email: 'm@x.com' })).toBe('m@x.com');
    expect(getStudentFullName(null)).toBe('Aluno');
  });

  it('uses the first name, falling back to the full name', () => {
    expect(getStudentFirstName({ firstName: 'Maria', lastName: 'Silva' })).toBe('Maria');
    expect(getStudentFirstName({ email: 'm@x.com' })).toBe('m@x.com');
  });

  it('builds initials from the name, then the email', () => {
    expect(getStudentInitials({ firstName: 'maria', lastName: 'silva' })).toBe('MS');
    expect(getStudentInitials({ email: 'joao@x.com' })).toBe('J');
    expect(getStudentInitials(undefined)).toBe('?');
  });
});
