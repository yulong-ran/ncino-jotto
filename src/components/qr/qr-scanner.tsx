'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QrCode, X, Type } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface QRScannerProps {
  onScanSuccess: (data: string) => void
  onClose: () => void
}

export function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [manualEntry, setManualEntry] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(true) // Start with manual entry
  const { toast } = useToast()

  const handleManualSubmit = () => {
    if (manualEntry.trim()) {
      try {
        // Try to parse as JSON (QR data) or use as plain game ID
        const data = manualEntry.startsWith('{') ? manualEntry : JSON.stringify({ gameId: manualEntry })
        onScanSuccess(data)
      } catch (error) {
        toast({
          title: "Invalid Data",
          description: "Please check the game ID or QR data",
          variant: "destructive"
        })
      }
    }
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md relative">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Join Game</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Scan QR code or enter game details manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <QrCode className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                QR scanning not available. Use manual entry below.
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Game ID or Connection Data</label>
              <Input
                placeholder="Enter game ID or paste connection data"
                value={manualEntry}
                onChange={(e) => setManualEntry(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste the game data shared by the host, or just enter the Game ID
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleManualSubmit}
                disabled={!manualEntry.trim()}
                className="flex-1"
              >
                Join Game
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}