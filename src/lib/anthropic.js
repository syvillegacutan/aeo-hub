import axios from 'axios'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
}

const NO_DASHES = 'Never use em dashes, en dashes, or hyphens in prose. Write in natural conversational human sentences only. No dashes of any kind.'

const SYSTEM_PROMPTS = {
  reddit: (client) =>
    `You are a real Reddit community member who happens to know a lot about ${client.niche}. Write in first person, casually and helpfully, like you have personally been through this. Sound like a genuine person, not a marketer. Keep it under 80 words. No bullet points, no markdown headers. Do not mention you are an AI. Only weave in ${client.name} if it fits naturally and does not sound promotional. ${NO_DASHES}`,

  quora: (client) =>
    `You are an experienced professional in ${client.niche} answering on Quora. Write in a slightly more detailed and authoritative tone, but still warm and approachable. You can briefly reference relevant experience or credentials. Keep it under 120 words. Light formatting is fine if it helps clarity. Do not mention you are an AI. ${NO_DASHES}`,

  answerclub: (client) =>
    `You are a helpful community member answering a question about ${client.niche} on AnswerClub. Be clear, direct, and conversational. Give a genuinely useful answer without fluff or filler. Keep it under 100 words. Write in plain language anyone can understand. Do not mention you are an AI. ${NO_DASHES}`,

  paa: (client) =>
    `You are creating a clear, helpful answer about ${client.niche}. Start with a direct answer in the first sentence, then add one or two supporting sentences. Keep it under 80 words. Write in plain language. ${NO_DASHES}`,
}

const USER_PROMPTS = {
  reddit: (question, client) =>
    `Write a Reddit community answer for this question: "${question}"\n\nContext (use only if it fits naturally, never be promotional): ${client.name} is a ${client.niche} in ${client.location}.`,

  quora: (question, client) =>
    `Write a Quora answer for: "${question}"\n\nContext: ${client.name} is a ${client.niche} serving ${client.location}. Website: ${client.website}`,

  answerclub: (question, client) =>
    `Write an AnswerClub answer for: "${question}"\n\nContext: ${client.name} is a ${client.niche} in ${client.location}.`,

  paa: (question, client) =>
    `Answer this question clearly and helpfully: "${question}"\n\nBusiness: ${client.name}, a ${client.niche} in ${client.location}.`,
}

export async function generateAnswer(question, platform, client) {
  const systemFn = SYSTEM_PROMPTS[platform] || SYSTEM_PROMPTS.reddit
  const userFn   = USER_PROMPTS[platform]   || USER_PROMPTS.reddit

  const { data } = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: systemFn(client),
      messages: [{ role: 'user', content: userFn(question, client) }],
    },
    { headers: HEADERS }
  )
  return data.content[0].text
}

export async function suggestBlogTopics(client, questions) {
  const questionTexts = questions
    .map(q => q.question_text)
    .slice(0, 30)
    .join('\n- ')

  const { data } = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: 'You are an SEO content strategist for a local business. Based on the following questions real people are asking online about this business niche, suggest 5 blog post topics that would: (1) directly answer these questions, (2) be highly relevant to the business, (3) rank well in Google and get cited by AI engines like ChatGPT and Gemini. For each topic provide: a compelling blog title, the primary target keyword, the search intent (informational/commercial/local), a 2 sentence description of what the post should cover, and why this topic will help AEO visibility. Format as JSON array.',
      messages: [{
        role: 'user',
        content: `Business: ${client.name}\nNiche: ${client.niche}\nLocation: ${client.location}\n\nQuestions people are asking:\n- ${questionTexts}\n\nRespond with ONLY a valid JSON array of 5 objects, each with keys: title, keyword, intent, description, aeo_reason`,
      }],
    },
    { headers: HEADERS }
  )

  const text = data.content[0].text
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Could not parse topic suggestions from response')
  return JSON.parse(match[0])
}

export async function writeBlogPost(topic, client, questions) {
  const questionTexts = questions
    .slice(0, 15)
    .map(q => q.question_text)
    .join('\n- ')

  const { data } = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 4096,
      system: `You are an expert blog writer for local businesses. Write a complete, publish-ready blog post following these rules:
- Minimum 1,200 words
- H1 title at the top using # markdown syntax
- H2 and H3 subheadings throughout using ## and ### markdown syntax
- Natural conversational tone, sounds human
- Mention the business name naturally 3 to 4 times
- Include a FAQ section at the bottom with 3 questions and answers based on what people are actually asking
- Never use em dashes, en dashes, or hyphens in prose
- End with a clear call to action mentioning the business
- Write for the specific local area mentioned`,
      messages: [{
        role: 'user',
        content: `Write a complete blog post with this title: "${topic.title}"\n\nBusiness name: ${client.name}\nLocation: ${client.location}\nNiche: ${client.niche}\nWebsite: ${client.website || 'N/A'}\nTarget keyword: ${topic.keyword}\n\nQuestions that inspired this topic:\n- ${questionTexts}\n\nWrite the full blog post now using markdown formatting for headings.`,
      }],
    },
    { headers: HEADERS }
  )

  return data.content[0].text
}

export async function suggestInternalLinks(blogContent, pages) {
  const pageUrls = pages.slice(0, 50).map(p => p.url).join('\n')
  const truncatedContent = blogContent.slice(0, 4000)

  const { data } = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: 'You are an SEO specialist. Given a blog post and a list of website page URLs, suggest the most relevant internal links to add to the blog. For each suggestion, identify a specific phrase that appears verbatim in the blog that could serve as anchor text, and the best matching URL from the list provided. Respond with ONLY a valid JSON array.',
      messages: [{
        role: 'user',
        content: `Blog post:\n${truncatedContent}\n\nWebsite pages:\n${pageUrls}\n\nSuggest 4 to 6 internal links as a JSON array of objects with keys: anchor_text (exact phrase from the blog), url (must be from the list above), reason (why this link makes sense for SEO and the reader)`,
      }],
    },
    { headers: HEADERS }
  )

  const text = data.content[0].text
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Could not parse link suggestions from response')
  return JSON.parse(match[0])
}
