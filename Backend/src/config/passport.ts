import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        // User found, return user
        return done(null, user);
      }
      
      // Check if user with this email already exists
      if (profile.emails && profile.emails.length > 0) {
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Link Google ID to existing account
          user.googleId = profile.id;
          await user.save();
          return done(null, user);
        }
      }
      
      // Create new user
      const email = profile.emails && profile.emails.length > 0 
        ? profile.emails[0].value 
        : `${profile.id}@google.user`;
      
      const name = profile.displayName || 
        (profile.name ? `${profile.name.givenName} ${profile.name.familyName}` : undefined);
      
      const newUser = await User.create({
        email,
        name,
        googleId: profile.id
      });
      
      done(null, newUser);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
));

// Serialize and deserialize user
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
