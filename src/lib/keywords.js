// Niche → service terms map. Keys are matched as substrings against client.niche.
const NICHE_TERMS = {
  'dog training': [
    'dog trainer',
    'dog training',
    'puppy training',
    'puppy classes',
    'dog obedience training',
    'dog boarding',
    'dog behaviorist',
    'aggressive dog training',
    'dog training classes',
  ],
  'dog grooming': [
    'dog groomer',
    'dog grooming',
    'pet grooming',
    'mobile dog grooming',
    'puppy grooming',
  ],
  'pet grooming': [
    'pet groomer',
    'pet grooming',
    'dog grooming',
    'cat grooming',
    'mobile pet grooming',
  ],
  'dog boarding': [
    'dog boarding',
    'dog kennel',
    'dog daycare',
    'overnight dog boarding',
    'dog sitting',
  ],
  'veterinar': [
    'veterinarian',
    'vet clinic',
    'animal hospital',
    'emergency vet',
    'pet clinic',
  ],
  'dental': [
    'dentist',
    'dental clinic',
    'teeth cleaning',
    'emergency dentist',
    'cosmetic dentist',
    'family dentist',
  ],
  'plumb': [
    'plumber',
    'plumbing services',
    'emergency plumber',
    'drain cleaning',
    'water heater repair',
  ],
  'electrician': [
    'electrician',
    'electrical services',
    'emergency electrician',
    'electrical repair',
  ],
  'landscap': [
    'landscaping',
    'lawn care',
    'lawn mowing',
    'landscape design',
    'lawn maintenance',
  ],
  'cleaning': [
    'house cleaning',
    'cleaning service',
    'maid service',
    'deep cleaning',
    'move out cleaning',
  ],
  'roofing': [
    'roofing contractor',
    'roof repair',
    'roof replacement',
    'roofer',
    'roof inspection',
  ],
  'real estate': [
    'real estate agent',
    'realtor',
    'homes for sale',
    'real estate broker',
    'property management',
  ],
  'personal train': [
    'personal trainer',
    'personal training',
    'fitness trainer',
    'gym trainer',
    'weight loss coach',
  ],
  'yoga': [
    'yoga studio',
    'yoga classes',
    'yoga instructor',
    'hot yoga',
    'beginner yoga',
  ],
  'law': [
    'lawyer',
    'attorney',
    'law firm',
    'legal services',
  ],
  'accounting': [
    'accountant',
    'accounting services',
    'tax preparation',
    'bookkeeping',
    'CPA',
  ],
  'photography': [
    'photographer',
    'wedding photographer',
    'portrait photography',
    'family photographer',
    'event photographer',
  ],
}

function deriveServiceTerms(niche) {
  const normalized = niche.toLowerCase()
  for (const [key, terms] of Object.entries(NICHE_TERMS)) {
    if (normalized.includes(key) || key.includes(normalized)) return terms
  }
  // Fallback: treat the niche itself as the service term
  return [niche, `${niche} services`, `best ${niche}`, `${niche} near me`]
}

// Returns an array of location-specific keyword strings for a client.
// Pulls city from client.location (e.g. "Austin, TX" → "Austin").
export function suggestKeywords(client) {
  const niche = (client.niche || '').trim()
  const rawLocation = (client.location || '').trim()
  const city = rawLocation.split(',')[0].trim()

  if (!niche || !city) return []

  const terms = deriveServiceTerms(niche)

  const suggestions = []
  for (const term of terms) {
    suggestions.push(`${term} ${city}`)
    suggestions.push(`${term} near ${city}`)
  }
  suggestions.push(`best ${terms[0]} in ${city}`)

  return suggestions
}
