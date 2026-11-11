import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop.jsx'
import TitleManager from './components/TitleManager.jsx'
import SmoothScroll from './motion/SmoothScroll.jsx'
import Preloader from './motion/Preloader.jsx'
import PageTransition from './motion/PageTransition.jsx'
import Home from './pages/Home.jsx'

// The front page ships in the first script; every other chapter loads its own
// code when it is first opened, so the first visit downloads and runs less.
const YearInSport = lazy(() => import('./pages/YearInSport.jsx'))
const Sports = lazy(() => import('./pages/Sports.jsx'))
const SportDetail = lazy(() => import('./pages/SportDetail.jsx'))
const Records = lazy(() => import('./pages/Records.jsx'))
const Where = lazy(() => import('./pages/Where.jsx'))
const PlaceDetail = lazy(() => import('./pages/PlaceDetail.jsx'))
const Timeline = lazy(() => import('./pages/Timeline.jsx'))
const Goals = lazy(() => import('./pages/Goals.jsx'))
const WhatItMeans = lazy(() => import('./pages/WhatItMeans.jsx'))
const Evidence = lazy(() => import('./pages/Evidence.jsx'))
const Book = lazy(() => import('./pages/Book.jsx'))
const Kilimanjaro = lazy(() => import('./pages/Kilimanjaro.jsx'))
const Hanang = lazy(() => import('./pages/Hanang.jsx'))
const Uluguru = lazy(() => import('./pages/Uluguru.jsx'))
const Data = lazy(() => import('./pages/Data.jsx'))
const About = lazy(() => import('./pages/About.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

export default function App() {
  return (
    <>
      <SmoothScroll />
      <ScrollToTop />
      <TitleManager />
      <Preloader />
      <PageTransition />
      <Suspense fallback={<div className="route-wait" />}>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Year in Sport report (chapter 02); /numbers/:year deep-links a year */}
        <Route path="/numbers" element={<YearInSport />} />
        <Route path="/numbers/:year" element={<YearInSport />} />

        {/* Section detail pages (Phase 5) */}
        <Route path="/sports" element={<Sports />} />
        <Route path="/sports/:sportId" element={<SportDetail />} />
        <Route path="/records" element={<Records />} />
        <Route path="/where" element={<Where />} />
        <Route path="/where/:placeId" element={<PlaceDetail />} />
        <Route path="/rhythm" element={<Navigate to="/" replace />} />
        <Route path="/gear" element={<Navigate to="/" replace />} />

        {/* Timeline + What it means (Phase 7) */}
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/what-it-means" element={<WhatItMeans />} />
        <Route path="/on-trial" element={<Evidence />} />
        <Route path="/book" element={<Book />} />

        {/* The three mountain chapters */}
        <Route path="/kilimanjaro" element={<Kilimanjaro />} />
        <Route path="/hanang" element={<Hanang />} />
        <Route path="/uluguru" element={<Uluguru />} />

        {/* Data + About (Phase 8) */}
        <Route path="/data" element={<Data />} />
        <Route path="/about" element={<About />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </>
  )
}
