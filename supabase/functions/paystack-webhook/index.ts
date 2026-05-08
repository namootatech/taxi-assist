Deno.serve(() => {
  return Response.json({
    ok: false,
    error: "Paystack is documented as the secondary provider and is intentionally stubbed in this Payfast-first pass.",
  }, { status: 501 })
})
