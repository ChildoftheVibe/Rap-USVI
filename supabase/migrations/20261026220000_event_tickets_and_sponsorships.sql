-- Paid event tickets and sponsorships, reusing the existing PayPal donations pipeline.
-- Every column is additive with a safe default, so the currently deployed code keeps working.

alter table public.events
  add column if not exists ticket_price_cents integer
    check (ticket_price_cents is null or ticket_price_cents between 500 and 2500000),
  add column if not exists ticket_max_per_order integer not null default 8
    check (ticket_max_per_order between 1 and 20),
  add column if not exists sponsor_tiers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(sponsor_tiers) = 'array' and jsonb_array_length(sponsor_tiers) <= 10);

alter table public.donations
  add column if not exists purpose text not null default 'donation'
    check (purpose in ('donation', 'ticket', 'sponsorship')),
  add column if not exists event_id uuid references public.events(id) on delete set null,
  add column if not exists quantity integer check (quantity is null or quantity between 1 and 20),
  add column if not exists sponsor_tier_key text check (sponsor_tier_key is null or char_length(sponsor_tier_key) <= 60),
  add column if not exists sponsor_tier_name text check (sponsor_tier_name is null or char_length(sponsor_tier_name) <= 120),
  add column if not exists organization text check (organization is null or char_length(organization) <= 200),
  add column if not exists phone text check (phone is null or char_length(phone) <= 40),
  add column if not exists rsvp_id uuid references public.event_rsvps(id) on delete set null,
  add column if not exists seats_claimed_at timestamptz,
  add column if not exists rsvp_was_created boolean,
  add column if not exists rsvp_prev_status text,
  add column if not exists rsvp_prev_guest_count integer,
  add column if not exists attention text check (attention is null or char_length(attention) <= 500);

create index if not exists donations_event_purpose_status_idx
  on public.donations (event_id, purpose, status);

alter table public.event_rsvps
  add column if not exists paid_cents integer not null default 0 check (paid_cents >= 0);

-- Free RSVPs are refused for paid events, so a direct POST to the RSVP API
-- can't skip checkout. Otherwise identical to the previous definition.
create or replace function public.rsvp_for_event(
  p_event_id uuid, p_full_name text, p_email text, p_phone text, p_guest_count integer,
  p_ip_hash text, p_user_agent text, p_turnstile_verified boolean, p_source_page text
)
returns public.event_rsvps
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event public.events%rowtype;
  v_email text := lower(trim(p_email));
  v_guest_count integer := greatest(coalesce(p_guest_count, 0), 0);
  v_party_size integer := 1 + v_guest_count;
  v_existing_id uuid;
  v_confirmed_headcount integer;
  v_free integer;
  v_status text;
  v_row public.event_rsvps%rowtype;
begin
  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'event_not_found';
  end if;
  if v_event.status <> 'published' then
    raise exception 'event_not_open';
  end if;
  if not v_event.rsvp_enabled then
    raise exception 'rsvp_disabled';
  end if;
  if v_event.end_at < now() then
    raise exception 'event_ended';
  end if;
  if v_event.ticket_price_cents is not null then
    raise exception 'ticket_required';
  end if;

  select id into v_existing_id from public.event_rsvps
  where event_id = p_event_id and email = v_email;

  select coalesce(sum(1 + guest_count), 0) into v_confirmed_headcount
  from public.event_rsvps
  where event_id = p_event_id and status = 'confirmed'
    and (v_existing_id is null or id <> v_existing_id);

  if v_event.capacity is null then
    v_free := v_party_size;
  else
    v_free := v_event.capacity - v_confirmed_headcount;
  end if;

  if v_party_size <= v_free then
    v_status := 'confirmed';
  elsif v_event.waitlist_enabled then
    v_status := 'waitlisted';
  else
    raise exception 'event_full';
  end if;

  insert into public.event_rsvps as er (
    event_id, full_name, email, phone, guest_count, status,
    ip_hash, user_agent, turnstile_verified, source_page
  ) values (
    p_event_id, p_full_name, v_email, p_phone, v_guest_count, v_status,
    p_ip_hash, p_user_agent, p_turnstile_verified, p_source_page
  )
  on conflict (event_id, email) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    guest_count = excluded.guest_count,
    status = excluded.status,
    ip_hash = excluded.ip_hash,
    user_agent = excluded.user_agent,
    turnstile_verified = excluded.turnstile_verified,
    notified_at = case when er.status <> excluded.status then null else er.notified_at end
  returning * into v_row;

  return v_row;
end;
$function$;

-- Holds confirmed seats for a pending ticket payment. Called after PayPal says
-- the buyer approved the order and right before the capture so a buyer is never charged for seats that don't exist.
-- Locks the event row exactly like rsvp_for_event so concurrent buyers near
-- capacity are serialized. Idempotent: a retried capture returns the same RSVP.
create or replace function public.claim_ticket_seats(p_payment_id uuid)
returns public.event_rsvps
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  v_pay public.donations%rowtype;
  v_event public.events%rowtype;
  v_existing public.event_rsvps%rowtype;
  v_has_existing boolean := false;
  v_headcount integer;
  v_new_guests integer;
  v_row public.event_rsvps%rowtype;
begin
  select * into v_pay from public.donations where id = p_payment_id for update;
  if not found or v_pay.purpose <> 'ticket' or v_pay.event_id is null or v_pay.quantity is null then
    raise exception 'payment_not_found';
  end if;

  if v_pay.seats_claimed_at is not null then
    select * into v_row from public.event_rsvps where id = v_pay.rsvp_id;
    if found then
      return v_row;
    end if;
    raise exception 'payment_not_found';
  end if;

  if v_pay.status <> 'pending' then
    raise exception 'payment_not_pending';
  end if;

  select * into v_event from public.events where id = v_pay.event_id for update;
  if not found then
    raise exception 'event_not_found';
  end if;
  if v_event.status <> 'published' or v_event.ticket_price_cents is null then
    raise exception 'event_not_open';
  end if;
  if not v_event.rsvp_enabled then
    raise exception 'rsvp_disabled';
  end if;
  if v_event.end_at < now() then
    raise exception 'event_ended';
  end if;

  select * into v_existing from public.event_rsvps
  where event_id = v_event.id and email = lower(trim(v_pay.donor_email))
  for update;
  v_has_existing := found;

  select coalesce(sum(1 + guest_count), 0) into v_headcount
  from public.event_rsvps
  where event_id = v_event.id and status = 'confirmed';

  if v_event.capacity is not null and v_headcount + v_pay.quantity > v_event.capacity then
    raise exception 'sold_out';
  end if;

  if v_has_existing and exists (
    select 1 from public.donations
    where rsvp_id = v_existing.id and id <> v_pay.id and status = 'pending' and seats_claimed_at is not null
  ) then
    -- One unfinished checkout per RSVP at a time, so holds always unwind in order.
    raise exception 'checkout_in_progress';
  end if;

  if v_has_existing then
    if v_existing.status = 'confirmed' then
      v_new_guests := v_existing.guest_count + v_pay.quantity;
    else
      v_new_guests := v_pay.quantity - 1;
    end if;
    if v_new_guests > 19 then
      raise exception 'party_too_large';
    end if;

    update public.event_rsvps
      set status = 'confirmed',
          guest_count = v_new_guests,
          full_name = coalesce(nullif(trim(v_pay.donor_name), ''), full_name),
          phone = coalesce(v_pay.phone, phone),
          paid_cents = paid_cents + v_pay.amount_cents
      where id = v_existing.id
      returning * into v_row;

    update public.donations
      set rsvp_id = v_row.id,
          seats_claimed_at = now(),
          rsvp_was_created = false,
          rsvp_prev_status = v_existing.status,
          rsvp_prev_guest_count = v_existing.guest_count
      where id = v_pay.id;
  else
    insert into public.event_rsvps (
      event_id, full_name, email, phone, guest_count, status,
      ip_hash, user_agent, turnstile_verified, source_page, paid_cents
    ) values (
      v_event.id, coalesce(nullif(trim(v_pay.donor_name), ''), 'Guest'), lower(trim(v_pay.donor_email)),
      v_pay.phone, v_pay.quantity - 1, 'confirmed',
      v_pay.ip_hash, v_pay.user_agent, true, 'events/' || v_event.slug || '#tickets', v_pay.amount_cents
    )
    returning * into v_row;

    update public.donations
      set rsvp_id = v_row.id,
          seats_claimed_at = now(),
          rsvp_was_created = true
      where id = v_pay.id;
  end if;

  return v_row;
end;
$function$;

-- Undoes claim_ticket_seats / claim_sponsor_slot when PayPal definitely did not
-- take the money, so the seats or sponsor slot go back on sale. Never touches a
-- completed payment.
create or replace function public.release_checkout_hold(p_payment_id uuid)
returns void
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  v_pay public.donations%rowtype;
  v_rsvp public.event_rsvps%rowtype;
  v_remaining integer;
begin
  select * into v_pay from public.donations where id = p_payment_id for update;
  if not found or v_pay.purpose = 'donation' or v_pay.seats_claimed_at is null or v_pay.status = 'completed' then
    return;
  end if;

  if v_pay.purpose = 'ticket' and v_pay.rsvp_id is not null then
    perform 1 from public.events where id = v_pay.event_id for update;
    select * into v_rsvp from public.event_rsvps where id = v_pay.rsvp_id for update;
    if found then
      -- Take back exactly this payment's seats. Seats added by other
      -- purchases with the same email stay put.
      v_remaining := (1 + v_rsvp.guest_count) - v_pay.quantity;
      if v_remaining > 0 then
        update public.event_rsvps
          set guest_count = v_remaining - 1,
              paid_cents = greatest(paid_cents - v_pay.amount_cents, 0)
          where id = v_rsvp.id;
      elsif v_pay.rsvp_was_created and not exists (
        select 1 from public.donations where rsvp_id = v_rsvp.id and id <> v_pay.id
      ) then
        delete from public.event_rsvps where id = v_rsvp.id;
      else
        -- No seats left from this payment: put the RSVP back the way it was
        -- before (for example, cancelled), so a declined card never leaves a free seat.
        update public.event_rsvps
          set status = case when v_pay.rsvp_was_created then 'cancelled'
                            else coalesce(v_pay.rsvp_prev_status, 'cancelled') end,
              guest_count = coalesce(v_pay.rsvp_prev_guest_count, 0),
              paid_cents = greatest(paid_cents - v_pay.amount_cents, 0)
          where id = v_rsvp.id;
      end if;
    end if;
  end if;

  update public.donations
    set seats_claimed_at = null,
        rsvp_id = null,
        rsvp_was_created = null,
        rsvp_prev_status = null,
        rsvp_prev_guest_count = null
    where id = v_pay.id;
end;
$function$;

-- Holds one slot of a limited sponsor level for a pending sponsorship payment,
-- right before capture. Counts completed sponsors plus other in-flight holds
-- under the event lock, so two sponsors can't both buy the last slot.
-- (seats_claimed_at doubles as "hold placed" for sponsorships.)
create or replace function public.claim_sponsor_slot(p_payment_id uuid)
returns void
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  v_pay public.donations%rowtype;
  v_event public.events%rowtype;
  v_tier jsonb;
  v_limit integer;
  v_taken integer;
begin
  select * into v_pay from public.donations where id = p_payment_id for update;
  if not found or v_pay.purpose <> 'sponsorship' or v_pay.event_id is null then
    raise exception 'payment_not_found';
  end if;
  if v_pay.seats_claimed_at is not null then
    return;
  end if;
  if v_pay.status <> 'pending' then
    raise exception 'payment_not_pending';
  end if;

  select * into v_event from public.events where id = v_pay.event_id for update;
  if not found then
    raise exception 'event_not_found';
  end if;
  if v_event.status <> 'published' then
    raise exception 'event_not_open';
  end if;
  if v_event.end_at < now() then
    raise exception 'event_ended';
  end if;

  select t into v_tier from jsonb_array_elements(v_event.sponsor_tiers) t
  where t->>'key' = v_pay.sponsor_tier_key
  limit 1;
  if v_tier is null then
    raise exception 'tier_not_found';
  end if;

  v_limit := nullif(v_tier->>'limit', '')::integer;
  if v_limit is not null then
    select count(*) into v_taken from public.donations
    where event_id = v_event.id and purpose = 'sponsorship' and sponsor_tier_key = v_pay.sponsor_tier_key
      and id <> v_pay.id
      and (status = 'completed' or (status = 'pending' and seats_claimed_at is not null));
    if v_taken >= v_limit then
      raise exception 'sponsor_sold_out';
    end if;
  end if;

  update public.donations set seats_claimed_at = now() where id = v_pay.id;
end;
$function$;

-- Waitlist auto-promotion only makes sense for free events. On a paid event a
-- freed seat goes back on sale instead of to a waitlisted person for free.
-- Otherwise identical to the previous definition.
create or replace function public.fn_promote_waitlist()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_capacity integer;
  v_ticket_price integer;
  v_confirmed_headcount integer;
  v_free integer;
  r record;
begin
  select capacity, ticket_price_cents into v_capacity, v_ticket_price
  from public.events where id = new.event_id for update;

  if v_capacity is null or v_ticket_price is not null then
    return new;
  end if;

  select coalesce(sum(1 + guest_count), 0) into v_confirmed_headcount
  from public.event_rsvps
  where event_id = new.event_id and status = 'confirmed';

  v_free := v_capacity - v_confirmed_headcount;
  if v_free <= 0 then
    return new;
  end if;

  for r in
    select id, guest_count from public.event_rsvps
    where event_id = new.event_id and status = 'waitlisted'
    order by created_at asc
    for update
  loop
    exit when v_free <= 0;
    if (1 + r.guest_count) <= v_free then
      update public.event_rsvps
        set status = 'confirmed', promoted_at = now()
        where id = r.id;
      v_free := v_free - (1 + r.guest_count);
    end if;
  end loop;

  return new;
end;
$function$;

revoke all on function public.claim_ticket_seats(uuid) from public, anon, authenticated;
revoke all on function public.claim_sponsor_slot(uuid) from public, anon, authenticated;
revoke all on function public.release_checkout_hold(uuid) from public, anon, authenticated;
grant execute on function public.claim_ticket_seats(uuid) to service_role;
grant execute on function public.claim_sponsor_slot(uuid) to service_role;
grant execute on function public.release_checkout_hold(uuid) to service_role;
revoke all on function public.rsvp_for_event(uuid, text, text, text, integer, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.rsvp_for_event(uuid, text, text, text, integer, text, text, boolean, text) to service_role;
