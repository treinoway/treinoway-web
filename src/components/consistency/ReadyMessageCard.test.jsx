import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import ReadyMessageCard from './ReadyMessageCard';

const CARDIO_MESSAGE = 'Oi, João! Vi que o cardio tá difícil de encaixar nessas últimas semanas. Bora ajustar pra caber na tua rotina? Me conta como tá sendo.';

// Renders the card with a logging spy that resolves
const renderCard = (props = {}) => {
  const onContact = vi.fn().mockResolvedValue(undefined);
  render(<ReadyMessageCard firstName="João" pillar="cardio" whatsapp="+55 (11) 99999-8888" onContact={onContact} {...props} />);
  return { onContact };
};

describe('ReadyMessageCard', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('PAN-23 fills the template of the weakest pillar with the first name', () => {
    renderCard();

    expect(screen.getByText('Mensagem pronta · pilar mais fraco: Cardio')).toBeInTheDocument();
    expect(screen.getByText(CARDIO_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/\{nome\}/)).not.toBeInTheDocument();
  });

  it('PAN-23 uses the template of each pillar', () => {
    renderCard({ pillar: 'feedback' });

    expect(screen.getByText('Mensagem pronta · pilar mais fraco: Feedback')).toBeInTheDocument();
    expect(screen.getByText('Oi, João! Senti falta do teu check-in. Me manda como foi a semana, mesmo que curtinho?')).toBeInTheDocument();
  });

  it('shows nothing when the student has no weakest pillar', () => {
    renderCard({ pillar: null });
    expect(screen.queryByRole('button', { name: 'Abrir no WhatsApp' })).not.toBeInTheDocument();
  });

  it('PAN-24 makes the message editable', async () => {
    const user = userEvent.setup();
    renderCard();

    expect(screen.queryByRole('textbox', { name: 'Mensagem' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Editar' }));

    const field = screen.getByRole('textbox', { name: 'Mensagem' });
    expect(field).toHaveValue(CARDIO_MESSAGE);
    await user.clear(field);
    await user.type(field, 'Oi, João! Posso ajustar teu cardio?');
    expect(field).toHaveValue('Oi, João! Posso ajustar teu cardio?');

    await user.click(screen.getByRole('button', { name: 'Concluir edição' }));
    expect(screen.queryByRole('textbox', { name: 'Mensagem' })).not.toBeInTheDocument();
    expect(screen.getByText('Oi, João! Posso ajustar teu cardio?')).toBeInTheDocument();
  });

  it('PAN-25 opens WhatsApp with the message for the student number and logs the contact', async () => {
    const user = userEvent.setup();
    const { onContact } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Abrir no WhatsApp' }));

    expect(window.open).toHaveBeenCalledWith(`https://wa.me/5511999998888?text=${encodeURIComponent(CARDIO_MESSAGE)}`, '_blank', 'noopener,noreferrer');
    await waitFor(() => expect(onContact).toHaveBeenCalledWith('cardio'));
  });

  it('PAN-25 sends the edited text', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const field = screen.getByRole('textbox', { name: 'Mensagem' });
    await user.clear(field);
    await user.type(field, 'Bora treinar?');
    await user.click(screen.getByRole('button', { name: 'Abrir no WhatsApp' }));

    expect(window.open).toHaveBeenCalledWith(`https://wa.me/5511999998888?text=${encodeURIComponent('Bora treinar?')}`, '_blank', 'noopener,noreferrer');
  });

  it('PAN-58 opens WhatsApp with the text only when the student has no number', async () => {
    const user = userEvent.setup();
    const { onContact } = renderCard({ whatsapp: null });

    await user.click(screen.getByRole('button', { name: 'Abrir no WhatsApp' }));

    expect(window.open).toHaveBeenCalledWith(`https://wa.me/?text=${encodeURIComponent(CARDIO_MESSAGE)}`, '_blank', 'noopener,noreferrer');
    await waitFor(() => expect(onContact).toHaveBeenCalledWith('cardio'));
  });

  it('keeps the text on screen and shows the API error when the contact cannot be logged', async () => {
    const user = userEvent.setup();
    const error = Object.assign(new Error('falha'), { userMessage: 'Não foi possível registrar o contato.' });
    renderCard({ onContact: vi.fn().mockRejectedValue(error) });

    await user.click(screen.getByRole('button', { name: 'Abrir no WhatsApp' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível registrar o contato.');
    expect(screen.getByText(CARDIO_MESSAGE)).toBeInTheDocument();
  });
});
