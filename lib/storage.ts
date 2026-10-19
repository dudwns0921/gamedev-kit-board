import { promises as fs } from "node:fs";
import path from "node:path";

// Where everything lives, in the .data/ folder beside the app: games/<game>/summary.json · games/<game>/f/<content-hash>.<ext>

export type Stored = { body: Buffer; contentType: string };

export const LOCAL = path.join(process.cwd(), ".data");

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
  await whole(file + ".type", contentType);
  await whole(file, body);
}

/** Written beside and renamed in, so a page reading while a board arrives gets the old one or the new one — never half of one
 *  (written in place, a read in the middle failed and the newest card did not show). Each write has its own part file: two sends at once do not mix. */
async function whole(file: string, data: Buffer | string): Promise<void> {
  const part = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.part`;
  await fs.writeFile(part, data);
  for (let tries = 0; ; tries++) {
    try {
      return await fs.rename(part, file);
    } catch (err) {
      // Windows refuses to replace a file another read holds open for that moment — wait a little and try again
      if (tries >= 5 || !["EPERM", "EACCES", "EBUSY"].includes((err as NodeJS.ErrnoException).code ?? "")) {
        await fs.rm(part, { force: true });
        throw err;
      }
      await new Promise((r) => setTimeout(r, 50 * (tries + 1)));
    }
  }
}

/** Every key under a prefix. */
export async function keys(prefix: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (!entry.name.endsWith(".type") && !entry.name.endsWith(".part")) out.push(path.relative(LOCAL, full).split(path.sep).join("/"));
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
