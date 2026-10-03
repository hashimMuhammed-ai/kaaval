export interface LocationCoord {
  lat: number;
  lng: number;
}

export interface TownLocation extends LocationCoord {
  district: string;
}

export const KERALA_STATE_CENTROID: LocationCoord = {
  lat: 10.8505,
  lng: 76.2711,
};

export const KERALA_DISTRICTS: Record<string, LocationCoord> = {
  alappuzha: { lat: 9.4981, lng: 76.3388 },
  ernakulam: { lat: 9.9816, lng: 76.2999 },
  idukki: { lat: 9.8514, lng: 76.9698 },
  kannur: { lat: 11.8745, lng: 75.3704 },
  kasaragod: { lat: 12.5102, lng: 74.9852 },
  kollam: { lat: 8.8932, lng: 76.6141 },
  kottayam: { lat: 9.5916, lng: 76.5222 },
  kozhikode: { lat: 11.2588, lng: 75.7804 },
  malappuram: { lat: 11.051, lng: 76.0711 },
  palakkad: { lat: 10.7867, lng: 76.6548 },
  pathanamthitta: { lat: 9.2648, lng: 76.787 },
  thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
  thrissur: { lat: 10.5276, lng: 76.2144 },
  wayanad: { lat: 11.6854, lng: 76.132 },
};

// Aliases for common district name variations
export const DISTRICT_ALIASES: Record<string, string> = {
  trivandrum: 'thiruvananthapuram',
  tvm: 'thiruvananthapuram',
  cochin: 'ernakulam',
  kochi: 'ernakulam',
  calicut: 'kozhikode',
  quilon: 'kollam',
  alleppey: 'alappuzha',
  trichur: 'thrissur',
  palghat: 'palakkad',
  cannanore: 'kannur',
  kasargod: 'kasaragod',
};

export const KERALA_TOWNS: Record<string, TownLocation> = {
  // Ernakulam District
  kochi: { lat: 9.9312, lng: 76.2673, district: 'Ernakulam' },
  cochin: { lat: 9.9312, lng: 76.2673, district: 'Ernakulam' },
  kakkanad: { lat: 10.0159, lng: 76.3419, district: 'Ernakulam' },
  aluva: { lat: 10.1076, lng: 76.3516, district: 'Ernakulam' },
  angamaly: { lat: 10.196, lng: 76.386, district: 'Ernakulam' },
  tripunithura: { lat: 9.9438, lng: 76.3498, district: 'Ernakulam' },
  kalamassery: { lat: 10.0469, lng: 76.3175, district: 'Ernakulam' },
  edappally: { lat: 10.0236, lng: 76.3116, district: 'Ernakulam' },
  'fort kochi': { lat: 9.9658, lng: 76.2421, district: 'Ernakulam' },
  mattancherry: { lat: 9.9579, lng: 76.258, district: 'Ernakulam' },
  perumbavoor: { lat: 10.1118, lng: 76.4777, district: 'Ernakulam' },
  muvattupuzha: { lat: 9.9894, lng: 76.579, district: 'Ernakulam' },
  kothamangalam: { lat: 10.061, lng: 76.6212, district: 'Ernakulam' },
  'north paravur': { lat: 10.1449, lng: 76.2307, district: 'Ernakulam' },
  piravom: { lat: 9.8702, lng: 76.495, district: 'Ernakulam' },
  kadavanthra: { lat: 9.9674, lng: 76.2995, district: 'Ernakulam' },
  palarivattom: { lat: 10.0041, lng: 76.3094, district: 'Ernakulam' },
  vytilla: { lat: 9.967, lng: 76.317, district: 'Ernakulam' },
  panampilly: { lat: 9.9632, lng: 76.296, district: 'Ernakulam' },

  // Thiruvananthapuram District
  thiruvananthapuram: { lat: 8.5241, lng: 76.9366, district: 'Thiruvananthapuram' },
  trivandrum: { lat: 8.5241, lng: 76.9366, district: 'Thiruvananthapuram' },
  kazhakkoottam: { lat: 8.5686, lng: 76.8731, district: 'Thiruvananthapuram' },
  kazhakoottam: { lat: 8.5686, lng: 76.8731, district: 'Thiruvananthapuram' },
  technopark: { lat: 8.5581, lng: 76.8809, district: 'Thiruvananthapuram' },
  neyyattinkara: { lat: 8.4011, lng: 77.0864, district: 'Thiruvananthapuram' },
  attingal: { lat: 8.6965, lng: 76.8142, district: 'Thiruvananthapuram' },
  nedumangad: { lat: 8.6019, lng: 77.0016, district: 'Thiruvananthapuram' },
  varkala: { lat: 8.7379, lng: 76.7163, district: 'Thiruvananthapuram' },
  kovalam: { lat: 8.4004, lng: 76.9787, district: 'Thiruvananthapuram' },
  pettah: { lat: 8.4975, lng: 76.9304, district: 'Thiruvananthapuram' },
  kesavadasapuram: { lat: 8.5342, lng: 76.9372, district: 'Thiruvananthapuram' },

  // Kozhikode District
  kozhikode: { lat: 11.2588, lng: 75.7804, district: 'Kozhikode' },
  calicut: { lat: 11.2588, lng: 75.7804, district: 'Kozhikode' },
  koyilandy: { lat: 11.4363, lng: 75.6975, district: 'Kozhikode' },
  vatakara: { lat: 11.6089, lng: 75.5917, district: 'Kozhikode' },
  feroke: { lat: 11.1965, lng: 75.8361, district: 'Kozhikode' },
  beypore: { lat: 11.1783, lng: 75.8078, district: 'Kozhikode' },
  thamarassery: { lat: 11.4172, lng: 75.9356, district: 'Kozhikode' },
  ramanattukara: { lat: 11.1738, lng: 75.8647, district: 'Kozhikode' },

  // Thrissur District
  thrissur: { lat: 10.5276, lng: 76.2144, district: 'Thrissur' },
  trichur: { lat: 10.5276, lng: 76.2144, district: 'Thrissur' },
  guruvayur: { lat: 10.5946, lng: 76.0416, district: 'Thrissur' },
  irinjalakuda: { lat: 10.3429, lng: 76.2044, district: 'Thrissur' },
  chalakudy: { lat: 10.307, lng: 76.333, district: 'Thrissur' },
  kodungallur: { lat: 10.2238, lng: 76.1962, district: 'Thrissur' },
  kunnamkulam: { lat: 10.6517, lng: 76.0722, district: 'Thrissur' },
  wadakkanchery: { lat: 10.6663, lng: 76.2417, district: 'Thrissur' },

  // Kollam District
  kollam: { lat: 8.8932, lng: 76.6141, district: 'Kollam' },
  quilon: { lat: 8.8932, lng: 76.6141, district: 'Kollam' },
  karunagappally: { lat: 9.0544, lng: 76.5358, district: 'Kollam' },
  punalur: { lat: 9.0177, lng: 76.9248, district: 'Kollam' },
  kottarakkara: { lat: 8.9989, lng: 76.7725, district: 'Kollam' },
  paravur: { lat: 8.8058, lng: 76.6698, district: 'Kollam' },
  chavara: { lat: 8.9998, lng: 76.5367, district: 'Kollam' },

  // Kannur District
  kannur: { lat: 11.8745, lng: 75.3704, district: 'Kannur' },
  thalassery: { lat: 11.7491, lng: 75.489, district: 'Kannur' },
  payyanur: { lat: 12.1009, lng: 75.2016, district: 'Kannur' },
  taliparamba: { lat: 12.0405, lng: 75.3587, district: 'Kannur' },
  mattannur: { lat: 11.9288, lng: 75.5772, district: 'Kannur' },
  iritty: { lat: 11.9798, lng: 75.6662, district: 'Kannur' },

  // Kottayam District
  kottayam: { lat: 9.5916, lng: 76.5222, district: 'Kottayam' },
  pala: { lat: 9.7118, lng: 76.6834, district: 'Kottayam' },
  changanassery: { lat: 9.4447, lng: 76.5413, district: 'Kottayam' },
  kanjirappally: { lat: 9.5558, lng: 76.7909, district: 'Kottayam' },
  vaikom: { lat: 9.7505, lng: 76.3958, district: 'Kottayam' },
  ettumanoor: { lat: 9.6672, lng: 76.5615, district: 'Kottayam' },

  // Malappuram District
  malappuram: { lat: 11.051, lng: 76.0711, district: 'Malappuram' },
  manjeri: { lat: 11.1197, lng: 76.1215, district: 'Malappuram' },
  tirur: { lat: 10.9147, lng: 75.9229, district: 'Malappuram' },
  perinthalmanna: { lat: 10.976, lng: 76.2255, district: 'Malappuram' },
  ponnani: { lat: 10.7745, lng: 75.9254, district: 'Malappuram' },
  kottakkal: { lat: 10.9984, lng: 75.9988, district: 'Malappuram' },
  nilambur: { lat: 11.2775, lng: 76.2264, district: 'Malappuram' },

  // Palakkad District
  palakkad: { lat: 10.7867, lng: 76.6548, district: 'Palakkad' },
  ottapalam: { lat: 10.7717, lng: 76.3813, district: 'Palakkad' },
  chittur: { lat: 10.7027, lng: 76.7196, district: 'Palakkad' },
  shoranur: { lat: 10.7634, lng: 76.2785, district: 'Palakkad' },
  mannarkkad: { lat: 10.9888, lng: 76.459, district: 'Palakkad' },
  alathur: { lat: 10.6441, lng: 76.5452, district: 'Palakkad' },

  // Alappuzha District
  alappuzha: { lat: 9.4981, lng: 76.3388, district: 'Alappuzha' },
  alleppey: { lat: 9.4981, lng: 76.3388, district: 'Alappuzha' },
  cherthala: { lat: 9.6845, lng: 76.3317, district: 'Alappuzha' },
  kayamkulam: { lat: 9.1724, lng: 76.5013, district: 'Alappuzha' },
  mavelikkara: { lat: 9.2662, lng: 76.5435, district: 'Alappuzha' },
  haripad: { lat: 9.2833, lng: 76.4667, district: 'Alappuzha' },
  ambalappuzha: { lat: 9.38, lng: 76.357, district: 'Alappuzha' },

  // Pathanamthitta District
  pathanamthitta: { lat: 9.2648, lng: 76.787, district: 'Pathanamthitta' },
  thiruvalla: { lat: 9.3835, lng: 76.5741, district: 'Pathanamthitta' },
  adoor: { lat: 9.153, lng: 76.7356, district: 'Pathanamthitta' },
  ranni: { lat: 9.3822, lng: 76.7861, district: 'Pathanamthitta' },
  konni: { lat: 9.2435, lng: 76.8529, district: 'Pathanamthitta' },

  // Kasaragod District
  kasaragod: { lat: 12.5102, lng: 74.9852, district: 'Kasaragod' },
  kasargod: { lat: 12.5102, lng: 74.9852, district: 'Kasaragod' },
  kanhangad: { lat: 12.3082, lng: 75.091, district: 'Kasaragod' },
  nileshwaram: { lat: 12.2536, lng: 75.1294, district: 'Kasaragod' },
  uppala: { lat: 12.6853, lng: 74.908, district: 'Kasaragod' },

  // Wayanad District
  kalpetta: { lat: 11.605, lng: 76.0827, district: 'Wayanad' },
  'sulthan bathery': { lat: 11.6627, lng: 76.257, district: 'Wayanad' },
  mananthavady: { lat: 11.8022, lng: 76.0033, district: 'Wayanad' },
  vythiri: { lat: 11.5518, lng: 76.0402, district: 'Wayanad' },

  // Idukki District
  thodupuzha: { lat: 9.8959, lng: 76.7184, district: 'Idukki' },
  munnar: { lat: 10.0889, lng: 77.0595, district: 'Idukki' },
  kattappana: { lat: 9.754, lng: 77.1205, district: 'Idukki' },
  adimali: { lat: 10.0153, lng: 76.9535, district: 'Idukki' },
  nedumkandam: { lat: 9.8322, lng: 77.1648, district: 'Idukki' },
};

// Kerala PIN code prefixes (3-digit) mapping to primary district
export const KERALA_PIN_PREFIX_MAP: Record<string, string> = {
  '695': 'thiruvananthapuram',
  '691': 'kollam',
  '689': 'pathanamthitta',
  '688': 'alappuzha',
  '686': 'kottayam',
  '685': 'idukki',
  '682': 'ernakulam',
  '683': 'ernakulam',
  '680': 'thrissur',
  '678': 'palakkad',
  '676': 'malappuram',
  '673': 'kozhikode',
  '670': 'kannur',
  '671': 'kasaragod',
};
