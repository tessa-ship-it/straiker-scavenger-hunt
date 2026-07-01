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
    return res.status(200).json({ approved: false, reason: 'AI verification not configured — contact admin.' })
  }
  console.log('API key found, first 6 chars:', apiKey.substring(0, 6))

  const prompt = `You are a strict judge verifying photo submissions for a conference scavenger hunt.

Mission name: "${missionName}"
Mission description: "${missionDescription}"

Examine the photo carefully. The photo must clearly and specifically show what the mission asks for.

Rules:
- Say YES only if the photo CLEARLY shows the required subject
- Say NO if the photo shows something different, even if loosely related
- A photo of a Pepsi is NOT a milk carton. A photo of a pillow is NOT a laptop. Be specific.
- If you are unsure, say NO

Respond in exactly this format:
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
    console.error('Verification error:', err.message)
    return res.status(200).json({ approved: false, reason: `Verification failed: ${err.message}. Please try again.` })
  }
}
