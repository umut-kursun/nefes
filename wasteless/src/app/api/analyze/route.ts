import { NextRequest, NextResponse } from "next/server";
import { analyzeReceiptFormData } from "@/lib/analyze-receipt";
import { readDevCatalog } from "@/lib/product-knowledge/catalogKv";
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
    const result = await analyzeReceiptFormData(form, {
      apiKey,
      model: process.env.OPENAI_VISION_MODEL,
      fallbackModel: process.env.OPENAI_VISION_FALLBACK_MODEL,
      catalogSnapshot: readDevCatalog(),
    });

    if ("error" in result) {
      const isDev = process.env.NODE_ENV === "development";
      return NextResponse.json(
        isDev
          ? {
              error: result.error,
              failureReason: result.failureReason,
              debug: result.debug,
              details: result.details,
              raw: result.raw,
            }
          : { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("analyze error", error);
    return NextResponse.json(
      { error: safeApiErrorMessage(error) },
      { status: 500 }
    );
  }
}
