import { render, screen } from '../../test/test-utils';
import LinkStudentModal from './LinkStudentModal';
import ptBR from '../../i18n/locales/pt-BR';
import en from '../../i18n/locales/en';

const NEW_HINT =
  'Enviamos o convite por e-mail. Quem já tem conta aceita no app TeuFit; quem não tem recebe o link para baixar.';

describe('LinkStudentModal — invite hint after the service stopped linking at once', () => {
  it('explains that the invite goes by e-mail and is accepted in the TeuFit app', () => {
    render(<LinkStudentModal onClose={vi.fn()} onSubmit={vi.fn()} linking={false} />);

    expect(screen.getByText(NEW_HINT)).toBeInTheDocument();
  });

  it('no longer promises that an existing account is linked right away', () => {
    render(<LinkStudentModal onClose={vi.fn()} onSubmit={vi.fn()} linking={false} />);

    expect(screen.queryByText(/vinculado na hora/i)).not.toBeInTheDocument();
  });
});

describe('studentInvites.linkHint locale text', () => {
  it('pt-BR holds the exact new hint', () => {
    expect(ptBR.studentInvites.linkHint).toBe(NEW_HINT);
  });

  it('en no longer promises an immediate link', () => {
    expect(en.studentInvites.linkHint).not.toMatch(/right away|immediately|instantly|at once/i);
  });

  it('en says the invite is e-mailed and accepted in the TeuFit app', () => {
    expect(en.studentInvites.linkHint).toMatch(/email/i);
    expect(en.studentInvites.linkHint).toMatch(/accept[^.]*\bapp\b/i);
  });
});
