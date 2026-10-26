import { createContext, useContext } from 'react'

// When a page is rendered inside My Book it is typeset rather than browsed:
// no site chrome, no scroll choreography, every chart drawn at its final state.
// value: null on the normal site, or { bare } inside the book, where `bare`
// asks a page frame to print only its content (the book draws the opener).
export const BookContext = createContext(null)
export const useBook = () => useContext(BookContext)
