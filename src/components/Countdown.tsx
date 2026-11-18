'use client';

import { useEffect, useState } from 'react';

export function Countdown({ date, time }: { date: string; time: string }) {
  const target = new Date(`${date}T${time || '12:00'}:00`).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <div className="countdown" style={{ minHeight: 88 }} />;
  const diff = target - now;
  if (diff <= 0) {
    const days = Math.floor(-diff / 86400000);
    return <p style={{ fontSize: 20, fontWeight: 600 }}>{days === 0 ? 'C’est aujourd’hui.' : 'La fête a eu lieu. Les souvenirs sont ici.'}</p>;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return (
    <div className="countdown" aria-label={`Dans ${d} jours, ${h} heures et ${m} minutes`}>
      <div>
        <b>{d}</b>
        <span>jour{d > 1 ? 's' : ''}</span>
      </div>
      <div>
        <b>{h}</b>
        <span>heure{h > 1 ? 's' : ''}</span>
      </div>
      <div>
        <b>{m}</b>
        <span>minute{m > 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
