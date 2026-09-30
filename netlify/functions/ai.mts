// AI endpoint for the AI tools on AllOne Tools. Prompts are kept server-side so the
// endpoint can only be used for the tools listed here.
const MODEL = 'claude-haiku-4-5'
const MAX_INPUT = 8000

const PROMPTS: Record<string, string> = {
  'ai-summarizer': 'Summarize the text. Start with a one-line gist, then key points as bullets.',
  'ai-paraphraser': 'Paraphrase the text using fresh wording while keeping the exact meaning. Give 2 alternative versions.',
  'ai-grammar': 'Correct grammar, spelling and punctuation. Output the corrected text first, then a short bullet list of the main fixes. Keep the original language.',
  'ai-email': 'Write a complete email (with a subject line) based on the request.',
  'ai-reply': 'Write a thoughtful reply to the message. If the user added notes about what they want to say, include them.',
  'ai-translator': 'Translate the text naturally and accurately. Output only the translation.',
  'ai-eli5': 'Explain the topic as if to a curious 5-year-old, with simple words and an everyday analogy. Then add a slightly more detailed "For grown-ups" paragraph.',
  'ai-blog-outline': 'Create a blog post outline: 5 title options, an intro hook, H2/H3 sections with key points, and 4 FAQs.',
  'ai-insta-caption': 'Write 5 different Instagram captions with fitting emojis, then a line of 10 relevant hashtags.',
  'ai-hashtags': 'Generate 30 relevant hashtags grouped into Popular, Niche and Branded-style. Output hashtags only, grouped.',
  'ai-yt-title': 'Write 10 click-worthy but honest, SEO-friendly YouTube titles under 70 characters.',
  'ai-yt-desc': 'Write a YouTube video description: engaging first 2 lines, summary, placeholder timestamps, call to action, and 15 tags.',
  'ai-tweet': 'Write 3 alternative posts for X (each under 280 characters), then a short 5-post thread.',
  'ai-linkedin': 'Write an engaging LinkedIn post with a strong hook, short paragraphs, a takeaway and 3-5 hashtags.',
  'ai-product-desc': 'Write a product title, a persuasive description paragraph, 5 feature/benefit bullets, and SEO keywords for e-commerce listings.',
  'ai-cover-letter': 'Write a concise, tailored cover letter (under 350 words) using placeholders like [Your Name] where details are missing.',
  'ai-resume': 'Rewrite each point as a strong resume bullet starting with an action verb, adding measurable impact placeholders like [X%] where useful.',
  'ai-interview': 'List 12 likely interview questions for the role (mix of technical/role-specific, behavioural and HR) with a brief model answer for each.',
  'ai-business-name': 'Suggest 20 catchy, brandable business names with a one-line reason each and a suggested tagline for the top 3.',
  'ai-story': 'Write an original short story with a title, vivid details and a satisfying ending.',
  'ai-poem': 'Write an original piece on the theme in the requested style.',
  'ai-wishes': 'Write 5 heartfelt, varied messages for the occasion (short, medium, funny, emotional, and a WhatsApp-status-length one).',
  'ai-meal-plan': 'Create a 7-day meal plan (breakfast, lunch, snack, dinner) as a clear day-by-day list with approximate calories, plus a short grocery list. Add a note to consult a professional for medical conditions.',
  'ai-workout': 'Create a 7-day workout plan with warm-up, exercises (sets x reps), rest days and form tips. Add a safety note.',
  'ai-study-plan': 'Create a day-by-day study timetable with revision and mock-test days, plus 5 study tips.',
  'ai-travel': 'Create a day-wise travel itinerary with morning/afternoon/evening plans, must-try local food, rough budget and travel tips.',
  'ai-code-explain': 'Explain what the code does: overview first, then a section-by-section explanation, then potential bugs or improvements.',
  'ai-sql': 'Write the SQL query in a code block, then briefly explain how it works.',
  'ai-regex': 'Provide the regular expression, explain each part, and show 3 matching and 3 non-matching examples. Also show JavaScript usage.',
  'ai-tone': 'Rewrite the message in the requested tone. Give 2 versions.',
}

const OPTION_LABELS: Record<string, string> = {
  lang: 'Write the output in',
  tone: 'Tone',
  length: 'Length',
  target: 'Target language',
  platform: 'Platform',
  level: 'Level',
  style: 'Style',
  occasion: 'Occasion',
  diet: 'Diet',
  dialect: 'SQL dialect',
}

const json = (body: unknown, status = 200) => Response.json(body, { status })

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { tool?: string; input?: string; options?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request' }, 400)
  }

  const instruction = PROMPTS[body.tool ?? '']
  const input = typeof body.input === 'string' ? body.input.trim() : ''
  if (!instruction) return json({ error: 'Unknown tool' }, 400)
  if (!input) return json({ error: 'Please enter some text first.' }, 400)
  if (input.length > MAX_INPUT) return json({ error: `Input is too long (max ${MAX_INPUT} characters).` }, 400)

  const optionLines = Object.entries(body.options ?? {})
    .filter(([k, v]) => OPTION_LABELS[k] && typeof v === 'string' && v.length > 0 && v.length <= 60)
    .map(([k, v]) => `${OPTION_LABELS[k]}: ${v}`)

  const system = [
    'You are the writing assistant behind AllOne Tools, a free web tools site for everyday users.',
    'Reply with only the requested output — no preamble or closing remarks. Use plain text with simple markdown lists or bold headings where helpful.',
    `Task: ${instruction}`,
    ...optionLines,
  ].join('\n')

  const baseUrl = process.env.ANTHROPIC_BASE_URL
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!baseUrl || !apiKey) return json({ error: 'AI is not available right now. Please try again later.' }, 503)

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system,
        messages: [{ role: 'user', content: input }],
      }),
    })
    if (!res.ok) {
      console.error('AI Gateway error', res.status, await res.text())
      return json({ error: res.status === 429 ? 'Too many requests right now — please wait a minute.' : 'AI service error. Please try again.' }, 502)
    }
    const data = await res.json()
    const result = (data.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('\n')
      .trim()
    return json({ result })
  } catch (err) {
    console.error('AI request failed', err)
    return json({ error: 'AI service error. Please try again.' }, 502)
  }
}

export const config = {
  path: '/api/ai',
}
