export const DEFAULT_FAQ_PRESETS = [
  {
    q: "Will you definitely come down my exact street?",
    a: "Our published routes are a guide, not a guarantee. We are 100% volunteer-run and depend on safe road conditions, weather, and clear access around parked cars. Follow the live GPS radar above or set a 250m Doorstep Alert to see our exact progress!"
  },
  {
    q: "Why didn't the sleigh turn into my cul-de-sac?",
    a: "The towing vehicle and sleigh trailer are long and cannot safely reverse down tight cul-de-sacs blocked by evening parking. If you live in a tight close, pop out to the main junction corner when you get your approaching alert to wave to Santa!"
  },
  {
    q: "Can children climb onto the sleigh for photos?",
    a: "For safety and insurance reasons, nobody may climb onto the sleigh during street routes. You are very welcome to take photos with Santa waving from the sleigh while standing safely on the pavement!"
  },
  {
    q: "Do your elves take contactless cards as well as cash?",
    a: "Yes! Our street collectors carry traditional sealed buckets for coins and notes, QR codes on their lanyards, and contactless tap-to-donate options — or you can donate online right here."
  }
];

export const FLATBED_FAQ_PRESETS = [
  {
    q: "Will you definitely come down my exact street?",
    a: "Our published routes are a guide, not a guarantee. We are 100% volunteer-run and depend on safe road conditions, weather, and clear access around parked cars. Follow the live GPS radar above or set a 250m Doorstep Alert to see our exact progress!"
  },
  {
    q: "Why didn't the sleigh turn into my cul-de-sac?",
    a: "Our flatbed sleigh van is large and cannot safely turn around in narrow cul-de-sacs or dead-ends blocked by evening parked cars. If you live in a tight close, pop out to the main junction corner when you get your approaching alert to wave to Santa!"
  },
  {
    q: "Can children climb onto the sleigh for photos?",
    a: "For safety and insurance reasons, nobody may climb onto the flatbed sleigh during street routes. You are very welcome to take photos with Santa waving from the sleigh while standing safely on the pavement!"
  },
  {
    q: "Do your elves take contactless cards as well as cash?",
    a: "Yes! Our street collectors carry traditional sealed buckets for coins and notes, QR codes on their lanyards, and contactless tap-to-donate options — or you can donate online right here."
  }
];

export function normalizeFaqs(raw) {
  if (raw === null || raw === undefined) return DEFAULT_FAQ_PRESETS;
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return DEFAULT_FAQ_PRESETS;
    }
  }
  if (!Array.isArray(parsed)) {
    return DEFAULT_FAQ_PRESETS;
  }
  // If explicitly empty array was saved, allow empty array (meaning table turned off FAQs)
  if (parsed.length === 0) {
    return [];
  }
  const clean = parsed
    .map(item => ({
      q: String(item?.q || item?.question || '').trim(),
      a: String(item?.a || item?.answer || '').trim()
    }))
    .filter(item => item.q);
  return clean;
}
