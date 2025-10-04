import './App.css'
import { ThemeProvider } from "./components/theme-provider"
import { Button } from "@/components/ui/button"
import lebron from './assets/lebron.png'

export default function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <Button variant="outline">Button</Button>
            <img src={lebron} alt="Lebron holding a meteor on one hand, and a
            basketball on the other hand, with one leg on top of a basketball">
            </img>
        </ThemeProvider>
    )
}
