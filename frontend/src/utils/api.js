const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const getToken = () => localStorage.getItem('session_token');
export const setToken = (token) => localStorage.setItem('session_token', token);
export const clearToken = () => localStorage.removeItem('session_token');

export const authFetch = (url, options = {}) => {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};
