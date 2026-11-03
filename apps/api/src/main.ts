import 'reflect-metadata';
import { createApp } from './app';
import { getPort } from './config/environment';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const port = getPort();
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
