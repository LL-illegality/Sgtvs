const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve static files from public/ directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve logo.png and other root-level assets
app.use(express.static(__dirname));

// ---------------------------------------------------------------------------
// Multer file upload configuration
// ---------------------------------------------------------------------------
var uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }

var storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname);
    var name = Date.now() + '-' + Math.random().toString(36).substring(2, 8) + ext;
    cb(null, name);
  }
});
var upload = multer({ storage: storage });

// ---------------------------------------------------------------------------
// Helper: read / write JSON files
// ---------------------------------------------------------------------------
function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Seed a runtime data file from defaults/ if it does not exist yet.
// Runtime data (public/api/*.json) is customer-edited and git-ignored,
// so deployments never overwrite live configuration.
function seedIfMissing(runtimePath, defaultsPath) {
  if (!fs.existsSync(runtimePath)) {
    fs.copyFileSync(defaultsPath, runtimePath);
    console.log('Seeded ' + path.basename(runtimePath) + ' from defaults');
  }
}

const membersPath = path.join(__dirname, 'public', 'api', 'members.json');
const timelinePath = path.join(__dirname, 'public', 'api', 'timeline.json');
const settingsPath = path.join(__dirname, 'public', 'api', 'settings.json');

// Ensure runtime data directory exists, then seed from defaults on startup
fs.mkdirSync(path.dirname(membersPath), { recursive: true });
seedIfMissing(membersPath, path.join(__dirname, 'defaults', 'members.json'));
seedIfMissing(timelinePath, path.join(__dirname, 'defaults', 'timeline.json'));
seedIfMissing(settingsPath, path.join(__dirname, 'defaults', 'settings.json'));

// ---------------------------------------------------------------------------
// Members CRUD
// ---------------------------------------------------------------------------

// GET /api/members — return members sorted by order ascending
app.get('/api/members', function (_req, res) {
  try {
    var members = readJSON(membersPath);
    members.sort(function (a, b) { return a.order - b.order; });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read members data' });
  }
});

// POST /api/upload — image upload
app.post('/api/upload', upload.single('file'), function (req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// PUT /api/members/save — batch save members (overwrites JSON, sets order by index)
app.put('/api/members/save', function (req, res) {
  try {
    var members = req.body;
    members.forEach(function (m, i) { m.order = i; });
    writeJSON(membersPath, members);
    cleanupUnusedImages(members);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save members' });
  }
});

// PUT /api/timeline/save — batch save timeline (overwrites JSON, sorts by date desc)
app.put('/api/timeline/save', function (req, res) {
  try {
    var events = req.body;
    events.sort(function (a, b) { return b.date.localeCompare(a.date); });
    events.forEach(function (e, i) { e.order = i; });
    writeJSON(timelinePath, events);
    cleanupUnusedImages(events);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save timeline' });
  }
});

// cleanupUnusedImages — delete images from uploads/ not referenced by any item
function cleanupUnusedImages(allItems) {
  var usedUrls = {};
  allItems.forEach(function (item) {
    if (item.image && item.image.startsWith('/uploads/')) {
      usedUrls[item.image] = true;
    }
  });
  var uploadsPath = path.join(__dirname, 'public', 'uploads');
  if (!fs.existsSync(uploadsPath)) return;
  fs.readdirSync(uploadsPath).forEach(function (file) {
    var url = '/uploads/' + file;
    if (!usedUrls[url]) {
      try { fs.unlinkSync(path.join(uploadsPath, file)); } catch (e) { /* ignore */ }
    }
  });
}

// ---------------------------------------------------------------------------
// Timeline CRUD
// ---------------------------------------------------------------------------

// GET /api/timeline — return timeline sorted by date descending
app.get('/api/timeline', function (_req, res) {
  try {
    var events = readJSON(timelinePath);
    events.sort(function (a, b) { return b.date.localeCompare(a.date); });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read timeline data' });
  }
});

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

// GET /api/settings — return settings
app.get('/api/settings', function (_req, res) {
  try {
    var settings = readJSON(settingsPath);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read settings data' });
  }
});

// PUT /api/settings/save — save settings
app.put('/api/settings/save', function (req, res) {
  try {
    var settings = req.body;
    writeJSON(settingsPath, settings);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ---------------------------------------------------------------------------
// Admin page
// ---------------------------------------------------------------------------
app.get('/admin', function (_req, res) {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// ---------------------------------------------------------------------------
// Fallback: serve index.html for all other routes (SPA-like)
// ---------------------------------------------------------------------------
app.get('*', function (_req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, function () {
  console.log('sgtvs server running on http://localhost:' + PORT);
});
