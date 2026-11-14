import { SignUp } from "@clerk/nextjs"

export function generateStaticParams() {
  return [{ "sign-up": [] }]
}

export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/20 px-4 py-12">
      <div className="space-y-4">
        <SignUp path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/support" />
        <p className="max-w-sm text-center text-sm text-muted-foreground">邮箱可选；未绑定邮箱时，无法通过邮件找回密码。请妥善保管用户名和密码。</p>
      </div>
    </main>
  )
}
