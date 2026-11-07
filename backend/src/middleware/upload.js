const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads', folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
};

const uploadEquipmentImages = multer({
  storage: createStorage('equipment'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
}).array('images', 5);

const uploadTransactionImages = multer({
  storage: createStorage('transactions'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
}).array('images', 5);

const uploadProfilePicture = multer({
  storage: createStorage('profiles'),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
}).single('profilePicture');

module.exports = { uploadEquipmentImages, uploadTransactionImages, uploadProfilePicture };
