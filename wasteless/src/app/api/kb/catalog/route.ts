import { NextRequest, NextResponse } from "next/server";
import {
  publishDevCatalog,
  readDevCatalog,
  type PublishCatalogBody,
} from "@/lib/product-knowledge/catalogKv";

function getAdminPassword(): string | null {
  return process.env.KB_ADMIN_PASSWORD ?? null;
}

export async function GET() {
  const snapshot = readDevCatalog();
  if (!snapshot) {
    return NextResponse.json({
      version: 0,
      updatedAt: null,
      products: [],
      aliases: [],
      brands: [],
      categories: [],
    });
  }
  return NextResponse.json(snapshot);
}

export async function PUT(req: NextRequest) {
  const configured = getAdminPassword();
  if (!configured) {
    return NextResponse.json(
      { error: "KB_ADMIN_PASSWORD yapılandırılmamış." },
      { status: 503 }
    );
  }

  const header = req.headers.get("X-KB-Admin-Password");
  if (!header || header !== configured) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PublishCatalogBody;
  try {
    body = (await req.json()) as PublishCatalogBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body.expectedVersion !== "number" ||
    !Array.isArray(body.products) ||
    !Array.isArray(body.aliases) ||
    !Array.isArray(body.brands) ||
    !Array.isArray(body.categories)
  ) {
    return NextResponse.json({ error: "Invalid catalog payload" }, { status: 400 });
  }

  const result = publishDevCatalog(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, currentVersion: result.currentVersion },
      { status: 409 }
    );
  }

  return NextResponse.json(result.snapshot);
}
