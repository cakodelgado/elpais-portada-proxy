export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Modo proxy de imagen (para mostrar en email sin problemas de hotlinking)
  const { imageUrl } = req.query;
  if (imageUrl) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) return res.status(404).json({ error: 'Imagen no encontrada' });
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(Buffer.from(buffer));
    } catch (e) {
      return res.status(500).json({ error: 'Error al obtener imagen' });
    }
  }

  // Modo búsqueda de portada por fecha
  const day   = parseInt(req.query.day,   10);
  const month = parseInt(req.query.month, 10);
  const year  = parseInt(req.query.year,  10);

  if (!day || !month || !year) {
    return res.status(400).json({ error: 'Faltan parámetros: day, month, year' });
  }

  const yyyy    = String(year);
  const mm      = String(month).padStart(2, '0');
  const dd      = String(day).padStart(2, '0');
  const yyyymmdd = yyyy + mm + dd;

  // URLs construidas directamente — no hay scraping
  const jpgUrl = `https://srv00.epimg.net/pdf/elpais/snapshot/${yyyy}/${mm}/elpais/${yyyymmdd}Big.jpg`;
  const pdfUrl = `https://srv00.epimg.net/pdf/elpais/1aPagina/${yyyy}/${mm}/ep-${yyyymmdd}.pdf`;

  // Verificar que la portada existe (HEAD request al JPG)
  try {
    const check = await fetch(jpgUrl, { method: 'HEAD' });
    if (!check.ok) {
      return res.status(404).json({
        error: 'No se encontró portada para esta fecha',
        fecha: `${dd}/${mm}/${yyyy}`
      });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Error al verificar la portada' });
  }

  // Comprobar si hay PDF disponible
  let pdfDisponible = false;
  try {
    const pdfCheck = await fetch(pdfUrl, { method: 'HEAD' });
    pdfDisponible = pdfCheck.ok;
  } catch (e) { /* sin PDF */ }

  const proxyBase = `https://${req.headers.host}`;

  return res.status(200).json({
    fecha:         `${dd}/${mm}/${yyyy}`,
    imageUrl:      jpgUrl,                  // JPG alta res para mostrar en form y email
    pdfUrl:        pdfDisponible ? pdfUrl : null,  // PDF si está disponible
    imageUrlProxy: `${proxyBase}/api/portada?imageUrl=${encodeURIComponent(jpgUrl)}`
  });
}
