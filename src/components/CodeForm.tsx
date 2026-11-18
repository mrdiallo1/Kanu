
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';

type Invitation = {
  slug: string;
  code: string;
};

export function CodeForm() {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError('');

    if (invitation) {
      router.push(
        `/e/${invitation.slug}?code=${encodeURIComponent(invitation.code)}`,
      );
      return;
    }

    setLoading(true);

    try {
      const r = await api<Invitation>(
        '/api/rejoindre',
        'POST',
        { code },
      );

      if (!r.ok) {
        setError(r.error);
        return;
      }

      setInvitation(r.data);
      setImageError(false);
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(value: string) {
    setCode(value.toUpperCase().replace(/\s/g, '').slice(0, 7));
    setInvitation(null);
    setImageError(false);
    setError('');
  }

  const imageUrl = invitation
    ? `/api/apercu/${encodeURIComponent(invitation.slug)}`
    : '';

  return (
    <section className="invitation-access">
      <div className="access-heading">
        <span className="access-eyebrow">BIENVENUE</span>

        <h1>Vous êtes invités !</h1>

        <p>
          Un joli moment vous attend.
          Entrez votre code pour découvrir votre invitation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="access-form">
        <label htmlFor="invitation-code">
          Code d'invitation
        </label>

        <input
          id="invitation-code"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="K7M-4QP"
          required
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={7}
          disabled={loading}
          style={{
            letterSpacing: '0.15em',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        />

        {error && (
          <p className="access-error" role="alert">
            {error}
          </p>
        )}

        {invitation && (
          <div className="invitation-preview">
            <div className="preview-image">
              {!imageError ? (
                <img
                  src={imageUrl}
                  alt="Aperçu de votre invitation"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="preview-placeholder">
                  <span>✦</span>
                  <strong>Votre invitation</strong>
                  <p>Votre événement vous attend</p>
                </div>
              )}

              {!imageError && (
                <div className="preview-overlay">
                  <span>VOTRE INVITATION</span>
                  <strong>Un moment unique à partager</strong>
                </div>
              )}
            </div>

            <div className="preview-message">
              <span>✦</span>
              <p>
                Votre invitation est prête.
                Découvrez tous les détails de l'événement.
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="access-button"
          disabled={loading || !code.trim()}
        >
          <span>
            {loading
              ? 'Vérification...'
              : invitation
                ? 'Découvrir mon invitation'
                : 'Afficher mon invitation'}
          </span>

          {!loading && <span className="button-arrow">→</span>}
        </button>
      </form>

      <div className="access-footer">
        <span>✦</span>
        Une invitation, un souvenir, un moment précieux.
      </div>

      <style jsx>{`
        .invitation-access {
          width: 100%;
          max-width: 470px;
          margin: auto;
          padding: 36px;
          background: #fff;
          border: 1px solid #f1ebe5;
          border-radius: 24px;
          box-shadow: 0 18px 55px rgba(50, 35, 25, 0.07);
          box-sizing: border-box;
        }

        .access-heading {
          text-align: center;
          margin-bottom: 30px;
        }

        .access-eyebrow {
          display: inline-block;
          color: #d96b3b;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.25em;
        }

        .access-heading h1 {
          margin: 13px 0 10px;
          color: #29221e;
          font-family: Georgia, serif;
          font-size: clamp(27px, 5vw, 36px);
          font-weight: 500;
          line-height: 1.2;
        }

        .access-heading p {
          max-width: 330px;
          margin: auto;
          color: #88817b;
          font-size: 13px;
          line-height: 1.8;
        }

        .access-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .access-form label {
          color: #443c36;
          font-size: 13px;
          font-weight: 700;
        }

        .access-form input {
          width: 100%;
          min-height: 58px;
          padding: 12px 16px;
          border: 1px solid #e9e1da;
          border-radius: 12px;
          background: #fcfaf8;
          color: #332b25;
          font-size: 20px;
          text-align: center;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .access-form input:focus {
          border-color: #d96b3b;
          box-shadow: 0 0 0 3px rgba(217, 107, 59, 0.10);
        }

        .access-form input:disabled {
          opacity: 0.65;
        }

        .access-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          width: 100%;
          min-height: 55px;
          margin-top: 8px;
          padding: 12px 18px;
          border: none;
          border-radius: 12px;
          background: #d96b3b;
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
        }

        .access-button:hover:not(:disabled) {
          background: #c5572c;
          transform: translateY(-1px);
        }

        .access-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .button-arrow {
          font-size: 20px;
        }

        .access-error {
          color: #c0392b;
          font-size: 13px;
          margin: 0;
          line-height: 1.5;
        }

        .invitation-preview {
          overflow: hidden;
          border: 1px solid #eee5dc;
          border-radius: 15px;
          background: #fff;
          margin-top: 10px;
        }

        .preview-image {
          position: relative;
          width: 100%;
          aspect-ratio: 1.9 / 1;
          overflow: hidden;
          background: #f4e8df;
        }

        .preview-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .preview-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 22px;
          background: linear-gradient(
            transparent 15%,
            rgba(0, 0, 0, 0.58)
          );
          color: white;
          pointer-events: none;
        }

        .preview-overlay span {
          font-size: 10px;
          letter-spacing: 0.2em;
          font-weight: 700;
        }

        .preview-overlay strong {
          margin-top: 7px;
          font-family: Georgia, serif;
          font-size: 21px;
          font-weight: 500;
        }

        .preview-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: #76513d;
          background: linear-gradient(135deg, #f8e8dc, #f1d7c6);
          text-align: center;
        }

        .preview-placeholder span {
          font-size: 30px;
          color: #d96b3b;
        }

        .preview-placeholder strong {
          margin-top: 8px;
          font-family: Georgia, serif;
          font-size: 22px;
          font-weight: 500;
        }

        .preview-placeholder p {
          margin: 6px 0 0;
          font-size: 12px;
        }

        .preview-message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
        }

        .preview-message span {
          color: #d96b3b;
          font-size: 23px;
        }

        .preview-message p {
          margin: 0;
          color: #766d65;
          font-size: 12px;
          line-height: 1.6;
        }

        .access-footer {
          margin-top: 27px;
          text-align: center;
          color: #a49a91;
          font-size: 11px;
          line-height: 1.6;
        }

        .access-footer span {
          color: #d96b3b;
          margin-right: 5px;
        }

        @media (max-width: 480px) {
          .invitation-access {
            padding: 26px 19px;
            border-radius: 18px;
            box-shadow: none;
          }

          .access-heading {
            margin-bottom: 25px;
          }
        }
      `}</style>
    </section>
  );
}
