-- ============================================================
--  Esquema: Histórico de guías de estudio bíblico
--  Compatible: SQL Server 2016+
-- ============================================================

-- ----------------------------------------------------------
-- 1. Series de estudio
--    Ej: "Evangelio de Juan 2025", "Romanos - Grupos pequeños"
-- ----------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'series')
BEGIN
    CREATE TABLE dbo.series (
        id          INT          IDENTITY(1,1)   PRIMARY KEY,
        nombre      NVARCHAR(200) NOT NULL,
        descripcion NVARCHAR(500) NULL,
        activa      BIT           NOT NULL DEFAULT 1,
        created_at  DATETIME2(0)  NOT NULL DEFAULT GETDATE(),
        updated_at  DATETIME2(0)  NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla series creada.';
END
ELSE
    PRINT 'Tabla series ya existe — omitida.';
GO

-- ----------------------------------------------------------
-- 2. Estudios generados
--    Cada fila = una guía completa para un pasaje
-- ----------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'estudios')
BEGIN
    CREATE TABLE dbo.estudios (
        id           INT           IDENTITY(1,1)  PRIMARY KEY,
        serie_id     INT           NULL  REFERENCES dbo.series(id) ON DELETE SET NULL,
        pasaje       NVARCHAR(100) NOT NULL,        -- "Juan 5:1-15"
        audiencia    NVARCHAR(100) NULL,
        profundidad  NVARCHAR(50)  NULL,            -- 'basico' | 'intermedio' | 'avanzado'
        enfoque      NVARCHAR(200) NULL,
        idioma       CHAR(2)       NOT NULL DEFAULT 'es',
        contexto     NVARCHAR(1000) NULL,           -- contexto adicional del grupo
        config_json  NVARCHAR(MAX) NULL,            -- secciones seleccionadas (JSON array)
        created_at   DATETIME2(0)  NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabla estudios creada.';
END
ELSE
    PRINT 'Tabla estudios ya existe — omitida.';
GO

-- ----------------------------------------------------------
-- 3. Secciones del estudio
--    Una fila por sección generada (contexto, preguntas, etc.)
--    Permite buscar, exportar y regenerar por sección
-- ----------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'secciones_estudio')
BEGIN
    CREATE TABLE dbo.secciones_estudio (
        id          INT           IDENTITY(1,1)  PRIMARY KEY,
        estudio_id  INT           NOT NULL  REFERENCES dbo.estudios(id) ON DELETE CASCADE,
        tipo        NVARCHAR(50)  NOT NULL,   -- 'contexto_sec' | 'preguntas' | 'aplicacion' ...
        etiqueta    NVARCHAR(100) NOT NULL,   -- "Preguntas de discusión" (display label)
        contenido   NVARCHAR(MAX) NOT NULL,
        orden       TINYINT       NOT NULL DEFAULT 0
    );
    PRINT 'Tabla secciones_estudio creada.';
END
ELSE
    PRINT 'Tabla secciones_estudio ya existe — omitida.';
GO

-- ----------------------------------------------------------
-- Índices de acceso frecuente
-- ----------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_estudios_serie_id')
    CREATE INDEX IX_estudios_serie_id ON dbo.estudios(serie_id, created_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_secciones_estudio_id')
    CREATE INDEX IX_secciones_estudio_id ON dbo.secciones_estudio(estudio_id, orden);
GO

-- ----------------------------------------------------------
-- Datos de ejemplo
-- ----------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.series WHERE nombre = 'Evangelio de Juan 2025')
BEGIN
    INSERT INTO dbo.series (nombre, descripcion)
    VALUES 
        ('Evangelio de Juan 2025',     'Serie anual de grupos pequeños — libro completo'),
        ('Epístola a los Romanos',     'Estudio doctrinal avanzado para líderes'),
        ('Salmos — Devocional matutino','Lecturas devocionales personales');
    PRINT 'Series de ejemplo insertadas.';
END
GO

PRINT '✓ Schema listo.';
