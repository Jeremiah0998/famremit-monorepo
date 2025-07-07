'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase-client';
import { Button } from '@famremit/ui';

// Define types for our data for type safety
type Wallet = {
  id: number;
  balance: number;
  currencies: {
    id: number;
    code: string;
  };
};

export default function SendPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  // Corrected State: sourceWalletId should be a string to match the <select> value
  const [sourceWalletId, setSourceWalletId] = useState<string>(''); 
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch user's wallets on page load
  const fetchWallets = useCallback(async () => {
    // Set loading for wallets specifically
    setMessage('Loading your wallets...'); 
    const { data, error } = await supabase
      .from('wallets')
      .select('id, balance, currencies(id, code)');

    if (error) {
      setMessage(`Error fetching wallets: ${error.message}`);
    } else if (data) {
      setWallets(data as Wallet[]);
      // Bug Fix: If wallets are found, set the default selection
      if (data.length > 0) {
        setSourceWalletId(String(data[0].id)); // Set the first wallet as default
        setMessage(''); // Clear the "loading" message
      } else {
        setMessage('No wallets found for your account.');
      }
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleTransfer = async () => {
    // Bug Fix: Check if sourceWalletId is empty before proceeding
    if (!sourceWalletId || !amount || !recipientEmail) {
      setMessage('Please fill all fields and select a source wallet.');
      return;
    }

    setLoading(true);
    setMessage('Processing transfer...');

    try {
      // Find the recipient's user ID from their email
      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', recipientEmail)
        .single();

      if (profileError || !recipientProfile) {
        throw new Error('Recipient not found.');
      }

      // Find the details of the wallet we are sending from
      const sourceWallet = wallets.find(w => String(w.id) === sourceWalletId);
      if (!sourceWallet) {
        throw new Error('Invalid source wallet.');
      }

      // Find the recipient's wallet that matches the source currency
      const { data: recipientWallet, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', recipientProfile.id)
        .eq('currency_id', sourceWallet.currencies.id)
        .single();

      if (walletError || !recipientWallet) {
        throw new Error(`Recipient does not have a ${sourceWallet.currencies.code} wallet.`);
      }

      // Call our secure PostgreSQL function to perform the atomic transfer
      const { data: transferResult, error: rpcError } = await supabase.rpc('create_wallet_transfer', {
        sender_wallet_id: Number(sourceWalletId),
        receiver_wallet_id: recipientWallet.id,
        amount: parseFloat(amount),
      });

      if (rpcError) {
        throw rpcError;
      }

      if (transferResult && !transferResult.success) {
        throw new Error(transferResult.message);
      }

      setMessage(`Transfer successful! Transaction ID: ${transferResult.transaction_id}`);
      fetchWallets(); // Refresh wallet balances after a successful transfer
    } catch (err: any) {
      setMessage(`Transfer failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h2>Send Money</h2>
      
      {/* Moved wallets display inside the component */}
      <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Your Wallets</h3>
        {wallets.length > 0 ? (
          wallets.map((wallet) => (
            <div key={wallet.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <strong>{wallet.currencies.code}</strong>
              <span>{Number(wallet.balance).toFixed(2)}</span>
            </div>
          ))
        ) : (
          <p>No wallets found.</p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="email"
          placeholder="Recipient's Email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          style={{ padding: '12px', fontSize: '16px' }}
          disabled={loading}
        />
        <input
          type="number"
          placeholder="Amount to Send"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ padding: '12px', fontSize: '16px' }}
          disabled={loading}
        />
        {/* This is the dropdown menu. It will now be populated. */}
        <select
          value={sourceWalletId}
          onChange={(e) => setSourceWalletId(e.target.value)}
          style={{ padding: '12px', fontSize: '16px' }}
          disabled={loading || wallets.length === 0}
        >
          {/* Bug Fix: Added a disabled default option */}
          <option value="" disabled>Select a source wallet</option> 
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              Send from {wallet.currencies.code} ({Number(wallet.balance).toFixed(2)})
            </option>
          ))}
        </select>
        
        {/* Bug Fix: Use the correct component for the button */}
        <Button text={loading ? 'Processing...' : 'Send Money'} onPress={handleTransfer} />

        {message && <p style={{ textAlign: 'center', marginTop: '15px' }}>{message}</p>}
      </div>
    </div>
  );
}