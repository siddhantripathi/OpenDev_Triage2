# 🔍 OpenDev Triage

AI-powered repository analysis tool that helps identify issues and suggest improvements for GitHub repositories.

## ✨ Features

- 🔐 **Google Authentication** - Secure sign-in with Google
- 📊 **Repository Analysis** - AI-powered analysis of GitHub repositories
- 📱 **Cross-Platform** - Works on Web, iOS, and Android
- 🎯 **Issue Detection** - Identifies problems in your codebase
- 💡 **Smart Suggestions** - Get AI-generated fixes and improvements
- 📜 **History Tracking** - View all past analyses

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Firebase account
- Google Cloud project (for OAuth)
- n8n instance with webhook configured

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd OpenDevTriage

# Install dependencies
npm install --legacy-peer-deps

# Copy environment template
cp .env.example .env
```

### Configuration

Edit `.env` with your credentials:

```env
# N8N Configuration
EXPO_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.app.n8n.cloud
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
# ... (see .env.example for all variables)

# Google OAuth
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-client-id
```

### Development

```bash
# Start web development server
npm run web

# Start for Android
npm run android

# Start for iOS
npm run ios
```

## 📦 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

Quick deploy to Vercel:
```bash
npm i -g vercel
vercel --prod
```

## 🏗️ Tech Stack

- **Frontend**: React Native, Expo
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Analysis**: n8n workflows with AI
- **Hosting**: Vercel (web), EAS (mobile)

## 📖 How It Works

1. **Sign In** - Authenticate with Google
2. **Select Repository** - Choose from your GitHub repos or import via URL
3. **Analyze** - AI analyzes the repository structure and code
4. **Review** - View detected issues and suggested improvements
5. **Track** - Access analysis history anytime

## 🔒 Security

- All secrets stored in environment variables
- Firebase security rules enforced
- No sensitive data in client code
- HTTPS only in production
- Security headers configured

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read contributing guidelines before submitting PRs.

## 📧 Support

For issues or questions, please open a GitHub issue.

