import http from 'http';
import https from 'https';
import crypto from 'crypto';
import { prisma } from './prisma';
import { getSettings, SiteSettings } from './settings';

const BIEN_ENDPOINT = 'http://connect.bienteknoloji.com.tr/Services/BasicIntegration';
const SOAP_ACTION_BASE = 'http://tempuri.org/IBasicIntegration/';

export interface BienInvoiceResult {
  success: boolean;
  invoiceNumber?: string;
  invoiceUuid?: string;
  scenario?: string;
  error?: string;
}

// Güvenli XML kaçış karakterleri
function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// SOAP isteği gönderme yardımcısı
async function sendSoapRequest(action: string, xmlBody: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const isHttps = BIEN_ENDPOINT.startsWith('https');
    const u = new URL(BIEN_ENDPOINT);
    const options = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': action.startsWith('http') ? action : `${SOAP_ACTION_BASE}${action}`,
        'Content-Length': Buffer.byteLength(xmlBody),
      },
    };

    const client = isHttps ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode || 500, body: data }));
    });
    req.on('error', reject);
    req.write(xmlBody);
    req.end();
  });
}

// Türkçe para tutarını yazıya çevirme (Örn: #Beş Yüz Elli Türk Lirası#)
export function numberToWordsTurkish(amount: number): string {
  const birler = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
  const onlar = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
  const basamaklar = ['', 'Bin', 'Milyon', 'Milyar'];

  const tamKisim = Math.floor(amount);
  const kurus = Math.round((amount - tamKisim) * 100);

  if (tamKisim === 0 && kurus === 0) return 'Sıfır Türk Lirası';

  function ucBasamak(n: number): string {
    let res = '';
    const yuz = Math.floor(n / 100);
    const on = Math.floor((n % 100) / 10);
    const bir = n % 10;

    if (yuz > 1) res += birler[yuz] + 'Yüz';
    else if (yuz === 1) res += 'Yüz';

    res += onlar[on];
    res += birler[bir];
    return res;
  }

  let sonuc = '';
  let sayi = tamKisim;
  let basamakIndex = 0;

  while (sayi > 0) {
    const ucHane = sayi % 1000;
    if (ucHane > 0) {
      if (basamakIndex === 1 && ucHane === 1) {
        sonuc = 'Bin' + sonuc;
      } else {
        sonuc = ucBasamak(ucHane) + basamaklar[basamakIndex] + sonuc;
      }
    }
    sayi = Math.floor(sayi / 1000);
    basamakIndex++;
  }

  let finalStr = sonuc ? `${sonuc} Türk Lirası` : '';
  if (kurus > 0) {
    const kurusStr = ucBasamak(kurus);
    finalStr += ` ${kurusStr} Kuruş`;
  }

  return `#${finalStr}#`;
}

// Bien İnternet Satışı Ödeme Tipi eşleştirme
// Bien Sadece: KREDIKARTI/BANKAKARTI, EFT/HAVALE, KAPIDAODEME, ODEMEARACISI veya DIGER - ... kabul eder
export function mapToBienPaymentType(method: string | null | undefined): { paymentType: string; paymentMeansCode: string } {
  if (!method) {
    return { paymentType: 'KREDIKARTI/BANKAKARTI', paymentMeansCode: '48' };
  }
  const m = method.toUpperCase().replace(/\s+/g, ' ').trim();

  if (m.includes('KAPIDA') || m.includes('COD') || m.includes('TESLIMAT')) {
    return { paymentType: 'KAPIDAODEME', paymentMeansCode: '10' };
  }
  if (m.includes('HAVALE') || m.includes('EFT') || m.includes('BANKA')) {
    return { paymentType: 'EFT/HAVALE', paymentMeansCode: '42' };
  }
  if (m.includes('PAYTR') || m.includes('KREDI') || m.includes('KARTI') || m.includes('CARD') || m.includes('CREDIT')) {
    return { paymentType: 'KREDIKARTI/BANKAKARTI', paymentMeansCode: '48' };
  }
  return { paymentType: 'ODEMEARACISI', paymentMeansCode: '48' };
}

// 1. Bien API Bağlantı Testi
export async function testBienConnection(settings?: SiteSettings): Promise<{ success: boolean; message: string }> {
  const s = settings || (await getSettings());
  const username = s.bien_username || 'info@eslakids.com';
  const password = s.bien_password || 'Tpass147852*';

  const soapXml = `
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <TestConnection xmlns="http://tempuri.org/">
      <userInfo Username="${escapeXml(username)}" Password="${escapeXml(password)}"/>
    </TestConnection>
  </s:Body>
</s:Envelope>
`;

  try {
    const res = await sendSoapRequest('TestConnection', soapXml);
    if (res.status === 200 && res.body.includes('IsSucceded="true"')) {
      return { success: true, message: 'Bien Teknoloji bağlantısı başarılı ve aktif.' };
    }
    const match = res.body.match(/faultstring[^>]*>([^<]+)<\//i) || res.body.match(/Message="([^"]+)"/i);
    return { success: false, message: match ? match[1] : 'Bağlantı hatası oluştu.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Sunucuya bağlanılamadı.' };
  }
}

// 2. Alıcının e-Fatura mükellefi olup olmadığını kontrol et
export async function checkIsEInvoiceUser(vknTckn: string, settings?: SiteSettings): Promise<boolean> {
  if (!vknTckn || vknTckn === '11111111111') return false;
  const s = settings || (await getSettings());
  const username = s.bien_username || 'info@eslakids.com';
  const password = s.bien_password || 'Tpass147852*';

  const soapXml = `
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <IsEInvoiceUser xmlns="http://tempuri.org/">
      <userInfo Username="${escapeXml(username)}" Password="${escapeXml(password)}"/>
      <vknTckn>${escapeXml(vknTckn)}</vknTckn>
    </IsEInvoiceUser>
  </s:Body>
</s:Envelope>
`;

  try {
    const res = await sendSoapRequest('IsEInvoiceUser', soapXml);
    return res.status === 200 && res.body.includes('Value="true"');
  } catch {
    return false;
  }
}

// 3. Siparişi UBL-TR 2.1 e-Arşiv / e-Fatura formatına dönüştürüp Bien'e iletme
export async function createBienInvoice(
  orderId: string,
  options?: { isDraft?: boolean; customTckn?: string; customTitle?: string; customTaxOffice?: string }
): Promise<BienInvoiceResult> {
  const settings = await getSettings();
  if (settings.bien_enabled === false) {
    throw new Error('Bien e-Fatura entegrasyonu ayarlardan devre dışı bırakılmış.');
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error('Sipariş bulunamadı.');
  }

  if (order.invoiceStatus === 'INVOICED' && order.invoiceNumber) {
    throw new Error(`Bu siparişin faturası zaten kesilmiş: ${order.invoiceNumber}`);
  }

  const username = settings.bien_username || 'info@eslakids.com';
  const password = settings.bien_password || 'Tpass147852*';
  const uuid = crypto.randomUUID();
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toISOString().split('T')[1].slice(0, 8);

  // Müşteri bilgileri
  const customerTckn = options?.customTckn || '11111111111';
  const isCompany = customerTckn.length === 10;
  const customerTitle = options?.customTitle || order.guestName || 'Perakende Müşteri';
  const [firstName, ...restName] = customerTitle.split(' ');
  const familyName = restName.join(' ') || '.';

  // Adres ayrıştırma
  const addressParts = (order.shippingAddress || '').split('\n').filter(Boolean);
  const streetName = addressParts[0] || order.shippingAddress || 'Türkiye';
  let cityName = 'Bursa';
  let districtName = 'Nilüfer';
  if (addressParts.length > 1) {
    const lastPart = addressParts[addressParts.length - 1];
    if (lastPart.includes('/')) {
      const [d, c] = lastPart.split('/');
      districtName = d.trim() || districtName;
      cityName = c.trim() || cityName;
    }
  }

  // Alıcı e-Fatura kullanıcısı mı?
  const isEInvoice = await checkIsEInvoiceUser(customerTckn, settings);
  const profileId = isEInvoice ? 'TICARIFATURA' : 'EARSIVFATURA';
  const scenario = isEInvoice ? 'eInvoice' : 'eArchive';

  // Bien Ödeme Tipi eşleştirme (KREDIKARTI/BANKAKARTI, EFT/HAVALE, KAPIDAODEME, ODEMEARACISI)
  const bienPayment = mapToBienPaymentType(order.paymentMethod);

  // Kalemler ve %10 KDV hesaplaması
  let lineCount = 0;
  let lineExtensionTotal = 0; // Matrah toplamı (KDV hariç)
  let taxTotalAmount = 0;      // KDV toplamı

  const invoiceLinesXml: string[] = [];

  // Sipariş ürünleri
  for (const item of order.items) {
    lineCount++;
    const quantity = item.quantity || 1;
    const grossTotal = item.total; // KDV dahil tutar
    
    // %10 KDV ayrıştırma
    const kdvRate = 10.0;
    const lineNetTotal = Math.round((grossTotal / 1.10) * 100) / 100;
    const lineKdv = Math.round((grossTotal - lineNetTotal) * 100) / 100;
    const unitPriceNet = Math.round((lineNetTotal / quantity) * 10000) / 10000;

    lineExtensionTotal += lineNetTotal;
    taxTotalAmount += lineKdv;

    invoiceLinesXml.push(`
      <InvoiceLine xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
        <ID xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${lineCount}</ID>
        <InvoicedQuantity unitCode="C62" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${quantity}.00000</InvoicedQuantity>
        <LineExtensionAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${lineNetTotal.toFixed(2)}</LineExtensionAmount>
        <TaxTotal>
          <TaxAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${lineKdv.toFixed(2)}</TaxAmount>
          <TaxSubtotal>
            <TaxableAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${lineNetTotal.toFixed(2)}</TaxableAmount>
            <TaxAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${lineKdv.toFixed(2)}</TaxAmount>
            <Percent xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${kdvRate.toFixed(2)}</Percent>
            <TaxCategory>
              <TaxScheme>
                <Name xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">KDV</Name>
                <TaxTypeCode xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">0015</TaxTypeCode>
              </TaxScheme>
            </TaxCategory>
          </TaxSubtotal>
        </TaxTotal>
        <Item>
          <Name xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${escapeXml(item.title + (item.variationName ? ` (${item.variationName})` : ''))}</Name>
        </Item>
        <Price>
          <PriceAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${unitPriceNet.toFixed(4)}</PriceAmount>
        </Price>
      </InvoiceLine>
    `);
  }

  // Kargo bedeli varsa kalem olarak ekle (Standart %20 KDV)
  if (order.shippingFee && order.shippingFee > 0) {
    lineCount++;
    const grossShipping = order.shippingFee;
    const shippingKdvRate = 20.0;
    const shippingNet = Math.round((grossShipping / 1.20) * 100) / 100;
    const shippingKdv = Math.round((grossShipping - shippingNet) * 100) / 100;

    lineExtensionTotal += shippingNet;
    taxTotalAmount += shippingKdv;

    invoiceLinesXml.push(`
      <InvoiceLine xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
        <ID xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${lineCount}</ID>
        <InvoicedQuantity unitCode="C62" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">1.00000</InvoicedQuantity>
        <LineExtensionAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${shippingNet.toFixed(2)}</LineExtensionAmount>
        <TaxTotal>
          <TaxAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${shippingKdv.toFixed(2)}</TaxAmount>
          <TaxSubtotal>
            <TaxableAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${shippingNet.toFixed(2)}</TaxableAmount>
            <TaxAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${shippingKdv.toFixed(2)}</TaxAmount>
            <Percent xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${shippingKdvRate.toFixed(2)}</Percent>
            <TaxCategory>
              <TaxScheme>
                <Name xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">KDV</Name>
                <TaxTypeCode xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">0015</TaxTypeCode>
              </TaxScheme>
            </TaxCategory>
          </TaxSubtotal>
        </TaxTotal>
        <Item>
          <Name xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">Kargo Taşıma Bedeli</Name>
        </Item>
        <Price>
          <PriceAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${shippingNet.toFixed(4)}</PriceAmount>
        </Price>
      </InvoiceLine>
    `);
  }

  // Kapıda ödeme tahsilat hizmet bedeli varsa kalem olarak ekle
  if (order.codFee && order.codFee > 0) {
    lineCount++;
    const grossCod = order.codFee;
    const codKdvRate = 20.0;
    const codNet = Math.round((grossCod / 1.20) * 100) / 100;
    const codKdv = Math.round((grossCod - codNet) * 100) / 100;

    lineExtensionTotal += codNet;
    taxTotalAmount += codKdv;

    invoiceLinesXml.push(`
      <InvoiceLine xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
        <ID xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${lineCount}</ID>
        <InvoicedQuantity unitCode="C62" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">1.00000</InvoicedQuantity>
        <LineExtensionAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${codNet.toFixed(2)}</LineExtensionAmount>
        <TaxTotal>
          <TaxAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${codKdv.toFixed(2)}</TaxAmount>
          <TaxSubtotal>
            <TaxableAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${codNet.toFixed(2)}</TaxableAmount>
            <TaxAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${codKdv.toFixed(2)}</TaxAmount>
            <Percent xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${codKdvRate.toFixed(2)}</Percent>
            <TaxCategory>
              <TaxScheme>
                <Name xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">KDV</Name>
                <TaxTypeCode xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">0015</TaxTypeCode>
              </TaxScheme>
            </TaxCategory>
          </TaxSubtotal>
        </TaxTotal>
        <Item>
          <Name xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">Kapıda Ödeme Tahsilat Hizmet Bedeli</Name>
        </Item>
        <Price>
          <PriceAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${codNet.toFixed(4)}</PriceAmount>
        </Price>
      </InvoiceLine>
    `);
  }

  // Toplam Tutar
  const payableAmount = order.totalAmount;
  const inWords = numberToWordsTurkish(payableAmount);

  // Müşteri XML bloğu
  const customerPartyXml = isCompany
    ? `
      <PartyName>
        <Name xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${escapeXml(customerTitle)}</Name>
      </PartyName>
    `
    : `
      <Person>
        <FirstName xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${escapeXml(firstName)}</FirstName>
        <FamilyName xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${escapeXml(familyName)}</FamilyName>
      </Person>
    `;

  const operation = options?.isDraft ? 'SaveAsDraft' : 'SendInvoice';

  const soapPayload = `
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <${operation} xmlns="http://tempuri.org/">
      <userInfo Username="${escapeXml(username)}" Password="${escapeXml(password)}"/>
      <invoices>
        <InvoiceInfo LocalDocumentId="${escapeXml(order.orderNumber)}">
          <Invoice>
            <UBLVersionID xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">2.1</UBLVersionID>
            <CustomizationID xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">TR1.2</CustomizationID>
            <ProfileID xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${profileId}</ProfileID>
            <CopyIndicator xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">false</CopyIndicator>
            <UUID xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${uuid}</UUID>
            <IssueDate xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${dateStr}</IssueDate>
            <IssueTime xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${timeStr}</IssueTime>
            <InvoiceTypeCode xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">SATIS</InvoiceTypeCode>
            <Note xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">Yalnız ${inWords}</Note>
            <Note xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">Sipariş No: ${escapeXml(order.orderNumber)}</Note>
            <DocumentCurrencyCode xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">TRY</DocumentCurrencyCode>
            <LineCountNumeric xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${lineCount}</LineCountNumeric>
            
            <AdditionalDocumentReference xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
              <ID xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">0</ID>
              <IssueDate xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${dateStr}</IssueDate>
              <DocumentTypeCode xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">SendingType</DocumentTypeCode>
              <DocumentType xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">ELEKTRONIK</DocumentType>
            </AdditionalDocumentReference>

            <AccountingSupplierParty xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
              <Party>
                <PartyIdentification>
                  <ID schemeID="TCKN" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">15622806404</ID>
                </PartyIdentification>
                <PostalAddress>
                  <StreetName xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">Mahalle/Semt:YUNUSEMRE MAH. Cadde/Sokak:MUHSİN YAZICIOĞLU BLV. No:180 İç Kapı No:28</StreetName>
                  <CitySubdivisionName xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">Yıldırım</CitySubdivisionName>
                  <CityName xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">Bursa</CityName>
                  <Country>
                    <Name xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">Türkiye</Name>
                  </Country>
                </PostalAddress>
                <PartyTaxScheme>
                  <TaxScheme>
                    <Name xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">YILDIRIM VERGİ DAİRESİ MÜD.</Name>
                  </TaxScheme>
                </PartyTaxScheme>
                <Person>
                  <FirstName xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">KEMAL</FirstName>
                  <FamilyName xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">BOSTAN</FamilyName>
                </Person>
              </Party>
            </AccountingSupplierParty>

            <AccountingCustomerParty xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
              <Party>
                <PartyIdentification>
                  <ID schemeID="${isCompany ? 'VKN' : 'TCKN'}" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${escapeXml(customerTckn)}</ID>
                </PartyIdentification>
                <PostalAddress>
                  <StreetName xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${escapeXml(streetName)}</StreetName>
                  <CitySubdivisionName xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${escapeXml(districtName)}</CitySubdivisionName>
                  <CityName xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${escapeXml(cityName)}</CityName>
                  <Country>
                    <IdentificationCode xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">TR</IdentificationCode>
                    <Name xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">Türkiye</Name>
                  </Country>
                </PostalAddress>
                <PartyTaxScheme>
                  <TaxScheme>
                    <Name xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${escapeXml(options?.customTaxOffice || '')}</Name>
                  </TaxScheme>
                </PartyTaxScheme>
                ${customerPartyXml}
              </Party>
            </AccountingCustomerParty>
 
            <PaymentMeans xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
              <PaymentMeansCode xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${bienPayment.paymentMeansCode}</PaymentMeansCode>
              <PaymentDueDate xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${dateStr}</PaymentDueDate>
            </PaymentMeans>

            <TaxTotal xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
              <TaxAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${taxTotalAmount.toFixed(2)}</TaxAmount>
              <TaxSubtotal>
                <TaxableAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${lineExtensionTotal.toFixed(2)}</TaxableAmount>
                <TaxAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${taxTotalAmount.toFixed(2)}</TaxAmount>
                <Percent xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">10.00</Percent>
                <TaxCategory>
                  <TaxScheme>
                    <Name xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">KDV</Name>
                    <TaxTypeCode xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">0015</TaxTypeCode>
                  </TaxScheme>
                </TaxCategory>
              </TaxSubtotal>
            </TaxTotal>

            <LegalMonetaryTotal xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
              <LineExtensionAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${lineExtensionTotal.toFixed(2)}</LineExtensionAmount>
              <TaxExclusiveAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${lineExtensionTotal.toFixed(2)}</TaxExclusiveAmount>
              <TaxInclusiveAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${payableAmount.toFixed(2)}</TaxInclusiveAmount>
              <PayableAmount currencyID="TRY" xmlns="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">${payableAmount.toFixed(2)}</PayableAmount>
            </LegalMonetaryTotal>

            ${invoiceLinesXml.join('\n')}
          </Invoice>
          
          <TargetCustomer VknTckn="${escapeXml(customerTckn)}" Title="${escapeXml(customerTitle)}"/>
          ${
            !isEInvoice
              ? `
          <EArchiveInvoiceInfo DeliveryType="Electronic">
            <InternetSalesInfo>
              <WebAddress>https://eslakids.com</WebAddress>
              <PaymentType>${bienPayment.paymentType}</PaymentType>
              <PaymentDate>${dateStr}T${timeStr}Z</PaymentDate>
            </InternetSalesInfo>
          </EArchiveInvoiceInfo>
          `
              : ''
          }
          <Scenario>Automated</Scenario>
          <CreateDateUtc>${dateStr}T${timeStr}Z</CreateDateUtc>
        </InvoiceInfo>
      </invoices>
    </${operation}>
  </s:Body>
</s:Envelope>
`;

  try {
    const res = await sendSoapRequest(operation, soapPayload);
    if (res.status === 200 && res.body.includes('IsSucceded="true"')) {
      const idMatch = res.body.match(/Id="([^"]+)"/);
      const numberMatch = res.body.match(/Number="([^"]+)"/);
      const scenarioMatch = res.body.match(/InvoiceScenario="([^"]+)"/);

      const invoiceUuid = idMatch ? idMatch[1] : uuid;
      const invoiceNumber = numberMatch ? numberMatch[1] : `EAR-${Date.now()}`;
      const detectedScenario = scenarioMatch ? scenarioMatch[1] : scenario;

      // Veritabanını güncelle
      await prisma.order.update({
        where: { id: order.id },
        data: {
          invoiceStatus: 'INVOICED',
          invoiceNumber,
          invoiceUuid,
          invoicedAt: new Date(),
          invoiceError: null,
        },
      });

      // Aktivite günlüğü
      await prisma.activityLog.create({
        data: {
          action: 'ORDER_INVOICED_BIEN',
          entity: 'Order',
          entityId: order.id,
          performedBy: 'Yönetici',
          details: `Bien Portal üzerinden e-Fatura/e-Arşiv kesildi: ${invoiceNumber} (${detectedScenario})`,
        },
      }).catch((e) => console.warn('ActivityLog error:', e));

      return {
        success: true,
        invoiceNumber,
        invoiceUuid,
        scenario: detectedScenario,
      };
    }

    // Hata durumunu yakala
    const errMatch = res.body.match(/Message="([^"]+)"/) || res.body.match(/faultstring[^>]*>([^<]+)<\//i);
    const errorMsg = errMatch ? errMatch[1] : 'Bien Portal fatura oluştururken hata verdi.';

    await prisma.order.update({
      where: { id: order.id },
      data: {
        invoiceStatus: 'FAILED',
        invoiceError: errorMsg,
      },
    }).catch(() => {});

    return { success: false, error: errorMsg };
  } catch (err: any) {
    const errorMsg = err.message || 'Bien API bağlantı hatası';
    await prisma.order.update({
      where: { id: order.id },
      data: {
        invoiceStatus: 'FAILED',
        invoiceError: errorMsg,
      },
    }).catch(() => {});
    return { success: false, error: errorMsg };
  }
}

// 4. Bien Portal'dan faturanın resmi PDF'ini çekme
export async function getBienInvoicePdf(invoiceUuidOrId: string, settings?: SiteSettings): Promise<Buffer | null> {
  const s = settings || (await getSettings());
  const username = s.bien_username || 'info@eslakids.com';
  const password = s.bien_password || 'Tpass147852*';

  const soapXml = `
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <GetOutboxInvoicePdf xmlns="http://tempuri.org/">
      <userInfo Username="${escapeXml(username)}" Password="${escapeXml(password)}"/>
      <invoiceId>${escapeXml(invoiceUuidOrId)}</invoiceId>
    </GetOutboxInvoicePdf>
  </s:Body>
</s:Envelope>
`;

  try {
    const res = await sendSoapRequest('GetOutboxInvoicePdf', soapXml);
    if (res.status === 200 && res.body.includes('IsSucceded="true"')) {
      const dataAttrMatch = res.body.match(/Data="([^"]+)"/);
      if (dataAttrMatch) {
        return Buffer.from(dataAttrMatch[1], 'base64');
      }
      const dataElemMatch = res.body.match(/<Data[^>]*>([\s\S]*?)<\/Data>/i);
      if (dataElemMatch) {
        return Buffer.from(dataElemMatch[1].trim(), 'base64');
      }
    }
    return null;
  } catch (err) {
    console.error('getBienInvoicePdf error:', err);
    return null;
  }
}
