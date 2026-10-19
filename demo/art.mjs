// Draws the sample games' pictures — the screens a cycle shot and the assets in their slots — so the demo carries no one's real game.
// Each picture is a canvas scene in flat paper-cut colours, saved as a PNG beside the game that shows it. Run once after changing a scene: node art.mjs
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chrome } from "./chrome.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);

// [game folder, file under it, width, height, scene name]
const PICTURES = [
  ["paper-courier", "docs/capture/post-office.png", 1280, 720, "postOffice"],
  ["paper-courier", "docs/capture/take-off.png", 1280, 720, "takeOff"],
  ["paper-courier", "docs/capture/islands.png", 1280, 720, "islands"],
  ["paper-courier", "docs/capture/drop.png", 1280, 720, "drop"],
  ["paper-courier", "docs/capture/dusk.png", 1280, 720, "dusk"],
  ["paper-courier", "docs/capture/take-off-2.png", 1280, 720, "takeOff2"],
  ["paper-courier", "docs/capture/islands-2.png", 1280, 720, "islands2"],
  ["paper-courier", "docs/capture/drop-2.png", 1280, 720, "drop2"],
  ["paper-courier", "assets/art/plane.png", 512, 512, "plane"],
  ["paper-courier", "assets/art/mailbox.png", 512, 512, "mailbox"],
  ["paper-courier", "assets/art/lighthouse.png", 512, 512, "lighthouse"],
  ["paper-courier", "assets/art/letter_bag.png", 512, 512, "bag"],
  ["paper-courier", "assets/art/island_small.png", 512, 512, "island"],
  ["paper-courier", "docs/cycle/ref/wing-a.png", 640, 480, "wingA"],
  ["paper-courier", "docs/cycle/ref/wing-b.png", 640, 480, "wingB"],
  ["paper-courier", "docs/cycle/ref/wing-c.png", 640, 480, "wingC"],
  ["lantern-keeper", "docs/capture/stairs.png", 1280, 720, "stairs"],
  ["tide-garden", "docs/capture/shore.png", 1280, 720, "shore"],
];

const SCENES = String.raw`
const P = { sky:"#BFE3F2", sky2:"#F7D9C4", sea:"#5FA8C9", sea2:"#3E86A8", sand:"#F2D7A6", grass:"#8DBF6A", grass2:"#6FA552",
  earth:"#E07A5F", earth2:"#C4564A", paper:"#FBF5EA", paper2:"#E9DFCC", red:"#E94F4F", ink:"#2D3142", gold:"#F2B134", dusk:"#3C3B6E", dusk2:"#E98A6B", stone:"#B7B2A8" };
function poly(c, pts, fill){ c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); c.fillStyle = fill; c.fill(); }
function circle(c, x, y, r, fill){ c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
function rect(c, x, y, w, h, fill){ c.fillStyle = fill; c.fillRect(x, y, w, h); }
function sky(c, w, h, a, b){ const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, w, h); }
function cloud(c, x, y, s, fill){ circle(c, x, y, 30*s, fill); circle(c, x+34*s, y-12*s, 38*s, fill); circle(c, x+74*s, y, 30*s, fill); rect(c, x, y, 74*s, 30*s, fill); }
function sea(c, w, h, y){ rect(c, 0, y, w, h-y, P.sea); for (let i = 0; i < 9; i++) rect(c, (i*173)%w, y+20+i*22, 90, 5, P.sea2); }
function island(c, x, y, s){ poly(c, [[x-120*s,y],[x+120*s,y],[x+60*s,y+110*s],[x-50*s,y+120*s]], P.earth); poly(c, [[x-50*s,y+120*s],[x+60*s,y+110*s],[x+5*s,y+170*s]], P.earth2);
  c.beginPath(); c.ellipse(x, y, 130*s, 34*s, 0, 0, Math.PI*2); c.fillStyle = P.grass; c.fill(); c.beginPath(); c.ellipse(x+20*s, y+6*s, 80*s, 16*s, 0, 0, Math.PI*2); c.fillStyle = P.grass2; c.fill(); }
function plane(c, x, y, s, rot){ c.save(); c.translate(x, y); c.rotate(rot||0); poly(c, [[-90*s,0],[110*s,-18*s],[-40*s,30*s]], P.paper); poly(c, [[-90*s,0],[110*s,-18*s],[-30*s,-8*s]], P.paper2); poly(c, [[-40*s,30*s],[110*s,-18*s],[-20*s,12*s]], P.red); c.restore(); }
function mailbox(c, x, y, s){ rect(c, x-6*s, y, 12*s, 120*s, P.ink); c.beginPath(); c.moveTo(x-50*s,y); c.lineTo(x-50*s,y-50*s); c.arc(x, y-50*s, 50*s, Math.PI, 0); c.lineTo(x+50*s, y); c.closePath(); c.fillStyle = "#3A6EA5"; c.fill(); rect(c, x+50*s, y-90*s, 8*s, 50*s, P.red); rect(c, x+50*s, y-90*s, 34*s, 20*s, P.red); }
function lighthouse(c, x, y, s, lit){ poly(c, [[x-40*s,y],[x+40*s,y],[x+26*s,y-220*s],[x-26*s,y-220*s]], P.paper); for (let i = 0; i < 3; i++) poly(c, [[x-37*s+i*4*s,y-40*s-i*60*s],[x+37*s-i*4*s,y-40*s-i*60*s],[x+34*s-i*4*s,y-70*s-i*60*s],[x-34*s+i*4*s,y-70*s-i*60*s]], P.red);
  rect(c, x-30*s, y-260*s, 60*s, 40*s, lit ? P.gold : P.stone); poly(c, [[x-38*s,y-260*s],[x+38*s,y-260*s],[x,y-300*s]], P.ink); if (lit) { c.globalAlpha = .35; poly(c, [[x,y-240*s],[x+600*s,y-320*s],[x+600*s,y-160*s]], P.gold); c.globalAlpha = 1; } }
function letter(c, x, y, s){ rect(c, x, y, 60*s, 40*s, P.paper); poly(c, [[x,y],[x+60*s,y],[x+30*s,y+22*s]], P.paper2); circle(c, x+30*s, y+22*s, 5*s, P.red); }
function bag(c, x, y, s){ c.beginPath(); c.roundRect(x-110*s, y-70*s, 220*s, 170*s, 30*s); c.fillStyle = "#B5835A"; c.fill(); c.beginPath(); c.roundRect(x-110*s, y-70*s, 220*s, 70*s, 30*s); c.fillStyle = "#9C6B45"; c.fill(); rect(c, x-14*s, y-10*s, 28*s, 30*s, P.gold);
  c.strokeStyle = "#7A5236"; c.lineWidth = 14*s; c.beginPath(); c.arc(x, y-70*s, 80*s, Math.PI, 0); c.stroke(); letter(c, x-60*s, y-120*s, 1.2*s); }
const S = {
  postOffice(c, w, h){ sky(c, w, h, P.sky2, P.sky); rect(c, 0, h*.7, w, h*.3, P.sand); poly(c, [[300,h*.7],[300,260],[640,140],[980,260],[980,h*.7]], P.paper); rect(c, 300, 260, 680, 30, P.red); rect(c, 560, 380, 160, h*.7-380, P.ink);
    rect(c, 360, 330, 140, 100, P.sky); rect(c, 780, 330, 140, 100, P.sky); mailbox(c, 1100, h*.72, 1.1); for (let i = 0; i < 4; i++) letter(c, 120 + i*50, h*.72 - 30 - i*14, 1); cloud(c, 120, 120, 1, "#fff"); cloud(c, 1000, 90, .8, "#fff"); },
  takeOff(c, w, h){ sky(c, w, h, "#9BD3EE", P.sky); cloud(c, 160, 160, 1.2, "#fff"); cloud(c, 900, 240, .9, "#fff"); sea(c, w, h, h*.78); island(c, 260, h*.74, 1.3); mailbox(c, 220, h*.71, .55); plane(c, 760, 330, 1.6, -.25);
    c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 6; c.setLineDash([18,16]); c.beginPath(); c.moveTo(330, h*.66); c.quadraticCurveTo(520, 520, 640, 380); c.stroke(); c.setLineDash([]); },
  islands(c, w, h){ sky(c, w, h, "#A7DCF2", "#E4F4FA"); cloud(c, 80, 120, .9, "#fff"); cloud(c, 1040, 110, 1.1, "#fff"); sea(c, w, h, h*.8); island(c, 220, h*.62, .9); island(c, 640, h*.7, 1.2); island(c, 1080, h*.58, .8);
    mailbox(c, 640, h*.67, .6); mailbox(c, 1080, h*.56, .45); plane(c, 420, 230, 1.1, .12); },
  drop(c, w, h){ sky(c, w, h, "#9BD3EE", "#DDF1F8"); sea(c, w, h, h*.82); island(c, 640, h*.74, 1.6); mailbox(c, 640, h*.7, .9); plane(c, 520, 170, 1.3, .2);
    letter(c, 600, 330, 1.2); c.strokeStyle = P.gold; c.lineWidth = 8; c.beginPath(); c.arc(640, h*.7 - 70, 90, 0, Math.PI*2); c.stroke(); c.font = "bold 64px sans-serif"; c.fillStyle = P.gold; c.fillText("+3", 760, h*.7 - 120); },
  dusk(c, w, h){ sky(c, w, h, P.dusk, P.dusk2); circle(c, 980, h*.62, 70, "#F6C177"); sea(c, w, h, h*.72); c.globalAlpha=.25; rect(c, 0, h*.72, w, h*.28, P.dusk); c.globalAlpha=1; island(c, 330, h*.7, 1.2); lighthouse(c, 330, h*.68, 1.2, true); plane(c, 860, 260, 1, -.1); },
  takeOff2(c, w, h){ sky(c, w, h, "#8CCBEA", "#D8EEF7"); cloud(c, 420, 120, 1.4, "#fff"); cloud(c, 1000, 300, .7, "#fff"); sea(c, w, h, h*.82); island(c, 160, h*.8, .9); plane(c, 900, 200, 1.9, -.4); },
  islands2(c, w, h){ sky(c, w, h, "#F7D9C4", "#BFE3F2"); cloud(c, 700, 90, 1, "#fff"); sea(c, w, h, h*.76); island(c, 300, h*.66, 1.1); island(c, 900, h*.62, 1.3); mailbox(c, 900, h*.6, .7);
    for (let i = 0; i < 3; i++) { c.strokeStyle = P.ink; c.lineWidth = 5; c.beginPath(); c.moveTo(540 + i*60, 200 + i*14); c.lineTo(560 + i*60, 186 + i*14); c.lineTo(580 + i*60, 200 + i*14); c.stroke(); } plane(c, 420, 300, 1, .05); },
  drop2(c, w, h){ sky(c, w, h, P.sky2, "#F4E3D7"); sea(c, w, h, h*.84); island(c, 760, h*.76, 1.4); mailbox(c, 760, h*.72, .8); plane(c, 380, 220, 1.2, .25); letter(c, 560, 360, 1.1); letter(c, 640, 300, .9); },
  plane(c, w, h){ rect(c, 0, 0, w, h, "#EAF6FB"); plane(c, w/2, h/2, 2.1, -.2); },
  mailbox(c, w, h){ rect(c, 0, 0, w, h, "#FDF3E6"); mailbox(c, w/2-20, h*.62, 2.2); },
  lighthouse(c, w, h){ rect(c, 0, 0, w, h, "#2F3A5F"); lighthouse(c, w/2, h*.92, 1.45, true); },
  bag(c, w, h){ rect(c, 0, 0, w, h, "#F5EBDD"); bag(c, w/2, h*.58, 1.4); },
  island(c, w, h){ rect(c, 0, 0, w, h, "#DFF2F8"); island(c, w/2, h*.42, 1.6); },
  wingA(c, w, h){ rect(c, 0, 0, w, h, "#EAF6FB"); plane(c, w/2, h/2, 2.2, -.15); },
  wingB(c, w, h){ rect(c, 0, 0, w, h, "#EAF6FB"); c.save(); c.translate(w/2, h/2); c.rotate(-.15); poly(c, [[-170,0],[200,-10],[-120,90]], P.paper); poly(c, [[-170,0],[200,-10],[-90,-40]], P.paper2); poly(c, [[-120,90],[200,-10],[-60,30]], "#3A6EA5"); c.restore(); },
  wingC(c, w, h){ rect(c, 0, 0, w, h, "#EAF6FB"); c.save(); c.translate(w/2, h/2); c.rotate(-.15); poly(c, [[-160,-20],[210,0],[-160,60]], P.paper); poly(c, [[-160,60],[210,0],[-110,110]], P.gold); poly(c, [[-160,-20],[210,0],[-110,-70]], P.paper2); c.restore(); },
  stairs(c, w, h){ sky(c, w, h, "#1F2340", "#3C3B6E"); for (let i = 0; i < 9; i++) rect(c, 200 + i*90, h - 80 - i*55, 240, 40, P.stone); lighthouse(c, 1050, h*.95, 1.5, true); circle(c, 300, h - 140, 22, P.gold); },
  shore(c, w, h){ sky(c, w, h, "#F7D9C4", "#BFE3F2"); sea(c, w, h, h*.55); rect(c, 0, h*.72, w, h*.28, P.sand); for (let i = 0; i < 7; i++) { circle(c, 160 + i*160, h*.82, 26, i%2 ? P.grass : P.grass2); rect(c, 156 + i*160, h*.82, 8, 50, P.grass2); } },
};
`;

const browser = await chromium.launch({ executablePath: chrome() });
const page = await browser.newPage();
await page.setContent(`<canvas id="c"></canvas><script>${SCENES}; window.draw = (n, w, h) => { const el = document.getElementById("c"); el.width = w; el.height = h; S[n](el.getContext("2d"), w, h); return el.toDataURL("image/png"); };</script>`);
for (const [game, file, w, h, scene] of PICTURES) {
  const url = await page.evaluate(([n, w, h]) => window.draw(n, w, h), [scene, w, h]);
  const out = path.join(here, "games", game, file);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(url.split(",")[1], "base64"));
  console.log(path.relative(here, out));
}
await browser.close();
