import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Create an admin client with the service_role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the user from the cookie/token sent with the request
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('Authentication token is missing.');
    
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) throw new Error('Invalid user token.');

    const { recipient_email, amount, source_wallet_id } = req.body;
    if (!recipient_email || !amount || !source_wallet_id) {
      throw new Error('Missing required parameters.');
    }

    // --- All logic now runs on our own server, inside our own "kitchen" ---
    const { data: sourceWallet } = await supabaseAdmin.from('wallets').select('id, balance, currency_id').eq('id', source_wallet_id).eq('user_id', user.id).single();
    if (!sourceWallet) throw new Error('Invalid source wallet.');
    
    const { data: recipientProfile } = await supabaseAdmin.from('profiles').select('id').eq('email', recipient_email).single();
    if (!recipientProfile) throw new Error('Recipient not found.');
    
    const { data: recipientWallet } = await supabaseAdmin.from('wallets').select('id').eq('user_id', recipientProfile.id).eq('currency_id', sourceWallet.currency_id).single();
    if (!recipientWallet) throw new Error('Recipient does not have a matching currency wallet.');

    const { data: transferResult, error: rpcError } = await supabaseAdmin.rpc('create_wallet_transfer', {
      sender_wallet_id: source_wallet.id,
      receiver_wallet_id: recipientWallet.id,
      amount: amount
    });
    if (rpcError) throw rpcError;
    if (transferResult && !transferResult.success) throw new Error(transferResult.message);
    
    return res.status(200).json(transferResult);

  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}