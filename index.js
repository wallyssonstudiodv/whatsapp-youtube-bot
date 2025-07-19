const { default: makeWASocket, useSingleFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const fs = require("fs");
const axios = require("axios");
const P = require("pino");
const { Boom } = require("@hapi/boom");
const path = require("path");

const { state, saveState } = useSingleFileAuthState('./auth_info.json');
const comandos = JSON.parse(fs.readFileSync('comandos.json'));

async function startBot() {
    const sock = makeWASocket({
        logger: P({ level: "silent" }),
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" }))
        },
        version: await fetchLatestBaileysVersion().then(v => v.version)
    });

    sock.ev.on("creds.update", saveState);

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (!messages || !messages[0].message) return;

        const m = messages[0];
        const sender = m.key.remoteJid;
        const text = m.message?.conversation || m.message?.extendedTextMessage?.text || "";

        // Buscar comando no JSON
        const comando = comandos.find(c => c.comando === text.toLowerCase().trim());

        if (comando) {
            await sock.sendMessage(sender, { text: comando.resposta });

            if (comando.arquivo) {
                const filePath = path.resolve(__dirname, comando.arquivo);
                const extension = path.extname(filePath).toLowerCase();

                const options = {
                    document: fs.readFileSync(filePath),
                    fileName: path.basename(filePath),
                    mimetype: "application/octet-stream"
                };

                if ([".jpg", ".jpeg", ".png", ".gif"].includes(extension)) {
                    await sock.sendMessage(sender, { image: fs.readFileSync(filePath), caption: comando.resposta });
                } else if ([".mp4", ".avi", ".mov"].includes(extension)) {
                    await sock.sendMessage(sender, { video: fs.readFileSync(filePath), caption: comando.resposta });
                } else {
                    await sock.sendMessage(sender, { document: fs.readFileSync(filePath), fileName: path.basename(filePath) });
                }
            }
        } else {
            // Se não for um comando, envia pro webhook PHP
            try {
                const response = await axios.post("http://localhost/webhook.php", {
                    number: sender,
                    message: text
                });

                if (response.data?.reply) {
                    await sock.sendMessage(sender, { text: response.data.reply });
                }
            } catch (err) {
                console.error("Erro ao enviar para webhook:", err.message);
            }
        }
    });

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });
}

startBot();