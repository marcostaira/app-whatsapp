import React, { useState, useEffect } from "react";
import TenantSetup from "./components/TenantSetup";
import ConnectionManager from "./components/ConnectionManager";
import MessageCenter from "./components/MessageCenter";
import ContactManager from "./components/ContactManager";
import ApiStatus from "./components/ApiStatus";
import { apiService } from "./services/apiService";

function App() {
  const [currentTenant, setCurrentTenant] = useState(null);
  const [activeConnection, setActiveConnection] = useState(null);
  const [connections, setConnections] = useState([]);
  const [activeTab, setActiveTab] = useState("connections");
  const [apiStatus, setApiStatus] = useState("checking");

  // Verificar status da API ao carregar
  useEffect(() => {
    checkApiHealth();

    // Verificar tenant salvo
    const savedTenant = localStorage.getItem("whatsapp_tenant");
    if (savedTenant) {
      try {
        const tenant = JSON.parse(savedTenant);
        setCurrentTenant(tenant);
        apiService.setApiKey(tenant.apiKey);
        loadConnections(tenant.id);
      } catch (error) {
        console.error("Erro ao carregar tenant salvo:", error);
        localStorage.removeItem("whatsapp_tenant");
      }
    }
  }, []);

  const checkApiHealth = async () => {
    try {
      const health = await apiService.checkHealth();
      setApiStatus(health.success ? "online" : "offline");
    } catch (error) {
      setApiStatus("offline");
    }
  };

  const loadConnections = async (tenantId) => {
    try {
      const response = await apiService.getConnections();
      // Garantir que sempre seja um array
      const connectionsData = Array.isArray(response.data) ? response.data : [];
      setConnections(connectionsData);
    } catch (error) {
      console.error("Erro ao carregar conexões:", error);
      setConnections([]); // Garantir array vazio em caso de erro
    }
  };

  const handleTenantSelected = (tenant) => {
    setCurrentTenant(tenant);
    apiService.setApiKey(tenant.apiKey);
    localStorage.setItem("whatsapp_tenant", JSON.stringify(tenant));
    loadConnections(tenant.id);
  };

  const handleTenantLogout = () => {
    setCurrentTenant(null);
    setActiveConnection(null);
    setConnections([]);
    apiService.setApiKey(null);
    localStorage.removeItem("whatsapp_tenant");
  };

  const handleConnectionCreated = (connection) => {
    setConnections((prev) => {
      const currentConnections = Array.isArray(prev) ? prev : [];
      return [...currentConnections, connection];
    });
    if (!activeConnection) {
      setActiveConnection(connection);
    }
  };

  const handleConnectionSelected = (connection) => {
    setActiveConnection(connection);
  };

  const handleConnectionStatusUpdate = (sessionId, status) => {
    setConnections((prev) => {
      const currentConnections = Array.isArray(prev) ? prev : [];
      return currentConnections.map((conn) =>
        conn.sessionId === sessionId ? { ...conn, status } : conn
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-whatsapp-gradient text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="flex items-center gap-3 text-2xl font-bold">
              <span className="text-3xl">📱</span>
              WhatsApp API Dashboard
            </h1>

            <div className="flex items-center gap-4">
              <ApiStatus status={apiStatus} onRefresh={checkApiHealth} />

              {currentTenant && (
                <div className="flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-full">
                  <span className="font-medium">{currentTenant.name}</span>
                  <button
                    onClick={handleTenantLogout}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 p-1 rounded-full transition-colors"
                    title="Trocar Tenant"
                  >
                    🔄
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {!currentTenant ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <TenantSetup onTenantSelected={handleTenantSelected} />
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh-200px)]">
            {/* Navigation Tabs */}
            <nav className="flex gap-2 mb-8 border-b border-gray-200 pb-4">
              <button
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === "connections"
                    ? "bg-green-500 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setActiveTab("connections")}
              >
                🔌 Conexões (
                {Array.isArray(connections) ? connections.length : 0})
              </button>

              <button
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === "messages"
                    ? "bg-green-500 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                } ${!activeConnection ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => setActiveTab("messages")}
                disabled={!activeConnection}
              >
                💬 Mensagens
              </button>

              <button
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === "contacts"
                    ? "bg-green-500 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                } ${!activeConnection ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => setActiveTab("contacts")}
                disabled={!activeConnection}
              >
                👥 Contatos
              </button>
            </nav>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === "connections" && (
                <ConnectionManager
                  tenant={currentTenant}
                  connections={connections}
                  activeConnection={activeConnection}
                  onConnectionCreated={handleConnectionCreated}
                  onConnectionSelected={handleConnectionSelected}
                  onStatusUpdate={handleConnectionStatusUpdate}
                />
              )}

              {activeTab === "messages" && activeConnection && (
                <MessageCenter
                  tenant={currentTenant}
                  connection={activeConnection}
                />
              )}

              {activeTab === "contacts" && activeConnection && (
                <ContactManager
                  tenant={currentTenant}
                  connection={activeConnection}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="flex items-center gap-2">
              🚀 Conectado à sua API WhatsApp
            </p>
            <div className="flex flex-col sm:flex-row gap-4 text-sm">
              <span>
                Base URL:{" "}
                {process.env.REACT_APP_API_URL || "http://localhost:3000"}
              </span>
              <span className="flex items-center gap-1">
                Status:
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiStatus === "online"
                      ? "bg-green-400"
                      : apiStatus === "offline"
                      ? "bg-red-400"
                      : "bg-yellow-400"
                  }`}
                ></span>
                {apiStatus}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
