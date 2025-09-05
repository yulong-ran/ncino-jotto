'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { GamepadIcon, Users, Plus, QrCode } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { validateWord } from '@/lib/game-logic'
import { p2pGameManager } from '@/lib/p2p-game-manager'
import { useRouter } from 'next/navigation'
import { GameInstructions } from '@/components/game/game-instructions'
import { QRScanner } from '@/components/qr/qr-scanner'

export default function Home() {
  const [view, setView] = useState<'menu' | 'host' | 'join'>('menu')
  const [hostWord, setHostWord] = useState('')
  const [gameId, setGameId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCreateGame = async () => {
    if (!validateWord(hostWord)) {
      toast({
        title: "Invalid Word",
        description: "Please enter a valid 5-letter word",
        variant: "destructive"
      })
      return
    }
    
    if (!playerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    
    try {
      // Create P2P game
      const newGameId = await p2pGameManager.createGame(hostWord, playerName)
      
      toast({
        title: "Game Created!",
        description: `Game ID: ${newGameId}. Share this with other players.`
      })
      
      router.push(`/game?id=${newGameId}`)
    } catch (error) {
      console.error('Error creating game:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create game. Please try again.",
        variant: "destructive"
      })
      setIsLoading(false)
    }
  }

  const handleJoinGame = async () => {
    if (!gameId.trim()) {
      toast({
        title: "Game ID Required",
        description: "Please enter a game ID",
        variant: "destructive"
      })
      return
    }
    
    if (!playerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    
    try {
      // Join P2P game
      await p2pGameManager.joinGame(gameId.toUpperCase(), playerName)
      
      toast({
        title: "Joined Game!",
        description: `Successfully joined ${gameId.toUpperCase()}`
      })
      
      router.push(`/game?id=${gameId.toUpperCase()}`)
    } catch (error) {
      console.error('Error joining game:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join game. Please try again.",
        variant: "destructive"
      })
      setIsLoading(false)
    }
  }

  const handleQRScan = async (data: string) => {
    setShowQRScanner(false)
    setIsLoading(true)
    
    try {
      const qrData = JSON.parse(data)
      
      if (qrData.gameId) {
        if (!playerName.trim()) {
          toast({
            title: "Name Required",
            description: "Please enter your name first",
            variant: "destructive"
          })
          setView('join')
          setGameId(qrData.gameId)
          setIsLoading(false)
          return
        }

        // Join via QR code data (simplified for BroadcastChannel)
        await p2pGameManager.joinGame(qrData.gameId, playerName)
        
        toast({
          title: "Joined Game!",
          description: `Successfully joined via QR code`
        })
        
        router.push(`/game?id=${qrData.gameId}`)
      } else {
        throw new Error('Invalid QR code data')
      }
    } catch (error) {
      console.error('Error joining via QR:', error)
      toast({
        title: "Error",
        description: "Invalid QR code. Please try manual entry.",
        variant: "destructive"
      })
      setView('join')
      setIsLoading(false)
    }
  }

  return (
    <>
      <GameInstructions />
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <GamepadIcon className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Jotto Game</h1>
          </div>
          <p className="text-muted-foreground">
            Guess the 5-letter word and compete with friends!
          </p>
        </div>

      {view === 'menu' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Host a Game
              </CardTitle>
              <CardDescription>
                Create a new game for others to join
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setView('host')} 
                className="w-full"
                size="lg"
              >
                Create Game
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Join a Game
              </CardTitle>
              <CardDescription>
                Enter a game ID to join an existing game
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => setShowQRScanner(true)} 
                className="w-full"
                size="lg"
              >
                <QrCode className="h-5 w-5 mr-2" />
                Join with QR Data
              </Button>
              <Button 
                onClick={() => setView('join')} 
                className="w-full"
                variant="outline"
                size="lg"
              >
                Enter Game ID
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {view === 'host' && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Game</CardTitle>
            <CardDescription>
              Choose your 5-letter word and enter your name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Your Name</label>
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Secret Word (5 letters)</label>
              <Input
                placeholder="Enter secret word"
                value={hostWord}
                onChange={(e) => setHostWord(e.target.value.toUpperCase())}
                maxLength={5}
                className="font-mono tracking-widest"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setView('menu')} 
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleCreateGame}
                className="flex-1"
                disabled={!hostWord || !playerName.trim() || isLoading}
              >
                {isLoading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {view === 'join' && (
        <Card>
          <CardHeader>
            <CardTitle>Join Game</CardTitle>
            <CardDescription>
              Enter the game ID and your name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Your Name</label>
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Game ID</label>
              <Input
                placeholder="Enter game ID"
                value={gameId}
                onChange={(e) => setGameId(e.target.value.toUpperCase())}
                className="font-mono tracking-widest"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setView('menu')} 
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleJoinGame}
                className="flex-1"
                disabled={!gameId.trim() || !playerName.trim() || isLoading}
              >
                {isLoading ? 'Joining...' : 'Join'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
      
      {showQRScanner && (
        <QRScanner
          onScanSuccess={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </>
  )
}
