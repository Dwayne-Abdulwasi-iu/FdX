const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3002',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'https://fedex-shipping.onrender.com'
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection with improved error handling and fallback
const connectDB = async () => {
  try {
    // Simplified mongoose options
    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    // Try MongoDB Atlas first
    let conn;
    try {
      console.log('Attempting to connect to MongoDB Atlas...');
      conn = await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
      console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    } catch (atlasError) {
      console.log('❌ MongoDB Atlas connection failed, trying local MongoDB...');
      
      // Fallback to local MongoDB
      const localURI = 'mongodb://localhost:27017/fedex-shipping';
      conn = await mongoose.connect(localURI, mongooseOptions);
      console.log(`✅ Local MongoDB Connected: ${conn.connection.host}`);
      console.log('💡 Note: Using local MongoDB. For production, ensure MongoDB Atlas connectivity.');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log(`
� SERVER IS RUNNING WITHOUT DATABASE
✅ Frontend available at: http://localhost:3002
⚠️  Some features requiring database will not work:
   - User registration/login
   - Package tracking
   - Admin dashboard data

🔧 To fix database connection:
   1. For Render deployment: Use MongoDB Atlas
   2. For local development: Install MongoDB locally
   3. Frontend testing: Works without database
    `);
  }
};

// Connect to database
connectDB();

// Routes
const authRoutes = require('./routes/auth');
const shipmentRoutes = require('./routes/shipments');
const trackingRoutes = require('./routes/tracking');
const adminRoutes = require('./routes/admin');
const contactRoutes = require('./routes/contact');

app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'FedeX Shipping Server is running',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend for all other routes (catch-all route must be last)
app.get('*', (req, res) => {
  // Log unusual requests for debugging
  if (req.url.includes('%22') || req.url.includes('undefined')) {
    console.log('Unusual URL request:', req.url, 'from:', req.headers.referer || 'direct');
  }
  
  try {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } catch (error) {
    console.error('Error serving frontend:', error);
    res.status(500).send('Server Error: Unable to serve frontend');
  }
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚚 FedeX Shipping Server running on port ${PORT}`);
    console.log(`📱 Frontend available at http://localhost:${PORT}`);
    console.log(`🔗 API available at http://localhost:${PORT}/api`);
});module.exports = app;