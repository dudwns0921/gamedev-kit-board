import { go, endSession } from "@/lib/auth";

export async function POST(req: Request) {
  await endSession();
  return go("/login");
}
