import { NextRequest, NextResponse } from "next/server";

const SYSTEM = `You normalize a single grocery product row for a Turkish product catalog.
Return ONLY valid JSON with fields: brand, name, variant, size, unit, category.
Normalize Turkish characters, units (ml, L, g, kg), and package sizes.
Do not invent barcodes. Keep variant/flavor distinct from product name.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
  }

  let body: { row?: Record<string, string> };
  try {
    body = (await req.json()) as { row?: Record<string, string> };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const row = body.row ?? {};
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Normalize this single product row:\n${JSON.stringify(row)}`,
        },
      ],
    }),
  });

  if (!openaiRes.ok) {
    return NextResponse.json({ error: "AI request failed" }, { status: 502 });
  }

  const completion = (await openaiRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
  }

  try {
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ error: "Invalid AI JSON" }, { status: 502 });
  }
}
