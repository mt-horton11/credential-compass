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
{"timeline":"X-Y months","difficulty":"Low|Low-Medium|Medium|High|Very High","language":"language requirement","governing_body":"primary regulatory body","cost_esti
