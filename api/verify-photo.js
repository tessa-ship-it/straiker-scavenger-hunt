export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mimeType, missionName, missionDescription } = req.body

  if (!imageBase64 || !missionName) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set')
    return res.status(200).json({ approved: true, reason: 'Verification unavailable — points awarded.' })
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

    const data = await response.json()
    console.log('Gemini response:', JSON.stringify(data))

    if (!response.ok) {
      console.error('Gemini API error:', data)
      return res.status(200).json({ approved: false, reason: `Verification error: ${data?.error?.message || 'Unknown error'}. Please try again.` })
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('Gemini text:', text)

    const verdictMatch = text.match(/VERDICT:\s*(YES|NO)/i)
    const reasonMatch = text.match(/REASON:\s*(.+)/i)

    const approved = verdictMatch?.[1]?.toUpperCase() === 'YES'
    const reason = reasonMatch?.[1]?.trim() || (approved ? 'Photo verified!' : 'Photo does not match the mission.')

    return res.status(200).json({ approved, reason })
  } catch (err) {
    console.error('Verification error:', err)
    return res.status(200).json({ approved: true, reason: 'Verification unavailable — points awarded.' })
  }
}
