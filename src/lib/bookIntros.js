// The opening essay of each chapter of My Book, printed only in the book,
// under the chapter title, keyed by the chapter's route. Written without figures on purpose: the numbers
// live in the sections, where they are computed from the data, so these
// pages never go stale. Each essay says what the chapter asks, how it is
// built and what the charts in it are designed to do.
export const BOOK_INTROS = {
  '/': {
    paras: [
      'This first chapter is the whole record seen from far away. Before any single year, sport or place, I wanted one look at the habit itself: how one day leads to the next, which days carry the distance, when in the day I go out, and how the mix of running and walking changed as the years went by.',
      'The chapter runs in six parts, in the order the years happened. Each section asks one question and answers it in the title, so the titles alone can be read as a summary of the chapter. Under each title is a statement with the numbers that support it and, in most sections, a row of four figures and two charts that look at the answer from two sides.',
      'Haba na haba hujaza kibaba, little by little fills the measure. That saying runs through this chapter. Most of the findings here are about small things repeated: short walks on tired days, the same hours of the morning and evening, the same roads at home.',
    ],
    design: 'The charts in this chapter set the visual rules for the whole book. Orange marks the thing a section is about and grey holds the context. Bars start at zero, values are printed on the marks, and every pair of charts shares one height so they can be read side by side. Under each pair there is a note on how to read the charts and a design lesson on why they were drawn that way.',
  },
  '/numbers': {
    paras: [
      'This chapter goes through the record one year at a time, from the small beginning, through the long layoff, to the year I came back and the years that followed. Each year has its own short opening and then the same set of sections in the same order: the busiest month, the sport that led, the hour of the day, the share of days out, the usual outing, the chain of days, the biggest days, the places and the year’s rank among all the others.',
      'Keeping the same order was a choice. A reader who has learned to read one year can read every other year at once, and what is left to see is the difference between them. The early years are thin, and their pages say so plainly. The later years are full, and the same charts carry far more marks.',
      'Mwaka ni mwaka, a year is a year. Each one is judged on its own days, and the comparisons with the year before are there only to show which way I was moving.',
    ],
    design: 'This chapter is a lesson in small multiples: the same charts repeated for each year, drawn the same way. Because the charts repeat, each design lesson is taught once, under the first year where it appears, and the later years are left to be read with what the reader already knows.',
  },
  '/sports': {
    paras: [
      'I move on foot in four ways: I run, I walk, I hike and I run on trails. This chapter puts them side by side. It looks at how much ground each one covers, how many hours each one takes, how fast each one moves and how much each one climbs.',
      'The sports are not the same kind of effort, so the chapter compares them on more than one measure. A sport can lead on distance and trail on hours, or climb the most while being the rarest. The sections follow those measures one by one, and later ones look at how the sports sit together in a single day.',
      'Running has a story of its own here. For a long time most of it was on the treadmill, and over the years more of it moved outside. Several sections follow that move.',
    ],
    design: 'Each sport keeps one colour in every chart of this chapter, and in the rest of the book. The charts here also show distributions, the whole spread of outings, because a single average pace or distance would hide how different the sports really are.',
  },
  '/records': {
    paras: [
      'This chapter is about the edges of the record: the longest days, the biggest climbs, the quickest times and the records I have broken against myself. Every record here is my own, set against my own earlier days.',
      'A record means little without the ordinary days around it, so the charts show each record inside the crowd it came from. The last sections ask a harder question: do my records break more often than chance would give? The answer is tested, and it is printed with the test.',
      'Mtaka cha mvunguni sharti ainame, whoever wants what is under the bed must bend down. No record here came easily or from one day alone. Each one stands on the weeks of plain outings before it.',
    ],
    design: 'The charts of this chapter are built to show extremes honestly. A record is drawn on top of every ordinary effort, a staircase holds each record flat until the day it falls, and a ring shows what chance alone would have given.',
  },
  '/where': {
    paras: [
      'This chapter is about the ground under the outings. Most of my record is in Tanzania, and most of that is at home, on the same streets and roads. A few regions carry most of the outings, and a few others carry most of the climbing.',
      'The chapter moves from the country to the regions and then outside the border, to the other African countries where I went out on foot. It also counts the outings with no place at all, the ones on the treadmill with no GPS start.',
      'Home is where the habit lives. The hills are where I go to test it, and the two kinds of place give two very different kinds of outing.',
    ],
    design: 'Maps are the obvious chart for places, and this chapter uses them, shaded on a log scale so home does not wash out everywhere else. But a map is poor at ranking, so every map comes with ranked bars or a list beside it.',
  },
  '/timeline': {
    paras: [
      'This chapter lays the whole record along one line of time, from my first upload to the last day in this edition. It looks at the gaps as much as at the outings, because the gaps tell where the habit broke and how it came back.',
      'The first sections look at the breaks: how long they were and how they became shorter. Then the chapter follows the change from the treadmill to the hills, and it ends with a chronicle of the moments that mattered, each one in its place on the line.',
      'Polepole ndio mwendo, slowly is the way to go. The timeline shows that the habit did not appear in one day. It grew over seasons, with a long silence in the middle.',
    ],
    design: 'A timeline is the simplest chart there is, and the hardest to keep readable when many things happen. The chronicle in this chapter solves it with lanes: one row for each kind of event, all sharing the same time axis.',
  },
  '/goals': {
    paras: [
      'Each year I aim for three targets on foot: a distance walked, a distance run and a height climbed. This chapter follows them year by year, shows the day each one was met, and estimates the chance of meeting the ones still open this year.',
      'It also has two goals of a different kind. One is a race I have run again and again on the same course, which makes it a fair test of one year against another. The other is a place I set out to reach fifty times. Near the end comes a goal I never set, the unbroken chain of months with at least one outing.',
      'A target is useful only when it changes what I do on an ordinary day. The goals here are simple enough to check in my head on any morning, and that is why they work for me.',
    ],
    design: 'Goals have a clear shape: met or not met, ahead or behind. The charts of this chapter use that shape. Rings close when a target is met, grey years race against the year in progress, and a forecast is shown as many possible endings to the year rather than one line.',
  },
  '/what-it-means': {
    paras: [
      'This chapter turns from what happened to what I learned. Each section is one lesson, drawn from my own record, about what the habit costs, what keeps it going and how a year adds up.',
      'The lessons are mine and they come from one person’s days. I share them as things that worked for me, and the last section gathers them for anyone starting out.',
      'Usipoziba ufa utajenga ukuta, if you do not fill the crack you will build a wall. Most of the lessons here are about the small cracks: the one zero day that becomes five, the short walk that keeps the chain unbroken.',
    ],
    design: 'The charts in this chapter are chosen to make each lesson easy to feel. Time is drawn as clocks, days are stacked as dots that can be counted, and the trade-off between more days and longer days is drawn as lines of equal total.',
  },
  '/on-trial': {
    paras: [
      'The chapters before this one describe patterns. This chapter tests them. I took twelve claims that the book makes, or that I believed about myself, and put each one on trial with a statistical test that could prove it wrong.',
      'Each case has the same parts: the claim, what I tested, the methods, the results, a chart, a plain reading of what it shows and its limits. Some claims are proven, some are supported, and some are not proven. The ones that failed are printed as fully as the ones that passed.',
      'Ukweli ni mchungu, the truth is bitter. A habit is easy to tell stories about, and this chapter is where the stories are checked. At the end, the tests are corrected for the fact that many were run at once, and each method is explained in full.',
    ],
    design: 'Evidence charts have one extra job: they must show uncertainty. The charts of this chapter draw the world where nothing is going on next to the real data, size points by how much evidence they hold, and give every estimate its interval.',
  },
}
