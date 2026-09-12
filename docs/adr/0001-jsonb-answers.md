# ADR-0001: JSONB `answers` column instead of a normalized `quote_answers` table

## Status

Accepted

## Context

Quote answers arrive from a config-driven, JSON-Patch-mutated form whose field set varies per
carrier, per portal (agent/customer), and per state (see the Base → Portal → State override
chain in the config bundler). The schema needs to accommodate a growing, carrier-defined field
set without a migration per new field.

Two options were considered:

1. A normalized `quote_answers(quote_id, page_key, field_key, value, updated_at)` table —
   one row per answered field.
2. A single JSONB `answers` column on `quotes`, keyed by `pageKey.fieldKey`.

## Decision

Use a single JSONB `answers` column on `quotes`. `PATCH /quotes/:quoteId` applies RFC 6902
JSON Patch operations directly against that document (validated server-side with zod against
the resolved carrier config before persisting).

## Consequences

- **Gained:** no migration needed when a carrier config adds a field; the JSON Patch
  request/response shape maps directly onto the storage shape; one row per quote keeps reads
  simple (`SELECT answers FROM quotes WHERE id = $1`).
- **Given up:** no per-field SQL querying/indexing (e.g. "find all quotes where
  `driver.dob` is before X") without a `jsonb_path_ops` GIN index and `->>` queries, which is
  more awkward than a normalized column. For this sample's scope (a handful of demo carriers,
  no analytics workload), that tradeoff is acceptable. A normalized table remains the better
  choice if per-field reporting/analytics becomes a real requirement.
