import { NextRequest, NextResponse } from "next/server";
import { runOcrDebugFormData } from "@/lib/ocr-debug/runOcrDebug";
import { isDevDebugRoutesEnabled } from "@/lib/receipt-engine-debug/devGuard";
import { safeApiErrorMessage } from "@/lib/api-error";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isDevDebugRoutesEnabled()) {
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
    const result = await runOcrDebugFormData(form, {
      apiKey,
      model: process.env.OPENAI_OCR_MODEL ?? process.env.OPENAI_VISION_MODEL,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("ocr debug error", error);
    return NextResponse.json(
      { error: safeApiErrorMessage(error, "OCR debug isteği başarısız.") },
      { status: 500 }
    );
  }
}
