export class NetworkUtils {
  private static localIP: string | null = null

  // Get the local IP address of the device
  static async getLocalIP(): Promise<string | null> {
    if (this.localIP) {
      return this.localIP
    }

    try {
      // Method 1: WebRTC approach (most reliable)
      const ip = await this.getIPViaWebRTC()
      if (ip) {
        this.localIP = ip
        return ip
      }
    } catch (error) {
      console.warn('WebRTC IP detection failed:', error)
    }

    try {
      // Method 2: Fallback to fetch-based detection
      const ip = await this.getIPViaFetch()
      if (ip) {
        this.localIP = ip
        return ip
      }
    } catch (error) {
      console.warn('Fetch IP detection failed:', error)
    }

    return null
  }

  private static getIPViaWebRTC(): Promise<string | null> {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })

      pc.createDataChannel('')
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(() => resolve(null))

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate
          const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/)
          
          if (ipMatch) {
            const ip = ipMatch[1]
            // Filter for local network IPs
            if (this.isLocalIP(ip)) {
              pc.close()
              resolve(ip)
              return
            }
          }
        }
      }

      // Timeout after 3 seconds
      setTimeout(() => {
        pc.close()
        resolve(null)
      }, 3000)
    })
  }

  private static async getIPViaFetch(): Promise<string | null> {
    try {
      // This won't work due to CORS, but kept for reference
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch {
      return null
    }
  }

  // Check if an IP is in local network range
  static isLocalIP(ip: string): boolean {
    const localRanges = [
      /^192\.168\./,     // 192.168.x.x
      /^10\./,           // 10.x.x.x
      /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.x.x - 172.31.x.x
      /^127\./,          // 127.x.x.x (localhost)
      /^169\.254\./      // 169.254.x.x (link-local)
    ]

    return localRanges.some(range => range.test(ip))
  }

  // Generate a connection URL for the game
  static generateConnectionURL(gameId: string, hostIP?: string): string {
    const protocol = window.location.protocol
    const port = window.location.port ? `:${window.location.port}` : ''
    
    if (hostIP) {
      return `${protocol}//${hostIP}${port}/game/${gameId}`
    }
    
    return `${window.location.origin}/game/${gameId}`
  }

  // Get network information
  static async getNetworkInfo(): Promise<{
    localIP: string | null
    connectionType: string
    isOnline: boolean
  }> {
    const localIP = await this.getLocalIP()
    
    // Get connection type if available
    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string; type?: string }
      mozConnection?: { effectiveType?: string; type?: string }
      webkitConnection?: { effectiveType?: string; type?: string }
    }
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection
    const connectionType = connection ? (connection.effectiveType || connection.type || 'unknown') : 'unknown'
    
    return {
      localIP,
      connectionType,
      isOnline: navigator.onLine
    }
  }

  // Check if two devices are likely on the same network
  static areOnSameNetwork(ip1: string, ip2: string): boolean {
    if (!this.isLocalIP(ip1) || !this.isLocalIP(ip2)) {
      return false
    }

    // Check if they're in the same subnet (simplified)
    const parts1 = ip1.split('.')
    const parts2 = ip2.split('.')
    
    // Same first 3 octets = same subnet (for most home networks)
    return parts1[0] === parts2[0] && 
           parts1[1] === parts2[1] && 
           parts1[2] === parts2[2]
  }

  // Generate a sharing URL with local network detection
  static async generateSharingData(gameId: string, gameData: unknown): Promise<{
    qrData: string
    shareURL: string
    localIP: string | null
  }> {
    const localIP = await this.getLocalIP()
    const shareURL = this.generateConnectionURL(gameId, localIP || undefined)
    
    const qrData = JSON.stringify({
      gameId,
      hostIP: localIP,
      shareURL,
      gameData,
      timestamp: Date.now()
    })

    return {
      qrData,
      shareURL,
      localIP
    }
  }

  // Check if the current environment supports local networking
  static isLocalNetworkSupported(): boolean {
    return typeof RTCPeerConnection !== 'undefined' && 
           typeof navigator.mediaDevices !== 'undefined'
  }

  // Get WiFi network name (if available)
  static async getWiFiNetworkName(): Promise<string | null> {
    try {
      // This is only available in some contexts and browsers
      const nav = navigator as Navigator & {
        connection?: { downlink?: number }
      }
      if (nav.connection && nav.connection.downlink !== undefined) {
        // Can't actually get SSID due to privacy restrictions
        return 'WiFi Network'
      }
      return null
    } catch {
      return null
    }
  }

  // Test connection to a peer
  static async testConnection(ip: string, port: number = 3000): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const response = await fetch(`http://${ip}:${port}/`, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // Avoid CORS issues
      })
      
      clearTimeout(timeoutId)
      return true
    } catch {
      return false
    }
  }
}

// Auto-detect and cache local IP on module load
NetworkUtils.getLocalIP().then(ip => {
  if (ip) {
    console.log('Local IP detected:', ip)
  }
})