drop policy if exists "Clients see profiles of nobody else" on public.profiles;

insert into public.inquiries (name, email, organization, interests, message, status, is_sample, created_at) values
  ('Sarah Okafor', 'sarah.okafor@example.org', 'Riverside Health Network', array['Bring send-outs in-house', 'One test or platform'],
   'We send roughly 3,000 carrier screens a year to a reference lab. We would like to understand what it takes to run an NGS carrier panel ourselves and what a realistic timeline looks like.',
   'new', true, now() - interval '2 hours'),
  ('Dr. Marco Bellini', 'm.bellini@example.org', 'Hudson Valley Cancer Center', array['One test or platform'],
   'Our pathology group wants to add a solid tumour NGS panel. We have the space but no molecular staff yet. Can you help with validation and the New York State submission?',
   'in_progress', true, now() - interval '3 days'),
  ('Aisha Rahman', 'aisha.rahman@example.org', 'Dhaka Genome Diagnostics', array['Lab outside the US', 'New laboratory'],
   'We are planning a new cytogenetics and molecular laboratory in Dhaka and want it built to CAP standards from the start.',
   'booked', true, now() - interval '9 days');

insert into public.projects (name, lab_name, summary, status, start_date, target_date, is_sample) values
  ('NGS carrier screening in-house', 'Riverside Health Network', 'Bring expanded carrier screening in-house on a short-read NGS platform, with a New York State LDT submission.', 'active', current_date - 60, current_date + 180, true),
  ('Cytogenetics laboratory build', 'Dhaka Genome Diagnostics', 'Design and stand up a karyotype and FISH laboratory built to CAP standards.', 'active', current_date - 150, current_date + 90, true);

update public.project_phases ph set status = 'signed_off', signed_off_at = now() - interval '30 days'
  from public.projects p where p.id = ph.project_id and p.lab_name = 'Riverside Health Network' and ph.phase_no = 1;
update public.project_phases ph set status = 'awaiting_signoff', notes = 'Floor plan v3 and the instrument list are ready for your review.'
  from public.projects p where p.id = ph.project_id and p.lab_name = 'Riverside Health Network' and ph.phase_no = 2;

update public.project_phases ph set status = 'signed_off', signed_off_at = now() - interval '100 days'
  from public.projects p where p.id = ph.project_id and p.lab_name = 'Dhaka Genome Diagnostics' and ph.phase_no in (1, 2);
update public.project_phases ph set status = 'signed_off', signed_off_at = now() - interval '20 days'
  from public.projects p where p.id = ph.project_id and p.lab_name = 'Dhaka Genome Diagnostics' and ph.phase_no = 3;
update public.project_phases ph set status = 'in_progress', notes = 'Mock CAP inspection booked. Quality manual in final review.'
  from public.projects p where p.id = ph.project_id and p.lab_name = 'Dhaka Genome Diagnostics' and ph.phase_no = 4;

insert into public.project_updates (project_id, author_name, kind, body, created_at)
select id, 'AKAHELIX', 'note', 'Scope, volumes and budget agreed. Moving to design.', now() - interval '30 days'
from public.projects where lab_name = 'Riverside Health Network';
insert into public.project_updates (project_id, author_name, kind, body, created_at)
select id, 'AKAHELIX', 'note', 'Floor plan v3 uploaded with the pre- and post-PCR separation you asked for. Ready for sign-off.', now() - interval '1 day'
from public.projects where lab_name = 'Riverside Health Network';
insert into public.project_updates (project_id, author_name, kind, body, created_at)
select id, 'AKAHELIX', 'note', 'Validation reports for karyotype and FISH accepted. Quality system work has started.', now() - interval '20 days'
from public.projects where lab_name = 'Dhaka Genome Diagnostics';
