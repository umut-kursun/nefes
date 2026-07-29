import { NextRequest, NextResponse } from "next/server";
import { debugReceiptEngineFormData } from "@/lib/receipt-engine-debug-analyze";
import { isDebugExportEnabled } from "@/lib/receipt-engine-debug/devGuard";
import { safeApiErrorMessage } from "@/lib/api-error";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isDebugExportEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Sunucu yapılandırması eksik." },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const result = await debugReceiptEngineFormData(form, {
      apiKey,
      model: process.env.OPENAI_OCR_MODEL ?? process.env.OPENAI_VISION_MODEL,
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, failureCode: result.failureCode },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("receipt-engine debug trace error", error);
    return NextResponse.json(
      { error: safeApiErrorMessage(error, "Debug trace failed.") },
      { status: 500 }
    );
  }
}
