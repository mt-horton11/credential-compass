export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  const { profession, currentState, destination, destType } = body;
  if (!profession || !currentState || !destination) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  const SYSTEM_PROMPT = `You are CredentialCompass, an expert clinical licensing and credentialing advisor. You provide highly accurate, actionable, step-by-step roadmaps for healthcare clinicians relocating their professional license to a new state or country.

When given a profession, origin state/country, and destination, respond ONLY with a valid JSON object (no markdown, no backticks, no preamble) in this exact structure:

{
  "timeline": "X–Y months (overall estimate)",
  "difficulty": "Low | Low–Medium | Medium | High | Very High",
  "language": "Language requirement or 'English'",
  "governing_body": "Name and abbreviation of primary regulatory body",
  "cost_estimate": "Approximate total cost range in USD or local currency",
  "phases": [
    {
      "phase": "Phase Name",
      "icon": "single emoji",
      "duration": "X–Y weeks/months",
      "priority": "Critical | Important | Optional",
      "items": [
        "Specific, actionable step with details",
        "..."
      ]
    }
  ],
  "tips": [
    "Practical insider tip 1",
    "..."
  ],
  "watch_out": [
    "Common pitfall or gotcha to avoid",
    "..."
  ],
  "resources": [
    { "label": "Resource name", "url": "https://..." }
  ]
}

Rules:
- Be specific to the profession AND destination. Include actual organization names, fee amounts, exam names, form numbers when known.
- For international moves, always include both professional credentialing AND immigration/visa steps.
- For US state transfers, mention interstate compacts if applicable.
- Include 4–7 phases, 3–6 items per phase.
- Include 3–5 tips and 2–4 watch_out items.
- Include 3–6 real, valid resource URLs.
- Difficulty scale: Low = simple endorsement, Very High = full re-examination required.
- Always include a disclaimer note as the last tip that requirements change and verification is needed.`;

  const userPrompt = `Generate a credential relocation roadmap for:
- Profession: ${profession}
- Currently licensed in: ${currentState}, USA
- Relocating to: ${destType === "international" ? destination : `${destination}, USA`}

Provide the complete JSON roadmap.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "API error" }), { status: response.status });
    }

    const rawText = data.content?.map(b => b.text || "").join("") || "";
    let jsonStr = rawText.trim().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to generate roadmap" }), { status: 500 });
  }
};

export const config = {
  path: "/api/generate-roadmap",
};
