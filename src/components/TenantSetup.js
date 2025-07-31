import React, { useState, useEffect } from "react";
import { apiService } from "../services/apiService";
import ConnectionManager from "./ConnectionManager"; // ✅ IMPORTAR O CONNECTION MANAGER

const TenantSetup = ({ onTenantSelected }) => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null); // ✅ ESTADO PARA TENANT SELECIONADO
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    receiveGroupMessages: true,
    autoReconnect: true,
    webhookUrl: "",
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      console.log("🔍 DEBUG - Carregando tenants...");

      const response = await apiService.getTenants();
      console.log("🔍 DEBUG - Resposta da API:", response);

      const tenantsData = Array.isArray(response.data) ? response.data : [];
      console.log("🔍 DEBUG - Tenants processados:", tenantsData);
      console.log("🔍 DEBUG - Primeiro tenant:", tenantsData[0]);

      setTenants(tenantsData);
    } catch (error) {
      console.error("❌ Erro ao carregar tenants:", error);
      setTenants([]); // Garantir array vazio em caso de erro
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Nome do tenant é obrigatório");
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.createTenant(formData);

      if (response.success) {
        const newTenant = response.data;
        setTenants((prev) => {
          const currentTenants = Array.isArray(prev) ? prev : [];
          return [...currentTenants, newTenant];
        });
        setShowCreateForm(false);
        setFormData({
          name: "",
          receiveGroupMessages: true,
          autoReconnect: true,
          webhookUrl: "",
        });

        // ✅ SELECIONAR O TENANT CRIADO AUTOMATICAMENTE
        handleSelectTenant(newTenant);
      }
    } catch (error) {
      alert("Erro ao criar tenant: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTenant = (tenant) => {
    console.log("🔍 DEBUG - handleSelectTenant chamado");
    console.log("  tenant recebido:", tenant);
    console.log("  tenant.id:", tenant?.id);
    console.log("  tenant.apiKey:", tenant?.apiKey);
    console.log("  typeof tenant:", typeof tenant);
    console.log("  tenant completo:", JSON.stringify(tenant, null, 2));

    setSelectedTenant(tenant); // ✅ DEFINIR TENANT SELECIONADO

    // Manter callback original se necessário
    if (onTenantSelected) {
      onTenantSelected(tenant);
    }
  };

  const handleBackToSelection = () => {
    setSelectedTenant(null); // ✅ VOLTAR PARA SELEÇÃO
  };

  const handleConnectionChange = (status) => {
    console.log("🔗 Status da conexão mudou:", status);
    // Aqui você pode adicionar lógica adicional se necessário
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ✅ SE TENANT SELECIONADO, MOSTRAR CONNECTION MANAGER
  if (selectedTenant) {
    console.log("🔍 DEBUG - Renderizando ConnectionManager");
    console.log("  selectedTenant:", selectedTenant);
    console.log("  selectedTenant.id:", selectedTenant.id);
    console.log("  selectedTenant.apiKey:", selectedTenant.apiKey);

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header com informações do tenant selecionado */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  WhatsApp API - {selectedTenant.name || "Nome não encontrado"}
                </h1>
                <p className="text-sm text-gray-500 font-mono">
                  Tenant ID: {selectedTenant.id || "ID não encontrado"}
                </p>
                <p className="text-xs text-gray-400">
                  API Key: {selectedTenant.apiKey ? "Presente" : "Ausente"}
                </p>
              </div>
              <button
                onClick={handleBackToSelection}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                ← Voltar para Seleção
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ✅ DEBUG: Mostrar props que serão passadas */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-yellow-800 mb-2">
              🔍 Props sendo passadas para ConnectionManager:
            </h3>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>
                tenantId:{" "}
                <span className="font-mono">
                  {selectedTenant.id || "undefined"}
                </span>
              </p>
              <p>
                apiKey:{" "}
                <span className="font-mono">
                  {selectedTenant.apiKey || "undefined"}
                </span>
              </p>
              <p>
                selectedTenant completo:{" "}
                <pre className="text-xs mt-2 bg-yellow-100 p-2 rounded">
                  {JSON.stringify(selectedTenant, null, 2)}
                </pre>
              </p>
            </div>
          </div>

          {/* ✅ AQUI ESTÁ O CONNECTION MANAGER COM TENANT ID CORRETO */}
          <ConnectionManager
            tenantId={selectedTenant.id} // ✅ PASSANDO O TENANT ID
            apiKey={selectedTenant.apiKey} // ✅ PASSANDO A API KEY DO TENANT
            onConnectionChange={handleConnectionChange}
          />
        </div>
      </div>
    );
  }

  // ✅ TELA DE SELEÇÃO DE TENANT (código original)
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          🏢 Configuração do Tenant
        </h2>
        <p className="text-gray-600">
          Selecione um tenant existente ou crie um novo para começar
        </p>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-white border-t-green-500 rounded-full animate-spin mb-4"></div>
          <p className="text-white text-lg">Carregando...</p>
        </div>
      )}

      {!showCreateForm ? (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Tenants Disponíveis
            </h3>

            {!Array.isArray(tenants) || tenants.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">📭 Nenhum tenant encontrado</p>
                <p>Crie seu primeiro tenant para começar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {(Array.isArray(tenants) ? tenants : []).map((tenant) => (
                  <div
                    key={tenant.id}
                    className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 cursor-pointer transition-all hover:border-green-500 hover:-translate-y-1 hover:shadow-md"
                    onClick={() => handleSelectTenant(tenant)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-semibold text-gray-800">
                        {tenant.name}
                      </h4>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                        ID: {tenant.id.substring(0, 8)}...
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">
                          Grupos:
                        </span>
                        <span
                          className={`text-sm ${
                            tenant.receiveGroupMessages
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {tenant.receiveGroupMessages
                            ? "✅ Ativo"
                            : "❌ Inativo"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">
                          Auto-Reconectar:
                        </span>
                        <span
                          className={`text-sm ${
                            tenant.autoReconnect
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {tenant.autoReconnect ? "✅ Sim" : "❌ Não"}
                        </span>
                      </div>

                      {tenant.webhookUrl && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">
                            Webhook:
                          </span>
                          <span
                            className="text-sm text-blue-600"
                            title={tenant.webhookUrl}
                          >
                            🔗 Configurado
                          </span>
                        </div>
                      )}

                      {/* ✅ MOSTRAR API KEY STATUS */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">
                          API Key:
                        </span>
                        <span className="text-sm text-blue-600">
                          {tenant.apiKey
                            ? "🔑 Configurada"
                            : "⚠️ Não configurada"}
                        </span>
                      </div>
                    </div>

                    <button className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                      Selecionar Tenant
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-center pt-6 border-t border-gray-200">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-8 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={() => setShowCreateForm(true)}
              disabled={isLoading}
            >
              ➕ Criar Novo Tenant
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">
              🆕 Criar Novo Tenant
            </h3>
            <button
              className="text-red-500 hover:text-red-700 text-xl"
              onClick={() => setShowCreateForm(false)}
              disabled={isLoading}
            >
              ✖️
            </button>
          </div>

          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nome do Tenant *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Minha Empresa"
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="webhookUrl"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                URL do Webhook (opcional)
              </label>
              <input
                type="url"
                id="webhookUrl"
                name="webhookUrl"
                value={formData.webhookUrl}
                onChange={handleInputChange}
                placeholder="https://meusite.com/webhook"
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL para receber notificações em tempo real
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="receiveGroupMessages"
                  checked={formData.receiveGroupMessages}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Receber mensagens de grupos
                </span>
              </label>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="autoReconnect"
                  checked={formData.autoReconnect}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Reconexão automática
                </span>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={() => setShowCreateForm(false)}
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={isLoading || !formData.name.trim()}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Criando...
                  </>
                ) : (
                  "Criar Tenant"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TenantSetup;
