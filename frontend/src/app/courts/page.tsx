import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getOfficialLinks, mapsUrl, telHref, FALLBACK_LINKS } from '@/lib/official';
import type { Location, LocationClosure, OfficialLink } from '@/lib/db-types';
import { addDays, evanstonToday, formatDateShort } from '@/lib/time';
import Badge from '@/components/Badge';
import { EmergencyNotice } from '@/components/Notices';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Find Courts · Evanston Dinks' };

const ACCESS_LABELS: Record<string, string> = {
  first_come: 'First come, first served',
  reservable: 'Reservable',
  open_gym: 'Open gym / drop-in',
  rental: 'Court rental',
};

function ExtLink({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        primary
          ? 'inline-flex min-h-[44px] items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700'
          : 'inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50'
      }
    >
      {children}
    </a>
  );
}

function StatusBanner({ loc, closures }: { loc: Location; closures: LocationClosure[] }) {
  const mine = closures.filter(
    (c) => c.location_id === loc.id || (!c.location_id && (!c.setting || c.setting === loc.setting))
  );
  if (loc.status === 'open' && mine.length === 0) return null;
  return (
    <div className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-900">
      {loc.status !== 'open' && (
        <p className="font-semibold">
          {loc.status === 'closed' ? 'Closed' : 'Temporarily unavailable'}
          {loc.status_note ? ` — ${loc.status_note}` : ''}
        </p>
      )}
      {mine.map((c) => (
        <p key={c.id}>
          {c.starts_on === c.ends_on ? formatDateShort(c.starts_on) : `${formatDateShort(c.starts_on)} – ${formatDateShort(c.ends_on)}`}: {c.reason}
        </p>
      ))}
    </div>
  );
}

export default async function CourtsPage() {
  const supabase = createClient();
  const today = evanstonToday();
  const [{ data: locs, error }, { data: closureData }, links] = await Promise.all([
    supabase.from('locations').select('*').order('sort_order'),
    supabase.from('location_closures').select('*').gte('ends_on', today).lte('starts_on', addDays(today, 14)),
    getOfficialLinks(supabase),
  ]);
  const locations = (locs ?? []) as Location[];
  const closures = (closureData ?? []) as LocationClosure[];
  const outdoor = locations.filter((l) => l.setting === 'outdoor');
  const indoor = locations.filter((l) => l.setting === 'indoor');
  const reserve = links.reserve_court ?? FALLBACK_LINKS.reserve_court;
  const parks = links.tennis_pickleball ?? FALLBACK_LINKS.tennis_pickleball;
  const checked = locations.map((l) => l.info_checked_on).filter(Boolean).sort().pop();
  const resourceLinks = Object.values(links).filter((l) => l.key !== 'donate' && l.url).sort((a: OfficialLink, b: OfficialLink) => a.sort_order - b.sort_order);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">Find Courts</h1>
      <p className="mt-1 text-gray-600">Where to play pickleball in Evanston — outdoors, indoors, and how to reserve.</p>

      {/* Reservations callout */}
      <section className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
        <p className="font-semibold text-green-900">
          Need to reserve a court? Evanston Parks &amp; Recreation manages official court reservations through its recreation
          system.
        </p>
        <p className="mt-1 text-sm text-green-900">
          Reservations are made with the City of Evanston — not Evanston Dinks. Your City receipt serves as your permit.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a
            href={reserve.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] items-center justify-center rounded-lg bg-green-600 px-4 text-base font-semibold text-white hover:bg-green-700"
          >
            Reserve a Court ↗
          </a>
          <a
            href={parks.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] items-center justify-center rounded-lg border border-green-600 bg-white px-4 text-base font-semibold text-green-800 hover:bg-green-100"
          >
            View Evanston Parks &amp; Recreation ↗
          </a>
        </div>
      </section>

      <nav className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 text-sm font-semibold" aria-label="Sections">
        <a href="#outdoor" className="whitespace-nowrap rounded-full border border-gray-300 bg-white px-4 py-2">🌳 Outdoor Courts</a>
        <a href="#indoor" className="whitespace-nowrap rounded-full border border-gray-300 bg-white px-4 py-2">🏢 Indoor Play &amp; Reservations</a>
        <a href="#resources" className="whitespace-nowrap rounded-full border border-gray-300 bg-white px-4 py-2">📎 Official Resources</a>
      </nav>

      {error && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Court details couldn’t be loaded right now. The official City links on this page still work.
        </p>
      )}

      {/* A. Outdoor */}
      <section id="outdoor" className="mt-6 scroll-mt-20">
        <h2 className="text-xl font-bold">A. Outdoor Courts</h2>
        <p className="mt-1 text-sm text-gray-600">
          City court rules list playing hours of 7 AM–10 PM for lighted courts and 7 AM–9 PM for non-lighted courts.
          Check posted signs and City notices for closures.
        </p>
        <div className="mt-3 grid gap-3">
          {outdoor.map((l) => (
            <article key={l.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-lg font-bold">{l.name}</h3>
                <div className="flex flex-wrap gap-1">
                  <Badge tone={l.has_lights ? 'amber' : 'gray'}>{l.has_lights ? '💡 LIGHTED' : 'NO LIGHTS'}</Badge>
                </div>
              </div>
              <StatusBanner loc={l} closures={closures} />
              <dl className="mt-2 space-y-1.5 text-sm">
                <div><dt className="inline font-semibold">Courts: </dt><dd className="inline">{l.court_count ?? '—'}{l.court_notes ? ` · ${l.court_notes}` : ''}</dd></div>
                <div><dt className="inline font-semibold">General hours: </dt><dd className="inline">{l.hours_summary}</dd></div>
                {l.reservation_info && <div><dt className="inline font-semibold">Reservations: </dt><dd className="inline">{l.reservation_info}</dd></div>}
                {l.first_come_info && <div><dt className="inline font-semibold">First come, first served: </dt><dd className="inline">{l.first_come_info}</dd></div>}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {l.reservation_url && <ExtLink href={l.reservation_url} primary>Reserve (City) ↗</ExtLink>}
                {l.official_url && <ExtLink href={l.official_url}>Official City info ↗</ExtLink>}
                {mapsUrl(l.maps_query) && <ExtLink href={mapsUrl(l.maps_query)!}>🧭 Directions</ExtLink>}
                <Link href={`/games?location=${l.slug}`} className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold text-blue-700 underline">
                  Games here
                </Link>
                <Link href={`/games/new?location=${l.slug}`} className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold text-blue-700 underline">
                  Host here
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* B. Indoor */}
      <section id="indoor" className="mt-8 scroll-mt-20">
        <h2 className="text-xl font-bold">B. Indoor Play &amp; Reservations</h2>
        <p className="mt-1 text-sm text-gray-600">
          Evanston Parks &amp; Recreation indoor pickleball. Schedules, fees and availability change — the official City page
          always controls.
        </p>
        <div className="mt-3 grid gap-3">
          {indoor.map((l) => (
            <article key={l.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-lg font-bold">
                {l.official_url ? (
                  <a href={l.official_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {l.name} ↗
                  </a>
                ) : (
                  l.name
                )}
              </h3>
              <div className="mt-1 flex flex-wrap gap-1">
                {l.access_types.map((a) => (
                  <Badge key={a} tone={a === 'open_gym' ? 'purple' : 'blue'}>{(ACCESS_LABELS[a] ?? a).toUpperCase()}</Badge>
                ))}
              </div>
              <StatusBanner loc={l} closures={closures} />
              <dl className="mt-2 space-y-1.5 text-sm">
                {l.address && (
                  <div>
                    <dt className="inline font-semibold">Address: </dt>
                    <dd className="inline">
                      {mapsUrl(l.maps_query ?? l.address) ? (
                        <a href={mapsUrl(l.maps_query ?? l.address)!} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                          {l.address}
                        </a>
                      ) : (
                        l.address
                      )}
                    </dd>
                  </div>
                )}
                {l.phone && (
                  <div>
                    <dt className="inline font-semibold">Phone: </dt>
                    <dd className="inline">
                      <a href={telHref(l.phone) ?? undefined} className="text-blue-700 underline">{l.phone}</a>
                    </dd>
                  </div>
                )}
                <div><dt className="inline font-semibold">Open gym / drop-in: </dt><dd className="inline">{l.open_gym_info ?? 'Not currently listed.'}</dd></div>
                <div><dt className="inline font-semibold">Court rental: </dt><dd className="inline">{l.rental_info ?? 'Not currently listed.'}</dd></div>
                {l.contact_method && <div><dt className="inline font-semibold">How to reserve / contact: </dt><dd className="inline">{l.contact_method}</dd></div>}
                {l.hours_summary && <div><dt className="inline font-semibold">Hours: </dt><dd className="inline">{l.hours_summary}</dd></div>}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {l.schedule_url && <ExtLink href={l.schedule_url} primary>Official City Schedule ↗</ExtLink>}
                {l.official_url && <ExtLink href={l.official_url}>Official City info ↗</ExtLink>}
                {l.reservation_url && <ExtLink href={l.reservation_url}>Rentals ↗</ExtLink>}
                {telHref(l.phone) && <ExtLink href={telHref(l.phone)!}>📞 Call</ExtLink>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Official resources */}
      <section id="resources" className="mt-8 scroll-mt-20">
        <h2 className="text-xl font-bold">Official Evanston Resources</h2>
        <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {resourceLinks.map((r) => (
            <li key={r.key}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex min-h-[56px] flex-col justify-center px-4 py-2 hover:bg-gray-50">
                <span className="font-semibold text-blue-700">{r.label} ↗</span>
                {r.description && <span className="text-sm text-gray-600">{r.description}</span>}
              </a>
            </li>
          ))}
          {indoor.filter((l) => l.official_url).map((l) => (
            <li key={`fac-${l.id}`}>
              <a href={l.official_url!} target="_blank" rel="noopener noreferrer" className="flex min-h-[56px] flex-col justify-center px-4 py-2 hover:bg-gray-50">
                <span className="font-semibold text-blue-700">{l.name} ↗</span>
                <span className="text-sm text-gray-600">Official facility page</span>
              </a>
            </li>
          ))}
          <li className="px-4 py-3 text-sm text-gray-700">
            <span className="font-semibold">City questions:</span> call <a href="tel:311" className="text-blue-700 underline">311</a> or{' '}
            <a href="tel:+18474484311" className="text-blue-700 underline">(847) 448-4311</a>.
          </li>
          <li className="px-4 py-3 text-sm text-gray-700">
            <span className="font-semibold">Court rule violations (non-emergency):</span> the City’s court rules direct reports to
            Evanston Police non-emergency, <a href="tel:+18478665000" className="text-blue-700 underline">(847) 866-5000</a>.
          </li>
        </ul>
        <div className="mt-3">
          <EmergencyNotice />
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Evanston Dinks summarizes official City of Evanston information for convenience
          {checked ? ` (last checked ${formatDateShort(checked)})` : ''}. If anything here differs from the City’s website or
          posted signs, the City’s information controls.
        </p>
      </section>
    </main>
  );
}
