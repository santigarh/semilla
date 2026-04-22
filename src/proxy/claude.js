const express = require('express');
const router  = express.Router();
const { buildPrompt } = require('./promptBuilder');

/**
 * POST /api/generate
 *
 * Proxy hacia Anthropic con streaming SSE.
 * El HTML existente recibe el mismo formato de eventos — no necesita cambios.
 *
 * Body: { pasaje, audiencia, profundidad, enfoque, idioma, contexto, secciones[] }
 */
router.post('/', async (req, res) => {
  const { pasaje, audiencia, profundidad, enfoque, idioma, contexto, secciones } = req.body;

  // Validación mínima
  if (!pasaje || !secciones?.length) {
    return res.status(400).json({ error: 'pasaje y secciones son requeridos.' });
  }

  // Cabeceras SSE — igual que lo que espera el HTML
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':          process.env.ANTHROPIC_API_KEY,
        'anthropic-version':  '2023-06-01',
        'Content-Type':       'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 4000,
        stream:     true,
        messages: [{ role: 'user', content: buildPrompt(req.body) }],
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      res.write(`data: ${JSON.stringify({ type: 'error', message: err?.error?.message || upstream.statusText })}\n\n`);
      return res.end();
    }

    // Pipe directo: cada chunk de Anthropic → cliente
    const reader  = upstream.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();

  } catch (err) {
    console.error('[generate] Error:', err.message);
    // Si los headers ya fueron enviados, terminamos limpio
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
