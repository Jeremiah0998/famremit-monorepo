import { createClient } from 'npm:@supabase/supabase-js@2'
import { serve } from 'npm:std/server'

// The interface for our expected request body
interface QuoteRequest {
  source_currency: string;
  target_currency: string;
}

// Main function to handle requests
serve(async (req) => {
  try {
    // We are using the SERVICE_ROLE_KEY for this function. This gives it admin
    // privileges to read/write to our cache table, bypassing RLS.
    // This is secure because this key lives on the server and is never exposed to users.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Get the secret API key for the FX provider
    const fxApiKey = Deno.env.get('FX_API_KEY');
    if (!fxApiKey) {
        throw new Error('FX Provider API Key is not set.');
    }

    // Extract currency pair from the request
    const { source_currency, target_currency }: QuoteRequest = await req.json();
    if (!source_currency || !target_currency) {
      throw new Error('Source and target currency are required.');
    }

    // --- CACHE LOGIC ---
    // Check our cache first for a fresh rate (less than 5 minutes old)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: cachedRate } = await supabase
      .from('fx_rates_cache')
      .select('rate')
      .eq('source_currency', source_currency)
      .eq('target_currency', target_currency)
      .gte('last_updated_at', fiveMinutesAgo)
      .single();

    // If we find a fresh rate in the cache, return it immediately.
    if (cachedRate) {
      console.log(`Cache hit for ${source_currency}->${target_currency}`);
      return new Response(JSON.stringify({ rate: cachedRate.rate }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- EXTERNAL API FETCH ---
    // If cache is stale or missing, fetch from the external provider.
    console.log(`Cache miss for ${source_currency}->${target_currency}. Fetching from provider.`);
    const externalApiUrl = `https://v6.exchangerate-api.com/v6/${fxApiKey}/pair/${source_currency}/${target_currency}`;
    
    const response = await fetch(externalApiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch from FX provider: ${response.statusText}`);
    }
    const data = await response.json();

    const rate = data.conversion_rate;
    if (!rate) {
        throw new Error('Conversion rate not found in FX provider response.');
    }

    // --- UPDATE CACHE ---
    // Store the newly fetched rate in our cache for future requests.
    // 'upsert' will either INSERT a new row or UPDATE an existing one.
    const { error: upsertError } = await supabase.from('fx_rates_cache').upsert({
      source_currency: source_currency,
      target_currency: target_currency,
      rate: rate,
      last_updated_at: new Date().toISOString()
    }, { onConflict: 'source_currency,target_currency' });

    if (upsertError) {
        console.error('Failed to update cache:', upsertError);
        // We can still return the rate even if caching fails
    }

    // Return the fresh rate to the user.
    return new Response(JSON.stringify({ rate }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Generic error handling for any failure in the process.
    console.error('An error occurred in the FX function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});