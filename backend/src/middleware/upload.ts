import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Absolute path to uploads/avatars
const avatarDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');

// Ensure folder exists at runtime
fs.mkdirSync(avatarDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const upload = multer({ storage });
