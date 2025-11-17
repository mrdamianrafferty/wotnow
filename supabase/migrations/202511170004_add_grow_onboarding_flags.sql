-- Add Grow Daisy onboarding completion flags to user profiles
-- November 17, 2025

alter table public.profiles
  add column if not exists grow_onboarding_completed boolean not null default false;

alter table public.profiles
  add column if not exists grow_onboarding_completed_at timestamptz;
