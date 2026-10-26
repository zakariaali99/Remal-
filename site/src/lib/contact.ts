export const FACEBOOK = 'https://www.facebook.com/share/1CmyoEmRdq/'
export const PHONE_TEL = '+218915096111'
export const PHONE_SHOW = '+218 91 509 6111'
export const EMAIL = 'contact@remalperfumes.ly'
export const whatsapp = (text?: string) => `https://wa.me/${PHONE_TEL.slice(1)}${text ? `?text=${encodeURIComponent(text)}` : ''}`
