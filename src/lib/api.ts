// Configuração da API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_DOMAIN;

// Função utilitária para construir URLs da API
export const apiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
}; 