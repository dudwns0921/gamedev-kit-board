import { promises as fs } from "node:fs";
import path from "node:path";

// Where everything lives, in the .data/ folder beside the app: games/<game>/summary.json · games/<game>/f/<content-hash>.<ext>

export type Stored = { body: Buffer; contentType: string };

const LOCAL = path.join(process.cwd(), ".data");

export async function read(key: string): Promise<Stored | null> {
  const file = path.join(LOCAL, key);
  try {
    const body = await fs.readFile(file);
    const contentType = await fs.readFile(file + ".type", "utf8").catch(() => "application/octet-stream");
    return { body, contentType };
  } catch {
    return null;
  }
}

/** Said in an error, so where a write failed is plain to see. */
export const where = () => `the local .data folder (${LOCAL})`;

export async function write(key: string, body: Buffer, contentType: string): Promise<void> {
  const file = path.join(LOCAL, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
  await fs.writeFile(file + ".type", contentType);
}

/** Every key under a prefix. */
export async function keys(prefix: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (!entry.name.endsWith(".type")) out.push(path.relative(LOCAL, full).split(path.sep).join("/"));
    }
  };
  await walk(path.join(LOCAL, prefix.split("/")[0]));
  return out.filter((k) => k.startsWith(prefix));
}

/** Remove everything under a prefix — a game taken off the board. */
export async function removeAll(prefix: string): Promise<number> {
  const all = await keys(prefix);
  await Promise.all(all.map((k) => fs.rm(path.join(LOCAL, k), { force: true }).then(() => fs.rm(path.join(LOCAL, k + ".type"), { force: true }))));
  return all.length;
}
