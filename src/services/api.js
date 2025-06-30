import axios from 'axios';

const API_BASE_URL = 'https://panalsbackend-production.up.railway.app/api'; // Update with your backend URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentRides: () => api.get('/dashboard/recent-rides'),
  getRevenueData: () => api.get('/dashboard/revenue-data')
};