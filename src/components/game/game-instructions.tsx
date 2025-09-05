'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HelpCircle, X } from 'lucide-react'
import { useState } from 'react'

export function GameInstructions() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-10"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        How to Play
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>How to Play Jotto</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                A word guessing game for multiple players
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">🎯 Objective</h4>
                <p className="text-sm text-muted-foreground">
                  Guess the secret 5-letter word faster than other players!
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">🎮 How to Play</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>The host creates a game with a secret 5-letter word</li>
                  <li>Players join using the game ID</li>
                  <li>Make guesses by entering 5-letter words</li>
                  <li>Each guess shows how many letters match the secret word</li>
                  <li>Use the clues to narrow down the answer</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">🏆 Scoring</h4>
                <p className="text-sm text-muted-foreground">
                  The fastest player with the fewest guesses wins!
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">💡 Example</h4>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p className="font-mono">Secret word: HOUSE</p>
                  <p className="font-mono">Your guess: MOUSE → 4 common letters</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The letters M, O, U, S, E share 4 letters with H, O, U, S, E
                  </p>
                </div>
              </div>

              <Button 
                onClick={() => setIsOpen(false)}
                className="w-full"
              >
                Got it!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}