import express from 'express';
import passport from 'passport';
import { register, login, googleCallback, getCurrentUser } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';



const router = express.Router();



router.post('/register', register);



router.post('/login', login);



router.get('/google', (req, res, next) => {
  const state = req.query.state as string | undefined;
  const authOptions = {
    scope: ['profile', 'email'],
    state: state || undefined
  };
  passport.authenticate('google', authOptions)(req, res, next);
});



router.get('/google/callback', 
  (req, res, next) => {
    const state = req.query.state as string | undefined;
    
    passport.authenticate('google', { 
      failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=authentication_failed${state ? `&state=${state}` : ''}`,
      session: false 
    })(req, res, next);
  },
  googleCallback
);




router.get('/me', authMiddleware, getCurrentUser);

export default router;
