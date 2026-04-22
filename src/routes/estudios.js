const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');

// ─────────────────────────────────────────────────────────────
// GET /api/estudios
// Lista estudios con filtros opcionales: ?serie_id=1&pasaje=Juan
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { serie_id, pasaje } = req.query;
  try {
    const pool = await getPool();
    const req_ = pool.request();

    let where = 'WHERE 1=1';
    if (serie_id) {
      req_.input('serie_id', sql.Int, parseInt(serie_id));
      where += ' AND e.serie_id = @serie_id';
    }
    if (pasaje) {
      req_.input('pasaje', sql.NVarChar(100), `%${pasaje}%`);
      where += ' AND e.pasaje LIKE @pasaje';
    }

    const result = await req_.query(`
      SELECT
        e.id,
        e.serie_id,
        s.nombre   AS serie_nombre,
        e.pasaje,
        e.audiencia,
        e.profundidad,
        e.enfoque,
        e.idioma,
        e.created_at,
        COUNT(se.id) AS total_secciones
      FROM dbo.estudios e
      LEFT JOIN dbo.series  s  ON s.id  = e.serie_id
      LEFT JOIN dbo.secciones_estudio se ON se.estudio_id = e.id
      ${where}
      GROUP BY e.id, e.serie_id, s.nombre, e.pasaje, e.audiencia,
               e.profundidad, e.enfoque, e.idioma, e.created_at
      ORDER BY e.created_at DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('[GET /estudios]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/estudios/:id
// Devuelve un estudio completo con todas sus secciones
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const req_ = pool.request().input('id', sql.Int, req.params.id);

    const estudio = await req_.query(`
      SELECT
        e.*,
        s.nombre AS serie_nombre
      FROM dbo.estudios e
      LEFT JOIN dbo.series s ON s.id = e.serie_id
      WHERE e.id = @id
    `);

    if (!estudio.recordset.length) {
      return res.status(404).json({ error: 'Estudio no encontrado.' });
    }

    const secciones = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT tipo, etiqueta, contenido, orden
        FROM dbo.secciones_estudio
        WHERE estudio_id = @id
        ORDER BY orden
      `);

    res.json({
      ...estudio.recordset[0],
      secciones: secciones.recordset,
    });
  } catch (err) {
    console.error('[GET /estudios/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/estudios
// Guarda un estudio completo con sus secciones generadas.
// Llamado desde el HTML justo después de terminar el streaming.
//
// Body:
// {
//   serie_id?:   1,
//   pasaje:      "Juan 5:1-15",
//   audiencia:   "Grupo pequeño de adultos",
//   profundidad: "intermedio",
//   enfoque:     "Cristocéntrico ...",
//   idioma:      "es",
//   contexto?:   "...",
//   config_json: "[...]",      ← JSON.stringify(seccionesSeleccionadas)
//   secciones: [               ← array con contenido ya generado
//     { tipo: "preguntas", etiqueta: "Preguntas de discusión", contenido: "...", orden: 0 },
//     ...
//   ]
// }
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    serie_id, pasaje, audiencia, profundidad, enfoque,
    idioma, contexto, config_json, secciones,
  } = req.body;

  if (!pasaje?.trim()) {
    return res.status(400).json({ error: 'pasaje es requerido.' });
  }
  if (!Array.isArray(secciones) || !secciones.length) {
    return res.status(400).json({ error: 'secciones no puede estar vacío.' });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const trReq = new sql.Request(transaction);

    // 1. Insertar estudio
    const estudioResult = await trReq
      .input('serie_id',    sql.Int,           serie_id   || null)
      .input('pasaje',      sql.NVarChar(100),  pasaje.trim())
      .input('audiencia',   sql.NVarChar(100),  audiencia  || null)
      .input('profundidad', sql.NVarChar(50),   profundidad|| null)
      .input('enfoque',     sql.NVarChar(200),  enfoque    || null)
      .input('idioma',      sql.Char(2),        idioma     || 'es')
      .input('contexto',    sql.NVarChar(1000), contexto   || null)
      .input('config_json', sql.NVarChar(sql.MAX), config_json || null)
      .query(`
        INSERT INTO dbo.estudios
          (serie_id, pasaje, audiencia, profundidad, enfoque, idioma, contexto, config_json)
        OUTPUT INSERTED.id
        VALUES
          (@serie_id, @pasaje, @audiencia, @profundidad, @enfoque, @idioma, @contexto, @config_json)
      `);

    const estudioId = estudioResult.recordset[0].id;

    // 2. Insertar secciones (una por una — mssql no soporta bulk insert limpio en transacciones)
    for (let i = 0; i < secciones.length; i++) {
      const s = secciones[i];
      await new sql.Request(transaction)
        .input('estudio_id', sql.Int,            estudioId)
        .input('tipo',       sql.NVarChar(50),   s.tipo     || s.id   || 'sin_tipo')
        .input('etiqueta',   sql.NVarChar(100),  s.etiqueta || s.label|| s.tipo)
        .input('contenido',  sql.NVarChar(sql.MAX), s.contenido || '')
        .input('orden',      sql.TinyInt,        i)
        .query(`
          INSERT INTO dbo.secciones_estudio (estudio_id, tipo, etiqueta, contenido, orden)
          VALUES (@estudio_id, @tipo, @etiqueta, @contenido, @orden)
        `);
    }

    await transaction.commit();
    res.status(201).json({ id: estudioId, pasaje });

  } catch (err) {
    await transaction.rollback();
    console.error('[POST /estudios]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/estudios/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`DELETE FROM dbo.estudios WHERE id = @id`);
    // secciones_estudio tiene ON DELETE CASCADE — se limpian solas
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /estudios/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
