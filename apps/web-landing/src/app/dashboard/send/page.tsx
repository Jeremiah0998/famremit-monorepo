'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase-client';
import { Button } from '../../../components/Button';

// Define types for our data for type safety
type Wallet = {
  id: number;
  balance: number;
  currencies: {
    id: number; // This is the currency ID
    code: string;
  };
};

export default function SendPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [sourceWalletId, setSourceWalletId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wallets')
      .select('id, balance, currencies(id, code)'); // Ensure we fetch currency ID

    if (error) {
      setMessage(`Error fetching wallets: ${error.message}`);
    } else if (data) {
      setWallets(data as Wallet[]);
      if (data.length > 0) {
        setSourceWalletId(String(data[0].id));
      } else {
        setMessage('No wallets found for your account.');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleTransfer = async () => {
    if (!sourceWalletId || !amount || !recipientEmail) {
      setMessage('Please fill all fields and select a source wallet.');
      return;
    }
    setLoading(true);
    setMessage('Processing transfer...');

    try {
      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', recipientEmail)
        .single();

      if (profileError || !recipientProfile) {
        throw new Error('Recipient not found.');
      }

      const sourceWallet = wallets.find(w => String(w.id) === sourceWalletId);
      if (!sourceWallet) {
        throw new Error('Invalid source wallet.');
      }

      // --- THIS IS THE BUG FIX ---
      // We now use the correct currency ID from the source wallet to find the recipient's wallet.
      const { data: recipientWallet, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', recipientProfile.id)
        .eq('currency_id', sourceWallet.currencies.id) // Use the numeric ID for comparison
        .single();

      if (walletError || !recipientWallet) {
        throw new Error(`Recipient does not have a ${sourceWallet.currencies.code} wallet.`);
      }

      const { data: transferResult, error: rpcError } = await supabase.rpc('create_wallet_transfer', {
        sender_wallet_id: Number(sourceWalletId),
        receiver_wallet_id: recipientWallet.id,
        amount: parseFloat(amount),
      });

      if (rpcError) throw rpcError;
      if (transferResult && !transferResult.success) throw new Error(transferResult.message);

      setMessage(`Transfer successful! Transaction ID: ${transferResult.transaction_id}`);
      fetchWallets();
    } catch (err: any) {
      setMessage(`Transfer failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h2>Send Money</h2>
      <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Your Wallets</h3>
        {wallets.length > 0 ? (
          wallets.map((wallet) => (
            <div key={wallet.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <strong>{wallet.currencies.code}</strong>
              <span>{Number(wallet.balance).toFixed(2)}</span>
            </div>
          ))
        ) : ( <p>No wallets found.</p> )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="email" placeholder="Recipient's Email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} style={{ padding: '12px', fontSize: '16px' }} disabled={loading}/>
        <input type="number" placeholder="Amount to Send" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: '12px', fontSize: '16px' }} disabled={loading}/>
        <select value={sourceWalletId} onChange={(e) => setSourceWalletId(e.target.value)} style={{ padding: '12px', fontSize: '16px' }} disabled={loading || wallets.length === 0}>
          <option value="" disabled>Select a source wallet</option> 
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>Send from {wallet.currencies.code} ({Number(wallet.balance).toFixed(2)})</option>
          ))}
        </select>
        <Button text={loading ? 'Processing...' : 'Send Money'} onPress={handleTransfer} />
        {message && <p style={{ textAlign: 'center', marginTop: '15px' }}>{message}</p>}
      </div>
    </div>
  );
}