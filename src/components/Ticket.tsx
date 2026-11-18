import type { ReactNode } from 'react';

// Le billet orange : utilisé sur la page d'accueil et pour l'invitation personnelle.
export function Ticket(props: {
  kind: string;
  names: string[];
  date: string;
  place?: string;
  qr: ReactNode;
  guestName?: string;
  guestLine?: string;
}) {
  return (
    <div className="ticket">
      <div className="ticket-main">
        <div className="ticket-kind">{props.kind}</div>
        <div className="ticket-names">
          {props.names.map((n, i) => (
            <span key={i}>{n}</span>
          ))}
        </div>
        <div className="ticket-meta">
          <b>{props.date}</b>
          {props.place && <span>{props.place}</span>}
        </div>
      </div>
      <div className="ticket-stub">
        <div className="ticket-qr">{props.qr}</div>
        {props.guestName && (
          <div className="ticket-guest">
            <b>{props.guestName}</b>
            {props.guestLine}
          </div>
        )}
      </div>
    </div>
  );
}
