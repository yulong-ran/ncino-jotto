'use client'

import { useState, useEffect, useCallback } from 'react'
import { p2pGameManager } from '@/lib/p2p-game-manager'
import { GameState, Player, Guess } from '@/lib/game-logic'
import { useToast } from './use-toast'

interface UseP2PGameReturn {
  gameState: GameState | null
  currentPlayer: Player | null
  isConnected: boolean
  timeElapsed: number
  makeGuess: (word: string) => void
  leaveGame: () => void
  generateQRData: () => Promise<string>
  isHost: boolean
}

export function useP2PGame(gameId: string): UseP2PGameReturn {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [connectionAttempted, setConnectionAttempted] = useState(false)
  const { toast } = useToast()

  // Connection effect - handles gameId parameter
  useEffect(() => {
    if (!gameId || connectionAttempted) return

    const attemptConnection = async () => {
      setConnectionAttempted(true)
      
      try {
        // Check if already connected to this game
        if (p2pGameManager.isConnectedToGame(gameId)) {
          const currentGameState = p2pGameManager.getGameState()
          if (currentGameState) {
            setGameState(currentGameState)
            const playerId = p2pGameManager.getMyId()
            if (playerId) {
              const player = currentGameState.players.find(p => p.id === playerId)
              if (player) {
                setCurrentPlayer(player)
                setIsConnected(true)
                return
              }
            }
          }
        }

        // Attempt to reconnect if we have saved player data
        await p2pGameManager.reconnectToGame(gameId)
        setIsConnected(true)
      } catch (error) {
        console.error('Failed to connect to game:', error)
        // Don't show toast error here - the game page will handle it
        setIsConnected(false)
      }
    }

    attemptConnection()
  }, [gameId, connectionAttempted, toast])

  // Timer effect
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing' || !currentPlayer || currentPlayer.status === 'finished') {
      return
    }

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState, currentPlayer])

  // P2P game event listeners
  useEffect(() => {
    const handleGameState = (newGameState: GameState) => {
      setGameState(newGameState)
      
      // Find current player
      const playerId = p2pGameManager.getMyId()
      if (playerId) {
        const player = newGameState.players.find(p => p.id === playerId)
        if (player) {
          setCurrentPlayer(player)
        } else {
          // Player not found in game state - connection issue
          setIsConnected(false)
          return
        }
      } else {
        // No player ID - connection issue
        setIsConnected(false)
        return
      }
      
      // Update connection status
      setIsConnected(true)
    }

    const handlePlayerJoined = (player: Player) => {
      toast({
        title: "Player Joined",
        description: `${player.name} joined the game`
      })
    }

    const handlePlayerLeft = (playerId: string) => {
      if (gameState) {
        const player = gameState.players.find(p => p.id === playerId)
        if (player) {
          toast({
            title: "Player Left",
            description: `${player.name} left the game`
          })
        }
      }
    }

    const handleGuess = (playerId: string, guess: Guess) => {
      if (gameState && playerId !== p2pGameManager.getMyId()) {
        const player = gameState.players.find(p => p.id === playerId)
        if (player) {
          toast({
            title: "New Guess",
            description: `${player.name} guessed ${guess.word} (${guess.commonLetters} common)`
          })
        }
      }
    }

    const handlePlayerFinished = (playerId: string, finalTime: number) => {
      if (gameState) {
        const player = gameState.players.find(p => p.id === playerId)
        if (player) {
          if (playerId === p2pGameManager.getMyId()) {
            toast({
              title: "🎉 Congratulations!",
              description: `You found the word in ${Math.floor(finalTime / 60)}:${(finalTime % 60).toString().padStart(2, '0')}!`
            })
          } else {
            toast({
              title: "Game Finished",
              description: `${player.name} found the word!`
            })
          }
        }
      }
    }

    const handleError = (message: string) => {
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      })
      setIsConnected(false)
    }

    // Set up event listeners
    p2pGameManager.onGameState(handleGameState)
    p2pGameManager.onPlayerJoined(handlePlayerJoined)
    p2pGameManager.onPlayerLeft(handlePlayerLeft)
    p2pGameManager.onGuess(handleGuess)
    p2pGameManager.onPlayerFinished(handlePlayerFinished)
    p2pGameManager.onError(handleError)

    // Get initial game state
    const initialGameState = p2pGameManager.getGameState()
    if (initialGameState) {
      handleGameState(initialGameState)
    }

    // Cleanup function
    return () => {
      p2pGameManager.offGameState(handleGameState)
      p2pGameManager.offPlayerJoined(handlePlayerJoined)
      p2pGameManager.offPlayerLeft(handlePlayerLeft)
      p2pGameManager.offGuess(handleGuess)
      p2pGameManager.offPlayerFinished(handlePlayerFinished)
      p2pGameManager.offError(handleError)
    }
  }, [gameId, gameState, toast])

  const makeGuess = useCallback((word: string) => {
    p2pGameManager.makeGuess(word)
  }, [])

  const leaveGame = useCallback(() => {
    p2pGameManager.leaveGame()
  }, [])

  const generateQRData = useCallback(async (): Promise<string> => {
    return await p2pGameManager.generateQRData()
  }, [])

  return {
    gameState,
    currentPlayer,
    isConnected,
    timeElapsed,
    makeGuess,
    leaveGame,
    generateQRData,
    isHost: p2pGameManager.isHostPlayer()
  }
}