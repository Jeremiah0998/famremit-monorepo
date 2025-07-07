'use client';

import Link from 'next/link';
import { supabase } from '../../lib/supabase-client';
import { Button } from '../../components/Button'; // <-- UPDATED IMPORT

export default function DashboardPage() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
      <h1>Welcome to your Dashboard!</h1>
      <p>This page is for members only.</p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
        <Link href="/dashboard/send"><Button onPress={() => {}} text="Send Money" /></Link>
        <Link href="/dashboard/fund"><Button onPress={() => {}} text="Fund Wallet" /></Link>
        <Link href="/dashboard/payouts"><Button onPress={() => {}} text="Payout Settings" /></Link>
        <Link href="/dashboard/verify"><Button onPress={() => {}} text="Verify Account" /></Link>
        <Button onPress={handleSignOut} text="Sign Out" />
      </div>
    </div>
  );
}