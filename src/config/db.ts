import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { config } from './db.config';

dotenv.config();

mongoose.connection.on('connected', () => {
  console.log('DB connected..');
});
mongoose.connection.on('reconnected', () => {
  console.log('DB reconnected..');
});
mongoose.connection.on('error', (error) => {
  console.log('DB connection error..', error);
  mongoose.disconnect();
});
mongoose.connection.on('disconnected', () => {
  console.log('DB disconnected..');
});

const connectDb = (): Promise<typeof mongoose> => mongoose.connect(config.mongoURI, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

export { connectDb };
