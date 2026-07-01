export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const { imageBase64, mimeType, missionName, missionDescription } = await req.json()

  if (!imageBase64 || !missionName) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 })
  }

  const prompt = `You are verifying a photo submission for a conference scavenger hunt called "Straiker: Signal Detection" at Gartner Security & Risk Summit.

Mission: "${missionName}"
Mission description: "${missionDescription}"

Look at this photo and decide: does it genuinely show evidence of completing this mission?

Be reasonably generous — if the photo is clearly relevant and makes a good-faith attempt, approve it. Only deny if the photo is completely unrelated or clearly wrong.

Respond with exactly this format:
VERDICT: YES or NO
REASON: One sentence explaining your decision.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/jpeg',
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini error:', err)
      return new Response(JSON.stringify({ approved: true, reason: 'Verification unavailable — points awarded.' }), { status: 200 })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const verdictMatch = text.match(/VERDICT:\s*(YES|NO)/i)
    const reasonMatch = text.match(/REASON:\s*(.+)/i)

    const approved = verdictMatch?.[1]?.toUpperCase() === 'YES'
    const reason = reasonMatch?.[1]?.trim() || (approved ? 'Photo verified!' : 'Photo does not match the mission.')

    return new Response(JSON.stringify({ approved, reason }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Verification error:', err)
    // Fail open — if AI is down, don't block players
    return new Response(JSON.stringify({ approved: true, reason: 'Verification unavailable — points awarded.' }), { status: 200 })
  }
}
