"use client";
import Link from 'next/link';

export default function Page(): JSX.Element {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Welcome to FamRemit</h1>
      <p>The best way to send money between Nigeria and Ghana.</p>
      <Link href="/login">
        <button style={{
          backgroundColor: '#00A859',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px'
        }}>
          Get Started
        </button>
      </Link>
    </div>
  );
}