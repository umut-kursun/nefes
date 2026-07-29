const NORMALIZE_SYSTEM = `You normalize a single grocery product row for a Turkish product catalog.
Return ONLY valid JSON with fields: brand, name, variant, size, unit, category.
Normalize Turkish characters, units (ml, L, g, kg), and package sizes.
Do not invent barcodes. Keep variant/flavor distinct from product name.`;

export async function handleKbVerify(
  request: Request,
  env: { KB_ADMIN_PASSWORD?: string }
): Promise<Response> {
  const configured = env.KB_ADMIN_PASSWORD;
  if (!configured) {
    return Response.json(
      { ok: false, error: "KB_ADMIN_PASSWORD yapılandırılmamış." },
      { status: 503 }
    );
  }
  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!body.password || body.password !== configured) {
    return Response.json({ ok: false }, { status: 401 });
  }
  return Response.json({ ok: true });
}

export async function handleKbNormalizeRow(
  request: Request,
  env: { OPENAI_API_KEY?: string; OPENAI_VISION_MODEL?: string }
): Promise<Response> {
  if (!env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
  }
  let body: { row?: Record<string, string> };
  try {
    body = (await request.json()) as { row?: Record<string, string> };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const row = body.row ?? {};
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: NORMALIZE_SYSTEM },
        {
          role: "user",
          content: `Normalize this single product row:\n${JSON.stringify(row)}`,
        },
      ],
    }),
  });
  if (!openaiRes.ok) {
    return Response.json({ error: "AI request failed" }, { status: 502 });
  }
  const completion = (await openaiRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    return Response.json({ error: "Empty AI response" }, { status: 502 });
  }
  try {
    return Response.json(JSON.parse(content));
  } catch {
    return Response.json({ error: "Invalid AI JSON" }, { status: 502 });
  }
}
