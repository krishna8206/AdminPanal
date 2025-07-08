import { useState, useEffect, useCallback } from "react"
import { useLocation } from 'react-router-dom';
import axios from "axios"
import { FaCar, FaPlus, FaEdit, FaSearch, FaFilter, FaSync, FaTrash, FaEye, FaWifi, FaWifiSlash } from "react-icons/fa"
import { MdDirectionsCar, MdElectricCar, MdTwoWheeler } from "react-icons/md"
import { GiCargoCrate } from "react-icons/gi"

import socket from "../utils/socket"

// Configure axios defaults
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://panalsbackend.onrender.com/api"
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

export default function VehicleManagement() {
    const location = useLocation();
  const [activeTab, setActiveTab] = useState("All")
  const [activeCategory, setActiveCategory] = useState("All")
  const [activeVehicleType, setActiveVehicleType] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [vehicles, setVehicles] = useState([])
  const [vehicleStats, setVehicleStats] = useState(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [formData, setFormData] = useState({
    registrationNumber: "",
    vehicleType: "Car",
    category: "Ride",
    model: "",
    year: new Date().getFullYear().toString(),
    color: "",
    capacity: "4",
    fuelType: "Petrol",
    status: "Active",
    kycStatus: "Pending",
  })
  const vehiclesPerPage = 6

  // Test server connection
  const testServerConnection = useCallback(async () => {
    try {
      const response = await api.get("/test")
      console.log("✅ Server connection test successful:", response.data)
      return true
    } catch (error) {
      console.error("❌ Server connection test failed:", error)
      setErrorMessage("Cannot connect to server. Please check if the server is running on https://panalsbackend.onrender.com")
      return false
    }
  }, [])

  // Fetch vehicles from backend (fallback if socket fails)
  const fetchVehicles = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await api.get("/vehicles")
      console.log("Fetched vehicles:", response.data)

      if (response.data.success) {
        setVehicles(response.data.data || [])
      } else {
        setVehicles(response.data || [])
      }
      setErrorMessage("")
    } catch (error) {
      console.error("Error fetching vehicles:", error)
      const errorMsg = error.response?.data?.error || error.message || "Failed to load vehicles"
      setErrorMessage(errorMsg)
      setVehicles([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchVehicleStats = useCallback(async () => {
    try {
      const response = await api.get("/vehicles/stats")
      if (response.data.success) {
        setVehicleStats(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching vehicle stats:", error)
    }
  }, [])

  // Socket connection and event listeners
  useEffect(() => {
    let heartbeatInterval
    let reconnectTimeout

    // Test server connection first
    testServerConnection()

    // Socket connection status handlers
    const handleConnect = () => {
      console.log("✅ Socket connected for vehicle management")
      setSocketConnected(true)
      setConnectionAttempts(0)
      setErrorMessage("")

      // Join the vehicles room for real-time updates
      socket.emit("join-room", "vehicles")

      // Start heartbeat interval
      heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit("client-heartbeat", {
            timestamp: new Date().toISOString(),
            clientId: socket.id,
          })
        }
      }, 30000) // Send heartbeat every 30 seconds

      // Request latest data on connect/reconnect
      setTimeout(() => {
        socket.emit("getLatestVehicles")
      }, 1000)
    }

    const handleDisconnect = (reason) => {
      console.log("❌ Socket disconnected:", reason)
      setSocketConnected(false)

      // Clear heartbeat interval
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }

      // Handle different disconnect reasons
      switch (reason) {
        case "io client disconnect":
          // Normal disconnect (page refresh, navigation)
          setErrorMessage("Connection closed (page refresh)")
          break
        case "ping timeout":
          setErrorMessage("Connection timeout. Reconnecting...")
          break
        case "transport close":
          setErrorMessage("Connection lost. Reconnecting...")
          break
        case "transport error":
          setErrorMessage("Network error. Reconnecting...")
          break
        default:
          setErrorMessage("Connection lost. Attempting to reconnect...")
      }

      // Clear error message after some time if reconnection is successful
      reconnectTimeout = setTimeout(() => {
        if (!socket.connected) {
          setErrorMessage("Unable to establish real-time connection. Please refresh the page.")
        }
      }, 15000) // 15 seconds timeout
    }

    const handleConnectError = (error) => {
      console.error("Socket connection error:", error)
      setSocketConnected(false)
      setConnectionAttempts((prev) => prev + 1)

      if (connectionAttempts < 10) {
        setErrorMessage(`Connection attempt ${connectionAttempts + 1}/10 failed. Retrying...`)
      } else {
        setErrorMessage("Real-time connection failed. Please refresh the page or check your server.")
      }
    }

    const handleReconnect = (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`)
      setConnectionAttempts(0)
      setErrorMessage("")
      setSuccessMessage("Real-time connection restored!")
      setTimeout(() => setSuccessMessage(""), 3000)
    }

    const handleReconnectAttempt = (attemptNumber) => {
      console.log(`🔄 Socket reconnection attempt #${attemptNumber}`)
      setConnectionAttempts(attemptNumber)
      setErrorMessage(`Reconnecting... (attempt ${attemptNumber}/15)`)
    }

    const handleReconnectFailed = () => {
      console.log("🔴 Socket reconnection failed")
      setErrorMessage("Failed to reconnect. Please refresh the page.")
      setConnectionAttempts(0)
    }

    // Handle server heartbeat
    const handleServerHeartbeat = (data) => {
      console.log("💓 Server heartbeat received:", data)
      // Connection is healthy, clear any error messages
      if (errorMessage.includes("timeout") || errorMessage.includes("lost")) {
        setErrorMessage("")
      }
    }

    // Listen for real-time vehicle updates
    const handleVehiclesUpdate = (data) => {
      console.log("📡 Received vehicles update:", data)
      if (data.success && Array.isArray(data.data)) {
        setVehicles(data.data)
        if (data.message && data.message.includes("reconnection")) {
          setSuccessMessage("Data refreshed after reconnection")
          setTimeout(() => setSuccessMessage(""), 3000)
        }
      }
    }

    // Listen for individual vehicle status changes
    const handleVehicleStatusChanged = (data) => {
      console.log("🔄 Vehicle status changed:", data)
      setVehicles((prevVehicles) =>
        prevVehicles.map((vehicle) => (vehicle._id === data.vehicleId ? { ...vehicle, ...data.vehicle } : vehicle)),
      )
      setSuccessMessage(`Vehicle status updated to ${data.status}`)
      setTimeout(() => setSuccessMessage(""), 3000)
      // Also update stats
      fetchVehicleStats()
    }

    // Listen for vehicle assignments
    const handleVehicleAssigned = (data) => {
      console.log("👤 Vehicle assigned:", data)
      setVehicles((prevVehicles) =>
        prevVehicles.map((vehicle) => (vehicle._id === data.vehicleId ? { ...vehicle, ...data.vehicle } : vehicle)),
      )
      setSuccessMessage("Vehicle assignment updated")
      setTimeout(() => setSuccessMessage(""), 3000)
    }

    // Listen for vehicle added
    const handleVehicleAdded = (data) => {
      console.log("➕ Vehicle added:", data)
      setSuccessMessage(data.message || "New vehicle added")
      setTimeout(() => setSuccessMessage(""), 3000)
      // Refresh data
      socket.emit("getLatestVehicles")
      fetchVehicleStats()
    }

    // Listen for vehicle updated
    const handleVehicleUpdated = (data) => {
      console.log("🔄 Vehicle updated:", data)
      setSuccessMessage(data.message || "Vehicle updated")
      setTimeout(() => setSuccessMessage(""), 3000)
      // Refresh data
      socket.emit("getLatestVehicles")
      fetchVehicleStats()
    }

    // Listen for vehicle deleted
    const handleVehicleDeleted = (data) => {
      console.log("❌ Vehicle deleted:", data)
      setSuccessMessage(data.message || "Vehicle deleted")
      setTimeout(() => setSuccessMessage(""), 3000)
      // Refresh data
      socket.emit("getLatestVehicles")
      fetchVehicleStats()
    }

    // Listen for status update success
    const handleStatusUpdateSuccess = (data) => {
      console.log("✅ Status update success:", data)
      setSuccessMessage(data.message || "Status updated successfully")
      setTimeout(() => setSuccessMessage(""), 3000)
    }

    // Listen for socket errors
    const handleError = (error) => {
      console.error("Socket error:", error)
      setErrorMessage(error.message || "Real-time update error")
      setTimeout(() => setErrorMessage(""), 5000)
    }

    // Listen for test response
    const handleTestResponse = (data) => {
      console.log("📡 Test response received:", data)
    }

    // Register event listeners
    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("connect_error", handleConnectError)
    socket.on("reconnect", handleReconnect)
    socket.on("reconnect_attempt", handleReconnectAttempt)
    socket.on("reconnect_failed", handleReconnectFailed)
    socket.on("server-heartbeat", handleServerHeartbeat)
    socket.on("vehiclesUpdate", handleVehiclesUpdate)
    socket.on("vehicleStatusChanged", handleVehicleStatusChanged)
    socket.on("vehicleAssigned", handleVehicleAssigned)
    socket.on("vehicleAdded", handleVehicleAdded)
    socket.on("vehicleUpdated", handleVehicleUpdated)
    socket.on("vehicleDeleted", handleVehicleDeleted)
    socket.on("statusUpdateSuccess", handleStatusUpdateSuccess)
    socket.on("test-response", handleTestResponse)
    socket.on("error", handleError)

    // Force connection if not connected
    if (!socket.connected) {
      console.log("🔄 Forcing socket connection...")
      socket.connect()
    }

    // Cleanup function
    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)

      // Remove all event listeners
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("connect_error", handleConnectError)
      socket.off("reconnect", handleReconnect)
      socket.off("reconnect_attempt", handleReconnectAttempt)
      socket.off("reconnect_failed", handleReconnectFailed)
      socket.off("server-heartbeat", handleServerHeartbeat)
      socket.off("vehiclesUpdate", handleVehiclesUpdate)
      socket.off("vehicleStatusChanged", handleVehicleStatusChanged)
      socket.off("vehicleAssigned", handleVehicleAssigned)
      socket.off("vehicleAdded", handleVehicleAdded)
      socket.off("vehicleUpdated", handleVehicleUpdated)
      socket.off("vehicleDeleted", handleVehicleDeleted)
      socket.off("statusUpdateSuccess", handleStatusUpdateSuccess)
      socket.off("test-response", handleTestResponse)
      socket.off("error", handleError)
    }
  }, [fetchVehicleStats, testServerConnection, connectionAttempts, errorMessage])

  // Initial data fetch
  useEffect(() => {
    fetchVehicles()
    fetchVehicleStats()
  }, [fetchVehicles, fetchVehicleStats])

  // Manual reconnect function
  const handleManualReconnect = () => {
    setErrorMessage("Attempting to reconnect...")
    setConnectionAttempts(0)
    socket.disconnect()
    setTimeout(() => {
      socket.connect()
    }, 1000)
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    setErrorMessage("")
  }

  // Validate form data
  const validateFormData = () => {
    const errors = []

    if (!formData.registrationNumber.trim()) {
      errors.push("Registration number is required.")
    } else if (!/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/.test(formData.registrationNumber.toUpperCase())) {
      errors.push("Invalid registration number format. Use format: XX00XX0000")
    }

    if (!formData.model.trim()) errors.push("Model is required.")

    const currentYear = new Date().getFullYear()
    if (!formData.year || isNaN(formData.year) || formData.year < 1900 || formData.year > currentYear + 1) {
      errors.push(`Year must be between 1900 and ${currentYear + 1}.`)
    }

    if (!formData.capacity || isNaN(formData.capacity) || formData.capacity <= 0 || formData.capacity > 50) {
      errors.push("Capacity must be a number between 1 and 50.")
    }

    if (!formData.color.trim()) errors.push("Color is required.")

    return errors
  }

  const handleSubmitVehicle = async () => {
    const errors = validateFormData()
    if (errors.length > 0) {
      setErrorMessage(errors.join(" "))
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        registrationNumber: formData.registrationNumber.trim().toUpperCase(),
        vehicleType: formData.vehicleType,
        category: formData.category,
        model: formData.model.trim(),
        year: Number.parseInt(formData.year),
        color: formData.color.trim(),
        capacity: Number.parseInt(formData.capacity),
        fuelType: formData.fuelType,
        status: formData.status,
        kycStatus: formData.kycStatus,
      }

      console.log("Submitting payload:", payload)

      let response
      if (editMode) {
        response = await api.put(`/vehicles/${selectedVehicle._id}`, payload)
        setSuccessMessage("Vehicle updated successfully!")
      } else {
        response = await api.post("/vehicles", payload)
        setSuccessMessage("Vehicle added successfully!")
      }

      // Close modal and reset form
      setShowAddModal(false)
      resetForm()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error("Error submitting vehicle:", error)
      const errorMsg =
        error.response?.data?.error || error.response?.data?.message || "Failed to save vehicle. Please try again."
      setErrorMessage(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) {
      return
    }

    try {
      await api.delete(`/vehicles/${vehicleId}`)
      setSuccessMessage("Vehicle deleted successfully!")

      // If we're viewing the vehicle that's being deleted, close the modal
      if (selectedVehicle && selectedVehicle._id === vehicleId) {
        setShowViewModal(false)
      }

      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error("Error deleting vehicle:", error)
      const errorMsg = error.response?.data?.error || "Failed to delete vehicle"
      setErrorMessage(errorMsg)
    }
  }

  // Handle real-time status updates via socket
  const handleStatusUpdate = (vehicleId, newStatus) => {
    if (socketConnected) {
      socket.emit("updateVehicleStatus", {
        vehicleId,
        status: newStatus,
      })
    } else {
      setErrorMessage("Cannot update status - real-time connection not available")
    }
  }

  const resetForm = () => {
    setFormData({
      registrationNumber: "",
      vehicleType: "Car",
      category: "Ride",
      model: "",
      year: new Date().getFullYear().toString(),
      color: "",
      capacity: "4",
      fuelType: "Petrol",
      status: "Active",
      kycStatus: "Pending",
    })
    setErrorMessage("")
    setSelectedVehicle(null)
    setEditMode(false)
  }

  // Set form data when editing a vehicle
  useEffect(() => {
    if (editMode && selectedVehicle) {
      setFormData({
        registrationNumber: selectedVehicle.registrationNumber || "",
        vehicleType: selectedVehicle.vehicleType || "Car",
        category: selectedVehicle.category || "Ride",
        model: selectedVehicle.model || "",
        year: selectedVehicle.year?.toString() || "",
        color: selectedVehicle.color || "",
        capacity: selectedVehicle.capacity?.toString() || "",
        fuelType: selectedVehicle.fuelType || "Petrol",
        status: selectedVehicle.status || "Active",
        kycStatus: selectedVehicle.kycStatus || "Pending",
      })
    }
  }, [editMode, selectedVehicle])

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // Perform actions before the window reloads (e.g., save data, show confirmation)
      console.log("Window is about to reload/close");

      // Optional: Show a confirmation dialog
      event.preventDefault();
      event.returnValue = ''; // Required for Chrome
       handleManualReconnect();
      return ''; // Required for some browsers
      
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup: Remove the event listener when the component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  let param = URL;

  useEffect(()=>{
handleManualReconnect();
  },[location])

  // Filter vehicles based on search, tab, category and vehicle type
  const filteredVehicles = vehicles.filter((vehicle) => {
    if (!vehicle) return false

    const registrationNumber = (vehicle.registrationNumber || "").toLowerCase()
    const model = (vehicle.model || "").toLowerCase()
    const status = (vehicle.status || "").toLowerCase()
    const category = (vehicle.category || "").toLowerCase()
    const color = (vehicle.color || "").toLowerCase()
    const vehicleType = (vehicle.vehicleType || "").toLowerCase()

    const matchesSearch =
      searchQuery === "" ||
      registrationNumber.includes(searchQuery.toLowerCase()) ||
      model.includes(searchQuery.toLowerCase()) ||
      color.includes(searchQuery.toLowerCase())

    const matchesTab = activeTab === "All" || status === activeTab.toLowerCase()
    const matchesCategory = activeCategory === "All" || category === activeCategory.toLowerCase().replace(" ", " ")
    const matchesVehicleType = activeVehicleType === "All" || vehicleType === activeVehicleType.toLowerCase()

    return matchesSearch && matchesTab && matchesCategory && matchesVehicleType
  })

  // Pagination logic
  const indexOfLastVehicle = currentPage * vehiclesPerPage
  const indexOfFirstVehicle = indexOfLastVehicle - vehiclesPerPage
  const currentVehicles = filteredVehicles.slice(indexOfFirstVehicle, indexOfLastVehicle)
  const totalPages = Math.ceil(filteredVehicles.length / vehiclesPerPage)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  const getVehicleIcon = (type) => {
    switch (type) {
      case "Car":
        return <MdDirectionsCar className="text-blue-500 text-xl" />
      case "Bike":
        return <MdTwoWheeler className="text-green-500 text-xl" />
      case "Electric vehicle":
        return <MdElectricCar className="text-purple-500 text-xl" />
      case "Truck":
        return <GiCargoCrate className="text-orange-500 text-xl" />
      case "Van":
        return <FaCar className="text-teal-500 text-xl" />
      default:
        return <FaCar className="text-gray-500 text-xl" />
    }
  }

  const getCategoryBadge = (category) => {
    switch (category) {
      case "Ride":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            Trip
          </span>
        )
      case "Food Delivery":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            Food Delivery
          </span>
        )
      case "Courier Delivery":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
            Parcel
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            Unknown
          </span>
        )
    }
  }

  const getStatusBadge = (status, vehicleId) => {
    const handleStatusClick = (newStatus) => {
      if (newStatus !== status) {
        handleStatusUpdate(vehicleId, newStatus)
      }
    }

    switch (status) {
      case "Active":
        return (
          <div className="relative group">
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 cursor-pointer">
              Active
            </span>
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                onClick={() => handleStatusClick("Inactive")}
                className="block px-3 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                Set Inactive
              </button>
              {/* <button
                // onClick={() => handleStatusClick("Maintenance")}
                className="block px-3 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                Set Maintenance
              </button> */}
            </div>
          </div>
        )
      case "Inactive":
        return (
          <div className="relative group">
            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 cursor-pointer">
              Inactive
            </span>
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                onClick={() => handleStatusClick("Active")}
                className="block px-3 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                Set Active
              </button>
              {/* <button
                onClick={() => handleStatusClick("Maintenance")}
                className="block px-3 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                Set Maintenance
              </button> */}
            </div>
          </div>
        )
      // case "Maintenance":
      //   return (
      //     <div className="relative group">
      //       <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 cursor-pointer">
      //         Maintenance
      //       </span>
      //       <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
      //         <button
      //           onClick={() => handleStatusClick("Active")}
      //           className="block px-3 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
      //         >
      //           Set Active
      //         </button>
      //         <button
      //           onClick={() => handleStatusClick("Inactive")}
      //           className="block px-3 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
      //         >
      //           Set Inactive
      //         </button>
      //       </div>
      //     </div>
      //   )
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            Unknown
          </span>
        )
    }
  }

  const getKycBadge = (status) => {
    switch (status) {
      case "Verified":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Verified
          </span>
        )
      case "Pending":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            Pending
          </span>
        )
      case "Rejected":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            Rejected
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            Unknown
          </span>
        )
    }
  }

  const handleAddVehicle = () => {
    setShowAddModal(true)
    setEditMode(false)
    resetForm()
  }

  const handleEditVehicle = (vehicle) => {
    setSelectedVehicle(vehicle)
    setEditMode(true)
    setShowAddModal(true)
    setErrorMessage("")
  }

  const handleViewVehicle = (vehicle) => {
    setSelectedVehicle(vehicle)
    setShowViewModal(true)
  }

  // Skeleton Loading Components
  const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600"></div>
          <div>
            <div className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          <div className="flex gap-1">
            <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
            <div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <div>
          <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
          <div className="h-3 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          ))}
        </div>
      </div>
    </div>
  )

  const SkeletonFilter = () => (
    <div className="flex min-h-10 space-x-2 mb-4 overflow-x-auto pb-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-8 w-24 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div>
      ))}
    </div>
  )

  return (
    <div className="h-[90vh] w-full bg-black flex flex-col overflow-y-scroll">
      <div className="flex-1 flex flex-col p-4">
        {/* Enhanced Connection Status */}
        <div className="mb-2 flex items-center justify-between">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
              socketConnected
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {socketConnected ? <FaWifi className="w-3 h-3" /> : <FaWifi className="w-3 h-3" />}
            {socketConnected ? "Live Data Connected" : "Live Data Disconnected"}
          </div>

          {!socketConnected && (
            <button
              onClick={handleManualReconnect}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              Reconnect
            </button>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-lg">
            {successMessage}
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Fleet Management</h2>
            {vehicleStats && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {vehicleStats.overview.totalVehicles} vehicles • {vehicleStats.overview.activeVehicles} active
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-9 w-40 md:w-64 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div>
              <div className="w-9 h-9 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse"></div>
              <div className="w-9 h-9 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse"></div>
              <div className="w-24 h-9 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse"></div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative sm:block hidden">
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  className="h-9 w-40 md:w-64 rounded-full border border-gray-400/20 ps-9 text-gray-800 dark:text-white dark:bg-gray-700/60 dark:border-gray-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
              <button className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">
                <FaFilter />
              </button>
              <button
                onClick={() => {
                  setSearchQuery("")
                  setActiveTab("All")
                  setActiveCategory("All")
                  setActiveVehicleType("All")
                  setCurrentPage(1)
                  fetchVehicles()
                  if (socketConnected) {
                    socket.emit("getLatestVehicles")
                  }
                }}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <FaSync />
              </button>
              <button
                onClick={handleAddVehicle}
                className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg  transition-colors"
              >
                <FaPlus /> Add Vehicle
              </button>
            </div>
          )}
        </div>

        {/* Vehicle Type Filters */}
        {isLoading ? (
          <SkeletonFilter />
        ) : (
          <div className="flex min-h-8 space-x-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveVehicleType("All")}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                activeVehicleType === "All" 
                  ? "bg-purple-500 text-white" 
                  : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              All Types ({vehicles.length})
            </button>
            <button
              onClick={() => setActiveVehicleType("Car")}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                activeVehicleType === "Car" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              Cars ({vehicles.filter((v) => v.vehicleType === "Car").length})
            </button>
            <button
              onClick={() => setActiveVehicleType("Bike")}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                activeVehicleType === "Bike" 
                  ? "bg-green-500 text-white" 
                  : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              Bikes ({vehicles.filter((v) => v.vehicleType === "Bike").length})
            </button>
            <button
              onClick={() => setActiveVehicleType("Electric vehicle")}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                activeVehicleType === "Electric vehicle" 
                  ? "bg-teal-500 text-white" 
                  : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              Electric ({vehicles.filter((v) => v.vehicleType === "Electric vehicle").length})
            </button>
            <button
              onClick={() => setActiveVehicleType("Truck")}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                activeVehicleType === "Truck" 
                  ? "bg-orange-500 text-white" 
                  : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              Trucks ({vehicles.filter((v) => v.vehicleType === "Truck").length})
            </button>
            <button
              onClick={() => setActiveVehicleType("Van")}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                activeVehicleType === "Van" 
                  ? "bg-indigo-500 text-white" 
                  : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              Vans ({vehicles.filter((v) => v.vehicleType === "Van").length})
            </button>
          </div>
        )}

        {/* Status Filters */}
        {isLoading ? (
          <SkeletonFilter />
        ) : (
          <div className="flex min-h-8 space-x-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab("All")}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                activeTab === "All" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              All Status ({vehicles.length})
            </button>
            <button
              onClick={() => setActiveTab("Active")}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                activeTab === "Active" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              Active ({vehicles.filter((v) => v.status === "Active").length})
            </button>
            <button
              onClick={() => setActiveTab("Inactive")}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                activeTab === "Inactive" ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              Inactive ({vehicles.filter((v) => v.status === "Inactive").length})
            </button>
          </div>
        )}

        {/* Vehicle Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <FaCar className="mx-auto text-4xl mb-4 opacity-50" />
              <p>No vehicles found matching your criteria</p>
              <button
                onClick={handleAddVehicle}
                className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Add Your First Vehicle
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {currentVehicles.map((vehicle) => (
                <div
                  key={vehicle._id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      {getVehicleIcon(vehicle.vehicleType)}
                      <div>
                        <h3 className="font-bold text-gray-800 dark:text-white">{vehicle.model}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{vehicle.registrationNumber}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getCategoryBadge(vehicle.category)}
                      <div className="flex gap-1">
                        {getStatusBadge(vehicle.status, vehicle._id)}
                        {getKycBadge(vehicle.kycStatus)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Type</p>
                      <p className="text-gray-800 dark:text-white">{vehicle.vehicleType}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Year</p>
                      <p className="text-gray-800 dark:text-white">{vehicle.year}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Capacity</p>
                      <p className="text-gray-800 dark:text-white">
                        {vehicle.capacity} {vehicle.vehicleType === "Bike" ? "seat" : "seats"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Fuel Type</p>
                      <p className="text-gray-800 dark:text-white">{vehicle.fuelType}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Color</p>
                      <p className="text-gray-800 dark:text-white">{vehicle.color}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated</p>
                      <p className="text-sm text-gray-800 dark:text-white">
                        {new Date(vehicle.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewVehicle(vehicle)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleEditVehicle(vehicle)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(vehicle._id)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {filteredVehicles.length > vehiclesPerPage && (
              <div className="flex justify-center mt-4">
                <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>«
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => paginate(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? "z-10 bg-green-500 border-green-500 text-white"
                          : "bg-white border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>»
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                {editMode ? "Edit Vehicle" : "Add New Vehicle"}
              </h3>

              {errorMessage && (
                <div className="mb-4 p-3 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    name="registrationNumber"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    value={formData.registrationNumber}
                    onChange={handleInputChange}
                    placeholder="e.g. MH01AB1234"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vehicle Type
                    </label>
                    <select
                      name="vehicleType"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      value={formData.vehicleType}
                      onChange={handleInputChange}
                    >
                      <option value="Car">Car</option>
                      <option value="Bike">Bike</option>
                      <option value="Electric vehicle">Electric Vehicle</option>
                      <option value="Truck">Truck</option>
                      <option value="Van">Van</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select
                      name="category"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      <option value="Ride">Trip</option>
                      <option value="Food Delivery">Food Delivery</option>
                      <option value="Courier Delivery">Parcel Delivery</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
                    <input
                      type="text"
                      name="model"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      value={formData.model}
                      onChange={handleInputChange}
                      placeholder="e.g. Toyota Innova"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                    <input
                      type="number"
                      name="year"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      value={formData.year}
                      onChange={handleInputChange}
                      placeholder="e.g. 2022"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                    <input
                      type="text"
                      name="color"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      value={formData.color}
                      onChange={handleInputChange}
                      placeholder="e.g. White"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity</label>
                    <input
                      type="number"
                      name="capacity"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      placeholder="e.g. 7"
                      min="1"
                      max="50"
                      step="1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fuel Type</label>
                    <select
                      name="fuelType"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      value={formData.fuelType}
                      onChange={handleInputChange}
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="CNG">CNG</option>
                      <option value="Electric">Electric</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select
                      name="status"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      {/* <option value="Maintenance">Maintenance</option> */}
                    </select>
                  </div>
                </div>

                {editMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      KYC Status
                    </label>
                    <select
                      name="kycStatus"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      value={formData.kycStatus}
                      onChange={handleInputChange}
                    >
                      <option value="Verified">Verified</option>
                      <option value="Pending">Pending</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitVehicle}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : editMode ? "Update Vehicle" : "Add Vehicle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Vehicle Modal */}
      {showViewModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Vehicle Details</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  {getVehicleIcon(selectedVehicle.vehicleType)}
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-white">{selectedVehicle.model}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{selectedVehicle.registrationNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Vehicle Type</p>
                    <p className="font-medium text-gray-800 dark:text-white">{selectedVehicle.vehicleType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
                    <div className="mt-1">{getCategoryBadge(selectedVehicle.category)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Year</p>
                    <p className="font-medium text-gray-800 dark:text-white">{selectedVehicle.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Color</p>
                    <p className="font-medium text-gray-800 dark:text-white">{selectedVehicle.color}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Capacity</p>
                    <p className="font-medium text-gray-800 dark:text-white">{selectedVehicle.capacity} seats</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fuel Type</p>
                    <p className="font-medium text-gray-800 dark:text-white">{selectedVehicle.fuelType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedVehicle.status, selectedVehicle._id)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">KYC Status</p>
                    <div className="mt-1">{getKycBadge(selectedVehicle.kycStatus)}</div>
                  </div>
                </div>

                {selectedVehicle.assignedDriver && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Assigned Driver</p>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <p className="font-medium text-gray-800 dark:text-white">{selectedVehicle.assignedDriver.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{selectedVehicle.assignedDriver.phone}</p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Created</p>
                      <p className="text-gray-800 dark:text-white">
                        {new Date(selectedVehicle.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Last Updated</p>
                      <p className="text-gray-800 dark:text-white">
                        {new Date(selectedVehicle.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* {selectedVehicle.maintenanceStatus && (
                  <div
                    className={`p-3 rounded-lg ${
                      selectedVehicle.maintenanceStatus === "Overdue"
                        ? "bg-red-50 dark:bg-red-900/30"
                        : selectedVehicle.maintenanceStatus === "Due Soon"
                          ? "bg-yellow-50 dark:bg-yellow-900/30"
                          : "bg-green-50 dark:bg-green-900/30"
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        selectedVehicle.maintenanceStatus === "Overdue"
                          ? "text-red-800 dark:text-red-300"
                          : selectedVehicle.maintenanceStatus === "Due Soon"
                            ? "text-yellow-800 dark:text-yellow-300"
                            : "text-green-800 dark:text-green-300"
                      }`}
                    >
                      <strong>Maintenance Status:</strong> {selectedVehicle.maintenanceStatus}
                    </p>x
                  </div>
                )} */}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    handleEditVehicle(selectedVehicle)
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Edit Vehicle
                </button>
                <button
                  onClick={() => handleDeleteVehicle(selectedVehicle._id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}