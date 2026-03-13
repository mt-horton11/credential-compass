export const config = {
  maxDuration: 300,
};

export default async function handler(req) {
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
  } catch(e) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  const { profession, currentState, destination, destType } = body;

  if (!profession || !currentState || !destination) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  const dest = destType === "international" ? destination : destination + ", USA";

  const userPrompt = "Profession: " + profession + "\nCurrently licensed in: " + currentState + ", USA\nRelocating to: " + dest + "\n\nSearch the web to find current licensing requirements and fees, then provide the complete JSON roadmap.";

  const SYSTEM_PROMPT = "You are CredentialCompass, an expert clinical licensing advisor. Use web search to find current, accurate licensing requirements before responding. Respond ONLY with a valid JSON object (no markdown, no backticks, no preamble): {\"timeline\":\"X-Y months\",\"difficulty\":\"Low|Medium|High\",\"language\":\"requirement\",\"governing_body\":\"body name\",\"cost_estimate\":\"cost range\",\"phases\":[{\"phase\":\"name\",\"icon\":\"emoji\",\"duration\":\"time\",\"priority\":\"Critical|Important|Optional\",\"items\":[\"step\"]}],\"tips\":[\"tip\"],\"watch_out\":[\"pitfall\"]} Be specific: real org names, exam names, current fees. Include visa steps for international moves. Mention interstate compacts for US transfers. 4-7 phases, 3-6 items each. Do not include any URLs.";

  try {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "interleaved-thinking-2025-05-14"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        stream: true,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    if (!anthropicResponse.ok) {
      const err = await anthropicResponse.json();
      return new Response(JSON.stringify({ error: "Anthropic API error", details: err }), { status: 500 });
    }

    // Stream the response back, collecting text chunks
    const reader = anthropicResponse.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  // Collect text delta from content blocks
                  if (parsed.type === "content_block_delta" && parsed.delta && parsed.delta.type === "text_delta") {
                    fullText += parsed.delta.text;
                    // Send a progress heartbeat so connection stays alive
                    controller.enqueue(new TextEncoder().encode("data: " + JSON.stringify({ type: "progress" }) + "\n\n"));
                  }
                  // When stream is done, send the complete result
                  if (parsed.type === "message_stop") {
                    const jsonStr = fullText.trim().replace(/```json|```/g, "").trim();
                    const result = JSON.parse(jsonStr);
                    controller.enqueue(new TextEncoder().encode("data: " + JSON.stringify({ type: "result", data: result }) + "\n\n"));
                  }
                } catch(e) {
                  // Skip unparseable lines
                }
              }
            }
          }
          controller.close();
        } catch(err) {
          controller.enqueue(new TextEncoder().encode("data: " + JSON.stringify({ type: "error", message: err.message }) + "\n\n"));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      }
    });

  } catch(err) {
    return new Response(JSON.stringify({ error: "Failed", details: err.message }), { status: 500 });
  }
}
