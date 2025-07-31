import React, { useState, useEffect } from "react";
import { api, API_ENDPOINTS } from "../config/api";

const ConnectionsList = ({ tenantId, onConnectionSelect }) => {
  const [connections, setConnections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadConnections();

    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadConnections, 30000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const loadConnections = async () => {
    try {
      setError("");
      const data = await api.get(API_ENDPOINTS.connection.list(tenantId));
      setConnections(data || []);
    } catch (err) {
      setError("Erro ao carregar conexões: " + err.message);
      console.error("Load connections error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConnection = async (sessionId) => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/connection/${sessionId}`);

      // Remove da lista local
      setConnections((prev) =>
        prev.filter((conn) => conn.sessionId !== sessionId)
      );
      setDeleteConfirm(null);

      // Notifica o componente pai se a conexão deletada era a selecionada
      if (onConnectionSelect) {
        onConnectionSelect(null);
      }
    } catch (err) {
      setError("Erro ao excluir conexão: " + err.message);
      console.error("Delete connection error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800 border-green-200";
      case "connecting":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "disconnected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "connected":
        return "🟢";
      case "connecting":
        return "🟡";
      case "disconnected":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "connected":
        return "Conectado";
      case "connecting":
        return "Conectando";
      case "disconnected":
        return "Desconectado";
      default:
        return "Desconhecido";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const getTimeSince = (dateString) => {
    if (!dateString) return "N/A";

    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Conexões do Tenant
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Carregando conexões...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Conexões do Tenant ({connections.length})
        </h3>
        <button
          onClick={loadConnections}
          className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
        >
          🔄 Atualizar
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      {connections.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📱</div>
          <p className="font-medium">Nenhuma conexão encontrada</p>
          <p className="text-sm">
            As conexões aparecerão aqui quando forem criadas
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <div
              key={connection.sessionId}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        connection.status
                      )}`}
                    >
                      {getStatusIcon(connection.status)}
                      {getStatusText(connection.status)}
                    </span>

                    {connection.profileData?.name && (
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {connection.profileData.name}
                      </span>
                    )}
                  </div>

                  {/* Connection Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Session ID:</span>
                      <div className="font-mono text-xs text-gray-700 truncate">
                        {connection.sessionId}
                      </div>
                    </div>

                    {connection.profileData?.phone && (
                      <div>
                        <span className="text-gray-500">Telefone:</span>
                        <div className="font-mono text-gray-700">
                          {connection.profileData.phone}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-gray-500">Última Conexão:</span>
                      <div className="text-gray-700">
                        {getTimeSince(connection.lastConnectedAt)}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">Criado em:</span>
                      <div className="text-gray-700">
                        {formatDate(connection.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {connection.profileData?.id && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                      <span className="text-gray-500">WhatsApp ID:</span>
                      <div className="font-mono text-gray-700 break-all">
                        {connection.profileData.id}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {connection.status === "connected" && onConnectionSelect && (
                    <button
                      onClick={() => onConnectionSelect(connection)}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      Selecionar
                    </button>
                  )}

                  <button
                    onClick={() => setDeleteConfirm(connection)}
                    className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Excluir Conexão
              </h3>
              <p className="text-gray-600 mb-4">
                Tem certeza que deseja excluir a conexão:
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {deleteConfirm.profileData?.name || "Conexão sem nome"}
                  </div>
                  <div className="text-gray-500 font-mono text-xs">
                    {deleteConfirm.sessionId}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Esta ação não pode ser desfeita.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium transition-all duration-200 hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  onClick={() =>
                    handleDeleteConnection(deleteConfirm.sessionId)
                  }
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

export default ConnectionsList;
