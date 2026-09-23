import { createFileRoute } from "@tanstack/react-router";

// Temporary one-off route: creates the platform super admin, then is deleted.
const ONE_TIME_TOKEN = "bf-bootstrap-2f9a41c7";

export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const body = (await request.json()) as { email: string; password: string };

        let userId: string | undefined;
        const created = await supabaseAdmin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
        });
        if (created.data.user) {
          userId = created.data.user.id;
        } else {
          const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          const existing = list.data.users.find((u) => u.email?.toLowerCase() === body.email.toLowerCase());
          if (!existing) return Response.json({ ok: false, error: created.error?.message }, { status: 400 });
          userId = existing.id;
          await supabaseAdmin.auth.admin.updateUserById(userId, { password: body.password, email_confirm: true });
        }

        await supabaseAdmin.from("profiles").upsert({ id: userId, email: body.email, full_name: "Adriko Ceasar Alpha" });
        const role = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "super_admin" }, { onConflict: "user_id,role" });

        return Response.json({ ok: !role.error, userId, error: role.error?.message ?? null });
      },
    },
  },
});
