# 📖 Semilla — Generador de Guías de Estudio Bíblico

> _"La semilla cayó en buena tierra y dio fruto."_ — Mateo 13:8

**Semilla** es una herramienta diseñada para líderes y pastores que quieren preparar guías de estudio bíblico profundas y bien estructuradas, sin invertir horas en el proceso. A partir de cualquier pasaje, genera en segundos una guía completa con contexto histórico, preguntas de discusión, aplicación práctica y más — potenciada por IA y guardada con historial organizado por series.

---

## ✨ ¿Qué hace Semilla?

- **Genera guías completas** a partir de un pasaje bíblico con un clic
- **Personaliza** el enfoque teológico, la audiencia y la profundidad del estudio
- **Organiza por series** (ej. "Evangelio de Juan 2025", "Romanos para líderes")
- **Guarda el historial** de todas las guías generadas en SQL Server
- **Exporta** en Markdown o copia directamente para usar en tu reunión
- **Streaming en tiempo real** — el contenido aparece mientras se genera, como una conversación

---

## 🗂️ Secciones que genera

| Sección | Descripción |
|---|---|
| Contexto del pasaje | Autor, destinatarios, época, cultura |
| Observación del texto | 5–7 preguntas de observación respondidas desde el texto |
| Interpretación | Idea central y tensión teológica |
| Palabras clave | 4–6 términos con su significado original |
| Cristo en el texto | Cristología explícita o tipológica |
| Preguntas de discusión | 6–8 preguntas progresivas para el grupo |
| Aplicación práctica | Cognitiva, afectiva y volitiva (hacer esta semana) |
| Versículo para memorizar | Con razón de por qué memorizarlo |
| Guía de oración | Oración guiada de cierre para el líder |

---

## 🏗️ Arquitectura

```
┌──────────────────┐        ┌───────────────────┐        ┌──────────────────┐
│   HTML estático  │──────▶ │  Node.js + Express │──────▶ │  Anthropic API   │
│  (Netlify/local) │        │     (Railway)      │        │ claude-sonnet-4  │
└──────────────────┘        └────────┬──────────┘        └──────────────────┘
                                     │
                                     ▼
                            ┌───────────────────┐
                            │    SQL Server      │
                            │  (Azure SQL /      │
                            │   Express Linux)   │
                            └───────────────────┘
```

**Stack:**
- **Frontend:** HTML + CSS + JS vanilla (sin frameworks, cero dependencias)
- **Backend:** Node.js 20 + Express 4
- **Base de datos:** SQL Server 2016+ / Azure SQL
- **IA:** Anthropic Claude Sonnet 4 (streaming SSE)
- **Hosting recomendado:** Railway (backend) + Netlify (frontend)

---

## 🚀 Inicio rápido

### Prerrequisitos

- Node.js 20+
- SQL Server 2016+ (local, VPS o Azure SQL)
- API Key de Anthropic (`sk-ant-...`)

### 1. Clonar e instalar

```bash
git clone https://github.com/tu-usuario/semilla.git
cd semilla
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
ANTHROPIC_API_KEY=sk-ant-...

DB_SERVER=localhost
DB_PORT=1433
DB_NAME=BibleStudy
DB_USER=sa
DB_PASSWORD=tu_password
DB_ENCRYPT=false
DB_TRUST_CERT=true

PORT=3000
CORS_ORIGIN=*
```

### 3. Crear la base de datos

Ejecuta el script DDL en SQL Server (SSMS, Azure Data Studio o `sqlcmd`):

```bash
sqlcmd -S localhost -U sa -P tu_password -i sql/01_schema.sql
```

### 4. Levantar el servidor

```bash
# Desarrollo (recarga automática)
npm run dev

# Producción
npm start
```

El servidor queda en `http://localhost:3000`. Abre `generador_estudio_biblico.html` en el navegador.

---

## 📡 API Reference

### Generar guía (streaming SSE)

```http
POST /api/generate
Content-Type: application/json
```

```json
{
  "pasaje": "Juan 5:1-15",
  "audiencia": "Grupo pequeño de adultos",
  "profundidad": "intermedio",
  "enfoque": "Cristocéntrico (Cristo en todo el texto)",
  "idioma": "es",
  "contexto": "Llevamos 3 semanas en Juan...",
  "secciones": [
    { "id": "preguntas", "label": "Preguntas de discusión" },
    { "id": "aplicacion", "label": "Aplicación práctica" }
  ]
}
```

Responde con un stream SSE idéntico al de Anthropic — el HTML lo consume sin cambios.

---

### Series

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/series` | Lista todas las series activas con conteo de estudios |
| `POST` | `/api/series` | Crea una nueva serie `{ nombre, descripcion? }` |
| `DELETE` | `/api/series/:id` | Desactiva una serie (soft delete) |

### Estudios

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/estudios` | Lista estudios. Filtra con `?serie_id=1&pasaje=Juan` |
| `POST` | `/api/estudios` | Guarda una guía completa con sus secciones |
| `GET` | `/api/estudios/:id` | Detalle completo con todas las secciones |
| `DELETE` | `/api/estudios/:id` | Elimina un estudio (cascada a secciones) |

### Health check

```http
GET /health
→ { "ok": true, "ts": "2025-04-22T..." }
```

---

## 🗄️ Esquema de base de datos

```sql
series
  id, nombre, descripcion, activa, created_at, updated_at

estudios
  id, serie_id (FK), pasaje, audiencia, profundidad,
  enfoque, idioma, contexto, config_json, created_at

secciones_estudio
  id, estudio_id (FK, CASCADE), tipo, etiqueta, contenido, orden
```

---

## ☁️ Despliegue en Railway

1. Sube el repositorio a GitHub
2. En [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Selecciona el repo — Railway detecta Node automáticamente
4. En **Variables**, agrega todas las del `.env.example`
5. En **Settings → Networking** → genera un dominio público
6. Actualiza `API_BASE` en el HTML con la URL generada

```js
const API_BASE = 'https://semilla-api.up.railway.app/api';
```

---

## 🤝 Contribuir

Este proyecto nació para servir a la iglesia. Si eres líder, pastor o desarrollador y quieres mejorarlo, las contribuciones son bienvenidas:

1. Fork del repositorio
2. Crea tu rama: `git checkout -b feature/nueva-seccion`
3. Commit: `git commit -m "feat: agrega sección de contexto misional"`
4. Push: `git push origin feature/nueva-seccion`
5. Abre un Pull Request

---

## 📄 Licencia

MIT — libre para uso personal, ministerial y congregacional.

---

<p align="center">
  Hecho con ❤️ para la iglesia · Quito, Ecuador
</p>
