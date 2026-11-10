const WHATSAPP_BASE_URL = 'https://wa.me/';

// wa.me link with the encoded text; without a usable number it opens WhatsApp for the user to pick the contact
export const buildWhatsappUrl = (phone, text) => {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return `${WHATSAPP_BASE_URL}${digits}?text=${encodeURIComponent(text)}`;
};
