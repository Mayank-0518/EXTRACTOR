import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { AuthRequest } from '../middleware/auth.middleware.js';



// for registering user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }
    
    const user = new User({ email, password, name });
    await user.save();
    
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};


//Login Contoller 
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
    
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};


//OAuth Callback
export const googleCallback = (req: any, res: Response): void => {
  try {
    const state = req.query.state as string | undefined;
    const stateParam = state ? `&state=${state}` : '';
    
    if (!req.user || !req.user._id) {
      console.error('OAuth callback: User object is missing or invalid');
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=authentication_failed${stateParam}`);
      return;
    }

    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );
    
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}${stateParam}`);  } catch (error) {
    console.error('OAuth callback error:', error);
    const state = req.query.state as string | undefined;
    const stateParam = state ? `&state=${state}` : '';
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=server_error${stateParam}`);
  }
};


//get current user
export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }
    
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.json({
      id: user._id,
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};
