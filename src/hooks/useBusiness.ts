import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Business = Tables<"businesses">;

/** Current tenant workspace for the signed-in user (owner or invited member). */
export function useBusiness() {
  return useQuery({
    queryKey: ["current-business"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return null;

      const owned = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at")
        .limit(1)
        .maybeSingle();

      if (owned.data) return owned.data as Business;

      const membership = await supabase
        .from("business_members")
        .select("business_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (!membership.data) return null;

      const business = await supabase
        .from("businesses")
        .select("*")
        .eq("id", membership.data.business_id)
        .maybeSingle();

      return (business.data as Business) ?? null;
    },
  });
}

export function useIsSuperAdmin() {
  return useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "super_admin")
        .maybeSingle();
      return Boolean(data);
    },
  });
}

export function useSubscription(businessId?: string) {
  return useQuery({
    queryKey: ["subscription", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*, plan:subscription_plans(*)")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}
