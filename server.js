const express = require('express');
const dotenv = require('dotenv').config();
const { errorHandler } = require('./middlewares/error.middleware');
const multer = require('multer');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const app = express();
const PORT = process.env.PORT || 8000;
const UPLOADS_DIRECTORY = process.env.UPLOADS_DIRECTORY || 'uploads/';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIRECTORY);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.post('/api/v1/upload', upload.single('video'), (req, res) => {
  const { path: filePath } = req.file;
  const outputFilePath = path.join(__dirname, UPLOADS_DIRECTORY, 'output.wav');

  ffmpeg(filePath)
    .toFormat('wav')
    .on('end', () => {
      const SpeechRecognition = webkitSpeechRecognition || SpeechRecognition;
      const recognition = new SpeechRecognition();
      const audioFile = fs.readFileSync(outputFilePath);
      const audioBuffer = audioFile.buffer.slice(audioFile.byteOffset, audioFile.byteOffset + audioFile.byteLength);
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      recognition.language = 'en-US';

      recognition.onresult = (event) => {
        const transcription = event.results[0][0].transcript;
        res.json({ transcript: transcription });
      };

      recognition.onerror = (event) => {
        console.error('Error occurred while transcribing:', event.error);
        res.status(500).json({ error: 'Transcription failed.' });
      };

      recognition.onend = () => {
        console.log('Transcription ended.');
      };

      recognition.start();
      recognition.postMessage({ command: 'start', audioBlob });
    })
    .on('error', (err) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Transcription failed.' });
    })
    .save(outputFilePath);
});

app.use('/api/v1/videos', express.static(path.join(__dirname, 'uploads')));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
