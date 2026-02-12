-- Add Stripe billing columns to businesses table
ALTER TABLE businesses ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE businesses ADD COLUMN stripe_subscription_id TEXT;

-- Index for looking up business by Stripe customer ID (webhook handler)
CREATE UNIQUE INDEX businesses_stripe_customer_id_idx ON businesses(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
