import QRCode from 'qrcode';

/** QR code en SVG (côté serveur), encre sombre sur fond blanc pour un scan fiable. */
export async function qrSvg(text: string) {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#21140D', light: '#FFFFFF' },
  });
}
