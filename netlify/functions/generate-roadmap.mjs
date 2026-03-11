export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("ERROR: No API key found");
    return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500 });
  }
  let body;
  try {
    body = await req.json();
  } catch(e) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }
  const profession = body.profession;
  const currentState = body.currentState;
  const destination = body.destination;
  const destType = body.destType;
  if (!profession || !currentState || !destination) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }
  const dest = destType === "international" ? destination : destination + ", USA";
  const userPrompt = "Profession: " + profession + "\nCurrently licensed in: " + currentState + ", USA\nRelocating to: " + dest + "\n\nSearch the web to find the current, accurate licensing board website and requirements, then provide the complete JSON roadmap with verified URLs.";
  const SYSTEM_PROMPT = "You are CredentialCompass, an expert clinical licensing advisor. Use web search to find current, accurate licensing board websites and requirements before responding. Respond ONLY with a valid JSON object (no markdown, no backticks, no preamble): {\"timeline\":\"X-Y months\",\"difficulty\":\"Low|Medium|High\",\"language\":\"requirement\",\"governing_body\":\"body name\",\"cost_estimate\":\"cost range\",\"phases\":[{\"phase\":\"name\",\"icon\":\"emoji\",\"duration\":\"time\",\"priority\":\"Critical|Important|Optional\",\"items\":[\"step\"]}],\"tips\":[\"tip\"],\"watch_out\":[\"pitfall\"],\"resources\":[{\"label\":\"name\",\"url\":\"https://...\"}]} Be specific: real org names, exam names, fees. Include visa steps for international. Mention interstate compacts for US. 4-7 phases, 3-6 items each. Only include URLs you have verified exist.";
  try {
    console.log("Calling Anthropic API with web search...");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: userPrompt }]
      })
    });
    console.log("API status:", response.status);
    const data = await response.json();
    if (!response.ok) {
      console.log("API error:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "API error" }), { status: response.status });
    }
    const rawText = data.content ? data.content.filter(function(b){ return b.type === "text"; }).map(function(b){ return b.text || ""; }).join("") : "";
    console.log("Raw length:", rawText.length);
    console.log("First 200:", rawText.substring(0, 200));
    const jsonStr = rawText.trim().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    console.log("Parse success");
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch(err) {
    console.log("CATCH ERROR:", err.message);
    return new Response(JSON.stringify({ error: "Failed", details: err.message }), { status: 500 });
  }
};

export const config = {
  path: "/api/generate-roadmap"
};
