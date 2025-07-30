import React, { useState } from "react";

const WebhookInstructions = () => {
  const [selectedMethod, setSelectedMethod] = useState("ngrok");

  const methods = {
    ngrok: {
      name: "ngrok (Recomendado)",
      icon: "🚀",
      description: "Expõe seu localhost para internet de forma segura",
      steps: [
        "Instalar ngrok: npm install -g ngrok ou baixar de ngrok.com",
        "Em um terminal: ngrok http 3005",
        "Copiar a URL HTTPS gerada (ex: https://abc123.ngrok.io)",
        "Usar essa URL + /webhook como webhook URL",
        "Exemplo final: https://abc123.ngrok.io/webhook",
      ],
      pros: ["Fácil de usar", "HTTPS automático", "Gratuito para uso básico"],
      cons: ["URL muda a cada reinicialização (versão gratuita)"],
    },
    localtunnel: {
      name: "LocalTunnel",
      icon: "🌐",
      description: "Alternativa gratuita ao ngrok",
      steps: [
        "Instalar: npm install -g localtunnel",
        "Em um terminal: lt --port 3005",
        "Copiar a URL gerada",
        "Usar essa URL + /webhook como webhook URL",
      ],
      pros: ["Totalmente gratuito", "Fácil instalação"],
      cons: ["Menos estável que ngrok", "URL muda sempre"],
    },
    cloudflare: {
      name: "Cloudflare Tunnel",
      icon: "☁️",
      description: "Solução profissional da Cloudflare",
      steps: [
        "Instalar cloudflared",
        "Executar: cloudflared tunnel --url http://localhost:3005",
        "Copiar a URL gerada",
        "Usar essa URL + /webhook",
      ],
      pros: ["Muito estável", "Recursos avançados", "Gratuito"],
      cons: ["Configuração mais complexa"],
    },
    production: {
      name: "Deploy em Produção",
      icon: "🏢",
      description: "Para uso em produção real",
      steps: [
        "Deploy da aplicação (Vercel, Netlify, AWS, etc.)",
        "Configurar domínio próprio",
        "Certificado SSL automático",
        "Usar URL de produção + /webhook",
      ],
      pros: ["URL fixa", "Altamente disponível", "Profissional"],
      cons: ["Requer setup de produção", "Pode ter custos"],
    },
  };

  const currentMethod = methods[selectedMethod];

  return (
    <div className="webhook-instructions-container">
      <div className="instructions-header">
        <h3>📖 Como Configurar Webhook</h3>
        <p>Escolha o método que melhor se adapta ao seu caso de uso:</p>
      </div>

      {/* Seletor de Método */}
      <div className="method-selector">
        {Object.entries(methods).map(([key, method]) => (
          <button
            key={key}
            className={`method-btn ${selectedMethod === key ? "active" : ""}`}
            onClick={() => setSelectedMethod(key)}
          >
            <span className="method-icon">{method.icon}</span>
            <span className="method-name">{method.name}</span>
          </button>
        ))}
      </div>

      {/* Detalhes do Método Selecionado */}
      <div className="method-details">
        <div className="method-header">
          <h4>
            {currentMethod.icon} {currentMethod.name}
          </h4>
          <p>{currentMethod.description}</p>
        </div>

        <div className="method-steps">
          <h5>📋 Passos:</h5>
          <ol>
            {currentMethod.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="method-pros-cons">
          <div className="pros">
            <h6>✅ Vantagens:</h6>
            <ul>
              {currentMethod.pros.map((pro, index) => (
                <li key={index}>{pro}</li>
              ))}
            </ul>
          </div>

          <div className="cons">
            <h6>❌ Limitações:</h6>
            <ul>
              {currentMethod.cons.map((con, index) => (
                <li key={index}>{con}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Exemplo de Código */}
        {selectedMethod === "ngrok" && (
          <div className="code-example">
            <h6>💻 Exemplo Prático:</h6>
            <div className="terminal-example">
              <div className="terminal-header">Terminal</div>
              <div className="terminal-content">
                <div className="terminal-line">$ npm install -g ngrok</div>
                <div className="terminal-line">$ ngrok http 3005</div>
                <div className="terminal-line output">
                  Session Status online
                  <br />
                  Version 2.3.40
                  <br />
                  Web Interface http://127.0.0.1:4040
                  <br />
                  Forwarding https://abc123.ngrok.io → http://localhost:3005
                </div>
                <div className="terminal-line comment">
                  # Use: https://abc123.ngrok.io/webhook
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedMethod === "localtunnel" && (
          <div className="code-example">
            <h6>💻 Exemplo Prático:</h6>
            <div className="terminal-example">
              <div className="terminal-header">Terminal</div>
              <div className="terminal-content">
                <div className="terminal-line">
                  $ npm install -g localtunnel
                </div>
                <div className="terminal-line">$ lt --port 3005</div>
                <div className="terminal-line output">
                  your url is: https://funny-cat-123.loca.lt
                </div>
                <div className="terminal-line comment">
                  # Use: https://funny-cat-123.loca.lt/webhook
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Eventos Webhook Suportados */}
      <div className="webhook-events-info">
        <h5>📡 Eventos que sua API envia:</h5>
        <div className="events-grid">
          <div className="event-info-card">
            <div className="event-icon">📱</div>
            <div className="event-details">
              <h6>qr_code</h6>
              <p>QR Code gerado para conexão</p>
            </div>
          </div>

          <div className="event-info-card">
            <div className="event-icon">🔢</div>
            <div className="event-details">
              <h6>pairing_code</h6>
              <p>Código de pareamento gerado</p>
            </div>
          </div>

          <div className="event-info-card">
            <div className="event-icon">🔌</div>
            <div className="event-details">
              <h6>connection</h6>
              <p>Status da conexão alterado</p>
            </div>
          </div>

          <div className="event-info-card">
            <div className="event-icon">💬</div>
            <div className="event-details">
              <h6>message</h6>
              <p>Nova mensagem recebida</p>
            </div>
          </div>

          <div className="event-info-card">
            <div className="event-icon">👤</div>
            <div className="event-details">
              <h6>contact</h6>
              <p>Contato atualizado</p>
            </div>
          </div>

          <div className="event-info-card">
            <div className="event-icon">📊</div>
            <div className="event-details">
              <h6>message_status</h6>
              <p>Status da mensagem alterado</p>
            </div>
          </div>
        </div>
      </div>

      {/* Exemplo de Payload */}
      <div className="payload-example">
        <h5>📦 Exemplo de Payload Recebido:</h5>
        <div className="json-example">
          <pre>{`{
  "tenantId": "uuid-do-tenant",
  "sessionId": "uuid-da-sessao",
  "event": "qr_code",
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAA...",
    "sessionId": "uuid-da-sessao"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}`}</pre>
        </div>
      </div>

      {/* Dicas de Segurança */}
      <div className="security-tips">
        <h5>🔒 Dicas de Segurança:</h5>
        <ul>
          <li>
            <strong>Validação:</strong> Sempre valide os dados recebidos no
            webhook
          </li>
          <li>
            <strong>HTTPS:</strong> Use sempre HTTPS em produção
          </li>
          <li>
            <strong>Rate Limiting:</strong> Implemente limitação de taxa
          </li>
          <li>
            <strong>Logs:</strong> Registre todos os eventos para auditoria
          </li>
          <li>
            <strong>Timeout:</strong> Configure timeout adequado (5-10 segundos)
          </li>
        </ul>
      </div>
    </div>
  );
};

export default WebhookInstructions;
