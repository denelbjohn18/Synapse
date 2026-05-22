import { auth } from '@clerk/nextjs/server';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect('/home');

  return (
    <main className="landing">
      <div className="landing-card">
        <h1 className="landing-title">Synapse</h1>
        <p className="landing-subtitle">
          Ask anything. Get a complete study package — explanations, images, videos, and one
          surprising fact. All on one canvas.
        </p>
        <div className="landing-actions">
          <SignInButton mode="modal">
            <button className="landing-btn landing-btn--secondary">Sign in</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="landing-btn landing-btn--primary">Get started</button>
          </SignUpButton>
        </div>
      </div>
    </main>
  );
}
