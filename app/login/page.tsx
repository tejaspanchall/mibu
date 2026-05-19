import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const c = await cookies();
  const cookie = c.get(AUTH_COOKIE)?.value;
  const expected = process.env.APP_PASSWORD;
  const { from } = await searchParams;
  const dest = from && from.startsWith("/") ? from : "/investments";

  if (expected && cookie === expected) {
    redirect(dest);
  }

  return <LoginForm redirectTo={dest} />;
}
