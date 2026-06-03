const jsonHeaders = { 'Content-Type': 'application/json' }

Deno.serve(() => {
  console.warn('process-email-queue is disabled: Qitaat sends emails directly through Resend functions')

  return new Response(
    JSON.stringify({
      processed: 0,
      disabled: true,
      reason: 'resend_direct_delivery',
    }),
    { status: 200, headers: jsonHeaders },
  )
})