import { requireSession } from "@/lib/auth";
import { ago, games, type Summary } from "@/lib/games";
import ThemePicker from "./theme-picker";

export const dynamic = "force-dynamic";

const zero = { problems: 0, not_made: 0, placeholders: 0, undecided: 0, review: 0, old_style: 0 };

function Ring({ p }: { p: number }) {
  return <div className="ring" style={{ ["--p" as string]: p }}><b>{p}</b></div>;
}

function Game({ s }: { s: Summary }) {
  const c = { ...zero, ...s.counts };
  return (
    <a className="card link game" href={`/g/${s.game}`}>
      <div className="head">
        <Ring p={s.complete ?? 0} />
        <div style={{ minWidth: 0 }}>
          <span className="lab">{s.now ? `Cycle ${s.now.cycle} · ${s.now.stage}` : "No cycle yet"}</span>
          <h2>{s.name}</h2>
          {s.now ? <div className="small muted">{s.now.name}</div> : null}
        </div>
      </div>
      <div className="stages">{(s.stages ?? []).map((st, i) => <div key={i} title={`${st.name} · ${st.complete ?? "—"}%`}><i style={{ width: `${st.complete ?? 0}%` }} /></div>)}</div>
      <div className="chips">
        {c.review ? <span className="chip bad">Waiting on you {c.review}</span> : <span className="chip acc">Nothing waits</span>}
        {c.problems ? <span className="chip bad">Problems {c.problems}</span> : null}
        {c.not_made ? <span className="chip">Not made {c.not_made}</span> : null}
        {c.placeholders ? <span className="chip">Placeholders {c.placeholders}</span> : null}
      </div>
      <div className="foot"><span>Updated {ago(s.received)}</span><span>Open →</span></div>
    </a>
  );
}

export default async function Home() {
  await requireSession();
  const all = await games();
  const sum = (k: keyof typeof zero) => all.reduce((n, s) => n + ((s.counts ?? zero)[k] ?? 0), 0);
  const waiting = all.filter((s) => s.counts?.review);
  return (
    <>
      <header className="topbar">
        <div className="in">
          <div className="title"><span className="lab">Game boards</span><b>Your games</b></div>
          <div className="right">
            <ThemePicker />
            <form method="post" action="/api/logout"><button className="btn ghost" type="submit">Sign out</button></form>
          </div>
        </div>
      </header>
      <main className="wrap">
        {all.length ? (
          <>
            <div className="kpis">
              <div className="card kpi"><span className="lab">Games</span><b>{all.length}</b></div>
              <div className={`card kpi${sum("review") ? " alert" : ""}`}><span className="lab">Waiting on you</span><b>{sum("review")}</b><small>answers, approvals, checks</small></div>
              <div className={`card kpi${sum("problems") ? " alert" : ""}`}><span className="lab">Problems</span><b>{sum("problems")}</b></div>
            </div>
            {waiting.length ? (
              <section className="sec">
                <div className="sec-h"><h2>Waiting on you</h2><span className="lab">by game</span></div>
                <div className="card wait">
                  {waiting.map((s) => (
                    <a key={s.game} href={`/g/${s.game}?tab=review`}>
                      <span className="count">{s.counts.review}</span>
                      <b>{s.name}</b>
                      <span className="small muted">{s.now ? `Cycle ${s.now.cycle} · ${s.now.stage}` : ""}</span>
                      <span className="small muted" style={{ marginLeft: "auto" }}>Review →</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
            <section className="sec">
              <div className="sec-h"><h2>Games</h2><span className="lab">newest first</span></div>
              <div className="grid">{all.map((s) => <Game key={s.game} s={s} />)}</div>
            </section>
          </>
        ) : (
          <div className="empty">
            No game has sent its board yet. In a game repository, set <code>board.service</code> in kit.config.json and run{" "}
            <code>board.py push</code> once — after that every turn sends it.
          </div>
        )}
      </main>
    </>
  );
}
