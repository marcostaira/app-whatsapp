import React, { useState, useEffect } from "react";
import { apiService } from "../services/apiService";

const ContactManager = ({ tenant, connection }) => {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    isGroup: "all",
    isBlocked: "all",
    limit: 50,
  });
  const [selectedContact, setSelectedContact] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);

  useEffect(() => {
    if (connection?.sessionId) {
      loadContacts();
    }
  }, [connection, filters]);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const filterParams = {
        ...filters,
        search: searchTerm || undefined,
      };

      // Converter 'all' para undefined
      if (filterParams.isGroup === "all") delete filterParams.isGroup;
      if (filterParams.isBlocked === "all") delete filterParams.isBlocked;

      const response = await apiService.getContacts(filterParams);

      if (response.success) {
        const contactsData = Array.isArray(response.data) ? response.data : [];
        setContacts(contactsData);
      }
    } catch (error) {
      console.error("Erro ao carregar contatos:", error);
      setContacts([]); // Garantir array vazio em caso de erro
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadContacts();
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.searchContacts(
        searchTerm,
        filters.limit
      );

      if (response.success) {
        const contactsData = Array.isArray(response.data) ? response.data : [];
        setContacts(contactsData);
      }
    } catch (error) {
      console.error("Erro na busca:", error);
      setContacts([]); // Garantir array vazio em caso de erro
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockContact = async (contact) => {
    if (
      !window.confirm(
        `Tem certeza que deseja bloquear ${contact.name || contact.whatsappId}?`
      )
    ) {
      return;
    }

    try {
      await apiService.blockContact(contact.whatsappId);

      // Atualizar o contato na lista
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, isBlocked: true } : c))
      );

      alert("Contato bloqueado com sucesso!");
    } catch (error) {
      alert("Erro ao bloquear contato: " + error.message);
    }
  };

  const handleUnblockContact = async (contact) => {
    if (
      !window.confirm(
        `Tem certeza que deseja desbloquear ${
          contact.name || contact.whatsappId
        }?`
      )
    ) {
      return;
    }

    try {
      await apiService.unblockContact(contact.whatsappId);

      // Atualizar o contato na lista
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, isBlocked: false } : c))
      );

      alert("Contato desbloqueado com sucesso!");
    } catch (error) {
      alert("Erro ao desbloquear contato: " + error.message);
    }
  };

  const handleContactClick = (contact) => {
    setSelectedContact(contact);
    setShowContactModal(true);
  };

  const formatPhoneNumber = (whatsappId) => {
    if (!whatsappId) return "";
    return whatsappId.replace("@s.whatsapp.net", "").replace("@c.us", "");
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "Nunca visto";
    return new Date(lastSeen).toLocaleString("pt-BR");
  };

  const getContactInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200 mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          👥 Gerenciador de Contatos
        </h2>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>Total: {Array.isArray(contacts) ? contacts.length : 0}</span>
          <span>
            Grupos:{" "}
            {Array.isArray(contacts)
              ? contacts.filter((c) => c.isGroup).length
              : 0}
          </span>
          <span>
            Bloqueados:{" "}
            {Array.isArray(contacts)
              ? contacts.filter((c) => c.isBlocked).length
              : 0}
          </span>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg mb-4">
        <div className="flex-1 min-w-64">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors disabled:bg-gray-400"
              onClick={handleSearch}
              disabled={isLoading}
            >
              🔍 Buscar
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Tipo:</label>
          <select
            value={filters.isGroup}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, isGroup: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Todos</option>
            <option value="false">Contatos</option>
            <option value="true">Grupos</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Status:</label>
          <select
            value={filters.isBlocked}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, isBlocked: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Todos</option>
            <option value="false">Ativos</option>
            <option value="true">Bloqueados</option>
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
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>

        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm transition-colors disabled:bg-gray-400"
          onClick={loadContacts}
          disabled={isLoading}
        >
          🔄 Atualizar
        </button>
      </div>

      {/* Lista de Contatos */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin mb-4"></div>
            <p>Carregando contatos...</p>
          </div>
        ) : !Array.isArray(contacts) || contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <div className="text-6xl mb-4">👤</div>
            <p className="text-lg font-medium mb-2">
              Nenhum contato encontrado
            </p>
            <p className="text-sm text-center">
              Os contatos aparecerão aqui após você enviar/receber mensagens
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {(Array.isArray(contacts) ? contacts : []).map((contact) => (
              <div
                key={contact.id}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg relative ${
                  contact.isBlocked ? "opacity-70 bg-gray-50" : ""
                }`}
                onClick={() => handleContactClick(contact)}
              >
                {/* Avatar */}
                <div className="relative flex justify-center mb-4">
                  {contact.profilePicture ? (
                    <img
                      src={contact.profilePicture}
                      alt={contact.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      {getContactInitials(contact.name)}
                    </div>
                  )}

                  {contact.isGroup && (
                    <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md text-xs">
                      👥
                    </span>
                  )}
                  {contact.isBlocked && (
                    <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md text-xs">
                      🚫
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="text-center mb-4">
                  <h4 className="font-medium text-gray-800 mb-1 truncate">
                    {contact.name || formatPhoneNumber(contact.whatsappId)}
                  </h4>

                  <p className="text-sm text-gray-600 mb-1">
                    📱 {formatPhoneNumber(contact.whatsappId)}
                  </p>

                  {contact.lastSeen && (
                    <p className="text-xs text-gray-500 mb-2">
                      ⏰ {formatLastSeen(contact.lastSeen)}
                    </p>
                  )}

                  <div className="flex justify-center gap-4 text-xs text-gray-500">
                    <span>📤 {contact.messagesSent || 0}</span>
                    <span>📥 {contact.messagesReceived || 0}</span>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {contact.isBlocked ? (
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1 rounded transition-colors"
                      onClick={() => handleUnblockContact(contact)}
                      title="Desbloquear contato"
                    >
                      ✅ Desbloquear
                    </button>
                  ) : (
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-1 rounded transition-colors"
                      onClick={() => handleBlockContact(contact)}
                      title="Bloquear contato"
                    >
                      🚫 Bloquear
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Contato */}
      {showContactModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                👤 Detalhes do Contato
              </h3>
              <button
                className="text-red-500 hover:text-red-700 text-xl"
                onClick={() => setShowContactModal(false)}
              >
                ✖️
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar */}
              <div className="text-center">
                {selectedContact.profilePicture ? (
                  <img
                    src={selectedContact.profilePicture}
                    alt={selectedContact.name}
                    className="w-24 h-24 rounded-full object-cover mx-auto"
                  />
                ) : (
                  <div className="w-24 h-24 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-3xl mx-auto">
                    {getContactInitials(selectedContact.name)}
                  </div>
                )}
              </div>

              {/* Detalhes */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Nome:</span>
                    <span className="text-gray-800">
                      {selectedContact.name || "Não informado"}
                    </span>
                  </div>

                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-medium text-gray-600">
                      WhatsApp ID:
                    </span>
                    <span className="text-gray-800 font-mono text-sm">
                      {selectedContact.whatsappId}
                    </span>
                  </div>

                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Telefone:</span>
                    <span className="text-gray-800">
                      {formatPhoneNumber(selectedContact.whatsappId)}
                    </span>
                  </div>

                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Tipo:</span>
                    <span className="text-gray-800">
                      {selectedContact.isGroup
                        ? "👥 Grupo"
                        : "👤 Contato Individual"}
                    </span>
                  </div>

                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-medium text-gray-600">Status:</span>
                    <span
                      className={`font-medium ${
                        selectedContact.isBlocked
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {selectedContact.isBlocked ? "🚫 Bloqueado" : "✅ Ativo"}
                    </span>
                  </div>

                  {selectedContact.lastSeen && (
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="font-medium text-gray-600">
                        Última visualização:
                      </span>
                      <span className="text-gray-800">
                        {formatLastSeen(selectedContact.lastSeen)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="font-medium text-gray-600">Criado em:</span>
                  <span className="text-gray-800">
                    {new Date(selectedContact.createdAt).toLocaleString(
                      "pt-BR"
                    )}
                  </span>
                </div>

                {selectedContact.updatedAt && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-medium text-gray-600">
                      Atualizado em:
                    </span>
                    <span className="text-gray-800">
                      {new Date(selectedContact.updatedAt).toLocaleString(
                        "pt-BR"
                      )}
                    </span>
                  </div>
                )}

                {/* Estatísticas */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-4">
                    📊 Estatísticas
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center bg-white p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedContact.messagesSent || 0}
                      </div>
                      <div className="text-sm text-gray-600">
                        Mensagens Enviadas
                      </div>
                    </div>
                    <div className="text-center bg-white p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedContact.messagesReceived || 0}
                      </div>
                      <div className="text-sm text-gray-600">
                        Mensagens Recebidas
                      </div>
                    </div>
                    <div className="text-center bg-white p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {(selectedContact.messagesSent || 0) +
                          (selectedContact.messagesReceived || 0)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Total de Mensagens
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 p-6 border-t border-gray-200">
              {selectedContact.isBlocked ? (
                <button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  onClick={() => {
                    handleUnblockContact(selectedContact);
                    setShowContactModal(false);
                  }}
                >
                  ✅ Desbloquear Contato
                </button>
              ) : (
                <button
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  onClick={() => {
                    handleBlockContact(selectedContact);
                    setShowContactModal(false);
                  }}
                >
                  🚫 Bloquear Contato
                </button>
              )}

              <button
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                onClick={() => setShowContactModal(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactManager;
