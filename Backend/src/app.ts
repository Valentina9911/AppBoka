
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middlewares/error.middleware';

import authRoutes from './modules/auth/auth.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);


app.use('/api', apiRouter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    statusCode: 404
  });
});

app.use(errorHandler);

export default app;
