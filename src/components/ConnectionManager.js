import React, { useState, useEffect } from "react";

// Configuração da base URL da API
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

const ConnectionManager = ({
  tenantId,
  apiKey: propApiKey,
  onConnectionChange,
}) => {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [qrCode, setQrCode] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionInfo, setSessionInfo] = useState(null);
  const [sessionId, setSessionId] = useState(null); // Novo: armazenar sessionId
  const [usePhoneNumber, setUsePhoneNumber] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Novo: estado local para API Key se não foi passada como prop
  const [localApiKey, setLocalApiKey] = useState(propApiKey || "");

  // Usar API Key da prop ou do estado local
  const apiKey = propApiKey || localApiKey;

  // Debug: Log das props recebidas
  useEffect(() => {
    console.log("🔍 ConnectionManager - Props recebidas:");
    console.log("  tenantId:", tenantId, "(tipo:", typeof tenantId, ")");
    console.log("  propApiKey:", propApiKey ? "presente" : "ausente");
    console.log("  localApiKey:", localApiKey ? "presente" : "ausente");
    console.log("  apiKey final:", apiKey ? "presente" : "ausente");
    console.log("  onConnectionChange:", typeof onConnectionChange);
  }, [tenantId, propApiKey, localApiKey, apiKey, onConnectionChange]);

  useEffect(() => {
    // Validação detalhada da API Key (mais importante que tenantId)
    console.log("🔍 useEffect - Verificando API Key:");
    console.log("  apiKey:", apiKey ? "presente" : "ausente");
    console.log("  apiKey válida?", !!(apiKey && apiKey.trim()));

    if (!apiKey) {
      console.warn("⚠️ API Key está vazia ou undefined");
      setError("API Key é obrigatória para gerenciar conexões");
      return;
    }

    if (typeof apiKey !== "string") {
      console.warn("⚠️ API Key não é uma string:", typeof apiKey);
      setError(`API Key deve ser uma string, recebido: ${typeof apiKey}`);
      return;
    }

    if (!apiKey.trim()) {
      console.warn("⚠️ API Key está vazia após trim()");
      setError("API Key não pode estar vazia");
      return;
    }

    console.log("✅ API Key válida, iniciando verificação de conexões");
    checkExistingConnections();
  }, [apiKey]); // Mudou de tenantId para apiKey

  const getRequestHeaders = () => {
    const headers = {
      "Content-Type": "application/json",
    };

    // Adiciona API Key se fornecida
    if (apiKey && apiKey.trim()) {
      headers["X-API-Key"] = apiKey;
      console.log("🔑 API Key adicionada aos headers");
    } else {
      console.warn("⚠️ API Key não fornecida");
    }

    return headers;
  };

  // Nova função: verificar conexões existentes usando o endpoint correto da API
  const checkExistingConnections = async () => {
    if (!apiKey || !apiKey.trim()) {
      console.error("❌ checkExistingConnections: API Key não fornecida");
      setError("API Key é obrigatória para verificar conexões");
      return;
    }

    try {
      // Usar o endpoint correto da API: GET /api/connections
      // A API usa middleware que identifica o tenant pela API Key automaticamente
      const url = `${API_BASE_URL}/api/connections`;
      console.log("📡 Fazendo requisição para:", url);
      console.log("📡 Headers:", getRequestHeaders());

      const response = await fetch(url, {
        headers: getRequestHeaders(),
      });

      console.log("📡 Resposta HTTP:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => "Erro desconhecido");
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("📋 Resposta de conexões:", result);

      // A API retorna { success: true, data: [...] }
      const connections = result.data || [];

      // Como a API já filtra pelo tenant da API Key, pegamos a primeira conexão
      const currentConnection = connections.length > 0 ? connections[0] : null;

      if (currentConnection) {
        console.log("🔗 Conexão encontrada:", currentConnection);
        setSessionId(currentConnection.sessionId);
        setConnectionStatus(
          currentConnection.isConnected ? "connected" : "connecting"
        );

        if (currentConnection.isConnected && currentConnection.profileData) {
          setSessionInfo(currentConnection.profileData);
        }

        // Se está conectando, verificar status periodicamente
        if (!currentConnection.isConnected) {
          startPolling(currentConnection.sessionId);
        }
      } else {
        console.log("❌ Nenhuma conexão encontrada");
        setConnectionStatus("disconnected");
        setSessionId(null);
        setSessionInfo(null);
      }

      setError(""); // Limpa erro se sucesso

      if (onConnectionChange) {
        onConnectionChange(
          currentConnection
            ? currentConnection.isConnected
              ? "connected"
              : "connecting"
            : "disconnected"
        );
      }
    } catch (err) {
      console.error("❌ Erro ao verificar conexões:", err);
      setError(`Erro ao verificar conexões: ${err.message}`);
    }
  };

  // Nova função: verificar status de uma sessão específica
  const checkConnectionStatus = async (sessionId) => {
    if (!sessionId) {
      console.error("❌ checkConnectionStatus: sessionId não fornecido");
      return;
    }

    try {
      // Usar o endpoint correto: GET /api/connection/:sessionId/status
      const url = `${API_BASE_URL}/api/connection/${sessionId}/status`;
      console.log("📡 Verificando status da sessão:", sessionId);

      const response = await fetch(url, {
        headers: getRequestHeaders(),
      });

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => "Erro desconhecido");
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("📋 Status da sessão:", result);

      // A API retorna { success: true, data: { isConnected, qrCode, pairingCode } }
      const statusData = result.data || result;

      if (statusData.isConnected) {
        setConnectionStatus("connected");
        // Buscar informações do perfil se conectado
        await getSessionProfile(sessionId);
      } else {
        setConnectionStatus("connecting");

        // Atualizar QR Code ou Pairing Code se disponível
        if (statusData.qrCode && statusData.qrCode !== qrCode) {
          setQrCode(statusData.qrCode);
        }

        if (statusData.pairingCode && statusData.pairingCode !== pairingCode) {
          setPairingCode(statusData.pairingCode);
        }
      }

      if (onConnectionChange) {
        onConnectionChange(statusData.isConnected ? "connected" : "connecting");
      }

      return statusData;
    } catch (err) {
      console.error("❌ Erro ao verificar status da sessão:", err);
      setError(`Erro ao verificar status: ${err.message}`);
      return null;
    }
  };

  // Nova função: obter informações do perfil da sessão
  const getSessionProfile = async (sessionId) => {
    try {
      // Buscar novamente as conexões para obter dados do perfil
      const response = await fetch(`${API_BASE_URL}/api/connections`, {
        headers: getRequestHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        const connections = result.data || [];
        const connection = connections.find(
          (conn) => conn.sessionId === sessionId
        );

        if (connection && connection.profileData) {
          setSessionInfo(connection.profileData);
        }
      }
    } catch (err) {
      console.error("❌ Erro ao obter perfil da sessão:", err);
    }
  };

  const connectWhatsApp = async () => {
    if (!apiKey || !apiKey.trim()) {
      console.error("❌ connectWhatsApp: API Key inválida:", apiKey);
      setError("API Key é obrigatória para criar conexão");
      return;
    }

    setIsLoading(true);
    setError("");
    setQrCode("");
    setPairingCode("");

    try {
      const payload = {
        usePairingCode: usePhoneNumber,
        phoneNumber: usePhoneNumber ? phoneNumber : undefined,
      };
      // Não enviamos tenantId no payload - a API identifica pelo middleware da API Key

      console.log("🚀 Criando conexão com payload:", payload);
      console.log("🚀 URL:", `${API_BASE_URL}/api/connect`);

      // Usar o endpoint correto: POST /api/connect
      const response = await fetch(`${API_BASE_URL}/api/connect`, {
        method: "POST",
        headers: getRequestHeaders(),
        body: JSON.stringify(payload),
      });

      console.log("🚀 Resposta HTTP:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Erro na resposta:", errorData);
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("✅ Resposta da conexão:", result);

      // A API retorna { success: true, data: { sessionId, qrCode?, pairingCode? } }
      const connectionData = result.data || result;

      if (connectionData.sessionId) {
        setSessionId(connectionData.sessionId);
        console.log("🆔 Session ID recebido:", connectionData.sessionId);
      }

      if (connectionData.qrCode) {
        setQrCode(connectionData.qrCode);
        console.log("📱 QR Code recebido");
      }

      if (connectionData.pairingCode) {
        setPairingCode(connectionData.pairingCode);
        console.log("🔢 Pairing Code recebido:", connectionData.pairingCode);
      }

      setConnectionStatus("connecting");

      // Iniciar polling para verificar status
      if (connectionData.sessionId) {
        startPolling(connectionData.sessionId);
      }

      if (onConnectionChange) {
        onConnectionChange("connecting");
      }
    } catch (err) {
      console.error("❌ Erro ao conectar:", err);
      setError("Erro ao iniciar conexão: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    if (!sessionId) {
      setError("Nenhuma sessão ativa para desconectar");
      return;
    }

    try {
      console.log("🔌 Desconectando sessão:", sessionId);

      // Usar o endpoint correto: DELETE /api/connection/:sessionId
      const response = await fetch(
        `${API_BASE_URL}/api/connection/${sessionId}`,
        {
          method: "DELETE",
          headers: getRequestHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Limpar estado local
      setConnectionStatus("disconnected");
      setQrCode("");
      setPairingCode("");
      setSessionInfo(null);
      setSessionId(null);

      console.log("✅ Desconectado com sucesso");

      if (onConnectionChange) {
        onConnectionChange("disconnected");
      }
    } catch (err) {
      console.error("❌ Erro ao desconectar:", err);
      setError("Erro ao desconectar: " + err.message);
    }
  };

  const deleteConnection = async () => {
    if (!sessionId) {
      setError("Nenhuma sessão ativa para excluir");
      return;
    }

    setIsDeleting(true);
    try {
      console.log("🗑️ Excluindo sessão:", sessionId);

      // Usar o endpoint correto: DELETE /api/connection/:sessionId
      const deleteResponse = await fetch(
        `${API_BASE_URL}/api/connection/${sessionId}`,
        {
          method: "DELETE",
          headers: getRequestHeaders(),
        }
      );

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao excluir conexão");
      }

      // Limpar estado local
      setConnectionStatus("disconnected");
      setQrCode("");
      setPairingCode("");
      setSessionInfo(null);
      setSessionId(null);
      setShowDeleteConfirm(false);

      console.log("✅ Conexão excluída com sucesso");

      // Callback para notificar o componente pai
      if (onConnectionChange) {
        onConnectionChange("deleted");
      }
    } catch (err) {
      console.error("❌ Erro ao excluir conexão:", err);
      setError("Erro ao excluir conexão: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Função de polling atualizada para usar sessionId
  const startPolling = (sessionId) => {
    if (!sessionId) return;

    const interval = setInterval(async () => {
      const status = await checkConnectionStatus(sessionId);

      if (status && status.isConnected) {
        clearInterval(interval);
      }
    }, 3000); // Verificar a cada 3 segundos

    // Limpar interval após 5 minutos para evitar polling infinito
    setTimeout(() => {
      clearInterval(interval);
    }, 300000); // 5 minutos
  };

  const getStatusClasses = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-100 text-green-800";
      case "connecting":
        return "bg-yellow-100 text-yellow-800";
      case "disconnected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getDotClasses = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500 animate-pulse";
      case "disconnected":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Conectado";
      case "connecting":
        return "Conectando...";
      case "disconnected":
        return "Desconectado";
      default:
        return "Desconhecido";
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
            Gerenciador de Conexão WhatsApp
          </h2>
          <div className="text-sm text-gray-500 space-y-1">
            {tenantId ? (
              <p className="font-mono bg-green-50 text-green-700 px-2 py-1 rounded">
                ✅ Tenant: {tenantId}
              </p>
            ) : (
              <p className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">
                🔄 Tenant: identificado pela API Key
              </p>
            )}
            {sessionId && (
              <p className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                🆔 Session: {sessionId.substring(0, 8)}...
              </p>
            )}
            {apiKey ? (
              <p className="text-green-600">🔑 API Key: configurada</p>
            ) : (
              <p className="text-red-600">❌ API Key: não configurada</p>
            )}
          </div>
        </div>
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusClasses()}`}
        >
          <span className={`w-2 h-2 rounded-full ${getDotClasses()}`}></span>
          <span>{getStatusText()}</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
          <span className="text-base">⚠️</span>
          {error}
        </div>
      )}

      {/* Content */}
      <div className="mt-4">
        {/* Disconnected State */}
        {connectionStatus === "disconnected" && (
          <div className="space-y-4">
            {/* Campo para API Key se não foi fornecida como prop */}
            {!propApiKey && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">
                  🔑 Configuração da API Key
                </h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Para conectar ao WhatsApp, você precisa inserir sua API Key:
                </p>
                <input
                  type="text"
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  placeholder="Cole sua API Key aqui..."
                  className="w-full px-4 py-3 border border-yellow-300 rounded-lg text-base font-mono bg-white placeholder-gray-400 focus:outline-none focus:ring-3 focus:ring-yellow-100 focus:border-yellow-500"
                />
                <p className="text-xs text-yellow-600 mt-2">
                  💡 A API Key identifica automaticamente seu tenant e
                  permissões
                </p>
              </div>
            )}

            {/* Debug Info - Remove em produção */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
              <h4 className="font-medium text-gray-900 mb-2">🔍 Debug Info:</h4>
              <div className="space-y-1 text-gray-600">
                <p>
                  TenantId:{" "}
                  <span className="font-mono">
                    {tenantId || "identificado pela API Key"}
                  </span>
                </p>
                <p>
                  SessionId:{" "}
                  <span className="font-mono">{sessionId || "undefined"}</span>
                </p>
                <p>
                  API Key Source:{" "}
                  <span className="font-mono">
                    {propApiKey
                      ? "prop"
                      : localApiKey
                      ? "input local"
                      : "nenhuma"}
                  </span>
                </p>
                <p>
                  API Key válida:{" "}
                  <span
                    className={
                      apiKey && apiKey.trim()
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {apiKey && apiKey.trim() ? "✅ Sim" : "❌ Não"}
                  </span>
                </p>
                <p>
                  API Base URL:{" "}
                  <span className="font-mono">{API_BASE_URL}</span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer text-sm text-gray-700">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={usePhoneNumber}
                    onChange={(e) => setUsePhoneNumber(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all duration-200 ${
                      usePhoneNumber
                        ? "bg-blue-500 border-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {usePhoneNumber && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                  </div>
                </div>
                Usar código de pareamento (requer número de telefone)
              </label>

              {usePhoneNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de telefone (com código do país):
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ex: 5511999999999"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base transition-all duration-200 bg-white placeholder-gray-400 focus:outline-none focus:ring-3 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              )}

              <button
                onClick={connectWhatsApp}
                disabled={
                  isLoading ||
                  !apiKey ||
                  !apiKey.trim() ||
                  (usePhoneNumber && !phoneNumber)
                }
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white border-none rounded-lg text-base font-medium cursor-pointer transition-all duration-200 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Conectando...
                  </span>
                ) : (
                  "Conectar WhatsApp"
                )}
              </button>

              {(!apiKey || !apiKey.trim()) && (
                <p className="text-sm text-red-600 text-center">
                  ⚠️ API Key é obrigatória para conectar
                </p>
              )}
            </div>
          </div>
        )}

        {/* Connecting State */}
        {connectionStatus === "connecting" && (
          <div className="text-center">
            {qrCode && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Escaneie o QR Code no WhatsApp
                </h3>
                <div className="flex justify-center mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="max-w-64 sm:max-w-80 h-auto rounded-lg"
                  />
                </div>
                <div className="text-sm text-gray-600 leading-relaxed text-left bg-blue-50 p-4 rounded-lg space-y-1">
                  <p>
                    <strong>1.</strong> Abra o WhatsApp no seu telefone
                  </p>
                  <p>
                    <strong>2.</strong> Toque em Menu ou Configurações e
                    selecione Dispositivos conectados
                  </p>
                  <p>
                    <strong>3.</strong> Toque em Conectar um dispositivo
                  </p>
                  <p>
                    <strong>4.</strong> Aponte seu telefone para esta tela para
                    capturar o código
                  </p>
                </div>
              </div>
            )}

            {pairingCode && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Código de Pareamento
                </h3>
                <div className="flex justify-center mb-4">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-500 bg-blue-50 px-4 sm:px-6 py-3 sm:py-4 rounded-xl border-2 border-blue-200 tracking-widest font-mono">
                    {pairingCode}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Digite este código no WhatsApp do seu telefone para conectar.
                </p>
              </div>
            )}

            {sessionId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-700">
                  🆔 <strong>Session ID:</strong> {sessionId}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Aguardando confirmação do WhatsApp...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Connected State */}
        {connectionStatus === "connected" && (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 mb-5">
              <h3 className="text-lg font-semibold text-green-900 mb-4">
                Sessão Conectada
              </h3>

              {sessionId && (
                <div className="bg-white border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>Session ID:</strong>
                  </p>
                  <p className="font-mono text-xs text-gray-600 break-all">
                    {sessionId}
                  </p>
                </div>
              )}

              {sessionInfo && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-green-100 last:border-b-0">
                    <span className="font-medium text-slate-900">Nome:</span>
                    <span className="text-slate-600 font-mono">
                      {sessionInfo.name || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-green-100 last:border-b-0">
                    <span className="font-medium text-slate-900">
                      Telefone:
                    </span>
                    <span className="text-slate-600 font-mono">
                      {sessionInfo.phone || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-green-100 last:border-b-0">
                    <span className="font-medium text-slate-900">ID:</span>
                    <span className="text-slate-600 font-mono break-all">
                      {sessionInfo.id || "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={disconnect}
                className="flex-1 px-6 py-3 bg-red-500 text-white border-none rounded-lg text-base font-medium cursor-pointer transition-all duration-200 hover:bg-red-600"
              >
                Desconectar
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 px-6 py-3 bg-gray-600 text-white border-none rounded-lg text-base font-medium cursor-pointer transition-all duration-200 hover:bg-gray-700"
              >
                Excluir Conexão
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Excluir Conexão
              </h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir esta conexão? Esta ação não pode
                ser desfeita e você precisará configurar novamente.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium transition-all duration-200 hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  onClick={deleteConnection}
                  disabled={isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium transition-all duration-200 hover:bg-red-600 disabled:bg-red-300"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Excluindo...
                    </>
                  ) : (
                    "Confirmar Exclusão"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionManager;
