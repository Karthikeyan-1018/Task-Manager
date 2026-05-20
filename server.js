// ============================================================
//  server.js — TaskFlow Backend Entry Point
// ============================================================
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const connectDB  = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Connect to MongoDB Atlas
connectDB();

const app = express();

// ---- CORS: allow the frontend origin ----
// In development the frontend is opened as a file:// or localhost
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5500',   // VS Code Live Server
    'http://127.0.0.1:5500',
    'http://localhost:5173',   // Vite
    'null',                    // file:// origin (opening HTML directly)
  ],
  credentials: true,
}));

app.use(express.json());                          // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));  // Parse form data

// ---- Health check ----
app.get('/', (req, res) => {
  res.json({ success: true, message: 'TaskFlow API is running ✅', version: '1.0.0' });
});

// ---- API Routes ----
app.use('/api/auth',  authRoutes);
app.use('/api/tasks', taskRoutes);

// ---- Error Handlers (must be last) ----
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 TaskFlow server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});
