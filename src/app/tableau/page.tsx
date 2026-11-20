import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { currentUser } from '@/lib/auth';
import * as db from '@/lib/db';
import { eventTitle, longDate, typeLabel } from '@/lib/format';
import { PLANS } from '@/config/plans';
import { StatusPill } from '@/components/StatusPill';

export const metadata = {
  title: 'Mes espaces',
};

const styles = `
.dashboard {
  min-height: 80vh;
  padding-top: 42px;
  padding-bottom: 80px;
  color: var(--encre);
}

.dashboard-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 38px;
}

.dashboard-eyebrow {
  color: var(--orange-fonce);
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .09em;
  margin-bottom: 9px;
}

.dashboard-title {
  font-size: clamp(30px, 5vw, 46px);
  line-height: 1.1;
  letter-spacing: -.045em;
  font-weight: 800;
  margin: 0;
}

.dashboard-description {
  margin-top: 10px;
  color: var(--encre-2);
  font-size: 16px;
  line-height: 1.6;
}

.dashboard-create {
  flex-shrink: 0;
}

.dashboard-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.dashboard-summary h2 {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -.02em;
  margin: 0;
}

.dashboard-count {
  background: #fff0e6;
  color: var(--orange-fonce);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 800;
}

.event-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.event-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 24px;
  border: 1px solid #eee8e2;
  border-radius: 20px;
  background: #fff;
  text-decoration: none;
  color: inherit;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  box-shadow: 0 4px 18px rgba(33, 20, 13, .035);
}

.event-card:hover {
  transform: translateY(-3px);
  border-color: #ffc49f;
  box-shadow: 0 12px 32px rgba(33, 20, 13, .08);
}

.event-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.event-type {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--orange-fonce);
  background: #fff3eb;
  padding: 7px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.event-name {
  font-size: 23px;
  font-weight: 800;
  letter-spacing: -.035em;
  line-height: 1.25;
  margin: 20px 0 8px;
  overflow-wrap: anywhere;
}

.event-date {
  color: var(--encre-2);
  font-size: 14px;
}

.event-divider {
  height: 1px;
  background: #f0ece8;
  margin: 22px 0 17px;
}

.event-card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.event-plan-label {
  display: block;
  color: var(--encre-3);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: 5px;
}

.event-plan-name {
  font-size: 14px;
  font-weight: 750;
}

.event-open {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--orange-fonce);
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.empty-dashboard {
  padding: 56px 24px;
  border: 1px dashed #e6d9cf;
  border-radius: 22px;
  background: #fff;
  text-align: center;
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 66px;
  height: 66px;
  margin: 0 auto 20px;
  border-radius: 20px;
  background: #fff1e7;
  font-size: 30px;
}

.empty-dashboard h2 {
  font-size: 23px;
  font-weight: 800;
  letter-spacing: -.03em;
  margin: 0;
}

.empty-dashboard p {
  max-width: 430px;
  margin: 12px auto 24px;
  color: var(--encre-2);
  line-height: 1.7;
}

@media (max-width: 700px) {
  .dashboard {
    padding-top: 28px;
    padding-bottom: 48px;
  }

  .dashboard-top {
    align-items: flex-start;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 32px;
  }

  .dashboard-create {
    width: 100%;
  }

  .dashboard-create .btn {
    display: flex;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
  }

  .event-grid {
    grid-template-columns: 1fr;
    gap: 13px;
  }

  .event-card {
    padding: 20px;
    border-radius: 17px;
  }

  .event-name {
    font-size: 21px;
    margin-top: 17px;
  }

  .empty-dashboard {
    padding: 42px 20px;
  }

  .dashboard-description {
    font-size: 14px;
  }
}
`;

export default async function Page() {
  const user = await currentUser();

  if (!user) redirect('/connexion');

  const list = await db.events.byOwner(user.id);

  return (
    <>
      <style>{styles}</style>
      <SiteHeader />

      <main className="wrap dashboard">
        <section className="dashboard-top">
          <div>
            <p className="dashboard-eyebrow">Votre espace personnel</p>
            <h1 className="dashboard-title">
              Bonjour {user.name.split(' ')[0]} 👋
            </h1>
            <p className="dashboard-description">
              Retrouvez et gérez tous vos événements au même endroit.
            </p>
          </div>

          <div className="dashboard-create">
            <Link href="/creer" className="btn">
              + Créer un espace
            </Link>
          </div>
        </section>

        {list.length === 0 ? (
          <section className="empty-dashboard">
            <div className="empty-icon">🎉</div>

            <h2>Votre première fête commence ici</h2>

            <p>
              Vous n'avez pas encore créé d'espace. Préparez votre mariage
              ou votre baptême et rassemblez toutes les informations
              dans un seul endroit.
            </p>

            <Link href="/creer" className="btn">
              Créer mon premier espace
            </Link>
          </section>
        ) : (
          <>
            <div className="dashboard-summary">
              <h2>Mes événements</h2>
              <span className="dashboard-count">
                {list.length} {list.length > 1 ? 'espaces' : 'espace'}
              </span>
            </div>

            <section className="event-grid">
              {list.map((e) => (
                <Link
                  key={e.id}
                  href={`/tableau/${e.id}`}
                  className="event-card"
                >
                  <div className="event-card-top">
                    <span className="event-type">
                      {e.type === 'mariage' ? '💍' : '👶'}
                      {typeLabel(e.type)}
                    </span>

                    <StatusPill event={e} />
                  </div>

                  <h3 className="event-name">
                    {eventTitle(e)}
                  </h3>

                  <p className="event-date">
                    📅 {longDate(e.date)}
                  </p>

                  <div className="event-divider" />

                  <div className="event-card-bottom">
                    <div>
                      <span className="event-plan-label">
                        Votre offre
                      </span>
                      <span className="event-plan-name">
                        {PLANS[e.plan]?.name ?? e.plan}
                      </span>
                    </div>

                    <span className="event-open">
                      Ouvrir l'espace <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}