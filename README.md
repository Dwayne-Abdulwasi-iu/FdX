# ATLAS Delivery - Complete Shipping Management System

![ATLAS Delivery](https://img.shields.io/badge/ATLAS-Delivery-blue?style=for-the-badge&logo=truck)
![Node.js](https://img.shields.io/badge/Node.js-22.x-green?style=flat-square&logo=node.js)
![Express](https://img.shields.io/badge/Express-4.18-lightgrey?style=flat-square&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat-square&logo=mongodb)

A modern, full-stack shipping and package tracking web application built for **ATLAS Delivery**. This platform provides real-time package tracking, shipping rate calculation, user authentication, and a complete admin dashboard for shipment management.

---

## 🚀 Features

### Core Features
- **📦 Package Tracking** - Real-time package tracking with full shipment history
- **💰 Shipping Rate Calculator** - Dynamic rate calculation based on weight, dimensions, and distance
- **👤 User Authentication** - Secure JWT-based registration and login system
- **📊 Admin Dashboard** - Complete shipment and user management for administrators
- **📱 Responsive Design** - Mobile-first, fully responsive across all devices
- **🔒 Security** - JWT authentication, bcrypt hashing, rate limiting, and helmet security headers

### User Features
- User registration and profile management
- Create and manage shipments
- Track multiple packages simultaneously
- View full shipping history
- Real-time shipping rate calculation

### Admin Features
- Dashboard with comprehensive analytics and KPIs
- Manage and update all shipment statuses
- User account management
- Revenue and performance metrics

---

## 🛠️ Technology Stack

### Backend
- **Node.js** (v22.x) — Runtime environment
- **Express.js** — Web application framework
- **MongoDB Atlas** — Cloud database
- **Mongoose** — MongoDB object modeling
- **JWT** — Authentication and authorization
- **bcryptjs** — Password hashing
- **express-validator** — Input validation
- **helmet** — Security headers middleware
- **cors** — Cross-origin resource sharing
- **express-rate-limit** — Rate limiting

### Frontend
- **HTML5** — Semantic markup
- **CSS3** — Flexbox/Grid layout, responsive design
- **JavaScript (ES6+)** — Interactive client-side functionality
- **Font Awesome** — Icon library
- **Google Fonts (Inter)** — Typography

---

## 📋 Prerequisites

- **Node.js** v16+ — [Download](https://nodejs.org/)
- **MongoDB Atlas** account — [Sign up free](https://www.mongodb.com/cloud/atlas)
- **Git** — [Download](https://git-scm.com/)

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Dwayne-Abdulwasi-iu/atlas-shipping.git
cd atlas-shipping
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
NODE_ENV=development
PORT=3002

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.as7yeiu.mongodb.net/fedex-shipping?retryWrites=true&w=majority&appName=Cluster0

# JWT
JWT_SECRET=your-strong-jwt-secret
JWT_EXPIRES_IN=7d

# Admin
ADMIN_KEY=FEDEX_ADMIN_2025

# CORS
CORS_ORIGIN=*

# Security
BCRYPT_SALT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Start the Application
```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

The application will be available at:
- **Website**: http://localhost:3002
- **API**: http://localhost:3002/api

---

## 📁 Project Structure

```
atlas-shipping/
├── backend/
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── models/
│   │   ├── User.js              # User schema
│   │   ├── Shipment.js          # Shipment schema
│   │   └── Contact.js           # Contact form schema
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── shipments.js         # Shipment management
│   │   ├── tracking.js          # Package tracking
│   │   ├── admin.js             # Admin routes
│   │   └── contact.js           # Contact form
│   └── server.js                # Main Express server
├── frontend/
│   ├── css/
│   │   └── style.css            # Global stylesheet
│   ├── js/
│   │   ├── main.js              # Main client-side logic
│   │   └── extension-protection.js
│   ├── index.html               # Homepage
│   ├── careers.html
│   ├── faq.html
│   ├── privacy-policy.html
│   ├── shipping-guide.html
│   └── terms-of-service.html
├── .env                         # Environment variables (not committed)
├── .env.example                 # Environment template
├── package.json
├── render.yaml                  # Render deployment config
└── README.md
```

---

## 🔗 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | User login |
| `GET` | `/api/auth/me` | Get current user profile (auth required) |

### Shipments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/shipments/calculate-rate` | Calculate shipping rate |
| `POST` | `/api/shipments/create` | Create a shipment (auth required) |
| `GET` | `/api/shipments/my-shipments` | Get user shipments (auth required) |

### Tracking
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tracking/:trackingNumber` | Track a package |
| `POST` | `/api/tracking/bulk-track` | Track multiple packages |

### Admin *(admin role required)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/dashboard` | Dashboard statistics |
| `GET` | `/api/admin/shipments` | All shipments with filters |
| `PUT` | `/api/admin/shipments/:id/status` | Update shipment status |
| `GET` | `/api/admin/users` | All users |

---

## 📱 Usage Guide

### For Customers

1. **Register / Login** — Click "Login" in the navigation bar
2. **Calculate Rates** — Enter origin/destination ZIP codes, package weight and dimensions, then select a service type
3. **Track Packages** — Enter a tracking number on the homepage or tracking page
4. **Create Shipments** — Log in, calculate a rate, then click "Create Shipment"

### For Administrators

1. **Access Dashboard** — Log in with admin credentials → user menu → "Admin Dashboard"
2. **Manage Shipments** — View, filter, and update shipment statuses
3. **View Analytics** — Monitor revenue, volumes, and user statistics

---

## 🔒 Security Features

- JWT-based stateless authentication
- bcrypt password hashing (12 salt rounds)
- Rate limiting (100 req / 15 min per IP)
- Helmet.js security headers (HSTS, CSP, etc.)
- CORS protection
- Server-side input validation

---

## 🚀 Deployment

This project is configured for deployment on **Render**.

### Render Setup
1. Connect your GitHub repository to Render
2. Set all environment variables in the Render dashboard:
   - `NODE_ENV=production`
   - `PORT=10000`
   - `MONGODB_URI=<your-atlas-uri>`
   - `JWT_SECRET=<strong-secret>`
   - `ADMIN_KEY=<your-admin-key>`
3. Deploy — Render uses `npm start` automatically via `render.yaml`

### Production Checklist
- [x] MongoDB Atlas connected
- [x] JWT secret configured
- [x] HTTPS enabled (via Render)
- [x] Rate limiting active
- [x] Security headers enabled (Helmet.js)
- [ ] Email notifications
- [ ] Custom domain configured

---

## 🔧 Available Scripts

```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
```

---

## 🔄 Version History

- **v1.0.0** — Initial release
  - User authentication and profiles
  - Package tracking system
  - Shipping rate calculator
  - Admin dashboard
  - MongoDB Atlas integration
  - Responsive frontend

---

## 🚀 Planned Enhancements

- [ ] Email notifications for shipment updates
- [ ] SMS alerts
- [ ] Payment gateway integration
- [ ] Bulk shipment creation
- [ ] Advanced reporting and analytics
- [ ] Mobile app
- [ ] Multi-language support
- [ ] Automated label printing

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🆘 Support

- **Email**: support@atlasdelivery.com
- **Issues**: [GitHub Issues](https://github.com/Dwayne-Abdulwasi-iu/atlas-shipping/issues)

---

**ATLAS Delivery** — Fast, Reliable Package Delivery Worldwide 🚚
