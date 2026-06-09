import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API de Dasha escuchando en el puerto ${env.PORT} (${env.NODE_ENV})`);
});
