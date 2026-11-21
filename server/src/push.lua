-- Atomic dedup + append + final folio assignment for ONE event.
-- Valkey runs scripts atomically, so no other client can interleave between
-- the dedup check, the XADD and the folio INCR: no double appends, no folio gaps.
--
-- KEYS[1] {er}:seen:<eventId>        dedup marker for the incoming event
-- KEYS[2] {er}:events                global event stream (field "json")
-- KEYS[3] {er}:folio:by-patient      hash patientId -> final folio
-- KEYS[4] {er}:folio:<year>          yearly folio counter
-- KEYS[5] {er}:seen:<folioEventId>   dedup marker for the server-authored folio.assigned
-- The {er} hash tag keeps every key in one cluster hash slot, as Valkey Cluster
-- requires for multi-key scripts.
-- ARGV[1] event JSON
-- ARGV[2] "1" if the event is patient.created, else "0"
-- ARGV[3] patientId
-- ARGV[4] year (from the patient.created event's `at`)
-- ARGV[5] folio.assigned event JSON template; the token __FOLIO__ is replaced
--
-- Returns { accepted (1|0), folio ("" when none was assigned) }.

-- 1. Dedup: XADD alone never deduplicates, so the SET NX marker is the gate.
if not redis.call('SET', KEYS[1], '1', 'NX') then
  return { 0, '' }
end
redis.call('XADD', KEYS[2], '*', 'json', ARGV[1])

if ARGV[2] ~= '1' then
  return { 1, '' }
end

-- 2. Folio: the hash makes assignment idempotent per patient, even if the same
--    patient.created somehow arrives under another event id.
if redis.call('HEXISTS', KEYS[3], ARGV[3]) == 1 then
  return { 1, '' }
end
local n = redis.call('INCR', KEYS[4])
local folio = ARGV[4] .. '-' .. string.format('%04d', n)
redis.call('HSET', KEYS[3], ARGV[3], folio)

local tpl = ARGV[5]
local s, e = string.find(tpl, '__FOLIO__', 1, true)
local json = string.sub(tpl, 1, s - 1) .. folio .. string.sub(tpl, e + 1)
redis.call('SET', KEYS[5], '1')
redis.call('XADD', KEYS[2], '*', 'json', json)
return { 1, folio }
