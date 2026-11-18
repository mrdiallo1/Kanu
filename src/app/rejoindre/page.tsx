
import { SiteHeader } from '@/components/SiteHeader';
import { CodeForm } from '@/components/CodeForm';

export const metadata = {
  title: "Rejoindre une invitation",
  description: "Retrouvez votre invitation et découvrez les détails de l'événement.",
};

export default function Page() {
  return (
    <>
      <SiteHeader />

      <main className="auth">
        <section className="auth-side">
          <div>
            <span>VOTRE MOMENT, VOTRE HISTOIRE</span>

            <h2>
              Une belle
              <br />
              histoire commence
              <br />
              <span>par une invitation.</span>
            </h2>

            <p>
              Un mariage, un baptême ou un moment précieux à célébrer.
              Entrez votre code personnel pour retrouver votre invitation
              et toutes les informations de l'événement.
            </p>

            <div className="invitation-note">
              <span>✦</span>
              <p>
                Votre code personnel se trouve dans le message
                d'invitation que vous avez reçu.
              </p>
            </div>
          </div>
        </section>

        <section className="auth-form">
          <CodeForm />
        </section>
      </main>
    </>
  );
}
