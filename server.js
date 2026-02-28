import express from "express";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());

const DB_FILE = "licenses.json";

/* ===== LOAD DATABASE ===== */
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* ===== CREATE LICENSE ===== */
app.post("/create", (req, res) => {
  const db = loadDB();

  const newKey = uuidv4();
  db[newKey] = {
    device: null,
    createdAt: new Date()
  };

  saveDB(db);

  res.json({ license: newKey });
});

/* ===== VERIFY LICENSE ===== */
app.post("/verify", (req, res) => {
  const { license, device } = req.body;
  const db = loadDB();

  if (!db[license]) {
    return res.json({ valid: false, message: "License not found" });
  }

  if (!db[license].device) {
    db[license].device = device;
    saveDB(db);
    return res.json({ valid: true, firstBind: true });
  }

  if (db[license].device !== device) {
    return res.json({
      valid: false,
      message: "License already used on another device"
    });
  }

  res.json({ valid: true });
});

/* ===== START SERVER ===== */
app.listen(3000, () => {
  console.log("License server running on port 3000");
});
