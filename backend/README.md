// README.md content
# Advanced Backend System

A comprehensive backend system built with Node.js, Express, TypeScript, PostgreSQL, Redis, Socket.IO, and AI integration.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication
  - OAuth2.0 integration (Google, GitHub)
  - Role-based access control
  - Secure password hashing
  - Refresh token rotation

- **Real-time Communication**
  - Socket.IO for real-time messaging
  - Chat rooms and direct messages
  - Typing indicators and online status
  - Message reactions and replies

- **AI Integration**
  - Google Gemini AI integration
  - Conversation management
  - Text analysis and summarization
  - Code explanation and review
  - Content generation

- **Database & Caching**
  - PostgreSQL with Drizzle ORM
  - Redis for caching and sessions
  - Optimized queries and indexing
  - Database migrations

- **API Features**
  - RESTful API design
  - Comprehensive validation
  - Rate limiting
  - File upload handling
  - Error handling and logging

- **Security & Performance**
  - Helmet.js security headers
  - CORS configuration
  - Request compression
  - Input sanitization
  - SQL injection prevention

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Cache**: Redis
- **Real-time**: Socket.IO
- **AI**: Google Gemini
- **Authentication**: JWT, Passport.js
- **Validation**: Express Validator
- **File Upload**: Multer
- **Security**: Helmet, CORS
- **Testing**: Jest
- **Deployment**: Docker, Docker Compose

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd advanced-backend-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb advanced_backend
   
   # Run migrations
   npm run db:migrate
   ```

5. **Start Redis server**
   ```bash
   redis-server
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

All required environment variables are documented in `.env.example`. Key variables include:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT signing secret
- `GEMINI_API_KEY`: Google Gemini AI API key
- `GOOGLE_CLIENT_ID/SECRET`: OAuth credentials
- `GITHUB_CLIENT_ID/SECRET`: OAuth credentials

### Database Setup

1. Install PostgreSQL
2. Create a database
3. Update `DATABASE_URL` in your `.env` file
4. Run migrations: `npm run db:migrate`

### Redis Setup

1. Install Redis
2. Start Redis server
3. Update `REDIS_URL` in your `.env` file

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh tokens
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/github` - GitHub OAuth

### Users
- `GET /api/users/profile/:id?` - Get user profile
- `PATCH /api/users/profile` - Update profile
- `POST /api/users/avatar` - Upload avatar
- `GET /api/users/search` - Search users

### Posts
- `GET /api/posts` - Get all posts
- `GET /api/posts/:slug` - Get single post
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Chat
- `GET /api/chat/rooms` - Get user's chat rooms
- `POST /api/chat/rooms` - Create chat room
- `GET /api/chat/rooms/:id/messages` - Get room messages

### AI
- `POST /api/ai/conversations` - Create conversation
- `GET /api/ai/conversations` - Get conversations
- `POST /api/ai/conversations/:id/messages` - Send message
- `POST /api/ai/chat` - Quick chat
- `POST /api/ai/analyze/text` - Analyze text
- `POST /api/ai/summarize` - Summarize text
- `POST /api/ai/code/explain` - Explain code
- `POST /api/ai/generate/content` - Generate content

## 🔄 Real-time Events (Socket.IO)

### Client Events
- `join-room` - Join a chat room
- `leave-room` - Leave a chat room
- `send-message` - Send message
- `typing-start/stop` - Typing indicators
- `send-private-message` - Send direct message

### Server Events
- `joined-room` - Room joined successfully
- `new-message` - New message received
- `user-joined/left` - User activity
- `user-typing` - Someone is typing
- `online-users` - Online users list

## 🐳 Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Run migrations**
   ```bash
   docker-compose exec app npm run db:migrate
   ```

3. **View logs**
   ```bash
   docker-compose logs -f app
   ```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📊 Performance & Monitoring

- Rate limiting on all endpoints
- Redis caching for frequently accessed data
- Database query optimization
- Comprehensive error logging
- Health check endpoint (`/health`)

## 🔐 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- SQL injection prevention
- XSS protection with Helmet
- CORS configuration
- Rate limiting
- Input validation and sanitization

## 📝 Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run migrations
- `npm run lint` - Run ESLint

### Code Structure
```
src/
├── config/         # Configuration files
├── database/       # Database schema and connection
├── middleware/     # Express middleware
├── routes/         # API routes
├── services/       # Business logic services
├── types/          # TypeScript type definitions
└── index.ts        # Application entry point
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Create a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email [your-email] or create an issue on GitHub.

---

**Built with ❤️ for modern web applications**