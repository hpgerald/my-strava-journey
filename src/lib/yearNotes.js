// Year in Sport, written by hand for each year. Each entry replaces the title (t)
// and the words (p) that the page would otherwise build from the numbers; the
// numbers themselves stay in the facts beside each chart. A year or a section
// with no entry here falls back to the built text (a new year, for example).
// Keys follow the shared closing sections: ring, hours, rank and where (where: t is the
// title, p is said before the regions). Each year's own chapters are written in
// lib/yearChapters.jsx.
export const YEAR_NOTES = {
  2019: {
    hours: { p: ['Most of my first outings began in the evening, after work.'] },
    ring: { t: 'A few days a month.', p: ['I was learning the watch and the app more than building a habit. Weeks went by with nothing in between.'] },
    rank: { p: ['The only year that began in August.'] },
  },
  2020: {
    hours: { p: ['That year I went out early, before the working day. It is the only year the mornings led.'] },
    ring: { t: 'Then the gap.', p: ['I went out on a few days in the first half of the year, and then not at all.'] },
    rank: { p: ['My smallest year, because most of it was the layoff.'] },
  },
  2021: {
    hours: { p: ['After work was my time, and on many days there was a morning outing as well.'] },
    ring: { t: 'Every day, for a while.', p: ['The first half of the ring is empty. After the comeback I went out almost every day.'] },
    rank: { p: ['Only 2022 went further, and only by a few kilometres.'] },
    where: { t: 'All in Tanzania.' },
  },
  2022: {
    hours: { p: ['Work set the hours, and the early evening was my time again. Saturday was my surest day.'] },
    ring: { t: 'Out more often than not.', p: ['I went out on 266 days of the year, more than two days in every three.'] },
    rank: { p: ['And my best year for distance too, by a few kilometres over 2021.'] },
  },
  2023: {
    hours: { p: ['After work on weekdays, and the Sabbath was my surest day.'] },
    ring: { t: 'Fewer days, higher ones.', p: ['I went out less often than in 2022, and I went higher.'] },
    rank: { p: ['It went less far than 2022, and much higher.'] },
    where: { t: 'Twelve regions, no border.' },
  },
  2024: {
    hours: { p: ['Work set the hours, and the late afternoon became my time. Saturday and Sunday were my surest days.'] },
    ring: { t: 'Busy, and still out.', p: ['Work and travel kept me busy, and the days held all the same.'] },
    rank: { p: ['My lowest year since I came back.'] },
  },
  2025: {
    hours: { p: ['Most outings began in the late afternoon, and Friday and Saturday were the surest days.'] },
    ring: { t: 'Two days in three.', p: ['A hard year in work, and I still went out on most days.'] },
    rank: { p: ['Up from 2024, the start of the climb back.'] },
    where: { t: 'Kenya again.' },
  },
  2026: {
    hours: { p: ['The busiest hour moved to the early morning, though the evenings still held more outings.'] },
    ring: { t: 'No zero day.', p: ['Every day of the year so far has an outing. Some are short, and they still count.'] },
    rank: { p: ['Only 2021 and 2022 went further on foot.'] },
    where: { t: 'Three new regions.', p: 'Rukwa, Njombe and Singida were new this year, and in Kenya I walked the Ngong Hills.' },
  },
}

// One photo for each year, shown under the opening. Empty until I add them:
//   2023: { src: 'photos/years/2023.jpg', alt: 'what the photo shows', cap: 'a line under it' },
export const YEAR_PHOTOS = {}
