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
import { cpSync, existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  { name: "games", path: "/", to: [["gamedev-kit-site/public/board-games.png", "dark", SITE]] },
  { name: "epics", path: "/g/paper-courier?tab=epics", act: [["click", ".ep-card >> text=Dusk and the lighthouse"]],
    to: [["gamedev-kit-site/public/board-epics.png", "dark", SITE], ["claude-gamedev-kit/assets/dashboard-light.png", "light", README], ["claude-gamedev-kit/assets/dashboard-dark.png", "dark", README]] },
  { name: "screens", path: "/g/paper-courier?tab=epics", act: [["click", ".ep-card >> text=Over the islands"], ["click", ".ep-cycles button >> text=Screens"]],
    to: [["gamedev-kit-site/public/board-screens.png", "dark", SITE]] },
  { name: "cycle", path: "/g/paper-courier?tab=cycle",
    to: [["gamedev-kit-site/public/board-cycle.png", "dark", SITE], ["claude-gamedev-kit/assets/dashboard-cycle-light.png", "light", README], ["claude-gamedev-kit/assets/dashboard-cycle-dark.png", "dark", README]] },
  { name: "task", path: "/g/paper-courier?tab=cycle", act: [["click", ".ep-row >> text=Light the lighthouse at dusk"]],
    to: [["gamedev-kit-site/public/board-task.png", "dark", SITE], ["claude-gamedev-kit/assets/dashboard-task-light.png", "light", README], ["claude-gamedev-kit/assets/dashboard-task-dark.png", "dark", README]] },
  { name: "review", path: "/g/paper-courier?tab=review",
    to: [["gamedev-kit-site/public/review.png", "dark", SITE], ["claude-gamedev-kit/assets/dashboard-decide-light.png", "light", README], ["claude-gamedev-kit/assets/dashboard-decide-dark.png", "dark", README]] },
  { name: "assets", path: "/g/paper-courier?tab=assets",
    to: [["gamedev-kit-site/public/board-assets.png", "dark", SITE], ["claude-gamedev-kit/assets/dashboard-assets-light.png", "light", README], ["claude-gamedev-kit/assets/dashboard-assets-dark.png", "dark", README]] },
];

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
    execFileSync("python3", ["-W", "ignore", board, "push"], { cwd: dir, env: { ...process.env, GAMEDEV_BOARD_TOKEN: TOKEN }, stdio: "ignore" });
    console.log(`pushed ${game}`);
  }
  const browser = await chromium.launch({ executablePath: chrome() });
  for (const shot of SHOTS) {
    for (const [to, theme, [width, height]] of shot.to) {
      const out = path.join(beside, to);
      if (!existsSync(path.join(beside, to.split("/")[0]))) { console.log(`skipped ${to} — that repository is not beside this one`); continue; }
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: theme });
      await ctx.addCookies([{ name: "board_theme", value: theme, url: BASE }]);
      const page = await ctx.newPage();
      await page.goto(BASE + shot.path, { waitUntil: "load" });  // not "networkidle": the page holds a live connection open
      await page.waitForLoadState("domcontentloaded"); await page.waitForTimeout(600);
      for (const [what, sel] of shot.act ?? []) if (what === "click") await page.click(sel);
      if (shot.name === "epics" || shot.name === "screens") {
        await page.waitForTimeout(300);  // after the page brings the detail into view itself
        await page.evaluate((to) => {  // the chosen card's row, then its detail — or, for its screens, the detail from its top
          const b = document.querySelector("main.body"); const c = document.querySelector(to);
          if (b && c) b.scrollTop += c.getBoundingClientRect().top - b.getBoundingClientRect().top - 16;
        }, shot.name === "screens" ? "#epic-detail" : ".ep-card.sel");
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
  rmSync(work, { recursive: true, force: true });
}
