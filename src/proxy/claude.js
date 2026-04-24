const express = require("express");
const router = express.Router();
const { buildPrompt } = require("./promptBuilder");

/**
 * POST /api/generate
 *
 * Proxy hacia Groq con streaming SSE.
 * Groq usa el formato OpenAI: choices[0].delta.content
 * El backend normaliza al formato que espera el HTML: { type, delta: { text } }
 *
 * Body: { pasaje, audiencia, profundidad, enfoque, idioma, contexto, secciones[] }
 */
router.post("/", async (req, res) => {
  const { pasaje, secciones } = req.body;

  if (!pasaje || !secciones?.length) {
    return res
      .status(400)
      .json({ error: "pasaje y secciones son requeridos." });
  }

  // Cabeceras SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const upstream = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 4000,
          temperature: 0.7,
          stream: true,
          messages: [{ role: "user", content: buildPrompt(req.body) }],
        }),
      },
    );

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      const msg = err?.error?.message || upstream.statusText;
      console.error("[generate] Groq error:", msg);
      res.write(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`);
      return res.end();
    }

    // Groq devuelve: data: {"choices":[{"delta":{"content":"..."},...}],...}
    // Normalizamos al formato que el HTML ya conoce:
    //   data: {"type":"content_block_delta","delta":{"text":"..."}}
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // último fragmento incompleto

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        const raw = trimmed.slice(6);
        if (raw === "[DONE]") {
          res.write("data: [DONE]\n\n");
          continue;
        }

        try {
          const chunk = JSON.parse(raw);
          const text = chunk?.choices?.[0]?.delta?.content;
          if (text) {
            // Emitimos en el formato que el HTML espera (mismo que Anthropic)
            const normalized = {
              type: "content_block_delta",
              delta: { text },
            };
            res.write(`data: ${JSON.stringify(normalized)}\n\n`);
          }
        } catch {
          // chunk malformado — ignorar
        }
      }
    }

    res.end();
  } catch (err) {
    console.error("[generate] Error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`,
      );
      res.end();
    }
  }
});

module.exports = router;
