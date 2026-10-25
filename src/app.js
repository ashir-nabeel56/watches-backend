import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/products.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import orderRoutes from './routes/orders.routes.js';
import accountRoutes from './routes/account.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import uploadRoutes from './routes/upload.routes.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin allowed nahi hai'));
  },
}));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'watches-store-api' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }), authRoutes);
app.use('/api/products', productRoutes);
app.use('/api', catalogRoutes);
app.use('/api/orders', rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }), orderRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/admin/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;