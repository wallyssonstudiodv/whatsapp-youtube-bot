
# 🤖 Bot WhatsApp com PHP Webhook + Baileys no Termux

Este pacote contém tudo o que você precisa para rodar um bot de WhatsApp usando Node.js com Baileys e Webhook em PHP no Termux.

---

## ✅ Requisitos

Execute no Termux:

```bash
pkg update && pkg upgrade -y
pkg install nodejs php wget unzip nano -y
```

---

## 📦 Instalação

### 1. Extraia o ZIP:

```bash
unzip botwhatsapp_php.zip -d botwhatsapp
cd botwhatsapp
```

### 2. Instale as dependências:

```bash
npm install
```

---

## 🚀 Como usar

### 1. Em uma aba do Termux (servidor PHP):

```bash
php -S 127.0.0.1:8000
```

Deixe rodando.

### 2. Em outra aba (iniciar o bot):

```bash
node index.js
```

Escaneie o QR code com seu WhatsApp.

---

## 📁 Arquivos incluídos

- `index.js` – Código principal do bot
- `webhook.php` – Responde as mensagens automaticamente
- `package.json` – Lista de dependências
- `README.txt` – Instruções de instalação

---

## 🧠 Exemplos de comandos para testar

- `oi` → Olá! Como posso te ajudar?
- `menu` → Mostra o menu de opções
- `tchau` → Até logo!

---

Se precisar de ajuda ou quiser adicionar funções novas, é só chamar! 🚀
