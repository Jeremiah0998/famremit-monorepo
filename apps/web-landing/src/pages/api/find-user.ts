import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createPagesServerClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Query the profiles table to find a user with the matching email
  // We only return the id and full_name for security and privacy
  const { data: user, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('email', email) // Note: This assumes you add an 'email' column to profiles
    .single();

  if (error || !user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json(user);
}