// The chapters in the order they are told: the story (the journey, the
// mountains, the lessons), then the Record, then the book. The same list is
// written to nav_index.csv by scripts/build_derived.py; keep the two in step.
export const CHAPTERS = [
  { n: '01', route: '/', title: 'The Journey', group: 'story' },
  { n: '02', route: '/kilimanjaro', title: 'Kilimanjaro', group: 'story' },
  { n: '03', route: '/hanang', title: 'Hanang', group: 'story' },
  { n: '04', route: '/uluguru', title: 'Uluguru', group: 'story' },
  { n: '05', route: '/ngong', title: 'Ngong Hills', group: 'story' },
  { n: '06', route: '/what-it-means', title: 'What It Means', group: 'story' },
  { n: '07', route: '/numbers', title: 'Year in Sport', group: 'record' },
  { n: '08', route: '/sports', title: 'Sports', group: 'record' },
  { n: '09', route: '/records', title: 'Records', group: 'record' },
  { n: '10', route: '/where', title: 'Where', group: 'record' },
  { n: '11', route: '/timeline', title: 'Timeline', group: 'record' },
  { n: '12', route: '/goals', title: 'Goals', group: 'record' },
  { n: '13', route: '/on-trial', title: 'The Habit on Trial', group: 'record' },
  { n: '14', route: '/book', title: 'My Book', group: 'book' },
]

const BY_ROUTE = Object.fromEntries(CHAPTERS.map((c) => [c.route, c]))
const BY_NUM = Object.fromEntries(CHAPTERS.map((c) => [c.n, c]))
// the chapter number of a route ('/records' gives its two-digit number)
export const numOf = (route) => (BY_ROUTE[route] ? BY_ROUTE[route].n : '')
// the route of a chapter number
export const routeOf = (n) => (BY_NUM[n] ? BY_NUM[n].route : '')
