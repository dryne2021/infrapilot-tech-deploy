const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const logPath = path.join(logsDir, "audit.log");

const audit = (event, meta = {}) => {
  const safe = {
    time: new Date().toISOString(),
    event,
    ...meta,
  };

  fs.appendFile(logPath, JSON.stringify(safe) + "\n", (err) => {
    if (err) console.error("audit log write failed:", err.message);
  });
};

module.exports = { audit };
