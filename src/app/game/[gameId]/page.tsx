'use client'

import { useState, useEffect } from 'react'
import { GameBoard } from '@/components/game/game-board'
import { Leaderboard } from '@/components/game/leaderboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Copy, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useP2PGame } from '@/hooks/use-p2p-game'
import { GameInstructions } from '@/components/game/game-instructions'
import { QRGenerator } from '@/components/qr/qr-generator'

interface GamePageProps {
  params: Promise<{
    gameId: string
  }>
}

export default function GamePage({ params }: GamePageProps) {
  const [gameId, setGameId] = useState<string | null>(null)

  useEffect(() => {
    params.then(resolvedParams => {
      setGameId(resolvedParams.gameId)
    })
  }, [params])
  const { toast } = useToast()
  const { 
    gameState, 
    currentPlayer, 
    isConnected, 
    timeElapsed, 
    makeGuess, 
    leaveGame,
    generateQRData,
    isHost
  } = useP2PGame(gameId || '')

  const copyGameId = () => {
    if (gameId) {
      navigator.clipboard.writeText(gameId)
      toast({
        title: "Copied!",
        description: "Game ID copied to clipboard"
      })
    }
  }

  const goHome = () => {
    leaveGame()
    window.location.href = '/'
  }

  if (!gameId || !gameState || !currentPlayer) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Connecting to game...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <GameInstructions />
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goHome}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Leave Game
        </Button>
        
        <div className="text-center">
          <h1 className="text-xl font-bold">Game: {gameId}</h1>
          <p className="text-sm text-muted-foreground">
            {gameState.players.length} player(s)
          </p>
        </div>
        
        <Button variant="outline" onClick={copyGameId}>
          <Copy className="h-4 w-4 mr-2" />
          Copy ID
        </Button>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="py-4">
            <p className="text-center text-yellow-800 dark:text-yellow-200">
              Reconnecting to game...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Game Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Game Board */}
        <div>
          <GameBoard
            guesses={currentPlayer.guesses}
            onGuess={makeGuess}
            isGameFinished={currentPlayer.status === 'finished'}
            timeElapsed={timeElapsed}
          />
        </div>

        {/* Leaderboard */}
        <div className="space-y-6">
          <Leaderboard players={gameState.players} />
          
          {/* QR Code for Host */}
          {isHost && gameState.status === 'waiting' && (
            <QRGenerator 
              gameId={gameId} 
              onGenerateQR={generateQRData}
            />
          )}
        </div>
      </div>

      {/* Game Status */}
      {gameState.status === 'waiting' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Waiting for Game to Start
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Share the game ID with other players to get started!
            </p>
          </CardContent>
        </Card>
      )}

      {currentPlayer.status === 'finished' && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="py-4">
            <p className="text-center text-green-800 dark:text-green-200 font-medium">
              🎉 You completed the word in {currentPlayer.guesses.length} guesses 
              and {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}!
            </p>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  )
}