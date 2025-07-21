const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const axios = require('axios')
const { Boom } = require('@hapi/boom')
const qrcode = require('qrcode-terminal')
const fs = require('fs')

const configPath = './config.json'

function loadConfig() {
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'))
    }
    return { responder_usuarios: true, grupos_autorizados: [] }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ auth: state })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            console.log("📲 Escaneie o QR abaixo com o WhatsApp:")
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output.statusCode
            if (reason === DisconnectReason.loggedOut) {
                console.log("❌ Sessão expirada. Escaneie novamente.")
            } else {
                console.log("🔁 Reconectando...")
                startBot()
            }
        }

        if (connection === 'open') {
            console.log("✅ Bot conectado com sucesso!")
            const chats = await sock.groupFetchAllParticipating()
            const grupos = {}

            for (const jid in chats) {
                grupos[jid] = chats[jid].subject
            }

            fs.writeFileSync('./grupos.json', JSON.stringify(grupos, null, 2))
            console.log("📂 Lista de grupos salva em grupos.json")
            console.log("📌 Atualize config.json com os grupos autorizados que deseja responder")
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        const sender = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        if (!text) return

        const config = loadConfig()
        const isGroup = sender.endsWith('@g.us')
        const autorizado = isGroup
            ? config.grupos_autorizados.includes(sender)
            : config.responder_usuarios

        if (!autorizado) return

        try {
            const res = await axios.post('https://meudrivenet.x10.bz/botzap1/webhook.php', {
                number: sender,
                message: text
            })

            if (res.data.reply) {
                await sock.sendMessage(sender, { text: res.data.reply })
            }
        } catch (err) {
            console.error('❌ Erro no webhook:', err.message)
        }
    })
}

startBot()