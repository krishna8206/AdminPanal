"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ShieldIcon as UserShield,
  Edit,
  Trash2,
  Plus,
  Search,
  Lock,
  Unlock,
  UserCog,
  DollarSign,
  Headphones,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react"
import { useAdminSocket } from "../hooks/useSocket"

// Keep all the existing component code but replace the socket initialization with the unified hook
// ... (rest of the component remains exactly the same as provided)

const SkeletonLoader = () => {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="h-8 w-48 bg-gray-300 dark:bg-gray-700 rounded mb-4 md:mb-0"></div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-grow h-10 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-10 w-32 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-1"></div>
          <div className="h-10 w-full bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-1"></div>
          <div className="h-10 w-full bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {[...Array(6)].map((_, i) => (
                  <th key={i} className="px-6 py-3">
                    <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded mx-auto"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {[...Array(5)].map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {[...Array(6)].map((_, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4">
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Role definitions
const roles = [
  { value: "super_admin", label: "Super Admin", icon: <Users className="text-purple-500" /> },
  { value: "finance", label: "Finance", icon: <DollarSign className="text-green-500" /> },
  { value: "support", label: "Support", icon: <Headphones className="text-blue-500" /> },
]

// Permission categories
const permissionCategories = [
  { name: "users", label: "User Management" },
  { name: "vehicles", label: "Vehicle Management" },
  { name: "bookings", label: "Booking Management" },
  { name: "payments", label: "Payment Management" },
  { name: "settings", label: "System Settings" },
]

// API base URL
const API_BASE_URL = "http://localhost:8989/api"

export default function AdminManagement() {
  const [admins, setAdmins] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentAdmin, setCurrentAdmin] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "support",
    status: "active",
    permissions: {
      users: { read: false, write: false, delete: false },
      vehicles: { read: false, write: false, delete: false },
      bookings: { read: false, write: false, delete: false },
      payments: { read: false, write: false, delete: false },
      settings: { read: false, write: false, delete: false },
    },
  })
  const [successMessage, setSuccessMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [realtimeMessage, setRealtimeMessage] = useState("")

  // 🔥 UNIFIED SOCKET CONNECTION
  const handleAdminEvent = useCallback((eventType, data) => {
    console.log(`🔥 Real-time event: ${eventType}`, data)

    // Show real-time notification
    setRealtimeMessage(data.message)
    setTimeout(() => setRealtimeMessage(""), 4000)

    switch (eventType) {
      case "created":
        setAdmins((prev) => {
          // Check if admin already exists to prevent duplicates
          const exists = prev.some((admin) => admin.id === data.admin.id)
          if (exists) return prev
          return [...prev, data.admin]
        })
        break

      case "updated":
        setAdmins((prev) => prev.map((admin) => (admin.id === data.admin.id ? { ...admin, ...data.admin } : admin)))
        break

      case "deleted":
        setAdmins((prev) => prev.filter((admin) => admin.id !== data.admin.id))
        break

      case "status-changed":
        setAdmins((prev) =>
          prev.map((admin) => (admin.id === data.admin.id ? { ...admin, status: data.newStatus } : admin)),
        )
        break

      default:
        console.log("Unknown event type:", eventType)
    }
  }, [])

  const { isConnected, connectionError } = useAdminSocket(handleAdminEvent)

  // API helper function
  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || "API request failed")
      }

      return data
    } catch (error) {
      console.error("API Error:", error)
      throw error
    }
  }

  // Fetch all admins from backend
  const fetchAdmins = async () => {
    try {
      setIsLoading(true)
      const data = await apiCall("/admins")
      setAdmins(data.admins || data || [])
    } catch (error) {
      setError("Failed to fetch admins: " + error.message)
      setAdmins([])
    } finally {
      setIsLoading(false)
    }
  }

  // Filter admins based on search, role, and status
  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === "all" || admin.role === filterRole
    const matchesStatus = filterStatus === "all" || admin.status === filterStatus
    return matchesSearch && matchesRole && matchesStatus
  })

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle permission changes
  const handlePermissionChange = (category, permission, value) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [category]: {
          ...prev.permissions[category],
          [permission]: value,
        },
      },
    }))
  }

  // Add new admin
  const handleAddAdmin = async () => {
    try {
      setIsSubmitting(true)
      setError("")

      if (!formData.name || !formData.email || !formData.password) {
        throw new Error("Please fill in all required fields")
      }

      const adminData = {
        username: formData.name,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        status: formData.status,
        permissions: formData.permissions,
      }

      await apiCall("/admins", {
        method: "POST",
        body: JSON.stringify(adminData),
      })

      // Don't update local state here - let Socket.io handle it
      setShowAddModal(false)
      resetForm()
      setSuccessMessage("Admin created successfully!")

      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (error) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Edit admin
  const handleEditAdmin = async () => {
    try {
      setIsSubmitting(true)
      setError("")

      const adminData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        permissions: formData.permissions,
      }

      if (formData.password) {
        adminData.password = formData.password
      }

      await apiCall(`/admins/${currentAdmin.id}`, {
        method: "PUT",
        body: JSON.stringify(adminData),
      })

      // Don't update local state here - let Socket.io handle it
      setShowEditModal(false)
      resetForm()
      setSuccessMessage("Admin updated successfully!")

      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (error) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete admin
  const handleDeleteAdmin = async (id) => {
    if (!window.confirm("Are you sure you want to delete this admin?")) {
      return
    }

    try {
      await apiCall(`/admins/${id}`, {
        method: "DELETE",
      })

      // Don't update local state here - let Socket.io handle it
      setSuccessMessage("Admin deleted successfully!")

      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (error) {
      setError("Failed to delete admin: " + error.message)
    }
  }

  // Toggle admin status
  const toggleAdminStatus = async (id) => {
    try {
      const admin = admins.find((a) => a.id === id)
      const newStatus = admin.status === "active" ? "inactive" : "active"

      await apiCall(`/admins/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })

      // Don't update local state here - let Socket.io handle it
      setSuccessMessage(`Admin ${newStatus === "active" ? "activated" : "deactivated"} successfully!`)

      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (error) {
      setError("Failed to update admin status: " + error.message)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "support",
      status: "active",
      permissions: {
        users: { read: false, write: false, delete: false },
        vehicles: { read: false, write: false, delete: false },
        bookings: { read: false, write: false, delete: false },
        payments: { read: false, write: false, delete: false },
        settings: { read: false, write: false, delete: false },
      },
    })
    setCurrentAdmin(null)
    setError("")
  }

  // Load admin data for editing
  const loadAdminForEdit = (admin) => {
    setCurrentAdmin(admin)
    setFormData({
      name: admin.name,
      email: admin.email,
      password: "",
      role: admin.role,
      status: admin.status,
      permissions: admin.permissions
        ? JSON.parse(JSON.stringify(admin.permissions))
        : {
            users: { read: false, write: false, delete: false },
            vehicles: { read: false, write: false, delete: false },
            bookings: { read: false, write: false, delete: false },
            payments: { read: false, write: false, delete: false },
            settings: { read: false, write: false, delete: false },
          },
    })
    setShowEditModal(true)
  }

  // Set default permissions based on role
  useEffect(() => {
    if (formData.role === "super_admin") {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          users: { read: true, write: true, delete: true },
          vehicles: { read: true, write: true, delete: true },
          bookings: { read: true, write: true, delete: true },
          payments: { read: true, write: true, delete: true },
          settings: { read: true, write: true, delete: true },
        },
      }))
    } else if (formData.role === "finance") {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          users: { read: true, write: false, delete: false },
          vehicles: { read: true, write: false, delete: false },
          bookings: { read: true, write: false, delete: false },
          payments: { read: true, write: true, delete: false },
          settings: { read: false, write: false, delete: false },
        },
      }))
    } else if (formData.role === "support") {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          users: { read: true, write: true, delete: false },
          vehicles: { read: true, write: true, delete: false },
          bookings: { read: true, write: true, delete: false },
          payments: { read: false, write: false, delete: false },
          settings: { read: false, write: false, delete: false },
        },
      }))
    }
  }, [formData.role])

  // Fetch admins on component mount
  useEffect(() => {
    fetchAdmins()
  }, [])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("")
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-100 dark:bg-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <SkeletonLoader />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Connection Status */}
        <div className="mb-4 flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">Real-time updates active</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">
                {connectionError ? `Connection error: ${connectionError}` : "Connecting..."}
              </span>
            </div>
          )}
        </div>

        {/* Real-time Message */}
        {realtimeMessage && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-200 px-4 py-3 rounded flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            {realtimeMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <UserShield className="text-blue-500" />
            Admin Management
            {isConnected && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2"></div>}
          </h1>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search admins..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-800 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
            </div>
            {/* <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add Admin
            </button> */}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Role</label>
            <select
              className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-800 dark:text-white"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Status</label>
            <select
              className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-800 dark:text-white"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Admins Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Login
                  </th>
                  {/* <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th> */}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAdmins.length > 0 ? (
                  filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <UserCog className="text-blue-500 w-5 h-5" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{admin.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{admin.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {roles.find((r) => r.value === admin.role)?.icon}
                          <span className="text-sm text-gray-900 dark:text-white">
                            {roles.find((r) => r.value === admin.role)?.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {admin.permissions
                            ? Object.keys(admin.permissions).filter((cat) =>
                                Object.values(admin.permissions[cat]).some((v) => v),
                              ).length
                            : 0}{" "}
                          categories
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            admin.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {admin.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : "Never"}
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => toggleAdminStatus(admin.id)}
                            className={`p-2 rounded-full ${admin.status === "active" ? "text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/20" : "text-green-500 hover:bg-green-100 dark:hover:bg-green-900/20"}`}
                            title={admin.status === "active" ? "Deactivate" : "Activate"}
                          >
                            {admin.status === "active" ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => loadAdminForEdit(admin)}
                            className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td> */}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No admins found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Admin Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Add New Admin
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-white"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                    <input
                      type="email"
                      name="email"
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-white"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-white"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                    <select
                      name="role"
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-white"
                      value={formData.role}
                      onChange={handleInputChange}
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    name="status"
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-white"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <h4 className="text-md font-semibold text-gray-800 dark:text-white mb-3">Permissions</h4>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {permissionCategories.map((category) => (
                      <div
                        key={category.name}
                        className="border rounded-lg p-3 bg-white dark:bg-gray-800 dark:border-gray-600"
                      >
                        <h5 className="font-medium text-gray-400 dark:text-white mb-2">{category.label}</h5>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={formData.permissions[category.name].read}
                              onChange={(e) => handlePermissionChange(category.name, "read", e.target.checked)}
                              className="rounded text-blue-500"
                            />
                            Read Access
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={formData.permissions[category.name].write}
                              onChange={(e) => handlePermissionChange(category.name, "write", e.target.checked)}
                              className="rounded text-blue-500"
                              disabled={!formData.permissions[category.name].read}
                            />
                            Write Access
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={formData.permissions[category.name].delete}
                              onChange={(e) => handlePermissionChange(category.name, "delete", e.target.checked)}
                              className="rounded text-blue-500"
                              disabled={!formData.permissions[category.name].write}
                            />
                            Delete Access
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      resetForm()
                    }}
                    className="px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddAdmin}
                    disabled={isSubmitting}
                    className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isSubmitting ? "Creating..." : "Add Admin"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Admin Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Edit className="w-5 h-5" /> Edit Admin: {currentAdmin?.name}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-white"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                    <input
                      type="email"
                      name="email"
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-white"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password (leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      name="password"
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-white"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                    <select
                      name="role"
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-white"
                      value={formData.role}
                      onChange={handleInputChange}
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    name="status"
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-white"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <h4 className="text-md font-semibold text-gray-800 dark:text-white mb-3">Permissions</h4>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {permissionCategories.map((category) => (
                      <div
                        key={category.name}
                        className="border rounded-lg p-3 bg-white dark:bg-gray-800 dark:border-gray-600"
                      >
                        <h5 className="font-medium text-gray-800 dark:text-white mb-2">{category.label}</h5>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={formData.permissions[category.name].read}
                              onChange={(e) => handlePermissionChange(category.name, "read", e.target.checked)}
                              className="rounded text-blue-500"
                            />
                            Read Access
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={formData.permissions[category.name].write}
                              onChange={(e) => handlePermissionChange(category.name, "write", e.target.checked)}
                              className="rounded text-blue-500"
                              disabled={!formData.permissions[category.name].read}
                            />
                            Write Access
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={formData.permissions[category.name].delete}
                              onChange={(e) => handlePermissionChange(category.name, "delete", e.target.checked)}
                              className="rounded text-blue-500"
                              disabled={!formData.permissions[category.name].write}
                            />
                            Delete Access
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      resetForm()
                    }}
                    className="px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditAdmin}
                    disabled={isSubmitting}
                    className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isSubmitting ? "Updating..." : "Update Admin"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
