/**
 * Global Configuration for Meiporul Frontend
 * Single point of truth for backend API URL.
 */
export const API_BASE_URL: string = 
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

export const VERIFY_ENDPOINT: string = `${API_BASE_URL}/verify`;
export const HEALTH_ENDPOINT: string = `${API_BASE_URL}/health`;
