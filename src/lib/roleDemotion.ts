import { supabase } from "@/integrations/supabase/client";

export async function demoteMyselfToEmployee() {
  const { error } = await supabase.rpc("demote_myself_to_employee");

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function getAdminCount() {
  const { data, error } = await supabase.rpc("get_admin_count");

  if (error) {
    throw new Error(error.message);
  }

  return Number(data ?? 0);
}
