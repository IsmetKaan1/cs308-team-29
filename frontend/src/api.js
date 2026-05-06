const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('Could not reach the server. Please try again.');
  }

  const text = await res.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status}). Please try again.`);
  }

  if (text && !data) {
    throw new Error('The server returned an invalid response. Please try again.');
  }

  return data;
}

async function requestBlob(path, { accept } = {}) {
  const headers = {};
  if (accept) headers['Accept'] = accept;
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { headers });
  } catch {
    throw new Error('Could not reach the server. Please try again.');
  }

  if (!res.ok) {
    let message = `Request failed (${res.status}). Please try again.`;
    try {
      const text = await res.text();
      if (text) {
        try { message = JSON.parse(text).error || message; } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    throw new Error(message);
  }

  return res.blob();
}

function managerHeaders(pass) {
  return pass ? { 'X-Manager-Pass': pass } : {};
}

export const api = {
  post:    (path, body) => request(path, { method: 'POST',  body: JSON.stringify(body) }),
  get:     (path)       => request(path),
  put:     (path, body) => request(path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch:   (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  getBlob: (path, opts) => requestBlob(path, opts),
  managerGet:   (path, pass) =>
    request(path, { headers: managerHeaders(pass) }),
  managerPatch: (path, body, pass) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body), headers: managerHeaders(pass) }),
};
