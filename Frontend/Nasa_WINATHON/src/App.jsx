import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from "./components/theme-provider"
import Navbar from "./components/Navbar"
import Home from "./pages/Home"
import Simulation from "./pages/Simulation"

export default function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <Router>
                <Navbar />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/simulation" element={<Simulation />} />
                </Routes>
            </Router>
        </ThemeProvider>
    )
}
