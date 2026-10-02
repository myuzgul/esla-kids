import QRCode from 'qrcode';

export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 160,
      margin: 1,
      color: {
        dark: '#2D3142',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return '';
  }
}

export async function generateQrSvg(text: string): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      margin: 1,
      width: 140,
      color: {
        dark: '#2D3142',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR svg:', err);
    return '';
  }
}
