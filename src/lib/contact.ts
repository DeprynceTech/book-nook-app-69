export const CONTACT_PHONE = "+256770890961";
export const CONTACT_EMAIL = "adrikoceasaralpha@gmail.com";

export function whatsappLink(text: string) {
  return `https://wa.me/${CONTACT_PHONE.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
