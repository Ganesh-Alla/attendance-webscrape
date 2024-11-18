'use client'

import React, { useState, useEffect, FormEvent } from 'react'

// Button Component
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => {
    return (
      <button
        className={`bg-blue-500 text-white  inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4 ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

// Input Component
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

// Card Component
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}
      {...props}
    />
  )
)
Card.displayName = 'Card'

// CardHeader Component
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col space-y-1.5 p-6 ${className}`}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

// CardTitle Component
const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

// CardContent Component
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
  )
)
CardContent.displayName = 'CardContent'

// Main Component
export default function Home() {
  const [username, setUsername] = useState('')
  const [currentLog, setCurrentLog] = useState('')
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [totalPercentage, setTotalPercentage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setCurrentLog('')
    setIsProcessing(true)
    setStudentName('')
    setTotalPercentage('')
    setError('')

    if (!username) {
      setCurrentLog('Please enter your registration number.')
      setIsProcessing(false)
      return
    }

    const eventSource = new EventSource(`/api/scrape?query=${encodeURIComponent(username)}`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.message) {
        setCurrentLog(data.message)
      }
      if (data.result) {
        if(!data.result.error){
          setStudentName(data.result.name || '')
        setTotalPercentage(data.result.total_percentage || '')
      }else{
        setError(data.result.error)
      }
      eventSource.close()
        setIsProcessing(false)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      setIsProcessing(false)
    }

    return () => {
      eventSource.close()
    }
  }

  return (
    <div className='flex justify-center items-center h-full'>
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Enter Your Registration Number</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Registration Number"
              disabled={isProcessing}
            />
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Get Details'}
            </Button>
          </form>
          <div className="mt-4">
            <h2 className="text-lg font-semibold mb-2">{ isProcessing ? "Status:": "Result:"}</h2>
            <div 
              className="bg-gray-100 p-4 rounded min-h-[60px] flex flex-col items-center justify-center transition-all duration-300 ease-in-out"
              key={currentLog} 
            >
              {isProcessing ? currentLog || 'Waiting for logs...' : 
              <>
          {studentName && <p className="text-blue-600 font-medium text-sm">{studentName.replace("WELCOME", "")}</p>}
          {totalPercentage && <p className="text-orange-600 font-bold text-sm">Your Attendance is {totalPercentage}</p>}
          {error && <p className="text-red-600 font-bold text-sm">{error}</p>}
          </>
          }
            </div>
          </div>
        </CardContent>
      </Card>
    </div></div>
  )
}