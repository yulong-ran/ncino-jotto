'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Player } from '@/lib/game-logic'
import { Trophy, Clock, Target } from 'lucide-react'

interface LeaderboardProps {
  players: Player[]
}

export function Leaderboard({ players }: LeaderboardProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    // Finished players first, then by time, then by guess count
    if (a.status === 'finished' && b.status !== 'finished') return -1
    if (b.status === 'finished' && a.status !== 'finished') return 1
    
    if (a.status === 'finished' && b.status === 'finished') {
      if (a.timeUsed !== b.timeUsed) return a.timeUsed - b.timeUsed
      return a.guesses.length - b.guesses.length
    }
    
    return a.guesses.length - b.guesses.length
  })

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedPlayers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No players yet
            </p>
          ) : (
            sortedPlayers.map((player, index) => (
              <div 
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  index === 0 && player.status === 'finished' 
                    ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800' 
                    : 'bg-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold w-6">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{player.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {player.status === 'finished' ? 'Finished' : 
                       player.status === 'playing' ? 'Playing' : 'Disconnected'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(player.timeUsed)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    <span>{player.guesses.length}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}