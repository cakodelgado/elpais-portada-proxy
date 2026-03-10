/**
 * PROXY - Portada El País
 * Deploy en Vercel: pega esta carpeta /api en tu proyecto Vercel.
 * Endpoint: GET /api/portada?day=15&month=2&year=2024
 *
 * También sirve la imagen como proxy para evitar hotlinking bloqueado:
 * GET /api/portada?imageUrl=https://www.portadasdeelpais.com/img/...
 */

export default async function handler(req, res) {
  // CORS: permite llamadas desde cualquier origen (o restringe a tu dominio Playmo)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { day, month, year, imageUrl } = req.query;

  // ── Modo proxy de imagen ──────────────────────────────────────────────────
  // Si pasan imageUrl, devolvemos la imagen directamente (para el email)
  if (imageUrl) {
    try {
      const imgResponse = await fetch(imageUrl, {
        headers: {
          'Referer': 'https://www.portadasdeelpais.com/',
          'User-Agent': 'Mozilla/5.0'
        }
      });
      if (!imgResponse.ok) {
        return res.status(404).json({ error: 'Imagen no encontrada' });
      }
      const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const buffer = await imgResponse.arrayBuffer();
      return res.send(Buffer.from(buffer));
    } catch (err) {
      return res.status(500).json({ error: 'Error al obtener imagen', detail: err.message });
    }
  }

  // ── Modo búsqueda de portada por fecha ───────────────────────────────────
  if (!day || !month || !year) {
    return res.status(400).json({ error: 'Parámetros requeridos: day, month, year' });
  }

  const url =
    `https://www.portadasdeelpais.com/webpr_index.jsp` +
    `?filter_query=datefilter&gal_0=el_pais` +
    `&select_year=${year}&select_month=${month}` +
    `&select_from=${day}&select_to=${day}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.portadasdeelpais.com/webpr_main.jsp',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Error al contactar portadasdeelpais.com' });
    }

    const html = await response.text();

    // Extraer todas las imágenes de galería que aparecen en la página
    const regex = /img\/web\/gallery\/[^"'\s]+\.jpg/gi;
    const matches = [...html.matchAll(regex)].map(m => m[0]);

    if (!matches.length) {
      return res.status(404).json({
        error: 'No se encontró portada para esta fecha',
        fecha: `${day}/${month}/${year}`
      });
    }

    // La primera coincidencia es la portada del día
    const imageUrlFound = `https://www.portadasdeelpais.com/${matches[0]}`;

    // URL proxificada (para que el email no tenga problemas de hotlinking)
    // Reemplaza TUDOMINIO por tu URL de Vercel: ej. https://mi-proxy.vercel.app
    const proxyBase = process.env.PROXY_BASE_URL || `https://${process.env.VERCEL_URL}` || 'https://elpais-portada-proxy.vercel.app';
```

Esto hace que Vercel use su propia URL automáticamente sin que tengas que configurar nada. Guarda el cambio (commit) y en 1 minuto se redeploya solo.

Luego prueba de nuevo:
```
https://elpais-portada-proxy.vercel.app/api/portada?day=23&month=2&year=1981
    const imageUrlProxy = `${proxyBase}/api/portada?imageUrl=${encodeURIComponent(imageUrlFound)}`;

    return res.status(200).json({
      fecha: `${day}/${month}/${year}`,
      imageUrl: imageUrlFound,         // URL directa (para mostrar en pantalla)
      imageUrlProxy: imageUrlProxy,    // URL proxificada (para el email transaccional)
    });

  } catch (err) {
    return res.status(500).json({ error: 'Error interno', detail: err.message });
  }
}
