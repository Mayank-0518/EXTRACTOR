import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser {
  email: string;
  password?: string;
  name?: string;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function () {
      // Password is required only if the user doesn't have a googleId
      return !this.googleId;
    },
    minlength: 6
  },
  name: {
    type: String,
    trim: true
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  }
}, {
  timestamps: true
});

// Password hashing middleware
userSchema.pre('save', async function (next) {
  const user = this;
  
  // Only hash the password if it has been modified (or is new)
  if (!user.isModified('password') || !user.password) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the new salt
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

export const User = mongoose.model<IUser>('User', userSchema);