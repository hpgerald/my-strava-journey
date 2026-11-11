import { createContext, useContext } from 'react'

// Inside a mountain scene the words set the height: the scene measures its text
// column and hands the chart beside it the height that makes both end on one
// line. 0 means "no wish": the chart keeps its own height.
export const SceneH = createContext(0)
export const useSceneH = () => useContext(SceneH)
// a chart's own height, raised to the scene's wish, never past 1.7 times its own
export const fitH = (own, want) => (want > own ? Math.round(Math.min(want, own * 1.7)) : own)
