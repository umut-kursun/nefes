import { NextRequest, NextResponse } from "next/server";
import { analyzeReceiptEngineFormData } from "@/lib/receipt-engine-analyze";
import { analyzeReceiptEngineWithDebug } from "@/lib/receipt-engine-analyze-debug";
import { isDebugExportEnabled } from "@/lib/receipt-engine-debug/devGuard";
import { safeApiErrorMessage } from "@/lib/api-error";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Sunucu yapılandırması eksik." },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const model = process.env.OPENAI_OCR_MODEL ?? process.env.OPENAI_VISION_MODEL;
    const result = isDebugExportEnabled()
      ? await analyzeReceiptEngineWithDebug(form, { apiKey, model })
      : await analyzeReceiptEngineFormData(form, { apiKey, model });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, failureCode: result.failureCode },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("receipt-engine analyze error", error);
    return NextResponse.json(
      { error: safeApiErrorMessage(error) },
      { status: 500 }
    );
  }
}
