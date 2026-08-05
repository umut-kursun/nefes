import { NextRequest, NextResponse } from "next/server";
import { analyzeReceiptEngineFormData } from "@/lib/receipt-engine-analyze";
import { analyzeReceiptEngineWithDebug } from "@/lib/receipt-engine-analyze-debug";
import { isDebugExportEnabled } from "@/lib/receipt-engine-debug/devGuard";
import { safeApiErrorMessage } from "@/lib/api-error";
import {
  stampTimeline,
  type ScanTimeline,
} from "@/lib/receipt-scan-timeline";

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
    const serverTimeline: ScanTimeline = {};
    stampTimeline(serverTimeline, "t4_worker_request_received");

    const scanTraceId =
      typeof form.get("scanTraceId") === "string"
        ? String(form.get("scanTraceId"))
        : undefined;

    const model = process.env.OPENAI_OCR_MODEL ?? process.env.OPENAI_VISION_MODEL;
    const result = isDebugExportEnabled()
      ? await analyzeReceiptEngineWithDebug(form, {
          apiKey,
          model,
          serverTimeline,
          scanTraceId,
        })
      : await analyzeReceiptEngineFormData(form, {
          apiKey,
          model,
          serverTimeline,
          scanTraceId,
        });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, failureCode: result.failureCode },
        { status: result.status }
      );
    }

    stampTimeline(serverTimeline, "t8_worker_response_sent");
    if (result.scanTimeline) {
      result.scanTimeline = {
        ...result.scanTimeline,
        server: { ...serverTimeline },
        merged: { ...result.scanTimeline.merged, ...serverTimeline },
      };
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
