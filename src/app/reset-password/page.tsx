import { cookies } from "next/headers";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage() {
  const recoverySession = (await cookies()).get("homeplanner-recovery")?.value === "1";
  return <ResetPasswordForm recoverySession={recoverySession} />;
}
