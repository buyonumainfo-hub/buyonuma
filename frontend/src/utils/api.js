import axios from 'axios';
const api_url = `${import.meta.env.VITE_API_URL}`

const api = axios.create({ baseURL: api_url });

api.interceptors.request.use((config) => {
  // Admin token
  const adminToken  = localStorage.getItem('lens_admin_token');
  // Seller token — only attach if no admin token present
  const sellerToken = localStorage.getItem('lens_seller_token');
  const token = adminToken || sellerToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isAdminRoute = err.config?.url?.includes('/auth/');
      if (isAdminRoute || localStorage.getItem('lens_admin_token')) {
        localStorage.removeItem('lens_admin_token');
        window.location.href = '/admin/login';
      } else {
        localStorage.removeItem('lens_seller_token');
        window.location.href = '/seller/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
