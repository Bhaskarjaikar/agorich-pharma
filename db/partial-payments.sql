-- Run this in Supabase SQL editor

-- 1) Per-invoice payments table
create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method text check (method in ('CASH','UPI','BANK','OTHER')) default 'CASH',
  reference_no text,
  note text,
  received_at timestamptz not null default now(),
  received_by uuid references public.profiles(id)
);

create index if not exists idx_invoice_payments_invoice_id on public.invoice_payments(invoice_id);

-- 2) Overview with totals
create or replace view public.invoice_with_totals as
select
  i.*,
  coalesce(sum(p.amount), 0) as paid_amount,
  (i.grand_total - coalesce(sum(p.amount),0)) as balance_due
from public.invoices i
left join public.invoice_payments p on p.invoice_id = i.id
group by i.id;

