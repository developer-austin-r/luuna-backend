-- Remove Dashboard and Settings permission access for the Billing User
DELETE FROM "role_permissions"
WHERE "role_id" = '00000000-0000-0000-0000-000000000002'
  AND "permission_id" IN (
    '10000000-0000-0000-0000-000000000001', -- dashboard.view
    '10000000-0000-0000-0000-000000000021', -- settings.view
    '10000000-0000-0000-0000-000000000022'  -- settings.update
  );