import { configuration } from './core.js';
import { createServer } from './index.js';

const config = configuration();
const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Nieprawidłowy PORT');
createServer(config).listen(port, '0.0.0.0', () => console.log(`PlanPasika Ops Agent nasłuchuje na porcie ${port}.`));
