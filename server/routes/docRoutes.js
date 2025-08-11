const express = require("express");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { uploadDocument, handleQuestion } = require("../controllers/docController");
const { client, COLLECTION_NAME } = require("../services/qdrantService");
const { getAllDocuments } = require("../controllers/docController");
const { deleteDocument } = require("../controllers/docController");

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 5 uploads per 15 minutes
  message: { error: "Too many uploads, please try again later" }
});
const questionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 questions per minute
  message: { error: "Too many questions, please try again later" }
});

// Multer configuration
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'text/plain', // .txt
      'application/vnd.oasis.opendocument.text', // .odt
      'application/rtf', // .rtf
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only document files are allowed"));
    }
  }
});

const router = express.Router();
router.post("/upload", uploadLimiter, upload.array("files", 5), uploadDocument);
router.post("/ask", questionLimiter, handleQuestion);
router.get("/documents", getAllDocuments);
router.delete("/delete", deleteDocument);

module.exports = router;
