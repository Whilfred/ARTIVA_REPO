const LOCAL_API_PORT = 3001;

function resolveApiBaseUrl() {
  console.log('=== CONFIGURATION API ===');
  
  if (process.env.REACT_APP_API_URL) {
    console.log('✅ URL depuis .env:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }

  const { protocol, hostname } = window.location;
  const localUrl = `${protocol}//${hostname}:${LOCAL_API_PORT}/api`;
  return localUrl;
}

export const API_BASE_URL = resolveApiBaseUrl();

export default API_BASE_URL;