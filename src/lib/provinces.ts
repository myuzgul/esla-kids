// Türkiye 81 İl ve Plaka (State ID) Eşleştirme Haritası
export const TURKEY_PROVINCE_CODES: Record<string, number> = {
  'adana': 1, 'adıyaman': 2, 'adiyaman': 2, 'afyonkarahisar': 3, 'afyon': 3,
  'ağrı': 4, 'agri': 4, 'amasya': 5, 'ankara': 6, 'antalya': 7,
  'artvin': 8, 'aydın': 9, 'aydin': 9, 'balıkesir': 10, 'balikesir': 10,
  'bilecik': 11, 'bingöl': 12, 'bingol': 12, 'bitlis': 13, 'bolu': 14,
  'burdur': 15, 'bursa': 16, 'çanakkale': 17, 'canakkale': 17, 'çankırı': 18,
  'cankiri': 18, 'çorum': 19, 'corum': 19, 'denizli': 20, 'diyarbakır': 21,
  'diyarbakir': 21, 'edirne': 22, 'elazığ': 23, 'elazig': 23, 'erzincan': 24,
  'erzurum': 25, 'eskişehir': 26, 'eskisehir': 26, 'gaziantep': 27, 'giresun': 28,
  'gümüşhane': 29, 'gumushane': 29, 'hakkari': 30, 'hatay': 31, 'isparta': 32,
  'mersin': 33, 'içel': 33, 'icel': 33, 'istanbul': 34, 'izmir': 35,
  'kars': 36, 'kastamonu': 37, 'kayseri': 38, 'kırklareli': 39, 'kirklareli': 39,
  'kırşehir': 40, 'kirsehir': 40, 'kocaeli': 41, 'izmit': 41, 'konya': 42,
  'kütahya': 43, 'kutahya': 43, 'malatya': 44, 'manisa': 45, 'kahramanmaraş': 46,
  'kahramanmaras': 46, 'maraş': 46, 'maras': 46, 'mardin': 47, 'muğla': 48,
  'mugla': 48, 'muş': 49, 'mus': 49, 'nevşehir': 50, 'nevsehir': 50,
  'niğde': 51, 'nigde': 51, 'ordu': 52, 'rize': 53, 'sakarya': 54,
  'adapazarı': 54, 'adapazari': 54, 'samsun': 55, 'siirt': 56, 'sinop': 57,
  'sivas': 58, 'tekirdağ': 59, 'tekirdag': 59, 'tokat': 60, 'trabzon': 61,
  'tunceli': 62, 'şanlıurfa': 63, 'sanliurfa': 63, 'urfa': 63, 'uşak': 64,
  'usak': 64, 'van': 65, 'yozgat': 66, 'zonguldak': 67, 'aksaray': 68,
  'bayburt': 69, 'karaman': 70, 'kırıkkale': 71, 'kirikkale': 71, 'batman': 72,
  'şırnak': 73, 'sirnak': 73, 'bartın': 74, 'bartin': 74, 'ardahan': 75,
  'ığdır': 76, 'igdir': 76, 'yalova': 77, 'karabük': 78, 'karabuk': 78,
  'kilis': 79, 'osmaniye': 80, 'düzce': 81, 'duzce': 81
};

export function getProvinceStateId(cityName?: string): number {
  if (!cityName) return 34; // default Istanbul
  const normalized = cityName.trim().toLowerCase().replace(/['"]/g, '');
  return TURKEY_PROVINCE_CODES[normalized] || 34;
}

export function normalizePhone10Digits(phone?: string): string {
  if (!phone) return '5555555555';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('90') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length > 10) {
    cleaned = cleaned.slice(-10);
  } else if (cleaned.length < 10) {
    cleaned = cleaned.padEnd(10, '0');
  }
  return cleaned;
}

export const TURKEY_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin',
  'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
  'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta',
  'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
  'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla',
  'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt',
  'Sinop', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
  'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale', 'Batman',
  'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce'
];

