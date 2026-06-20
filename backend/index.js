import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes       from './routes/auth.js';
import sellerAuthRoutes from './routes/sellerAuth.js';
import sellerRoutes     from './routes/sellers.js';
import productRoutes    from './routes/products.js';
import adminRoutes      from './routes/admin.js';
import sellerProductRoutes from './routes/sellerProducts.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth',          authRoutes);
app.use('/api/seller-auth',   sellerAuthRoutes);
app.use('/api/sellers',       sellerRoutes);
app.use('/api/products',      productRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/seller',        sellerProductRoutes);

app.get('/', (_, res) => res.json({ status: 'ok', message: 'buy on uma api running' }));

mongoose.connect(process.env.MONGODB_URI )
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1); });

export default app;
