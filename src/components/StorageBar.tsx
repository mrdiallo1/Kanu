import { bytes } from '@/lib/format';

const COLORS = { photo: '#FF5A00', video: '#21140D', audio: '#F4A06B' };
const LABELS = { photo: 'Photos', video: 'Vidéos', audio: 'Vocaux' };

export function StorageBar({ total, usage }: { total: number; usage: { photo: number; video: number; audio: number } }) {
  const keys = ['photo', 'video', 'audio'] as const;
  return (
    <div>
      <div className="bar" role="img" aria-label="Répartition du stockage">
        {keys.map((k) => (
          <span key={k} style={{ width: `${(usage[k] / total) * 100}%`, background: COLORS[k], minWidth: usage[k] ? 3 : 0 }} />
        ))}
      </div>
      <div className="legend">
        {keys.map((k) => (
          <span key={k}>
            <i style={{ background: COLORS[k] }} />
            {LABELS[k]} {bytes(usage[k])}
          </span>
        ))}
      </div>
    </div>
  );
}
