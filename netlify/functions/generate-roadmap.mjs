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
  const SYSTEM_PROMPT = `You are CredentialCompass, an expert clinical licensing advisor. Respond ONLY with a valid JSON object (no markdown, no backticks, no preamble):
{"timeline":"X-Y months","difficulty":"Low|Low-Medium|Medium|High|Very High","language":"language requirement","governing_body":"primary regulatory body","cost_estimate":"cost range","phases":[{"phase":"name","icon":"emoji","duration":"time","priority":"Critical|Important|Optional","items":["step"]}],"tips":["tip"],"watch_out":["pitfall"],"resources":[{"label":"name","url":"https://..."}]}
Be specific: real org names, exam names, fee amounts. For international moves include visa steps. For US transfers mention interstate compacts. 4-7 phases, 3-6 items each.`;

  const userPrompt = `Profession: ${profession}\nCurrently licensed in: ${currentState}, USA\nRelocating to: ${destType === "international" ? destination : `${destination}, USA`}\n\nProvide the complete JSON roadmap.`;

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
    const jsonStr = rawText.trim().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to generate roadmap", details: err.message }), { status: 500 });
  }
};

export const config = {
  path: "/api/generate-roadmap",
};
