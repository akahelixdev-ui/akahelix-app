-- Roles ------------------------------------------------------------------
create type public.app_role as enum ('admin', 'client');
create type public.inquiry_status as enum ('new', 'in_progress', 'booked', 'closed');
create type public.project_status as enum ('active', 'on_hold', 'complete');
create type public.phase_status as enum ('not_started', 'in_progress', 'awaiting_signoff', 'signed_off');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy "Admins read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Profiles ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  organization text,
  job_title text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "Admins read all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Everyone signed in can see the team" on public.profiles
  for select to authenticated using (public.has_role(id, 'admin'));
create policy "Update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins update profiles" on public.profiles
  for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Inquiries (contact form) ----------------------------------------------
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  organization text,
  interests text[] not null default '{}',
  message text not null,
  status public.inquiry_status not null default 'new',
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant insert on public.inquiries to anon;
grant select, insert, update, delete on public.inquiries to authenticated;
grant all on public.inquiries to service_role;
alter table public.inquiries enable row level security;

create policy "Anyone can send an inquiry" on public.inquiries
  for insert to anon, authenticated
  with check (
    status = 'new' and notes is null and is_sample = false
    and char_length(name) between 1 and 200
    and char_length(email) between 3 and 320
    and char_length(message) between 1 and 5000
    and coalesce(char_length(organization), 0) <= 300
    and coalesce(array_length(interests, 1), 0) <= 12
  );
create policy "Admins read inquiries" on public.inquiries
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update inquiries" on public.inquiries
  for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete inquiries" on public.inquiries
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger inquiries_touch before update on public.inquiries
  for each row execute function public.touch_updated_at();

-- Assistant conversations ------------------------------------------------
create table public.chat_conversations (
  id uuid primary key,
  first_question text not null default '',
  question_count integer not null default 0,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, delete on public.chat_conversations to authenticated;
grant all on public.chat_conversations to service_role;
alter table public.chat_conversations enable row level security;

create policy "Admins read conversations" on public.chat_conversations
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete conversations" on public.chat_conversations
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Projects ---------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lab_name text not null,
  summary text,
  client_id uuid references public.profiles(id) on delete set null,
  status public.project_status not null default 'active',
  start_date date,
  target_date date,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;

create policy "Admins manage projects" on public.projects
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Clients read own projects" on public.projects
  for select to authenticated using (client_id = auth.uid());

create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

create policy "Clients see profiles of nobody else" on public.profiles
  for select to authenticated using (false);

create table public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_no smallint not null check (phase_no between 1 and 5),
  title text not null,
  status public.phase_status not null default 'not_started',
  notes text,
  due_date date,
  signed_off_at timestamptz,
  signed_off_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (project_id, phase_no)
);
grant select, insert, update, delete on public.project_phases to authenticated;
grant all on public.project_phases to service_role;
alter table public.project_phases enable row level security;

create policy "Admins manage phases" on public.project_phases
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Clients read own phases" on public.project_phases
  for select to authenticated using (
    exists (select 1 from public.projects p where p.id = project_id and p.client_id = auth.uid())
  );

create trigger phases_touch before update on public.project_phases
  for each row execute function public.touch_updated_at();

create table public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default '',
  kind text not null default 'note' check (kind in ('note', 'signoff', 'status')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.project_updates to authenticated;
grant all on public.project_updates to service_role;
alter table public.project_updates enable row level security;

create policy "Admins manage updates" on public.project_updates
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Clients read own project updates" on public.project_updates
  for select to authenticated using (
    exists (select 1 from public.projects p where p.id = project_id and p.client_id = auth.uid())
  );
create policy "Clients post notes on own projects" on public.project_updates
  for insert to authenticated with check (
    author_id = auth.uid() and kind = 'note'
    and exists (select 1 from public.projects p where p.id = project_id and p.client_id = auth.uid())
  );

-- New projects always get the five standard phases.
create or replace function public.create_project_phases()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_phases (project_id, phase_no, title, status)
  values
    (new.id, 1, 'Assess', 'in_progress'),
    (new.id, 2, 'Design', 'not_started'),
    (new.id, 3, 'Validate', 'not_started'),
    (new.id, 4, 'Prepare', 'not_started'),
    (new.id, 5, 'Launch', 'not_started');
  return new;
end;
$$;

create trigger projects_create_phases after insert on public.projects
  for each row execute function public.create_project_phases();

-- A client signs off a phase that is waiting for them.
create or replace function public.sign_off_phase(_phase_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  _project uuid;
  _no smallint;
  _title text;
  _name text;
begin
  select ph.project_id, ph.phase_no, ph.title into _project, _no, _title
  from public.project_phases ph
  join public.projects p on p.id = ph.project_id
  where ph.id = _phase_id
    and ph.status = 'awaiting_signoff'
    and (p.client_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

  if _project is null then
    raise exception 'This phase is not waiting for your sign-off.';
  end if;

  update public.project_phases
    set status = 'signed_off', signed_off_at = now(), signed_off_by = auth.uid()
    where id = _phase_id;

  update public.project_phases
    set status = 'in_progress'
    where project_id = _project and phase_no = _no + 1 and status = 'not_started';

  if _no = 5 then
    update public.projects set status = 'complete' where id = _project;
  end if;

  select coalesce(nullif(full_name, ''), email) into _name from public.profiles where id = auth.uid();
  insert into public.project_updates (project_id, author_id, author_name, kind, body)
  values (_project, auth.uid(), coalesce(_name, ''), 'signoff', 'Signed off phase ' || lpad(_no::text, 2, '0') || ' · ' || _title || '.');
end;
$$;

revoke execute on function public.sign_off_phase(uuid) from public, anon;
grant execute on function public.sign_off_phase(uuid) to authenticated;
