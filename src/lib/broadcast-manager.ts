import { GameState, Player, Guess } from './game-logic'

export interface P2PGameEvents {
  'game:state': (gameState: GameState) => void
  'game:player-joined': (player: Player) => void
  'game:player-left': (playerId: string) => void
  'game:guess': (playerId: string, guess: Guess) => void
  'game:finished': (playerId: string, finalTime: number) => void
  'game:error': (message: string) => void
  'game:join-request': (player: Player) => void
  'game:leave': (playerId: string) => void
  'game:terminated': () => void
}

export interface P2PMessage {
  type: keyof P2PGameEvents
  data: unknown
  senderId: string
  timestamp: number
}

export class BroadcastManager {
  private channel: BroadcastChannel | null = null
  private eventListeners = new Map<keyof P2PGameEvents, ((...args: unknown[]) => void)[]>()
  private isHost = false
  private gameId: string | null = null
  private myId: string = this.generateId()

  constructor() {
    this.setupEventListeners()
    this.setupCleanupHandlers()
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  private setupEventListeners() {
    // Initialize event listener arrays
    const events: (keyof P2PGameEvents)[] = [
      'game:state', 'game:player-joined', 'game:player-left', 
      'game:guess', 'game:finished', 'game:error', 'game:join-request', 
      'game:leave', 'game:terminated'
    ]
    events.forEach(event => {
      this.eventListeners.set(event, [])
    })
  }

  private setupCleanupHandlers() {
    // Only setup handlers in browser environment
    if (typeof window === 'undefined') return

    // Clean up when browser/tab closes
    window.addEventListener('beforeunload', () => {
      this.cleanup()
    })

    // Clean up when page is hidden (mobile apps, tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.isHost) {
        this.cleanup()
      }
    })
  }

  private cleanup() {
    if (this.isHost && this.gameId) {
      // Notify players that game is terminated
      this.broadcast('game:terminated', null)
      
      // Remove host registration (only in browser)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`jotto-host-${this.gameId}`)
        localStorage.removeItem(`jotto-game-${this.gameId}`)
      }
    }
    
    if (this.channel) {
      this.channel.close()
    }
  }

  // Host creates a game
  async createGame(gameId: string): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('BroadcastChannel is only available in browser environment')
    }

    this.isHost = true
    this.gameId = gameId
    
    // Create broadcast channel for this game
    this.channel = new BroadcastChannel(`jotto-game-${gameId}`)
    this.setupChannelListeners()
    
    // Register as host in localStorage
    const hostInfo = {
      hostId: this.myId,
      gameId: gameId,
      timestamp: Date.now()
    }
    localStorage.setItem(`jotto-host-${gameId}`, JSON.stringify(hostInfo))
    
    return this.myId
  }

  // Player joins a game
  async joinGame(gameId: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('BroadcastChannel is only available in browser environment')
    }

    // Check if host exists
    const hostInfo = localStorage.getItem(`jotto-host-${gameId}`)
    if (!hostInfo) {
      throw new Error('Game not found. The host may have left or the game may not exist.')
    }

    this.gameId = gameId
    
    // Join the broadcast channel
    this.channel = new BroadcastChannel(`jotto-game-${gameId}`)
    this.setupChannelListeners()
    
    // Small delay to ensure channel is ready
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private setupChannelListeners() {
    if (!this.channel) return

    this.channel.onmessage = (event) => {
      const message: P2PMessage = event.data
      
      // Don't process our own messages
      if (message.senderId === this.myId) return
      
      this.handleMessage(message)
    }
  }

  private handleMessage(message: P2PMessage) {
    const listeners = this.eventListeners.get(message.type) || []
    listeners.forEach(listener => {
      // Handle different event types with appropriate parameter unpacking
      switch (message.type) {
        case 'game:guess':
          const guessData = message.data as { playerId: string; guess: Guess }
          listener(guessData.playerId, guessData.guess)
          break
        case 'game:finished':
          const finishData = message.data as { playerId: string; finalTime: number }
          listener(finishData.playerId, finishData.finalTime)
          break
        case 'game:state':
        case 'game:player-joined':
        case 'game:join-request':
        case 'game:error':
        case 'game:player-left':
        case 'game:leave':
        case 'game:terminated':
          listener(message.data)
          break
        default:
          listener(message.data)
      }
    })
  }

  // Send message to all players in the game
  broadcast(type: keyof P2PGameEvents, data: unknown) {
    if (!this.channel) return

    const message: P2PMessage = {
      type,
      data,
      senderId: this.myId,
      timestamp: Date.now()
    }

    this.channel.postMessage(message)
  }

  // Send message to specific peer (same as broadcast in BroadcastChannel)
  send(peerId: string, type: keyof P2PGameEvents, data: unknown) {
    // In BroadcastChannel, we can't send to specific peers
    // So we broadcast with a target field
    const message: P2PMessage = {
      type,
      data: { target: peerId, ...data as object },
      senderId: this.myId,
      timestamp: Date.now()
    }

    if (this.channel) {
      this.channel.postMessage(message)
    }
  }

  // Event listener methods
  on<T extends keyof P2PGameEvents>(event: T, callback: P2PGameEvents[T]) {
    const listeners = this.eventListeners.get(event) || []
    listeners.push(callback as (...args: unknown[]) => void)
    this.eventListeners.set(event, listeners)
  }

  off<T extends keyof P2PGameEvents>(event: T, callback: P2PGameEvents[T]) {
    const listeners = this.eventListeners.get(event) || []
    const index = listeners.indexOf(callback as (...args: unknown[]) => void)
    if (index > -1) {
      listeners.splice(index, 1)
    }
  }

  // Utility methods
  getMyId(): string {
    return this.myId
  }

  isHostPlayer(): boolean {
    return this.isHost
  }

  // Check if a game exists and has an active host
  static gameExists(gameId: string): boolean {
    if (typeof window === 'undefined') return false
    
    const hostInfo = localStorage.getItem(`jotto-host-${gameId}`)
    if (!hostInfo) return false

    try {
      const parsed = JSON.parse(hostInfo)
      // Check if host info is not too old (5 minutes)
      const age = Date.now() - parsed.timestamp
      return age < 5 * 60 * 1000
    } catch {
      return false
    }
  }

  // Get list of available games
  static getAvailableGames(): string[] {
    if (typeof window === 'undefined') return []
    
    const games: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('jotto-host-')) {
        const gameId = key.replace('jotto-host-', '')
        if (BroadcastManager.gameExists(gameId)) {
          games.push(gameId)
        }
      }
    }
    return games
  }

  disconnect() {
    this.cleanup()
    this.isHost = false
    this.gameId = null
    this.myId = this.generateId() // Generate new ID for next session
  }
}

export const broadcastManager = new BroadcastManager()