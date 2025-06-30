"use client"

import { useState, useEffect } from "react"
import {
  FiDownload,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiAlertCircle,
  FiCheckCircle,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useBillingSocket } from "../hooks/useSocket"

// API base URL
const API_BASE_URL = "http://localhost:8989/api"

export default function BillingPage() {
  // State for invoices data
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState({
    startDate: null,
    endDate: null,
  })

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentInvoice, setCurrentInvoice] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    customerName: "",
    amount: "",
    date: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: "pending",
    description: "",
  })

  // Notification state
  const [notification, setNotification] = useState(null)

  // 🔥 UNIFIED SOCKET CONNECTION
  const handleBillingEvent = (eventType, data) => {
    console.log(`🔥 Real-time billing event: ${eventType}`, data)

    switch (eventType) {
      case "created":
        console.log("📄 New invoice created:", data)
        setInvoices((prev) => [data, ...prev])
        setTotalItems((prev) => prev + 1)
        showNotification(`New invoice ${data.invoiceNumber} created!`, "success")
        window.location.reload()
        break

      case "updated":
        console.log("📄 Invoice updated:", data)
        setInvoices((prev) => prev.map((invoice) => (invoice._id === data._id ? data : invoice)))
        showNotification(`Invoice ${data.invoiceNumber} updated!`, "success")
        window.location.reload()
        break

      case "deleted":
        console.log("📄 Invoice deleted:", data)
        setInvoices((prev) => prev.filter((invoice) => invoice._id !== data.id))
        setTotalItems((prev) => prev - 1)
        showNotification(`Invoice ${data.invoice.invoiceNumber} deleted!`, "success")
        window.location.reload()
        break

      default:
        console.log("Unknown billing event:", eventType)
    }
  }

  const { isConnected, connectionError } = useBillingSocket(handleBillingEvent)

  // Fetch invoices from API
  const fetchInvoices = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()
      params.append("page", currentPage.toString())
      params.append("limit", itemsPerPage.toString())

      if (searchTerm) params.append("search", searchTerm)
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (dateFilter.startDate) params.append("startDate", dateFilter.startDate.toISOString())
      if (dateFilter.endDate) params.append("endDate", dateFilter.endDate.toISOString())

      const response = await fetch(`${API_BASE_URL}/invoices?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setInvoices(data.data)
        setTotalPages(data.pagination.totalPages)
        setTotalItems(data.pagination.totalItems)
      } else {
        throw new Error(data.message || "Failed to fetch invoices")
      }
    } catch (err) {
      console.error("Error fetching invoices:", err)
      setError(err.message || "Failed to fetch invoices")
      showNotification("Error fetching invoices. Please try again.", "error")
    } finally {
      setIsLoading(false)
    }
  }

  // Load invoices on component mount and when filters change
  useEffect(() => {
    fetchInvoices()
  }, [currentPage, itemsPerPage, searchTerm, statusFilter, dateFilter])

  // Show notification
  const showNotification = (message, type = "success") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle date changes
  const handleDateChange = (name, date) => {
    setFormData((prev) => ({
      ...prev,
      [name]: date,
    }))
  }

  // Open modal for creating new invoice
  const handleNewInvoice = () => {
    setIsEditing(false)
    setCurrentInvoice(null)
    setFormData({
      customerName: "",
      amount: "",
      date: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "pending",
      description: "",
    })
    setIsModalOpen(true)
  }

  // Open modal for editing invoice
  const handleEditInvoice = (invoice) => {
    setIsEditing(true)
    setCurrentInvoice(invoice)
    setFormData({
      customerName: invoice.customerName,
      amount: invoice.amount.toString(),
      date: new Date(invoice.date),
      dueDate: new Date(invoice.dueDate),
      status: invoice.status,
      description: invoice.description || "",
    })
    setIsModalOpen(true)
  }

  // Save invoice (create or update)
  const handleSaveInvoice = async () => {
    try {
      setIsSubmitting(true)

      // Validate required fields
      if (!formData.customerName?.trim()) {
        showNotification("Customer name is required", "error")
        return
      }

      if (!formData.amount || isNaN(Number.parseFloat(formData.amount)) || Number.parseFloat(formData.amount) <= 0) {
        showNotification("Please enter a valid amount greater than 0", "error")
        return
      }

      if (!formData.dueDate) {
        showNotification("Due date is required", "error")
        return
      }

      const invoiceData = {
        customerName: formData.customerName.trim(),
        amount: Number.parseFloat(formData.amount),
        date: formData.date.toISOString(),
        dueDate: formData.dueDate.toISOString(),
        status: formData.status,
        description: formData.description?.trim() || "",
      }

      console.log("Sending invoice data:", invoiceData)

      let response
      if (isEditing && currentInvoice) {
        response = await fetch(`${API_BASE_URL}/invoices/${currentInvoice._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(invoiceData),
        })
        window.location.reload()
      } else {
        response = await fetch(`${API_BASE_URL}/invoices`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(invoiceData),
        })
        window.location.reload()
      }

      const data = await response.json()
      console.log("Response data:", data)

      if (!response.ok) {
        throw new Error(data.message || data.errors?.join(", ") || `HTTP error! status: ${response.status}`)
      }

      if (data.success) {
        showNotification(isEditing ? "Invoice updated successfully!" : "Invoice created successfully!")
        setIsModalOpen(false)
        // Don't fetch invoices here as Socket.IO will handle the update
      } else {
        throw new Error(data.message || "Failed to save invoice")
      }
    } catch (err) {
      console.error("Error saving invoice:", err)
      showNotification(err.message || "Error saving invoice. Please try again.", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete invoice
  const handleDeleteInvoice = async (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to delete invoice")
        }

        const data = await response.json()

        if (data.success) {
          // Don't show notification here as Socket.IO will handle it
          // Don't fetch invoices here as Socket.IO will handle the update
        } else {
          throw new Error(data.message || "Failed to delete invoice")
        }
        window.location.reload();
      } catch (err) {
        console.error("Error deleting invoice:", err)
        showNotification(err.message || "Error deleting invoice. Please try again.", "error")
      }
    }
  }

  // Download invoice as PDF
  const downloadPdf = (invoice) => {
    try {
      const doc = new jsPDF()

      // Header
      doc.setFontSize(20)
      doc.setTextColor(40, 40, 40)
      doc.text("INVOICE", 105, 25, { align: "center" })

      // Company info
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text("Idhar Udhar", 20, 40)
      doc.text("123 Business Street", 20, 45)
      doc.text("City, State 12345", 20, 50)
      doc.text("Phone: (555) 123-4567", 20, 55)

      // Invoice details
      doc.setFontSize(12)
      doc.setTextColor(40, 40, 40)
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 120, 40)
      doc.text(`Date: ${format(new Date(invoice.date), "MM/dd/yyyy")}`, 120, 50)
      doc.text(`Due Date: ${format(new Date(invoice.dueDate), "MM/dd/yyyy")}`, 120, 60)

      // Bill to
      doc.setFontSize(14)
      doc.text("Bill To:", 20, 75)
      doc.setFontSize(12)
      doc.text(invoice.customerName, 20, 85)

      // Table using autoTable
      autoTable(doc, {
        startY: 100,
        head: [["Description", "Amount"]],
        body: [
          [invoice.description || "Service provided", `$${invoice.amount.toFixed(2)}`],
          ["", ""],
          ["Total", `$${invoice.amount.toFixed(2)}`],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontSize: 12,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 11,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { top: 100 },
      })

      // Footer
      const pageHeight = doc.internal.pageSize.height
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text("Thank you for your business!", 105, pageHeight - 30, { align: "center" })
      doc.text(`Status: ${invoice.status.toUpperCase()}`, 105, pageHeight - 20, { align: "center" })

      // Save the PDF
      doc.save(`invoice_${invoice.invoiceNumber}.pdf`)

      showNotification("PDF downloaded successfully!")
    } catch (error) {
      console.error("Error generating PDF:", error)
      showNotification("Error generating PDF. Please try again.", "error")
    }
  }

  // Get status color classes
  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200"
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Billing & Invoices</h1>

          {/* Connection Status */}
          <div
            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isConnected
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {isConnected ? <FiWifi className="w-4 h-4" /> : <FiWifiOff className="w-4 h-4" />}
            <span>{isConnected ? "Connected" : connectionError ? `Error: ${connectionError}` : "Disconnected"}</span>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`mb-4 p-4 rounded-md flex items-center ${
              notification.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-green-50 text-green-800 border border-green-200"
            }`}
          >
            {notification.type === "error" ? <FiAlertCircle className="mr-2" /> : <FiCheckCircle className="mr-2" />}
            {notification.message}
          </div>
        )}

        {/* Rest of the component remains the same... */}
        {/* Filters and Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto">
              <div className="relative flex-grow md:flex-grow-0 md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search invoices..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2">
              <div className="flex items-center space-x-2">
                <DatePicker
                  selected={dateFilter.startDate}
                  onChange={(date) => setDateFilter({ ...dateFilter, startDate: date })}
                  selectsStart
                  startDate={dateFilter.startDate}
                  endDate={dateFilter.endDate}
                  placeholderText="Start Date"
                  className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <span className="text-gray-500 dark:text-gray-400">to</span>
                <DatePicker
                  selected={dateFilter.endDate}
                  onChange={(date) => setDateFilter({ ...dateFilter, endDate: date })}
                  selectsEnd
                  startDate={dateFilter.startDate}
                  endDate={dateFilter.endDate}
                  minDate={dateFilter.startDate}
                  placeholderText="End Date"
                  className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* <button
                onClick={handleNewInvoice}
                className="flex items-center px-4 py-2 rounded-md bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <FiPlus className="mr-2" />
                New Invoice
              </button> */}
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-64 text-red-600">
              <div className="text-center">
                <FiAlertCircle className="mx-auto h-12 w-12 mb-4" />
                <p>{error}</p>
                <button
                  onClick={fetchInvoices}
                  className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex justify-center items-center h-64 text-gray-500">
              <div className="text-center">
                <p className="text-lg">No invoices found</p>
                <p className="text-sm mt-2">Try adjusting your filters or create a new invoice</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Invoice #
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Customer
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Amount
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Due Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {invoices.map((invoice) => (
                      <tr key={invoice._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                              {invoice.customerName.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {invoice.customerName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-300">
                          ${invoice.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {format(new Date(invoice.date), "MMM dd, yyyy")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(invoice.status)}`}
                          >
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => downloadPdf(invoice)}
                              className="text-gray-500 hover:text-green-600 dark:hover:text-green-400 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                              title="Download"
                            >
                              <FiDownload className="h-5 w-5" />
                            </button>
                            {/* <button
                              onClick={() => handleEditInvoice(invoice)}
                              className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                              title="Edit"
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice._id)}
                              className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                              title="Delete"
                            >
                              <FiTrash2 className="h-5 w-5" />
                            </button> */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                      <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{" "}
                      <span className="font-medium">{totalItems}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>

                      {/* Generate page buttons */}
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNum
                                ? "z-10 bg-green-50 dark:bg-green-900 border-green-500 text-green-600 dark:text-green-300"
                                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}

                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        <FiChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Invoice Modal */}
        {isModalOpen && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div
                  className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"
                  onClick={() => setIsModalOpen(false)}
                ></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                    {isEditing ? "Edit Invoice" : "Create New Invoice"}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="customerName"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        id="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="amount"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Amount *
                      </label>
                      <input
                        type="number"
                        name="amount"
                        id="amount"
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="date"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Invoice Date
                        </label>
                        <DatePicker
                          selected={formData.date}
                          onChange={(date) => handleDateChange("date", date)}
                          selectsStart
                          startDate={formData.date}
                          endDate={formData.dueDate}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="dueDate"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Due Date *
                        </label>
                        <DatePicker
                          selected={formData.dueDate}
                          onChange={(date) => handleDateChange("dueDate", date)}
                          selectsEnd
                          startDate={formData.date}
                          endDate={formData.dueDate}
                          minDate={formData.date}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="status"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Status
                      </label>
                      <select
                        name="status"
                        id="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Description
                      </label>
                      <textarea
                        name="description"
                        id="description"
                        rows={3}
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleSaveInvoice}
                    disabled={isSubmitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-base font-medium text-white hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"} Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
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
