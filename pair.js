const express = require("express");
const app = express();
const { useMultiFileAuthState, makeWASocket } = require("@whiskeysockets/baileys");
const path = require("path");
const PORT = process.env.PORT || 3000;

// Static files serving
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pair.html'));
});

app.get("/code", async (req, res) => {
  const { number } = req.query;
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: state.keys,
      },
      printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(number);
      return res.json({ code });
    }

    return res.json({ code: "Already registered" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
