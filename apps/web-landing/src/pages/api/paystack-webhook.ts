import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Disable the default body parser, as we need the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read the raw body from the request
async function getRawBody(req: NextApiRequest): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY!;
  const rawBody = await getRawBody(req);
  const body = JSON.parse(rawBody.toString());

  // 1. Verify the webhook signature to ensure it's from Paystack
  const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  if (hash !== req.headers['x-paystack-signature']) {
    console.error('Webhook Error: Invalid signature');
    return res.status(401).send('Invalid signature');
  }

  // 2. Check the event type
  if (body.event !== 'charge.success') {
    return res.status(200).send('Event not for successful charge, ignoring.');
  }
  
  const eventData = body.data;
  const { email } = eventData.customer;
  const amount = eventData.amount / 100;
  const currency = eventData.currency.toUpperCase();

  try {
    // 4. Create a Supabase admin client using the service_role key
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 5. Find the user's profile and currency ID
    const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
    if (!profile) throw new Error(`Webhook Error: Profile not found for email ${email}`);

    const { data: currencyData } = await supabaseAdmin.from('currencies').select('id').eq('code', currency).single();
    if (!currencyData) throw new Error(`Webhook Error: Currency ${currency} not found`);

    // 6. Find the user's wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('id, balance')
        .eq('user_id', profile.id)
        .eq('currency_id', currencyData.id)
        .single();
    if (walletError || !wallet) throw new Error(`Webhook Error: Wallet not found for user ${profile.id} in currency ${currency}`);

    // 7. Atomically credit the user's wallet using a remote procedure call (RPC)
    const newBalance = wallet.balance + amount;
    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', wallet.id);
    
    if (updateError) throw new Error(`Webhook Error: Failed to credit wallet ${wallet.id}. Reason: ${updateError.message}`);

    console.log(`SUCCESS: Credited ${amount} ${currency} to wallet ${wallet.id}. New balance: ${newBalance}.`);
    
    // 8. Respond to Paystack to acknowledge receipt
    return res.status(200).send({ status: 'success' });

  } catch (error: any) {
    console.error(error.message);
    return res.status(500).send({ error: error.message });
  }
}