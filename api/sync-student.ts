// Vercel Serverless Function: sync-student
// Handles cross-device student registration synchronization on Vercel deployments

let studentsStore: any[] = [];

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
      if (data && (data.phone || data.id || data.username)) {
        const key = (data.phone || data.id || data.username).toLowerCase().trim();
        const idx = studentsStore.findIndex(
          s => (s.phone && s.phone.toLowerCase().trim() === key) ||
               (s.id && s.id.toLowerCase().trim() === key) ||
               (s.username && s.username.toLowerCase().trim() === key)
        );
        if (idx >= 0) {
          studentsStore[idx] = { ...studentsStore[idx], ...data };
        } else {
          studentsStore.unshift(data);
        }
      }
      return res.status(200).json({ success: true, total: studentsStore.length });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, data: studentsStore });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
