import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"

export default function MainSideBar({ isOpen, toggleSidebar }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const location = useLocation()

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768 && isOpen) {
        toggleSidebar()
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [isOpen, toggleSidebar])

  const isActive = (path) => {
    if (path === "") {
      return location.pathname === "/"
    }
    return location.pathname.includes(path)
  }

  const options = [
    {
      name: "DashBoard",
      icon: "fas fa-home",
      path: "",
    },
    {
      name: "Rides",
      icon: "fas fa-biking",
      path: "rides",
    },
    {
      name: "Vehicle-Management",
      icon: "fas fa-car-side",
      path: "vehicle-management",
    },
    {
      name: "Earnings",
      icon: "fas fa-wallet",
      path: "reports-earnings",
    },
    {
      name: "Admins",
      icon: "fas fa-podcast",
      path: "admins",
    },
    {
      name: "Drivers-Management",
      icon: "fas fa-taxi",
      path: "drivers"
    },
    {
      name: "Live-Tracking",
      icon: "fas fa-street-view",
      path: "live-tracking",
    },
    {
      name: "Customer-Support",
      icon: "fas fa-headset",
      path: "customer-support",
    },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={toggleSidebar} />}

      <div
        className={`fixed md:static h-full ${isMobile ? "w-64" : "w-20"} ${
          isMobile ? `transform ${isOpen ? "translate-x-0" : "-translate-x-full"}` : ""
        } border-r-[1px] border-gray-300 dark:border-gray-400/20 flex flex-col items-center pt-10 bg-white dark:bg-gray-900 z-50 transition-all duration-300`}
      >
        {options.map((option, el) => {
          const active = isActive(option.path)
          return (
            <Link
              key={el}
              to={`/${option.path}`}
              className={`MenuOption h-12 w-12 rounded-lg flex justify-center items-center group relative z-50 ${
                active
                  ? "bg-green-600/30 text-green-400"
                  : "text-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600/20 hover:text-green-500"
              } transition-all duration-200`}
              onClick={() => isMobile && toggleSidebar()}
            >
              <i className={`${option.icon}`}></i>
              <div
                className={`OptionInfo absolute left-[50px] min-w-[120px] px-2 py-2 bg-green-600/90 text-white hidden rounded-lg rounded-ss-none ${
                  isMobile ? "group-hover:block" : "group-hover:block"
                } transition-all duration-200`}
              >
                {option.name}
              </div>
              {/* Active indicator for expanded sidebar */}
              {isMobile && isOpen && active && (
                <div className="absolute left-2 w-1 h-6 bg-green-400 rounded-full"></div>
              )}
            </Link>
          )
        })}
      </div>
    </>
  )
}



