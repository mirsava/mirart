export type PhoneTemplate = {
  code: string;
  mask: string;
};

export const SPECIALTIES = ['Painting', 'Woodworking', 'Other'] as const;

export const EXPERIENCE_LEVELS = [
  'Just starting out',
  '1-2 years',
  '3-5 years',
  '6-10 years',
  '10+ years',
  'Professional',
] as const;

export const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Ireland',
  'Portugal',
  'Poland',
  'Czech Republic',
  'Romania',
  'Hungary',
  'Greece',
  'Turkey',
  'India',
  'Pakistan',
  'Bangladesh',
  'Japan',
  'South Korea',
  'China',
  'Singapore',
  'Malaysia',
  'Thailand',
  'Indonesia',
  'Philippines',
  'Vietnam',
  'United Arab Emirates',
  'Saudi Arabia',
  'South Africa',
  'Nigeria',
  'Kenya',
  'Egypt',
  'Mexico',
  'Brazil',
  'Argentina',
  'Chile',
  'Colombia',
  'Peru',
  'New Zealand',
  'Other',
] as const;

export const DEFAULT_PHONE_TEMPLATE: PhoneTemplate = { code: '+1', mask: '+1 (###) ###-####' };

export const PHONE_TEMPLATES: Record<string, PhoneTemplate> = {
  'United States': { code: '+1', mask: '+1 (###) ###-####' },
  Canada: { code: '+1', mask: '+1 (###) ###-####' },
  'United Kingdom': { code: '+44', mask: '+44 #### ######' },
  Australia: { code: '+61', mask: '+61 # #### ####' },
  Germany: { code: '+49', mask: '+49 #### ########' },
  France: { code: '+33', mask: '+33 # ## ## ## ##' },
  Italy: { code: '+39', mask: '+39 ### ### ####' },
  Spain: { code: '+34', mask: '+34 ### ## ## ##' },
  Netherlands: { code: '+31', mask: '+31 # ########' },
  Belgium: { code: '+32', mask: '+32 ### ## ## ##' },
  Switzerland: { code: '+41', mask: '+41 ## ### ## ##' },
  Austria: { code: '+43', mask: '+43 ### #######' },
  Sweden: { code: '+46', mask: '+46 ## ### ## ##' },
  Norway: { code: '+47', mask: '+47 ### ## ###' },
  Denmark: { code: '+45', mask: '+45 ## ## ## ##' },
  Finland: { code: '+358', mask: '+358 ## #######' },
  Ireland: { code: '+353', mask: '+353 ## ### ####' },
  Portugal: { code: '+351', mask: '+351 ### ### ###' },
  Poland: { code: '+48', mask: '+48 ### ### ###' },
  'Czech Republic': { code: '+420', mask: '+420 ### ### ###' },
  Romania: { code: '+40', mask: '+40 ### ### ###' },
  Hungary: { code: '+36', mask: '+36 ## ### ####' },
  Greece: { code: '+30', mask: '+30 ### ### ####' },
  Turkey: { code: '+90', mask: '+90 ### ### ## ##' },
  India: { code: '+91', mask: '+91 ##### #####' },
  Pakistan: { code: '+92', mask: '+92 ### #######' },
  Bangladesh: { code: '+880', mask: '+880 #### ######' },
  Japan: { code: '+81', mask: '+81 ## #### ####' },
  'South Korea': { code: '+82', mask: '+82 ## #### ####' },
  China: { code: '+86', mask: '+86 ### #### ####' },
  Singapore: { code: '+65', mask: '+65 #### ####' },
  Malaysia: { code: '+60', mask: '+60 ## ### ####' },
  Thailand: { code: '+66', mask: '+66 ## ### ####' },
  Indonesia: { code: '+62', mask: '+62 ### #### ####' },
  Philippines: { code: '+63', mask: '+63 ### ### ####' },
  Vietnam: { code: '+84', mask: '+84 ## ### ## ##' },
  'United Arab Emirates': { code: '+971', mask: '+971 ## ### ####' },
  'Saudi Arabia': { code: '+966', mask: '+966 # #### ####' },
  'South Africa': { code: '+27', mask: '+27 ## ### ####' },
  Nigeria: { code: '+234', mask: '+234 ### ### ####' },
  Kenya: { code: '+254', mask: '+254 ### ######' },
  Egypt: { code: '+20', mask: '+20 ### ### ####' },
  Mexico: { code: '+52', mask: '+52 ## #### ####' },
  Brazil: { code: '+55', mask: '+55 (##) #####-####' },
  Argentina: { code: '+54', mask: '+54 # ## ####-####' },
  Chile: { code: '+56', mask: '+56 # #### ####' },
  Colombia: { code: '+57', mask: '+57 ### ### ####' },
  Peru: { code: '+51', mask: '+51 ### ### ###' },
  'New Zealand': { code: '+64', mask: '+64 ## ### ####' },
};

export const getPhoneTemplate = (country: string) => PHONE_TEMPLATES[country] || DEFAULT_PHONE_TEMPLATE;

export const buildPhoneTemplateValue = (mask: string) => mask.replace(/#/g, '_');

export const applyPhoneMask = (mask: string, inputDigits: string) => {
  let digitIndex = 0;
  return mask.replace(/#/g, () => {
    const nextDigit = inputDigits[digitIndex];
    digitIndex += 1;
    return nextDigit ?? '_';
  });
};

export const countMaskSlots = (mask: string) => (mask.match(/#/g) || []).length;

export const getDigitsWithoutCountryCode = (value: string, countryCode: string) => {
  const allDigits = value.replace(/\D/g, '');
  const countryDigits = countryCode.replace(/\D/g, '');
  if (allDigits.startsWith(countryDigits)) {
    return allDigits.slice(countryDigits.length);
  }
  return allDigits;
};
