const API_BASE_URL = process.env.REACT_APP_API_URL || "https://panalsbackend-production.up.railway.app/api"

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`

    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "API request failed")
      }

      return data
    } catch (error) {
      console.error("API Error:", error)
      throw error
    }
  }

  // Driver endpoints
  async getAllDrivers(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const endpoint = queryString ? `/drivers?${queryString}` : "/drivers"
    return this.request(endpoint)
  }

  async getDriver(id) {
    return this.request(`/drivers/${id}`)
  }

  async createDriver(driverData) {
    return this.request("/drivers", {
      method: "POST",
      body: JSON.stringify(driverData),
    })
  }

  async updateDriver(id, driverData) {
    return this.request(`/drivers/${id}`, {
      method: "PUT",
      body: JSON.stringify(driverData),
    })
  }

  async updateDriverLocation(id, locationData) {
    return this.request(`/drivers/${id}/location`, {
      method: "PATCH",
      body: JSON.stringify(locationData),
    })
  }

  async deleteDriver(id) {
    return this.request(`/drivers/${id}`, {
      method: "DELETE",
    })
  }

  async getDriverStats() {
    return this.request("/drivers/stats")
  }

  async initializeSampleDrivers() {
    return this.request("/drivers/init/sample", {
      method: "POST",
    })
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL.replace("/api", "")}/health`)
      return await response.json()
    } catch (error) {
      throw new Error("Backend server is not responding")
    }
  }
}

export const apiService = new ApiService()