import { Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop.jsx'
import TitleManager from './components/TitleManager.jsx'
import SmoothScroll from './motion/SmoothScroll.jsx'
import Cursor from './motion/Cursor.jsx'
import Preloader from './motion/Preloader.jsx'
import PageTransition from './motion/PageTransition.jsx'
import Home from './pages/Home.jsx'
import YearInSport from './pages/YearInSport.jsx'
import Sports from './pages/Sports.jsx'
import SportDetail from './pages/SportDetail.jsx'
import Records from './pages/Records.jsx'
import Where from './pages/Where.jsx'
import PlaceDetail from './pages/PlaceDetail.jsx'
import Timeline from './pages/Timeline.jsx'
import Goals from './pages/Goals.jsx'
import WhatItMeans from './pages/WhatItMeans.jsx'
import Book from './pages/Book.jsx'
import Data from './pages/Data.jsx'
import About from './pages/About.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <>
      <SmoothScroll />
      <ScrollToTop />
      <TitleManager />
      <Preloader />
      <PageTransition />
      <Cursor />
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
        <Route path="/book" element={<Book />} />

        {/* Data + About (Phase 8) */}
        <Route path="/data" element={<Data />} />
        <Route path="/about" element={<About />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
