import { FaSun, FaMoon } from "react-icons/fa"
import { useTheme } from "../contexts/ThemeContext"

export default function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 flex justify-center items-center text-green-500 rounded-full relative hover:bg-green-500/20 hover:text-green-600 transition-all duration-200 text-xs md:text-sm cursor-pointer"
      title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDarkMode ? <FaSun className="h-4 w-4 md:h-5 md:w-5" /> : <FaMoon className="h-4 w-4 md:h-5 md:w-5" />}
    </button>
  )
}