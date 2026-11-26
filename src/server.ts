// Starts the transfer limit API and the transfer page on a port. Only wiring: every rule lives in
// transfer-api.ts and send-transfer.ts. Run: npm start, then open http://127.0.0.1:4310/
// (PORT=4310 by default). The smoke and end-to-end tests start it the same way.
//
// Mutation testing skips this file (see stryker.config.mjs): there is no logic to mutate,
// and the smoke tests prove it starts and answers.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createHandler } from './transfer-api.ts';

const port = Number(process.env.PORT ?? 4310);
const page = readFileSync(new URL('./transfer-page.html', import.meta.url), 'utf8');
// One ledger for the life of the server: each customer's day total, in memory.
const handleRequest = createHandler();

const server = createServer((req, res) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk: string) => (body += chunk));
  req.on('end', () => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page);
      return;
    }
    const answer = handleRequest({ method: req.method ?? 'GET', path: url.pathname, body, query: Object.fromEntries(url.searchParams) });
    res.writeHead(answer.status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(answer.body));
  });
});

server.listen(port, '127.0.0.1', () => console.log(`Transfer page and API on http://127.0.0.1:${port}/`));
