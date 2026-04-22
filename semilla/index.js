require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const seriesRouter   = require('./routes/series');
const estudiosRouter = require('./routes/estudios');
const claudeRouter   = require('./proxy/claude');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '2mb' }));

// ── Rutas ─────────────────────────────────────────────────────
app.use('/api/generate', claudeRouter);    // proxy Claude (streaming)
app.use('/api/series',   seriesRouter);    // CRUD series
app.use('/api/estudios', estudiosRouter);  // CRUD estudios + secciones

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── Error handler global ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Unhandled]', err.message);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`\n✓ Bible Study API corriendo en http://localhost:${PORT}`);
  console.log('  POST /api/generate     → proxy Claude (SSE)');
  console.log('  GET  /api/series       → listar series');
  console.log('  POST /api/series       → crear serie');
  console.log('  GET  /api/estudios     → listar estudios');
  console.log('  POST /api/estudios     → guardar estudio');
  console.log('  GET  /api/estudios/:id → detalle completo\n');
});
