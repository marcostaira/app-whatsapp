import React, { useState, useEffect } from "react";

const WebhookManager = ({ tenantId, onWebhookChange }) => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [eventTypes, setEventTypes] = useState({
    connection: true,
    message: true,
    message_status: true,
    contact: false,
    group: false,
    presence: false,
    qr_code: true,
    pairing_code: true,
    error: true,
  });

  useEffect(() => {
    loadWebhookConfig();
    loadWebhookLogs();
  }, [tenantId]);

  const loadWebhookConfig = async () => {
    try {
      const response = await fetch(`/api/webhook/config/${tenantId}`);
      const config = await response.json();

      if (config) {
        setWebhookUrl(config.url || "");
        setIsEnabled(config.enabled || false);
        setEventTypes({ ...eventTypes, ...config.eventTypes });
      }
    } catch (err) {
      console.error("Erro ao carregar configuração do webhook:", err);
    }
  };

  const loadWebhookLogs = async () => {
    try {
      const response = await fetch(`/api/webhook/logs/${tenantId}?limit=10`);
      const logs = await response.json();
      setWebhookLogs(logs || []);
    } catch (err) {
      console.error("Erro ao carregar logs do webhook:", err);
    }
  };

  const validateUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return ["http:", "https:"].includes(urlObj.protocol);
    } catch {
      return false;
    }
  };

  const saveWebhookConfig = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (!webhookUrl.trim()) {
      setError("URL do webhook é obrigatória");
      setIsLoading(false);
      return;
    }

    if (!validateUrl(webhookUrl)) {
      setError("URL inválida. Use http:// ou https://");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/webhook/config/${tenantId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl.trim(),
          enabled: isEnabled,
          eventTypes,
        }),
      });

      if (response.ok) {
        setSuccess("Configuração salva com sucesso!");
        if (onWebhookChange) {
          onWebhookChange({ url: webhookUrl, enabled: isEnabled, eventTypes });
        }
        setTimeout(() => setSuccess(""), 3000);
      } else {
        throw new Error("Erro ao salvar configuração");
      }
    } catch (err) {
      setError("Erro ao salvar configuração do webhook");
    } finally {
      setIsLoading(false);
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl.trim()) {
      setError("Informe a URL do webhook primeiro");
      return;
    }

    if (!validateUrl(webhookUrl)) {
      setError("URL inválida. Use http:// ou https://");
      return;
    }

    setIsTestLoading(true);
    setTestResult(null);
    setError("");

    try {
      const response = await fetch(`/api/webhook/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl.trim(),
          tenantId,
        }),
      });

      const result = await response.json();

      setTestResult({
        success: response.ok,
        message:
          result.message ||
          (response.ok ? "Teste enviado com sucesso!" : "Falha no teste"),
        statusCode: result.statusCode,
        responseTime: result.responseTime,
      });

      if (response.ok) {
        loadWebhookLogs(); // Recarrega os logs
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: "Erro ao testar webhook: " + err.message,
        statusCode: null,
        responseTime: null,
      });
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleEventTypeChange = (eventType, enabled) => {
    setEventTypes((prev) => ({
      ...prev,
      [eventType]: enabled,
    }));
  };

  const clearLogs = async () => {
    try {
      await fetch(`/api/webhook/logs/${tenantId}`, {
        method: "DELETE",
      });
      setWebhookLogs([]);
      setSuccess("Logs limpos com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Erro ao limpar logs");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "retry":
        return "🔄";
      default:
        return "⚪";
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString("pt-BR");
  };

  const eventTypeLabels = {
    connection: "Conexão",
    message: "Mensagens",
    message_status: "Status das Mensagens",
    contact: "Contatos",
    group: "Grupos",
    presence: "Presença",
    qr_code: "QR Code",
    pairing_code: "Código de Pareamento",
    error: "Erros",
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Gerenciador de Webhooks
          </h2>
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              isEnabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isEnabled ? "bg-green-500" : "bg-gray-400"
              }`}
            ></span>
            {isEnabled ? "Ativo" : "Inativo"}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            ✅ {success}
          </div>
        )}

        {/* URL Configuration */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL do Webhook
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://seu-servidor.com/webhook"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base transition-all duration-200 bg-white placeholder-gray-400 focus:outline-none focus:ring-3 focus:ring-blue-100 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Deve ser uma URL válida iniciando com http:// ou https://
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-200 ${
                    isEnabled
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  {isEnabled && (
                    <span className="text-white text-xs font-bold">✓</span>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700">
                Ativar webhook
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={saveWebhookConfig}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium transition-all duration-200 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                "Salvar Configuração"
              )}
            </button>

            <button
              onClick={testWebhook}
              disabled={isTestLoading || !webhookUrl.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg font-medium transition-all duration-200 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isTestLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Testando...
                </>
              ) : (
                "Testar Webhook"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Event Types Configuration */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Tipos de Eventos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(eventTypeLabels).map(([eventType, label]) => (
            <label
              key={eventType}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={eventTypes[eventType]}
                  onChange={(e) =>
                    handleEventTypeChange(eventType, e.target.checked)
                  }
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all duration-200 ${
                    eventTypes[eventType]
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  {eventTypes[eventType] && (
                    <span className="text-white text-xs font-bold">✓</span>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Resultado do Teste
          </h3>
          <div
            className={`p-4 rounded-lg border-l-4 ${
              testResult.success
                ? "bg-green-50 border-green-500 text-green-800"
                : "bg-red-50 border-red-500 text-red-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">
                {testResult.success ? "✅" : "❌"}
              </span>
              <div className="flex-1">
                <p className="font-medium">{testResult.message}</p>
                {testResult.statusCode && (
                  <p className="text-sm mt-1">
                    Status Code: {testResult.statusCode}
                  </p>
                )}
                {testResult.responseTime && (
                  <p className="text-sm">
                    Tempo de Resposta: {testResult.responseTime}ms
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Logs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Logs Recentes ({webhookLogs.length})
          </h3>
          {webhookLogs.length > 0 && (
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
            >
              Limpar Logs
            </button>
          )}
        </div>

        {webhookLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>Nenhum log encontrado</p>
            <p className="text-sm">
              Os logs aparecerão aqui quando os webhooks forem enviados
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {webhookLogs.map((log, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-lg">{getStatusIcon(log.status)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900 text-sm">
                      {log.event}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  {log.message && (
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {log.message}
                    </p>
                  )}
                  {log.statusCode && (
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded mt-1 ${
                        log.statusCode >= 200 && log.statusCode < 300
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {log.statusCode}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebhookManager;
