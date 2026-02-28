const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// License storage file (persists on Render)
const LICENSES_FILE = path.join(__dirname, 'licenses.json');

// Load licenses from file
function loadLicenses() {
  if (fs.existsSync(LICENSES_FILE)) {
    try {
      const data = fs.readFileSync(LICENSES_FILE, 'utf8');
      const parsed = JSON.parse(data);
      
      // Handle both array format (from [...map]) and object format
      if (Array.isArray(parsed)) {
        return new Map(parsed);
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Convert plain object to Map
        return new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.error('Error loading licenses:', e.message);
    }
  }
  return new Map();
}

// Save licenses to file
function saveLicenses(licenses) {
  fs.writeFileSync(LICENSES_FILE, JSON.stringify([...licenses]));
}

let licenses = loadLicenses();

// Admin key from environment variable
const ADMIN_KEY = process.env.ADMIN_KEY || 'your-default-admin-key-change-this';

// Generate license keys (admin only)
app.post('/admin/generate', (req, res) => {
  const { adminKey, count = 1 } = req.body;
  
  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  
  const generated = [];
  for (let i = 0; i < count; i++) {
    const key = crypto.randomBytes(16).toString('hex').toUpperCase();
    licenses.set(key, { 
      activated: false, 
      userId: null, 
      hwid: null,
      createdAt: new Date().toISOString()
    });
    generated.push(key);
  }
  
  saveLicenses(licenses);
  res.json({ licenses: generated });
});

// Get all licenses (admin only)
app.post('/admin/list', (req, res) => {
  const { adminKey } = req.body;
  
  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  
  const list = [];
  licenses.forEach((value, key) => {
    list.push({ key, ...value });
  });
  
  res.json({ licenses: list });
});

// Revoke license (admin only)
app.post('/admin/revoke', (req, res) => {
  const { adminKey, licenseKey } = req.body;
  
  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  
  if (!licenses.has(licenseKey)) {
    return res.status(404).json({ error: 'License not found' });
  }
  
  licenses.delete(licenseKey);
  saveLicenses(licenses);
  
  res.json({ success: true, message: 'License revoked' });
});

// Validate and activate license
app.post('/validate', (req, res) => {
  const { licenseKey, hwid } = req.body;
  
  if (!licenseKey || !hwid) {
    return res.status(400).json({ error: 'License key and HWID required' });
  }
  
  const license = licenses.get(licenseKey);
  
  if (!license) {
    return res.json({ valid: false, error: 'Invalid license key' });
  }
  
  // Already activated by different hardware
  if (license.activated && license.hwid !== hwid) {
    return res.json({ valid: false, error: 'License already activated on another device' });
  }
  
  // Activate if not already
  if (!license.activated) {
    license.activated = true;
    license.hwid = hwid;
    license.userId = crypto.randomUUID();
    license.activatedAt = new Date().toISOString();
    saveLicenses(licenses);
  }
  
  res.json({ 
    valid: true, 
    userId: license.userId,
    activatedAt: license.activatedAt
  });
});

// Heartbeat to verify license is still valid
app.post('/heartbeat', (req, res) => {
  const { licenseKey, hwid } = req.body;
  
  if (!licenseKey || !hwid) {
    return res.status(400).json({ error: 'License key and HWID required' });
  }
  
  const license = licenses.get(licenseKey);
  
  if (!license || !license.activated || license.hwid !== hwid) {
    return res.json({ valid: false, error: 'License invalid or revoked' });
  }
  
  // Update last seen
  license.lastSeen = new Date().toISOString();
  saveLicenses(licenses);
  
  res.json({ valid: true });
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'running', 
    totalLicenses: licenses.size,
    activatedLicenses: [...licenses.values()].filter(l => l.activated).length
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`License server running on port ${PORT}`);
});
