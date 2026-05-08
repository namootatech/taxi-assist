Deno.serve(() => {
  return Response.json({
    ok: false,
    error: "Use the Trip Media Web server action for Payfast checkout until provider credentials and callback URLs are finalized.",
  }, { status: 501 })
})
