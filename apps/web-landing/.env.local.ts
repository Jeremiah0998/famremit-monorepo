import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // --- RESTORED TO BEST PRACTICE ---
    // We are now securely reading the key from the process environment.
    // This will work correctly now that the duplicate .env file is gone.
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error("CRITICAL: PAYSTACK_SECRET_KEY is not defined in environment variables.");
      throw new Error("Server configuration error. Please contact support.");
    }
    
    // 1. Authenticate the user
    const supabase = createPagesServerClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Get the amount
    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'A valid amount is required.' });
    }

    // 3. Prepare the Paystack request
    const paystackUrl = 'https://api.paystack.co/transaction/initialize';
    const headers = {
      Authorization: `Bearer ${paystackSecretKey}`,
      'Content-Type': 'application/json',
    };
    const body = JSON.stringify({
      email: session.user.email,
      amount: amount * 100,
      currency: 'NGN',
      callback_url: `${req.headers.origin}/dashboard`,
    });

    // 4. Call Paystack
    const paystackResponse = await fetch(paystackUrl, {
      method: 'POST',
      headers,
      body,
    });
    
    const data = await paystackResponse.json();

    if (!paystackResponse.ok) {
      console.error('Paystack API Error:', data);
      throw new Error(data.message || 'Failed to initialize payment.');
    }

    // 5. Send the Paystack URL to the frontend
    return res.status(200).json(data.data);

  } catch (error: any) {
    console.error('[initialize-payment] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}