import { promises as fs } from "node:fs";
import path from "node:path";
import { del, get, list, put } from "@vercel/blob";

// Where everything lives: games/<game>/summary.json · games/<game>/page.html · games/<game>/f/<content-hash>.<ext>
// On Vercel a private Blob store; on a machine without one, the .data/ folder.

export type Stored = { body: Buffer; contentType: string };

// A connected store gives either a read-write token or, the newer way, its id with Vercel's own runtime credentials (OIDC) — the SDK takes both.
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const LOCAL = path.join(process.cwd(), ".data");

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function read(key: string): Promise<Stored | null> {
  if (useBlob()) {
    const got = await get(key, { access: "private", useCache: false });
    if (!got || got.statusCode !== 200) return null;
    return { body: await streamToBuffer(got.stream), contentType: got.blob.contentType };
  }
  try {
    const body = await fs.readFile(path.join(LOCAL, key));
    const contentType = await fs.readFile(path.join(LOCAL, key + ".type"), "utf8").catch(() => "application/octet-stream");
    return { body, contentType };
  } catch {
    return null;
  }
}

/** Which store this deployment writes to — said in an error, so a missing Blob connection is plain to see. */
export const where = () => (useBlob() ? "Vercel Blob (private)" : "the local .data folder — no Blob store connected to this deployment (BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN)");

export async function write(key: string, body: Buffer, contentType: string): Promise<void> {
  if (useBlob()) {
    await put(key, body, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType });
    return;
  }
  const file = path.join(LOCAL, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
  await fs.writeFile(file + ".type", contentType);
}

/** Every key under a prefix. */
export async function keys(prefix: string): Promise<string[]> {
  if (useBlob()) {
    const out: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      out.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return out;
  }
  const out: string[] = [];
  const walk = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (!entry.name.endsWith(".type")) out.push(path.relative(LOCAL, full).split(path.sep).join("/"));
    }
  };
  await walk(LOCAL);
  return out.filter((k) => k.startsWith(prefix));
}

/** Remove everything under a prefix — a game taken off the board. */
export async function removeAll(prefix: string): Promise<number> {
  const all = await keys(prefix);
  if (!all.length) return 0;
  if (useBlob()) {
    for (let i = 0; i < all.length; i += 500) await del(all.slice(i, i + 500));
  } else {
    await Promise.all(all.map((k) => fs.rm(path.join(LOCAL, k), { force: true }).then(() => fs.rm(path.join(LOCAL, k + ".type"), { force: true }))));
  }
  return all.length;
}
