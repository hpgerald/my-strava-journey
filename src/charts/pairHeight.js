import { createContext, useContext } from 'react'

// When two charts stand side by side, the section measures both and shares the
// taller one's height here; a chart that can stretch draws itself at least that
// tall, so the pair has one height. Outside a pair the value is 0 and every
// chart keeps its own height. Read it first thing in a chart (usePairH), then
// size with fitH.
export const PairH = createContext(0)
export const usePairH = () => useContext(PairH)
export const fitH = (t, H) => (t && t > H ? Math.round(t) : H)
