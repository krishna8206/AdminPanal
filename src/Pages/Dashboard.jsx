import { useState, useEffect, useCallback, useRef } from "react"
import {
  FaCar,
  FaMotorcycle,
  FaTruck,
  FaUserAlt,
  FaRupeeSign,
  FaChartLine,
  FaPhone,
  FaStar,
  FaFilter,
} from "react-icons/fa"
import { RiRestaurantFill } from "react-icons/ri"
import { Bar, Pie } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js"
import { dashboardService } from "../services/api"
import io from "socket.io-client"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-routing-machine"
import "leaflet-routing-machine/dist/leaflet-routing-machine.css"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

// Default state values
const DEFAULT_STATS = {
  todayRides: 0,
  ridesPercentageChange: 0,
  totalDrivers: 0,
  newDriversThisWeek: 0,
  driversPercentageChange: 0,
  todayIncome: 0,
  incomePercentageChange: 0,
  completedRides: 0,
  completedPercentageChange: 0,
  cancelledRides: 0,
  cancelledPercentageChange: 0,
  successRate: 0,
  cancellationRate: 0,
}

const DEFAULT_REVENUE_DATA = {
  labels: [],
  datasets: [
    {
      label: "Revenue (₹)",
      data: [],
      backgroundColor: "rgba(34, 197, 94, 0.7)",
      borderColor: "rgba(34, 197, 94, 1)",
      borderWidth: 1,
    },
  ],
}

// Component to handle map updates
function MapUpdater({ center }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])

  return null
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("all")
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [recentRides, setRecentRides] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [socket, setSocket] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState("Connecting...")
  const [revenueData, setRevenueData] = useState(DEFAULT_REVENUE_DATA)
  const [errors, setErrors] = useState({})
  const [showAllActivities, setShowAllActivities] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [routingControl, setRoutingControl] = useState(null)

  // Map-specific state - Updated to Ahmedabad coordinates
  const [mapCenter, setMapCenter] = useState([23.0225, 72.5714]) // Ahmedabad coordinates
  const [selectedService, setSelectedService] = useState("all")
  const [showCompleted, setShowCompleted] = useState(true)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [drivers, setDrivers] = useState([])
  const [selectedDriver, setSelectedDriver] = useState(null)

  // New filter states
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Use refs to store data and prevent dependency loops
  const lastValidStatsRef = useRef(null)
  const socketRef = useRef(null)
  const isInitializedRef = useRef(false)
  const mapRef = useRef(null)

  // Safe number parsing function
  const safeParseFloat = (value) => {
    const parsed = Number.parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }

  // Filter rides by current month
  const filterRidesByCurrentMonth = (rides) => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    return rides.filter((ride) => {
      if (!ride.rideTime) return false
      const rideDate = new Date(ride.rideTime)
      return rideDate.getMonth() === currentMonth && rideDate.getFullYear() === currentYear
    })
  }

  // Custom icons for different services
  const createCustomIcon = (color, service) => {
    if (typeof window === "undefined") return null

    const iconHtml = `
      <div style="
        background-color: ${color};
        width: 35px;
        height: 35px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: white;
        font-weight: bold;
        position: relative;
      ">
        ${service === "Ride" ? "🚗" : service === "Food-Delivery" ? "🍕" : "📦"}
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          background-color: #10B981;
          border: 2px solid white;
          border-radius: 50%;
        "></div>
      </div>
    `

    return L.divIcon({
      html: iconHtml,
      className: "custom-marker",
      iconSize: [35, 35],
      iconAnchor: [17.5, 17.5],
      popupAnchor: [0, -17.5],
    })
  }

  // Enhanced driver icon with different icons for different statuses
  const createDriverIcon = (status, vehicleType) => {
    if (typeof window === "undefined") return null

    let color, statusIcon
    switch (status) {
      case "active":
        color = "#F59E0B" // Yellow for active/on-trip
        statusIcon = "🚗" // Car icon for active
        break
      case "idle":
        color = "#10B981" // Green for idle/available
        statusIcon = "⏸️" // Pause icon for idle
        break
      case "emergency":
        color = "#EF4444" // Red for emergency
        statusIcon = "🚨" // Emergency icon
        break
      case "offline":
      default:
        color = "#6B7280" // Gray for offline or unknown status
        statusIcon = "⭕" // Offline icon
        break
    }

    // Vehicle type icon
    let vehicleIcon = "🚗"
    if (vehicleType) {
      switch (vehicleType.toLowerCase()) {
        case "bike":
        case "motorcycle":
          vehicleIcon = "🏍️"
          break
        case "truck":
          vehicleIcon = "🚛"
          break
        case "three-wheeler":
        case "auto":
          vehicleIcon = "🛺"
          break
        default:
          vehicleIcon = "🚗"
      }
    }

    const iconHtml = `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: white;
        font-weight: bold;
        position: relative;
      ">
        ${vehicleIcon}
        <div style="
          position: absolute;
          bottom: -3px;
          right: -3px;
          width: 16px;
          height: 16px;
          background-color: white;
          border: 1px solid ${color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
        ">
          ${statusIcon}
        </div>
      </div>
    `

    return L.divIcon({
      html: iconHtml,
      className: "driver-marker",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    })
  }

  // Filter drivers based on vehicle type and status
  const getFilteredDrivers = () => {
    return drivers.filter((driver) => {
      const vehicleMatch =
        vehicleTypeFilter === "all" ||
        (vehicleTypeFilter === "bike" &&
          (driver.vehicleType?.toLowerCase().includes("bike") ||
            driver.vehicleType?.toLowerCase().includes("motorcycle"))) ||
        (vehicleTypeFilter === "truck" && driver.vehicleType?.toLowerCase().includes("truck")) ||
        (vehicleTypeFilter === "three-wheeler" &&
          (driver.vehicleType?.toLowerCase().includes("three") || driver.vehicleType?.toLowerCase().includes("auto")))

      const statusMatch = statusFilter === "all" || driver.status === statusFilter

      return vehicleMatch && statusMatch
    })
  }

  // Calculate summary statistics
  const calculateSummaryStats = () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay())

    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(thisWeekStart)
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)

    const sameLastWeekDay = new Date(today)
    sameLastWeekDay.setDate(sameLastWeekDay.getDate() - 7)

    // Filter rides for different periods
    const todayRides = recentRides.filter((ride) => {
      const rideDate = new Date(ride.rideTime)
      return rideDate.toDateString() === today.toDateString()
    })

    const yesterdayRides = recentRides.filter((ride) => {
      const rideDate = new Date(ride.rideTime)
      return rideDate.toDateString() === yesterday.toDateString()
    })

    const thisWeekRides = recentRides.filter((ride) => {
      const rideDate = new Date(ride.rideTime)
      return rideDate >= thisWeekStart && rideDate <= today
    })

    const lastWeekRides = recentRides.filter((ride) => {
      const rideDate = new Date(ride.rideTime)
      return rideDate >= lastWeekStart && rideDate <= lastWeekEnd
    })

    const sameLastWeekDayRides = recentRides.filter((ride) => {
      const rideDate = new Date(ride.rideTime)
      return rideDate.toDateString() === sameLastWeekDay.toDateString()
    })

    // Calculate totals
    const todayTotal = todayRides.reduce((sum, ride) => sum + (ride.amount || 0), 0)
    const yesterdayTotal = yesterdayRides.reduce((sum, ride) => sum + (ride.amount || 0), 0)
    const thisWeekTotal = thisWeekRides.reduce((sum, ride) => sum + (ride.amount || 0), 0)
    const lastWeekTotal = lastWeekRides.reduce((sum, ride) => sum + (ride.amount || 0), 0)
    const sameLastWeekDayTotal = sameLastWeekDayRides.reduce((sum, ride) => sum + (ride.amount || 0), 0)

    return {
      todayVsYesterday: {
        today: { rides: todayRides.length, revenue: todayTotal },
        yesterday: { rides: yesterdayRides.length, revenue: yesterdayTotal },
        change: {
          rides:
            yesterdayRides.length > 0
              ? (((todayRides.length - yesterdayRides.length) / yesterdayRides.length) * 100).toFixed(1)
              : 0,
          revenue: yesterdayTotal > 0 ? (((todayTotal - yesterdayTotal) / yesterdayTotal) * 100).toFixed(1) : 0,
        },
      },
      todayVsSameLastWeek: {
        today: { rides: todayRides.length, revenue: todayTotal },
        sameLastWeek: { rides: sameLastWeekDayRides.length, revenue: sameLastWeekDayTotal },
        change: {
          rides:
            sameLastWeekDayRides.length > 0
              ? (((todayRides.length - sameLastWeekDayRides.length) / sameLastWeekDayRides.length) * 100).toFixed(1)
              : 0,
          revenue:
            sameLastWeekDayTotal > 0
              ? (((todayTotal - sameLastWeekDayTotal) / sameLastWeekDayTotal) * 100).toFixed(1)
              : 0,
        },
      },
      thisWeekVsLastWeek: {
        thisWeek: { rides: thisWeekRides.length, revenue: thisWeekTotal },
        lastWeek: { rides: lastWeekRides.length, revenue: lastWeekTotal },
        change: {
          rides:
            lastWeekRides.length > 0
              ? (((thisWeekRides.length - lastWeekRides.length) / lastWeekRides.length) * 100).toFixed(1)
              : 0,
          revenue: lastWeekTotal > 0 ? (((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100).toFixed(1) : 0,
        },
      },
    }
  }

  // feth-driver ----
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const response = await fetch("https://panalsbackend-production.up.railway.app/api/driver")
        const data = await response.json()
        if (data.success) {
          setDrivers(data.data)
        }
      } catch (error) {
        console.error("Error fetching drivers:", error)
      }
    }

    fetchDrivers()
  }, [])

  useEffect(() => {
    const fetchRecentRides = async () => {
      try {
        const response = await fetch("https://panalsbackend-production.up.railway.app/api/dashboard/recent-rides")
        const data = await response.json()
        setRecentRides(data)
      } catch (error) {
        console.error("Error fetching recent rides:", error)
      }
    }

    fetchRecentRides()
  }, [])

  // Custom user location icon
  const createUserLocationIcon = () => {
    if (typeof window === "undefined") return null

    const iconHtml = `
      <div style="
        background-color: #8B5CF6;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: white;
        font-weight: bold;
        position: relative;
      ">
        👤
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 14px;
          height: 14px;
          background-color: #10B981;
          border: 2px solid white;
          border-radius: 50%;
        "></div>
      </div>
    `

    return L.divIcon({
      html: iconHtml,
      className: "user-location-marker",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    })
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "active":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "pending":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    }
  }

  // Get status color for map markers
  const getMapStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "#10B981" // Green
      case "in-progress":
        return "#F59E0B" // Yellow
      case "pending":
        return "#3B82F6" // Blue
      case "cancelled":
        return "#EF4444" // Red
      default:
        return "#6B7280" // Gray
    }
  }

  // Filter rides for map based on selected service and completion status
  const getFilteredRidesForMap = () => {
    return recentRides.filter((ride) => {
      const serviceMatch = selectedService === "all" || ride.service === selectedService
      const statusMatch = showCompleted || ride.status !== "completed"
      return serviceMatch && statusMatch
    })
  }

  // Handle driver call with real phone number
  const handleDriverCall = (driver) => {
    if (driver.phone) {
      // Create a tel: link to initiate call
      window.location.href = `tel:${driver.phone}`
    } else {
      alert(`Phone number not available for ${driver.name}`)
    }
  }

  // Update route between two points
  const updateRoute = useCallback(
    (from, to) => {
      // Remove existing routing control if it exists
      if (routingControl && mapRef.current) {
        mapRef.current.removeControl(routingControl)
      }

      if (!mapRef.current || !from || !to) return

      // Create new routing control
      const newRoutingControl = L.Routing.control({
        waypoints: [L.latLng(from[0], from[1]), L.latLng(to[0], to[1])],
        routeWhileDragging: false,
        showAlternatives: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        lineOptions: {
          styles: [{ color: "#8B5CF6", opacity: 0.8, weight: 5 }],
        },
        createMarker: () => null, // Disable default markers
      }).addTo(mapRef.current)

      setRoutingControl(newRoutingControl)
    },
    [routingControl],
  )

  // Handle driver selection
  const handleDriverSelect = useCallback(
    (driver) => {
      setSelectedDriver(driver)

      if (userLocation) {
        updateRoute(userLocation, [driver.location.lat, driver.location.lng])
      } else {
        alert("Your location is not available. Please enable location services.")
      }
    },
    [userLocation, updateRoute],
  )

  // Stable update functions without problematic dependencies
  const updateStats = useCallback((newStats) => {
    if (!newStats || typeof newStats !== "object") {
      console.warn("⚠️ Received invalid stats data:", newStats)
      return
    }

    // Check if the new stats have valid data
    const hasValidData =
      (newStats.todayRides && newStats.todayRides > 0) ||
      (newStats.totalDrivers && newStats.totalDrivers > 0) ||
      (newStats.todayIncome && newStats.todayIncome > 0) ||
      (newStats.completedRides && newStats.completedRides > 0)

    // If new data seems invalid and we have last valid stats, keep the old ones
    if (!hasValidData && lastValidStatsRef.current) {
      console.warn("⚠️ New stats appear invalid, keeping previous valid stats")
      return
    }

    try {
      const updatedStats = {
        todayRides: Number.parseInt(newStats.todayRides) || 0,
        ridesPercentageChange: safeParseFloat(newStats.ridesPercentageChange),
        totalDrivers: Number.parseInt(newStats.totalDrivers) || 0,
        newDriversThisWeek: Number.parseInt(newStats.newDriversThisWeek) || 0,
        driversPercentageChange: safeParseFloat(newStats.driversPercentageChange),
        todayIncome: safeParseFloat(newStats.todayIncome),
        incomePercentageChange: safeParseFloat(newStats.incomePercentageChange),
        completedRides: Number.parseInt(newStats.completedRides) || 0,
        completedPercentageChange: safeParseFloat(newStats.completedPercentageChange),
        cancelledRides: Number.parseInt(newStats.cancelledRides) || 0,
        cancelledPercentageChange: safeParseFloat(newStats.cancelledPercentageChange),
        successRate: safeParseFloat(newStats.successRate),
        cancellationRate: safeParseFloat(newStats.cancellationRate),
        timestamp: newStats.timestamp || new Date().toISOString(),
      }

      setStats(updatedStats)
      lastValidStatsRef.current = updatedStats
      console.log("✅ Stats updated successfully")
    } catch (error) {
      console.error("❌ Error updating stats:", error)
    }
  }, []) // No dependencies to avoid loops

  const updateRecentRides = useCallback((newRides) => {
    if (!Array.isArray(newRides)) {
      console.warn("⚠️ Received invalid rides data:", newRides)
      return
    }

    try {
      setRecentRides(newRides)
      console.log("✅ Recent rides updated successfully")
    } catch (error) {
      console.error("❌ Error updating recent rides:", error)
    }
  }, []) // No dependencies

  const updateRevenueData = useCallback((newRevenueData) => {
    if (!newRevenueData || typeof newRevenueData !== "object") {
      console.warn("⚠️ Received invalid revenue data:", newRevenueData)
      return
    }

    try {
      if (
        newRevenueData.labels &&
        newRevenueData.data &&
        Array.isArray(newRevenueData.labels) &&
        Array.isArray(newRevenueData.data)
      ) {
        setRevenueData((prev) => ({
          ...prev,
          labels: newRevenueData.labels,
          datasets: [
            {
              ...prev.datasets[0],
              data: newRevenueData.data,
            },
          ],
        }))
        console.log("✅ Revenue data updated successfully")
      } else {
        console.warn("⚠️ Revenue data missing required fields:", newRevenueData)
      }
    } catch (error) {
      console.error("❌ Error updating revenue data:", error)
    }
  }, []) // No dependencies

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle("dark")
  }

  // Check if we're on client side for map rendering
  useEffect(() => {
    setIsMapLoaded(true)
  }, [])

  // Get user location
  useEffect(() => {
    if (!isMapLoaded) return

    // Check if geolocation is supported
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation([latitude, longitude])
          setLocationError(null)

          // Center map on user's location when first obtained
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 15)
          }
        },
        (error) => {
          setLocationError(error.message)
          console.error("Geolocation error:", error)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000,
        },
      )

      return () => {
        navigator.geolocation.clearWatch(watchId)
      }
    } else {
      setLocationError("Geolocation is not supported by your browser")
    }
  }, [isMapLoaded])

  // Clean up routing control
  useEffect(() => {
    return () => {
      if (routingControl && mapRef.current) {
        mapRef.current.removeControl(routingControl)
      }
    }
  }, [routingControl])

  const revenueOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#adb5bd",
        },
      },
      title: {
        display: true,
        text: "Weekly Revenue",
        color: "#adb5bd",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "#adb5bd",
        },
        grid: {
          color: "rgba(209, 213, 219, 0.5)",
        },
      },
      x: {
        ticks: {
          color: "#6b7280",
        },
        grid: {
          color: "rgba(209, 213, 219, 0.5)",
        },
      },
    },
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#adb5bd",
        },
      },
      title: {
        display: true,
        text: "Service Distribution",
        color: "#adb5bd",
      },
    },
  }

  // Initialize Socket.IO connection - only once
  useEffect(() => {
    if (socketRef.current) {
      console.log("Socket already exists, skipping initialization")
      return
    }

    console.log("Initializing socket connection...")
    const newSocket = io("https://panalsbackend-production.up.railway.app", {
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5,
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    newSocket.on("connect", () => {
      console.log("✅ Connected to server")
      setConnectionStatus("Connected")
      setErrors({})
    })

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from server:", reason)
      setConnectionStatus("Disconnected")
    })

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error)
      setConnectionStatus("Connection Error")
      setErrors((prev) => ({ ...prev, connection: error.message }))
    })

    newSocket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Reconnected after", attemptNumber, "attempts")
      setConnectionStatus("Connected")
      setErrors({})
    })

    newSocket.on("reconnect_error", (error) => {
      console.error("Reconnection error:", error)
      setConnectionStatus("Reconnection Failed")
    })

    // Listen for real-time dashboard stats updates
    newSocket.on("dashboardStats", (newStats) => {
      console.log("📊 Received real-time stats update:", newStats)
      updateStats(newStats)
    })

    // Listen for real-time recent rides updates
    newSocket.on("recentRidesUpdate", (newRecentRides) => {
      console.log("🚗 Received real-time recent rides update")
      updateRecentRides(newRecentRides)
    })

    // Listen for real-time revenue data updates
    newSocket.on("revenueDataUpdate", (newRevenueData) => {
      console.log("💰 Received real-time revenue data update")
      updateRevenueData(newRevenueData)
    })

    // Listen for error events
    newSocket.on("dashboardError", (error) => {
      console.error("📊 Dashboard error:", error)
      setErrors((prev) => ({ ...prev, dashboard: error.message }))
    })

    newSocket.on("ridesError", (error) => {
      console.error("🚗 Rides error:", error)
      setErrors((prev) => ({ ...prev, rides: error.message }))
    })

    newSocket.on("revenueError", (error) => {
      console.error("💰 Revenue error:", error)
      setErrors((prev) => ({ ...prev, revenue: error.message }))
    })

    return () => {
      console.log("Cleaning up socket connection...")
      newSocket.close()
      socketRef.current = null
    }
  }, []) // Empty dependency array - only run once

  // Initial data fetch - only once
  useEffect(() => {
    if (isInitializedRef.current) {
      console.log("Dashboard already initialized, skipping initial fetch")
      return
    }

    const fetchDashboardData = async () => {
      try {
        console.log("Fetching initial dashboard data...")
        setIsLoading(true)
        setErrors({})

        const [statsRes, recentRidesRes, revenueRes] = await Promise.all([
          dashboardService.getStats().catch((err) => {
            console.error("Error fetching stats:", err)
            return { data: DEFAULT_STATS }
          }),
          dashboardService.getRecentRides().catch((err) => {
            console.error("Error fetching recent rides:", err)
            return { data: [] }
          }),
          dashboardService.getRevenueData().catch((err) => {
            console.error("Error fetching revenue data:", err)
            return { data: { labels: [], data: [] } }
          }),
        ])

        updateStats(statsRes.data)
        updateRecentRides(recentRidesRes.data)
        updateRevenueData(revenueRes.data)

        setIsLoading(false)
        isInitializedRef.current = true
        console.log("✅ Initial dashboard data loaded successfully")
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setErrors((prev) => ({ ...prev, fetch: "Failed to load dashboard data" }))
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, []) // Empty dependency array - only run once

  const getServiceIcon = (service) => {
    switch (service) {
      case "Ride":
        return <FaCar className="text-blue-500" />
      case "Food-Delivery":
        return <RiRestaurantFill className="text-orange-500" />
      case "Courier-Delivery":
        return <FaTruck className="text-green-500" />
      default:
        return <FaMotorcycle className="text-purple-500" />
    }
  }

  const currentMonthRides = filterRidesByCurrentMonth(recentRides)
  const baseFilteredRides =
    activeTab === "all" ? currentMonthRides : currentMonthRides.filter((ride) => ride.service === activeTab)
  const filteredRides = showAllActivities ? baseFilteredRides : baseFilteredRides.slice(0, 5)
  const filteredRidesForMap = getFilteredRidesForMap()
  const filteredDrivers = getFilteredDrivers()
  const summaryStats = calculateSummaryStats()

  const serviceCounts = recentRides.reduce((acc, ride) => {
    if (ride && ride.service) {
      if (!acc[ride.service]) {
        acc[ride.service] = 0
      }
      acc[ride.service]++
    }
    return acc
  }, {})

  const serviceDistributionData = {
    labels: ["Trips", "Food Delivery", "Courier Delivery"],
    datasets: [
      {
        data: [serviceCounts["Ride"] || 0, serviceCounts["Food-Delivery"] || 0, serviceCounts["Courier-Delivery"] || 0],
        backgroundColor: ["rgba(59, 130, 246, 0.7)", "rgba(249, 115, 22, 0.7)", "rgba(22, 163, 74, 0.7)"],
        borderColor: ["rgba(59, 130, 246, 1)", "rgba(249, 115, 22, 1)", "rgba(22, 163, 74, 1)"],
        borderWidth: 1,
      },
    ],
  }

  // Reset show all activities when tab changes
  useEffect(() => {
    setShowAllActivities(false)
  }, [activeTab])

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Dashboard Content */}
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Dashboard Overview</h1>
          <div className="flex items-center gap-3">
            {locationError && (
              <div className="px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">
                Location: {locationError}
              </div>
            )}
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                connectionStatus === "Connected"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : connectionStatus === "Disconnected"
                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              }`}
            >
              {connectionStatus}
            </div>
            {lastValidStatsRef.current && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {new Date(lastValidStatsRef.current.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Map Section - Updated with Two-Column Layout */}
        <div className="mb-6">
          <div className="border border-gray-600/90 rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
                      <FaCar className="text-white text-xs" />
                    </div>
                    Live Vehicle Tracking - Ahmedabad
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Real-time locations of active rides and deliveries across Ahmedabad
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FaFilter className="text-gray-500 text-sm" />
                    <select
                      value={vehicleTypeFilter}
                      onChange={(e) => setVehicleTypeFilter(e.target.value)}
                      className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <option value="all">All Vehicles</option>
                      <option value="bike">🏍️ Bike</option>
                      <option value="truck">🚛 Truck</option>
                      <option value="three-wheeler">🛺 Three Wheeler</option>
                    </select>
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <option value="all">All Status</option>
                    <option value="active">🚗 Active</option>
                    <option value="idle">⏸️ Idle</option>
                    <option value="offline">⭕ Offline</option>
                    <option value="emergency">🚨 Emergency</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* Map Section - Left Side (2/3 width) */}
              <div className="lg:col-span-2 relative">
                <div className="h-[400px] relative">
                  {/* Compact Legend */}
                  <div className="absolute bottom-3 left-3 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-600 dark:text-gray-400">Pending</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-gray-600 dark:text-gray-400">Active</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-600 dark:text-gray-400">Idle</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-gray-600 dark:text-gray-400">Emergency</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-gray-600 dark:text-gray-400">Your Location</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <span className="text-gray-600 dark:text-gray-400">Offline</span>
                      </div>
                    </div>
                  </div>

                  {/* Map */}
                  {isMapLoaded ? (
                    <MapContainer
                      center={mapCenter}
                      zoom={12}
                      style={{ height: "100%", width: "100%" }}
                      className="rounded-none z-0"
                      ref={mapRef}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                      <MapUpdater center={mapCenter} />

                      {/* User location marker */}
                      {userLocation && (
                        <Marker position={userLocation} icon={createUserLocationIcon()}>
                          <Popup className="min-w-[180px]">
                            <div className="p-2">
                              <h3 className="font-semibold text-sm text-gray-800 mb-1">Your Location</h3>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div>Lat: {userLocation[0].toFixed(6)}</div>
                                <div>Lng: {userLocation[1].toFixed(6)}</div>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      )}

                      {/* Render filtered driver markers */}
                      {filteredDrivers.map((driver) => (
                        <Marker
                          key={driver._id}
                          position={[driver.location.lat, driver.location.lng]}
                          icon={createDriverIcon(driver.status, driver.vehicleType)}
                          eventHandlers={{
                            click: () => handleDriverSelect(driver),
                          }}
                        >
                          <Popup className="min-w-[200px]">
                            <div className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-sm text-gray-800">{driver.name}</h3>
                                <span
                                  className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                                    driver.status === "idle"
                                      ? "bg-green-100 text-green-800"
                                      : driver.status === "active"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : driver.status === "emergency"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {driver.status}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 space-y-1 mb-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Vehicle:</span>
                                  <span>{driver.vehicleType || "N/A"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Rating:</span>
                                  <span>⭐ {driver.rating?.toFixed(1) || "N/A"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Phone:</span>
                                  <span>{driver.phone || "N/A"}</span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDriverCall(driver)
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs font-medium transition-colors"
                              >
                                <FaPhone className="text-[10px]" />
                                Call {driver.phone}
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  ) : (
                    <div className="h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 animate-pulse flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                          <FaCar className="text-white text-lg" />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Loading map...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver Information Panel - Right Side (1/3 width) */}
              <div className="bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    <FaUserAlt className="text-blue-500 text-sm" />
                    Filtered Drivers ({filteredDrivers.length})
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {vehicleTypeFilter !== "all" ? `${vehicleTypeFilter} drivers` : "All vehicle types"}
                    {statusFilter !== "all" ? ` - ${statusFilter} status` : ""}
                  </p>
                </div>

                <div className="h-[340px] overflow-y-auto">
                  <div className="p-3 space-y-2">
                    {filteredDrivers.map((driver) => (
                      <div
                        key={driver._id}
                        className={`bg-white dark:bg-gray-800 rounded-md p-3 border transition-all cursor-pointer ${
                          selectedDriver?._id === driver._id
                            ? "border-blue-500 shadow-sm"
                            : "border-gray-200 dark:border-gray-700"
                        } ${driver.status === "idle" ? "hover:border-green-300" : "opacity-75"}`}
                        onClick={() => handleDriverSelect(driver)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                                driver.status === "idle"
                                  ? "bg-green-500"
                                  : driver.status === "active"
                                    ? "bg-yellow-500"
                                    : driver.status === "emergency"
                                      ? "bg-red-500"
                                      : "bg-gray-500"
                              }`}
                            >
                              {driver.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-800 dark:text-white text-sm">{driver.name}</h4>
                              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                <FaStar className="text-yellow-400 text-[10px]" />
                                <span>{driver.rating || "N/A"}</span>
                                <span className="mx-1">•</span>
                                <span>{driver.completedTrips || 0} trips</span>
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              driver.status === "idle"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : driver.status === "active"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  : driver.status === "emergency"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                            }`}
                          >
                            {driver.status}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Vehicle:</span>
                            <span className="font-medium">{driver.vehicleType || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Phone:</span>
                            <span className="font-medium">{driver.phone || "N/A"}</span>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDriverCall(driver)
                            }}
                            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-xs font-medium ${
                              driver.phone
                                ? "bg-blue-500 hover:bg-blue-600 text-white"
                                : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            }`}
                            disabled={!driver.phone}
                          >
                            <FaPhone className="text-[10px]" />
                            Call
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setMapCenter([driver.location.lat, driver.location.lng])
                            }}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium"
                          >
                            📍
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {Object.keys(errors).length > 0 && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <h4 className="font-bold">Errors:</h4>
            <ul className="list-disc list-inside">
              {Object.entries(errors).map(([key, message]) => (
                <li key={key}>
                  {key}: {message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stats Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 h-32 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
            <div
              className={`rounded-xl shadow-md p-4 md:p-6 hover:shadow-lg dark:hover:shadow-2xl dark:hover:-translate-y-1 transition-all duration-300 ${
                stats.ridesPercentageChange >= 0
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Today's Rides</p>
                  <h3
                    className={`text-xl md:text-2xl font-bold ${
                      stats.ridesPercentageChange >= 0
                        ? "text-green-800 dark:text-green-200"
                        : "text-red-800 dark:text-red-200"
                    }`}
                  >
                    {stats.todayRides}
                  </h3>
                </div>
                <div
                  className={`p-2 md:p-3 rounded-full ${
                    stats.ridesPercentageChange >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"
                  }`}
                >
                  <FaCar
                    className={`text-lg md:text-xl ${
                      stats.ridesPercentageChange >= 0
                        ? "text-green-500 dark:text-green-300"
                        : "text-red-500 dark:text-red-300"
                    }`}
                  />
                </div>
              </div>
              <div
                className={`mt-2 md:mt-4 flex items-center text-xs md:text-sm ${
                  stats.ridesPercentageChange >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                <FaChartLine className="mr-1" />
                <span>
                  {stats.ridesPercentageChange >= 0 ? "+" : ""}
                  {stats.ridesPercentageChange}% From Yesterday
                </span>
              </div>
              <div
                className={`mt-2 md:mt-4 flex items-center text-xs md:text-sm ${
                  stats.ridesPercentageChange >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                <FaChartLine className="mr-1" />
                <span>
                  {stats.ridesPercentageChange >= 0 ? "+" : ""}
                  {stats.ridesPercentageChange}% From SDLW
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6 hover:shadow-lg dark:hover:shadow-2xl dark:hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Total Drivers</p>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{stats.totalDrivers}</h3>
                </div>
                <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <FaUserAlt className="text-green-500 dark:text-green-300 text-lg md:text-xl" />
                </div>
              </div>
              <div className="mt-2 md:mt-4 flex items-center text-xs md:text-sm text-green-600 dark:text-green-400">
                <FaChartLine className="mr-1" />
                <span>{stats.newDriversThisWeek} New This Week</span>
              </div>
              <div className="mt-2 md:mt-4 flex items-center text-xs md:text-sm text-green-600 dark:text-green-400">
                <FaChartLine className="mr-1" />
                <span>{stats.newDriversThisWeek} New Last Week</span>
              </div>
            </div>

            <div
              className={`rounded-xl shadow-md p-4 md:p-6 hover:shadow-lg dark:hover:shadow-2xl dark:hover:-translate-y-1 transition-all duration-300 ${
                stats.incomePercentageChange >= 0
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Today's Income</p>
                  <h3
                    className={`text-xl md:text-2xl font-bold ${
                      stats.incomePercentageChange >= 0
                        ? "text-green-800 dark:text-green-200"
                        : "text-red-800 dark:text-red-200"
                    }`}
                  >
                    ₹{stats.todayIncome.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div
                  className={`p-2 md:p-3 rounded-full ${
                    stats.incomePercentageChange >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"
                  }`}
                >
                  <FaRupeeSign
                    className={`text-lg md:text-xl ${
                      stats.incomePercentageChange >= 0
                        ? "text-green-500 dark:text-green-300"
                        : "text-red-500 dark:text-red-300"
                    }`}
                  />
                </div>
              </div>
              <div
                className={`mt-2 md:mt-4 flex items-center text-xs md:text-sm ${
                  stats.incomePercentageChange >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                <FaChartLine className="mr-1" />
                <span>
                  {stats.incomePercentageChange >= 0 ? "+" : ""}
                  {stats.incomePercentageChange}% From Yesterday
                </span>
              </div>
              <div
                className={`mt-2 md:mt-4 flex items-center text-xs md:text-sm ${
                  stats.incomePercentageChange >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                <FaChartLine className="mr-1" />
                <span>
                  {stats.incomePercentageChange >= 0 ? "+" : ""}
                  {stats.incomePercentageChange}% From SDLW
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6 hover:shadow-lg dark:hover:shadow-2xl dark:hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Completed</p>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
                    {stats.completedRides}
                  </h3>
                </div>
                <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <FaCar className="text-green-500 dark:text-green-300 text-lg md:text-xl" />
                </div>
              </div>
              <div className="mt-2 md:mt-4 flex items-center text-xs md:text-sm text-green-600 dark:text-green-400">
                <FaChartLine className="mr-1" />
                <span>{stats.successRate}% From Yesterday</span>
              </div>
              <div className="mt-2 md:mt-4 flex items-center text-xs md:text-sm text-green-600 dark:text-green-400">
                <FaChartLine className="mr-1" />
                <span>{stats.successRate}% From SDLW</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6 hover:shadow-lg dark:hover:shadow-2xl dark:hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Cancelled</p>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
                    {stats.cancelledRides}
                  </h3>
                </div>
                <div className="p-2 md:p-3 bg-red-100 dark:bg-red-900 rounded-full">
                  <FaCar className="text-red-500 dark:text-red-300 text-lg md:text-xl" />
                </div>
              </div>
              <div className="mt-2 md:mt-4 flex items-center text-xs md:text-sm text-red-600 dark:text-red-400">
                <FaChartLine className="mr-1" />
                <span>{stats.cancellationRate}% From Yesterday</span>
              </div>
              <div className="mt-2 md:mt-4 flex items-center text-xs md:text-sm text-red-600 dark:text-red-400">
                <FaChartLine className="mr-1" />
                <span>{stats.cancellationRate}% From SDLW</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activities and Summary Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Recent Activities - Left Side (2/3 width) */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 gap-3">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                  Recent Courier Deliveries (This Month)
                </h2>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-600/20">
                        <tr>
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                          >
                            Service
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                          >
                            User
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                          >
                            Time
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                          >
                            Status
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                          >
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {filteredRides.length > 0 ? (
                          filteredRides
                            .filter((ride) => ride.service === "Courier-Delivery") // Only show courier deliveries
                            .map((ride) => (
                              <tr
                                key={ride._id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/30 hover:rounded-lg"
                              >
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10 flex items-center justify-center">
                                      {getServiceIcon(ride.service)}
                                    </div>
                                    <div className="ml-2 md:ml-4">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                        Courier Delivery
                                      </div>
                                      <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 capitalize">
                                        {ride.type}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900 dark:text-white">
                                    {ride.user?.name || "N/A"}
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {ride.rideTime
                                      ? new Date(ride.rideTime).toLocaleDateString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "N/A"}
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ride.status)}`}
                                  >
                                    {ride.status || "unknown"}
                                  </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  ₹{ride.amount || "0"}
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <div className="text-gray-400 dark:text-gray-500">
                                  <FaTruck className="text-4xl mx-auto mb-2" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                                  No courier deliveries this month
                                </p>
                                <p className="text-gray-400 dark:text-gray-500 text-sm">
                                  No courier delivery activities found for the current month
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {baseFilteredRides.length > 5 && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={() => setShowAllActivities(!showAllActivities)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                      >
                        {showAllActivities ? (
                          <>
                            <span>See Less</span>
                            <svg
                              className="w-4 h-4 transform rotate-180"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <span>See More ({baseFilteredRides.length - 5} more)</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Summary Statistics - Right Side (1/3 width) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FaChartLine className="text-blue-500" />
                Performance Summary
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Comparative analysis of key metrics</p>
            </div>

            <div className="p-4 space-y-4">
              {/* Today vs Yesterday */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">Today vs Yesterday</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Trips</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-white">
                        {summaryStats.todayVsYesterday.today.rides}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          Number(summaryStats.todayVsYesterday.change.rides) >= 0
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {Number(summaryStats.todayVsYesterday.change.rides) >= 0 ? "+" : ""}
                        {summaryStats.todayVsYesterday.change.rides}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Revenue</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-white">
                        ₹{summaryStats.todayVsYesterday.today.revenue.toFixed(0)}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          Number(summaryStats.todayVsYesterday.change.revenue) >= 0
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {Number(summaryStats.todayVsYesterday.change.revenue) >= 0 ? "+" : ""}
                        {summaryStats.todayVsYesterday.change.revenue}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today vs Same Day Last Week */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">
                  Today vs Same Day Last Week
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Trips</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-white">
                        {summaryStats.todayVsSameLastWeek.today.rides}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          Number(summaryStats.todayVsSameLastWeek.change.rides) >= 0
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {Number(summaryStats.todayVsSameLastWeek.change.rides) >= 0 ? "+" : ""}
                        {summaryStats.todayVsSameLastWeek.change.rides}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Revenue</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-white">
                        ₹{summaryStats.todayVsSameLastWeek.today.revenue.toFixed(0)}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          Number(summaryStats.todayVsSameLastWeek.change.revenue) >= 0
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {Number(summaryStats.todayVsSameLastWeek.change.revenue) >= 0 ? "+" : ""}
                        {summaryStats.todayVsSameLastWeek.change.revenue}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* This Week vs Last Week */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">This Week vs Last Week</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Trips</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-white">
                        {summaryStats.thisWeekVsLastWeek.thisWeek.rides}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          Number(summaryStats.thisWeekVsLastWeek.change.rides) >= 0
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {Number(summaryStats.thisWeekVsLastWeek.change.rides) >= 0 ? "+" : ""}
                        {summaryStats.thisWeekVsLastWeek.change.rides}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Revenue</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-white">
                        ₹{summaryStats.thisWeekVsLastWeek.thisWeek.revenue.toFixed(0)}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          Number(summaryStats.thisWeekVsLastWeek.change.revenue) >= 0
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {Number(summaryStats.thisWeekVsLastWeek.change.revenue) >= 0 ? "+" : ""}
                        {summaryStats.thisWeekVsLastWeek.change.revenue}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">Quick Stats</h4>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-600 dark:text-blue-400">Active Drivers</span>
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {drivers.filter((d) => d.status === "active" || d.status === "idle").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-600 dark:text-blue-400">Avg. Rating</span>
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {drivers.length > 0
                        ? (drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length).toFixed(1)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-600 dark:text-blue-400">Total Trips</span>
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {drivers.reduce((sum, d) => sum + (d.completedTrips || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-md">
            <h3 className="text-base md:text-lg font-medium text-gray-900 dark:text-white mb-3 md:mb-4">
              Daily Revenue
            </h3>
            <div className="h-64 md:h-80 w-full">
              {revenueData && revenueData.labels && revenueData.labels.length > 0 ? (
                <Bar data={revenueData} options={revenueOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  No revenue data available
                </div>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-md">
            <h3 className="text-base md:text-lg font-medium text-gray-900 dark:text-white mb-3 md:mb-4">
              Service Distribution
            </h3>
            <div className="h-64 md:h-80 w-full">
              <Pie data={serviceDistributionData} options={pieOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
