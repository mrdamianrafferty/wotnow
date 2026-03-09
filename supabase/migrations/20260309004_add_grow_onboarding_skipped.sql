-- Add grow_onboarding_skipped flag to distinguish skipped vs completed onboarding
alter table public.profiles
  add column if not exists grow_onboarding_skipped boolean not null default false;
