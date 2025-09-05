'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, X, Type } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface QRScannerProps {
  onScanSuccess: (data: string) => void
  onClose: () => void
}

export function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [manualEntry, setManualEntry] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { toast } = useToast()

  const startCamera = async () => {
    try {
      setIsScanning(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      
      // Start QR code detection
      startQRDetection()
    } catch (error) {
      console.error('Camera access failed:', error)
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please try manual entry.",
        variant: "destructive"
      })
      setShowManualEntry(true)
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const startQRDetection = () => {
    // Simple QR detection using canvas
    // In a real implementation, you'd use a proper QR code library
    const interval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) {
        clearInterval(interval)
        return
      }

      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      // Here you'd normally use a QR code detection library
      // For demo purposes, we'll just show the manual entry option
      setTimeout(() => {
        clearInterval(interval)
        setShowManualEntry(true)
        stopCamera()
        toast({
          title: "QR Scanner",
          description: "Please use manual entry for now",
        })
      }, 3000)
    }, 100)
  }

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
          {!showManualEntry && !isScanning && (
            <div className="space-y-4">
              <Button onClick={startCamera} className="w-full" size="lg">
                <Camera className="h-5 w-5 mr-2" />
                Scan QR Code
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowManualEntry(true)}
                className="w-full"
              >
                <Type className="h-5 w-5 mr-2" />
                Enter Manually
              </Button>
            </div>
          )}

          {isScanning && (
            <div className="space-y-4">
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                <div className="absolute inset-4 border-2 border-white rounded-lg">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Point your camera at the QR code
              </p>
              <Button variant="outline" onClick={stopCamera} className="w-full">
                Cancel Scan
              </Button>
            </div>
          )}

          {showManualEntry && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Game ID or QR Data</label>
                <Input
                  placeholder="Enter game ID or paste QR data"
                  value={manualEntry}
                  onChange={(e) => setManualEntry(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowManualEntry(false)}
                  className="flex-1"
                >
                  Back
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}