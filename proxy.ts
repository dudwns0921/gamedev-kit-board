import { NextResponse, type NextRequest } from "next/server";
import { hostOk, originOk } from "@/lib/guard";

// Every request: it must name this machine, and one that changes something must come from this app's own pages. The kit's sends carry a token instead.
export function proxy(req: NextRequest) {
  if (!hostOk(req.headers.get("host"))) return new NextResponse("unknown host", { status: 421 });
  const ingest = req.nextUrl.pathname.startsWith("/api/ingest/");
  if (!ingest && !["GET", "HEAD"].includes(req.method) && !originOk(req)) return new NextResponse("not from this app", { status: 403 });
  return NextResponse.next();
}
