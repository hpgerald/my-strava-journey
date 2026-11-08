import { setLessons } from './lessonsRegistry.js'
import ColBars from '../charts/ColBars.jsx'
import HBars from '../charts/HBars.jsx'
import StackCols from '../charts/StackCols.jsx'
import Ridges from '../charts/Ridges.jsx'
import FitScatter from '../charts/FitScatter.jsx'
import TwoLines from '../charts/TwoLines.jsx'
import CumLine from '../charts/CumLine.jsx'
import PairBars from '../charts/PairBars.jsx'
import LorenzCurve from '../charts/LorenzCurve.jsx'
import DecileBars from '../charts/DecileBars.jsx'
import TransitionMatrix from '../charts/TransitionMatrix.jsx'
import HabitMomentum from '../charts/HabitMomentum.jsx'
import SportTreemap from '../charts/SportTreemap.jsx'
import RadialHours from '../charts/RadialHours.jsx'
import MonthGrid from '../charts/MonthGrid.jsx'
import GeoBubbles from '../charts/GeoBubbles.jsx'
import FootFlip from '../charts/FootFlip.jsx'
import DaySplit from '../charts/DaySplit.jsx'
import IndoorOutdoor from '../charts/IndoorOutdoor.jsx'
import YearVsPrev from '../charts/YearVsPrev.jsx'
import YearRank from '../charts/YearRank.jsx'
import YearProgress from '../charts/YearProgress.jsx'
import YearMonths from '../charts/YearMonths.jsx'
import YearDistances from '../charts/YearDistances.jsx'
import YearCalendar from '../charts/YearCalendar.jsx'
import TailOutlier from '../charts/TailOutlier.jsx'
import OutingSky from '../charts/OutingSky.jsx'
import SpikeHist from '../charts/SpikeHist.jsx'
import ShareRows from '../charts/ShareRows.jsx'
import RangeCols from '../charts/RangeCols.jsx'
import Grades from '../charts/Grades.jsx'
import FootMap from '../charts/FootMap.jsx'
import RecordStairs from '../charts/RecordStairs.jsx'
import ChanceRows from '../charts/ChanceRows.jsx'
import PlaceMap from '../charts/PlaceMap.jsx'
import GoalRace from '../charts/GoalRace.jsx'
import GhostRace from '../charts/GhostRace.jsx'
import RasKilomoni from '../charts/RasKilomoni.jsx'
import GoalRings from '../charts/GoalRings.jsx'
import YearMoment from '../charts/YearMoment.jsx'
import Chronicle from '../charts/Chronicle.jsx'
import KiliClimb from '../charts/KiliClimb.jsx'
import HanangDay from '../charts/HanangDay.jsx'
import { KiliSplit, KiliKm } from '../charts/KiliHalf.jsx'
import { StopBars, SimHist, MonthBeads, CloseDots } from '../charts/GoalCharts.jsx'
import { DfaChart, MomentumChart, ErasChart, SeasonChart, HeapChart, TreadPaceChart, EvScatter, LongDayChart, KudosChart } from '../charts/EvidenceCharts.jsx'
import { WeekStrips, TwoPaths, NextGrid, IsoKm, DayPile, DayClocks } from '../charts/MeaningCharts.jsx'

// The design lessons of My Book. Every chart in the book is a small example of
// a principle of data visualisation, and the book teaches that principle under
// the chart the first time it appears: what was done, why it works, and how a
// reader can use it in their own work.
// Each kind of chart has its own list of lessons, all true of every chart of
// that kind. The book gives each chart the first lesson of its list that has
// not been taught yet (see assignLessons), so a lesson is never printed twice
// and charts that come back year after year teach something new each time.

export const LESSONS = {
  // ---- plain vertical bars ----
  'bars-zero': ['Bars start at zero', 'A bar is read by its length, so the axis under a bar chart always starts at zero. Cut the axis short and a small difference looks huge, because the eye still reads the whole bar.', 'If your values sit far from zero and the change is what matters, use dots or a line, which do not need a zero.'],
  'bars-label': ['Put the number on the bar', 'Each bar carries its value on top, so nobody has to slide across to the axis and guess. The gridlines stay faint because they only give the scale; the printed values do the exact work.', 'When there are fewer than about fifteen bars, label them directly and lighten the gridlines or drop them.'],
  'bars-accent': ['Colour only what the story is about', 'The bars here are grey or black, and the ones the story is about are orange. The colour points at the bar the headline is about, so the eye lands there first.', 'Choose one colour for the point you are making and keep everything else neutral. If everything is coloured, nothing stands out.'],
  'bars-ref': ['A reference line turns bars into answers', 'The dashed line is a benchmark: an average, an even share or a target. With it, each bar answers a plain question, above or below? Without it, the reader has to carry the benchmark in their head.', 'Add one reference line and label it at its end, away from the bars. One is enough; three become clutter.'],
  'bars-order': ['Keep the natural order', 'These bars keep the order their labels already have, such as years, months or days of the week. Sorting them by height would make the tallest easy to find and the pattern over time impossible to see.', 'Sort bars by value only when the categories have no order of their own, like countries or products.'],

  // ---- horizontal bars ----
  'hbars-names': ['Lay bars on their side for long names', 'When each row has a long name, like a date with a line of detail under it, horizontal bars let every name sit level at the start of its row. Upright bars would force the names to slant or shrink.', 'If your labels are longer than a word or two, turn the chart on its side.'],
  'hbars-sorted': ['Sort a list from the top', 'The rows are sorted, biggest first, so the order itself carries the ranking and the eye reads it like a list. The first row is the answer to the question in the title.', 'For any ranking, sort before you draw. A ranking in alphabetical order makes the reader do the sorting.'],
  'hbars-sub': ['Context under the label', 'Each row has a second, quieter line under its name, such as the number of outings or the place. The detail sits where the eye already is, so there is no table or footnote to look up.', 'Put the one extra fact a reader will want right under the label, in a smaller and lighter type.'],
  'hbars-end': ['The value at the end of the bar', 'The number sits just past the end of each bar, so the length and the exact value are read in one look.', 'Leave space at the right of the longest bar for its label. A number crammed inside a bar is hard to read.'],
  'hbars-colour': ['The same colour, the same meaning', 'The colour of each bar follows a fixed code, and the same thing keeps the same colour in every chart where it appears. A reader learns the code once and can then read every chart that uses it.', 'Fix one colour for each category across a whole report and never reuse a colour for something else.'],

  // ---- stacked columns ----
  'stack-base': ['Stacks: the bottom piece is the easy one', 'Each column is a total cut into parts. The total and the bottom piece are easy to compare across columns, because they sit on the same floor. The pieces higher up float, so their sizes are harder to judge.', 'Put the part you most want compared at the bottom of the stack, and keep the number of parts small, four at most.'],
  'stack-total': ['Print the total on top', 'A stacked column hides its total in the sum of its pieces, so the total is printed above each column. The reader gets the whole and the parts without doing arithmetic.', 'When you stack, always give the total. Readers should never have to add.'],

  // ---- ridgelines ----
  'ridge-shape': ['Look at the shape behind the average', 'An average or a median is one number, and very different groups can share it. A smoothed distribution for each group shows what the single number hides: two humps, a long tail, a hard edge.', 'Before you report an average, draw the distribution. If it has two humps, the average describes almost nobody.'],
  'ridge-scale': ['Scale each row to itself, and say so', 'Each ridge is scaled to its own highest point, so the shapes line up and can be compared. The price is that heights can no longer be compared between rows: a tall ridge is a common value within its own row, nothing more.', 'When you rescale to compare shapes, tell the reader that the heights are no longer counts.'],

  // ---- scatter with a fitted line ----
  'scatter-all': ['Show every point before the summary', 'Every outing is a dot, and the fitted line comes after them. The line is a summary; the dots are the evidence. Seeing both shows how well the line fits, which a single number cannot.', 'Never show a trend line without the points behind it, unless there are too many to draw.'],
  'scatter-r': ['Give the line its strength', 'A fitted line can look steep while the dots scatter widely around it. The correlation, r, where 0 means no link and 1 means every dot sits on the line, says how far the line can be trusted, so it is printed with the line.', 'Print the strength of a relationship next to the line, and describe it in words: weak, moderate or strong.'],

  // ---- two lines over time ----
  'lines-end': ['Label lines at their ends', 'Each line is named where it finishes, with no legend box. The eye follows the line to its name instead of jumping between the chart and a key.', 'With up to four or five lines, drop the legend and write each name at the end of its line, in the line’s colour.'],
  'lines-cross': ['Mark the moment that matters', 'The point where one line overtakes the other is marked and dated. A crossing is often the whole story of a line chart, and an unmarked one is easy to miss.', 'Annotate the one turning point your reader should remember, right on the chart.'],

  // ---- running totals ----
  'cum-slope': ['In a running total, the slope is the speed', 'A running total only rises or stays flat, so its slope tells the story: steep is a busy spell and flat is a pause. The eye reads slope well, which makes a cumulative line a good way to show pace over time.', 'Use a cumulative line when the journey to a total matters more than the amount in each period.'],
  'cum-marks': ['Milestones as dropped lines', 'Each milestone is marked where the line crossed it, with a dashed line down to the date. The reader can read both how much and when without a table.', 'Mark round-number milestones on a running total; they give the eye steps to climb.'],

  // ---- dumbbells ----
  'dumbbell': ['A dumbbell shows a gap', 'Each row has two dots, one for each share, joined by a bar. The length of the bar is the gap, and the rows are sorted by it, so the places that climb far more than they are visited sit together.', 'When the story is the difference between two values, draw both and join them. Two separate bar charts hide the gap.'],

  // ---- inequality ----
  'lorenz': ['Draw the line of equality', 'A line of equality gives the curve something to be measured against. Without it, a bowed line is only a shape; with it, the reader sees at once how far the record is from even, and the shaded gap turns that distance into a single number, the Gini coefficient.', 'When you show how unequal something is, draw what equal would look like. The gap is easier to see than to describe.'],
  'deciles': ['The same data, cut more simply', 'A curve like the one beside it is exact but unfamiliar, and a row of ten bars is rough but easy. Showing the same days both ways lets each reader take the view that suits them, and each view checks the other.', 'Pair an exact but unfamiliar chart with a simpler view of the same numbers.'],

  // ---- tables as charts ----
  'matrix': ['A small table can be a chart', 'Four numbers in a two-by-two grid, each cell shaded by its size, read faster than four bars. The grid keeps the numbers exact and the shading gives the pattern, so the table works as a table and as a picture.', 'For a handful of numbers in rows and columns, shade the cells of a table instead of drawing a chart.'],
  'momentum': ['Put the starting point in the middle', 'When two forces pull in opposite directions, a shared centre lets them be compared directly. Both sides grow from the same point on the same scale, so the difference in how steeply they move is the finding, and nobody has to line up two separate charts.', 'When two forces push in opposite directions, give them a shared centre and let them grow apart.'],

  // ---- parts of a whole ----
  'treemap': ['Area for the parts of a whole', 'Each tile’s area is its share of all outings. A treemap fits many parts into a small rectangle and keeps the biggest ones obvious, though areas close in size are hard to rank.', 'Use a treemap for many parts of one whole; use bars when the reader must rank parts of similar size.'],
  'flip': ['Ribbons show how shares swap', 'The same sports are stacked twice, by distance and by climb, and a ribbon joins each sport’s two shares. When a ribbon crosses, the order has flipped, which is the point of this chart.', 'To show how the same parts rank on two different measures, stack them side by side and connect them.'],
  'hundred': ['Stack to 100% when only the balance matters', 'Every year is scaled to the same full height, so the totals disappear and only the split between the two bands remains. The line between them can be read like a water level.', 'Use 100% stacks for shares over time, and give the totals somewhere else if they matter.'],
  'sharerows': ['Rows of shares for many measures', 'Each row is one measure cut into the sports’ shares, all rows the same length. Reading down one colour shows how one sport’s share changes from measure to measure.', 'Line up 100% bars when you want to compare the same parts across several totals.'],
  'bigshare': ['One big shape for the main share', 'When one part holds almost everything, a pie or a stack makes the small parts unreadable slivers. Giving the main part one big shape of its own, and setting the small ones apart in a list, lets both be read.', 'When one part dominates, show it big and simple, and list the rest.'],

  // ---- time and calendars ----
  'radial': ['Use a circle only for things that go round', 'The hours of the day loop: eleven at night sits next to midnight. On a clock face the morning and evening bulges read at once, and no hour is cut at the edge.', 'Radial charts suit cycles such as hours, days of the week or seasons. For anything that does not loop, use a straight axis.'],
  'heatmap': ['A heatmap for two time scales', 'Data with two kinds of time, such as years and months, is hard to show with lines: twelve lines tangle and eight lines tangle. A grid with one time on each axis keeps every value in its place, and shade is enough to see the season and the trend.', 'When data has two kinds of time, put one on each axis and colour the cells.'],
  'calendar': ['Borrow a layout the reader already knows', 'Every day of the year is set as a wall calendar, Sunday first. Nobody needs a key to find a week or a month, so the attention goes to the pattern of orange days.', 'If your data has a familiar shape, like a calendar or a map, use it. Familiar layouts cost the reader nothing to learn.'],
  'units': ['Split a bar into its units', 'Each row is a typical day, cut into blocks, one block per average outing. A row of short blocks is a day of doubles, one long block is a single long outing. The same length can be made in different ways, and the blocks show which.', 'When a total is made of countable pieces, draw the pieces.'],
  'progress': ['Draw the year as it was built', 'The line adds up each month’s distance from January, so it ends at the year’s total. Its steep stretches are the strong months, and for a year still running it stops where the record stops.', 'For progress within a period, a running total reads more naturally than separate monthly bars.'],
  'months': ['Months in calendar order', 'Seasonal data keeps the calendar order, so the shape of the year reads like a profile from January to December. Only the bar that matters gets a label of its own; the others are left for the eye.', 'For seasonal data, keep the calendar order and label only the bar you want remembered.'],
  'beads': ['Make the zeros visible', 'A month with nothing is easy to miss if it is just a gap. Drawing it as an empty ring keeps it on the page, so the reader sees where the record was silent as clearly as where it was full.', 'Make missing data and zero visible on purpose. A blank space is easy to overlook.'],
  'eventsdays': ['Put events on the calendar', 'When the question is when something happened, a date in a list is hard to compare. Placed on a shared time axis, early and late can be seen at a glance, and a row with nothing on it says as much as a row that is full.', 'Plot dates on a time axis rather than listing them.'],

  // ---- distributions ----
  'bins': ['Bin to the unit people think in', 'Outings are grouped by whole kilometres, the way a runner thinks of distance, and the long tail is folded into one last bar so it does not stretch the axis.', 'Choose bin widths that match how your reader thinks, and gather a long tail into one labelled bin.'],
  'spikes': ['Let the exceptions break the pattern', 'The bars are thin and grey, except a few that stand out in orange with their counts. The spikes are the finding: runs that stopped on round numbers.', 'In a histogram, narrow bins reveal spikes that wide bins would smooth away.'],
  'tail': ['Show the outlier in its crowd', 'The record is drawn on top of every ordinary effort it came from, with a band for the usual spread. Distance from the band, counted in standard deviations, says how unusual the record is.', 'To show how extreme a value is, draw the distribution it belongs to.'],
  'spread': ['Show the middle half beside the average', 'A single average hides whether a year was steady or all over the place. Setting the middle half of the values next to the median answers both questions, with very little ink.', 'Report the spread next to the centre. A band and a tick are enough.'],
  'invert': ['Flip the axis so up means better', 'For pace, a smaller number is quicker, so the axis runs upside down and quicker years stand taller. The axis label says so.', 'If lower is better, consider flipping the axis, and always say you did.'],
  'strips': ['A dot for every week', 'Each week is a dot on its year’s row, with a band for the middle half and a tick for the median. The reader sees the summary and every week behind it at the same time.', 'With a few hundred values per group, a strip of dots with a band shows more than a box plot.'],
  'pile': ['A histogram you can count', 'Stacking one dot per day gives the shape of a histogram while keeping every day as a real mark. People trust what they can count, and a dot plot invites counting in a way bars do not.', 'When the counts are small enough, stack dots instead of drawing bars.'],

  // ---- relationships and comparisons ----
  'fourchannels': ['Four measures in one scatter', 'One scatter can carry four measures at once if each goes to the right channel. Position is the most exact channel the eye has, so it holds the two measures that matter most. Size and colour are rougher, so they hold the measures that only need to be read roughly or by group.', 'Before you add size or colour to a scatter, check that each extra measure can still be read at a glance. If it cannot, give it a chart of its own.'],
  'exaggerate': ['Exaggerate on purpose, and say so', 'True to scale, most gradients on foot would look flat and the differences between them would vanish. Stretching the height makes them visible, and printing the real values keeps the stretch honest.', 'If you stretch a scale to make differences visible, print the real numbers and state the stretch.'],
  'steps': ['A staircase for records', 'Choose the shape of a line to match how the value really changes. A slope between two points says the value grew smoothly between them; a step says it stayed the same and then jumped. A record jumps, so a staircase is the honest shape.', 'Use step lines for values that change in jumps: records, prices, rules.'],
  'chance': ['Compare with what chance would give', 'A count on its own cannot be called high or low. Setting it next to what a random order of the same outings would give turns it into an answer: above chance or not.', 'Show the expected value next to the observed one. Without it, a count has nothing to be measured against.'],
  'logmap': ['A log scale on a map', 'Home has so many outings that a straight colour scale would paint it dark and leave every other region pale. A log scale gives each tenfold step the same change in shade.', 'When one place dominates a map, shade it on a log scale and say so in the key.'],
  'index': ['Index to a base year', 'Both lines are shown as a share of the same base year, so two measures with different units can share one axis. The gap between them is the story.', 'To compare the shapes of two measures with different units, index both to the same starting point.'],
  'smallmult': ['Small multiples', 'One small chart per year, all drawn the same way and to the same scale. The eye compares them like faces in a row.', 'When one chart gets crowded, split it into a grid of small identical charts.'],
  'iso': ['Draw the trade-off', 'When an outcome is the product of two inputs, the same total can be reached in many ways. Lines of equal outcome across a chart of the two inputs show all those ways at once, and placing each case among them shows which lever it pulled.', 'When an outcome is the product of two inputs, draw lines of equal outcome across a chart of the two inputs.'],
  'unitsquares': ['One square per case', 'Each long run is a square, grouped by what followed it. Counting squares is easier than reading percentages, and the groups show the split at a glance.', 'For counts under a few hundred, unit charts make the size of each group concrete.'],
  'tiles': ['Count with marks', 'Each trip is one numbered tile, run or walk, in the order I made them. A tally is the oldest chart there is, and it still works: the wall fills as the trips add up.', 'When each item matters on its own, draw one mark per item instead of a single bar.'],
  'moment': ['One moment, one picture', 'The year’s defining moment gets a single small picture and a short statement. A chart does not need axes and gridlines when it carries one fact.', 'For one number that matters, a big figure and a simple shape beat a full chart.'],
  'sky': ['Every point, no summary', 'Nothing in this chart is averaged. A few thousand marks fit on one page when each is small, and the eye finds the gaps, the habits and the changes of hour by itself, all things an average would hide.', 'When you have a few thousand records, try plotting all of them before summarising. Patterns appear that averages hide.'],
  'sky-alpha': ['See-through dots for crowded charts', 'The dots are partly transparent, so where many overlap the area grows darker. Density shows without counting.', 'In a crowded scatter, lower the opacity until overlaps become visible.'],
  'rank': ['One against all', 'The year being read is orange and every other year is grey, on one shared axis. The reader sees its place in the field at a glance.', 'To show where one item stands, draw all of them and colour only that one.'],
  'vsprev': ['Two years on one scale', 'This year and last year share one scale for each measure, with the change written beside them. Separate scales would make a small change look as big as a large one.', 'When comparing two periods, keep the scale shared and print the change.'],
  'stops': ['Split a bar into what it is made of', 'Each bar is the time on the course, cut into moving and stopped, with the stops hatched. A total time hides where the minutes went; the split shows it.', 'When a total is made of two different things, split the bar and treat the parts differently.'],
  'sim': ['Show uncertainty as many outcomes', 'A forecast given as one number pretends to know more than it does. Drawing many possible endings shows the range honestly, and the share that clears the target gives the chance in a form anyone can check by eye.', 'For a forecast, show the whole range of outcomes.'],
  'race': ['Many years, one race', 'Putting every year on one set of axes, with the past years in grey and the current year in colour, turns a question about one year into a comparison with all of them. The grey years are the context; the coloured one is the question.', 'Put the current period on top of grey past periods to show whether it is ahead or behind.'],
  'halves': ['Same span, so the steps compare', 'The way up and the way down each get a panel, and both panels cover the same number of minutes. A step of five minutes is as wide on one side as on the other, so the reader sees at once which half changed more. The scale starts near the times, since dots are compared by where they sit and need no zero.', 'When one measure is split into parts, give every part the same scale, so the changes can be compared directly.'],
  'kmgrid': ['One row for each time the same road', 'Every kilometre of every edition is a cell, darker where I was quicker, and the course is drawn above so each column sits under its piece of road. The years become rows that can be read across, and the road becomes columns that can be read down.', 'When the same course is covered many times, give each time a row on one grid, and line the grid up with the ground.'],
  'ghost': ['Movement when time is the story', 'On the site this race plays out as motion, because the story is who passed whom and when. Paper cannot move, so the printed chart is frozen at a moment that matters, and the times are written beside it.', 'Animate only when the change over time is the point, and always make a still version that tells the story on its own.'],
  'rings': ['Rings for progress toward a target', 'Each ring fills to its share of a target and closes when the target is met. Rings are quick to read as done or not done, though comparing the length of two arcs is harder than comparing two bars.', 'Use rings for a few goals that are either met or not; use bars when the exact shares matter.'],

  'mapnames': ['Name the places on the map', 'Only the places the story needs are named, right on the map, with a thin leader line where a place is too small to hold its name. The places with nothing logged stay pale grey and unnamed, so the eye goes to where the outings are.', 'Label a few places directly on a map and let the rest stay quiet. A map with every name printed reads like an atlas.'],
  'ledger': ['A list can be the chart', 'The countries are set as a ledger, busiest first, with the count in a large figure and the details in small type under each name. With a handful of rows, a well-set list is clearer than any bars.', 'When there are only a few items and each has several facts, set them as a ranked list with one big number per row.'],

  'clockaxis': ['Choose the axis that tells the story', 'The same hike could be drawn against distance, and it would show a mountain. Drawn against the clock, it shows a day: the slow morning climb, the long way down, the hours past midnight. The choice of axis decides which story the chart tells.', 'Before you draw, ask what the reader should feel: the shape of the ground, or the length of the effort. Put that on the horizontal axis.'],
  'brackets': ['Brackets for spans of time', 'The two brackets above the line give the hours up and the hours down. A bracket names a stretch of the axis without adding a single mark to the data, so the line stays clean.', 'When a duration matters, mark its start and end with a bracket and write the length on it.'],
  'gap': ['Show the gap in the data', 'When a recording fails, the easy thing is to join the last point to the next one and move on. Here that straight line would say I came down from near the crater rim to Kibo Hut in a moment. The grey band and the dashed line keep the gap in view and say plainly which part was not recorded.', 'Never let a line quietly bridge missing data. Break it, mark the gap, and say why it is there.'],
  'stagewidth': ['Width for distance, height for altitude', 'Each stage is as wide as the ground it covered, so a long day looks long and a steep day looks steep. Columns of equal width for each day would have hidden that the second day was the longest.', 'When the parts of a journey differ in length, give each part its true length on the axis.'],

  // ---- the whole record on one line ----
  'lanes': ['Lanes for different kinds of events', 'Time runs left to right, and each lane holds one kind of moment: milestones, firsts, trips, shoes, streaks. Sorting events into lanes keeps a busy timeline readable, because the eye can follow one kind at a time or read straight down for one moment.', 'For a timeline with many kinds of events, give each kind its own row on a shared time axis.'],

  // ---- the charts of the trial ----
  'loglog': ['Log scales for patterns across sizes', 'Both axes are on log scales, so each equal step along them is a doubling of the window. On log scales a power law, the signature of a long memory, becomes a straight line, and its slope can be read by eye.', 'When values span many sizes, from days to months, try log scales on both axes. Label the ticks with real values, never with logarithms.'],
  'null': ['Draw the world where nothing is going on', 'The second line is the same days shuffled into a random order: the same total, no memory. The real line is read against it, so the gap between the two is the finding.', 'Wherever you can, draw what pure chance would look like next to the real data. It is the honest way to show that a pattern is real.'],
  'nsize': ['Let the dot show how much evidence it holds', 'Each dot is sized by the number of days behind it. The small dots at the far end rest on a few long streaks, the big ones on hundreds of days, so the reader knows which points to trust before reading a single number.', 'When some points rest on far more data than others, size them by their sample, or fade the thin ones.'],
  'eras': ['Summarise the eras over the raw data', 'The grey bars are every week; the flat lines are the average of each era the test found, with the value written above. The summary sits on the data instead of replacing it, so the reader can check that each step is real.', 'Draw the model on top of the data it was fitted to, and make the model the darker of the two.'],
  'fit': ['Show the model and the data together', 'The bars are each month’s real share of days out; the curve is a fitted yearly wave. Where the bars and the curve agree, the season is regular; where they part, it is not.', 'Draw a fitted curve as a thin dark line over lighter data, never alone.'],
  'dotrange': ['A dot and a line for a typical value and its spread', 'Each year is a dot at its median pace and a line covering its middle half of runs. It is the simplest way to show a centre and a spread, and it takes a fraction of the ink of a box plot.', 'For a few groups, a dot with a line through the middle half is clearer than a full box plot.'],
  'tracks': ['A full track behind each bar', 'Each bar runs inside a pale track that marks the whole scale, so a short bar reads as short against something. Rows in two groups use the same scale, so the groups compare directly.', 'Give bars a faint track to the end of the scale when the reader must judge each one against the full range.'],
  'intervals': ['Show the uncertainty around each estimate', 'Each factor is a dot for its best estimate and a line for its 95% interval. A line that crosses the zero line is an effect the data cannot tell apart from none, and those dots are left hollow.', 'Whenever you show an estimate, show its interval, and mark zero or no change clearly so the reader can see which intervals cross it.'],

  // ---- the general lessons, open to any chart ----
  'gen-headline': ['A headline that says the finding', 'Each section is titled with what its charts show, in one short sentence. The title is the first thing read, so it carries the conclusion.', 'Write chart titles as findings. "Walks took over" tells the reader what to see; "Walks and runs by year" only names the data.'],
  'gen-pair': ['Two views of one finding', 'Each section sets two charts side by side at the same height: one shows the pattern, the other explains or tests it. Together they make an argument that one chart alone cannot.', 'When one chart raises a question, put the chart that answers it right beside it.'],
  'gen-grid': ['Light grid, dark data', 'Gridlines and axes are drawn in the lightest grey that still reads, and the data in black or orange. Everything that is not data stays in the background.', 'Make the data the darkest thing on the chart.'],
  'gen-notes': ['Explain in plain words', 'Most charts in this book carry a short note on how to read them, in everyday language. A chart is only clear when the reader knows what each mark means, and a sentence costs far less than a misread chart.', 'Add one or two sentences in plain words under every chart you share.'],
  'gen-units': ['Units people can feel', 'Where it helps, numbers are turned into things a reader can picture: Everests climbed, or the road from Dar es Salaam to Dodoma walked end to end. A unit people can feel makes a number stay.', 'Translate one big number into a comparison your audience knows.'],
  'gen-repeat': ['The same chart for the same question', 'Every year in this chapter is told with the same charts in the same order. Once a reader has learned to read one year, every other year reads at once, and the differences between years are the only thing left to see.', 'In a report that comes back every month or year, keep the charts the same each time. Change the design only when the question changes.'],
  'gen-source': ['Say where the numbers come from', 'Each section ends with a source line naming the table the numbers came from. A reader who doubts a figure knows where to look, and the writer has to be sure every number can be traced.', 'Put a short source line under every chart you publish, even when the data is your own.'],
  'gen-round': ['Round to what the reader needs', 'Distances are mostly printed in whole kilometres and shares in whole percents. More digits would look more exact and say nothing more, and they would slow the reading.', 'Round every printed number to the precision the decision needs. Keep the full figures in the table behind the chart.'],
  'gen-white': ['White space is part of the design', 'Each chart has room around it, and the text and the chart do not crowd each other. White space groups what belongs together and separates what does not, without a single extra line.', 'Before adding a border or a box, try adding space.'],
  'gen-one': ['One chart, one message', 'Each chart here answers a single question, and the question is in its title. When a chart tries to say three things, the reader usually leaves with none.', 'Before you draw, write the one sentence the chart must prove. If you need two sentences, draw two charts.'],
  'gen-text': ['Charts with words, words with charts', 'The charts in this book sit between a statement that says what they show and a story that says why it matters. The chart is the evidence; the words are the argument.', 'Never send a chart alone. Put one sentence before it and one after it.'],
  'gen-grey': ['Grey is a colour too', 'Many marks in this book are grey, so the few in orange or black carry the meaning. Grey keeps the context visible without asking for attention.', 'Start every chart in grey, then add colour only where the reader should look.'],
  'gen-access': ['A chart for every reader', 'On the site, every chart carries a written description for screen readers, with the same numbers the picture shows. Writing it is also a test: if the description is hard to write, the chart is probably unclear.', 'Write a one-line text version of each chart you publish. It helps readers who cannot see it and sharpens the chart for everyone.'],
  'gen-axis': ['Label the axis with its unit', 'Where a chart has an axis, its label gives the unit in plain words, such as km, outings or share of days. A number without a unit is a guess.', 'Write the unit on every axis, in words your reader uses.'],
  'gen-fewer': ['Fewer marks, more meaning', 'Nothing on these charts is decoration: no shadows, no 3D, no backgrounds. Every line and every shade carries data or helps read it.', 'For each element of your chart, ask whether the reader would miss it. If not, remove it.'],
  'gen-compare': ['Every number needs a comparison', 'Almost every figure in this book is set against something: last year, the best year, the average, a target. A number alone cannot be called big or small.', 'When you show a figure, show what to compare it with.'],
  'gen-print': ['Design for paper as well as the screen', 'On the site many of these charts move and respond to the pointer. In print they are frozen, so every value that matters must be printed, never left behind a tooltip.', 'Check every chart in its printed form. Anything a reader can only learn by hovering is lost on paper.'],
}

// bars whose labels already have an order: years, months, days
const ordered = (items) => (items || []).length > 2 && items.every((d) => /^(\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Sun|Mon|Tue|Wed|Thu|Fri|Sat)/.test(String(d.label)))

// which lessons each kind of chart can teach, in the order to teach them;
// some depend on the chart's own settings
const BY = new Map([
  [ColBars, (p) => ['bars-zero', 'bars-label', (p.items || []).some((d) => d.tone === 'big') ? 'bars-accent' : null, p.refLine ? 'bars-ref' : null, ordered(p.items) ? 'bars-order' : null]],
  [HBars, (p) => {
    const v = (p.rows || []).map((r) => r.value)
    const sorted = v.length > 2 && v.every((x, i) => !i || x <= v[i - 1])
    const keys = new Set((p.rows || []).map((r) => r.key))
    return ['hbars-names', sorted ? 'hbars-sorted' : null, (p.rows || []).some((r) => r.sub) ? 'hbars-sub' : null, 'hbars-end', keys.size > 1 ? 'hbars-colour' : null, p.refLine ? 'bars-ref' : null]
  }],
  [StackCols, () => ['stack-base', 'stack-total']],
  [Ridges, () => ['ridge-shape', 'ridge-scale']],
  [FitScatter, () => ['scatter-all', 'scatter-r']],
  [TwoLines, (p) => ['lines-end', p.cross >= 0 ? 'lines-cross' : null]],
  [CumLine, () => ['cum-slope', 'cum-marks']],
  [PairBars, () => ['dumbbell']],
  [LorenzCurve, () => ['lorenz']],
  [DecileBars, () => ['deciles', 'bars-ref']],
  [TransitionMatrix, () => ['matrix']],
  [HabitMomentum, () => ['momentum']],
  [SportTreemap, () => ['treemap']],
  [RadialHours, () => ['radial']],
  [MonthGrid, () => ['heatmap']],
  [GeoBubbles, () => ['bigshare']],
  [FootFlip, () => ['flip']],
  [DaySplit, () => ['units']],
  [IndoorOutdoor, () => ['hundred']],
  [YearVsPrev, () => ['vsprev']],
  [YearRank, () => ['rank']],
  [YearProgress, () => ['progress', 'cum-slope']],
  [YearMonths, () => ['months']],
  [YearDistances, () => ['bins']],
  [YearCalendar, () => ['calendar']],
  [TailOutlier, () => ['tail']],
  [OutingSky, () => ['sky', 'sky-alpha']],
  [SpikeHist, () => ['spikes']],
  [ShareRows, () => ['sharerows']],
  [RangeCols, (p) => ['spread', p.invert ? 'invert' : null]],
  [Grades, () => ['exaggerate']],
  [FootMap, () => ['fourchannels']],
  [RecordStairs, () => ['steps']],
  [ChanceRows, () => ['chance']],
  [PlaceMap, () => ['logmap', 'mapnames']],
  [GoalRace, () => ['race']],
  [GhostRace, () => ['ghost']],
  [KiliSplit, () => ['halves']],
  [KiliKm, () => ['kmgrid']],
  [RasKilomoni, () => ['tiles']],
  [StopBars, () => ['stops']],
  [SimHist, () => ['sim']],
  [MonthBeads, () => ['beads']],
  [CloseDots, () => ['eventsdays']],
  [WeekStrips, () => ['strips']],
  [TwoPaths, () => ['index']],
  [NextGrid, () => ['unitsquares']],
  [IsoKm, () => ['iso']],
  [DayPile, () => ['pile']],
  [DayClocks, () => ['smallmult']],
  [GoalRings, () => ['rings']],
  [YearMoment, () => ['moment']],
  [Chronicle, () => ['lanes']],
  [KiliClimb, () => ['gap', 'stagewidth']],
  [HanangDay, () => ['clockaxis', 'brackets']],
  [DfaChart, () => ['loglog', 'null']],
  [MomentumChart, () => ['nsize', 'momentum']],
  [ErasChart, () => ['eras']],
  [SeasonChart, () => ['fit', 'bars-accent']],
  [HeapChart, () => ['spikes', 'bins']],
  [TreadPaceChart, () => ['dotrange', 'invert']],
  [EvScatter, (p) => ['scatter-all', p.fit ? 'scatter-r' : null, p.fit ? 'fit' : null]],
  [LongDayChart, () => ['tracks', 'hbars-end']],
  [KudosChart, () => ['intervals']],
])
// lessons that are only true in one part of the book
const SCOPE = { 'gen-repeat': '.bk-yr' }

const GENERAL = ['gen-headline', 'gen-pair', 'gen-grid', 'gen-notes', 'gen-units', 'gen-repeat', 'gen-source', 'gen-one', 'gen-text', 'gen-grey', 'gen-compare', 'gen-axis', 'gen-round', 'gen-white', 'gen-fewer', 'gen-access', 'gen-print']

// the lessons a chart could teach, its own first, then the general ones
export function lessonKeysFor(node) {
  const f = node && node.type ? BY.get(node.type) : null
  const own = Array.isArray(node) ? node : f ? f(node.props || {}).filter(Boolean) : []
  return [...own, ...GENERAL].filter((k, i, a) => LESSONS[k] && a.indexOf(k) === i)
}

// In the finished book, give every chart the first of its lessons not yet
// taught, in reading order; a chart with nothing new to teach shows none.
export function assignLessons(root) {
  if (!root) return
  const used = new Set()
  root.querySelectorAll('.bk-lesson').forEach((slot) => {
    const opts = [...slot.querySelectorAll('[data-k]')]
    const pick = opts.find((o) => !used.has(o.dataset.k) && (!SCOPE[o.dataset.k] || slot.closest(SCOPE[o.dataset.k])))
    opts.forEach((o) => { o.hidden = o !== pick })
    slot.hidden = !pick
    if (pick) used.add(pick.dataset.k)
  })
}

// the block printed under a chart: every candidate is rendered, and
// assignLessons shows the one this chart teaches
export function LessonSlot({ keys }) {
  if (!keys || !keys.length) return null
  return (
    <div className="bk-lesson" hidden>
      {keys.map((k) => (
        <div key={k} data-k={k} hidden>
          <p className="bk-lesson__k">Design lesson · {LESSONS[k][0]}</p>
          <p className="bk-lesson__t">{LESSONS[k][1]}</p>
          <p className="bk-lesson__u"><b>In your own work.</b> {LESSONS[k][2]}</p>
        </div>
      ))}
    </div>
  )
}

setLessons({ lessonKeysFor, LessonSlot })
