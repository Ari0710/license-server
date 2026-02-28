import express from "express";

const app = express();
app.use(express.json());

/* ================= LICENSE DATABASE ================= */
/* Add your PC HWID here first */
const licenses = [
  { hwid: "c777c8c2937d908cd5bb7504ad5bcc36ba6372cf69a9818d915026a82dd281cc", expiry: "2026-12-31" }
];

/* ================= VERIFY ROUTE ================= */

app.post("/verify", (req, res) => {
  const { hwid } = req.body;

  const user = licenses.find(l => l.hwid === hwid);

  if (!user) return res.json({ valid: false });

  if (new Date(user.expiry) < new Date())
    return res.json({ valid: false });

  res.json({ valid: true });
});

/* ================= START SERVER ================= */

app.listen(3000, () => console.log("License server running"));
