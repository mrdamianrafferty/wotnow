-- Create table for user-added gardening tasks
create table if not exists public.grow_user_tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    task_id text not null, -- The ID of the task from the task generator
    title text,
    description text,
    task_type text default 'maintenance',
    plant_slug text,
    scheduled_for date,
    notes text,
    status text default 'pending' check (status in ('pending', 'completed', 'dismissed')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Create index for efficient user queries
create index if not exists grow_user_tasks_user_id_idx
    on public.grow_user_tasks (user_id, created_at desc);

create index if not exists grow_user_tasks_status_idx
    on public.grow_user_tasks (user_id, status);

-- Enable RLS
alter table public.grow_user_tasks enable row level security;

-- Users can only access their own tasks
create policy "Users can view own tasks"
    on public.grow_user_tasks for select
    using (auth.uid() = user_id);

create policy "Users can insert own tasks"
    on public.grow_user_tasks for insert
    with check (auth.uid() = user_id);

create policy "Users can update own tasks"
    on public.grow_user_tasks for update
    using (auth.uid() = user_id);

create policy "Users can delete own tasks"
    on public.grow_user_tasks for delete
    using (auth.uid() = user_id);

-- Add updated_at trigger
drop trigger if exists grow_user_tasks_set_updated_at on public.grow_user_tasks;
create trigger grow_user_tasks_set_updated_at
before update on public.grow_user_tasks
for each row execute function public.set_updated_at();
