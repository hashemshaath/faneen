-- BRANDS-GOVERNANCE-2 Phase B
-- Extend the shared service_request_status enum so brand_addition_requests
-- can carry the in_review / needs_more_info workflow states required by the
-- admin review queue. Other consumers of the enum (service requests) keep
-- using only the existing values they recognise.
ALTER TYPE public.service_request_status ADD VALUE IF NOT EXISTS 'in_review';
ALTER TYPE public.service_request_status ADD VALUE IF NOT EXISTS 'needs_more_info';
