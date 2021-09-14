import multer from 'multer';
import path from 'path';

export const upload = multer({
  storage: multer.diskStorage({}),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
      cb(null, false);
      return;
    }
    cb(null, true);
  },
});
