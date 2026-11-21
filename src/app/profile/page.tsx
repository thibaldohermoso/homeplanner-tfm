import { ProfileBoard } from "@/components/profile-board";

export default function ProfilePage() {
  return <ProfileBoard canDeleteAccount={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)} />;
}
