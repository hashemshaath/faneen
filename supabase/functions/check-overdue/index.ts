import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];
    const results = { overdueInstallments: 0, overdueContracts: 0, errors: [] as string[] };

    // 1. Check overdue installment payments
    const { data: overduePayments, error: payErr } = await supabase
      .from("installment_payments")
      .select(`
        id, installment_number, amount, due_date,
        plan:installment_plans!inner(
          id, contract_id, currency_code,
          contract:contracts!inner(
            id, contract_number, client_id, provider_id, title_ar, title_en
          )
        )
      `)
      .eq("status", "pending")
      .lt("due_date", today);

    if (payErr) {
      results.errors.push(`installment query error: ${payErr.message}`);
    } else if (overduePayments?.length) {
      for (const payment of overduePayments) {
        const plan = (payment as any).plan;
        const contract = plan?.contract;
        if (!contract) continue;

        // Check if we already sent a notification for this payment today
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("reference_id", payment.id)
          .eq("reference_type", "overdue_installment")
          .gte("created_at", `${today}T00:00:00Z`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const amountStr = `${Number(payment.amount).toLocaleString()} ${plan.currency_code}`;

        // Notify client
        await supabase.rpc("create_notification", {
          _user_id: contract.client_id,
          _title_ar: `قسط متأخر - ${contract.contract_number}`,
          _title_en: `Overdue Installment - ${contract.contract_number}`,
          _body_ar: `القسط رقم ${payment.installment_number} بمبلغ ${amountStr} متأخر عن موعد استحقاقه (${payment.due_date})`,
          _body_en: `Installment #${payment.installment_number} of ${amountStr} is overdue (due: ${payment.due_date})`,
          _type: "installment",
          _ref_id: payment.id,
          _ref_type: "overdue_installment",
          _action_url: "/dashboard/installments",
        });

        // Notify provider
        await supabase.rpc("create_notification", {
          _user_id: contract.provider_id,
          _title_ar: `قسط متأخر من العميل - ${contract.contract_number}`,
          _title_en: `Client Overdue Installment - ${contract.contract_number}`,
          _body_ar: `القسط رقم ${payment.installment_number} بمبلغ ${amountStr} لم يُدفع بعد (${payment.due_date})`,
          _body_en: `Installment #${payment.installment_number} of ${amountStr} is still unpaid (due: ${payment.due_date})`,
          _type: "installment",
          _ref_id: payment.id,
          _ref_type: "overdue_installment",
          _action_url: "/dashboard/installments",
        });

        results.overdueInstallments++;
      }
    }

    // 2. Check overdue contracts (active but past end_date)
    const { data: overdueContracts, error: cErr } = await supabase
      .from("contracts")
      .select("id, contract_number, client_id, provider_id, title_ar, title_en, end_date")
      .eq("status", "active")
      .not("end_date", "is", null)
      .lt("end_date", today);

    if (cErr) {
      results.errors.push(`contract query error: ${cErr.message}`);
    } else if (overdueContracts?.length) {
      for (const contract of overdueContracts) {
        // Check if already notified today
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("reference_id", contract.id)
          .eq("reference_type", "overdue_contract")
          .gte("created_at", `${today}T00:00:00Z`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Notify client
        await supabase.rpc("create_notification", {
          _user_id: contract.client_id,
          _title_ar: `عقد تجاوز موعد الانتهاء - ${contract.contract_number}`,
          _title_en: `Contract Past Due - ${contract.contract_number}`,
          _body_ar: `العقد "${contract.title_ar}" تجاوز تاريخ انتهائه المحدد (${contract.end_date})`,
          _body_en: `Contract "${contract.title_en || contract.title_ar}" is past its end date (${contract.end_date})`,
          _type: "contract",
          _ref_id: contract.id,
          _ref_type: "overdue_contract",
          _action_url: `/contracts/${contract.id}`,
        });

        // Notify provider
        await supabase.rpc("create_notification", {
          _user_id: contract.provider_id,
          _title_ar: `عقد تجاوز موعد الانتهاء - ${contract.contract_number}`,
          _title_en: `Contract Past Due - ${contract.contract_number}`,
          _body_ar: `العقد "${contract.title_ar}" تجاوز تاريخ انتهائه المحدد (${contract.end_date})`,
          _body_en: `Contract "${contract.title_en || contract.title_ar}" is past its end date (${contract.end_date})`,
          _type: "contract",
          _ref_id: contract.id,
          _ref_type: "overdue_contract",
          _action_url: `/contracts/${contract.id}`,
        });

        results.overdueContracts++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.overdueInstallments} overdue installments and ${results.overdueContracts} overdue contracts`,
      ...results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
