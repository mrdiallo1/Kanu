import '@/components/chat.css';

// Affiché instantanément pendant que la liste se prépare
export default function Loading() {
  return (
    <div className="wa-list" aria-busy="true" aria-label="Chargement des discussions">
      <header className="wa-head">
        <h1>Discussions</h1>
      </header>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="wa-skel" style={{ opacity: 1 - i * 0.13 }}>
          <i style={{ width: 52, height: 52 }} />
          <span style={{ flex: 1, display: 'grid', gap: 8 }}>
            <i style={{ width: '55%', height: 14 }} />
            <i style={{ width: '80%', height: 12 }} />
          </span>
        </div>
      ))}
    </div>
  );
}
