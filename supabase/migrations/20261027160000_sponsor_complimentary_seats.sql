-- Complimentary seats for sponsor levels (for example, 2 VIP seats for a
-- Founding Partner). The seats are held with the sponsor slot, before the
-- payment is captured, and count toward the event's capacity like any seat.

alter table public.donations
  add column if not exists hold_note text check (hold_note is null or char_length(hold_note) <= 500);

alter table public.event_rsvps
  add column if not exists sponsor_tier_name text check (sponsor_tier_name is null or char_length(sponsor_tier_name) <= 120);

-- Same as before, plus: if the level includes seats ("seats" in the tier),
-- hold them on the sponsor's RSVP. A full event never blocks a sponsorship:
-- the seats are skipped and hold_note tells staff.
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
  v_seats integer;
  v_existing public.event_rsvps%rowtype;
  v_has_existing boolean := false;
  v_headcount integer;
  v_new_guests integer;
  v_row public.event_rsvps%rowtype;
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

  v_seats := least(greatest(coalesce(nullif(v_tier->>'seats', '')::integer, 0), 0), 20);

  if v_seats = 0 then
    update public.donations set seats_claimed_at = now(), quantity = null, hold_note = null where id = v_pay.id;
    return;
  end if;

  select * into v_existing from public.event_rsvps
  where event_id = v_event.id and email = lower(trim(v_pay.donor_email))
  for update;
  v_has_existing := found;

  if v_has_existing and exists (
    select 1 from public.donations
    where rsvp_id = v_existing.id and id <> v_pay.id and status <> 'completed' and seats_claimed_at is not null
  ) then
    raise exception 'checkout_in_progress';
  end if;

  select coalesce(sum(1 + guest_count), 0) into v_headcount
  from public.event_rsvps
  where event_id = v_event.id and status = 'confirmed';

  if v_has_existing and v_existing.status = 'confirmed' then
    v_new_guests := v_existing.guest_count + v_seats;
  else
    v_new_guests := v_seats - 1;
  end if;

  if (v_event.capacity is not null and v_headcount + v_seats > v_event.capacity) or v_new_guests > 19 then
    update public.donations
      set seats_claimed_at = now(),
          quantity = null,
          hold_note = format('Sponsor paid for a level with %s seat(s), but the seats could not be reserved (event full). Seat them manually.', v_seats)
      where id = v_pay.id;
    return;
  end if;

  if v_has_existing then
    update public.event_rsvps
      set status = 'confirmed',
          guest_count = v_new_guests,
          full_name = coalesce(nullif(trim(v_pay.donor_name), ''), full_name),
          phone = coalesce(v_pay.phone, phone),
          sponsor_tier_name = v_tier->>'name'
      where id = v_existing.id
      returning * into v_row;

    update public.donations
      set seats_claimed_at = now(),
          quantity = v_seats,
          hold_note = null,
          rsvp_id = v_row.id,
          rsvp_was_created = false,
          rsvp_prev_status = v_existing.status,
          rsvp_prev_guest_count = v_existing.guest_count
      where id = v_pay.id;
  else
    insert into public.event_rsvps (
      event_id, full_name, email, phone, guest_count, status,
      ip_hash, user_agent, turnstile_verified, source_page, sponsor_tier_name
    ) values (
      v_event.id, coalesce(nullif(trim(v_pay.donor_name), ''), 'Sponsor'), lower(trim(v_pay.donor_email)),
      v_pay.phone, v_seats - 1, 'confirmed',
      v_pay.ip_hash, v_pay.user_agent, true, 'events/' || v_event.slug || '#sponsor', v_tier->>'name'
    )
    returning * into v_row;

    update public.donations
      set seats_claimed_at = now(),
          quantity = v_seats,
          hold_note = null,
          rsvp_id = v_row.id,
          rsvp_was_created = true
      where id = v_pay.id;
  end if;
end;
$function$;

-- Same as before, but sponsor seats are released too. Only ticket payments
-- ever added to paid_cents, so only they subtract from it.
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
  v_paid integer;
begin
  select * into v_pay from public.donations where id = p_payment_id for update;
  if not found or v_pay.purpose = 'donation' or v_pay.seats_claimed_at is null or v_pay.status = 'completed' then
    return;
  end if;

  v_paid := case when v_pay.purpose = 'ticket' then v_pay.amount_cents else 0 end;

  if v_pay.rsvp_id is not null and coalesce(v_pay.quantity, 0) > 0 then
    perform 1 from public.events where id = v_pay.event_id for update;
    select * into v_rsvp from public.event_rsvps where id = v_pay.rsvp_id for update;
    if found then
      -- Take back exactly this payment's seats. Seats added by other
      -- purchases with the same email stay put.
      v_remaining := (1 + v_rsvp.guest_count) - v_pay.quantity;
      if v_remaining > 0 then
        update public.event_rsvps
          set guest_count = v_remaining - 1,
              paid_cents = greatest(paid_cents - v_paid, 0)
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
              paid_cents = greatest(paid_cents - v_paid, 0)
          where id = v_rsvp.id;
      end if;
    end if;
  end if;

  update public.donations
    set seats_claimed_at = null,
        rsvp_id = null,
        rsvp_was_created = null,
        rsvp_prev_status = null,
        rsvp_prev_guest_count = null,
        hold_note = null,
        quantity = case when purpose = 'sponsorship' then null else quantity end
    where id = v_pay.id;
end;
$function$;

revoke all on function public.claim_sponsor_slot(uuid) from public, anon, authenticated;
revoke all on function public.release_checkout_hold(uuid) from public, anon, authenticated;
grant execute on function public.claim_sponsor_slot(uuid) to service_role;
grant execute on function public.release_checkout_hold(uuid) to service_role;
