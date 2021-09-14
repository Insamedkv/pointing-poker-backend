import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { config } from '../config/db.config';

dotenv.config();

cloudinary.config({
  cloud_name: config.CLOUD_NAME,
  api_key: config.API_KEY,
  api_secret: config.API_SECRET,
});

export default cloudinary;
