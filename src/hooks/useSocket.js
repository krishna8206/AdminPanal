"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import io from "socket.io-client"

// Socket singleton to prevent multiple connections
let socketInstance = null

/**
 * Unified socket hook that can be used for different features
 * @param {string} room - The room to join (dashboard, admin-management, etc.)
 * @param {Object} eventHandlers - Object mapping event names to handler functions
 * @param {Object} options - Additional options
 * @returns {Object} Socket connection state and methods
 */
export const useSocket = (room, eventHandlers = {}, options = {}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const socketRef = useRef(null)
  const eventHandlersRef = useRef(eventHandlers)
  const reconnectAttempts = options.reconnectAttempts || 5
  const reconnectDelay = options.reconnectDelay || 1000
  const timeout = options.timeout || 20000

  // Update event handlers ref when they change
  useEffect(() => {
    eventHandlersRef.current = eventHandlers
  }, [eventHandlers])

  useEffect(() => {
    // Create or reuse socket connection
    if (!socketInstance) {
      const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://panalsbackend.onrender.com"

      socketInstance = io(SOCKET_URL, {
        timeout,
        reconnection: true,
        reconnectDelay,
        reconnectAttempts,
        transports: ["websocket", "polling"],
      })

      console.log("🔌 Creating new socket connection")
    } else {
      console.log("🔌 Reusing existing socket connection")
    }

    socketRef.current = socketInstance

    // Connection event handlers
    const handleConnect = () => {
      console.log(`✅ Connected to server (${room})`)
      setIsConnected(true)
      setConnectionError(null)

      // Send client info
      socketRef.current.emit("client-connected", {
        page: room || "unknown",
        timestamp: new Date().toISOString(),
      })

      // Join specific room if provided
      if (room) {
        socketRef.current.emit("join-room", room)
      }
    }

    const handleDisconnect = (reason) => {
      console.log(`❌ Disconnected from server (${room}):`, reason)
      setIsConnected(false)
    }

    const handleConnectError = (error) => {
      console.error(`Connection error (${room}):`, error)
      setIsConnected(false)
      setConnectionError(error.message)
    }

    const handleReconnect = (attemptNumber) => {
      console.log(`🔄 Reconnected (${room}) after ${attemptNumber} attempts`)
      setIsConnected(true)
      setConnectionError(null)

      // Send client info again
      socketRef.current.emit("client-connected", {
        page: room || "unknown",
        timestamp: new Date().toISOString(),
        reconnected: true,
      })

      // Re-join room after reconnection
      if (room) {
        socketRef.current.emit("join-room", room)
      }
    }

    // Register connection event handlers
    socketRef.current.on("connect", handleConnect)
    socketRef.current.on("disconnect", handleDisconnect)
    socketRef.current.on("connect_error", handleConnectError)
    socketRef.current.on("reconnect", handleReconnect)

    // Register custom event handlers - including model updates that might not be room-specific
    const allEventHandlers = {
      ...eventHandlersRef.current,
      // Add these handlers to ensure we catch all model updates regardless of room
      vehiclesUpdate: (data) => {
        if (eventHandlersRef.current.vehiclesUpdate) {
          eventHandlersRef.current.vehiclesUpdate(data)
        }
      },
      driversUpdate: (data) => {
        if (eventHandlersRef.current.driversUpdate) {
          eventHandlersRef.current.driversUpdate(data)
        }
      },
      ridesUpdate: (data) => {
        if (eventHandlersRef.current.ridesUpdate) {
          eventHandlersRef.current.ridesUpdate(data)
        }
      },
      adminsUpdate: (data) => {
        if (eventHandlersRef.current.adminsUpdate) {
          eventHandlersRef.current.adminsUpdate(data)
        }
      },
      dashboardStats: (data) => {
        if (eventHandlersRef.current.dashboardStats) {
          eventHandlersRef.current.dashboardStats(data)
        }
      },
    }

    // Register all event handlers
    Object.entries(allEventHandlers).forEach(([event, handler]) => {
      if (handler) {
        socketRef.current.on(event, handler)
      }
    })

    // Add special handler for direct MongoDB changes
    socketRef.current.on("directDbChange", (data) => {
      console.log(`🔔 Direct MongoDB change detected: ${data.collection} ${data.operation}`, data)

      // Request immediate refresh of the affected collection
      if (socketRef.current && isConnected) {
        socketRef.current.emit("refresh-data", { models: [data.collection] })
      }
    })

    // If socket is already connected, join room immediately
    if (socketRef.current.connected) {
      handleConnect()
    }

    // Cleanup on unmount
    return () => {
      // Remove all event handlers
      Object.keys(allEventHandlers).forEach((event) => {
        if (socketRef.current) {
          socketRef.current.off(event)
        }
      })

      // Remove connection event handlers
      if (socketRef.current) {
        socketRef.current.off("connect", handleConnect)
        socketRef.current.off("disconnect", handleDisconnect)
        socketRef.current.off("connect_error", handleConnectError)
        socketRef.current.off("reconnect", handleReconnect)
      }

      // Note: We don't close the socket here to maintain the singleton pattern
    }
  }, [room, reconnectAttempts, reconnectDelay, timeout, isConnected])

  // Emit method
  const emit = useCallback(
    (event, data) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit(event, data)
        return true
      }
      return false
    },
    [isConnected],
  )

  // Request latest data
  const refreshData = useCallback(
    (models = ["vehicles", "drivers", "rides", "admins"]) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("refresh-data", { models })
        return true
      }
      return false
    },
    [isConnected],
  )

  // Close socket connection (use with caution)
  const closeConnection = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close()
      socketInstance = null
      socketRef.current = null
      setIsConnected(false)
    }
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    emit,
    refreshData,
    closeConnection,
    // Add this new function to force an immediate refresh
    forceRefresh: useCallback(() => {
      if (socketRef.current && isConnected) {
        console.log("🔄 Forcing immediate data refresh")
        socketRef.current.emit("refresh-data", { models: ["vehicles", "drivers", "rides", "admins"] })
        return true
      }
      return false
    }, [isConnected]),
  }
}

// Specific hook for vehicles
export const useVehicleSocket = (onVehicleEvent) => {
  const eventHandlers = {
    vehiclesUpdate: (data) => onVehicleEvent("update", data),
    vehicleStatusChanged: (data) => onVehicleEvent("status-changed", data),
    vehicleAdded: (data) => onVehicleEvent("added", data),
    vehicleUpdated: (data) => onVehicleEvent("updated", data),
    vehicleDeleted: (data) => onVehicleEvent("deleted", data),
    "Vehicles:insert": (data) => onVehicleEvent("added", data),
    "Vehicles:update": (data) => onVehicleEvent("updated", data),
    "Vehicles:delete": (data) => onVehicleEvent("deleted", data),
  }

  return useSocket("vehicles", eventHandlers)
}

// Specific hook for admin management
export const useAdminSocket = (onAdminEvent) => {
  const eventHandlers = {
    "admin:created": (data) => onAdminEvent("created", data),
    "admin:updated": (data) => onAdminEvent("updated", data),
    "admin:deleted": (data) => onAdminEvent("deleted", data),
    "admin:status-changed": (data) => onAdminEvent("status-changed", data),
    adminsUpdate: (data) => onAdminEvent("update", data),
    "Admins:insert": (data) => onAdminEvent("created", data),
    "Admins:update": (data) => onAdminEvent("updated", data),
    "Admins:delete": (data) => onAdminEvent("deleted", data),
    connected: (data) => console.log("Admin socket connected:", data),
  }

  return useSocket("admin-management", eventHandlers)
}

// Specific hook for dashboard
export const useDashboardSocket = (onDashboardEvent) => {
  const eventHandlers = {
    dashboardStats: (data) => onDashboardEvent("stats", data),
    recentRidesUpdate: (data) => onDashboardEvent("rides", data),
    revenueDataUpdate: (data) => onDashboardEvent("revenue", data),
    dashboardError: (data) => onDashboardEvent("error", data),
  }

  return useSocket("dashboard", eventHandlers)
}

// Specific hook for drivers
export const useDriverSocket = (onDriverEvent) => {
  const eventHandlers = {
    driversUpdate: (data) => onDriverEvent("update", data),
    locationUpdate: (data) => onDriverEvent("location", data),
    driverStatusChanged: (data) => onDriverEvent("status", data),
    emergencyAlert: (data) => onDriverEvent("emergency", data),
    "Drivers:insert": (data) => onDriverEvent("added", data),
    "Drivers:update": (data) => onDriverEvent("updated", data),
    "Drivers:delete": (data) => onDriverEvent("deleted", data),
  }

  return useSocket("drivers", eventHandlers)
}

// Specific hook for billing
export const useBillingSocket = (onBillingEvent) => {
  const eventHandlers = {
    invoiceCreated: (data) => onBillingEvent("created", data),
    invoiceUpdated: (data) => onBillingEvent("updated", data),
    invoiceDeleted: (data) => onBillingEvent("deleted", data),
    connected: (data) => console.log("Billing socket connected:", data),
  }

  return useSocket("billing", eventHandlers)
}

// Specific hook for rides
export const useRidesSocket = (onRideEvent) => {
  const eventHandlers = {
    ridesUpdate: (data) => onRideEvent("update", data),
    locationUpdate: (data) => onRideEvent("location", data),
    rideStatusUpdate: (data) => onRideEvent("status", data),
    chatMessage: (data) => onRideEvent("chat", data),
    "Rides:insert": (data) => onRideEvent("added", data),
    "Rides:update": (data) => onRideEvent("updated", data),
    "Rides:delete": (data) => onRideEvent("deleted", data),
  }

  return useSocket("rides", eventHandlers)
}

// Specific hook for reports
export const useReportsSocket = (onReportEvent) => {
  const eventHandlers = {
    earningsReportUpdate: (data) => onReportEvent("earnings", data),
    driverPerformanceUpdate: (data) => onReportEvent("drivers", data),
    ridesAnalysisUpdate: (data) => onReportEvent("analysis", data),
    reportsSummaryUpdate: (data) => onReportEvent("summary", data),
    earningsReportData: (data) => onReportEvent("earnings", data),
    driverPerformanceData: (data) => onReportEvent("drivers", data),
    ridesAnalysisData: (data) => onReportEvent("analysis", data),
    reportsSummaryData: (data) => onReportEvent("summary", data),
    reportError: (data) => onReportEvent("error", data),
  }

  return useSocket("reports", eventHandlers)
}
