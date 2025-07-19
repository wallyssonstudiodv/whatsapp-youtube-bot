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
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

// 🌐 Webhook do servidor:
const WEBHOOK_URL = 'https://meudrivenet.x10.bz/botzap/webhook.php';

// 🚀 Inicialização do bot
async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state
    });

    // Salvar estado
    sock.ev.on('creds.update', saveState);

    // 📥 Mensagens recebidas
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const messageContent =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            '';

        console.log(`📩 Mensagem de ${from}: ${messageContent}`);

        // 🔁 Enviar para webhook
        try {
            await axios.post(WEBHOOK_URL, {
                number: from,
                message: messageContent
            });
        } catch (err) {
            console.error('❌ Erro ao enviar para webhook:', err.message);
        }
    });

    // 🔄 Reconexão
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect =
                new Boom(lastDisconnect?.error)?.output?.statusCode !==
                DisconnectReason.loggedOut;
            console.log('🔌 Desconectado. Reconectar:', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Conectado ao WhatsApp!');
        }
    });
}

startBot();