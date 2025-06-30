"use client"

// Location: This page should be located at /src/components/ReportsEarning.tsx or /pages/ReportsEarning.tsx
// Final fixed version with robust data handling and persistence

import { useState, useEffect, useRef, useCallback } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  FiCalendar,
  FiDollarSign,
  FiDownload,
  FiRefreshCw,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertCircle,
  FiWifi,
  FiWifiOff,
  FiDatabase,
} from "react-icons/fi"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { io } from "socket.io-client"

// Skeleton loading components
const CardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
      </div>
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
    </div>
    <div className="mt-2 flex items-center">
      <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded mr-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mr-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
    </div>
  </div>
)

const ChartSkeleton = ({ height = "h-80" }) => (
  <div className={`${height} bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center`}>
    <div className="text-center">
      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 mx-auto mb-2"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24 mx-auto"></div>
    </div>
  </div>
)

const TableSkeleton = () => (
  <div className="overflow-x-auto animate-pulse">
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          {[1, 2, 3, 4].map((i) => (
            <th key={i} className="px-6 py-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
        {[1, 2, 3, 4, 5].map((i) => (
          <tr key={i}>
            {[1, 2, 3, 4].map((j) => (
              <td key={j} className="px-6 py-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

// Empty state component for charts
const EmptyChartState = ({ message = "No rides data available" }) => (
  <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
    <FiAlertCircle size={48} className="mb-4 opacity-50" />
    <p className="text-lg font-medium">{message}</p>
    <p className="text-sm mt-2">Data will appear here when rides are recorded</p>
  </div>
)

export default function ReportsEarning() {
  const [timeRange, setTimeRange] = useState("week")
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 6)
    return date
  })
  const [endDate, setEndDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [activeTab, setActiveTab] = useState("earnings")
  const [chartData, setChartData] = useState([])
  const [summaryData, setSummaryData] = useState({
    totalEarnings: 0,
    earningsChange: 0,
    totalRides: 0,
    ridesChange: 0,
    averageEarningPerRide: 0,
    avgPerRideChange: 0,
    cancellationRate: 0,
    cancellationRateChange: 0,
    drivers: [],
  })
  const [driverFilter, setDriverFilter] = useState("all")
  const [connectionStatus, setConnectionStatus] = useState("connecting")
  const [lastDataUpdate, setLastDataUpdate] = useState(null)
  const [dataSource, setDataSource] = useState("loading") // 'socket', 'api', 'cached', 'loading'

  // Use refs to maintain socket connection and prevent multiple connections
  const socketRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const dataRequestTimeoutRef = useRef(null)
  const lastValidDataRef = useRef({
    summary: null,
    earnings: null,
    drivers: null,
  })

  // Validate data before updating state
  const validateData = useCallback((data, type) => {
    if (!data || typeof data !== "object") {
      console.warn(`⚠️ Invalid ${type} data:`, data)
      return false
    }

    switch (type) {
      case "summary":
        return data.totalEarnings !== undefined && data.totalRides !== undefined
      case "earnings":
        return data.chartData && Array.isArray(data.chartData) && data.summary
      case "drivers":
        return data.tableData && Array.isArray(data.tableData)
      default:
        return true
    }
  }, [])

  // Update state with validated data
  const updateStateWithValidation = useCallback(
    (data, type) => {
      if (!validateData(data, type)) {
        console.warn(`⚠️ Rejecting invalid ${type} data, keeping current state`)
        return false
      }

      // Cache valid data
      lastValidDataRef.current[type] = data

      switch (type) {
        case "summary":
          setSummaryData((prevData) => ({
            ...prevData,
            totalEarnings: data.totalEarnings || 0,
            earningsChange: data.earningsChange || 0,
            totalRides: data.totalRides || 0,
            ridesChange: data.ridesChange || 0,
            averageEarningPerRide: data.averageEarningPerRide || data.avgPerRide || 0,
            avgPerRideChange: data.avgPerRideChange || 0,
            cancellationRate: data.cancellationRate || 0,
            cancellationRateChange: data.cancellationRateChange || 0,
          }))
          break
        case "earnings":
          if (data.chartData) {
            setChartData(data.chartData)
          }
          if (data.summary) {
            setSummaryData((prevData) => ({
              ...prevData,
              totalEarnings: data.summary.totalEarnings || 0,
              totalRides: data.summary.totalRides || 0,
              averageEarningPerRide: data.summary.avgEarningPerRide || 0,
              cancellationRate: data.summary.cancellationRate || 0,
            }))
          }
          break
        case "drivers":
          if (data.tableData) {
            setSummaryData((prevData) => ({
              ...prevData,
              drivers: data.tableData,
            }))
          }
          break
      }

      setLastDataUpdate(new Date())
      setIsInitialLoad(false) // Mark that we've loaded data at least once
      return true
    },
    [validateData],
  )

  // Fetch data via HTTP API as fallback
  const fetchDataViaAPI = useCallback(async () => {
    try {
      console.log("🔄 Fetching data via API...")
      setDataSource("api")

      const params = new URLSearchParams({
        timeRange,
        driverFilter,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })

      const [summaryResponse, earningsResponse, driverResponse] = await Promise.all([
        fetch(`https://panalsbackend-production.up.railway.app/api/reports/summary?${params}`).catch((e) => {
          console.error("Summary API error:", e)
          return null
        }),
        fetch(`https://panalsbackend-production.up.railway.app/api/reports/earnings?${params}`).catch((e) => {
          console.error("Earnings API error:", e)
          return null
        }),
        fetch(`https://panalsbackend-production.up.railway.app/api/reports/driver-performance?${params}`).catch((e) => {
          console.error("Driver API error:", e)
          return null
        }),
      ])

      let hasValidData = false

      if (summaryResponse && summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        console.log("📊 API Summary data:", summaryData)
        if (updateStateWithValidation(summaryData, "summary")) {
          hasValidData = true
        }
      }

      if (earningsResponse && earningsResponse.ok) {
        const earningsData = await earningsResponse.json()
        console.log("💰 API Earnings data:", earningsData)
        if (updateStateWithValidation(earningsData, "earnings")) {
          hasValidData = true
        }
      }

      if (driverResponse && driverResponse.ok) {
        const driverData = await driverResponse.json()
        console.log("👥 API Driver data:", driverData)
        if (updateStateWithValidation(driverData, "drivers")) {
          hasValidData = true
        }
      }

      if (hasValidData) {
        setDataSource("api")
      } else {
        setDataSource("cached")
      }

      setIsLoading(false)
    } catch (error) {
      console.error("❌ API fetch error:", error)
      setDataSource("cached")
      setIsLoading(false)
    }
  }, [timeRange, driverFilter, startDate, endDate, updateStateWithValidation])

  // Initialize and manage Socket.IO connection
  const initializeSocket = useCallback(() => {
    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    console.log("🔌 Initializing Socket.IO connection...")

    const newSocket = io("https://panalsbackend-production.up.railway.app", {
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 3,
      forceNew: true,
    })

    socketRef.current = newSocket

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id)
      setConnectionStatus("connected")
      setDataSource("socket")

      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Request initial data after connection
      setTimeout(() => {
        console.log("📡 Requesting initial data via socket...")
        newSocket.emit("requestReportsSummary")
        newSocket.emit("requestEarningsReport", {
          timeRange,
          driverFilter,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        newSocket.emit("requestDriverPerformance", {
          timeRange,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
      }, 500)
    })

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error)
      setConnectionStatus("error")

      // Fallback to API after connection error
      setTimeout(() => {
        fetchDataViaAPI()
      }, 1000)
    })

    newSocket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason)
      setConnectionStatus("disconnected")

      // Auto-reconnect after disconnect (but limit attempts)
      if (reason === "io server disconnect" || reason === "transport close") {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 Attempting to reconnect...")
          initializeSocket()
        }, 5000)
      }
    })

    newSocket.on("reconnect_error", (error) => {
      console.error("❌ Socket reconnection error:", error)
      setConnectionStatus("error")
      fetchDataViaAPI()
    })

    // Listen for real-time updates with validation
    newSocket.on("reportsSummaryUpdate", (data) => {
      console.log("📊 Socket summary update:", data)
      if (updateStateWithValidation(data, "summary")) {
        setDataSource("socket")
      }
    })

    newSocket.on("reportsSummaryData", (data) => {
      console.log("📊 Socket summary data:", data)
      if (updateStateWithValidation(data, "summary")) {
        setDataSource("socket")
      }
    })

    newSocket.on("earningsReportUpdate", (data) => {
      console.log("💰 Socket earnings update:", data)
      if (updateStateWithValidation(data, "earnings")) {
        setDataSource("socket")
        setIsLoading(false)
      }
    })

    newSocket.on("earningsReportData", (data) => {
      console.log("💰 Socket earnings data:", data)
      if (updateStateWithValidation(data, "earnings")) {
        setDataSource("socket")
        setIsLoading(false)
      }
    })

    newSocket.on("driverPerformanceUpdate", (data) => {
      console.log("👥 Socket driver update:", data)
      if (updateStateWithValidation(data, "drivers")) {
        setDataSource("socket")
      }
    })

    newSocket.on("driverPerformanceData", (data) => {
      console.log("👥 Socket driver data:", data)
      if (updateStateWithValidation(data, "drivers")) {
        setDataSource("socket")
      }
    })

    newSocket.on("reportError", (error) => {
      console.error("📊 Socket reports error:", error)
      setIsLoading(false)
      fetchDataViaAPI()
    })

    return newSocket
  }, [timeRange, driverFilter, startDate, endDate, fetchDataViaAPI, updateStateWithValidation])

  // Initialize socket connection on mount
  useEffect(() => {
    initializeSocket()

    // Also fetch data via API as backup
    fetchDataViaAPI()

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (dataRequestTimeoutRef.current) {
        clearTimeout(dataRequestTimeoutRef.current)
      }
    }
  }, [])

  // Handle filter changes with debouncing
  useEffect(() => {
    if (dataRequestTimeoutRef.current) {
      clearTimeout(dataRequestTimeoutRef.current)
    }

    // Debounce data requests
    dataRequestTimeoutRef.current = setTimeout(() => {
      // Only show loading if this is not the initial load
      if (!isInitialLoad) {
        setIsLoading(true)
      }

      if (socketRef.current && connectionStatus === "connected") {
        console.log("📡 Requesting data via Socket...")
        socketRef.current.emit("requestReportsSummary")
        socketRef.current.emit("requestEarningsReport", {
          timeRange,
          driverFilter,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        socketRef.current.emit("requestDriverPerformance", {
          timeRange,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
      } else {
        console.log("📡 Socket not available, using API...")
        fetchDataViaAPI()
      }
    }, 500)
  }, [timeRange, driverFilter, startDate, endDate, connectionStatus, fetchDataViaAPI, isInitialLoad])

const handleTimeRangeChange = (range) => {
  
  setTimeRange(range)
  const now = new Date()
  
  if (range === "day") {
    // For day view, show today's data
    setStartDate(new Date(now))
    setEndDate(new Date(now))
    handleRefresh()
    updateStateWithValidation()
  } else if (range === "week") {
    // For week view, show last 7 days (including today)
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 6)
    setStartDate(weekAgo)
    setEndDate(new Date(now))
    handleRefresh()
  } else if (range === "month") {
    // For month view, show last 30 days (including today)
    const monthAgo = new Date(now)
    monthAgo.setDate(monthAgo.getDate() - 29)
    setStartDate(monthAgo)
    setEndDate(new Date(now))
    handleRefresh()
  }
}

  const handleRefresh = () => {
    setIsLoading(true)
    // Don't reset data, just show loading state

    // Try socket first, fallback to API
    if (socketRef.current && connectionStatus === "connected") {
      console.log("🔄 Refreshing via Socket...")
      socketRef.current.emit("requestReportsSummary")
      socketRef.current.emit("requestEarningsReport", {
        timeRange,
        driverFilter,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })
      socketRef.current.emit("requestDriverPerformance", {
        timeRange,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })
    } else {
      console.log("🔄 Refreshing via API...")
      fetchDataViaAPI()
    }
  }

  const handleExport = () => {
    // Create CSV data
    const csvData = [
      ["Date", "Earnings", "Rides", "Cancellations"],
      ...chartData.map((item) => [item.name, item.earnings || 0, item.rides || 0, item.cancellations || 0]),
    ]

    const csvContent = csvData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reports_${startDate.toISOString().split("T")[0]}_to_${endDate.toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatPercentageChange = (value) => {
    if (value === undefined || value === null || isNaN(value)) return "0.0"

    // Always show the actual percentage value
    const formattedValue = Math.abs(value).toFixed(1)
    return value > 0 ? `+${formattedValue}` : value < 0 ? `-${formattedValue}` : "0.0"
  }

  const getChangeIcon = (value) => {
    if (value > 0) return <FiTrendingUp className="text-green-500 mr-1" />
    if (value < 0) return <FiTrendingDown className="text-red-500 mr-1" />
    return <FiTrendingUp className="text-gray-500 mr-1" />
  }

  const getChangeColor = (value) => {
    if (value > 0) return "text-green-500"
    if (value < 0) return "text-red-500"
    return "text-gray-500"
  }

  const getDataSourceIcon = () => {
    switch (dataSource) {
      case "socket":
        return <FiWifi className="w-4 h-4 text-green-500" />
      case "api":
        return <FiDatabase className="w-4 h-4 text-blue-500" />
      case "cached":
        return <FiDatabase className="w-4 h-4 text-yellow-500" />
      default:
        return <FiWifiOff className="w-4 h-4 text-gray-500" />
    }
  }

  const hasData = chartData && chartData.length > 0

  return (
    <div className="p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Reports & Earnings</h1>
          <div className="flex items-center space-x-4">
            {lastDataUpdate && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {lastDataUpdate.toLocaleTimeString()}
              </span>
            )}
            <div className="flex items-center space-x-2">
              {getDataSourceIcon()}
              <div
                className={`w-3 h-3 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-green-500"
                    : connectionStatus === "connecting"
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {dataSource === "socket"
                  ? "Live"
                  : dataSource === "api"
                    ? "API"
                    : dataSource === "cached"
                      ? "Cached"
                      : connectionStatus}
              </span>
              {summaryData.isSampleData && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-sm text-orange-500">Sample Data</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleTimeRangeChange("day")}
                className={`px-3 py-1 rounded-md text-sm ${
                  timeRange === "day"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => handleTimeRangeChange("week")}
                className={`px-3 py-1 rounded-md text-sm ${
                  timeRange === "week"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => handleTimeRangeChange("month")}
                className={`px-3 py-1 rounded-md text-sm ${
                  timeRange === "month"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                This Month
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center sm:flex-row flex-col border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700">
              <div className="flex items-center">
                <FiCalendar className="text-gray-500 dark:text-gray-400 mr-2" />
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  className="bg-transparent text-sm w-24 dark:text-white"
                  dateFormat="MM/dd/yyyy"
                />
              </div>
               <div className="flex items-center">
                <span className="mx-1 text-gray-500 dark:text-gray-400">to</span>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  className="bg-transparent text-sm w-24 dark:text-white"
                  dateFormat="MM/dd/yyyy"
                />
               </div>
              </div>

            <div className="flex gap-2 sm:flex-row flex-col">
                            <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md sm:px-3 px-2 py-1 bg-white dark:bg-gray-700 text-sm dark:text-white"
              >
              <option value="all">All Drivers</option>
                {summaryData.drivers?.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>

            <div className="flex items-center gap-2">
                            <button
                onClick={handleRefresh}
                className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                disabled={isLoading}
              >
                <FiRefreshCw className={`${isLoading ? "animate-spin" : ""}`} />
              </button>

              <button
                onClick={handleExport}
                className="flex items-center px-3 py-1 rounded-md bg-gradient-to-r from-green-500 to-green-600 text-white text-sm hover:from-green-600 hover:to-green-700"
                disabled={!hasData}
              >
                <FiDownload className="mr-1" /> Export
              </button>
            </div>
            </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab("earnings")}
            className={`px-4 py-2 font-medium ${
              activeTab === "earnings"
                ? "text-green-500 border-b-2 border-green-500"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Earnings
          </button>
          <button
            onClick={() => setActiveTab("rides")}
            className={`px-4 py-2 font-medium ${
              activeTab === "rides" ? "text-green-500 border-b-2 border-green-500" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Rides
          </button>
          <button
            onClick={() => setActiveTab("drivers")}
            className={`px-4 py-2 font-medium ${
              activeTab === "drivers"
                ? "text-green-500 border-b-2 border-green-500"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Drivers
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isInitialLoad && isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Total Earnings</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                      ${summaryData.totalEarnings?.toLocaleString() || "0.00"}
                    </p>
                  </div>
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900 text-green-500 dark:text-green-300">
                    <FiDollarSign size={20} />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  {getChangeIcon(summaryData.earningsChange)}
                  <span className={getChangeColor(summaryData.earningsChange)}>
                    {formatPercentageChange(summaryData.earningsChange)}%
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">vs last period</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Total Rides</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                      {summaryData.totalRides?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-500 dark:text-blue-300">
                    <FiTrendingUp size={20} />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  {getChangeIcon(summaryData.ridesChange)}
                  <span className={getChangeColor(summaryData.ridesChange)}>
                    {formatPercentageChange(summaryData.ridesChange)}%
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">vs last period</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Avg. per Ride</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                      ${summaryData.averageEarningPerRide?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-500 dark:text-purple-300">
                    <FiDollarSign size={20} />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  {getChangeIcon(summaryData.avgPerRideChange)}
                  <span className={getChangeColor(summaryData.avgPerRideChange)}>
                    {formatPercentageChange(summaryData.avgPerRideChange)}%
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">vs last period</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Cancellation Rate</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                      {summaryData.cancellationRate?.toFixed(1) || "0.0"}%
                    </p>
                  </div>
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900 text-red-500 dark:text-red-300">
                    <FiTrendingDown size={20} />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  {getChangeIcon(summaryData.cancellationRateChange)}
                  <span className={getChangeColor(summaryData.cancellationRateChange)}>
                    {formatPercentageChange(summaryData.cancellationRateChange)}%
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">vs last period</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Main Content - Charts */}
        {isInitialLoad && isLoading ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 animate-pulse"></div>
              <ChartSkeleton />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4 animate-pulse"></div>
                <ChartSkeleton height="h-64" />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-36 mb-4 animate-pulse"></div>
                <ChartSkeleton height="h-64" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === "earnings" && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Earnings Overview</h2>
                  <div className="h-80">
                    {hasData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" strokeOpacity={0.1} />
                          <XAxis dataKey="name" stroke="#6B7280" />
                          <YAxis stroke="#6B7280" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1F2937",
                              borderColor: "#374151",
                              borderRadius: "0.5rem",
                              color: "#F9FAFB",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="earnings"
                            stroke="#10B981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorEarnings)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChartState message="No earnings data available" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                      Earnings by {timeRange === "day" ? "Hour" : "Day"}
                    </h2>
                    <div className="h-64">
                      {hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="earnings" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyChartState message="No earnings data to display" />
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Earnings vs Rides</h2>
                    <div className="h-64">
                      {hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="name" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="earnings"
                              stroke="#3B82F6"
                              strokeWidth={2}
                              dot={false}
                              name="Earnings ($)"
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="rides"
                              stroke="#10B981"
                              strokeWidth={2}
                              dot={false}
                              name="Rides"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyChartState message="No data to compare" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "rides" && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Rides Overview</h2>
                  <div className="h-80">
                    {hasData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="rides" fill="#10B981" radius={[4, 4, 0, 0]} name="Completed Rides" />
                          <Bar dataKey="cancellations" fill="#EF4444" radius={[4, 4, 0, 0]} name="Cancelled Rides" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChartState message="No rides data available" />
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Cancellation Trend</h2>
                  <div className="h-64">
                    {hasData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="cancellations"
                            stroke="#EF4444"
                            strokeWidth={2}
                            dot={false}
                            name="Cancellations"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChartState message="No cancellation data available" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "drivers" && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Driver Earnings Distribution
                  </h2>
                  <div className="h-80">
                    {isLoading ? (
                      <ChartSkeleton />
                    ) : summaryData.drivers && summaryData.drivers.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={summaryData.drivers}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="earnings"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {summaryData.drivers.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChartState message="No driver data available" />
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Driver Performance</h2>
                  <div className="overflow-x-auto">
                    {isLoading ? (
                      <TableSkeleton />
                    ) : summaryData.drivers && summaryData.drivers.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Driver
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Rides
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Earnings
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Avg. per Ride
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {summaryData.drivers.map((driver) => (
                            <tr key={driver.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                {driver.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {driver.rides}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                ${driver.earnings?.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                ${driver.rides > 0 ? (driver.earnings / driver.rides).toFixed(2) : "0.00"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <EmptyChartState message="No driver performance data available" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
