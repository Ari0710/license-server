import express from "express";

const app = express();
app.use(express.json());

/*
ENV FORMAT:

LICENSE_KEYS=key1,key2,key3
*/

const VALID_LICENSES = process.env.LICENSE_KEYS
  ? process.env.LICENSE_KEYS.split(",")
  : [];

/* ===== VERIFY LICENSE ===== */
app.post("/verify", (req, res) => {
  const { license } = req.body;

  if (!license) {
    return res.json({ valid: false, message: "No license provided" });
  }

  if (VALID_LICENSES.includes(license)) {
    return res.json({ valid: true });
  }

  return res.json({ valid: false, message: "Invalid license" });
});

app.listen(3000, () => {
  console.log("License server running on port 3000");
});
