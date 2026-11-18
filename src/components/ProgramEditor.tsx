'use client';

import type { ProgramItem } from '@/lib/types';

export function ProgramEditor({ value, onChange }: { value: ProgramItem[]; onChange: (v: ProgramItem[]) => void }) {
  const update = (i: number, patch: Partial<ProgramItem>) =>
    onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, ['--gap' as string]: '10px' }}>
      <legend style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Programme de la journée</legend>
      {value.map((p, i) => (
        <div className="program-row" key={i}>
          <input
            className="input"
            type="time"
            aria-label="Heure"
            value={p.time}
            onChange={(e) => update(i, { time: e.target.value })}
          />
          <input
            className="input"
            aria-label="Moment"
            value={p.label}
            placeholder="Dîner"
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <button
            type="button"
            className="link-btn red"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            aria-label={`Retirer ${p.label || 'ce moment'}`}
          >
            Retirer
          </button>
        </div>
      ))}
      <div>
        <button type="button" className="btn quiet sm" onClick={() => onChange([...value, { time: '', label: '' }])}>
          Ajouter un moment
        </button>
      </div>
    </fieldset>
  );
}
