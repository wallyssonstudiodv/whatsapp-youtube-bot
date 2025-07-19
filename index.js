const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const axios = require("axios");

// Função principal
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
    auth: state
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    if (messageContent.startsWith("!yt ")) {
      const query = messageContent.replace("!yt ", "").trim();
      if (!query) {
        await sock.sendMessage(sender, { text: "❌ Escreva algo após o comando!\nEx: !yt o nome do vídeo" });
        return;
      }

      await sock.sendMessage(sender, { text: `🔎 Buscando: *${query}*` });

      try {
        const response = await axios.post("https://seu-dominio.com/webhook.php", {
          number: sender,
          message: query
        });

        if (response.data && response.data.link) {
          await sock.sendMessage(sender, {
            text: `✅ Resultado:\n${response.data.link}`
          });
        } else {
          await sock.sendMessage(sender, {
            text: "❌ Não encontrei resultados. Tente outro nome."
          });
        }
      } catch (error) {
        await sock.sendMessage(sender, {
          text: "❌ Erro ao buscar resultado. Verifique o servidor."
        });
        console.error(error);
      }
    }
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Conexão encerrada. Reconectando:", shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === "open") {
      console.log("✅ Bot conectado com sucesso!");
    }
  });
}

// Iniciar o bot
startBot();