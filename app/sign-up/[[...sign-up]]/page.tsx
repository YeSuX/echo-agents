import { SignUp } from "@clerk/nextjs"

export function generateStaticParams() {
  return [{ "sign-up": [] }]
}

export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/20 px-4 py-12">
      <SignUp path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/support" />
    </main>
  )
}
