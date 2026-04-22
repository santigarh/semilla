/**
 * Construye el prompt para Claude a partir de los parámetros del estudio.
 * Replica la lógica de buildPrompt() del HTML original.
 */
function buildPrompt({ pasaje, audiencia, profundidad, enfoque, idioma, contexto, secciones }) {
  const idiomaLabel = idioma === 'en' ? 'English' : 'español';

  const encabezados = secciones
    .map(s => `[${s.label.toUpperCase()}]`)
    .join('\n');

  return `Eres un pastor y maestro bíblico experto en hermenéutica y educación cristiana.
Genera una guía de estudio bíblico completa y práctica en ${idiomaLabel}.

PASAJE: ${pasaje}
AUDIENCIA: ${audiencia}
PROFUNDIDAD: ${profundidad}
ENFOQUE TEOLÓGICO: ${enfoque}
${contexto ? `CONTEXTO DEL GRUPO: ${contexto}` : ''}

Genera las siguientes secciones en orden, usando exactamente estos encabezados (en mayúsculas y entre corchetes):

${encabezados}

INSTRUCCIONES POR SECCIÓN:
- [CONTEXTO DEL PASAJE]: Quién escribió, a quién, cuándo, qué sucedía en esa cultura. 2-3 párrafos.
- [OBSERVACIÓN DEL TEXTO]: Lee el texto despacio. Haz 5-7 preguntas de observación (¿Qué ves? ¿Quién? ¿Cuándo? ¿Dónde? ¿Qué acciones?) respondidas brevemente desde el texto.
- [INTERPRETACIÓN]: ¿Qué significa este pasaje? Tensión teológica, estructura, idea central en 1 oración.
- [PALABRAS CLAVE]: 4-6 palabras o frases importantes del pasaje con su significado en contexto original.
- [CRISTO EN EL TEXTO]: ¿Cómo apunta o revela a Jesucristo este pasaje? (cristología explícita o tipológica).
- [PREGUNTAS DE DISCUSIÓN]: 6-8 preguntas abiertas, progresivas (observación → interpretación → aplicación). Apropiadas para ${audiencia}.
- [APLICACIÓN PRÁCTICA]: 3-4 aplicaciones concretas y específicas. Cognitiva (creer), afectiva (sentir), volitiva (hacer esta semana).
- [VERSÍCULO PARA MEMORIZAR]: 1-2 versículos del pasaje con una razón breve de por qué memorizarlos.
- [GUÍA DE ORACIÓN]: Una oración guiada de 3-4 pasos basada en el pasaje, que el líder pueda usar al cierre.

Usa lenguaje claro, cálido y accesible. Cada sección debe ser autocontenida y práctica para usar directamente en el grupo.`;
}

module.exports = { buildPrompt };
