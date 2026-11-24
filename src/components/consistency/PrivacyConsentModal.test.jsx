import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import PrivacyConsentModal from './PrivacyConsentModal';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { put: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const preview = { position: 8, faixa: 'constant', average: 92.6 };

const savedPrivacy = { appearAs: 'anonymous', termVersion: '2026-11-v1', acceptedAt: '2026-11-24T10:00:00.000Z' };

// Renders the consent with spies for the saved choice and the close
const renderModal = () => {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(<PrivacyConsentModal termVersion="2026-11-v1" studentName="Camila R." preview={preview} participantCount={19} onSaved={onSaved} onClose={onClose} />);
  return { onSaved, onClose };
};

describe('PrivacyConsentModal', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.put.mockReset();
  });

  it('APP-67 shows both options with none selected and confirms the choice', async () => {
    const user = userEvent.setup();
    api.put.mockResolvedValue({ data: savedPrivacy });
    const { onSaved } = renderModal();

    const dialog = screen.getByRole('dialog', { name: 'Como você quer aparecer no ranking do campeonato?' });
    expect(within(dialog).getByText('Este campeonato tem 19 participantes. É assim que eles vão ver você:')).toBeInTheDocument();
    const withName = within(dialog).getByRole('radio', { name: /Aparecer com meu nome/ });
    const anonymous = within(dialog).getByRole('radio', { name: /Aparecer como Aluno do time/ });
    expect(withName).not.toBeChecked();
    expect(anonymous).not.toBeChecked();
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar' });
    expect(confirm).toBeDisabled();

    const previewRow = within(dialog).getByRole('group', { name: 'Prévia' });
    expect(within(previewRow).getByText('8º')).toBeInTheDocument();
    expect(within(previewRow).getByText('Camila R.')).toBeInTheDocument();
    expect(within(previewRow).getByText('Constante')).toBeInTheDocument();
    expect(within(previewRow).getByText('93%')).toBeInTheDocument();

    await user.click(anonymous);
    expect(anonymous).toBeChecked();
    expect(withName).not.toBeChecked();
    expect(within(previewRow).getByText('Aluno do time')).toBeInTheDocument();
    expect(within(previewRow).queryByText('Camila R.')).not.toBeInTheDocument();
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(api.put).toHaveBeenCalledWith('/my/consistency-ranking/privacy', { appearAs: 'anonymous', termVersion: '2026-11-v1' });
    expect(onSaved).toHaveBeenCalledWith(savedPrivacy);
  });

  it('APP-67 keeps the choice and tells the error when saving fails', async () => {
    const user = userEvent.setup();
    api.put.mockRejectedValue({ userMessage: 'Não foi possível salvar.' });
    const { onSaved } = renderModal();

    await user.click(screen.getByRole('radio', { name: /Aparecer com meu nome/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(mockShowToast).toHaveBeenCalledWith('Não foi possível salvar.', 'error');
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Aparecer com meu nome/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled();
  });
});
