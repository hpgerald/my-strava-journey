// A hand-off point for the design lessons of the book. lib/vizLessons.jsx knows
// every chart, so importing it pulls in every chart; only My Book needs it, and
// My Book imports it, which registers it here. Other pages never load it.
let api = null
export const setLessons = (a) => { api = a }
export const getLessons = () => api
