import React, { useState, useEffect } from "react";
import { apiService } from "../services/apiService";
import WebhookInstructions from "./WebhookInstructions";

const WebhookManager = ({ tenant, onWebhookReceived }) => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState("inactive");
  const [receivedEvents, setReceivedEvents] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [webhookPort, setWebhookPort] = useState(3005);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (tenant?.webhookUrl) {
      setWebhookUrl(tenant.webhookUrl);
      setWebhookStatus("configured");
    }
  }, [tenant]);

  // Gerar URL do webhook local
  const generateLocalWebhookUrl = () => {
    const localUrl = `http://localhost:${webhookPort}/webhook`;
    setWebhookUrl(localUrl);
    return localUrl;
  };

  // Configurar webhook na API
  const handleConfigureWebhook = async (e) => {
    e.preventDefault();

    if (!webhookUrl.trim()) {
      alert("URL do webhook é obrigatória");
      return;
    }

    try {
      setIsConfiguring(true);

      // Atualizar tenant com nova URL de webhook
      await apiService.updateTenant(tenant.id, {
        webhookUrl: webhookUrl,
      });

      // Testar webhook
      const testResult = await apiService.testWebhook(webhookUrl);

      if (testResult.success) {
        setWebhookStatus("active");
        alert("Webhook configurado e testado com sucesso!");
      } else {
        setWebhookStatus("configured");
        alert(
          "Webhook configurado, mas teste falhou. Verifique se a URL está acessível."
        );
      }
    } catch (error) {
      alert("Erro ao configurar webhook: " + error.message);
      setWebhookStatus("error");
    } finally {
      setIsConfiguring(false);
    }
  };

  // Iniciar servidor webhook local (simulação)
  const startLocalWebhookServer = () => {
    setIsListening(true);
    setWebhookStatus("listening");

    // Simular recebimento de webhooks via polling
    const pollForWebhooks = setInterval(() => {
      // Em uma implementação real, isso seria um servidor Express
      // Por enquanto, vamos simular eventos
      checkForNewEvents();
    }, 2000);

    // Salvar intervalId para cleanup
    window.webhookPollingInterval = pollForWebhooks;
  };

  const stopLocalWebhookServer = () => {
    setIsListening(false);
    setWebhookStatus("inactive");

    if (window.webhookPollingInterval) {
      clearInterval(window.webhookPollingInterval);
      window.webhookPollingInterval = null;
    }
  };

  // Verificar novos eventos (simulação)
  const checkForNewEvents = async () => {
    try {
      // Em uma implementação real, isso consultaria seu endpoint de eventos
      // Por agora, vamos simular com dados mock
      const mockEvent = {
        id: Date.now(),
        tenantId: tenant?.id,
        event: "qr_code",
        data: {
          qrCode:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
          sessionId: "session-123",
        },
        timestamp: new Date().toISOString(),
      };

      // Adicionar evento à lista
      setReceivedEvents((prev) => [mockEvent, ...prev.slice(0, 19)]); // Manter apenas 20 eventos

      // Notificar componente pai
      onWebhookReceived?.(mockEvent);
    } catch (error) {
      console.error("Erro ao verificar eventos:", error);
    }
  };

  const clearEvents = () => {
    setReceivedEvents([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "listening":
        return "bg-blue-500";
      case "configured":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Ativo e Testado";
      case "listening":
        return "Escutando Eventos";
      case "configured":
        return "Configurado";
      case "error":
        return "Erro";
      default:
        return "Inativo";
    }
  };

  const formatEventData = (event) => {
    try {
      return JSON.stringify(event.data, null, 2);
    } catch {
      return "Dados inválidos";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-gray-800">
          🔗 Configuração de Webhook
        </h3>

        <div className="flex items-center gap-3">
          <button
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              showInstructions
                ? "bg-blue-600 text-white"
                : "bg-gray-500 hover:bg-gray-600 text-white"
            }`}
            onClick={() => setShowInstructions(!showInstructions)}
          >
            📖 Instruções
          </button>

          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor(
              webhookStatus
            )}`}
          >
            <span>{getStatusText(webhookStatus)}</span>
          </div>
        </div>
      </div>

      {/* Instruções de Configuração */}
      {showInstructions && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <WebhookInstructions />
        </div>
      )}

      {/* Configuração do Webhook */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <form onSubmit={handleConfigureWebhook} className="space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              📡 URL do Webhook
            </h4>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://seu-site.com/webhook"
                disabled={isConfiguring}
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
              />
              <button
                type="button"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors disabled:bg-gray-400"
                onClick={generateLocalWebhookUrl}
                disabled={isConfiguring}
              >
                🏠 Local
              </button>
            </div>
            <p className="text-sm text-gray-500">
              URL onde sua API enviará os eventos (QR Code, mensagens, status)
            </p>
          </div>

          {webhookUrl.includes("localhost") && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-blue-800 mb-3">
                🖥️ Servidor Local
              </h4>

              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Porta:
                  </label>
                  <input
                    type="number"
                    value={webhookPort}
                    onChange={(e) => setWebhookPort(e.target.value)}
                    min="3000"
                    max="9999"
                    disabled={isListening}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  {!isListening ? (
                    <button
                      type="button"
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      onClick={startLocalWebhookServer}
                    >
                      ▶️ Iniciar Servidor
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      onClick={stopLocalWebhookServer}
                    >
                      ⏹️ Parar Servidor
                    </button>
                  )}
                </div>
              </div>

              {isListening && (
                <div className="bg-green-100 border border-green-300 rounded p-3">
                  <p className="text-sm text-green-800">
                    ✅ Servidor webhook rodando em:
                    <code className="bg-white px-2 py-1 rounded ml-1 font-mono">
                      http://localhost:{webhookPort}/webhook
                    </code>
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Configure este URL na sua API WhatsApp para receber eventos.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isConfiguring || !webhookUrl.trim()}
            >
              {isConfiguring ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Configurando...
                </>
              ) : (
                <>🔧 Configurar Webhook</>
              )}
            </button>

            <button
              type="button"
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:bg-gray-400"
              onClick={() => apiService.testWebhook(webhookUrl)}
              disabled={isConfiguring || !webhookUrl.trim()}
            >
              🧪 Testar
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Eventos Recebidos */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800">
            📋 Eventos Recebidos ({receivedEvents.length})
          </h4>

          <div className="flex gap-2">
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors disabled:bg-gray-400"
              onClick={clearEvents}
              disabled={receivedEvents.length === 0}
            >
              🗑️ Limpar
            </button>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
              onClick={checkForNewEvents}
            >
              🔄 Atualizar
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {receivedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-lg font-medium mb-2">
                Nenhum evento recebido ainda
              </p>
              <p className="text-sm text-center">
                Configure o webhook e aguarde os eventos da API
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {receivedEvents.map((event) => (
                <div
                  key={event.id}
                  className={`border rounded-lg p-4 transition-all hover:-translate-y-1 hover:shadow-md ${
                    event.event === "qr_code"
                      ? "border-l-4 border-l-purple-500"
                      : event.event === "pairing_code"
                      ? "border-l-4 border-l-orange-500"
                      : event.event === "connection"
                      ? "border-l-4 border-l-emerald-500"
                      : event.event === "message"
                      ? "border-l-4 border-l-cyan-500"
                      : "border-l-4 border-l-gray-500"
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium uppercase">
                        {event.event}
                      </span>
                      <span className="text-sm text-gray-600">
                        Tenant: {event.tenantId}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <div>
                    {event.event === "qr_code" && event.data.qrCode && (
                      <div className="flex items-center gap-4 bg-white p-3 rounded border mb-2">
                        <img
                          src={event.data.qrCode}
                          alt="QR Code"
                          className="w-16 h-16 border rounded"
                        />
                        <span className="text-green-600 font-medium">
                          QR Code recebido!
                        </span>
                      </div>
                    )}

                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800 py-2">
                        Ver dados completos
                      </summary>
                      <pre className="bg-gray-50 border rounded p-3 text-xs font-mono max-h-48 overflow-y-auto text-gray-800 mt-2">
                        {formatEventData(event)}
                      </pre>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-yellow-800 mb-3">
          📖 Como Configurar
        </h4>
        <ol className="text-sm text-yellow-700 space-y-2 list-decimal list-inside">
          <li>
            <strong>URL Pública:</strong> Use serviços como ngrok, localtunnel
            ou deploy em nuvem
          </li>
          <li>
            <strong>Configurar na API:</strong> Configure esta URL no tenant da
            sua API WhatsApp
          </li>
          <li>
            <strong>Eventos Suportados:</strong> qr_code, pairing_code, message,
            connection, etc.
          </li>
          <li>
            <strong>Teste:</strong> Use o botão "Testar" para verificar se o
            webhook está funcionando
          </li>
        </ol>

        <div className="bg-white border border-yellow-300 rounded p-3 mt-4">
          <h5 className="font-semibold text-yellow-800 mb-2">
            💡 Exemplo com ngrok:
          </h5>
          <code className="text-sm text-gray-800 block">
            # Terminal 1: Iniciar servidor local
            <br />
            npm start
            <br />
            <br />
            # Terminal 2: Expor webhook publicamente
            <br />
            ngrok http {webhookPort}
            <br />
            <br /># Use a URL gerada: https://abc123.ngrok.io/webhook
          </code>
        </div>
      </div>
    </div>
  );
};

export default WebhookManager;
