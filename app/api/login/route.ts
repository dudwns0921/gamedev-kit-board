import { go, passwordOk, startSession } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  if (!passwordOk(String(form.get("password") ?? ""))) return go("/login?wrong=1");
  await startSession(req);
  return go("/");
}
