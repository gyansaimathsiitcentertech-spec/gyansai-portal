import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';

function syncExamPlugin() {
  const examsFilePath = path.resolve('./shared_exams_store.json');
  const studentsFilePath = path.resolve('./shared_students_store.json');
  const sharedExamsMap = new Map<string, any>();
  const sharedStudentsMap = new Map<string, any>();

  // Preload exams from persistent disk storage
  try {
    if (fs.existsSync(examsFilePath)) {
      const content = fs.readFileSync(examsFilePath, 'utf-8');
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        list.forEach(item => {
          if (item.code) sharedExamsMap.set(item.code.toLowerCase().trim(), item);
          if (item.id) sharedExamsMap.set(item.id.toLowerCase().trim(), item);
        });
      }
    }
  } catch (e) {
    console.warn('Failed to load shared exams from disk:', e);
  }

  // Preload students from persistent disk storage
  try {
    if (fs.existsSync(studentsFilePath)) {
      const content = fs.readFileSync(studentsFilePath, 'utf-8');
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        list.forEach(item => {
          const key = (item.phone || item.id || item.username || '').toLowerCase().trim();
          if (key) sharedStudentsMap.set(key, item);
        });
      }
    }
  } catch (e) {
    console.warn('Failed to load shared students from disk:', e);
  }

  const saveExamsToDisk = () => {
    try {
      const uniqueExams = Array.from(new Set(sharedExamsMap.values()));
      fs.writeFileSync(examsFilePath, JSON.stringify(uniqueExams, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save shared exams to disk:', e);
    }
  };

  const saveStudentsToDisk = () => {
    try {
      const uniqueStudents = Array.from(new Set(sharedStudentsMap.values()));
      fs.writeFileSync(studentsFilePath, JSON.stringify(uniqueStudents, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save shared students to disk:', e);
    }
  };

  return {
    name: 'sync-exam-middleware',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        // 1. Exam sync endpoint
        if (req.url && req.url.startsWith('/api/sync-exam')) {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                if (data && (data.code || data.id)) {
                  if (data.code) sharedExamsMap.set(data.code.toLowerCase().trim(), data);
                  if (data.id) sharedExamsMap.set(data.id.toLowerCase().trim(), data);
                  saveExamsToDisk();
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, total: sharedExamsMap.size }));
              } catch (e: any) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: e.message }));
              }
            });
            return;
          }

          if (req.method === 'GET') {
            const code = urlObj.searchParams.get('code') || urlObj.searchParams.get('id');
            res.setHeader('Content-Type', 'application/json');
            if (code) {
              const item = sharedExamsMap.get(code.toLowerCase().trim());
              if (item) {
                res.end(JSON.stringify({ success: true, data: item }));
              } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ success: false, error: 'Exam not found' }));
              }
              return;
            }
            const list = Array.from(new Set(sharedExamsMap.values()));
            res.end(JSON.stringify({ success: true, data: list }));
            return;
          }
        }

        // 2. Student registration sync endpoint
        if (req.url && req.url.startsWith('/api/sync-student')) {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                if (data && (data.id || data.phone || data.username)) {
                  const key = (data.phone || data.id || data.username).toLowerCase().trim();
                  sharedStudentsMap.set(key, data);
                  saveStudentsToDisk();
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, total: sharedStudentsMap.size }));
              } catch (e: any) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: e.message }));
              }
            });
            return;
          }

          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            const list = Array.from(new Set(sharedStudentsMap.values()));
            res.end(JSON.stringify({ success: true, data: list }));
            return;
          }
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), syncExamPlugin()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
