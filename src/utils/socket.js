import { io } from "socket.io-client"

// Create a singleton socket instance with persistent connection
let socket = null

// Socket configuration
const SOCKET_URL = "https://panalsbackend.onrender.com" // Make sure this matches your server port
const SOCKET_OPTIONS = {
  transports: ["websocket", "polling"],
  reconnectionAttempts: Number.POSITIVE_INFINITY, // Never stop trying to reconnect
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
  forceNew: false,
  multiplex: true, // Use a single connection for all namespaces
}

// Create or get socket instance
const getSocket = () => {
  if (!socket) {
    // Create new socket instance
    socket = io(SOCKET_URL, SOCKET_OPTIONS)

    // Set up persistent event listeners
    setupSocketListeners(socket)
  }

  return socket
}

// Set up socket event listeners
const setupSocketListeners = (socket) => {
  // Connection events
  socket.on("connect", () => {
    console.log("✅ Socket.IO connected successfully:", socket.id)
    console.log("Transport:", socket.io.engine.transport.name)

    // Send connection confirmation
    socket.emit("client-connected", {
      timestamp: new Date().toISOString(),
      clientId: socket.id,
      page: "vehicle-management",
    })

    // Join rooms
    socket.emit("join-room", "vehicles")
    socket.emit("join-room", "drivers")
    socket.emit("join-room", "dashboard")

    // Request latest data
    socket.emit("refresh-data", {
      models: ["vehicles", "drivers", "rides", "admins"],
    })
  })

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket.IO disconnected:", reason)

    // Handle different disconnect reasons
    if (reason === "io server disconnect") {
      // Server disconnected us, try to reconnect manually
      setTimeout(() => {
        console.log("🔄 Server disconnected client, attempting manual reconnection...")
        socket.connect()
      }, 1000)
    }
  })

  socket.on("connect_error", (error) => {
    console.error("🔴 Socket.IO connection error:", error.message)
  })

  socket.on("reconnect", (attemptNumber) => {
    console.log(`🔄 Socket.IO reconnected after ${attemptNumber} attempts`)

    // Re-join rooms after reconnection
    socket.emit("join-room", "vehicles")
    socket.emit("join-room", "drivers")
    socket.emit("join-room", "dashboard")

    // Request latest data
    socket.emit("refresh-data", {
      models: ["vehicles", "drivers", "rides", "admins"],
    })
  })

  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log(`🔄 Socket.IO reconnection attempt #${attemptNumber}`)
  })

  socket.on("reconnect_error", (error) => {
    console.error("🔴 Socket.IO reconnection error:", error)
  })

  socket.on("reconnect_failed", () => {
    console.error("🔴 Socket.IO reconnection failed after all attempts")
  })

  // Server heartbeat
  socket.on("server-heartbeat", (data) => {
    console.log("💓 Server heartbeat received:", data)
  })

  // Listen for data updates
  socket.on("vehiclesUpdate", (data) => {
    console.log(`📊 Received vehicles update with ${data.data?.length || 0} vehicles`)
  })

  socket.on("driversUpdate", (data) => {
    console.log(`📊 Received drivers update with ${data.data?.length || 0} drivers`)
  })

  socket.on("dashboardStats", (data) => {
    console.log(`📊 Received dashboard stats update`)
  })

  // Listen for direct MongoDB changes
  socket.on("directDbChange", (data) => {
    console.log(`🔔 Direct MongoDB change detected: ${data.collection} ${data.operation}`, data)

    // Request immediate refresh of the affected collection
    socket.emit("refresh-data", { models: [data.collection] })
  })
}

// Start heartbeat interval
let heartbeatInterval = null

const startHeartbeat = () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval)

  heartbeatInterval = setInterval(() => {
    if (socket && socket.connected) {
      socket.emit("client-heartbeat", {
        timestamp: new Date().toISOString(),
        clientId: socket.id,
      })
    }
  }, 30000) // 30 seconds
}

// Initialize socket and heartbeat
const initializeSocket = () => {
  const socket = getSocket()
  startHeartbeat()
  return socket
}

// Create and initialize socket
const socketInstance = initializeSocket()

// Helper functions
socketInstance.isConnected = () => socketInstance.connected
socketInstance.forceReconnect = () => {
  console.log("🔄 Forcing socket reconnection...")
  socketInstance.disconnect()
  setTimeout(() => socketInstance.connect(), 1000)
}

// Manual refresh function
socketInstance.refreshData = (models = ["vehicles", "drivers", "rides", "admins"]) => {
  if (socketInstance.connected) {
    console.log("🔄 Manually refreshing data:", models)
    socketInstance.emit("refresh-data", { models })
    return true
  }
  return false
}

// Add a function to the socketInstance to force refresh on demand
socketInstance.forceRefresh = () => {
  if (socketInstance.connected) {
    console.log("🔄 Forcing immediate data refresh")
    socketInstance.emit("refresh-data", { models: ["vehicles", "drivers", "rides", "admins"] })
    return true
  }
  return false
}

// Add a function to check database changes manually
socketInstance.checkForChanges = () => {
  if (socketInstance.connected) {
    console.log("🔍 Manually checking for database changes")
    socketInstance.emit("check-for-changes")
    return true
  }
  return false
}

// Export the singleton instance
export default socketInstance
