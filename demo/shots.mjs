// Photographs the dashboard with the sample games, for every place that shows it — the kit's README, the landing page — in one go.
//
//   cd demo && npm install && npm run shots          (once the app at the repository root is built: npm install && npm run build)
//
// It runs its own copy of the app on another port, with its own data in a temporary folder, so the dashboard you use is never touched.
// The sample games (games/) are drawn by the kit's own board script — the same data a real game sends — and pushed to that copy.
// Each picture goes where SHOTS says; a target whose repository is not checked out beside this one is skipped.
// The kit is found at KIT, else beside this repository (../claude-gamedev-kit), else in the installed plugin.
import { chromium } from "playwright-core";
import { spawn, execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chrome } from "./chrome.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const app = path.resolve(here, "..");
const beside = path.resolve(app, "..");
const PORT = 3199;
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = "demo-" + Math.random().toString(36).slice(2);

// Where each picture goes. size: the CSS pixels it is taken at (saved at twice that). theme: light · dark.
const SITE = [960, 600], README = [900, 600];  // the landing page shows 16:10 from the top
const SHOTS = [
  { name: "now", path: "/g/paper-courier?tab=now",
    to: [["gamedev-kit-site/public/board-now.png", "dark", SITE], ["claude-gamedev-kit/assets/dashboard-now-light.png", "light", README], ["claude-gamedev-kit/assets/dashboard-now-dark.png", "dark", README]] },
  { name: "play", path: "/g/paper-courier?tab=play", act: [["click", "button >> text=Beside the run before"]], scroll: '[id="pl-Take off"]',
    to: [["gamedev-kit-site/public/board-play.png", "dark", SITE], ["claude-gamedev-kit/assets/dashboard-play-light.png", "light", README], ["claude-gamedev-kit/assets/dashboard-play-dark.png", "dark", README]] },
  { name: "games", path: "/", to: [["gamedev-kit-site/public/board-games.png", "dark", SITE]] },
  { name: "epics", path: "/g/paper-courier?tab=epics", act: [["click", ".ep-card >> text=Dusk and the lighthouse"]],
    to: [["gamedev-kit-site/public/board-epics.png", "dark", SITE], ["claude-gamedev-kit/assets/dashboard-light.png", "light", README], ["claude-gamedev-kit/assets/dashboard-dark.png", "dark", README]] },
  { name: "cycle", path: "/g/paper-courier?tab=cycle", act: [["click", ".ep-cycles button >> text=Cycle 03"]],
    to: [["gamedev-kit-site/public/board-cycle.png", "dark", SITE], ["claude-gamedev-kit/assets/dashboard-cycle-light.png", "light", README], ["claude-gamedev-kit/assets/dashboard-cycle-dark.png", "dark", README]] },
  { name: "task", path: "/g/paper-courier?tab=cycle", act: [["click", ".ep-cycles button >> text=Cycle 03"], ["click", ".ep-row >> text=Light the lighthouse at dusk"]],
    to: [["gamedev-kit-site/public/board-task.png", "dark", SITE], ["claude-gamedev-kit/assets/dashboard-task-light.png", "light", README], ["claude-gamedev-kit/assets/dashboard-task-dark.png", "dark", README]] },
  { name: "review", path: "/g/paper-courier?tab=review",
    to: [["gamedev-kit-site/public/review.png", "dark", SITE], ["claude-gamedev-kit/assets/dashboard-decide-light.png", "light", README], ["claude-gamedev-kit/assets/dashboard-decide-dark.png", "dark", README]] },
  { name: "assets", path: "/g/paper-courier?tab=assets",
    to: [["gamedev-kit-site/public/board-assets.png", "dark", SITE], ["claude-gamedev-kit/assets/dashboard-assets-light.png", "light", README], ["claude-gamedev-kit/assets/dashboard-assets-dark.png", "dark", README]] },
];

// What is in motion in a game — the CEO's workers, who holds each cycle, whose build has the turn — written where the kit keeps it,
// with a sleeping process standing in for each live worker (the board counts only workers whose process is running). minutes: how long ago.
const MOTION = {
  "paper-courier": {
    live: [{ cycle: 3, kind: "next", what: "going on", minutes: 14, doc: "docs/cycle/03-dusk-and-upgrades.md", build: "wave 2" },
           { cycle: 4, kind: "next", what: "going on", minutes: 5, doc: "docs/cycle/04-rain-clouds.md" }],
    ended: [{ cycle: 2, kind: "next", minutes: [200, 152], stop: "play", said: "the route build is committed — fly all three islands in one day", cost: 3.84 },
            { cycle: 3, kind: "next", minutes: [95, 61], stop: "decisions", said: "two questions on the shop wait on the dashboard", cost: 2.17 },
            { cycle: 4, kind: "new", minutes: [48, 31], stop: "decisions", said: "how a rain cloud treats a letter waits on the dashboard", cost: 1.42 }],
  },
};
const sleepers = [];

function stamp(minutes) {
  const d = new Date(Date.now() - minutes * 60000), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function motion(game, dir) {
  const m = MOTION[game];
  if (!m) return;
  const held = {}, workers = [];
  let build = null;
  for (const w of m.live) {
    const proc = spawn("sleep", ["900"], { stdio: "ignore" });
    sleepers.push(proc);
    held[proc.pid] = { cycle: String(w.cycle), doc: w.doc, at: stamp(w.minutes) };
    workers.push({ cycle: w.cycle, kind: w.kind, what: w.what, pid: proc.pid, started: stamp(w.minutes) });
    if (w.build) build = { pid: proc.pid, what: w.build, at: stamp(Math.max(1, w.minutes - 6)) };
  }
  workers.unshift(...m.ended.map((w) =>  // oldest first, as the kit appends them
    ({ cycle: w.cycle, kind: w.kind, what: "", pid: 1, started: stamp(w.minutes[0]), ended: stamp(w.minutes[1]), stop: w.stop, said: w.said, cost: w.cost })));
  mkdirSync(path.join(dir, "docs/cycle/.gamedev-kit"), { recursive: true });
  writeFileSync(path.join(dir, "docs/cycle/.sessions.json"), JSON.stringify({ [realpathSync(dir)]: { held, build } }));
  writeFileSync(path.join(dir, "docs/cycle/.gamedev-kit/workers.json"), JSON.stringify(workers));
}

function kit() {
  const plugin = path.join(os.homedir(), ".claude/plugins/cache/claude-gamedev-kit/gamedev-kit");
  const installed = existsSync(plugin) ? readdirSync(plugin).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((v) => path.join(plugin, v)) : [];
  const found = [process.env.KIT, path.join(beside, "claude-gamedev-kit"), ...installed.reverse()].find((d) => d && existsSync(path.join(d, "skills/board/scripts/board.py")));
  if (!found) throw new Error("The kit was not found — set KIT=<path to claude-gamedev-kit>");
  return path.join(found, "skills/board/scripts/board.py");
}

async function up() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + "/")).status < 500) return; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("The app did not start — is it built? (npm run build at the repository root)");
}

if (!existsSync(path.join(app, ".next", "BUILD_ID"))) throw new Error("Build the app first: npm install && npm run build at the repository root");
const work = mkdtempSync(path.join(os.tmpdir(), "board-shots-"));
const server = spawn(path.join(app, "node_modules/.bin/next"), ["start", app, "-p", String(PORT), "-H", "127.0.0.1"],
  { cwd: work, env: { ...process.env, INGEST_TOKEN: TOKEN }, stdio: "ignore" });
try {
  await up();
  const board = kit();
  for (const game of readdirSync(path.join(here, "games"))) {
    const dir = path.join(work, "games", game);
    cpSync(path.join(here, "games", game), dir, { recursive: true });
    const cfg = JSON.parse(readFileSync(path.join(dir, "kit.config.json"), "utf8"));
    cfg.board.service = { ...cfg.board.service, url: BASE };
    cfg.board.service_file = path.join(work, "none.env");  // never the user's own board.env
    writeFileSync(path.join(dir, "kit.config.json"), JSON.stringify(cfg, null, 2));
    motion(game, dir);
    execFileSync("python3", ["-W", "ignore", board, "push"], { cwd: dir, env: { ...process.env, GAMEDEV_BOARD_TOKEN: TOKEN }, stdio: "ignore" });
    console.log(`pushed ${game}`);
  }
  const browser = await chromium.launch({ executablePath: chrome() });
  for (const shot of SHOTS.filter((x) => !process.env.ONLY || process.env.ONLY.split(",").includes(x.name))) {
    for (const [to, theme, [width, height]] of shot.to) {
      const out = path.join(beside, to);
      if (!existsSync(path.join(beside, to.split("/")[0]))) { console.log(`skipped ${to} — that repository is not beside this one`); continue; }
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: theme });
      await ctx.addCookies([{ name: "board_theme", value: theme, url: BASE }]);
      const page = await ctx.newPage();
      await page.goto(BASE + shot.path, { waitUntil: "load" });  // not "networkidle": the page holds a live connection open
      await page.waitForLoadState("domcontentloaded"); await page.waitForTimeout(600);
      for (const [what, sel] of shot.act ?? []) if (what === "click") await page.click(sel);
      if (shot.name === "epics") {
        await page.waitForTimeout(300);  // after the page brings the detail into view itself
        await page.evaluate((to) => {  // the chosen card's row, then its detail
          const b = document.querySelector("main.body"); const c = document.querySelector(to);
          if (b && c) b.scrollTop += c.getBoundingClientRect().top - b.getBoundingClientRect().top - 16;
        }, ".ep-card.sel");
      }
      if (shot.scroll) {
        await page.waitForTimeout(300);
        await page.evaluate((to) => {  // that part of the page to the top
          const b = document.querySelector("main.body"); const c = document.querySelector(to);
          if (b && c) b.scrollTop += c.getBoundingClientRect().top - b.getBoundingClientRect().top - 16;
        }, shot.scroll);
      }
      await page.mouse.move(0, 0);  // no card left looking hovered
      await page.waitForTimeout(400);  // pictures in, the panel's slide done
      mkdirSync(path.dirname(out), { recursive: true });
      await page.screenshot({ path: out });
      await ctx.close();
      console.log(`${shot.name} → ${to}`);
    }
  }
  await browser.close();
} finally {
  server.kill();
  for (const p of sleepers) p.kill();
  rmSync(work, { recursive: true, force: true });
}
