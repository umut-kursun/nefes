import { NextRequest, NextResponse } from "next/server";
import { isDebugExportEnabled } from "@/lib/receipt-engine-debug/devGuard";
import type { ReceiptDebugExport } from "@/lib/receipt-engine-debug/exportSchema";
import { buildDebugPackageZip } from "@/lib/receipt-engine-debug/debugPackage";
import { safeApiErrorMessage } from "@/lib/api-error";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isDebugExportEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const body = (await req.json()) as {
      debugExport?: ReceiptDebugExport;
      imageDataUrl?: string;
    };

    if (!body.debugExport || typeof body.imageDataUrl !== "string") {
      return NextResponse.json(
        { error: "debugExport and imageDataUrl are required." },
        { status: 400 }
      );
    }

    const zipBuffer = await buildDebugPackageZip(
      body.debugExport,
      body.imageDataUrl
    );

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="receipt-debug-package.zip"',
      },
    });
  } catch (error) {
    console.error("receipt-engine debug-package error", error);
    return NextResponse.json(
      { error: safeApiErrorMessage(error, "Debug package generation failed.") },
      { status: 500 }
    );
  }
}
