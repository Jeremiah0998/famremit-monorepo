'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase-client';
import { Button } from '../../../components/Button'; // <-- UPDATED IMPORT

type PayoutAccount = { id: number; display_name: string; last_four_digits: string; account_type: string; };

export default function PayoutsPage() {
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [accountType, setAccountType] = useState('NGN_BANK');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('payout_accounts').select('*');
    if (error) setMessage(`Error fetching accounts: ${error.message}`);
    else setAccounts(data as PayoutAccount[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleSaveAccount = async () => {
    if (!accountNumber || !bankName) { setMessage('Please fill all fields.'); return; }
    setLoading(true);
    setMessage('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); setMessage('User not found.'); return; }
    const { error } = await supabase.from('payout_accounts').insert({
        user_id: user.id, account_type: accountType, display_name: bankName,
        last_four_digits: accountNumber.slice(-4), encrypted_details: 'dummy_encrypted_data'
    });
    if (error) setMessage(`Error saving account: ${error.message}`);
    else {
        setMessage('Account saved successfully!');
        setAccountNumber(''); setBankName('');
        await fetchAccounts();
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
        <h2>Payout Settings</h2>
        <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>Saved Accounts</h3>
            {accounts.length > 0 ? accounts.map(acc => ( <div key={acc.id}> {acc.display_name} - ****{acc.last_four_digits} ({acc.account_type}) </div> )) : <p>You have no saved payout accounts.</p>}
        </div>
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
            <h3>Add New Account</h3>
            <select value={accountType} onChange={e => setAccountType(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }}>
                <option value="NGN_BANK">Nigerian Bank Account</option>
                <option value="GHS_MOMO">Ghanaian Mobile Money</option>
            </select>
            <input type="text" placeholder={accountType === 'NGN_BANK' ? "Bank Name (e.g., GTBank)" : "MoMo Provider (e.g., MTN)"} value={bankName} onChange={e => setBankName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
            <input type="text" placeholder={accountType === 'NGN_BANK' ? "Account Number" : "Mobile Money Number"} value={accountNumber} onChange={e => setAccountNumber(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
            <Button text={loading ? 'Saving...' : 'Save Account'} onPress={handleSaveAccount} />
        </div>
        {message && <p style={{ marginTop: '20px', textAlign: 'center' }}>{message}</p>}
    </div>
  );
}