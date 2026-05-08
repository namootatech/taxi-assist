import Link from "next/link"
import { externalLinks } from "@/lib/links"

export function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-[var(--border)] bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <div className="text-lg font-black">Trip / Taxi Assist</div>
          <p className="mt-3 max-w-md text-sm leading-6 muted">
            We help people move and earn with verification and payments that fit South Africa.
          </p>
        </div>
        <div>
          <div className="text-sm font-bold">Contact</div>
          <a className="focus-ring mt-3 inline-block rounded-lg text-sm hover:text-[var(--brand-red)]" href={`mailto:${externalLinks.supportEmail}`}>
            {externalLinks.supportEmail}
          </a>
        </div>
        <div>
          <div className="text-sm font-bold">Legal</div>
          <div className="mt-3 flex flex-col gap-2 text-sm muted">
            <Link className="focus-ring rounded-lg hover:text-[var(--brand-red)]" href="/legal/privacy">
              Privacy
            </Link>
            <Link className="focus-ring rounded-lg hover:text-[var(--brand-red)]" href="/legal/terms">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
