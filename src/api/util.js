const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

const { NODE_ENV, PRODUCTION_API_URL } = process.env;
export const API_URL =
  NODE_ENV === 'development' ? 'http://localhost:5000/api' : PRODUCTION_API_URL;

export const handleResponse = async (response) => {
  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.indexOf('application/json') !== -1) {
      const result = await response.json();
      throw result;
    } else {
      throw response.statusText;
    }
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.indexOf('application/json') !== -1) return response.json();
  return response;
};

export const getRequestOptions = (method, body = null) => {
  const options = {
    method: method.toUpperCase(),
    headers,
    credentials: 'include'
  };

  if (body) options.body = JSON.stringify(body);

  return options;
};
