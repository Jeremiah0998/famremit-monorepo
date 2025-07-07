'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase-client';
import { Button } from '@famremit/ui';

type Profile = {
  kyc_tier: number;
  full_name: string;
  date_of_birth: string;
  address_line_1: string;
  city: string;
  country: string;
};

export default function VerifyPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // Form state for Tier 1
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');

  // Form state for Tier 2
  const [document, setDocument] = useState<File | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('kyc_tier, full_name, date_of_birth, address_line_1, city, country')
        .eq('id', user.id)
        .single();
      
      if (error) {
        setMessage(`Error fetching profile: ${error.message}`);
      } else {
        setProfile(data as Profile);
        setFullName(data.full_name || '');
        setDob(data.date_of_birth || '');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleTier1Submit = async () => {
    setLoading(true);
    setMessage('');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, date_of_birth: dob, kyc_tier: 1 })
        .eq('id', user.id);

      if (error) {
        setMessage(`Update failed: ${error.message}`);
      } else {
        setMessage('Profile updated! You are now Tier 1.');
        await fetchProfile(); // Refresh the profile data
      }
    }
    setLoading(false);
  };
  
  const handleTier2Submit = async () => {
    if (!document) {
      setMessage('Please select a document to upload.');
      return;
    }
    setLoading(true);
    setMessage('Uploading document...');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Upload to our secure kyc-documents bucket in a folder named after the user's ID
    const filePath = `${user.id}/${document.name}`;
    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(filePath, document, { upsert: true });

    if (uploadError) {
      setMessage(`Upload failed: ${uploadError.message}`);
      setLoading(false);
      return;
    }
    
    setMessage('Document uploaded. Submitting for verification...');
    // --- THIS IS WHERE YOU WOULD CALL YOUR KYC PARTNER ---
    // For now, we will simulate the check by updating the tier.
    // In a real app, an Edge Function would call Smile Identity/Veriff here.
    setTimeout(async () => {
        const { error: tierError } = await supabase
            .from('profiles')
            .update({ kyc_tier: 2 }) // Simulating successful verification
            .eq('id', user.id);

        if (tierError) {
            setMessage(`Verification submission failed: ${tierError.message}`);
        } else {
            setMessage('Verification successful! You are now Tier 2.');
            await fetchProfile();
        }
        setLoading(false);
    }, 3000); // Simulate a 3-second check
  };

  if (loading) {
    return <p>Loading your verification status...</p>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h2>Verification Center</h2>
      <p>Your current tier: <strong>Tier {profile?.kyc_tier ?? 0}</strong></p>
      
      {profile?.kyc_tier === 0 && (
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
          <h3>Upgrade to Tier 1 (Basic)</h3>
          <p>Complete your basic profile to unlock transfers up to $100.</p>
          <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
          <input type="date" placeholder="Date of Birth" value={dob} onChange={(e) => setDob(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
          <Button text="Submit Tier 1" onPress={handleTier1Submit} />
        </div>
      )}

      {profile?.kyc_tier === 1 && (
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
          <h3>Upgrade to Tier 2 (Full Verification)</h3>
          <p>Upload a government-issued ID to unlock higher limits.</p>
          <input type="file" onChange={(e) => setDocument(e.target.files ? e.target.files[0] : null)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
          <Button text="Upload & Verify" onPress={handleTier2Submit} />
        </div>
      )}

      {profile && profile.kyc_tier >= 2 && (
        <div style={{ border: '1px solid #2ECC71', padding: '20px', borderRadius: '8px', backgroundColor: '#e8f8f0' }}>
          <h3>✅ You are fully verified!</h3>
          <p>You have access to all features and the highest transaction limits.</p>
        </div>
      )}
      
      {message && <p style={{ marginTop: '20px', textAlign: 'center' }}>{message}</p>}
    </div>
  );
}