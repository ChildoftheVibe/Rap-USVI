-- Optional short tagline per event (for example "Time to Heal").
-- The site shows it in a bold italic display face on the event page,
-- event cards, the home page carousel and the event pop-up.
alter table public.events
  add column if not exists tagline text;

alter table public.events
  drop constraint if exists events_tagline_length;

alter table public.events
  add constraint events_tagline_length check (tagline is null or char_length(tagline) <= 80);
