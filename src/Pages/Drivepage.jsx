"use client"

import { useState, useEffect, useRef } from "react"
import {
  User,
  Shield,
  Users,
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  X,
  Camera,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Car,
  FileText,
  Star,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ImageIcon,
  UserPlus,
  UserMinus,
} from "lucide-react"
import axios from "axios"

// API Base URLs
const API_BASE_URL = "https://panalsbackend-production.up.railway.app/api/driver"
const ADMIN_API_URL = "https://panalsbackend-production.up.railway.app/api/admins"

export default function DriverManagementDashboard() {
  // Existing States
  const [activeTab, setActiveTab] = useState("drivers")
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState("")
  const [drivers, setDrivers] = useState([])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    vehicleType: "",
    licensePlate: "",
    driverType: "Primary",
    primaryDriver: "",
  })
  const [subDrivers, setSubDrivers] = useState([])
  const [errors, setErrors] = useState({})
  const [editDriver, setEditDriver] = useState(null)

  // Document upload states
  const [licensePhoto, setLicensePhoto] = useState(null)
  const [panCardPhoto, setPanCardPhoto] = useState(null)
  const [selfiePhoto, setSelfiePhoto] = useState(null)
  const [vehiclePhoto, setVehiclePhoto] = useState(null)
  const [numberplatePhoto, setNumberplatePhoto] = useState(null)

  // Sub-driver document states
  const [subDriverDocuments, setSubDriverDocuments] = useState({})

  const [searchTerm, setSearchTerm] = useState("")
  const [filterKycStatus, setFilterKycStatus] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "ascending" })
  const [filteredDrivers, setFilteredDrivers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({})
  const [selectedDriver, setSelectedDriver] = useState(null)

  // Camera States
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [selfieFor, setSelfieFor] = useState(null)
  const [currentSubDriverIndex, setCurrentSubDriverIndex] = useState(null)

  // Verification Result Pop-up States
  const [verificationResult, setVerificationResult] = useState(null)
  const [verificationMessage, setVerificationMessage] = useState("")

  // New States for Admin Verification Flow
  const [admins, setAdmins] = useState([])
  const [driverToVerify, setDriverToVerify] = useState(null)
  const [verifyingAdminId, setVerifyingAdminId] = useState("")
  const [adminVerificationFile, setAdminVerificationFile] = useState(null)

  // Enhanced UI states
  const [notification, setNotification] = useState({ show: false, type: "", message: "" })
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: "", message: "", onConfirm: null })

  // Fetch initial data
  useEffect(() => {
    fetchDrivers()
    fetchAdmins()
    fetchStats()
  }, [])

  const fetchDrivers = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}`)
      if (response.data && response.data.data) {
        setDrivers(response.data.data)
      } else {
        showNotification("error", "Invalid response format from server")
      }
    } catch (error) {
      showNotification("error", `Failed to fetch drivers: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stats`)
      if (response.data && response.data.data) {
        setStats(response.data.data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(ADMIN_API_URL)
      const verifiableAdmins = response.data.admins.filter((admin) => admin.faceToken)
      setAdmins(verifiableAdmins)
      if (verifiableAdmins.length > 0) {
        setVerifyingAdminId(verifiableAdmins[0].id)
      }
    } catch (error) {
      showNotification("error", "Failed to fetch admins")
    }
  }

  // Enhanced notification system
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => {
      setNotification({ show: false, type: "", message: "" })
    }, 4000)
  }

  // Enhanced confirmation dialog
  const showConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({ show: true, title, message, onConfirm })
  }

  const hideConfirmDialog = () => {
    setConfirmDialog({ show: false, title: "", message: "", onConfirm: null })
  }

  // Camera logic
  useEffect(() => {
    if (showCamera) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [showCamera])

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        showNotification("error", "Could not access camera")
        setShowCamera(false)
      }
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const handleCaptureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext("2d").drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
      canvas.toBlob((blob) => {
        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" })

        if (selfieFor === "onboard") {
          setSelfiePhoto(file)
        } else if (selfieFor === "verify-driver") {
          setEditDriver((prev) => ({ ...prev, verificationSelfie: file }))
        } else if (selfieFor === "verify-admin") {
          setAdminVerificationFile(file)
        } else if (selfieFor === "sub-driver-selfie" && currentSubDriverIndex !== null) {
          const newSubDrivers = [...subDrivers]
          newSubDrivers[currentSubDriverIndex].selfie = file
          setSubDrivers(newSubDrivers)
        }

        setShowCamera(false)
        setCurrentSubDriverIndex(null)
      }, "image/jpeg")
    }
  }

  // Filter and Sort Logic
  useEffect(() => {
    let result = [...drivers]
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (driver) =>
          driver.name?.toLowerCase().includes(term) ||
          driver.email?.toLowerCase().includes(term) ||
          driver.phone?.includes(term) ||
          driver.vehicleType?.toLowerCase().includes(term) ||
          driver.licensePlate?.toLowerCase().includes(term) ||
          driver.driverType?.toLowerCase().includes(term),
      )
    }
    if (filterKycStatus !== "all") {
      result = result.filter((driver) => driver.kycStatus?.toLowerCase() === filterKycStatus.toLowerCase())
    }
    if (filterStatus !== "all") {
      result = result.filter((driver) => driver.status?.toLowerCase() === filterStatus.toLowerCase())
    }
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? ""
        const bValue = b[sortConfig.key] ?? ""
        if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1
        return 0
      })
    }
    setFilteredDrivers(result)
  }, [drivers, searchTerm, filterKycStatus, filterStatus, sortConfig])

  const requestSort = (key) => {
    let direction = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === "ascending" ? (
      <ChevronUp className="w-4 h-4 inline" />
    ) : (
      <ChevronDown className="w-4 h-4 inline" />
    )
  }

  // Modal Management
  const openModal = (type, driver = null) => {
    setModalType(type)
    setShowModal(true)
    setVerificationResult(null)
    setVerificationMessage("")
    setErrors({})
    setLicensePhoto(null)
    setPanCardPhoto(null)
    setSelfiePhoto(null)
    setVehiclePhoto(null)
    setNumberplatePhoto(null)
    setSubDrivers([])
    setSubDriverDocuments({})

    if (driver && (type === "manage" || type === "verify-selfie" || type === "view")) {
      if (type === "view") {
        setSelectedDriver(driver)
      } else {
        setEditDriver({ ...driver, verificationSelfie: null })
      }
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        vehicleType: "",
        licensePlate: "",
        driverType: "Primary",
        primaryDriver: "",
      })
      setEditDriver(null)
      setSelectedDriver(null)
    }

    setDriverToVerify(null)
    setAdminVerificationFile(null)
    if (showCamera) {
      setShowCamera(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setModalType("")
    setErrors({})
    setLicensePhoto(null)
    setPanCardPhoto(null)
    setSelfiePhoto(null)
    setVehiclePhoto(null)
    setNumberplatePhoto(null)
    setSubDrivers([])
    setSubDriverDocuments({})
    setEditDriver(null)
    setSelectedDriver(null)
    setDriverToVerify(null)
    setAdminVerificationFile(null)
    if (showCamera) {
      setShowCamera(false)
    }
  }

  // Sub-driver management
  const handleAddSubDriver = () => {
    setSubDrivers([
      ...subDrivers,
      {
        name: "",
        email: "",
        phone: "",
        vehicleType: "",
        licensePlate: "",
        license: null,
        pan: null,
        selfie: null,
        vehicle: null,
        numberplate: null,
      },
    ])
  }

  const handleRemoveSubDriver = (index) => {
    const newSubDrivers = [...subDrivers]
    newSubDrivers.splice(index, 1)
    setSubDrivers(newSubDrivers)

    // Remove documents for this sub-driver
    const newDocuments = { ...subDriverDocuments }
    delete newDocuments[index]
    setSubDriverDocuments(newDocuments)
  }

  const handleSubDriverChange = (index, field, value) => {
    const newSubDrivers = [...subDrivers]
    newSubDrivers[index][field] = value
    setSubDrivers(newSubDrivers)
  }

  const handleSubDriverDocumentUpload = (index, documentType, file) => {
    const newSubDrivers = [...subDrivers]
    newSubDrivers[index][documentType] = file
    setSubDrivers(newSubDrivers)
  }

  // Verification Flow Handlers
  const handleStartDriverVerification = (driver) => {
    setDriverToVerify(driver)
    setModalType("admin-verify")
    setShowModal(true)
    setErrors({})
    setVerificationResult(null)
  }

  const handleAdminVerification = async () => {
    if (!verifyingAdminId) {
      setErrors({ adminVerify: "Please select an admin." })
      return
    }
    if (!adminVerificationFile) {
      setErrors({ adminVerify: "Please provide your selfie for verification." })
      return
    }

    setIsLoading(true)
    const formDataToSend = new FormData()
    formDataToSend.append("selfie", adminVerificationFile)

    try {
      await axios.post(`${ADMIN_API_URL}/${verifyingAdminId}/verify-selfie`, formDataToSend)

      showNotification("success", "Admin verified successfully. Please proceed with driver verification.")
      setModalType("verify-selfie")
      setEditDriver({ ...driverToVerify, verificationSelfie: null })
      setAdminVerificationFile(null)
      setErrors({})
    } catch (error) {
      setErrors({ adminVerify: error.response?.data?.message || "Admin verification failed." })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDriverVerification = async () => {
    if (!editDriver?.verificationSelfie) {
      setErrors({ verify: "Please provide the driver's selfie." })
      return
    }

    setIsLoading(true)
    const formDataToSend = new FormData()
    formDataToSend.append("selfie", editDriver.verificationSelfie)

    try {
      const response = await axios.post(`${API_BASE_URL}/verify-selfie/${editDriver._id}`, formDataToSend)
      if (response.data && response.data.success) {
        setDrivers(drivers.map((d) => (d._id === editDriver._id ? response.data.data : d)))
        setVerificationResult("success")
        setVerificationMessage(response.data.message || "Driver verification successful!")
        fetchStats()
        setTimeout(() => {
          setVerificationResult(null)
          closeModal()
        }, 3000)
      } else {
        setVerificationResult("failed")
        setVerificationMessage(response.data?.message || "Verification failed. Faces do not match.")
      }
    } catch (error) {
      setVerificationResult("failed")
      setVerificationMessage(error.response?.data?.message || "An error occurred during verification.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDriver = (driver) => {
    showConfirmDialog(
      "Delete Driver",
      `Are you sure you want to delete ${driver.name}? This action cannot be undone.`,
      async () => {
        try {
          await axios.delete(`${API_BASE_URL}/delete/${driver._id}`)
          setDrivers(drivers.filter((d) => d._id !== driver._id))
          showNotification("success", "Driver deleted successfully!")
          fetchStats()
          fetchDrivers()
        } catch (error) {
          showNotification("error", `Failed to delete driver: ${error.message}`)
        }
        hideConfirmDialog()
      },
    )
  }

  const validateForm = (data, driverType) => {
    const newErrors = {}
    if (!data.name?.trim()) newErrors.name = "Driver name is required."
    if (!data.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      newErrors.email = "Valid email is required."
    if (!data.phone?.trim()) newErrors.phone = "Phone is required."

    if (driverType === "Sub-driver" && !data.primaryDriver) {
      newErrors.primaryDriver = "Please select a primary driver."
    }
    return newErrors
  }

  const handleConfirm = async () => {
    const validationErrors = validateForm(formData, formData.driverType)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const formDataToSend = new FormData()
      Object.keys(formData).forEach((key) => formDataToSend.append(key, formData[key]))

      if (licensePhoto) formDataToSend.append("license", licensePhoto)
      if (panCardPhoto) formDataToSend.append("pan", panCardPhoto)
      if (selfiePhoto) formDataToSend.append("selfie", selfiePhoto)
      if (vehiclePhoto) formDataToSend.append("vehicle", vehiclePhoto)
      if (numberplatePhoto) formDataToSend.append("numberplate", numberplatePhoto)

      if (formData.driverType === "Primary" && subDrivers.length > 0) {
        formDataToSend.append("subDrivers", JSON.stringify(subDrivers))
      }

      const response = await axios.post(`${API_BASE_URL}/add`, formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      if (response.data && response.data.success) {
        showNotification("success", "Driver operation successful!")
        fetchDrivers()
        fetchStats()
        setTimeout(() => {
          closeModal()
        }, 1500)
      } else {
        setErrors({ form: "Invalid response from server" })
      }
    } catch (error) {
      setErrors({ form: error.response?.data?.message || "Failed to process driver" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editDriver) return
    const validationErrors = validateForm(editDriver, editDriver.driverType)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    try {
      const response = await axios.put(`${API_BASE_URL}/edit/${editDriver._id}`, editDriver)
      if (response.data && response.data.data) {
        showNotification("success", "Driver updated successfully!")
        fetchDrivers()
        setTimeout(() => {
          closeModal()
        }, 1500)
      } else {
        setErrors({ edit: "Invalid response from server" })
      }
    } catch (error) {
      setErrors({ edit: `Failed to update driver: ${error.response?.data?.message || error.message}` })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyKyc = async (driverId, action) => {
    const newStatus = action === "verify" ? "Verified" : "Rejected"
    try {
      await axios.put(`${API_BASE_URL}/edit/${driverId}`, { kycStatus: newStatus })
      fetchDrivers()
      showNotification("success", `KYC status updated to ${newStatus}`)
      fetchStats()
    } catch (error) {
      showNotification("error", "Failed to update KYC status")
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "verified":
        return "text-green-600 bg-green-100"
      case "pending":
        return "text-yellow-600 bg-yellow-100"
      case "rejected":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getDriverStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "text-green-600 bg-green-100"
      case "idle":
        return "text-blue-600 bg-blue-100"
      case "offline":
        return "text-gray-600 bg-gray-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  const getDriverAvatar = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff&size=40`
  }

  const primaryDrivers = drivers.filter((d) => d.driverType === "Primary")

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white">
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Driver Management Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Manage primary drivers, sub-drivers, and their vehicle information
          </p>
        </div>

        {/* Enhanced Notification System */}
        {notification.show && (
          <div
            className={`fixed top-6 right-6 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center text-white transform transition-all duration-300 ${
              notification.type === "success"
                ? "bg-gradient-to-r from-green-500 to-green-600"
                : notification.type === "error"
                  ? "bg-gradient-to-r from-red-500 to-red-600"
                  : "bg-gradient-to-r from-blue-500 to-blue-600"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-6 h-6 mr-3" />
            ) : notification.type === "error" ? (
              <XCircle className="w-6 h-6 mr-3" />
            ) : (
              <AlertCircle className="w-6 h-6 mr-3" />
            )}
            <span className="font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification({ show: false, type: "", message: "" })}
              className="ml-4 hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Enhanced Confirmation Dialog */}
        {confirmDialog.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-4">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{confirmDialog.title}</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={hideConfirmDialog}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verification Result Pop-up */}
        {verificationResult && (
          <div
            className={`fixed top-6 right-6 px-8 py-6 rounded-2xl shadow-2xl z-50 flex items-center text-white transform transition-all duration-500 ${
              verificationResult === "success"
                ? "bg-gradient-to-r from-green-500 to-green-600"
                : "bg-gradient-to-r from-red-500 to-red-600"
            }`}
          >
            {verificationResult === "success" ? (
              <CheckCircle2 className="w-8 h-8 mr-4" />
            ) : (
              <XCircle className="w-8 h-8 mr-4" />
            )}
            <div>
              <h4 className="font-bold text-lg">
                {verificationResult === "success" ? "Verification Successful!" : "Verification Failed"}
              </h4>
              <p className="text-sm opacity-90">{verificationMessage}</p>
            </div>
            <button onClick={() => setVerificationResult(null)} className="ml-6 hover:text-gray-200 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-800/20 dark:to-blue-900/20 backdrop-blur-sm rounded-2xl p-6 text-gray-800 dark:text-white shadow-xl border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-500 dark:text-blue-300 text-sm font-medium">Total Drivers</p>
                <p className="text-3xl font-bold">{stats.totalDrivers || 0}</p>
              </div>
              <Users className="w-12 h-12 text-blue-400 dark:text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 dark:from-green-800/20 dark:to-green-900/20 backdrop-blur-sm rounded-2xl p-6 text-gray-800 dark:text-white shadow-xl border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-500 dark:text-green-300 text-sm font-medium">Active Drivers</p>
                <p className="text-3xl font-bold">{stats.activeDrivers || 0}</p>
              </div>
              <Activity className="w-12 h-12 text-green-400 dark:text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 dark:from-purple-800/20 dark:to-purple-900/20 backdrop-blur-sm rounded-2xl p-6 text-gray-800 dark:text-white shadow-xl border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-500 dark:text-purple-300 text-sm font-medium">Verified KYC</p>
                <p className="text-3xl font-bold">{stats.verifiedDrivers || 0}</p>
              </div>
              <Shield className="w-12 h-12 text-purple-400 dark:text-purple-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-800/20 dark:to-orange-900/20 backdrop-blur-sm rounded-2xl p-6 text-gray-800 dark:text-white shadow-xl border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-500 dark:text-orange-300 text-sm font-medium">Average Rating</p>
                <p className="text-3xl font-bold">{stats.avgRating ? stats.avgRating.toFixed(1) : "0.0"}</p>
              </div>
              <Star className="w-12 h-12 text-orange-400 dark:text-orange-200" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {/* <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => openModal("onboard")}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-8 py-4 rounded-xl flex items-center font-semibold text-white shadow-lg transform hover:scale-105 transition-all duration-200"
            disabled={isLoading}
          >
            <Plus className="w-5 h-5 mr-3" />
            Onboard New Driver
          </button>
        </div> */}

        {/* Enhanced Filters & Search */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>
            <select
              value={filterKycStatus}
              onChange={(e) => setFilterKycStatus(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            >
              <option value="all">All KYC Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="idle">Idle</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>

        {/* Enhanced Drivers Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                <tr>
                  <th className="px-8 py-6 text-left font-semibold text-gray-700 dark:text-gray-200">
                    <button
                      onClick={() => requestSort("name")}
                      className="flex items-center hover:text-green-600 transition-colors"
                    >
                      Driver {getSortIcon("name")}
                    </button>
                  </th>
                  <th className="px-8 py-6 text-left font-semibold text-gray-700 dark:text-gray-200">Contact</th>
                  <th className="px-8 py-6 text-left font-semibold text-gray-700 dark:text-gray-200">Vehicle</th>
                  <th className="px-8 py-6 text-left font-semibold text-gray-700 dark:text-gray-200">Type</th>
                  <th className="px-8 py-6 text-left font-semibold text-gray-700 dark:text-gray-200">Status</th>
                  <th className="px-8 py-6 text-left font-semibold text-gray-700 dark:text-gray-200">KYC</th>
                  <th className="px-8 py-6 text-left font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                        <span className="ml-3 text-gray-500">Loading drivers...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredDrivers.length > 0 ? (
                  filteredDrivers.map((driver) => (
                    <tr
                      key={driver._id}
                      className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center">
                          <img
                            src={getDriverAvatar(driver.name) || "/placeholder.svg"}
                            alt={driver.name}
                            className="w-12 h-12 rounded-full mr-4 shadow-md"
                          />
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">{driver.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Joined {formatDate(driver.joinDate)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            {driver.email}
                          </div>
                          <div className="flex items-center text-sm">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {driver.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {driver.vehicleType && driver.licensePlate ? (
                          <div className="flex items-center">
                            <Car className="w-5 h-5 mr-2 text-gray-400" />
                            <div>
                              <div className="font-medium">{driver.vehicleType}</div>
                              <div className="text-sm text-gray-500">{driver.licensePlate}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${driver.driverType === "Primary" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                        >
                          {driver.driverType}
                        </span>
                        {driver.driverType === "Sub-driver" && driver.primaryDriver && (
                          <div className="text-xs text-gray-500 mt-1">→ {driver.primaryDriver.name}</div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getDriverStatusColor(driver.status)}`}
                        >
                          {driver.status || "Unknown"}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(driver.kycStatus)}`}
                          >
                            {driver.kycStatus}
                          </span>
                          {/* {driver.kycStatus === "Pending" && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleVerifyKyc(driver._id, "verify")}
                                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                                title="Approve KYC"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleVerifyKyc(driver._id, "reject")}
                                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                title="Reject KYC"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )} */}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openModal("view", driver)}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* <button
                            onClick={() => openModal("manage", driver)}
                            className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded-lg transition-colors"
                            title="Edit Driver"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {driver.faceToken && (
                            <button
                              onClick={() => handleStartDriverVerification(driver)}
                              className="p-2 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900 rounded-lg transition-colors"
                              title="Verify Selfie"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDriver(driver)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                            title="Delete Driver"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <div className="text-gray-500 dark:text-gray-400">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No drivers found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Enhanced Modals */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 scale-100">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {modalType === "admin-verify" && "🔐 Admin Verification Required"}
                    {modalType === "verify-selfie" && `📸 Verify Driver: ${editDriver?.name}`}
                    {modalType === "onboard" && "➕ Onboard New Driver"}
                    {modalType === "manage" && `✏️ Edit Driver: ${editDriver?.name}`}
                    {modalType === "view" && `👤 Driver Details: ${selectedDriver?.name}`}
                  </h3>
                  <button
                    onClick={closeModal}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="px-8 py-6">
                {/* View Driver Modal */}
                {modalType === "view" && selectedDriver && (
                  <div className="space-y-8">
                    <div className="flex items-center space-x-6">
                      <img
                        src={getDriverAvatar(selectedDriver.name) || "/placeholder.svg"}
                        alt={selectedDriver.name}
                        className="w-24 h-24 rounded-full shadow-lg"
                      />
                      <div>
                        <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedDriver.name}</h4>
                        <div className="flex items-center gap-4 mt-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${getDriverStatusColor(selectedDriver.status)}`}
                          >
                            {selectedDriver.status || "Unknown"}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedDriver.kycStatus)}`}
                          >
                            KYC: {selectedDriver.kycStatus}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${selectedDriver.driverType === "Primary" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                          >
                            {selectedDriver.driverType}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Contact Information
                          </h5>
                          <div className="space-y-3">
                            <div className="flex items-center">
                              <Mail className="w-5 h-5 mr-3 text-gray-400" />
                              <span>{selectedDriver.email}</span>
                            </div>
                            <div className="flex items-center">
                              <Phone className="w-5 h-5 mr-3 text-gray-400" />
                              <span>{selectedDriver.phone}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                              <span>Joined {formatDate(selectedDriver.joinDate)}</span>
                            </div>
                          </div>
                        </div>

                        {(selectedDriver.vehicleType || selectedDriver.licensePlate) && (
                          <div>
                            <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                              Vehicle Information
                            </h5>
                            <div className="space-y-3">
                              {selectedDriver.vehicleType && (
                                <div className="flex items-center">
                                  <Car className="w-5 h-5 mr-3 text-gray-400" />
                                  <span>{selectedDriver.vehicleType}</span>
                                </div>
                              )}
                              {selectedDriver.licensePlate && (
                                <div className="flex items-center">
                                  <FileText className="w-5 h-5 mr-3 text-gray-400" />
                                  <span>{selectedDriver.licensePlate}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance</h5>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center">
                                <Star className="w-5 h-5 mr-3 text-yellow-400" />
                                Rating
                              </span>
                              <span className="font-semibold">{selectedDriver.rating || "N/A"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center">
                                <Activity className="w-5 h-5 mr-3 text-green-400" />
                                Completed Trips
                              </span>
                              <span className="font-semibold">{selectedDriver.completedTrips || 0}</span>
                            </div>
                          </div>
                        </div>

                        {selectedDriver.location && (
                          <div>
                            <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Location</h5>
                            <div className="flex items-center">
                              <MapPin className="w-5 h-5 mr-3 text-red-400" />
                              <span>
                                {selectedDriver.location.lat?.toFixed(4)}, {selectedDriver.location.lng?.toFixed(4)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedDriver.subDrivers && selectedDriver.subDrivers.length > 0 && (
                      <div>
                        <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sub-drivers</h5>
                        <ul className="space-y-2">
                          {selectedDriver.subDrivers.map((sub) => (
                            <li key={sub._id} className="flex items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                              <User className="w-4 h-4 mr-2 text-gray-500" />
                              <span>
                                {sub.name} ({sub.email})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                      {/* <button
                        onClick={() => openModal("manage", selectedDriver)}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105"
                      >
                        Edit Driver
                      </button> */}
                    </div>
                  </div>
                )}

                {/* Admin Verification Modal */}
                {modalType === "admin-verify" && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900 rounded-xl p-6">
                      <div className="flex items-center mb-4">
                        <Shield className="w-8 h-8 text-blue-600 mr-3" />
                        <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                          Security Verification
                        </h4>
                      </div>
                      <p className="text-blue-700 dark:text-blue-200">
                        To proceed with driver verification, please verify your own identity first.
                      </p>
                    </div>

                    {errors.adminVerify && (
                      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-xl p-4">
                        <div className="flex items-center">
                          <XCircle className="w-5 h-5 text-red-600 mr-2" />
                          <span className="text-red-700 dark:text-red-200">{errors.adminVerify}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                          Select Your Admin Profile
                        </label>
                        <select
                          value={verifyingAdminId}
                          onChange={(e) => setVerifyingAdminId(e.target.value)}
                          className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                          {admins.length > 0 ? (
                            admins.map((admin) => (
                              <option key={admin.id} value={admin.id}>
                                {admin.name}
                              </option>
                            ))
                          ) : (
                            <option disabled>No admins with selfies found</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                          Provide Your Selfie
                        </label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelfieFor("verify-admin")
                                setShowCamera(true)
                              }}
                              className="flex items-center px-6 py-3 bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
                            >
                              <Camera className="w-5 h-5 mr-2" />
                              Take Photo
                            </button>
                          </div>
                          {adminVerificationFile && (
                            <div className="mt-4 flex items-center justify-center text-green-600">
                              <CheckCircle className="w-5 h-5 mr-2" />
                              <span className="font-medium">Photo captured successfully</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={closeModal}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAdminVerification}
                        disabled={isLoading}
                        className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Verifying...
                          </div>
                        ) : (
                          "Verify & Proceed"
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Driver Verification Modal */}
                {modalType === "verify-selfie" && editDriver && (
                  <div className="space-y-6">
                    <div className="bg-purple-50 dark:bg-purple-900 rounded-xl p-6">
                      <div className="flex items-center mb-4">
                        <Camera className="w-8 h-8 text-purple-600 mr-3" />
                        <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                          Driver Face Verification
                        </h4>
                      </div>
                      <p className="text-purple-700 dark:text-purple-200">
                        Provide a new selfie for the driver to verify against the one on record.
                      </p>
                    </div>

                    {errors.verify && (
                      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-xl p-4">
                        <div className="flex items-center">
                          <XCircle className="w-5 h-5 text-red-600 mr-2" />
                          <span className="text-red-700 dark:text-red-200">{errors.verify}</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                        Capture Driver's Selfie
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-purple-400 transition-colors">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelfieFor("verify-driver")
                              setShowCamera(true)
                            }}
                            className="flex items-center px-6 py-3 bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
                          >
                            <Camera className="w-5 h-5 mr-2" />
                            Take Photo
                          </button>
                        </div>
                        {editDriver.verificationSelfie && (
                          <div className="mt-4 flex items-center justify-center text-green-600">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            <span className="font-medium">Photo captured successfully</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={closeModal}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDriverVerification}
                        disabled={isLoading}
                        className="px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Verifying Driver...
                          </div>
                        ) : (
                          "Verify Driver"
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Onboard Driver Modal */}
                {modalType === "onboard" && (
                  <div className="space-y-6">
                    {/* Driver Type Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        className={`p-4 rounded-lg text-center font-semibold ${formData.driverType === "Primary" ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
                        onClick={() => setFormData({ ...formData, driverType: "Primary" })}
                      >
                        Primary Driver
                      </button>
                      <button
                        className={`p-4 rounded-lg text-center font-semibold ${formData.driverType === "Sub-driver" ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
                        onClick={() => setFormData({ ...formData, driverType: "Sub-driver" })}
                      >
                        Sub-driver
                      </button>
                    </div>

                    {errors.form && (
                      <div
                        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
                        role="alert"
                      >
                        {errors.form}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`w-full p-4 border rounded-xl ${errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-700`}
                        />
                        {errors.name && <p className="text-red-500 text-xs italic">{errors.name}</p>}
                      </div>
                      <div>
                        <input
                          type="email"
                          placeholder="Email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={`w-full p-4 border rounded-xl ${errors.email ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-700`}
                        />
                        {errors.email && <p className="text-red-500 text-xs italic">{errors.email}</p>}
                      </div>
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          placeholder="Phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={`w-full p-4 border rounded-xl ${errors.phone ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-700`}
                        />
                        {errors.phone && <p className="text-red-500 text-xs italic">{errors.phone}</p>}
                      </div>
                    </div>

                    {/* Vehicle information for both primary and sub-drivers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <input
                          type="text"
                          placeholder="Vehicle Type"
                          value={formData.vehicleType}
                          onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                          className={`w-full p-4 border rounded-xl ${errors.vehicleType ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-700`}
                        />
                        {errors.vehicleType && <p className="text-red-500 text-xs italic">{errors.vehicleType}</p>}
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="License Plate"
                          value={formData.licensePlate}
                          onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                          className={`w-full p-4 border rounded-xl ${errors.licensePlate ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-700`}
                        />
                        {errors.licensePlate && <p className="text-red-500 text-xs italic">{errors.licensePlate}</p>}
                      </div>
                    </div>

                    {formData.driverType === "Sub-driver" && (
                      <div>
                        <select
                          value={formData.primaryDriver}
                          onChange={(e) => setFormData({ ...formData, primaryDriver: e.target.value })}
                          className={`w-full p-4 border rounded-xl ${errors.primaryDriver ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-700`}
                        >
                          <option value="">Select Primary Driver</option>
                          {primaryDrivers.map((d) => (
                            <option key={d._id} value={d._id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        {errors.primaryDriver && <p className="text-red-500 text-xs italic">{errors.primaryDriver}</p>}
                      </div>
                    )}

                    {/* Document Uploads - Enhanced for all drivers */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                      {/* License Upload */}
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center">
                        <label htmlFor="license-upload" className="cursor-pointer">
                          <FileText className="mx-auto h-8 w-8 text-gray-400" />
                          <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">License</span>
                          <input
                            id="license-upload"
                            type="file"
                            className="sr-only"
                            onChange={(e) => setLicensePhoto(e.target.files[0])}
                          />
                        </label>
                        {licensePhoto && <span className="text-xs text-green-500">Uploaded</span>}
                      </div>

                      {/* PAN Card Upload */}
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center">
                        <label htmlFor="pan-upload" className="cursor-pointer">
                          <FileText className="mx-auto h-8 w-8 text-gray-400" />
                          <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">PAN Card</span>
                          <input
                            id="pan-upload"
                            type="file"
                            className="sr-only"
                            onChange={(e) => setPanCardPhoto(e.target.files[0])}
                          />
                        </label>
                        {panCardPhoto && <span className="text-xs text-green-500">Uploaded</span>}
                      </div>

                      {/* Vehicle Photo Upload */}
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center">
                        <label htmlFor="vehicle-upload" className="cursor-pointer">
                          <Car className="mx-auto h-8 w-8 text-gray-400" />
                          <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">Vehicle</span>
                          <input
                            id="vehicle-upload"
                            type="file"
                            className="sr-only"
                            onChange={(e) => setVehiclePhoto(e.target.files[0])}
                          />
                        </label>
                        {vehiclePhoto && <span className="text-xs text-green-500">Uploaded</span>}
                      </div>

                      {/* Numberplate Photo Upload */}
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center">
                        <label htmlFor="numberplate-upload" className="cursor-pointer">
                          <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                          <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                            Numberplate
                          </span>
                          <input
                            id="numberplate-upload"
                            type="file"
                            className="sr-only"
                            onChange={(e) => setNumberplatePhoto(e.target.files[0])}
                          />
                        </label>
                        {numberplatePhoto && <span className="text-xs text-green-500">Uploaded</span>}
                      </div>

                      {/* Selfie Upload - Camera Only */}
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center">
                        <div className="cursor-pointer">
                          <Camera className="mx-auto h-8 w-8 text-gray-400" />
                          <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">Selfie</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelfieFor("onboard")
                              setShowCamera(true)
                            }}
                            className="mt-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded text-xs hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                          >
                            Take Photo
                          </button>
                        </div>
                        {selfiePhoto && <span className="text-xs text-green-500">Captured</span>}
                      </div>
                    </div>

                    {formData.driverType === "Primary" && (
                      <div>
                        <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Sub-drivers</h4>
                        {subDrivers.map((subDriver, index) => (
                          <div key={index} className="border rounded-lg p-4 mb-4 dark:border-gray-600">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                              <input
                                type="text"
                                placeholder="Name"
                                value={subDriver.name}
                                onChange={(e) => handleSubDriverChange(index, "name", e.target.value)}
                                className="p-2 border rounded dark:bg-gray-600 w-full"
                              />
                              <input
                                type="email"
                                placeholder="Email"
                                value={subDriver.email}
                                onChange={(e) => handleSubDriverChange(index, "email", e.target.value)}
                                className="p-2 border rounded dark:bg-gray-600 w-full"
                              />
                              <input
                                type="text"
                                placeholder="Phone"
                                value={subDriver.phone}
                                onChange={(e) => handleSubDriverChange(index, "phone", e.target.value)}
                                className="p-2 border rounded dark:bg-gray-600 w-full"
                              />
                              <input
                                type="text"
                                placeholder="Vehicle Type"
                                value={subDriver.vehicleType}
                                onChange={(e) => handleSubDriverChange(index, "vehicleType", e.target.value)}
                                className="p-2 border rounded dark:bg-gray-600 w-full"
                              />
                              <input
                                type="text"
                                placeholder="License Plate"
                                value={subDriver.licensePlate}
                                onChange={(e) => handleSubDriverChange(index, "licensePlate", e.target.value)}
                                className="p-2 border rounded dark:bg-gray-600 w-full"
                              />
                            </div>

                            {/* Sub-driver Document Uploads */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
                              {/* License */}
                              <div className="border border-dashed border-gray-300 rounded p-2 text-center">
                                <input
                                  type="file"
                                  onChange={(e) => handleSubDriverDocumentUpload(index, "license", e.target.files[0])}
                                  className="hidden"
                                  id={`sub-license-${index}`}
                                />
                                <label htmlFor={`sub-license-${index}`} className="cursor-pointer">
                                  <FileText className="w-4 h-4 mx-auto text-gray-400" />
                                  <span className="text-xs">License</span>
                                </label>
                                {subDriver.license && <span className="text-xs text-green-500">✓</span>}
                              </div>

                              {/* PAN */}
                              <div className="border border-dashed border-gray-300 rounded p-2 text-center">
                                <input
                                  type="file"
                                  onChange={(e) => handleSubDriverDocumentUpload(index, "pan", e.target.files[0])}
                                  className="hidden"
                                  id={`sub-pan-${index}`}
                                />
                                <label htmlFor={`sub-pan-${index}`} className="cursor-pointer">
                                  <FileText className="w-4 h-4 mx-auto text-gray-400" />
                                  <span className="text-xs">PAN</span>
                                </label>
                                {subDriver.pan && <span className="text-xs text-green-500">✓</span>}
                              </div>

                              {/* Vehicle */}
                              <div className="border border-dashed border-gray-300 rounded p-2 text-center">
                                <input
                                  type="file"
                                  onChange={(e) => handleSubDriverDocumentUpload(index, "vehicle", e.target.files[0])}
                                  className="hidden"
                                  id={`sub-vehicle-${index}`}
                                />
                                <label htmlFor={`sub-vehicle-${index}`} className="cursor-pointer">
                                  <Car className="w-4 h-4 mx-auto text-gray-400" />
                                  <span className="text-xs">Vehicle</span>
                                </label>
                                {subDriver.vehicle && <span className="text-xs text-green-500">✓</span>}
                              </div>

                              {/* Numberplate */}
                              <div className="border border-dashed border-gray-300 rounded p-2 text-center">
                                <input
                                  type="file"
                                  onChange={(e) =>
                                    handleSubDriverDocumentUpload(index, "numberplate", e.target.files[0])
                                  }
                                  className="hidden"
                                  id={`sub-numberplate-${index}`}
                                />
                                <label htmlFor={`sub-numberplate-${index}`} className="cursor-pointer">
                                  <ImageIcon className="w-4 h-4 mx-auto text-gray-400" />
                                  <span className="text-xs">Plate</span>
                                </label>
                                {subDriver.numberplate && <span className="text-xs text-green-500">✓</span>}
                              </div>

                              {/* Selfie - Camera Only */}
                              <div className="border border-dashed border-gray-300 rounded p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelfieFor("sub-driver-selfie")
                                    setCurrentSubDriverIndex(index)
                                    setShowCamera(true)
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Camera className="w-4 h-4 mx-auto text-gray-400" />
                                  <span className="text-xs">Selfie</span>
                                </button>
                                {subDriver.selfie && <span className="text-xs text-green-500">✓</span>}
                              </div>
                            </div>

                            <button
                              onClick={() => handleRemoveSubDriver(index)}
                              className="mt-2 p-2 bg-red-500 text-white rounded flex items-center"
                            >
                              <UserMinus className="w-4 h-4 mr-1" /> Remove
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={handleAddSubDriver}
                          className="mt-2 p-2 bg-green-500 text-white rounded flex items-center"
                        >
                          <UserPlus className="w-4 h-4 mr-1" /> Add Sub-driver
                        </button>
                      </div>
                    )}

                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={closeModal}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-50"
                      >
                        {isLoading ? "Saving..." : "Save Driver"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit Driver Modal */}
                {modalType === "manage" && editDriver && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Full Name</label>
                        <input
                          type="text"
                          value={editDriver.name}
                          onChange={(e) => setEditDriver({ ...editDriver, name: e.target.value })}
                          className={`w-full p-4 border rounded-xl ${errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-700`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Email</label>
                        <input
                          type="email"
                          value={editDriver.email}
                          onChange={(e) => setEditDriver({ ...editDriver, email: e.target.value })}
                          className={`w-full p-4 border rounded-xl ${errors.email ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-700`}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Phone</label>
                        <input
                          type="text"
                          value={editDriver.phone}
                          onChange={(e) => setEditDriver({ ...editDriver, phone: e.target.value })}
                          className={`w-full p-4 border rounded-xl ${errors.phone ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-700`}
                        />
                      </div>
                      {/* Vehicle information for all drivers */}
                      <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Vehicle Type</label>
                        <input
                          type="text"
                          value={editDriver.vehicleType || ""}
                          onChange={(e) => setEditDriver({ ...editDriver, vehicleType: e.target.value })}
                          className={`w-full p-4 border rounded-xl ${errors.vehicleType ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-700`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">License Plate</label>
                        <input
                          type="text"
                          value={editDriver.licensePlate || ""}
                          onChange={(e) => setEditDriver({ ...editDriver, licensePlate: e.target.value.toUpperCase() })}
                          className={`w-full p-4 border rounded-xl ${errors.licensePlate ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-700`}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={closeModal}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdate}
                        disabled={isLoading}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isLoading ? "Updating..." : "Update Driver"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Camera View */}
        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-[100]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Take a Photo</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Position yourself in the center and click capture when ready
                </p>
              </div>

              <div className="relative rounded-2xl overflow-hidden mb-6 bg-gray-100 dark:bg-gray-700">
                <video ref={videoRef} autoPlay playsInline className="w-full h-80 object-cover" />
                <div className="absolute inset-0 border-4 border-dashed border-white opacity-50 m-8 rounded-2xl"></div>
              </div>

              <div className="flex justify-center gap-6">
                <button
                  onClick={handleCaptureSelfie}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 flex items-center"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Capture Photo
                </button>
                <button
                  onClick={() => setShowCamera(false)}
                  className="px-8 py-4 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all flex items-center"
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
