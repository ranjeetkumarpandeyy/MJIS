-- MJIS: Last-admin protection + secure self-demotion to employee
--
-- This migration enforces the rule at the database level:
-- an admin cannot be removed/demoted when that would leave zero admins.
--
-- It also adds a secure RPC that lets the currently logged-in user
-- demote themselves to employee and removes elevated app roles.

-- 1) Global protection against removing the last admin.
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_admins integer;
BEGIN
  -- Only relevant when an existing admin role is being removed or changed.
  IF TG_OP = 'DELETE' AND OLD.role = 'admin' THEN
    -- Serialize admin demotions/deletions so two admins cannot
    -- simultaneously become the last admin.
    PERFORM pg_advisory_xact_lock(hashtext('mjis:last-admin'));

    SELECT count(*)
      INTO remaining_admins
      FROM public.user_roles
     WHERE role = 'admin'
       AND id <> OLD.id;

    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last administrator. Another administrator must exist first.'
        USING ERRCODE = 'P0001';
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.role = 'admin'
     AND NEW.role <> 'admin' THEN

    PERFORM pg_advisory_xact_lock(hashtext('mjis:last-admin'));

    SELECT count(*)
      INTO remaining_admins
      FROM public.user_roles
     WHERE role = 'admin'
       AND id <> OLD.id;

    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last administrator. Another administrator must exist first.'
        USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_removal
  ON public.user_roles;

CREATE TRIGGER trg_prevent_last_admin_removal
BEFORE DELETE OR UPDATE OF role
ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_last_admin_removal();


-- 2) Secure self-demotion RPC.
--
-- The caller can ONLY change their own role.
-- Elevated roles are removed and employee is ensured.
-- The trigger above guarantees another admin remains.
CREATE OR REPLACE FUNCTION public.demote_myself_to_employee()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_admin_count integer;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Serialize the critical section.
  PERFORM pg_advisory_xact_lock(hashtext('mjis:last-admin'));

  SELECT count(*)
    INTO current_admin_count
    FROM public.user_roles
   WHERE role = 'admin';

  -- Not an admin: do not silently change roles.
  IF NOT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = current_user_id
       AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only an administrator can use self-demotion.'
      USING ERRCODE = 'P0001';
  END IF;

  IF current_admin_count <= 1 THEN
    RAISE EXCEPTION 'You cannot leave the Admin role because no other administrator exists.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Reset elevated roles for this account.
  DELETE FROM public.user_roles
   WHERE user_id = current_user_id
     AND role IN ('admin', 'hr', 'manager');

  -- Ensure employee role exists.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, 'employee')
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.demote_myself_to_employee()
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.demote_myself_to_employee()
  TO authenticated;


-- 3) Helpful status function for the UI.
-- Returns how many admins exist, so the UI can show the right warning.
CREATE OR REPLACE FUNCTION public.get_admin_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
    FROM public.user_roles
   WHERE role = 'admin';
$$;

REVOKE ALL ON FUNCTION public.get_admin_count()
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_admin_count()
  TO authenticated;
