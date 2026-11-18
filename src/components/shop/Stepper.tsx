'use client';

export function Stepper({ value, min = 1, max = 99999, onChange, small }: { value: number; min?: number; max?: number; onChange: (v: number) => void; small?: boolean }) {
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v) || min));
  return (
    <div className={`stepper${small ? ' sm' : ''}`}>
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label="Moins">
        −
      </button>
      <input type="number" inputMode="numeric" value={value} min={min} max={max} onChange={(e) => onChange(clamp(Number(e.target.value)))} aria-label="Quantité" />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label="Plus">
        +
      </button>
    </div>
  );
}
