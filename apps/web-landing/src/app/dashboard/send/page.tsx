'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabase-client';
import { Button } from '../../../components/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Define the type for a single wallet
type Wallet = { id: number; balance: number; currencies: { id: number; code: string; } };

// This is the professional data fetching function
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

  // --- This is the React Query hook ---
  const { data: wallets, isLoading: isWalletsLoading, error: walletsError } = useQuery<Wallet[]>({
    queryKey: ['wallets'], // A unique key for this data
    queryFn: fetchWallets, // The function that fetches the data
  });

  // --- This is the hook for performing the transfer (a "mutation") ---
  const transferMutation = useMutation({
    mutationFn: async ({ senderWalletId, recipientWalletId, transferAmount }: { senderWalletId: number, recipientWalletId: number, transferAmount: number }) => {
        const { data, error } = await supabase.rpc('create_wallet_transfer', {
            sender_wallet_id: senderWalletId,
            receiver_wallet_id: recipientWalletId,
            amount: transferAmount,
        });
        if (error) throw new Error(error.message);
        if (data && !data.success) throw new Error(data.message);
        return data;
    },
    onSuccess: () => {
        setMessage('Transfer successful!');
        // This tells React Query to automatically refetch the wallets data
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
    onError: (err: Error) => {
        setMessage(`Transfer failed: ${err.message}`);
    }
  });

  const handleTransfer = async () => {
    if (!sourceWalletId || !amount || !recipientEmail) {
      setMessage('Please fill all fields.');
      return;
    }

    try {
        const sourceWallet = wallets?.find(w => String(w.id) === sourceWalletId);
        if (!sourceWallet) throw new Error('Source wallet not found.');

        const { data: recipientProfile } = await supabase.from('profiles').select('id').eq('email', recipientEmail).single();
        if (!recipientProfile) throw new Error('Recipient not found.');
        
        const { data: recipientWallet } = await supabase.from('wallets').select('id').eq('user_id', recipientProfile.id).eq('currency_id', sourceWallet.currencies.id).single();
        if (!recipientWallet) throw new Error(`Recipient does not have a ${sourceWallet.currencies.code} wallet.`);

        transferMutation.mutate({
            senderWalletId: Number(sourceWalletId),
            recipientWalletId: recipientWallet.id,
            transferAmount: parseFloat(amount)
        });
    } catch (err: any) {
        setMessage(`Transfer failed: ${err.message}`);
    }
  };

  if (isWalletsLoading) return <p>Loading your wallets...</p>;
  if (walletsError) return <p>Error: {walletsError.message}</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        <h2>Send Money</h2>
        <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>Your Wallets</h3>
            {wallets?.map(wallet => ( <div key={wallet.id}>...</div> ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* ... The rest of the form ... */}
            <select value={sourceWalletId} onChange={(e) => setSourceWalletId(e.target.value)}>
                {wallets?.map(wallet => (<option key={wallet.id} value={wallet.id}>{`Send from ${wallet.currencies.code}`}</option>))}
            </select>
            <Button text={transferMutation.isPending ? 'Processing...' : 'Send Money'} onPress={handleTransfer} />
            {message && <p>{message}</p>}
        </div>
    </div>
  );
}