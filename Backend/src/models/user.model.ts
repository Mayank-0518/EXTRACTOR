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

userSchema.pre('save', async function (next) {
  const user = this;
  
  if (!user.isModified('password') || !user.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

export const User = mongoose.model<IUser>('User', userSchema);