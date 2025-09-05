'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Guess } from '@/lib/game-logic'

interface GameBoardProps {
  guesses: Guess[]
  onGuess: (word: string) => void
  isGameFinished: boolean
  timeElapsed: number
}

export function GameBoard({ guesses, onGuess, isGameFinished, timeElapsed }: GameBoardProps) {
  const [currentGuess, setCurrentGuess] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (currentGuess.length === 5 && !isGameFinished) {
      onGuess(currentGuess.toUpperCase())
      setCurrentGuess('')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-xl">
            Time: {formatTime(timeElapsed)}
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Guesses: {guesses.length}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Enter 5-letter word"
              value={currentGuess}
              onChange={(e) => setCurrentGuess(e.target.value.toUpperCase())}
              maxLength={5}
              disabled={isGameFinished}
              className="text-center text-lg font-mono tracking-widest"
            />
            <Button 
              type="submit" 
              className="w-full"
              disabled={currentGuess.length !== 5 || isGameFinished}
            >
              Guess
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Previous Guesses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {guesses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No guesses yet
              </p>
            ) : (
              guesses.map((guess, index) => (
                <div 
                  key={index}
                  className="flex justify-between items-center p-2 rounded bg-muted"
                >
                  <span className="font-mono text-lg">{guess.word}</span>
                  <span className="font-semibold text-primary">
                    {guess.commonLetters} common
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}