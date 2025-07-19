const {
    default: makeWASocket,
    useSingleFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const axios = require('axios');
const P = require('pino');

// 📁 Autenticação em arquivo local
const { state, saveState } = useSingleFileAuthState("./auth_info.json");

// 🌐 Webhook do servidor
const WEBHOOK_URL = 'https://meudrivenet.x10.bz/botzap/webhook.php';

// 🚀 Inicialização do bot
async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: state.keys
        }
    });

    // 🔐 Salvar o estado da autenticação
    sock.ev.on('creds.update', saveState);

    // 📥 Evento de mensagens recebidas
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify' || !messages || !messages[0]) return;

        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;

        const messageContent =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            msg.message.documentMessage?.caption ||
            '';

        console.log(`📩 Mensagem de ${from}: ${messageContent}`);

        // 🔁 Enviar dados ao Webhook
        try {
            await axios.post(WEBHOOK_URL, {
                number: from,
                message: messageContent
            });
        } catch (err) {
            console.error('❌ Erro ao enviar para webhook:', err.message);
        }
    });

    // 🔄 Monitorar conexão
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const shouldReconnect = reason !== DisconnectReason.loggedOut;

            console.log('🔌 Conexão fechada. Reconectar:', shouldReconnect);

            if (shouldReconnect) {
                startBot();
            } else {
                console.log('❌ Sessão encerrada. Faça login novamente.');
            }
        }

        if (connection === 'open') {
            console.log('✅ Bot conectado ao WhatsApp com sucesso!');
        }
    });
}

startBot();