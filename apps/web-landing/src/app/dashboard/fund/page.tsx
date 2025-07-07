'use client';

import { useState } from 'react';
import { Button } from '../../../components/Button'; // <-- UPDATED IMPORT

export default function FundPage() {
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInitializePayment = async () => {
    if (amount <= 0) {
      setMessage('Please enter a valid amount.');
      return;
    }
    setLoading(true);
    setMessage('Connecting to payment gateway...');

    try {
      const response = await fetch('/api/initialize-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h2>Fund Your Wallet (NGN)</h2>
      <p>You will be redirected to our secure payment partner to complete the transaction.</p>
      <input
        type="number"
        placeholder="Amount in NGN"
        onChange={(e) => setAmount(Number(e.target.value))}
        style={{ width: '100%', padding: '12px', fontSize: '16px', marginBottom: '20px' }}
        disabled={loading}
      />
      <Button 
        text={loading ? 'Connecting...' : 'Proceed to Funding'}
        onPress={handleInitializePayment} 
      />
      {message && <p style={{ marginTop: '20px', textAlign: 'center' }}>{message}</p>}
    </div>
  );
}