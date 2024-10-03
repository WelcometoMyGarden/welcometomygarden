const PROJECT_NAME = 'demo-test';

export async function clearAuth() {
  const deleteURL = `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_NAME}/accounts`;
  return fetch(deleteURL, { method: 'DELETE' });
}

export async function clearFirestore() {
  const deleteURL = `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_NAME}/databases/(default)/documents`;
  return fetch(deleteURL, { method: 'DELETE' });
}
