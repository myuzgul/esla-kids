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

export function formatPhoneInput(val?: string | null): string {
  if (!val) return '';
  let digits = val.replace(/\D/g, '');
  if (!digits) return '';

  // Baştaki uluslararası kodları (+90, 0090, 90) temizle
  if (digits.startsWith('0090') && digits.length > 4) {
    digits = digits.slice(4);
  } else if (digits.startsWith('90') && digits.length >= 3) {
    digits = digits.slice(2);
  }

  // 5 ile başlıyorsa otomatik 0 ekle (örn: 554... -> 0554...)
  if (!digits.startsWith('0')) {
    digits = '0' + digits;
  }

  // En fazla 11 hane (05541981196 gibi boşluksuz standart cep)
  return digits.slice(0, 11);
}

export function normalizePhone11Digits(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('0090')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('90') && cleaned.length >= 12) {
    cleaned = cleaned.slice(2);
  }

  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }

  return cleaned.slice(0, 11);
}

export function normalizePhone10Digits(phone?: string | null): string {
  if (!phone) return '5555555555';
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '5555555555';

  if (cleaned.startsWith('0090')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('90') && cleaned.length >= 12) {
    cleaned = cleaned.slice(2);
  }

  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.length > 10) {
    cleaned = cleaned.slice(-10);
  } else if (cleaned.length < 10) {
    cleaned = cleaned.padEnd(10, '0');
  }

  return cleaned;
}

// Türkiye 81 İl - Alfabetik Sıralı (A'dan Z'ye Türkçe Karakter Uyumlu)
export const TURKEY_CITIES = [
  'Adana',
  'Adıyaman',
  'Afyonkarahisar',
  'Ağrı',
  'Aksaray',
  'Amasya',
  'Ankara',
  'Antalya',
  'Ardahan',
  'Artvin',
  'Aydın',
  'Balıkesir',
  'Bartın',
  'Batman',
  'Bayburt',
  'Bilecik',
  'Bingöl',
  'Bitlis',
  'Bolu',
  'Burdur',
  'Bursa',
  'Çanakkale',
  'Çankırı',
  'Çorum',
  'Denizli',
  'Diyarbakır',
  'Düzce',
  'Edirne',
  'Elazığ',
  'Erzincan',
  'Erzurum',
  'Eskişehir',
  'Gaziantep',
  'Giresun',
  'Gümüşhane',
  'Hakkari',
  'Hatay',
  'Iğdır',
  'Isparta',
  'İstanbul',
  'İzmir',
  'Kahramanmaraş',
  'Karabük',
  'Karaman',
  'Kars',
  'Kastamonu',
  'Kayseri',
  'Kilis',
  'Kırıkkale',
  'Kırklareli',
  'Kırşehir',
  'Kocaeli',
  'Konya',
  'Kütahya',
  'Malatya',
  'Manisa',
  'Mardin',
  'Mersin',
  'Muğla',
  'Muş',
  'Nevşehir',
  'Niğde',
  'Ordu',
  'Osmaniye',
  'Rize',
  'Sakarya',
  'Samsun',
  'Siirt',
  'Sinop',
  'Sivas',
  'Şanlıurfa',
  'Şırnak',
  'Tekirdağ',
  'Tokat',
  'Trabzon',
  'Tunceli',
  'Uşak',
  'Van',
  'Yalova',
  'Yozgat',
  'Zonguldak'
];

export const TURKISH_CITIES = TURKEY_CITIES;

