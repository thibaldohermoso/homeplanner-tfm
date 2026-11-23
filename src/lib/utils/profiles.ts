export type Profile = {
  id?: string;
  display_name: string;
  avatar_url?: string | null;
  phone?: string | null;
};

export type ProfileRelation = Profile | Profile[] | null | undefined;

function firstProfile(profiles: ProfileRelation) {
  return Array.isArray(profiles) ? profiles[0] : profiles;
}

export function getProfileName(profiles: ProfileRelation, fallback = "Sin nombre") {
  const name = firstProfile(profiles)?.display_name?.trim();
  return name || fallback;
}

export function getProfileInitial(profiles: ProfileRelation, fallback = "Sin nombre") {
  return getProfileName(profiles, fallback).trim().charAt(0).toUpperCase();
}
