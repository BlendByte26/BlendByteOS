drop policy if exists "Public Invest2030 can create linked tasks" on public.tasks;

update public.tasks
set status = 'in_progress'::task_status
where status = 'todo'::task_status;

alter table public.tasks
alter column status drop default;

alter type task_status rename to task_status_old;

create type task_status as enum ('pending', 'in_progress', 'done', 'archived');

alter table public.tasks
alter column status type task_status
using case
  when status::text = 'todo' then 'in_progress'
  else status::text
end::task_status;

alter table public.tasks
alter column status set default 'pending'::task_status;

drop type task_status_old;

create policy "Public Invest2030 can create linked tasks"
on public.tasks for insert
to anon
with check (
  title like '[Invest2030] %'
  and type = 'operations'
  and status = 'pending'
  and (assignee_name is null or assignee_name = 'Sofia')
);
