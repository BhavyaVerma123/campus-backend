import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';

export const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ?? true,
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use(errorHandler);
