import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop.jsx'
import TitleManager from './components/TitleManager.jsx'
import Home from './pages/Home.jsx'
import Numbers from './pages/Numbers.jsx'
import Sports from './pages/Sports.jsx'
import SportDetail from './pages/SportDetail.jsx'
import Records from './pages/Records.jsx'
import Where from './pages/Where.jsx'
import PlaceDetail from './pages/PlaceDetail.jsx'
import Rhythm from './pages/Rhythm.jsx'
import Gear from './pages/Gear.jsx'
import Timeline from './pages/Timeline.jsx'
import WhatItMeans from './pages/WhatItMeans.jsx'
import Data from './pages/Data.jsx'
import About from './pages/About.jsx'
import Debug from './pages/Debug.jsx'
import Design from './pages/Design.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <TitleManager />
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Numbers dashboard (Phase 6) */}
        <Route path="/numbers" element={<Numbers />} />

        {/* Section detail pages (Phase 5) */}
        <Route path="/sports" element={<Sports />} />
        <Route path="/sports/:sportId" element={<SportDetail />} />
        <Route path="/records" element={<Records />} />
        <Route path="/where" element={<Where />} />
        <Route path="/where/:placeId" element={<PlaceDetail />} />
        <Route path="/rhythm" element={<Rhythm />} />
        <Route path="/gear" element={<Gear />} />

        {/* Timeline + What it means (Phase 7) */}
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/what-it-means" element={<WhatItMeans />} />

        {/* Data + About (Phase 8) */}
        <Route path="/data" element={<Data />} />
        <Route path="/about" element={<About />} />

        {/* Dev / design */}
        <Route path="/design" element={<Design />} />
        <Route path="/debug" element={<Debug />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
