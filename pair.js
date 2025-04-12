const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const { upload } = require("./mega");

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get("/", async (req, res) => {
  let num = req.query.number;

  async function RobinPair() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");

    try {
      let RobinPairWeb = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: "fatal" }).child({ level: "fatal" })
          ),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
      });

      if (!RobinPairWeb.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, "");
        const code = await RobinPairWeb.requestPairingCode(num);
        if (!res.headersSent) {
          return res.send({ code });
        }
      }

      RobinPairWeb.ev.on("creds.update", saveCreds);

      RobinPairWeb.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;

        if (connection === "open") {
          try {
            await delay(10000);

            const auth_path = "./session/";
            const user_jid = jidNormalizedUser(RobinPairWeb.user.id);

            function randomMegaId(length = 6, numberLength = 4) {
              const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
              let result = "";
              for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
              }
              const number = Math.floor(Math.random() * Math.pow(10, numberLength));
              return `${result}${number}`;
            }

            const fileName = `${randomMegaId()}.json`;
            const mega_url = await upload(fs.createReadStream(auth_path + "creds.json"), fileName);

            const string_session = mega_url.replace("https://mega.nz/file/", "");

            const sid = `*HITMAX-MOVIE [The powerful WA BOT]*\n\n👉 ${string_session} 👈\n\n*This is your Session ID, copy this ID and paste it into the config.js file.*\n\n*You can ask any question using this link:*\nwa.me/message/GVOTYLER4FAPM1\n\n*You can join our WhatsApp group:*\nhttps://chat.whatsapp.com/J6Eqe8YJOTtJY3sygyCNVZ`;

            const warning_msg = `🛑 *Do not share this code with anyone!* 🛑`;

            await RobinPairWeb.sendMessage(user_jid, {
              image: {
                url: "https://raw.githubusercontent.com/jobif/mr.rasintha/refs/heads/main/photo_2025-03-28_11-36-25.jpg",
              },
              caption: sid,
            });

            await RobinPairWeb.sendMessage(user_jid, { text: string_session });
            await RobinPairWeb.sendMessage(user_jid, { text: warning_msg });

          } catch (e) {
            console.error("Error while sending message:", e);
            exec("pm2 restart prabath");
          }

          await delay(100);
          removeFile("./session");
          process.exit(0);
        } else if (
          connection === "close" &&
          lastDisconnect &&
          lastDisconnect.error &&
          lastDisconnect.error.output.statusCode !== 401
        ) {
          await delay(10000);
          RobinPair();
        }
      });
    } catch (err) {
      console.error("Main error:", err);
      exec("pm2 restart Robin-md");
      removeFile("./session");
      if (!res.headersSent) {
        return res.send({ code: "Service Unavailable" });
      }
    }
  }

  return await RobinPair();
});

process.on("uncaughtException", function (err) {
  console.log("Caught exception: " + err);
  exec("pm2 restart Robin");
});

module.exports = router;
