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
}

export interface P2PMessage {
  type: keyof P2PGameEvents
  data: unknown
  senderId: string
  timestamp: number
}

// Simple STUN servers for WebRTC connection establishment
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

export class WebRTCManager {
  private connections = new Map<string, RTCPeerConnection>()
  private dataChannels = new Map<string, RTCDataChannel>()
  private eventListeners = new Map<keyof P2PGameEvents, ((...args: unknown[]) => void)[]>()
  private isHost = false
  private hostId: string | null = null
  private myId: string = this.generateId()

  constructor() {
    this.setupEventListeners()
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  private setupEventListeners() {
    // Initialize event listener arrays
    const events: (keyof P2PGameEvents)[] = [
      'game:state', 'game:player-joined', 'game:player-left', 
      'game:guess', 'game:finished', 'game:error', 'game:join-request', 'game:leave'
    ]
    events.forEach(event => {
      this.eventListeners.set(event, [])
    })
  }

  // Host creates a game and becomes the server
  async createGame(): Promise<string> {
    this.isHost = true
    this.hostId = this.myId
    return this.myId
  }

  // Player joins a game by connecting to host
  async joinGame(hostId: string, offerData?: string): Promise<void> {
    this.hostId = hostId
    
    if (offerData) {
      // Join via WebRTC offer (from QR code)
      await this.handleWebRTCOffer(hostId, JSON.parse(offerData))
    } else {
      // Direct connection attempt
      await this.createPeerConnection(hostId, true)
    }
  }

  private async createPeerConnection(peerId: string, isInitiator: boolean = false): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.connections.set(peerId, pc)

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // In a real implementation, you'd send this to the peer
        // For local network, we can use a simple signaling mechanism
        console.log('ICE Candidate:', event.candidate)
      }
    }

    // Handle incoming data channels
    pc.ondatachannel = (event) => {
      const channel = event.channel
      this.setupDataChannel(peerId, channel)
    }

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}:`, pc.connectionState)
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.handlePeerDisconnect(peerId)
      }
    }

    // Create data channel if we're the initiator
    if (isInitiator) {
      const dataChannel = pc.createDataChannel('game-data', {
        ordered: true
      })
      this.setupDataChannel(peerId, dataChannel)
    }

    return pc
  }

  private setupDataChannel(peerId: string, channel: RTCDataChannel) {
    this.dataChannels.set(peerId, channel)

    channel.onopen = () => {
      console.log(`Data channel opened with ${peerId}`)
    }

    channel.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data))
    }

    channel.onclose = () => {
      console.log(`Data channel closed with ${peerId}`)
      this.handlePeerDisconnect(peerId)
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
          listener(message.data)
          break
        default:
          listener(message.data)
      }
    })
  }

  private handlePeerDisconnect(peerId: string) {
    this.connections.delete(peerId)
    this.dataChannels.delete(peerId)
    this.emit('game:player-left', peerId)
  }

  // Generate WebRTC offer for QR code sharing
  async generateQRCodeData(): Promise<string> {
    if (!this.isHost) throw new Error('Only host can generate QR codes')
    
    // Create a temporary peer connection to generate offer
    const tempPc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const dataChannel = tempPc.createDataChannel('game-data')
    
    const offer = await tempPc.createOffer()
    await tempPc.setLocalDescription(offer)
    
    const qrData = {
      hostId: this.myId,
      offer: offer,
      timestamp: Date.now()
    }
    
    return JSON.stringify(qrData)
  }

  // Handle WebRTC offer from QR code
  private async handleWebRTCOffer(hostId: string, offerData: { offer: RTCSessionDescriptionInit }) {
    const pc = await this.createPeerConnection(hostId)
    
    await pc.setRemoteDescription(offerData.offer)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    
    // In a real implementation, you'd send this answer back to the host
    // For now, we'll simulate the connection
    console.log('WebRTC Answer created:', answer)
  }

  // Send message to all connected peers
  broadcast(type: keyof P2PGameEvents, data: unknown) {
    const message: P2PMessage = {
      type,
      data,
      senderId: this.myId,
      timestamp: Date.now()
    }

    const messageStr = JSON.stringify(message)
    this.dataChannels.forEach(channel => {
      if (channel.readyState === 'open') {
        channel.send(messageStr)
      }
    })
  }

  // Send message to specific peer
  send(peerId: string, type: keyof P2PGameEvents, data: unknown) {
    const channel = this.dataChannels.get(peerId)
    if (channel && channel.readyState === 'open') {
      const message: P2PMessage = {
        type,
        data,
        senderId: this.myId,
        timestamp: Date.now()
      }
      channel.send(JSON.stringify(message))
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

  private emit<T extends keyof P2PGameEvents>(event: T, ...args: Parameters<P2PGameEvents[T]>) {
    const listeners = this.eventListeners.get(event) || []
    listeners.forEach(listener => listener(...args))
  }

  // Utility methods
  getMyId(): string {
    return this.myId
  }

  isHostPlayer(): boolean {
    return this.isHost
  }

  getConnectedPeers(): string[] {
    return Array.from(this.dataChannels.keys()).filter(
      peerId => this.dataChannels.get(peerId)?.readyState === 'open'
    )
  }

  disconnect() {
    this.connections.forEach(pc => pc.close())
    this.connections.clear()
    this.dataChannels.clear()
    this.isHost = false
    this.hostId = null
  }
}

export const webrtcManager = new WebRTCManager()