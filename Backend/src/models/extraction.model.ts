import mongoose from 'mongoose';

export interface IExtraction {
  userId: string;
  url: string;
  title: string;
  selectors: string[];
  data: Record<string, any>[] | Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const extractionSchema = new mongoose.Schema<IExtraction>(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    url: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    selectors: {
      type: [String],
      required: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for faster queries
extractionSchema.index({ userId: 1, createdAt: -1 });

export const Extraction = mongoose.model<IExtraction>('Extraction', extractionSchema);