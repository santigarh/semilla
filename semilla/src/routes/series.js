const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');

/**
 * GET /api/series
 * Lista todas las series activas
 */
router.get('/', async (req, res) => {
  try {
    const pool   = await getPool();
    const result = await pool.request().query(`
      SELECT 
        s.id,
        s.nombre,
        s.descripcion,
        s.created_at,
        COUNT(e.id) AS total_estudios
      FROM dbo.series s
      LEFT JOIN dbo.estudios e ON e.serie_id = s.id
      WHERE s.activa = 1
      GROUP BY s.id, s.nombre, s.descripcion, s.created_at
      ORDER BY s.created_at DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('[GET /series]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/series
 * Crea una nueva serie
 * Body: { nombre, descripcion? }
 */
router.post('/', async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'nombre es requerido.' });
  }

  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('nombre',      sql.NVarChar(200), nombre.trim())
      .input('descripcion', sql.NVarChar(500), descripcion?.trim() || null)
      .query(`
        INSERT INTO dbo.series (nombre, descripcion)
        OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.descripcion, INSERTED.created_at
        VALUES (@nombre, @descripcion)
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('[POST /series]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/series/:id
 * Desactiva (soft delete) una serie
 */
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`UPDATE dbo.series SET activa = 0, updated_at = GETDATE() WHERE id = @id`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /series]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
