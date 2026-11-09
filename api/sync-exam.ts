// Vercel Serverless Function: sync-exam
// Handles cross-device exam synchronization on Vercel deployments

let examsStore: any[] = [];

export default function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (data && (data.code || data.id)) {
        const idx = examsStore.findIndex(
          e => (data.code && e.code && e.code.toLowerCase() === data.code.toLowerCase()) ||
               (data.id && e.id && e.id.toLowerCase() === data.id.toLowerCase())
        );
        if (idx >= 0) {
          examsStore[idx] = { ...examsStore[idx], ...data };
        } else {
          examsStore.unshift(data);
        }
      }
      return res.status(200).json({ success: true, total: examsStore.length });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'GET') {
    const code = (req.query?.code || req.query?.id || '') as string;
    if (code) {
      const match = examsStore.find(
        e => (e.code && e.code.toLowerCase() === code.toLowerCase().trim()) ||
             (e.id && e.id.toLowerCase() === code.toLowerCase().trim())
      );
      if (match) {
        return res.status(200).json({ success: true, data: match });
      }
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }
    return res.status(200).json({ success: true, data: examsStore });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
