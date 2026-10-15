import { endSession } from "@/lib/auth";

export async function POST(req: Request) {
  await endSession();
  return Response.redirect(new URL("/login", req.url), 303);
}
