export type Country = { code: string; name: string; dial: string; min: number; max: number };

// [ISO, name, dial code, min national digits, max national digits]
const RAW: [string, string, string, number, number][] = [
  ["UG", "Uganda", "256", 9, 9], ["KE", "Kenya", "254", 9, 9], ["TZ", "Tanzania", "255", 9, 9],
  ["RW", "Rwanda", "250", 9, 9], ["BI", "Burundi", "257", 8, 8], ["SS", "South Sudan", "211", 9, 9],
  ["ET", "Ethiopia", "251", 9, 9], ["SO", "Somalia", "252", 7, 9], ["CD", "DR Congo", "243", 9, 9],
  ["NG", "Nigeria", "234", 10, 10], ["GH", "Ghana", "233", 9, 9], ["ZA", "South Africa", "27", 9, 9],
  ["MW", "Malawi", "265", 9, 9], ["ZM", "Zambia", "260", 9, 9], ["ZW", "Zimbabwe", "263", 9, 9],
  ["MZ", "Mozambique", "258", 9, 9], ["BW", "Botswana", "267", 7, 8], ["NA", "Namibia", "264", 9, 9],
  ["AO", "Angola", "244", 9, 9], ["CM", "Cameroon", "237", 9, 9], ["CI", "Côte d'Ivoire", "225", 10, 10],
  ["SN", "Senegal", "221", 9, 9], ["EG", "Egypt", "20", 10, 10], ["MA", "Morocco", "212", 9, 9],
  ["DZ", "Algeria", "213", 9, 9], ["TN", "Tunisia", "216", 8, 8], ["SD", "Sudan", "249", 9, 9],
  ["US", "United States", "1", 10, 10], ["CA", "Canada", "1", 10, 10], ["MX", "Mexico", "52", 10, 10],
  ["BR", "Brazil", "55", 10, 11], ["AR", "Argentina", "54", 10, 11], ["CO", "Colombia", "57", 10, 10],
  ["CL", "Chile", "56", 9, 9], ["PE", "Peru", "51", 9, 9], ["JM", "Jamaica", "1", 10, 10],
  ["GB", "United Kingdom", "44", 10, 10], ["IE", "Ireland", "353", 9, 9], ["FR", "France", "33", 9, 9],
  ["DE", "Germany", "49", 10, 11], ["IT", "Italy", "39", 9, 10], ["ES", "Spain", "34", 9, 9],
  ["PT", "Portugal", "351", 9, 9], ["NL", "Netherlands", "31", 9, 9], ["BE", "Belgium", "32", 9, 9],
  ["CH", "Switzerland", "41", 9, 9], ["AT", "Austria", "43", 10, 11], ["SE", "Sweden", "46", 9, 9],
  ["NO", "Norway", "47", 8, 8], ["DK", "Denmark", "45", 8, 8], ["FI", "Finland", "358", 9, 10],
  ["PL", "Poland", "48", 9, 9], ["RO", "Romania", "40", 9, 9], ["GR", "Greece", "30", 10, 10],
  ["TR", "Turkey", "90", 10, 10], ["UA", "Ukraine", "380", 9, 9], ["RU", "Russia", "7", 10, 10],
  ["AE", "United Arab Emirates", "971", 9, 9], ["SA", "Saudi Arabia", "966", 9, 9], ["QA", "Qatar", "974", 8, 8],
  ["IL", "Israel", "972", 9, 9], ["IN", "India", "91", 10, 10], ["PK", "Pakistan", "92", 10, 10],
  ["BD", "Bangladesh", "880", 10, 10], ["CN", "China", "86", 11, 11], ["JP", "Japan", "81", 10, 10],
  ["KR", "South Korea", "82", 9, 10], ["ID", "Indonesia", "62", 9, 12], ["MY", "Malaysia", "60", 9, 10],
  ["PH", "Philippines", "63", 10, 10], ["SG", "Singapore", "65", 8, 8], ["TH", "Thailand", "66", 9, 9],
  ["VN", "Vietnam", "84", 9, 10], ["AU", "Australia", "61", 9, 9], ["NZ", "New Zealand", "64", 8, 10],
];

export const COUNTRIES: Country[] = RAW.map(([code, name, dial, min, max]) => ({ code, name, dial, min, max })).sort(
  (a, b) => a.name.localeCompare(b.name),
);

export function flag(code: string) {
  return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/** Returns the national digits (leading 0 removed) or null when invalid for the country. */
export function normalizePhone(country: Country, input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith(country.dial) && digits.length > country.max) digits = digits.slice(country.dial.length);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length >= country.min && digits.length <= country.max ? digits : null;
}
