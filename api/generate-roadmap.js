export const config = {
  maxDuration: 300,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const body = req.body;
  if (!body) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { profession, currentState, destination, destType } = body;

  if (!profession || !currentState || !destination) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const dest = destType === "international" ? destination : destination + ", USA";
  const userPrompt = "Profession: " + profession + "\nCurrently licensed in: " + currentState + ", USA\nRelocating to: " + dest + "\n\nSearch the web to find current licensing requirements and fees, then provide the complete JSON roadmap.";
  const SYSTEM_PROMPT = "You are CredentialCompass, an expert clinical licensing advisor. Use web search to find current, accurate licensing requirements before responding. Respond ONLY with a valid JSON object (no markdown, no backticks, no preamble): {\"timeline\":\"X-Y months\",\"difficulty\":\"Low|Medium|High\",\"language\":\"requirement\",\"governing_body\":\"body name\",\"cost_estimate\":\"cost range\",\"phases\":[{\"phase\":\"name\",\"icon\":\"emoji\",\"duration\":\"time\",\"priority\":\"Critical|Important|Optional\",\"items\":[\"step\"]}],\"tips\":[\"tip\"],\"watch_out\":[\"pitfall\"]} Be specific: real org names, exam names, current fees. Include visa steps for international moves. Mention interstate compacts for US transfers. 4-7 phases, 3-6 items each. Do not include any URLs.";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 1 }],
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "API error", details: data });
    }

    const rawText = data.content
      ? data.content.filter(b => b.type === "text").map(b => b.text || "").join("")
      : "";

    if (!rawText || rawText.trim().length === 0) {
      return res.status(500).json({ 
        error: "Empty response", 
        content_types: data.content ? data.content.map(b => b.type) : [] 
      });
    }

    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    const jsonStr = start !== -1 && end !== -1 ? rawText.substring(start, end + 1) : rawText.trim().replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch(parseErr) {
      return res.status(500).json({ 
        error: "JSON parse failed", 
        raw: rawText.substring(0, 500) 
      });
    }

    return res.status(200).json(parsed);

  } catch(err) {
    return res.status(500).json({ error: "Failed", details: err.message });
  }
}
