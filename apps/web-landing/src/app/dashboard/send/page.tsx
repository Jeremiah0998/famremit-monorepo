'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase-client';
import { Button } from '../../../components/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Wallet = { id: number; balance: number; currencies: { id: number; code: string; }; };

const fetchWallets = async (): Promise<Wallet[]> => {
  const { data, error } = await supabase.from('wallets').select('id, balance, currencies(id, code)');
  if (error) throw new Error(error.message);
  return data || [];
};

export default function SendPage() {
  const queryClient = useQueryClient();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [sourceWalletId, setSourceWalletId] = useState<string>('');
  const [message, setMessage] = useState('');

  const { data: wallets, isLoading, error } = useQuery<Wallet[]>({
    queryKey: ['wallets'],
    queryFn: fetchWallets,
  });

  useEffect(() => {
    if (wallets && wallets.length > 0 && !sourceWalletId) {
      setSourceWalletId(String(wallets[0].id));
    }
  }, [wallets, sourceWalletId]);
  
  const transferMutation = useMutation({
    mutationFn: async (params: { recipient_email: string, amount: number, source_wallet_id: number }) => {
      // --- THIS IS THE NEW LOGIC ---
      // We securely invoke the Edge Function
      const { data, error } = await supabase.functions.invoke('secure-transfer', {
        body: params,
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error); // Handle errors returned from the function
      return data;
    },
    onSuccess: (data) => {
      setMessage(`Transfer successful! Transaction ID: ${data.transaction_id}`);
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setRecipientEmail('');
      setAmount('');
    },
    onError: (err: any) => {
      setMessage(`Transfer failed: ${err.message}`);
    }
  });

  const handleTransfer = () => {
    if (!sourceWalletId || !amount || !recipientEmail) {
      setMessage('Please fill all fields.');
      return;
    }
    transferMutation.mutate({
      recipient_email: recipientEmail,
      amount: parseFloat(amount),
      source_wallet_id: Number(sourceWalletId),
    });
  };

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        <h2>Send Money</h2>
        <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>Your Wallets</h3>
            {wallets?.map(wallet => ( <div key={wallet.id}>...</div> ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Recipient's Email" />
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
            <select value={sourceWalletId} onChange={e => setSourceWalletId(e.target.value)}>
                {wallets?.map(wallet => (<option key={wallet.id} value={wallet.id}>{`Send from ${wallet.currencies.code} (${wallet.balance.toFixed(2)})`}</option>))}
            </select>
            <Button text={transferMutation.isPending ? "Processing..." : "Send Money"} onPress={handleTransfer} />
            {message && <p>{message}</p>}
        </div>
    </div>
  );
}