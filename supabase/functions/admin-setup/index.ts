// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ActionBody = {
  action?: string;
  [key: string]: unknown;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin-setup function.');
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const logAdminAction = async (args: {
  actorUserId: string;
  action: string;
  targetTable?: string | null;
  targetId?: string | null;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
}) => {
  try {
    await admin.from('admin_audit_logs').insert({
      actor_user_id: args.actorUserId,
      action: args.action,
      target_table: args.targetTable ?? null,
      target_id: args.targetId ?? null,
      payload: args.payload ?? {},
      result: args.result ?? {},
    });
  } catch (err) {
    console.warn('Failed to write admin audit log:', err);
  }
};

const ensureAdmin = async (authHeader?: string | null) => {
  if (!authHeader) return { ok: false, error: 'Missing Authorization header.' };

  const token = authHeader.replace('Bearer ', '').trim();
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) return { ok: false, error: 'Unauthorized.' };

  const { data: profile, error: profileErr } = await admin
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (profileErr || !profile || profile.role !== 'admin') {
    return { ok: false, error: 'Admin access required.' };
  }

  return { ok: true, userId: userData.user.id };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await ensureAdmin(req.headers.get('Authorization'));
    if (!auth.ok) return json(403, { success: false, error: auth.error });

    const body = (await req.json()) as ActionBody;
    const action = String(body.action || '').trim();

    switch (action) {
      case 'get-all-users': {
        const { data, error } = await admin
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return json(200, { users: data || [] });
      }

      case 'get-pending-requests': {
        const { data, error } = await admin
          .from('plan_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return json(200, { requests: data || [] });
      }

      case 'get-discount-codes': {
        const { data, error } = await admin
          .from('discount_codes')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return json(200, { codes: data || [] });
      }

      case 'get-promotions-admin': {
        const { data, error } = await admin
          .from('promotions')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return json(200, { promotions: data || [] });
      }

      case 'approve-plan': {
        const requestId = String(body.requestId || '');
        const approved = Boolean(body.approved);
        const adminNotes = body.adminNotes ? String(body.adminNotes) : null;
        if (!requestId) return json(400, { success: false, error: 'requestId is required.' });

        const { data: requestRow, error: reqErr } = await admin
          .from('plan_requests')
          .select('*')
          .eq('id', requestId)
          .maybeSingle();
        if (reqErr || !requestRow) return json(404, { success: false, error: 'Plan request not found.' });

        const status = approved ? 'approved' : 'rejected';

        const { error: updateReqErr } = await admin
          .from('plan_requests')
          .update({ status, admin_notes: adminNotes })
          .eq('id', requestId);
        if (updateReqErr) throw updateReqErr;

        if (approved) {
          const { error: updateProfileErr } = await admin
            .from('user_profiles')
            .update({
              current_plan: requestRow.requested_plan,
              plan_status: 'active',
            })
            .eq('user_id', requestRow.user_id);
          if (updateProfileErr) throw updateProfileErr;
        }

        await logAdminAction({
          actorUserId: auth.userId,
          action: 'approve-plan',
          targetTable: 'plan_requests',
          targetId: requestId,
          payload: { approved, adminNotes },
          result: { status },
        });

        return json(200, { success: true });
      }

      case 'update-user-plan': {
        const userId = String(body.userId || '');
        if (!userId) return json(400, { success: false, error: 'userId is required.' });

        const patch: Record<string, unknown> = {};
        if (body.plan) patch.current_plan = String(body.plan);
        if (body.planStatus) patch.plan_status = String(body.planStatus);
        if (body.discount !== undefined && body.discount !== null) {
          patch.discount_percentage = Number(body.discount);
        }

        const { error } = await admin.from('user_profiles').update(patch).eq('user_id', userId);
        if (error) throw error;

        await logAdminAction({
          actorUserId: auth.userId,
          action: 'update-user-plan',
          targetTable: 'user_profiles',
          targetId: userId,
          payload: patch,
          result: { success: true },
        });

        return json(200, { success: true });
      }

      case 'create-discount-code': {
        const code = String(body.code || '').trim().toUpperCase();
        if (!code) return json(400, { success: false, error: 'Code is required.' });

        const payload = {
          code,
          description: String(body.description || ''),
          discount_type: String(body.discountType || 'percentage'),
          discount_value: Number(body.discountValue || 0),
          max_uses: Number(body.maxUses ?? -1),
          valid_until: body.validUntil ? String(body.validUntil) : null,
          is_active: true,
          current_uses: 0,
        };

        const { error } = await admin.from('discount_codes').insert(payload);
        if (error) return json(400, { success: false, error: error.message });

        await logAdminAction({
          actorUserId: auth.userId,
          action: 'create-discount-code',
          targetTable: 'discount_codes',
          targetId: code,
          payload,
          result: { success: true },
        });

        return json(200, { success: true });
      }

      case 'create-promotion': {
        const title = String(body.title || '').trim();
        if (!title) return json(400, { success: false, error: 'Title is required.' });

        const payload = {
          title,
          description: String(body.description || ''),
          discount_type: String(body.discountType || 'percentage'),
          discount_value: Number(body.discountValue || 0),
          start_date: body.startDate ? String(body.startDate) : null,
          end_date: body.endDate ? String(body.endDate) : null,
          is_active: true,
          applicable_plans: [],
        };

        const { error } = await admin.from('promotions').insert(payload);
        if (error) return json(400, { success: false, error: error.message });

        await logAdminAction({
          actorUserId: auth.userId,
          action: 'create-promotion',
          targetTable: 'promotions',
          targetId: title,
          payload,
          result: { success: true },
        });

        return json(200, { success: true });
      }

      case 'toggle-discount-code': {
        const codeId = String(body.codeId || '');
        if (!codeId) return json(400, { success: false, error: 'codeId is required.' });

        const { error } = await admin
          .from('discount_codes')
          .update({ is_active: Boolean(body.isActive) })
          .eq('id', codeId);
        if (error) throw error;

        await logAdminAction({
          actorUserId: auth.userId,
          action: 'toggle-discount-code',
          targetTable: 'discount_codes',
          targetId: codeId,
          payload: { isActive: Boolean(body.isActive) },
          result: { success: true },
        });

        return json(200, { success: true });
      }

      case 'toggle-promotion': {
        const promotionId = String(body.promotionId || '');
        if (!promotionId) return json(400, { success: false, error: 'promotionId is required.' });

        const { error } = await admin
          .from('promotions')
          .update({ is_active: Boolean(body.isActive) })
          .eq('id', promotionId);
        if (error) throw error;

        await logAdminAction({
          actorUserId: auth.userId,
          action: 'toggle-promotion',
          targetTable: 'promotions',
          targetId: promotionId,
          payload: { isActive: Boolean(body.isActive) },
          result: { success: true },
        });

        return json(200, { success: true });
      }

      case 'validate-discount': {
        const rawCode = String(body.code || '').trim().toUpperCase();
        if (!rawCode) return json(400, { success: false, message: 'Código é obrigatório.' });

        const { data: discount, error } = await admin
          .from('discount_codes')
          .select('*')
          .eq('code', rawCode)
          .eq('is_active', true)
          .maybeSingle();

        if (error || !discount) {
          return json(200, { success: false, message: 'Cupom não encontrado.' });
        }

        const now = new Date().toISOString();
        if (discount.valid_until && discount.valid_until < now) {
          return json(200, { success: false, message: 'Cupom expirado.' });
        }

        if (discount.max_uses >= 0 && (discount.current_uses || 0) >= discount.max_uses) {
          return json(200, { success: false, message: 'Cupom sem usos disponíveis.' });
        }

        return json(200, {
          success: true,
          discount: {
            code: discount.code,
            type: discount.discount_type,
            value: Number(discount.discount_value) || 0,
            description: discount.description || `Cupom ${discount.code}`,
          },
        });
      }

      default:
        return json(400, { success: false, error: `Unsupported action: ${action}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return json(500, { success: false, error: message });
  }
});
