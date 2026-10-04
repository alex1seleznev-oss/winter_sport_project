const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function normalizePersonText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('æ', 'ae')
    .replaceAll('ø', 'o')
    .replaceAll('œ', 'oe')
    .replaceAll('ł', 'l')
    .replaceAll('ð', 'd')
    .replaceAll('þ', 'th')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenVariants(token) {
  const base = normalizePersonText(token);
  const variants = new Set([base]);
  variants.add(base.replaceAll('oe', 'o'));
  variants.add(base.replaceAll('ae', 'a'));
  variants.add(base.replaceAll('ue', 'u'));
  return [...variants].filter((x) => x.length >= 3);
}

function hasToken(text, token) {
  const padded = ` ${normalizePersonText(text)} `;
  return tokenVariants(token).some((variant) => padded.includes(` ${variant} `));
}

function nameEvidence(row, candidate) {
  const tokens = normalizePersonText(row.name).split(' ').filter(Boolean);
  const given = tokens[0] ?? '';
  const family = tokens.at(-1) ?? '';
  const title = normalizePersonText(candidate.title);
  const categories = normalizePersonText(candidate.categories);
  const description = normalizePersonText(candidate.description);
  const combined = `${title} ${categories} ${description}`;
  const givenMatch = hasToken(combined, given);
  const familyMatch = hasToken(combined, family);
  const titleGivenMatch = hasToken(title, given);
  const titleFamilyMatch = hasToken(title, family);
  return {
    given,
    family,
    givenMatch,
    familyMatch,
    titleGivenMatch,
    titleFamilyMatch,
    strongNameMatch: givenMatch && familyMatch,
    titleStrongNameMatch: titleGivenMatch && titleFamilyMatch,
  };
}

const SPORT_TERMS = {
  biathlon: ['biathlon', 'biathlete', 'biathletes', 'ibu', 'biatlon'],
  cross_country: [
    'cross country',
    'cross country skiing',
    'cross country skier',
    'cross country skiers',
    'skier',
    'skiers',
    'fis nordic',
    'nordic world ski',
    'world ski championships',
    'ski world cup',
    'langrenn',
  ],
};

const CONFLICT_TERMS = {
  biathlon: ['ice hockey', 'hockey', 'gymnast', 'gymnastics', 'orienteer', 'orienteering', 'footballer', 'football player', 'cyclist'],
  cross_country: ['ice hockey', 'hockey', 'gymnast', 'gymnastics', 'orienteer', 'orienteering', 'footballer', 'football player'],
};

function containsPhrase(text, phrase) {
  const normalized = normalizePersonText(text);
  return normalized.includes(normalizePersonText(phrase));
}

function sportEvidence(row, candidate) {
  const combined = [candidate.title, candidate.categories, candidate.description].filter(Boolean).join(' ');
  const expected = SPORT_TERMS[row.sport] ?? [];
  const conflicts = CONFLICT_TERMS[row.sport] ?? [];
  const matchedSportTerms = expected.filter((term) => containsPhrase(combined, term));
  const matchedConflictTerms = conflicts.filter((term) => containsPhrase(combined, term));
  return {
    sportMatch: matchedSportTerms.length > 0,
    sportConflict: matchedConflictTerms.length > 0,
    matchedSportTerms,
    matchedConflictTerms,
  };
}

export function assessAthleteCandidate(row, candidate) {
  const name = nameEvidence(row, candidate);
  const sport = sportEvidence(row, candidate);
  const supportedImageMime = IMAGE_MIMES.has(candidate.mime);
  const reasons = [];
  if (!supportedImageMime) reasons.push('UNSUPPORTED_MEDIA_TYPE');
  if (!name.strongNameMatch) reasons.push('WEAK_NAME_MATCH');
  if (!sport.sportMatch) reasons.push('SPORT_CONTEXT_MISSING');
  if (sport.sportConflict) reasons.push('CONFLICTING_SPORT_CONTEXT');

  const downloadEligible = supportedImageMime && name.strongNameMatch && sport.sportMatch && !sport.sportConflict;
  return {
    downloadEligible,
    identityHeuristicStatus: downloadEligible ? 'strong_match' : 'review_required',
    supportedImageMime,
    ...name,
    ...sport,
    reasons,
  };
}

export function extensionForMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/jpeg') return 'jpg';
  return null;
}
