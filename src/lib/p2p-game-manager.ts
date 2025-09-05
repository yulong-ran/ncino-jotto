import { broadcastManager } from './broadcast-manager'
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
    broadcastManager.on('game:guess', this.handlePlayerGuess.bind(this))
    broadcastManager.on('game:join-request', this.handleJoinRequest.bind(this))
    
    // All players receive these events
    broadcastManager.on('game:state', this.handleGameStateUpdate.bind(this))
    broadcastManager.on('game:player-joined', this.handlePlayerJoined.bind(this))
    broadcastManager.on('game:player-left', this.handlePlayerLeft.bind(this))
    broadcastManager.on('game:finished', this.handlePlayerFinished.bind(this))
    broadcastManager.on('game:error', this.handleError.bind(this))
    broadcastManager.on('game:terminated', this.handleGameTerminated.bind(this))
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
    this.currentPlayerId = broadcastManager.getMyId()
    
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

    // Initialize BroadcastChannel as host
    await broadcastManager.createGame(gameId)
    
    // Save player name for potential reconnection
    localStorage.setItem(`jotto-player-name-${gameId}`, playerName.trim())
    
    // Broadcast initial game state
    this.broadcastGameState()
    
    return gameId
  }

  private handlePlayerGuess(playerId: string, guess: Guess) {
    if (!this.isHost || !this.gameState) return

    const player = this.gameState.players.find(p => p.id === playerId)
    
    if (!player || player.status === 'finished') return

    if (!validateWord(guess.word)) {
      broadcastManager.send(playerId, 'game:error', 'Invalid word. Must be a 5-letter word.')
      return
    }

    const commonLetters = calculateCommonLetters(this.gameState.hostWord, guess.word.toUpperCase())
    const timeUsed = this.gameState.startTime ? Math.floor((Date.now() - this.gameState.startTime) / 1000) : 0

    const processedGuess: Guess = {
      word: guess.word.toUpperCase(),
      commonLetters,
      timestamp: Date.now()
    }

    player.guesses.push(processedGuess)
    player.timeUsed = timeUsed

    // Check if the guess is correct
    if (isWordCorrect(this.gameState.hostWord, guess.word)) {
      player.status = 'finished'
      
      // Broadcast that player finished
      broadcastManager.broadcast('game:finished', { playerId, finalTime: timeUsed })
      
      // Check if all players are finished
      const activePlayers = this.gameState.players.filter(p => p.status !== 'disconnected')
      const finishedPlayers = activePlayers.filter(p => p.status === 'finished')
      
      if (finishedPlayers.length === activePlayers.length) {
        this.gameState.status = 'finished'
      }
    }

    // Broadcast the guess to all players
    broadcastManager.broadcast('game:guess', { playerId, guess: processedGuess })
    
    // Send updated game state
    this.broadcastGameState()
  }

  private handleJoinRequest(player: Player) {
    if (this.isHost && this.gameState) {
      // Check if player name is already taken
      const existingPlayer = this.gameState.players.find(p => p.name === player.name)
      if (existingPlayer) {
        broadcastManager.send(player.id, 'game:error', 'Player name already taken in this game.')
        return
      }

      // Add player to game
      this.gameState.players.push(player)
      
      // Broadcast new player joined
      broadcastManager.broadcast('game:player-joined', player)
      
      // Send current game state to all players
      this.broadcastGameState()
    }
  }

  private broadcastGameState() {
    if (this.gameState) {
      // Create a safe version of game state (hide host word from non-hosts)
      const safeGameState = {
        ...this.gameState,
        hostWord: this.isHost ? this.gameState.hostWord : '****'
      }
      broadcastManager.broadcast('game:state', safeGameState)
    }
  }

  // PLAYER METHODS

  async joinGame(gameId: string, playerName: string): Promise<void> {
    if (!playerName.trim()) {
      throw new Error('Player name is required.')
    }

    this.currentPlayerId = broadcastManager.getMyId()
    
    const newPlayer: Player = {
      id: this.currentPlayerId,
      name: playerName.trim(),
      guesses: [],
      timeUsed: 0,
      status: 'playing',
      joinedAt: Date.now()
    }

    // Join the BroadcastChannel network
    await broadcastManager.joinGame(gameId)
    
    // Save player name for potential reconnection
    localStorage.setItem(`jotto-player-name-${gameId}`, playerName.trim())
    
    // Request to join the game
    broadcastManager.broadcast('game:join-request', newPlayer)
  }

  makeGuess(word: string) {
    if (!this.currentPlayerId) return

    if (this.isHost && this.gameState) {
      // Host processes their own guess
      const guess: Guess = { word, commonLetters: 0, timestamp: Date.now() }
      this.handlePlayerGuess(this.currentPlayerId, guess)
    } else {
      // Send guess to host
      broadcastManager.broadcast('game:guess', { playerId: this.currentPlayerId, word })
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
        broadcastManager.send(player.id, 'game:error', 'Player name already taken in this game.')
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
      broadcastManager.broadcast('game:player-joined', player)
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

  private handlePlayerFinished(playerId: string, finalTime: number) {
    // This is handled by the host in handlePlayerGuess
    // Non-host players just receive the notification
  }

  private handleError(message: string) {
    console.error('Game error:', message)
  }

  private handleGameTerminated() {
    // Host has terminated the game
    console.log('Game terminated by host')
    
    // Clear game state
    this.gameState = null
    this.isHost = false
    this.currentPlayerId = null
    
    // Redirect to home page
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  // RECONNECTION METHODS

  isConnectedToGame(gameId: string): boolean {
    return this.gameState?.gameId === gameId && this.currentPlayerId !== null
  }

  async reconnectToGame(gameId: string): Promise<void> {
    if (this.isConnectedToGame(gameId)) {
      return // Already connected to this game
    }

    // Check if game still exists
    const hostInfo = localStorage.getItem(`jotto-host-${gameId}`)
    if (!hostInfo) {
      throw new Error('Game not found. The host may have left or the game may not exist.')
    }

    // If we're connected to a different game, leave it first
    if (this.gameState && this.gameState.gameId !== gameId) {
      this.leaveGame()
    }

    // Try to reconnect by getting the current player's name from localStorage
    const savedPlayerName = localStorage.getItem(`jotto-player-name-${gameId}`)
    if (!savedPlayerName) {
      throw new Error('Cannot reconnect: player name not found. Please join the game manually.')
    }

    // Attempt to rejoin the game
    await this.joinGame(gameId, savedPlayerName)
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
      broadcastManager.broadcast('game:leave', this.currentPlayerId)
    }
    
    broadcastManager.disconnect()
    this.gameState = null
    this.isHost = false
    this.currentPlayerId = null
  }

  // Generate data for QR code
  async generateQRData(): Promise<string> {
    if (!this.isHost || !this.gameState) {
      throw new Error('Only host can generate QR codes')
    }
    
    // For BroadcastChannel, QR code just contains game ID and host ID
    const qrData = {
      gameId: this.gameState.gameId,
      hostId: this.currentPlayerId,
      timestamp: Date.now()
    }
    
    return JSON.stringify(qrData)
  }

  // Event listener methods for components
  onGameState(callback: (gameState: GameState) => void) {
    broadcastManager.on('game:state', callback)
  }

  onPlayerJoined(callback: (player: Player) => void) {
    broadcastManager.on('game:player-joined', callback)
  }

  onPlayerLeft(callback: (playerId: string) => void) {
    broadcastManager.on('game:player-left', callback)
  }

  onGuess(callback: (playerId: string, guess: Guess) => void) {
    broadcastManager.on('game:guess', callback)
  }

  onPlayerFinished(callback: (playerId: string, finalTime: number) => void) {
    broadcastManager.on('game:finished', callback)
  }

  onError(callback: (message: string) => void) {
    broadcastManager.on('game:error', callback)
  }

  offGameState(callback: (gameState: GameState) => void) {
    broadcastManager.off('game:state', callback)
  }

  offPlayerJoined(callback: (player: Player) => void) {
    broadcastManager.off('game:player-joined', callback)
  }

  offPlayerLeft(callback: (playerId: string) => void) {
    broadcastManager.off('game:player-left', callback)
  }

  offGuess(callback: (playerId: string, guess: Guess) => void) {
    broadcastManager.off('game:guess', callback)
  }

  offPlayerFinished(callback: (playerId: string, finalTime: number) => void) {
    broadcastManager.off('game:finished', callback)
  }

  offError(callback: (message: string) => void) {
    broadcastManager.off('game:error', callback)
  }
}

export const p2pGameManager = new P2PGameManager()