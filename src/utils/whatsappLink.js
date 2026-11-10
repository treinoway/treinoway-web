const WHATSAPP_BASE_URL = 'https://wa.me/';
const BRAZIL_COUNTRY_CODE = '55';
const BRAZIL_LOCAL_LENGTHS = [10, 11];

// Digits of the number with the Brazilian country code added when it was typed without one (no "+", area code + 8 or 9 digits)
const internationalDigitsOf = (phone) => {
  const raw = String(phone ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return digits;
  const local = digits.replace(/^0+/, '');
  return BRAZIL_LOCAL_LENGTHS.includes(local.length) ? `${BRAZIL_COUNTRY_CODE}${local}` : digits;
};

// wa.me link with the encoded text; without a usable number it opens WhatsApp for the user to pick the contact
export const buildWhatsappUrl = (phone, text) => `${WHATSAPP_BASE_URL}${internationalDigitsOf(phone)}?text=${encodeURIComponent(text)}`;
