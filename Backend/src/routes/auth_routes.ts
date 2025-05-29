import express from 'express';
import passport from 'passport';
import { register, login, googleCallback, getCurrentUser } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Register a new user
router.post('/register', register);

// User login
router.post('/login', login);

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }),
  googleCallback
);

// Get current user
router.get('/me', authMiddleware, getCurrentUser);

export default router;
