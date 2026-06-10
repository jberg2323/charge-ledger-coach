export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: { message: "ANTHROPIC_API_KEY is not configured on the server." } },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { message: "Invalid request body." } }, { status: 400 });
  }

  let payload;

  if (body.type === "chat") {
    const { system, messages } = body;
    if (!system || typeof system !== "string") {
      return Response.json({ error: { message: "A system string is required for chat." } }, { status: 400 });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: { message: "At least one message is required." } }, { status: 400 });
    }
    const valid = messages.every(
      (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()
    );
    if (!valid) {
      return Response.json({ error: { message: "Messages must have role and content." } }, { status: 400 });
    }
    payload = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };
  } else {
    const { prompt } = body;
    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: { message: "A prompt string is required." } }, { status: 400 });
    }
    payload = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    };
  }

  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return Response.json(
      { error: { message: "Network request failed. Check your connection and try again." } },
      { status: 502 }
    );
  }

  const data = await response.json();
  return Response.json(data, { status: response.status });
}