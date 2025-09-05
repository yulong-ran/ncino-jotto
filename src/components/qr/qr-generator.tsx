'use client'

import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface QRGeneratorProps {
  gameId: string
  onGenerateQR: () => Promise<string>
}

export function QRGenerator({ gameId, onGenerateQR }: QRGeneratorProps) {
  const [qrData, setQRData] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const generateQR = async () => {
    setIsGenerating(true)
    try {
      const data = await onGenerateQR()
      setQRData(data)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    generateQR()
  }, [gameId])

  const copyGameId = () => {
    navigator.clipboard.writeText(gameId)
    toast({
      title: "Copied!",
      description: "Game ID copied to clipboard"
    })
  }

  const copyQRData = () => {
    navigator.clipboard.writeText(qrData)
    toast({
      title: "Copied!",
      description: "Connection data copied to clipboard"
    })
  }

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-lg">Share Your Game</CardTitle>
        <CardDescription>
          Players can scan this QR code to join instantly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        <div className="flex justify-center p-4 bg-white rounded-lg">
          {qrData ? (
            <QRCode
              value={qrData}
              size={200}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              className="border rounded"
            />
          ) : (
            <div className="w-[200px] h-[200px] bg-muted rounded flex items-center justify-center">
              {isGenerating ? (
                <RefreshCw className="h-8 w-8 animate-spin" />
              ) : (
                <span className="text-muted-foreground">No QR Code</span>
              )}
            </div>
          )}
        </div>

        {/* Game ID */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Game ID:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded font-mono text-center">
              {gameId}
            </code>
            <Button variant="outline" size="sm" onClick={copyGameId}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={generateQR}
            disabled={isGenerating}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh QR
          </Button>
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={copyQRData}
            disabled={!qrData}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Data
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>• Players scan the QR code to join instantly</p>
          <p>• Or manually enter the Game ID</p>
          <p>• Make sure you're on the same WiFi network</p>
        </div>
      </CardContent>
    </Card>
  )
}