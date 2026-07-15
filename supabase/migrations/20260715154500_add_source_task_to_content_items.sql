alter table public.content_items
add column if not exists source_task_id uuid references public.tasks(id) on delete set null;

create index if not exists content_items_source_task_id_idx
on public.content_items(source_task_id);
