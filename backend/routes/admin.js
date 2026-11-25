const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Shipment = require('../models/Shipment');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { sendBulkEmail } = require('../utils/mailer');

const router = express.Router();

// Protect all admin routes
router.use(protect);
router.use(authorize('admin', 'staff'));

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get various statistics
    const stats = await Promise.all([
      Shipment.countDocuments(), // Total shipments
      Shipment.countDocuments({ createdAt: { $gte: startOfDay } }), // Today's shipments
      Shipment.countDocuments({ createdAt: { $gte: startOfWeek } }), // This week's shipments
      Shipment.countDocuments({ createdAt: { $gte: startOfMonth } }), // This month's shipments
      Shipment.countDocuments({ 'status.current': 'delivered' }), // Delivered shipments
      Shipment.countDocuments({ 'status.current': 'in_transit' }), // In transit shipments
      Shipment.countDocuments({ 'status.current': 'pending' }), // Pending shipments
      User.countDocuments(), // Total users
      User.countDocuments({ createdAt: { $gte: startOfMonth } }) // New users this month
    ]);

    // Calculate revenue (simplified)
    const revenueResult = await Shipment.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$service.cost' } } }
    ]);

    const monthlyRevenueResult = await Shipment.aggregate([
      { 
        $match: { 
          'payment.status': 'paid',
          createdAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$service.cost' } } }
    ]);

    res.json({
      success: true,
      stats: {
        shipments: {
          total: stats[0],
          today: stats[1],
          thisWeek: stats[2],
          thisMonth: stats[3],
          delivered: stats[4],
          inTransit: stats[5],
          pending: stats[6]
        },
        users: {
          total: stats[7],
          newThisMonth: stats[8]
        },
        revenue: {
          total: revenueResult[0]?.total || 0,
          thisMonth: monthlyRevenueResult[0]?.total || 0
        }
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
});

// Get all shipments with pagination and filters
router.get('/shipments', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { status, service, search } = req.query;
    
    // Build filter object
    const filter = {};
    if (status) filter['status.current'] = status;
    if (service) filter['service.type'] = service;
    if (search) {
      filter.$or = [
        { trackingNumber: new RegExp(search, 'i') },
        { 'sender.name': new RegExp(search, 'i') },
        { 'recipient.name': new RegExp(search, 'i') }
      ];
    }

    const shipments = await Shipment.find(filter)
      .populate('sender.userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Shipment.countDocuments(filter);

    res.json({
      success: true,
      shipments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shipments'
    });
  }
});

// Update shipment status
router.put('/shipments/:id/status', [
  param('id').isMongoId().withMessage('Invalid shipment ID'),
  body('status').isIn(['pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'returned']).withMessage('Invalid status'),
  body('location').optional().isString().withMessage('Location must be a string'),
  body('description').optional().isString().withMessage('Description must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status, location, description } = req.body;

    const shipment = await Shipment.findById(id);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    // Update status
    shipment.status.current = status;
    
    // Add to history
    shipment.status.history.push({
      status,
      location: location || 'FDX Facility',
      timestamp: new Date(),
      description: description || `Status updated to ${status}`,
      updatedBy: req.user._id
    });

    await shipment.save();

    res.json({
      success: true,
      message: 'Shipment status updated successfully',
      shipment: {
        trackingNumber: shipment.trackingNumber,
        status: shipment.status.current,
        lastUpdate: shipment.status.history[shipment.status.history.length - 1]
      }
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating shipment status'
    });
  }
});

// Get user statistics
router.get('/users/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const staffUsers = await User.countDocuments({ role: 'staff' });
    const customerUsers = await User.countDocuments({ role: 'customer' });

    res.json({
      success: true,
      data: {
        total: totalUsers,
        admin: adminUsers,
        staff: staffUsers,
        customer: customerUsers
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics'
    });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { role, search, verified } = req.query;
    
    // Build filter object
    const filter = {};
    if (role) filter.role = role;
    if (verified !== undefined) filter.isVerified = verified === 'true';
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: { role, search, verified }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// Search registered users for the admin email recipient picker
router.get('/email/recipients', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search || '').trim();
    if (search.length > 100) {
      return res.status(400).json({ success: false, message: 'Search text cannot exceed 100 characters' });
    }

    const filter = {};
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { firstName: new RegExp(escapedSearch, 'i') },
        { lastName: new RegExp(escapedSearch, 'i') },
        { email: new RegExp(escapedSearch, 'i') }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('firstName lastName email role')
        .sort({ firstName: 1, lastName: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Email recipient search error:', error);
    res.status(500).json({ success: false, message: 'Error searching registered users' });
  }
});

// Send a branded email only to the registered users selected by the admin
router.post('/email/send-selected', [
  body('userIds').isArray({ min: 1, max: 100 }).withMessage('Select between 1 and 100 users'),
  body('userIds.*').isMongoId().withMessage('Invalid user ID'),
  body('subject').trim().notEmpty().isLength({ max: 200 }).withMessage('Subject is required'),
  body('message').trim().notEmpty().isLength({ max: 5000 }).withMessage('Message is required'),
  body('status').optional({ values: 'falsy' }).isIn([
    'pending', 'confirmed', 'picked_up', 'in_transit',
    'out_for_delivery', 'delivered', 'exception', 'returned'
  ]).withMessage('Invalid shipment status'),
  body('trackingNumber').optional({ values: 'falsy' }).trim().isLength({ max: 20 })
    .withMessage('Tracking number cannot exceed 20 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const userIds = [...new Set(req.body.userIds)];
    const users = await User.find({ _id: { $in: userIds } })
      .select('firstName lastName email')
      .lean();
    if (users.length !== userIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more selected users could not be found'
      });
    }

    const recipients = users.map(user => ({
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
    }));

    const result = await sendBulkEmail({
      recipients,
      subject: req.body.subject,
      message: req.body.message,
      status: req.body.status || undefined,
      trackingNumber: req.body.trackingNumber || undefined
    });

    if (result.sent === 0) {
      const errorCodes = Object.keys(result.errorCodes || {});
      const failureHint = errorCodes.includes('EAUTH')
        ? 'Check SMTP_USER and SMTP_PASS; Gmail requires an app password.'
        : errorCodes.some(code => ['ECONNECTION', 'ESOCKET', 'ETIMEDOUT'].includes(code))
          ? 'Check SMTP_HOST, SMTP_PORT, and SMTP_SECURE.'
          : 'Check the SMTP configuration and server logs.';
      return res.status(502).json({
        success: false,
        message: `Email could not be delivered to any selected user${errorCodes.length ? ` (SMTP error: ${errorCodes.join(', ')})` : ''}. ${failureHint}`,
        sent: result.sent,
        failed: result.failed,
        total: recipients.length
      });
    }

    res.json({
      success: true,
      message: `Email sent to ${result.sent} selected user${result.sent === 1 ? '' : 's'}${result.failed ? `; ${result.failed} failed` : ''}`,
      sent: result.sent,
      failed: result.failed,
      total: recipients.length
    });
  } catch (error) {
    console.error('Selected-user email error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode === 503
        ? error.message
        : 'Error sending email to selected users'
    });
  }
});

// Verify individual user
router.patch('/users/:userId/verify', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isVerified: true },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      message: `User ${user.firstName} ${user.lastName} verified successfully`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('User verify error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Verify all existing users (one-time fix)
router.post('/users/verify-all', async (req, res) => {
  try {
    const result = await User.updateMany(
      { isVerified: false },
      { isVerified: true }
    );

    res.json({
      success: true,
      message: `Verified ${result.modifiedCount} users`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error verifying all users:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying users'
    });
  }
});

module.exports = router;