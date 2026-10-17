const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'finanzas_db.json');

app.use(express.json({ limit: '15mb' }));
app.get('/api/state', (req, res) => {
  if (!fs.existsSync(DB_FILE)) return res.json({});
  const content = fs.readFileSync(DB_FILE, 'utf-8');
  res.json(JSON.parse(content));
});

app.post('/api/state', (req, res) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2), 'utf-8');
  res.json({ ok: true, savedAt: new Date().toISOString() });
});

app.listen(3001, () => {
  console.log('✅ Servidor en tu Laptop listo en http://localhost:3001');
});