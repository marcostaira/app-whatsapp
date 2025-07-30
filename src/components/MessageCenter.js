import React, { useState, useEffect, useRef } from "react";
import { apiService } from "../services/apiService";

const MessageCenter = ({ tenant, connection }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageForm, setMessageForm] = useState({
    to: "",
    type: "text",
    content: "",
    file: null,
  });
  const [filters, setFilters] = useState({
    direction: "all",
    type: "all",
    limit: 50,
  });
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (connection?.sessionId) {
      loadMessages();
    }
  }, [connection, filters]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getMessages({
        ...filters,
        limit: filters.limit,
      });

      if (response.success) {
        const messagesData = Array.isArray(response.data) ? response.data : [];
        setMessages(messagesData);
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      setMessages([]); // Garantir array vazio em caso de erro
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageForm.to || (!messageForm.content && !messageForm.file)) {
      alert("Preencha o destinatário e a mensagem");
      return;
    }

    try {
      setSendingMessage(true);

      let messageData = {
        sessionId: connection.sessionId,
        to: apiService.formatPhoneNumber(messageForm.to),
        type: messageForm.type,
      };

      // Preparar dados baseado no tipo
      switch (messageForm.type) {
        case "text":
          messageData.content = messageForm.content;
          break;

        case "image":
        case "video":
        case "audio":
        case "document":
          if (messageForm.file) {
            const uploadResponse = await apiService.uploadMedia(
              messageForm.file
            );
            if (uploadResponse.success) {
              messageData.media = {
                data: uploadResponse.data.filename,
                mimetype: messageForm.file.type,
                caption: messageForm.content || undefined,
              };
            }
          }
          break;

        case "location":
          // Para simplificar, vamos usar coordenadas fixas do Brasil
          messageData.location = {
            latitude: -23.5505,
            longitude: -46.6333,
            name: messageForm.content || "Localização",
            address: "São Paulo, SP, Brasil",
          };
          break;

        case "contact":
          messageData.contact = {
            name: messageForm.content || "Contato",
            phone: messageForm.to,
          };
          break;
      }

      const response = await apiService.sendMessage(messageData);

      if (response.success) {
        // Limpar formulário
        setMessageForm({
          to: "",
          type: "text",
          content: "",
          file: null,
        });

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // Recarregar mensagens
        setTimeout(loadMessages, 1000);
      }
    } catch (error) {
      alert("Erro ao enviar mensagem: " + error.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMessageForm((prev) => ({ ...prev, file }));

      // Auto-detectar tipo baseado no arquivo
      if (file.type.startsWith("image/")) {
        setMessageForm((prev) => ({ ...prev, type: "image" }));
      } else if (file.type.startsWith("video/")) {
        setMessageForm((prev) => ({ ...prev, type: "video" }));
      } else if (file.type.startsWith("audio/")) {
        setMessageForm((prev) => ({ ...prev, type: "audio" }));
      } else {
        setMessageForm((prev) => ({ ...prev, type: "document" }));
      }
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString("pt-BR");
  };

  const formatPhoneNumber = (number) => {
    if (!number) return "";
    return number.replace("@s.whatsapp.net", "").replace("@c.us", "");
  };

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case "text":
        return "💬";
      case "image":
        return "🖼️";
      case "video":
        return "🎥";
      case "audio":
        return "🎵";
      case "document":
        return "📄";
      case "location":
        return "📍";
      case "contact":
        return "👤";
      default:
        return "📎";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200 mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          💬 Central de Mensagens
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            Sessão: {connection.sessionId.substring(0, 8)}...
          </span>
          <span className="flex items-center gap-1 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Conectado
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Direção:</label>
          <select
            value={filters.direction}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, direction: e.target.value }))
            }
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Todas</option>
            <option value="inbound">Recebidas</option>
            <option value="outbound">Enviadas</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Tipo:</label>
          <select
            value={filters.type}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, type: e.target.value }))
            }
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Todos</option>
            <option value="text">Texto</option>
            <option value="image">Imagem</option>
            <option value="video">Vídeo</option>
            <option value="audio">Áudio</option>
            <option value="document">Documento</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Limite:</label>
          <select
            value={filters.limit}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                limit: parseInt(e.target.value),
              }))
            }
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>

        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors disabled:bg-gray-400"
          onClick={loadMessages}
          disabled={isLoading}
        >
          🔄 Atualizar
        </button>
      </div>

      {/* Lista de Mensagens */}
      <div className="flex-1 border border-gray-200 rounded-lg mb-4 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin mb-4"></div>
            <p>Carregando mensagens...</p>
          </div>
        ) : !Array.isArray(messages) || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-lg font-medium mb-2">
              Nenhuma mensagem encontrada
            </p>
            <p className="text-sm">Envie sua primeira mensagem abaixo</p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar p-4">
            <div className="space-y-4">
              {(Array.isArray(messages) ? messages : []).map((message) => (
                <div
                  key={message.id}
                  className={`bg-white border rounded-lg p-4 transition-all hover:-translate-y-1 hover:shadow-md ${
                    message.direction === "inbound"
                      ? "border-l-4 border-l-green-500"
                      : "border-l-4 border-l-blue-500"
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                        {getMessageTypeIcon(message.type)} {message.type}
                      </span>
                      <span className="font-medium text-gray-800">
                        {message.direction === "inbound"
                          ? formatPhoneNumber(message.from)
                          : formatPhoneNumber(message.to)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>

                  <div className="mb-3">
                    {message.type === "text" && (
                      <p className="text-gray-800 whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}

                    {(message.type === "image" || message.type === "video") && (
                      <div className="bg-gray-50 border-l-4 border-blue-500 p-3 rounded">
                        {message.media?.caption && (
                          <p className="text-gray-800 mb-2">
                            {message.media.caption}
                          </p>
                        )}
                        <span className="text-gray-600 italic">
                          📎 Arquivo de mídia
                        </span>
                      </div>
                    )}

                    {message.type === "document" && (
                      <div className="bg-gray-50 border-l-4 border-purple-500 p-3 rounded">
                        <span className="text-gray-800">
                          📄 Documento: {message.media?.filename || "arquivo"}
                        </span>
                      </div>
                    )}

                    {message.type === "location" && (
                      <div className="bg-gray-50 border-l-4 border-red-500 p-3 rounded">
                        <span className="text-gray-800">
                          📍 Localização:{" "}
                          {message.location?.name || "Local compartilhado"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span
                      className={`font-medium ${
                        message.direction === "inbound"
                          ? "text-green-600"
                          : "text-blue-600"
                      }`}
                    >
                      {message.direction === "inbound"
                        ? "↓ Recebida"
                        : "↑ Enviada"}
                    </span>
                    {message.status && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase">
                        {message.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Formulário de Envio */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          📤 Enviar Mensagem
        </h3>

        <form onSubmit={handleSendMessage} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Para (WhatsApp):
              </label>
              <input
                type="tel"
                value={messageForm.to}
                onChange={(e) =>
                  setMessageForm((prev) => ({ ...prev, to: e.target.value }))
                }
                placeholder="5511999999999"
                disabled={sendingMessage}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo:
              </label>
              <select
                value={messageForm.type}
                onChange={(e) =>
                  setMessageForm((prev) => ({ ...prev, type: e.target.value }))
                }
                disabled={sendingMessage}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
              >
                <option value="text">💬 Texto</option>
                <option value="image">🖼️ Imagem</option>
                <option value="video">🎥 Vídeo</option>
                <option value="audio">🎵 Áudio</option>
                <option value="document">📄 Documento</option>
                <option value="location">📍 Localização</option>
                <option value="contact">👤 Contato</option>
              </select>
            </div>
          </div>

          {(messageForm.type === "image" ||
            messageForm.type === "video" ||
            messageForm.type === "audio" ||
            messageForm.type === "document") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arquivo:
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={sendingMessage}
                accept={
                  messageForm.type === "image"
                    ? "image/*"
                    : messageForm.type === "video"
                    ? "video/*"
                    : messageForm.type === "audio"
                    ? "audio/*"
                    : "*/*"
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              />
              {messageForm.file && (
                <p className="text-xs text-gray-500 mt-1">
                  📎 {messageForm.file.name} (
                  {(messageForm.file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {messageForm.type === "image" || messageForm.type === "video"
                ? "Legenda:"
                : "Mensagem:"}
            </label>
            <textarea
              value={messageForm.content}
              onChange={(e) =>
                setMessageForm((prev) => ({ ...prev, content: e.target.value }))
              }
              placeholder={
                messageForm.type === "location"
                  ? "Nome do local (opcional)"
                  : messageForm.type === "contact"
                  ? "Nome do contato"
                  : messageForm.type === "image" || messageForm.type === "video"
                  ? "Legenda (opcional)"
                  : "Digite sua mensagem..."
              }
              rows="3"
              disabled={sendingMessage}
              required={
                messageForm.type === "text" || messageForm.type === "contact"
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 resize-vertical"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={
              sendingMessage ||
              !messageForm.to ||
              (messageForm.type === "text" && !messageForm.content) ||
              ((messageForm.type === "image" ||
                messageForm.type === "video" ||
                messageForm.type === "audio" ||
                messageForm.type === "document") &&
                !messageForm.file)
            }
          >
            {sendingMessage ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Enviando...
              </>
            ) : (
              <>🚀 Enviar {getMessageTypeIcon(messageForm.type)}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessageCenter;
