// Starts the transfer limit API on a port. Only wiring: every rule lives in transfer-api.ts.
// Run: npm start  (PORT=4310 by default). The smoke tests start it the same way.
//
// Mutation testing skips this file (see stryker.config.mjs): there is no logic to mutate,
// and the smoke tests prove it starts and answers.
import { createServer } from 'node:http';
import { handleRequest } from './transfer-api.ts';

const port = Number(process.env.PORT ?? 4310);

const server = createServer((req, res) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk: string) => (body += chunk));
  req.on('end', () => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    const answer = handleRequest({ method: req.method ?? 'GET', path, body });
    res.writeHead(answer.status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(answer.body));
  });
});

server.listen(port, '127.0.0.1', () => console.log(`Transfer limit API on http://127.0.0.1:${port}`));
