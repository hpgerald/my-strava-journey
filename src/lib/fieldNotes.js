// Field notes: short lines Gerald wrote into his own Strava activity
// descriptions over the years, the ones about discipline, effort, showing up,
// and the body. They are scattered across the site as margin notes from the
// logbook. Each is picked deterministically from a page seed, so a given page
// always shows the same note but different pages show different ones.
//
// Text is kept faithful to the originals, lightly trimmed and normalised to
// straight quotes. Attribution, where the note carried one, is held separately
// so it can be set as a quiet byline.

export const FIELD_NOTES = [
  { text: 'The easy path is crowded.' },
  { text: 'There will be no progress in the comfort zone.' },
  { text: 'Do what you can with what you got, then do more.' },
  { text: 'Learn to suffer without complaining.' },
  { text: 'You can either suffer the pain of discipline or the pain of regret.' },
  { text: 'Something is better than nothing. Do what you can.' },
  { text: 'Wake up every day with a goal, to be a little bit better today than you were yesterday.' },
  { text: 'If you do it, you will feel better when it is over. If you do not, you will feel worse. So go do it.' },
  { text: "Taking ownership of your life is not easy, and living a life of discipline is not easy. In fact, it is hard. That is why it works." },
  { text: 'Ease is a greater threat to progress than hardship.', author: 'Denzel Washington' },
  { text: "The pain will leave you when it is done teaching you.", author: 'Bruce Lee' },
  { text: 'Make it a rule to do something each day to improve yourself physically, regardless of your age.', author: 'Bob Hoffman' },
  { text: 'It will make you better in every aspect of life. Just go train.' },
  { text: 'Train, train, train. And when you think you have trained enough, keep training.', author: 'Jody Mitic' },
  { text: 'Everything you are doing is training, if you frame it the right way and pay attention to it.' },
  { text: 'The one who quits and the one who makes it through are exactly the same. The difference is neck up.', author: 'Mark Cochiolo' },
  { text: 'Hard choices make us wiser, smarter, stronger. And easy choices reverse our progress.', author: 'Jerzy Gregorek' },
  { text: 'Never quit. Life is hard. It will hurt. We will fall. But we will always get back up and move forward.', author: 'John Spencer' },
  { text: 'We should discipline ourselves in small things, and from these progress to things of greater value.', author: 'Marcus Aurelius' },
  { text: 'Make the most of the opportunities you have, through discipline, through hard work, through focus and drive.' },
  { text: 'Just did the math: 4.1M steps this past year, 11K a day on average. Turns out showing up daily adds up. The journey continues.' },
  { text: 'Another day. Another opportunity.' },
  { text: 'Every day is a gift. Embrace it.' },
  { text: 'You already know what to do. Get up and go get after it.' },
  { text: 'The difference between success and failure is not the things around you. It is the choices you make about them.', author: 'Charlie Plumb' },
  { text: 'Break the long challenges into increments, things you can do right now that add up over time.', author: 'Dan Cnossen' },
  { text: 'Preparation is key to achieve any goal. You cannot fall back on luck or talent.', author: 'Cam Hanes' },
  { text: 'Courage is not the absence of fear, but the ability to function despite being afraid.', author: 'Rich Diviney' },
  { text: 'You have to start. You can not know what you are doing, but you have to start.', author: 'Kelsi Sheren' },
  { text: 'I wanted to show that it is beautiful to be strong, to have drive, to have will, to not fail, to give it your all.', author: 'Kerstie Ennis' },
  { text: "Some days you are the hammer. Some days you are the nail. Either way, build." },
  { text: 'Do not let your mind control you. Control your mind, and then you can set it free.' },
  { text: 'None of us are promised tomorrow. Make as big an impact as you can every single day.', author: 'Andrew Paul' },
  { text: 'Freedom comes from discipline and strength.' },
]

// Small stable string hash (FNV-1a), so a page seed maps to the same note
// every render without any stored state.
function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// The primary narrative pages, in a fixed order. A seeded permutation assigns
// each a distinct note, so no two of these pages ever show the same line.
const ORDER = [
  '/', '/numbers', '/sports', '/records', '/where',
  '/timeline', '/goals', '/what-it-means', '/home',
]

// A fixed shuffle of the note indices (seeded LCG Fisher-Yates), so positions
// 0..ORDER.length map to distinct notes.
function permutation(n, seed) {
  const arr = Array.from({ length: n }, (_, i) => i)
  let s = seed >>> 0
  for (let i = n - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    const j = s % (i + 1)
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t
  }
  return arr
}
const PERM = permutation(FIELD_NOTES.length, 0x9e3779b9)

// The first ORDER.length permutation slots are reserved for the primary pages.
// Secondary pages (individual years, sports, places, the about/data pages) draw
// only from the remaining notes, so they never repeat a primary page's line.
const RESERVED = ORDER.length

// Pick a note for a page. `seed` is any stable string (usually the route).
// `offset` lets a single page place more than one distinct note. Known primary
// routes get a guaranteed-distinct note; any other seed draws from the reserve.
export function pickFieldNote(seed, offset = 0) {
  const n = FIELD_NOTES.length
  const pos = ORDER.indexOf(String(seed))
  if (pos >= 0) return FIELD_NOTES[PERM[(pos + offset) % RESERVED]]
  const span = n - RESERVED
  const k = (hash(String(seed)) + offset) % span
  return FIELD_NOTES[PERM[RESERVED + k]]
}
