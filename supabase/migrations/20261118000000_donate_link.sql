-- Donation button: the Stripe Payment Link lives here so it can be set or
-- cleared from /admin → Links. The buttons stay hidden while url is empty.
insert into public.official_links (key, label, url, description, category, sort_order)
values ('donate', 'Donate (Stripe Payment Link)', '', 'Shown as the “Donate to keep it free” buttons. Must start with https://buy.stripe.com/', 'general', 999)
on conflict (key) do nothing;
