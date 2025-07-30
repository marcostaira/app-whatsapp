import axios from "axios";

// Configuração base da API
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

class ApiService {
  constructor() {
    this.apiKey = null;
    this.client = axios.create({
      baseURL: `${BASE_URL}/api`,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Interceptor para adicionar API Key automaticamente
    this.client.interceptors.request.use((config) => {
      if (this.apiKey) {
        config.headers["X-API-Key"] = this.apiKey;
      }
      return config;
    });

    // Interceptor para tratar erros
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        console.error("API Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || error.message);
      }
    );
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  // === HEALTH CHECK ===
  async checkHealth() {
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      return response.data;
    } catch (error) {
      throw new Error("API indisponível");
    }
  }

  // === TENANT MANAGEMENT ===
  async createTenant(tenantData) {
    return await this.client.post("/tenants", tenantData);
  }

  async getTenants() {
    return await this.client.get("/tenants");
  }

  async getTenant(tenantId) {
    return await this.client.get(`/tenants/${tenantId}`);
  }

  async updateTenant(tenantId, data) {
    return await this.client.put(`/tenants/${tenantId}`, data);
  }

  // === CONNECTION MANAGEMENT ===
  async createConnection(connectionData) {
    return await this.client.post("/connect", connectionData);
  }

  async getConnectionStatus(sessionId) {
    return await this.client.get(`/connection/${sessionId}/status`);
  }

  async getConnections() {
    return await this.client.get("/connections");
  }

  async disconnectSession(sessionId) {
    return await this.client.delete(`/connection/${sessionId}`);
  }

  // === MESSAGE MANAGEMENT ===
  async sendMessage(messageData) {
    return await this.client.post("/messages/send", messageData);
  }

  async sendBulkMessages(bulkData) {
    return await this.client.post("/messages/send-bulk", bulkData);
  }

  async getMessages(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value);
      }
    });

    return await this.client.get(`/messages?${params.toString()}`);
  }

  async getMessage(messageId) {
    return await this.client.get(`/messages/${messageId}`);
  }

  async updateMessageStatus(messageId, status) {
    return await this.client.put(`/messages/${messageId}/status`, { status });
  }

  async getUnreadMessages() {
    return await this.client.get("/messages/unread");
  }

  async searchMessages(query, limit = 20) {
    return await this.client.get(
      `/messages/search?query=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  async getMessageStats(dateFrom, dateTo) {
    const params = new URLSearchParams();
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);

    return await this.client.get(`/messages/stats?${params.toString()}`);
  }

  async markAsRead(messageId) {
    return await this.client.put(`/messages/${messageId}/read`);
  }

  // === CONTACT MANAGEMENT ===
  async getContacts(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value);
      }
    });

    return await this.client.get(`/contacts?${params.toString()}`);
  }

  async getContact(contactId) {
    return await this.client.get(`/contacts/${contactId}`);
  }

  async updateContact(contactId, data) {
    return await this.client.put(`/contacts/${contactId}`, data);
  }

  async searchContacts(query, limit = 20) {
    return await this.client.get(
      `/contacts/search?query=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  async getGroupContacts() {
    return await this.client.get("/contacts/groups");
  }

  async blockContact(whatsappId) {
    return await this.client.post(`/contacts/${whatsappId}/block`);
  }

  async unblockContact(whatsappId) {
    return await this.client.post(`/contacts/${whatsappId}/unblock`);
  }

  // === MEDIA MANAGEMENT ===
  async uploadMedia(file) {
    const formData = new FormData();
    formData.append("file", file);

    return await this.client.post("/media/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }

  async getMediaUrl(filename) {
    return `${BASE_URL}/api/media/${filename}`;
  }

  async deleteMedia(filename) {
    return await this.client.delete(`/media/${filename}`);
  }

  // === PROFILE MANAGEMENT ===
  async getProfile(sessionId) {
    return await this.client.get(`/profile/${sessionId}`);
  }

  // === WEBHOOK MANAGEMENT ===
  async testWebhook(url) {
    return await this.client.post("/webhook/test", { url });
  }

  // === EXPORT FUNCTIONS ===
  async exportMessages(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value);
      }
    });

    return await this.client.get(`/export/messages?${params.toString()}`);
  }

  async exportContacts(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value);
      }
    });

    return await this.client.get(`/export/contacts?${params.toString()}`);
  }

  // === UTILITY FUNCTIONS ===
  formatPhoneNumber(phoneNumber) {
    // Remove caracteres especiais
    const cleanNumber = phoneNumber.replace(/\D/g, "");

    // Se não termina com @s.whatsapp.net ou @c.us, adiciona
    if (!phoneNumber.includes("@")) {
      return cleanNumber + "@s.whatsapp.net";
    }

    return phoneNumber;
  }

  validateBrazilianPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, "");

    // Números brasileiros: 5511999999999 (13 dígitos)
    if (cleanPhone.startsWith("55") && cleanPhone.length === 13) {
      return { valid: true, formatted: cleanPhone };
    }

    // Se não tem código do país, adiciona 55
    if (cleanPhone.length === 11) {
      return { valid: true, formatted: "55" + cleanPhone };
    }

    return { valid: false, error: "Número inválido. Use: 5511999999999" };
  }

  // === POLLING PARA STATUS ===
  startStatusPolling(sessionId, callback, interval = 5000) {
    const pollStatus = async () => {
      try {
        const status = await this.getConnectionStatus(sessionId);
        callback(status.data);
      } catch (error) {
        console.error("Erro ao buscar status:", error);
      }
    };

    const intervalId = setInterval(pollStatus, interval);

    // Primeira busca imediata
    pollStatus();

    return intervalId;
  }

  stopStatusPolling(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}

export const apiService = new ApiService();
