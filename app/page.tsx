import { requireSession } from "@/lib/auth";
import { games, type Summary } from "@/lib/games";

export const dynamic = "force-dynamic";

function ago(iso: string): string {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}

function Card({ s }: { s: Summary }) {
  const c = s.counts ?? { problems: 0, not_made: 0, placeholders: 0, undecided: 0, review: 0 };
  return (
    <a className="game" href={`/g/${s.game}`}>
      <span className="lab">{s.now ? `Cycle ${s.now.cycle} · ${s.now.stage}` : "No cycle yet"}</span>
      <h2>{s.name}</h2>
      <div className="row"><span className="pct">{s.complete ?? 0}%</span>{s.now ? <span className="now">{s.now.name}</span> : null}</div>
      <div className="bars">{(s.stages ?? []).map((st, i) => <div key={i} title={st.name}><i style={{ width: `${st.complete ?? 0}%` }} /></div>)}</div>
      <div className="chips">
        {c.review ? <span className="chip bad">Waiting on you {c.review}</span> : null}
        {c.problems ? <span className="chip bad">Problems {c.problems}</span> : null}
        {c.not_made ? <span className="chip">Not made {c.not_made}</span> : null}
        {c.placeholders ? <span className="chip">Placeholders {c.placeholders}</span> : null}
      </div>
      <span className="when">Updated {ago(s.received)}</span>
    </a>
  );
}

export default async function Home() {
  await requireSession();
  const all = await games();
  return (
    <main className="wrap">
      <div className="top">
        <div><span className="lab">Game boards</span><h1>Your games</h1></div>
        <form method="post" action="/api/logout"><button className="btn" type="submit">Sign out</button></form>
      </div>
      {all.length ? (
        <div className="games">{all.map((s) => <Card key={s.game} s={s} />)}</div>
      ) : (
        <div className="empty">
          No game has sent its board yet. In a game repository, set <code>board.service</code> in kit.config.json and run{" "}
          <code>board.py push</code> once — after that every turn sends it.
        </div>
      )}
    </main>
  );
}
