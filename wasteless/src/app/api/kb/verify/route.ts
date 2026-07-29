import { NextRequest, NextResponse } from "next/server";

function getAdminPassword(): string | null {
  return process.env.KB_ADMIN_PASSWORD ?? null;
}

export async function POST(req: NextRequest) {
  const configured = getAdminPassword();
  if (!configured) {
    return NextResponse.json(
      { ok: false, error: "KB_ADMIN_PASSWORD yapılandırılmamış." },
      { status: 503 }
    );
  }

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const password = body.password ?? "";
  if (!password || password !== configured) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
