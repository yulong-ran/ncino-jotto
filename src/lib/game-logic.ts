export interface GameState {
  gameId: string
  hostWord: string
  players: Player[]
  status: 'waiting' | 'playing' | 'finished'
  startTime?: number
}

export interface Player {
  id: string
  name: string
  guesses: Guess[]
  timeUsed: number
  status: 'playing' | 'finished' | 'disconnected'
  joinedAt: number
}

export interface Guess {
  word: string
  commonLetters: number
  timestamp: number
}

export function validateWord(word: string): boolean {
  return word.length === 5 && /^[A-Za-z]+$/.test(word)
}

export function calculateCommonLetters(hostWord: string, guessWord: string): number {
  const hostLetters = hostWord.toLowerCase().split('')
  const guessLetters = guessWord.toLowerCase().split('')
  
  const hostCount: { [key: string]: number } = {}
  const guessCount: { [key: string]: number } = {}
  
  // Count occurrences of each letter
  hostLetters.forEach(letter => {
    hostCount[letter] = (hostCount[letter] || 0) + 1
  })
  
  guessLetters.forEach(letter => {
    guessCount[letter] = (guessCount[letter] || 0) + 1
  })
  
  // Calculate common letters
  let commonLetters = 0
  Object.keys(guessCount).forEach(letter => {
    if (hostCount[letter]) {
      commonLetters += Math.min(hostCount[letter], guessCount[letter])
    }
  })
  
  return commonLetters
}

export function isWordCorrect(hostWord: string, guessWord: string): boolean {
  return hostWord.toLowerCase() === guessWord.toLowerCase()
}

export function generateGameId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function calculateScore(guesses: Guess[], timeUsed: number): number {
  const guessCount = guesses.length
  const timeBonus = Math.max(0, 300 - timeUsed) // Bonus for completing under 5 minutes
  const guessBonus = Math.max(0, 20 - guessCount) * 10 // Bonus for fewer guesses
  
  return timeBonus + guessBonus
}