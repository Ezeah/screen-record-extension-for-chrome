const express = require('express');
const dotenv = require('dotenv').config();
const { errorHandler } = require('./middlewares/error.middleware');
const multer = require('multer');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const srt = require('node-srt');

const app = express();
const PORT = process.env.PORT || 8000;
const UPLOADS_DIRECTORY = process.env.UPLOADS_DIRECTORY || 'uploads/';

// Set up Multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use UPLOADS_DIRECTORY variable
    cb(null, UPLOADS_DIRECTORY);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Handle file uploads with Multer error handling
app.post('/api/v1/upload', upload.single('video'), (req, res) => {
  const videoFilePath = path.join(UPLOADS_DIRECTORY, req.file.filename);
  const outputSrtPath = path.join(UPLOADS_DIRECTORY, req.file.filename + '.srt');

  // Transcribe video to SRT format
  ffmpeg(videoFilePath)
    .videoCodec('copy')
    .audioCodec('aac')
    .on('end', () => {
      // Read the generated SRT file
      const srtData = srt.parseFile(outputSrtPath);

      // Send SRT data to frontend
      res.json({ transcription: srtData });
    })
    .on('error', (err) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Transcription failed' });
    })
    .save(outputSrtPath);
});

// Serve the video file for playback with path.join
app.use('/api/v1/videos', express.static(path.join(__dirname, 'uploads')));

app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
