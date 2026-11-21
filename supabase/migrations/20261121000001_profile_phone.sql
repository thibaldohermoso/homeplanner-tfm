-- HomePlanner — Teléfono opcional del perfil.
-- Idempotente para instalaciones locales y remotos donde ya se aplicó manualmente.
alter table public.profiles
  add column if not exists phone text
  check (phone is null or char_length(phone) between 6 and 20);
