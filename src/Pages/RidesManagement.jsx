import { useState, useEffect, useRef, useCallback } from "react"
import { useTheme } from "../context/ThemeContext"
import ChatModal from "../Components/ChatModal"
import axios from "axios";
import socket from "../utils/socket";
import useRideWebSocket from "../useRideWebSocket/useRideWebSocket";
// import socket from "./utils/socket";
// import useRideWebSocket from "../Pages/useRi




// Mock API functions
const api = {
  getRides: async (status) => {
    const res = await axios.get("https://panalsbackend-production.up.railway.app/api/rides", {
      params: status ? { status } : {},
    });
    return res.data;
  },

  postRide: async (rideData) => {
    const res = await axios.post("https://panalsbackend-production.up.railway.app/api/rides", rideData);
    return res.data;
  },

  // ✅ Add this function for status update
  updateRideStatus: async (rideId, status) => {
  const res = await axios.put(`https://panalsbackend-production.up.railway.app/api/rides/${rideId}/status`, { status });
  return res.data;
},

  // ✅ Add this if you're calling getRideLogs (optional, based on your UI)
  getRideLogs: async (rideId) => {
    const res = await axios.get(`https://panalsbackend-production.up.railway.app/api/rides/${rideId}/logs`);
    return res.data;
  },
};


const cannedMessages = [
  "Please reach pickup location soon",
  "What's the delay reason?",
  "Rider is waiting at pickup",
  "Please contact rider",
  "Route update available",
  "Thank you for the update",
]

// Simple Toast Hook
const useToast = () => {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback(({ title, description, variant = "default" }) => {
    const id = Date.now()
    const newToast = { id, title, description, variant }
    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const ToastContainer = () => (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`min-w-[300px] rounded-lg border p-3 shadow-lg transition-all duration-300 ${toast.variant === "destructive"
            ? "border-red-500 bg-red-100 dark:bg-red-900/90 text-red-800 dark:text-red-100"
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/90 text-gray-800 dark:text-gray-100"
            }`}
          style={{
            animation: "slideInFromRight 0.3s ease-out",
          }}
        >
          <div className="font-semibold">{toast.title}</div>
          <div className="text-sm opacity-90">{toast.description}</div>
        </div>
      ))}
      <style>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )

  return { showToast, ToastContainer }
}

// Filter Bar Component
const FilterBar = ({ searchTerm, onSearchChange, statusFilter, onStatusChange, onRefresh, refreshing }) => {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by Ride ID, Rider, Driver or Location"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full md:w-80 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-10 pr-4 py-2 text-sm text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors duration-300"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors duration-300"
          >
            <option value="all">All</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className={`rounded-lg border border-gray-300 dark:border-gray-600 p-2 text-gray-600 dark:text-gray-400 transition-all hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white disabled:opacity-50 ${refreshing ? "animate-spin" : ""
          }`}
      >
        🔄
      </button>
    </div>
  )
}

// Ride Card Component
const RideCard = ({ ride, onTrack, onChat, getStatusBadge }) => {
  return (
    <div key={ride._id} className="cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 transition-all hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">#{ride.driverId}</h3>
        {getStatusBadge(ride.status)}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="text-base">👤</span>
            <span>{ride.riderName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="text-base">🚗</span>
            <span>{ride.driverName}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="text-base text-emerald-400 mt-0.5">📍</span>
            <span>{ride.pickup}</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="text-base text-red-400 mt-0.5">🎯</span>
            <span>{ride.drop}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 dark:border-gray-700 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="text-base">🕒</span>
            <span>
              {ride.date} • {ride.time}
            </span>
          </div>
          <div className="flex gap-2">
            {ride.status === "ongoing" && (
              <button
                className="flex-1 md:flex-none rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                onClick={() => onTrack(ride)}
              >
                Track
              </button>
            )}
            <button
              className="flex-1 md:flex-none rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => onChat(ride)}
            >
              💬 Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading State Component
const LoadingState = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-6 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 w-3/5 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// No Results Component
const NoResults = ({ searchTerm, onReset }) => {
  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-16 px-8 text-center">
      <div className="mb-4 text-6xl opacity-50">🔍</div>
      <h3 className="mb-2 text-xl font-bold text-gray-800 dark:text-white">No rides found</h3>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        {searchTerm
          ? "Try adjusting your search or filter criteria"
          : "There are no rides matching the selected status"}
      </p>
      <button
        onClick={onReset}
        className="rounded-lg border border-gray-300 dark:border-gray-600 px-6 py-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        Reset Filters
      </button>
    </div>
  )
}

// Tracking Modal Component
const TrackingModal = ({ isOpen, onClose, ride, activeTab, onTabChange, getStatusBadge, onStatusChange }) => {
  if (!isOpen || !ride) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-h-[90vh] max-w-2xl overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">#{ride.id}</h2>
          <button
            className="text-xl text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {getStatusBadge(ride.status)}

            {ride.status === "ongoing" && (
              <div className="flex gap-3">
                <button
                  className="flex-1 md:flex-none rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                  onClick={() => onStatusChange(ride.id, "completed")}
                >
                  Complete
                </button>
                <button
                  className="flex-1 md:flex-none rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  onClick={() => onStatusChange(ride.id, "cancelled")}
                >
                  Cancel
                </button>
              </div>
            )}

          </div>

          <div className="w-full">
            <div className="mb-6 flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
              <button
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === "details"
                  ? "bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                  }`}
                onClick={() => onTabChange("details")}
              >
                Details
              </button>
              <button
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === "logs"
                  ? "bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                  }`}
                onClick={() => onTabChange("logs")}
              >
                Trip Logs
              </button>
              {ride.status === "ongoing" && (
                <button
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === "tracking"
                    ? "bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                    }`}
                  onClick={() => onTabChange("tracking")}
                >
                  Live Tracking
                </button>
              )}
            </div>

            <div className="min-h-[300px]">
              {activeTab === "details" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Rider</label>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                          {ride.riderName.charAt(0)}
                        </div>
                        <span className="text-gray-800 dark:text-white">{ride.riderName}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Driver</label>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                          {ride.driverName.charAt(0)}
                        </div>
                        <span className="text-gray-800 dark:text-white">{ride.driverName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Pickup Location
                    </label>
                    <div className="flex items-start gap-3">
                      <span className="text-lg text-emerald-400 mt-0.5">📍</span>
                      <span className="text-gray-800 dark:text-white">{ride.pickup}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Drop Location
                    </label>
                    <div className="flex items-start gap-3">
                      <span className="text-lg text-red-400 mt-0.5">🎯</span>
                      <span className="text-gray-800 dark:text-white">{ride.drop}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Price</label>
                      <span className="text-lg font-semibold text-emerald-400">{ride.price}</span>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Distance</label>
                      <span className="text-gray-800 dark:text-white">{ride.distance}</span>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Duration</label>
                      <span className="text-gray-800 dark:text-white">{ride.duration}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Time</label>
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                      <span className="text-lg">📅</span>
                      <span>
                        {ride.date} • {ride.time}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "logs" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Trip Activity Log</h3>
                  <div className="space-y-4">
                    {ride.logs?.map((log) => (
                      <div
                        key={log.id}
                        className={`flex gap-4 rounded-lg border-l-4 p-4 ${log.type === "success"
                          ? "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                          : log.type === "error"
                            ? "border-l-red-500 bg-red-50 dark:bg-red-900/20"
                            : log.type === "warning"
                              ? "border-l-amber-500 bg-amber-50 dark:bg-amber-900/20"
                              : "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          }`}
                      >
                        <div className="text-lg mt-0.5">
                          {log.type === "success"
                            ? "✅"
                            : log.type === "error"
                              ? "❌"
                              : log.type === "warning"
                                ? "⚠"
                                : "ℹ"}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-800 dark:text-white">{log.message}</p>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{log.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "tracking" && ride.status === "ongoing" && (
                <div className="space-y-6">
                  <div className="relative flex h-64 flex-col items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 p-6 text-center">
                    <div className="mb-4 text-6xl text-emerald-400" style={{ animation: "bounce 2s infinite" }}>
                      🗺
                    </div>
                    <p className="text-gray-800 dark:text-white font-medium">Live Location</p>
                    {ride.currentLocation ? (
                      <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-gray-200/95 dark:bg-gray-800/95 p-4 text-left">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{ride.currentLocation.address}</p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Updated at {ride.currentLocation.updatedAt}
                        </span>
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400">Waiting for location update...</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-4 text-center">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Estimated Time</label>
                      <span className="text-lg font-semibold text-gray-800 dark:text-white">
                        {ride.duration} remaining
                      </span>
                    </div>
                    <div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-4 text-center">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Distance</label>
                      <span className="text-lg font-semibold text-gray-800 dark:text-white">{ride.distance}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row">
                    <button className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700">
                      Refresh Location
                    </button>
                   {/* <button
  onClick={() => onStatusChange(ride._id, "completed")}
  className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-white"
>
  Completed
</button> */}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const createWebSocket = (onMessage) => {
  // const socket = new WebSocket("ws://localhost:5000"); // Replace with your server's WebSocket URL

  socket.onopen = () => console.log("WebSocket connected");

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error("Invalid WebSocket message format:", error);
    }
  };

  socket.onclose = () => console.log("WebSocket disconnected");
  socket.onerror = (error) => console.error("WebSocket error:", error);

  return socket;
};


export default function RidesManagement() {
  const { isDarkMode } = useTheme()
  const [rides, setRides] = useState([])
  const [filteredRides, setFilteredRides] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedRide, setSelectedRide] = useState(null)
  const [isTrackingOpen, setIsTrackingOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const webSocketRef = useRef(null);
  const [chatMessages, setChatMessages] = useState({}); 
  const { showToast, ToastContainer } = useToast()


 // ✅ Real-time listener
 useEffect(() => {
  if (!socket) return;

  const handleRideStatusUpdate = ({ rideId, status }) => {
    setRides((prevRides) => {
      const updated = Array.isArray(prevRides)
        ? prevRides.map((ride) =>
            ride._id === rideId ? { ...ride, status } : ride
          )
        : [];

      // Also update the filteredRides state
      setFilteredRides(
        statusFilter === "all"
          ? updated
          : updated.filter((ride) => ride.status === statusFilter)
      );

      return updated;
    });
  };

  socket.on("rideStatusUpdate", handleRideStatusUpdate);

  return () => {
    socket.off("rideStatusUpdate", handleRideStatusUpdate);
  };
}, [socket, statusFilter]);



  const handleStatusUpdate = (data) => { 
    setRides((prev) =>
      prev.map((ride) =>
        ride.rideCode === data.rideCode ? { ...ride, status: data.status } : ride
      )
    );

    setSelectedRide((prev) =>
      prev?.rideCode === data.rideCode ? { ...prev, status: data.status } : prev
    );

    showToast({
      title: "Status Updated",
      description: `Ride ${data.rideCode} status changed to ${data.status}`,
      variant: "default",
    });
  };


  useRideWebSocket(setRides, setChatMessages, handleStatusUpdate);




  const onStatusChange = async (rideId, newStatus) => {
  try {
    await api.updateRideStatus(rideId, newStatus); //  Backend update

    //  Update UI state
    setRides((prevRides) =>
      prevRides.map((ride) =>
        ride._id === rideId ? { ...ride, status: newStatus } : ride
      )
    );

    setSelectedRide((prev) =>
      prev && prev._id === rideId ? { ...prev, status: newStatus } : prev
    );
  } catch (error) {
    console.error("Failed to update ride status:", error);
  }
};


  // Fetch rides on initial load and when status filter changes
  useEffect(() => {
    const fetchRides = async () => {
      setLoading(true)
      try {
        const data = await api.getRides(statusFilter !== "all" ? statusFilter : undefined)
        setRides(data)
        setFilteredRides(data)
      } catch (error) {
        console.error("Error fetching rides:", error)
        showToast({
          title: "Error fetching rides",
          description: "Could not load ride data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchRides()
  }, [statusFilter, showToast])

  // Setup WebSocket for real-time updates
 useEffect(() => {
  const handleWebSocketMessage = (data) => {
    if (data.type === "location_update") {
      setRides((prevRides) =>
        prevRides.map((ride) =>
          ride.rideCode === data.rideCode
            ? {
                ...ride,
                currentLocation: {
                  lat: data.lat,
                  lng: data.lng,
                  address: data.address,
                  updatedAt: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              }
            : ride
        )
      )

      if (selectedRide?.rideCode === data.rideCode) {
        setSelectedRide((prev) =>
          prev
            ? {
                ...prev,
                currentLocation: {
                  lat: data.lat,
                  lng: data.lng,
                  address: data.address,
                  updatedAt: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              }
            : null
        )
      }

      showToast({
        title: "Location Updated",
        description: `Ride ${data.rideCode} location has been updated.`,
      })
    } 
    
    else if (data.type === "status_update") {
      setRides((prevRides) =>
        prevRides.map((ride) =>
          ride.rideCode === data.rideCode ? { ...ride, status: data.status } : ride
        )
      )

      setSelectedRide((prev) =>
        prev?.rideCode === data.rideCode ? { ...prev, status: data.status } : prev
      )

      showToast({
        title: "Status Updated",
        description: `Ride ${data.rideCode} status changed to ${data.status}.`,
        variant: "default",
      })
    } 
    
    else if (data.type === "new_ride") {
      showToast({
        title: "New Ride",
        description: `New ride request from ${data.riderName}.`,
        variant: "default",
      })
    } 
    
    else if (data.type === "ride_cancelled") {
      showToast({
        title: "Ride Cancelled",
        description: `Ride ${data.rideCode} has been cancelled.`,
        variant: "destructive",
      })
    }
  }


  webSocketRef.current = createWebSocket(handleWebSocketMessage)


  return () => {
    if (webSocketRef.current) {
      webSocketRef.current.close()
    } 
  }
}, [selectedRide, showToast])

  // Filter rides based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredRides(rides)
      return
    }

    const filtered = rides.filter(
      (ride) =>
        ride.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.riderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.pickup.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.drop.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    setFilteredRides(filtered)
  }, [rides, searchTerm])

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: {
        className:
          "inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30",
        text: "✓ Completed",
      },
      ongoing: {
        className:
          "inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30",
        text: "● Ongoing",
        pulse: true,
      },
      cancelled: {
        className:
          "inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/50 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30",
        text: "✕ Cancelled",
      },
    }

    const config = statusConfig[status] || {
      className:
        "inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300",
      text: status,
    }

    return <span className={`${config.className} ${config.pulse ? "animate-pulse" : ""}`}>{config.text}</span>
  }

  const handleTrackRide = async (ride) => {
    setSelectedRide(ride)
    setIsTrackingOpen(true)
    setActiveTab("details")

    // Fetch the latest logs when tracking a ride
    try {
      const logs = await api.getRideLogs(ride.id)
      setSelectedRide((prev) => (prev ? { ...prev, logs } : null))
    } catch (error) {
      console.error("Error fetching ride logs:", error)
    }
  }

  const handleChatRide = (ride) => {
    setSelectedRide(ride)
    setIsChatOpen(true)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const data = await api.getRides(statusFilter !== "all" ? statusFilter : undefined)
      setRides(data)
      setFilteredRides(
        searchTerm
          ? data.filter(
            (ride) =>
              ride.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
              ride.riderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              ride.driverName.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          : data,
      )

      showToast({
        title: "Data Refreshed",
        description: "Ride data has been updated.",
      })
    } catch (error) {
      console.error("Error refreshing rides:", error)
      showToast({ 
        title: "Refresh Failed",
        description: "Could not refresh ride data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

const handleStatusChange = async (rideId, newStatus) => {
  try {
    const response = await axios.put(`https://panalsbackend-production.up.railway.app/api/rides/${rideId}/status`, {
      status: newStatus,
    });

    const updatedRide = response.data;

    // Emit real-time update (if needed)
    socket.emit("rideStatusUpdate", {
      rideId: updatedRide._id,
      status: updatedRide.status,
    });

    // Update local rides state
    const updatedRides = rides.map((ride) =>
      ride._id === updatedRide._id ? { ...ride, status: updatedRide.status } : ride
    );
    setRides(updatedRides);

    // Set filter to 'all'
    setStatusFilter("all");

    // Update filtered rides immediately so UI refreshes without reload
    setFilteredRides(updatedRides);

    // Optional: close any modal
    setSelectedRide(null);
  } catch (error) {
    console.error("Error updating ride status:", error);
    alert("Failed to update ride status");
  }
};




  const sendChatMessage = () => {
    if (!chatMessage.trim() || !selectedRide) return

    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: "admin",
      message: chatMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false,
    }

    // Update both rides state and selectedRide state
    setRides((prevRides) =>
      prevRides.map((ride) =>
        ride.id === selectedRide.id ? { ...ride, chatMessages: [...(ride.chatMessages || []), newMessage] } : ride,
      ),
    )

    setSelectedRide((prev) => (prev ? { ...prev, chatMessages: [...(prev.chatMessages || []), newMessage] } : null))

    setChatMessage("")

    // Simulate driver/rider response after 2-5 seconds
    setTimeout(
      () => {
        const responses = [
          "Got it, thanks!",
          "Will update soon",
          "On my way",
          "Traffic is heavy",
          "Almost there",
          "Understood",
        ]

        const response = {
          id: `msg-${Date.now()}-response`,
          sender: Math.random() > 0.5 ? "driver" : "rider",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          read: false,
          message: responses[Math.floor(Math.random() * responses.length)],
        }

        // Update both rides state and selectedRide state
        setRides((prevRides) =>
          prevRides.map((ride) =>
            ride.id === selectedRide.id ? { ...ride, chatMessages: [...(ride.chatMessages || []), response] } : ride,
          ),
        )

        setSelectedRide((prev) => (prev ? { ...prev, chatMessages: [...(prev.chatMessages || []), response] } : null))
      },
      Math.random() * 3000 + 2000,
    )
  }

  const handleResetFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white transition-colors duration-300">
      <ToastContainer />

      {/* Page Content */}
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="mb-6 text-3xl font-bold text-gray-800 dark:text-white">Rides Management</h1>

          {/* Filters and Search */}
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        </div>

        {/* Loading State */}
        {loading && <LoadingState />}

        {/* No Results */}
        {!loading && filteredRides.length === 0 && <NoResults searchTerm={searchTerm} onReset={handleResetFilters} />}

        {/* Rides Grid */}
        {!loading && filteredRides.length > 0 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {filteredRides.map((ride) => (
              <RideCard
                 key={ride._id}
                ride={ride}
                onTrack={handleTrackRide}
                onChat={handleChatRide}
                getStatusBadge={getStatusBadge}
                 onStatusChange={handleStatusChange} // ✅ add this
              />
            ))}
          </div>
        )}

        {/* Tracking Modal */}
        <TrackingModal
          isOpen={isTrackingOpen}
          onClose={() => setIsTrackingOpen(false)}
          ride={selectedRide}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          getStatusBadge={getStatusBadge}
          onStatusChange={handleStatusChange}
        />

        {/* Chat Modal */}
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          ride={selectedRide}
          getStatusBadge={getStatusBadge}
          chatMessage={chatMessage}
          onChatMessageChange={setChatMessage}
          onSendMessage={sendChatMessage}
          cannedMessages={cannedMessages}
        />
      </div>
    </div>
  )
}








