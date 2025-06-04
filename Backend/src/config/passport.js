import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';

// load and verify Google OAuth credentials
const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL  = process.env.GOOGLE_CALLBACK_URL;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment');
}

passport.use(new GoogleStrategy({
    clientID:     GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL:  GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user data from Google profile
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      const name = profile.displayName || (profile.name ? `${profile.name.givenName} ${profile.name.familyName}` : null);
      const googleId = profile.id;
      
      if (!email) {
        return done(new Error('Google account does not have a public email address'));
      }
      
      // Find or create user in our database
      let user = await User.findOne({ $or: [{ googleId }, { email }] });
      
      if (user) {
        // Update existing user with Google info if they haven't logged in with Google before
        if (!user.googleId) {
          user.googleId = googleId;
          await user.save();
        }
      } else {
        // Create new user from Google profile
        user = await User.create({
          googleId,
          email,
          name,
          // No password for Google auth users
          authType: 'google'
        });
      }
      
      // Create JWT token for the user
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Return user with token for our authentication system
      return done(null, { user, token });
    } catch (error) {
      console.error('Google authentication error:', error);
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  // Store only the user ID in the session
  done(null, user.user ? user.user._id : user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Retrieve the user from database using the ID stored in session
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;