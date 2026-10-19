// The browser that takes the pictures: the one named in CHROME, else the usual Chrome or Chromium on this machine. Nothing is downloaded.
import { existsSync } from "node:fs";

const PLACES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/opt/pw-browsers/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

export function chrome() {
  const found = [process.env.CHROME, ...PLACES].find((p) => p && existsSync(p));
  if (!found) throw new Error("No Chrome or Chromium found — set CHROME=<path to the browser>");
  return found;
}
