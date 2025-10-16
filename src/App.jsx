import React, { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe("pk_live_51RFzzUE3TuvyrcXaJRXgC5Ii3F0lae78X6hso2Lh1u7wUWtUQD3lt2gXLKJnz5drLwdz0Qrm9BDut1E5js8dziS000VxnMzI8h")

function App() {
  const [stripe, setStripe] = useState(null)
  const [elements, setElements] = useState(null)
  const [cardElement, setCardElement] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const initializeStripe = async () => {
      const stripeInstance = await stripePromise
      setStripe(stripeInstance)
      
      if (stripeInstance) {
        const elementsInstance = stripeInstance.elements()
        setElements(elementsInstance)
        
        const cardElementInstance = elementsInstance.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
          },
        })
        
        setCardElement(cardElementInstance)
        cardElementInstance.mount('#card-element')
      }
    }

    initializeStripe()
  }, [])

  const handlePayment = async () => {
    if (!stripe || !cardElement) {
      console.error('Stripe not loaded')
      return
    }

    setIsLoading(true)

    try {
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      })

      if (error) {
        console.error('Payment method creation failed:', error)
        alert(`Payment failed: ${error.message}`)
        return
      }

      // Log the paymentMethod as requested
      console.log('Payment Method:', paymentMethod)

      // Send paymentMethod.id to your server
      const response = await fetch('http://localhost:8080/v1/payments/make-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: 1000, 
          currency: 'usd', 
          payment_method_id: paymentMethod.id,
          method: "visa/mastercard" // Fixed value to match backend switch case
        }),
      })

      const data = await response.json()
      console.log('Payment response:', data)
      
      if (data.status === 'completed') {
        alert('Payment successful!')
      } else if (data.requiresAction && data.stripeStatus === 'requires_action') {
        // Handle 3D Secure authentication
        const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret)
        
        if (confirmError) {
          console.error('3D Secure confirmation failed:', confirmError)
          alert(`Authentication failed: ${confirmError.message}`)
        } else {
          alert('Payment successful after authentication!')
        }
      } else {
        alert('Payment failed. Please try again.')
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('An error occurred during payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Stripe Payment Test
        </h1>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Information
            </label>
            <div 
              id="card-element" 
              className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {/* Stripe Elements will create form elements here */}
            </div>
          </div>
          
          <button
            onClick={handlePayment}
            disabled={!stripe || !cardElement || isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : 'Pay $10.00'}
          </button>
          
          <div className="text-xs text-gray-500 text-center">
            Test with card number: 4242 4242 4242 4242
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
