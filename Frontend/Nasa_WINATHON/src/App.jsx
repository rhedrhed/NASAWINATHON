import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from "./components/theme-provider"
import Navbar from "./components/Navbar"
import Home from "./pages/Home"
import NearEarthObjects from "./pages/NearEarthObjects"
import SmallBodyDatabase from "./pages/SmallBodyDatabase"
import Earthquakes from "./pages/Earthquakes"
import Elevation from "./pages/Elevation"
import Simulation from "./pages/Simulation"

export default function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <Router>
                <Navbar />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/neo" element={<NearEarthObjects />} />
                    <Route path="/sbdb" element={<SmallBodyDatabase />} />
                    <Route path="/earthquakes" element={<Earthquakes />} />
                    <Route path="/elevation" element={<Elevation />} />
                    <Route path="/simulation" element={<Simulation />} />
                </Routes>
            </Router>
        </ThemeProvider>
    )
}
