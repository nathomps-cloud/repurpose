// pages/api/repurpose.js
// Calls Claude API server-side so your ANTHROPIC_API_KEY stays secret
// Never expose your API key in frontend code

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content, format } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required.' });
  }
  if (!format) {
    return res.status(400).json({ error: 'Format is required.' });
  }

  // Optionally: validate user token here too
  // const token = req.headers.authorization?.replace('Bearer ', '');
  // const user = await validateToken(token);
  // if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const PROMPTS = {
    twitter: `Convert the following content into a punchy Twitter/X thread.
Rules:
- Start with a hook tweet that makes people stop scrolling (no "Thread:" label)
- 6-10 tweets max
- Each tweet under 280 characters
- Number each tweet: 1/ 2/ 3/ etc.
- End with a strong CTA tweet
- No hashtags unless they add real value
- Direct, confident tone. No fluff.

Content:`,

    linkedin: `Convert the following content into a high-performing LinkedIn post.
Rules:
- Hook first line (no "I'm excited to share" clichés)
- Short punchy paragraphs, 1-2 sentences each
- Use line breaks liberally for readability
- Tell a story or make a bold claim
- End with a question to drive comments
- Professional but human tone
- 150-300 words max

Content:`,

    newsletter: `Convert the following content into an email newsletter section.
Rules:
- Subject line first (format: Subject: ...)
- Preview text second (format: Preview: ...)
- Then the body
- Conversational, direct tone — like writing to one smart friend
- Structure: hook → insight → action
- Include 1 bold takeaway
- End with a next step or reflection question
- 200-400 words

Content:`,

    tiktok: `Convert the following content into a TikTok/Reels video script.
Rules:
- Hook in first 3 seconds (write "HOOK:" then the line)
- Written as a spoken script with stage directions in [brackets]
- 45-60 seconds when read aloud (~120-150 words)
- Conversational, energetic, fast-paced
- Each beat on its own line
- End with a strong CTA
- Feel native to short-form video

Content:`
  };

  const prompt = PROMPTS[format];
  if (!prompt) {
    return res.status(400).json({ error: 'Invalid format.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: `${prompt}\n\n${content}` }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Anthropic API error:', err);
      return res.status(500).json({ error: 'AI generation failed. Please try again.' });
    }

    const data = await response.json();
    const output = data.content?.[0]?.text || '';

    // Optionally: log usage to DB
    // await db.users.increment({ generationsUsed: 1 }, { where: { token } });

    return res.status(200).json({ output });

  } catch (err) {
    console.error('Repurpose error:', err);
    return res.status(500).json({ error: 'Generation failed. Please try again.' });
  }
}
