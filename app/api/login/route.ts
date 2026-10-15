import { passwordOk, startSession } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  if (!passwordOk(String(form.get("password") ?? ""))) return Response.redirect(new URL("/login?wrong=1", req.url), 303);
  await startSession(req);
  return Response.redirect(new URL("/", req.url), 303);
}
