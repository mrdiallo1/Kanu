'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** Affiche un QR code, ou un bouton pour le télécharger en image (à envoyer par WhatsApp). */
export function QrImage({ text, download }: { text: string; download?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(text, { margin: download ? 3 : 0, width: download ? 900 : 400, color: { dark: '#21140D', light: '#FFFFFF' } })
      .then(setSrc)
      .catch(() => setSrc(''));
  }, [text, download]);

  if (download) {
    return src ? (
      <a className="btn ghost sm" href={src} download={download.replace(/[^\w.\- ]+/g, '_')}>
        Télécharger l’image du QR code
      </a>
    ) : null;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="QR code d’entrée" style={{ width: '100%', imageRendering: 'pixelated' }} /> : <div style={{ aspectRatio: 1 }} />;
}
