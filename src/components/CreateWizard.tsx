'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PLANS, PLAN_ORDER, type PlanId } from '@/config/plans';
import type { EventType, ProgramItem } from '@/lib/types';
import { ProgramEditor } from './ProgramEditor';

const DEFAULT_PROGRAM: Record<EventType, ProgramItem[]> = {
  mariage: [
    { time: '15:00', label: 'Cérémonie' },
    { time: '17:00', label: 'Séance photo' },
    { time: '20:00', label: 'Dîner' },
    { time: '22:00', label: 'Soirée dansante' },
  ],
  bapteme: [
    { time: '08:00', label: 'Baptême et annonce du prénom' },
    { time: '10:00', label: 'Petit-déjeuner' },
    { time: '13:00', label: 'Repas' },
  ],
};

const STEPS = ['La fête', 'Les personnes', 'Date et lieux', 'Programme', 'Offre'];

export function CreateWizard({ initialPlan }: { initialPlan: PlanId }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    type: 'mariage' as EventType,
    hostA: '',
    hostB: '',
    babyName: '',
    date: '',
    time: '15:00',
    ceremonyPlace: '',
    receptionPlace: '',
    welcome: '',
    story: '',
    plan: initialPlan,
    program: DEFAULT_PROGRAM.mariage,
  });
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const bapteme = f.type === 'bapteme';

  function check(): string {
    if (step === 1) {
      if (bapteme && !f.babyName.trim()) return 'Indiquez le prénom de l’enfant.';
      if (!f.hostA.trim() || !f.hostB.trim())
        return bapteme ? 'Indiquez le nom du père et de la mère.' : 'Indiquez le nom des deux mariés.';
    }
    if (step === 2 && !f.date) return 'Choisissez la date.';
    return '';
  }

  async function next(e: React.FormEvent) {
    e.preventDefault();
    const msg = check();
    if (msg) return setError(msg);
    setError('');
    if (step < STEPS.length - 1) return setStep(step + 1);

    setBusy(true);
    const res = await fetch('/api/espaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(json.error || 'La création a échoué. Réessayez.');
    }
    router.push(`/paiement/${json.id}`);
  }

  return (
    <form onSubmit={next}>
      <p className="muted small">
        Étape {step + 1} sur {STEPS.length} : {STEPS[step]}
      </p>
      <div className="progress" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s} className={i <= step ? 'on' : ''} />
        ))}
      </div>

      {step === 0 && (
        <div className="stack" style={{ ['--gap' as string]: '24px' }}>
          <h2>Que fêtez-vous ?</h2>
          <div className="choice-grid">
            {(
              [
                ['mariage', 'Mariage', 'Cérémonie, dîner, soirée : invitations et souvenirs des deux familles.'],
                ['bapteme', 'Baptême', 'L’annonce du prénom, le repas et les vœux pour l’enfant.'],
              ] as const
            ).map(([id, label, text]) => (
              <button
                type="button"
                key={id}
                className="choice"
                aria-pressed={f.type === id}
                onClick={() => set({ type: id, program: DEFAULT_PROGRAM[id], time: id === 'bapteme' ? '08:00' : '15:00' })}
              >
                <b>{label}</b>
                <span className="muted">{text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="stack" style={{ ['--gap' as string]: '18px' }}>
          <h2>{bapteme ? 'L’enfant et ses parents' : 'Les mariés'}</h2>
          {bapteme && (
            <label className="field">
              <span>Prénom de l’enfant</span>
              <input value={f.babyName} onChange={(e) => set({ babyName: e.target.value })} placeholder="Fatoumata" autoFocus />
              <small>Si le prénom est annoncé le jour même, écrivez « Bébé » et modifiez-le ensuite.</small>
            </label>
          )}
          <div className="grid-2">
            <label className="field">
              <span>{bapteme ? 'Le père' : 'La mariée'}</span>
              <input
                value={f.hostA}
                onChange={(e) => set({ hostA: e.target.value })}
                placeholder={bapteme ? 'Seydou Diarra' : 'Awa'}
                autoFocus={!bapteme}
              />
            </label>
            <label className="field">
              <span>{bapteme ? 'La mère' : 'Le marié'}</span>
              <input value={f.hostB} onChange={(e) => set({ hostB: e.target.value })} placeholder={bapteme ? 'Kadiatou Sow' : 'Ibrahim'} />
            </label>
          </div>
          {!bapteme && <p className="small muted">Le prénom suffit, c’est ce qui s’affichera en grand sur l’invitation.</p>}
        </div>
      )}

      {step === 2 && (
        <div className="stack" style={{ ['--gap' as string]: '18px' }}>
          <h2>Quand et où ?</h2>
          <div className="grid-2">
            <label className="field">
              <span>Date</span>
              <input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
            </label>
            <label className="field">
              <span>Heure de début</span>
              <input type="time" value={f.time} onChange={(e) => set({ time: e.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>{bapteme ? 'Lieu du baptême' : 'Lieu de la cérémonie'}</span>
            <input
              value={f.ceremonyPlace}
              onChange={(e) => set({ ceremonyPlace: e.target.value })}
              placeholder="Domicile familial, Badalabougou"
            />
          </label>
          <label className="field">
            <span>{bapteme ? 'Lieu du repas' : 'Lieu du dîner ou de la réception'}</span>
            <input
              value={f.receptionPlace}
              onChange={(e) => set({ receptionPlace: e.target.value })}
              placeholder="Hôtel Salam, Bamako"
            />
            <small>Laissez vide si tout se passe au même endroit.</small>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="stack" style={{ ['--gap' as string]: '18px' }}>
          <h2>Le programme et vos mots</h2>
          <ProgramEditor value={f.program} onChange={(program) => set({ program })} />
          <label className="field">
            <span>Message de bienvenue</span>
            <textarea
              value={f.welcome}
              onChange={(e) => set({ welcome: e.target.value })}
              placeholder="Merci d’être avec nous. Partagez ici vos photos et laissez-nous un mot."
            />
          </label>
          {!bapteme && (
            <label className="field">
              <span>Votre histoire (facultatif)</span>
              <textarea value={f.story} onChange={(e) => set({ story: e.target.value })} placeholder="Comment vous vous êtes rencontrés…" />
            </label>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="stack" style={{ ['--gap' as string]: '18px' }}>
          <h2>Choisissez votre offre</h2>
          <div className="stack" style={{ ['--gap' as string]: '12px' }}>
            {PLAN_ORDER.map((id) => {
              const p = PLANS[id];
              return (
                <button type="button" key={id} className="choice" aria-pressed={f.plan === id} onClick={() => set({ plan: id })}>
                  <span className="row between">
                    <b>{p.name}</b>
                    <span className="price">{new Intl.NumberFormat('fr-FR').format(p.price).replace(/ /g, ' ')} FCFA</span>
                  </span>
                  <span className="muted">
                    {p.maxGuests} invités, {p.storageGb} Go, gardé {p.retentionDays} jours après la fête. {p.pitch}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="small muted">Vous paierez à l’étape suivante. L’espace est ouvert aux invités dès le paiement validé.</p>
        </div>
      )}

      {error && (
        <p className="alert err" role="alert" style={{ marginTop: 20 }}>
          {error}
        </p>
      )}

      <div className="row between" style={{ marginTop: 32 }}>
        {step > 0 ? (
          <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}>
            Retour
          </button>
        ) : (
          <span />
        )}
        <button className="btn" disabled={busy}>
          {step < STEPS.length - 1 ? 'Continuer' : busy ? 'Création…' : 'Créer et payer'}
        </button>
      </div>
    </form>
  );
}
