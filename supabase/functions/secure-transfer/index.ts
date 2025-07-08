import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'npm:std/server'

serve(async (req) => {
  try {
    // Create an admin client with the service_role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get the authorization header from the incoming request
    const authHeader = req.headers.get('Authorization')!;

    // Get the logged-in user's data using their JWT
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('Invalid user token.');

    // Get the parameters from the request body
    const { recipient_email, amount, source_wallet_id } = await req.json();
    if (!recipient_email || !amount || !source_wallet_id) {
      throw new Error('Missing required parameters.');
    }

    // --- SERVER-SIDE VALIDATION ---
    // 1. Verify the sender's wallet belongs to them
    const { data: sourceWallet } = await supabaseAdmin.from('wallets').select('id, balance, currency_id').eq('id', source_wallet_id).eq('user_id', user.id).single();
    if (!sourceWallet) throw new Error('Invalid source wallet or permission denied.');
    
    // 2. Verify recipient exists
    const { data: recipientProfile } = await supabaseAdmin.from('profiles').select('id').eq('email', recipient_email).single();
    if (!recipientProfile) throw new Error('Recipient not found.');
    
    // 3. Verify recipient has the correct wallet
    const { data: recipientWallet } = await supabaseAdmin.from('wallets').select('id').eq('user_id', recipientProfile.id).eq('currency_id', sourceWallet.currency_id).single();
    if (!recipientWallet) throw new Error('Recipient does not have a matching currency wallet.');

    // 4. If all checks pass, call the atomic transfer function
    const { data: transferResult, error: rpcError } = await supabaseAdmin.rpc('create_wallet_transfer', {
      sender_wallet_id: source_wallet.id,
      receiver_wallet_id: recipientWallet.id,
      amount: amount
    });
    if (rpcError) throw rpcError;
    if (transferResult && !transferResult.success) throw new Error(transferResult.message);
    
    return new Response(JSON.stringify(transferResult), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
})