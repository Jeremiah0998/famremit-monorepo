import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

type Payout = {
  recipient_email: string;
  amount: number;
  currency: 'NGN' | 'GHS'; // For now, we support these two
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Authenticate the business client via API Key
    const apiKey = req.headers['x-api-key'];
    if (typeof apiKey !== 'string' || !apiKey) {
      return res.status(401).json({ error: 'API key is missing.' });
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // We hash the provided key to compare it with the stored hash
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    const { data: apiKeyData } = await supabaseAdmin
      .from('business_api_keys')
      .select('business_profile_id, is_active')
      .eq('hashed_api_key', hashedKey)
      .single();

    if (!apiKeyData || !apiKeyData.is_active) {
      return res.status(401).json({ error: 'Invalid or inactive API key.' });
    }
    
    const businessUserId = apiKeyData.business_profile_id;

    // 2. Validate the request body (the list of payouts)
    const payouts: Payout[] = req.body.payouts;
    if (!payouts || !Array.isArray(payouts) || payouts.length === 0) {
      return res.status(400).json({ error: 'Request body must contain a non-empty "payouts" array.' });
    }

    // --- Start processing the payouts ---
    const results = [];
    for (const payout of payouts) {
        const { recipient_email, amount, currency } = payout;
        
        // For simplicity, we process one by one. A production system might use a queue.
        try {
            // Find the business's source wallet
            const { data: businessWallet } = await supabaseAdmin.from('wallets').select('id').eq('user_id', businessUserId).eq('currency_id', (await supabaseAdmin.from('currencies').select('id').eq('code', currency).single()).data!.id).single();
            if(!businessWallet) throw new Error(`Business wallet for ${currency} not found.`);

            // Find the recipient's profile and wallet
            const { data: recipientProfile } = await supabaseAdmin.from('profiles').select('id').eq('email', recipient_email).single();
            if(!recipientProfile) throw new Error('Recipient profile not found.');

            const { data: recipientWallet } = await supabaseAdmin.from('wallets').select('id').eq('user_id', recipientProfile.id).eq('currency_id', (await supabaseAdmin.from('currencies').select('id').eq('code', currency).single()).data!.id).single();
            if(!recipientWallet) throw new Error(`Recipient wallet for ${currency} not found.`);

            // Use our atomic transfer function
            const { data: transferResult, error: rpcError } = await supabaseAdmin.rpc('create_wallet_transfer', {
                sender_wallet_id: businessWallet.id,
                receiver_wallet_id: recipientWallet.id,
                amount: amount
            });

            if (rpcError) throw rpcError;
            if (!transferResult.success) throw new Error(transferResult.message);
            
            results.push({ email: recipient_email, status: 'success', transaction_id: transferResult.transaction_id });

        } catch (error: any) {
            results.push({ email: recipient_email, status: 'failed', reason: error.message });
        }
    }

    // 3. Respond with the results of the bulk operation
    return res.status(200).json({
      message: 'Bulk payout processing complete.',
      results: results
    });

  } catch (error: any) {
    return res.status(500).json({ error: 'An internal server error occurred.', details: error.message });
  }
}