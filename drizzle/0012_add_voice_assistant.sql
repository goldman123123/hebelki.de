-- Add voice assistant support to businesses table
-- Stores Twilio phone number for inbound call → business mapping
ALTER TABLE "businesses" ADD COLUMN "twilio_phone_number" text;
