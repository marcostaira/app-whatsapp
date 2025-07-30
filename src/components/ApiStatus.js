import React from "react";

const ApiStatus = ({ status, onRefresh }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "online":
        return {
          icon: "🟢",
          text: "Online",
          bgColor: "bg-green-500",
          description: "API funcionando normalmente",
        };
      case "offline":
        return {
          icon: "🔴",
          text: "Offline",
          bgColor: "bg-red-500",
          description: "API indisponível",
        };
      case "checking":
        return {
          icon: "🟡",
          text: "Verificando...",
          bgColor: "bg-yellow-500",
          description: "Verificando status da API",
        };
      default:
        return {
          icon: "⚪",
          text: "Desconhecido",
          bgColor: "bg-gray-500",
          description: "Status não identificado",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="relative group">
      <div className="flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-full">
        <div className="flex items-center gap-1">
          <span className="text-sm">{config.icon}</span>
          <span className="text-sm font-medium">{config.text}</span>
        </div>

        <button
          className="bg-white bg-opacity-20 hover:bg-opacity-30 p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onRefresh}
          title="Verificar status da API"
          disabled={status === "checking"}
        >
          {status === "checking" ? (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span className="text-xs">🔄</span>
          )}
        </button>
      </div>

      {/* Tooltip */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="bg-black bg-opacity-80 text-white text-xs px-3 py-2 rounded whitespace-nowrap">
          {config.description}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-black border-opacity-80"></div>
        </div>
      </div>
    </div>
  );
};

export default ApiStatus;
