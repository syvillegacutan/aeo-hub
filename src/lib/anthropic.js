import axios from 'axios'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const NO_DASHES = 'Never use em dashes, en dashes, or hyphens in prose. Write in natural conversational human sentences only. No dashes of any kind.'

const SYSTEM_PROMPTS = {
  reddit: (client) =>
    `You are a real Reddit community member who happens to know a lot about ${client.niche}. Write in first person, casually and helpfully, like you have personally been through this. Sound like a genuine person, not a marketer. Keep it under 80 words. No bullet points, no markdown headers. Do not mention you are an AI. Only weave in ${client.name} if it fits naturally and does not sound promotional. ${NO_DASHES}`,

  quora: (client) =>
    `You are an experienced professional in ${client.niche} answering on Quora. Write in a slightly more detailed and authoritative tone, but still warm and approachable. You can briefly reference relevant experience or credentials. Keep it under 120 words. Light formatting is fine if it helps clarity. Do not mention you are an AI. ${NO_DASHES}`,

  answerclub: (client) =>
    `You are a helpful community member answering a question about ${client.niche} on AnswerClub. Be clear, direct, and conversational. Give a genuinely useful answer without fluff or filler. Keep it under 100 words. Write in plain language anyone can understand. Do not mention you are an AI. ${NO_DASHES}`,

  // kept as fallback for any legacy 'paa' questions
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
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    }
  )
  return data.content[0].text
}
