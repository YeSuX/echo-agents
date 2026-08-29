import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/20 px-4 py-12">
      <SignIn path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/support" />
    </main>
  )
}
