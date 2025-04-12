const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  Browsers,
  delay
} = require("@whiskeysockets/baileys");
const pino = require("pino");

(async () => {
  const { state, saveCreds } = await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: "fatal" })
      ),
    },
    printQRInTerminal: false,
    logger: pino({ level: "fatal" }),
    browser: Browsers.macOS("Safari"),
  });

  if (!sock.authState.creds.registered) {
    const number = process.argv[2];

    try {
      console.log("⏳ Requesting pairing code for:", number);
      const code = await sock.requestPairingCode(number);
      console.log("✅ Pairing code:", code);
    } catch (err) {
      console.error("❌ Failed to link device.");
      console.error("Error Message:", err?.message);
      console.error("Error Full:", err);
    }
  }

  sock.ev.on("creds.update", saveCreds);
})();
