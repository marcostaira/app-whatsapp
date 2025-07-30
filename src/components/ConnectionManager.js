import React, { useState, useEffect } from "react";
import { apiService } from "../services/apiService";
import { webhookService } from "../services/webhookService";
import WebhookManager from "./WebhookManager";

const ConnectionManager = ({
  tenant,
  connections,
  activeConnection,
  onConnectionCreated,
  onConnectionSelected,
  onStatusUpdate,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [connectionData, setConnectionData] = useState({
    usePairingCode: false,
    phoneNumber: "",
  });
  const [qrCode, setQrCode] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [statusPolling, setStatusPolling] = useState({});
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);

  useEffect(() => {
    // Configurar listener para eventos de webhook
    const removeListener = webhookService.addListener((event) => {
      handleWebhookEvent(event);
    });

    // Garantir que connections é um array
    const connectionsArray = Array.isArray(connections) ? connections : [];

    // Iniciar polling para conexões ativas
    connectionsArray.forEach((connection) => {
      if (
        connection &&
        (connection.status === "connecting" ||
          connection.status === "qr" ||
          connection.status === "pairing")
      ) {
        startStatusPolling(connection.sessionId);
      }
    });

    return () => {
      // Limpar webhook listener
      removeListener();

      // Limpar polling ao desmontar
      Object.values(statusPolling).forEach((intervalId) => {
        apiService.stopStatusPolling(intervalId);
      });
    };
  }, [connections]);

  // Manipular eventos recebidos via webhook
  const handleWebhookEvent = (event) => {
    console.log("Evento webhook recebido:", event);

    switch (event.event) {
      case "qr_code":
        if (event.data.qrCode) {
          setQrCode(event.data.qrCode);
          console.log("QR Code recebido via webhook");
        }
        break;

      case "pairing_code":
        if (event.data.pairingCode) {
          setPairingCode(event.data.pairingCode);
          console.log("Código de pareamento recebido via webhook");
        }
        break;

      case "connection":
        if (event.data.sessionId && event.data.status) {
          onStatusUpdate(event.data.sessionId, event.data.status);
          console.log(
            `Status da conexão ${event.data.sessionId}: ${event.data.status}`
          );

          // Se conectou com sucesso, limpar QR/pairing codes
          if (event.data.status === "connected") {
            setQrCode(null);
            setPairingCode(null);
            stopStatusPolling(event.data.sessionId);
          }
        }
        break;

      case "message":
        console.log("Nova mensagem recebida via webhook:", event.data);
        break;

      default:
        console.log("Evento webhook não tratado:", event.event);
    }
  };

  const startStatusPolling = (sessionId) => {
    if (statusPolling[sessionId]) return; // Já está fazendo polling

    const intervalId = apiService.startStatusPolling(
      sessionId,
      (status) => {
        onStatusUpdate(sessionId, status.status);

        if (status.qrCode) {
          setQrCode(status.qrCode);
        }

        if (status.pairingCode) {
          setPairingCode(status.pairingCode);
        }

        // Parar polling se conectado ou desconectado
        if (status.status === "connected" || status.status === "disconnected") {
          stopStatusPolling(sessionId);
        }
      },
      3000 // 3 segundos
    );

    setStatusPolling((prev) => ({
      ...prev,
      [sessionId]: intervalId,
    }));
  };

  const stopStatusPolling = (sessionId) => {
    if (statusPolling[sessionId]) {
      apiService.stopStatusPolling(statusPolling[sessionId]);
      setStatusPolling((prev) => {
        const newPolling = { ...prev };
        delete newPolling[sessionId];
        return newPolling;
      });
    }
  };

  const handleCreateConnection = async (e) => {
    e.preventDefault();

    if (connectionData.usePairingCode && !connectionData.phoneNumber) {
      alert("Número de telefone é obrigatório para código de pareamento");
      return;
    }

    try {
      setIsCreating(true);
      setQrCode(null);
      setPairingCode(null);

      const response = await apiService.createConnection({
        usePairingCode: connectionData.usePairingCode,
        phoneNumber: connectionData.phoneNumber || undefined,
      });

      if (response.success) {
        const newConnection = response.data;
        onConnectionCreated(newConnection);
        setShowCreateForm(false);

        // Iniciar polling E webhook para esta nova conexão
        startStatusPolling(newConnection.sessionId);
        webhookService.startPolling(newConnection.sessionId);

        // Reset form
        setConnectionData({
          usePairingCode: false,
          phoneNumber: "",
        });
      }
    } catch (error) {
      alert("Erro ao criar conexão: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDisconnect = async (sessionId) => {
    if (!window.confirm("Tem certeza que deseja desconectar esta sessão?")) {
      return;
    }

    try {
      await apiService.disconnectSession(sessionId);
      onStatusUpdate(sessionId, "disconnected");
      stopStatusPolling(sessionId);
      webhookService.stopPolling();
    } catch (error) {
      alert("Erro ao desconectar: " + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "qr":
        return "bg-blue-500";
      case "pairing":
        return "bg-purple-500";
      case "disconnected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "connected":
        return "✅";
      case "connecting":
        return "🔄";
      case "qr":
        return "📱";
      case "pairing":
        return "🔢";
      case "disconnected":
        return "❌";
      default:
        return "❓";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "connected":
        return "Conectado";
      case "connecting":
        return "Conectando...";
      case "qr":
        return "Aguardando QR Code";
      case "pairing":
        return "Aguardando Código";
      case "disconnected":
        return "Desconectado";
      default:
        return "Status Desconhecido";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          🔌 Gerenciador de Conexões
        </h2>

        <div className="flex flex-wrap gap-3">
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showWebhookConfig
                ? "bg-purple-600 text-white"
                : "bg-purple-500 hover:bg-purple-600 text-white"
            }`}
            onClick={() => setShowWebhookConfig(!showWebhookConfig)}
          >
            🔗 Webhook
          </button>

          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={() => setShowCreateForm(true)}
            disabled={isCreating}
          >
            ➕ Nova Conexão
          </button>
        </div>
      </div>

      {/* Configuração de Webhook */}
      {showWebhookConfig && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <WebhookManager
            tenant={tenant}
            onWebhookReceived={handleWebhookEvent}
          />
        </div>
      )}

      {/* Lista de Conexões */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!Array.isArray(connections) || connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500">
            <div className="text-6xl mb-4">📵</div>
            <p className="text-lg font-medium mb-2">
              Nenhuma conexão encontrada
            </p>
            <p className="text-sm">Crie sua primeira conexão WhatsApp</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {connections.map((connection) => (
              <div
                key={connection.sessionId}
                className={`bg-white border-2 rounded-lg p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${
                  activeConnection?.sessionId === connection.sessionId
                    ? "border-green-500 shadow-md"
                    : "border-gray-200"
                }`}
                onClick={() => onConnectionSelected(connection)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-800 mb-1">
                      Sessão {connection.sessionId.substring(0, 8)}...
                    </h4>
                    <p className="text-xs text-gray-500 font-mono">
                      {connection.sessionId}
                    </p>
                  </div>

                  <div
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor(
                      connection.status
                    )}`}
                  >
                    <span>{getStatusIcon(connection.status)}</span>
                    <span>{getStatusText(connection.status)}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      Tipo:
                    </span>
                    <span className="text-sm text-gray-800">
                      {connection.usePairingCode
                        ? "🔢 Código de Pareamento"
                        : "📱 QR Code"}
                    </span>
                  </div>

                  {connection.phoneNumber && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">
                        Telefone:
                      </span>
                      <span className="text-sm text-gray-800">
                        {connection.phoneNumber}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      Criado:
                    </span>
                    <span className="text-sm text-gray-800">
                      {new Date(connection.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center">
                  {connection.status === "connected" && (
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisconnect(connection.sessionId);
                      }}
                    >
                      🔌 Desconectar
                    </button>
                  )}

                  {(connection.status === "qr" ||
                    connection.status === "pairing") && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600 italic">
                        {connection.status === "qr"
                          ? "Escaneie o QR Code"
                          : "Digite o código no WhatsApp"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Display */}
      {qrCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              📱 Escaneie o QR Code
            </h3>

            <div className="mb-6">
              <img
                src={qrCode}
                alt="QR Code WhatsApp"
                className="w-72 h-72 mx-auto border-4 border-green-500 rounded-lg p-2"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <p className="font-semibold text-gray-800 mb-2">Como conectar:</p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Abra o WhatsApp no seu telefone</li>
                <li>Toque em Menu {">"} Aparelhos conectados</li>
                <li>Toque em "Conectar um aparelho"</li>
                <li>Escaneie este QR Code</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Pairing Code Display */}
      {pairingCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              🔢 Código de Pareamento
            </h3>

            <div className="bg-gray-100 rounded-lg p-6 mb-6">
              <div className="text-4xl font-bold text-green-600 font-mono tracking-wider">
                {pairingCode}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <p className="font-semibold text-gray-800 mb-2">Como conectar:</p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Abra o WhatsApp no seu telefone</li>
                <li>Toque em Menu {">"} Aparelhos conectados</li>
                <li>Toque em "Conectar um aparelho"</li>
                <li>
                  Digite este código: <strong>{pairingCode}</strong>
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Form para Nova Conexão */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                🆕 Nova Conexão WhatsApp
              </h3>
              <button
                className="text-red-500 hover:text-red-700 text-xl"
                onClick={() => setShowCreateForm(false)}
                disabled={isCreating}
              >
                ✖️
              </button>
            </div>

            <form onSubmit={handleCreateConnection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Método de Conexão:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="connectionMethod"
                      checked={!connectionData.usePairingCode}
                      onChange={() =>
                        setConnectionData((prev) => ({
                          ...prev,
                          usePairingCode: false,
                          phoneNumber: "",
                        }))
                      }
                      disabled={isCreating}
                      className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-800">
                        📱 QR Code (recomendado)
                      </div>
                      <div className="text-sm text-gray-500">
                        Mais rápido e fácil
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="connectionMethod"
                      checked={connectionData.usePairingCode}
                      onChange={() =>
                        setConnectionData((prev) => ({
                          ...prev,
                          usePairingCode: true,
                        }))
                      }
                      disabled={isCreating}
                      className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-800">
                        🔢 Código de Pareamento
                      </div>
                      <div className="text-sm text-gray-500">
                        Requer número de telefone
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {connectionData.usePairingCode && (
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Número do WhatsApp *
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={connectionData.phoneNumber}
                    onChange={(e) =>
                      setConnectionData((prev) => ({
                        ...prev,
                        phoneNumber: e.target.value,
                      }))
                    }
                    placeholder="5511999999999"
                    disabled={isCreating}
                    required={connectionData.usePairingCode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Digite apenas números (código país + DDD + número)
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={() => setShowCreateForm(false)}
                  disabled={isCreating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={
                    isCreating ||
                    (connectionData.usePairingCode &&
                      !connectionData.phoneNumber)
                  }
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Criando...
                    </>
                  ) : (
                    "Criar Conexão"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionManager;
