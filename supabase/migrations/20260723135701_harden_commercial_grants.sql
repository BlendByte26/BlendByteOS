revoke all on public.commercial_services from anon, authenticated;
revoke all on public.commercial_opportunities from anon, authenticated;
revoke all on public.commercial_quotes from anon, authenticated;
revoke all on public.commercial_quote_items from anon, authenticated;

grant select, insert, update, delete on public.commercial_services to authenticated;
grant select, insert, update, delete on public.commercial_opportunities to authenticated;
grant select, insert, update, delete on public.commercial_quotes to authenticated;
grant select, insert, update, delete on public.commercial_quote_items to authenticated;
