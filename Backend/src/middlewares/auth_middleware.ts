import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

// Add custom properties to Express Request
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

interface JwtPayload {
  id: string;
  email: string;
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authorization token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    // Find user by id
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    
    // Attach user to request
    req.user = user;
    req.userId = decoded.id;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't reject if no token
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Continue without authentication
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    // Find user by id
    const user = await User.findById(decoded.id);
    if (user) {
      // Attach user to request
      req.user = user;
      req.userId = decoded.id;
    }
    
    next();
  } catch (error) {
    // Continue without authentication in case of invalid token
    next();
  }
};