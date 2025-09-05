import { webrtcManager } from './webrtc'
import { 
  GameState, 
  Player, 
  Guess, 
  generateGameId, 
  calculateCommonLetters, 
  isWordCorrect, 
  validateWord 
} from './game-logic'

export class P2PGameManager {
  private gameState: GameState | null = null
  private isHost = false
  private currentPlayerId: string | null = null

  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Host-specific events
    webrtcManager.on('game:guess', this.handlePlayerGuess.bind(this))
    
    // All players receive these events
    webrtcManager.on('game:state', this.handleGameStateUpdate.bind(this))
    webrtcManager.on('game:player-joined', this.handlePlayerJoined.bind(this))
    webrtcManager.on('game:player-left', this.handlePlayerLeft.bind(this))
    webrtcManager.on('game:finished', this.handlePlayerFinished.bind(this))
    webrtcManager.on('game:error', this.handleError.bind(this))
  }

  // HOST METHODS

  async createGame(hostWord: string, playerName: string): Promise<string> {
    if (!validateWord(hostWord)) {
      throw new Error('Invalid host word. Must be a 5-letter word.')
    }

    if (!playerName.trim()) {
      throw new Error('Player name is required.')
    }

    this.isHost = true
    this.currentPlayerId = webrtcManager.getMyId()
    
    const gameId = generateGameId()
    const hostPlayer: Player = {
      id: this.currentPlayerId,
      name: playerName.trim(),
      guesses: [],
      timeUsed: 0,
      status: 'playing',
      joinedAt: Date.now()
    }

    this.gameState = {
      gameId,
      hostWord: hostWord.toUpperCase(),
      players: [hostPlayer],
      status: 'waiting',
      startTime: Date.now()
    }

    // Initialize WebRTC as host
    await webrtcManager.createGame()
    
    // Broadcast initial game state
    this.broadcastGameState()
    
    return gameId
  }

  private handlePlayerGuess(data: { playerId: string; word: string }) {
    if (!this.isHost || !this.gameState) return

    const { playerId, word } = data
    const player = this.gameState.players.find(p => p.id === playerId)
    
    if (!player || player.status === 'finished') return

    if (!validateWord(word)) {
      webrtcManager.send(playerId, 'game:error', 'Invalid word. Must be a 5-letter word.')
      return
    }

    const commonLetters = calculateCommonLetters(this.gameState.hostWord, word.toUpperCase())
    const timeUsed = this.gameState.startTime ? Math.floor((Date.now() - this.gameState.startTime) / 1000) : 0

    const guess: Guess = {
      word: word.toUpperCase(),
      commonLetters,
      timestamp: Date.now()
    }

    player.guesses.push(guess)
    player.timeUsed = timeUsed

    // Check if the guess is correct
    if (isWordCorrect(this.gameState.hostWord, word)) {
      player.status = 'finished'
      
      // Broadcast that player finished
      webrtcManager.broadcast('game:finished', { playerId, finalTime: timeUsed })
      
      // Check if all players are finished
      const activePlayers = this.gameState.players.filter(p => p.status !== 'disconnected')
      const finishedPlayers = activePlayers.filter(p => p.status === 'finished')
      
      if (finishedPlayers.length === activePlayers.length) {
        this.gameState.status = 'finished'
      }
    }

    // Broadcast the guess to all players
    webrtcManager.broadcast('game:guess', { playerId, guess })
    
    // Send updated game state
    this.broadcastGameState()
  }

  private broadcastGameState() {
    if (this.gameState) {
      // Create a safe version of game state (hide host word from non-hosts)
      const safeGameState = {
        ...this.gameState,
        hostWord: this.isHost ? this.gameState.hostWord : '****'
      }
      webrtcManager.broadcast('game:state', safeGameState)
    }
  }

  // PLAYER METHODS

  async joinGame(gameId: string, playerName: string, offerData?: string): Promise<void> {
    if (!playerName.trim()) {
      throw new Error('Player name is required.')
    }

    this.currentPlayerId = webrtcManager.getMyId()
    
    const newPlayer: Player = {
      id: this.currentPlayerId,
      name: playerName.trim(),
      guesses: [],
      timeUsed: 0,
      status: 'playing',
      joinedAt: Date.now()
    }

    // Join the WebRTC network
    await webrtcManager.joinGame(gameId, offerData)
    
    // Request to join the game
    webrtcManager.broadcast('game:join-request', { player: newPlayer })
  }

  makeGuess(word: string) {
    if (!this.currentPlayerId) return

    if (this.isHost && this.gameState) {
      // Host processes their own guess
      this.handlePlayerGuess({ playerId: this.currentPlayerId, word })
    } else {
      // Send guess to host
      webrtcManager.broadcast('game:guess', { playerId: this.currentPlayerId, word })
    }
  }

  // EVENT HANDLERS

  private handleGameStateUpdate(gameState: GameState) {
    this.gameState = gameState
  }

  private handlePlayerJoined(player: Player) {
    if (this.isHost && this.gameState) {
      // Check if player name is already taken
      const existingPlayer = this.gameState.players.find(p => p.name === player.name)
      if (existingPlayer) {
        webrtcManager.send(player.id, 'game:error', 'Player name already taken in this game.')
        return
      }

      // Add player to game
      this.gameState.players.push(player)
      
      // Start the game if this is the second player
      if (this.gameState.players.length >= 2 && this.gameState.status === 'waiting') {
        this.gameState.status = 'playing'
        this.gameState.startTime = Date.now()
      }

      // Broadcast updated game state
      this.broadcastGameState()
      webrtcManager.broadcast('game:player-joined', player)
    }
  }

  private handlePlayerLeft(playerId: string) {
    if (this.gameState) {
      const player = this.gameState.players.find(p => p.id === playerId)
      if (player) {
        player.status = 'disconnected'
        if (this.isHost) {
          this.broadcastGameState()
        }
      }
    }
  }

  private handlePlayerFinished({ playerId, finalTime }: { playerId: string; finalTime: number }) {
    // This is handled by the host in handlePlayerGuess
    // Non-host players just receive the notification
  }

  private handleError(message: string) {
    console.error('Game error:', message)
  }

  // UTILITY METHODS

  getGameState(): GameState | null {
    return this.gameState
  }

  getCurrentPlayer(): Player | null {
    if (!this.gameState || !this.currentPlayerId) return null
    return this.gameState.players.find(p => p.id === this.currentPlayerId) || null
  }

  isHostPlayer(): boolean {
    return this.isHost
  }

  getMyId(): string | null {
    return this.currentPlayerId
  }

  leaveGame() {
    if (this.currentPlayerId) {
      webrtcManager.broadcast('game:leave', { playerId: this.currentPlayerId })
    }
    
    webrtcManager.disconnect()
    this.gameState = null
    this.isHost = false
    this.currentPlayerId = null
  }

  // Generate data for QR code
  async generateQRData(): Promise<string> {
    if (!this.isHost) {
      throw new Error('Only host can generate QR codes')
    }
    
    return await webrtcManager.generateQRCodeData()
  }

  // Event listener methods for components
  onGameState(callback: (gameState: GameState) => void) {
    webrtcManager.on('game:state', callback)
  }

  onPlayerJoined(callback: (player: Player) => void) {
    webrtcManager.on('game:player-joined', callback)
  }

  onPlayerLeft(callback: (playerId: string) => void) {
    webrtcManager.on('game:player-left', callback)
  }

  onGuess(callback: (data: { playerId: string; guess: Guess }) => void) {
    webrtcManager.on('game:guess', callback)
  }

  onPlayerFinished(callback: (data: { playerId: string; finalTime: number }) => void) {
    webrtcManager.on('game:finished', callback)
  }

  onError(callback: (message: string) => void) {
    webrtcManager.on('game:error', callback)
  }

  offGameState(callback: (gameState: GameState) => void) {
    webrtcManager.off('game:state', callback)
  }

  offPlayerJoined(callback: (player: Player) => void) {
    webrtcManager.off('game:player-joined', callback)
  }

  offPlayerLeft(callback: (playerId: string) => void) {
    webrtcManager.off('game:player-left', callback)
  }

  offGuess(callback: (data: { playerId: string; guess: Guess }) => void) {
    webrtcManager.off('game:guess', callback)
  }

  offPlayerFinished(callback: (data: { playerId: string; finalTime: number }) => void) {
    webrtcManager.off('game:finished', callback)
  }

  offError(callback: (message: string) => void) {
    webrtcManager.off('game:error', callback)
  }
}

export const p2pGameManager = new P2PGameManager()