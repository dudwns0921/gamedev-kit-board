// One person, on their own machine: no sign-in. The server listens on 127.0.0.1, and from another device it is reached through the user's own tunnel
// (tailscale serve — only their devices — or an SSH forward). What is guarded is the browser: a page from any other site could send requests here,
// so a request must name this machine (no DNS rebinding) and anything that changes something must come from this app's own pages. The kit sends with a token.

/** The names this app answers to: this machine, a Tailscale name, and any the user adds (BOARD_HOSTS, comma-separated). */
export function hostOk(host: string | null): boolean {
  const name = (host ?? "").toLowerCase().replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  const extra = (process.env.BOARD_HOSTS ?? "").toLowerCase().split(",").map((h) => h.trim()).filter(Boolean);
  return ["localhost", "127.0.0.1", "::1"].includes(name) || name.endsWith(".ts.net") || extra.includes(name);
}

/** A request that may change something: from this app's own page, not another site's. A request with neither header is not a browser's. */
export function originOk(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host.toLowerCase() === (req.headers.get("host") ?? "").toLowerCase();
  } catch {
    return false;
  }
}

/** Routes: the same checks the proxy makes, again where the work is done. */
export function trusted(req: Request): boolean {
  return hostOk(req.headers.get("host")) && (["GET", "HEAD"].includes(req.method) || originOk(req));
}
