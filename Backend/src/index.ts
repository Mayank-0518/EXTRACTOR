import express from "express";
import dotenv from "dotenv";
import passport from "passport";
import session from "express-session";
import cors from "cors";
import { connectDB } from './config/db.js';
import './config/passport.js';

// Import routes
import authRoutes from './routes/auth_routes.js';
import scraperRoutes from './routes/scraper_routes.js';
import extractionRoutes from './routes/extraction_routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Configure CORS with more security
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://your-production-frontend-url.com'] 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(session({
  secret: process.env.SESSION_SECRET || 'sessionsecret123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true, 
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' 
  }
}));

app.use(passport.initialize());
app.use(passport.session());

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/extraction', extractionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;