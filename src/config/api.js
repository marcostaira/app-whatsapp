// config/api.js
// Configuração centralizada da API

/**
 * Base URL da API
 * Prioridade:
 * 1. REACT_APP_API_URL (variável de ambiente)
 * 2. window.location.origin (mesma origem do frontend)
 * 3. http://localhost:3000 (fallback para desenvolvimento)
 */
export const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "") ||
  "http://localhost:3000";

/**
 * Configuração padrão para requisições fetch
 */
export const API_CONFIG = {
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  // Timeout padrão de 30 segundos
  timeout: 30000,
};

/**
 * Wrapper para fetch com configurações padrão
 * @param {string} endpoint - Endpoint da API (sem a baseURL)
 * @param {object} options - Opções do fetch
 * @returns {Promise} - Promise do fetch
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${
    endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  }`;

  const config = {
    ...API_CONFIG,
    ...options,
    headers: {
      ...API_CONFIG.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    // Se não for uma resposta de sucesso, lança erro
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // Tenta fazer parse do JSON, se falhar retorna texto
    try {
      return await response.json();
    } catch {
      return await response.text();
    }
  } catch (error) {
    // Re-lança o erro com contexto adicional
    throw new Error(`API Request failed: ${error.message}`);
  }
};

/**
 * Endpoints específicos da API
 */
export const API_ENDPOINTS = {
  // Connection endpoints
  connection: {
    status: (tenantId) => `/api/connection/status/${tenantId}`,
    create: () => "/api/connection/create",
    disconnect: (tenantId) => `/api/connection/disconnect/${tenantId}`,
    list: (tenantId) => `/api/connections?tenantId=${tenantId}`,
    delete: (sessionId) => `/api/connection/${sessionId}`,
  },

  // Webhook endpoints
  webhook: {
    config: (tenantId) => `/api/webhook/config/${tenantId}`,
    test: () => "/api/webhook/test",
    logs: (tenantId, limit = 10) =>
      `/api/webhook/logs/${tenantId}?limit=${limit}`,
  },

  // Message endpoints
  message: {
    send: () => "/api/message/send",
    list: (tenantId) => `/api/message/list/${tenantId}`,
    status: (messageId) => `/api/message/status/${messageId}`,
  },

  // Contact endpoints
  contact: {
    list: (tenantId) => `/api/contact/list/${tenantId}`,
    get: (tenantId, contactId) => `/api/contact/${tenantId}/${contactId}`,
    block: (tenantId, contactId) =>
      `/api/contact/block/${tenantId}/${contactId}`,
  },

  // Tenant endpoints
  tenant: {
    get: (tenantId) => `/api/tenant/${tenantId}`,
    create: () => "/api/tenant/create",
    update: (tenantId) => `/api/tenant/${tenantId}`,
    delete: (tenantId) => `/api/tenant/${tenantId}`,
  },
};

/**
 * Funções de conveniência para requisições comuns
 */
export const api = {
  get: (endpoint, options = {}) =>
    apiRequest(endpoint, { method: "GET", ...options }),

  post: (endpoint, data, options = {}) =>
    apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
      ...options,
    }),

  put: (endpoint, data, options = {}) =>
    apiRequest(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
      ...options,
    }),

  delete: (endpoint, options = {}) =>
    apiRequest(endpoint, { method: "DELETE", ...options }),
};

/**
 * Hook personalizado para verificar se a API está online
 */
export const checkApiHealth = async () => {
  try {
    await apiRequest("/api/health");
    return { online: true, baseUrl: API_BASE_URL };
  } catch (error) {
    return { online: false, baseUrl: API_BASE_URL, error: error.message };
  }
};

/**
 * Configuração para desenvolvimento
 */
if (process.env.NODE_ENV === "development") {
  console.log("🔗 API Base URL:", API_BASE_URL);
}
