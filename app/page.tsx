import { LandingContactConsent } from "@/components/landing-contact-consent"

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <main className="flex min-h-screen flex-col items-center pt-6">
        <LandingContactConsent />
      </main>
    </div>
  )
}
