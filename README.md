# Jotto Game

A real-time multiplayer word guessing game built with Next.js, Socket.io, and ShadCN UI.

## 🎮 How to Play

1. **Host a Game**: Create a new game by choosing a secret 5-letter word
2. **Join a Game**: Enter the game ID shared by the host to join
3. **Make Guesses**: Try to guess the secret word by entering 5-letter words
4. **Get Clues**: Each guess shows how many letters match the secret word
5. **Win**: Be the first to guess the correct word with the fastest time and fewest guesses!

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd jotto-game

# Install dependencies
npm install

# Start both the Next.js app and Socket.io server
npm run dev:all
```

Or run them separately:

```bash
# Terminal 1: Start the Next.js development server
npm run dev

# Terminal 2: Start the Socket.io server
npm run dev:server
```

The game will be available at:
- **Frontend**: http://localhost:3000
- **Socket.io Server**: http://localhost:3001

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: ShadCN UI, Tailwind CSS
- **Real-time Communication**: Socket.io
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React

## 📱 Features

- **Mobile-First Design**: Optimized for mobile devices with responsive layout
- **Real-Time Multiplayer**: Live game updates and player synchronization
- **Game Management**: Create and join games with unique game IDs
- **Live Leaderboard**: Track player progress and rankings in real-time
- **Toast Notifications**: User-friendly feedback and game updates
- **Timer & Statistics**: Track time and guess count for competitive play
- **Instructions**: Built-in game instructions modal

## 🏗 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page (create/join game)
│   └── game/[gameId]/     # Game room page
├── components/            
│   ├── ui/                # ShadCN UI components
│   └── game/              # Game-specific components
├── lib/                   # Utilities and game logic
│   ├── game-logic.ts      # Core game rules and validation
│   ├── socket.ts          # Socket.io client manager
│   └── utils.ts           # General utilities
└── hooks/                 # Custom React hooks
    ├── use-game.ts        # Game state management
    └── use-toast.ts       # Toast notifications

server/
└── index.ts               # Socket.io server
```

## 🎯 Game Logic

The game implements the classic Jotto rules:
- Players guess 5-letter words
- Each guess returns the number of common letters with the secret word
- Letters are counted by frequency (e.g., if the secret word has 2 'E's and your guess has 1 'E', only 1 common letter is counted)
- First player to guess correctly wins

## 🔧 Development Scripts

- `npm run dev` - Start Next.js development server
- `npm run dev:server` - Start Socket.io server with hot reload  
- `npm run dev:all` - Start both servers concurrently
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🚀 Deployment

### Frontend (Next.js)
Deploy to Vercel, Netlify, or any platform supporting Next.js.

### Backend (Socket.io)
Deploy the `server/` directory to a service like Heroku, Railway, or DigitalOcean.

Make sure to update the Socket.io connection URL in `src/lib/socket.ts` to point to your production server.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🎉 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [ShadCN/UI](https://ui.shadcn.com/)
- Real-time functionality powered by [Socket.io](https://socket.io/)
- Icons by [Lucide](https://lucide.dev/)
