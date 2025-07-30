#!/usr/bin/env node

/**
 * Servidor Webhook Local para desenvolvimento
 * Execute: node webhook-server.js [porta]
 * Padrão: porta 3005
 */

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.argv[2] || 3005;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Array para armazenar eventos recebidos
let receivedEvents = [];

// Middleware de logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Endpoint principal do webhook
app.post("/webhook", (req, res) => {
  const timestamp = new Date().toISOString();
  const event = {
    id: Date.now() + Math.random(),
    timestamp,
    method: req.method,
    headers: req.headers,
    body: req.body,
    ip: req.ip || req.connection.remoteAddress,
  };

  // Armazenar evento
  receivedEvents.unshift(event);

  // Manter apenas os últimos 100 eventos
  if (receivedEvents.length > 100) {
    receivedEvents = receivedEvents.slice(0, 100);
  }

  // Log do evento
  console.log("\n🎯 WEBHOOK RECEBIDO:");
  console.log("⏰ Timestamp:", timestamp);
  console.log("📡 Headers:", JSON.stringify(req.headers, null, 2));
  console.log("📦 Body:", JSON.stringify(req.body, null, 2));
  console.log("🌐 IP:", req.ip || req.connection.remoteAddress);
  console.log("─".repeat(50));

  // Resposta de sucesso
  res.status(200).json({
    success: true,
    message: "Webhook recebido com sucesso!",
    eventId: event.id,
    timestamp,
  });
});

// Endpoint para listar eventos recebidos
app.get("/events", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const events = receivedEvents.slice(0, limit);

  res.json({
    success: true,
    total: receivedEvents.length,
    events: events,
  });
});

// Endpoint para limpar eventos
app.delete("/events", (req, res) => {
  const count = receivedEvents.length;
  receivedEvents = [];

  console.log(`🗑️ ${count} eventos removidos`);

  res.json({
    success: true,
    message: `${count} eventos removidos`,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint de status
app.get("/status", (req, res) => {
  res.json({
    success: true,
    server: "Webhook Server Local",
    status: "online",
    port: PORT,
    eventsReceived: receivedEvents.length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: `http://localhost:${PORT}/webhook`,
      events: `http://localhost:${PORT}/events`,
      status: `http://localhost:${PORT}/status`,
    },
  });
});

// Endpoint para simular eventos (para teste)
app.post("/simulate/:eventType", (req, res) => {
  const { eventType } = req.params;
  const { sessionId, tenantId } = req.body;

  let simulatedEvent;

  switch (eventType) {
    case "qr_code":
      simulatedEvent = {
        tenantId: tenantId || "test-tenant",
        sessionId: sessionId || "test-session",
        event: "qr_code",
        data: {
          qrCode:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
          sessionId: sessionId || "test-session",
        },
        timestamp: new Date().toISOString(),
      };
      break;

    case "pairing_code":
      simulatedEvent = {
        tenantId: tenantId || "test-tenant",
        sessionId: sessionId || "test-session",
        event: "pairing_code",
        data: {
          pairingCode: "12345678",
          sessionId: sessionId || "test-session",
        },
        timestamp: new Date().toISOString(),
      };
      break;

    case "connection":
      simulatedEvent = {
        tenantId: tenantId || "test-tenant",
        sessionId: sessionId || "test-session",
        event: "connection",
        data: {
          status: "connected",
          sessionId: sessionId || "test-session",
        },
        timestamp: new Date().toISOString(),
      };
      break;

    default:
      return res.status(400).json({
        success: false,
        error: "Tipo de evento não suportado",
        supportedTypes: ["qr_code", "pairing_code", "connection"],
      });
  }

  // Simular envio do webhook para si mesmo
  setTimeout(() => {
    const axios = require("axios");
    axios
      .post(`http://localhost:${PORT}/webhook`, simulatedEvent)
      .then(() => console.log(`✅ Evento ${eventType} simulado com sucesso`))
      .catch((err) =>
        console.error(`❌ Erro ao simular evento: ${err.message}`)
      );
  }, 100);

  res.json({
    success: true,
    message: `Evento ${eventType} será simulado`,
    event: simulatedEvent,
  });
});

// Endpoint raiz
app.get("/", (req, res) => {
  res.json({
    message: "🎣 Servidor Webhook Local ativo!",
    status: "online",
    port: PORT,
    endpoints: {
      webhook: `POST http://localhost:${PORT}/webhook`,
      events: `GET http://localhost:${PORT}/events`,
      status: `GET http://localhost:${PORT}/status`,
      simulate: `POST http://localhost:${PORT}/simulate/:eventType`,
    },
    usage: {
      webhook: "Recebe webhooks da sua API WhatsApp",
      events: "Lista eventos recebidos",
      status: "Status do servidor",
      simulate: "Simula eventos para teste",
    },
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Erro no servidor:", err);
  res.status(500).json({
    success: false,
    error: "Erro interno do servidor",
    message: err.message,
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log("\n🚀 Servidor Webhook Local iniciado!");
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🎯 Webhook: http://localhost:${PORT}/webhook`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);
  console.log(`📋 Eventos: http://localhost:${PORT}/events`);
  console.log("\n💡 Configure esta URL no seu tenant WhatsApp:");
  console.log(`   http://localhost:${PORT}/webhook`);
  console.log("\n🧪 Para testar, use:");
  console.log(
    `   curl -X POST http://localhost:${PORT}/webhook -H "Content-Type: application/json" -d '{"test": "data"}'`
  );
  console.log("\n📱 Para usar com ngrok:");
  console.log(`   ngrok http ${PORT}`);
  console.log("\n⏹️  Para parar: Ctrl+C");
  console.log("─".repeat(60));
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n⏹️  Parando servidor webhook...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n⏹️  Servidor webhook finalizado!");
  process.exit(0);
});
