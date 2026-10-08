// Shared renderer for the social share images (opengraph-image.tsx files).
// The brand's Fjord block (BRANDBOOK §1): Fjord background, Snø headline with
// a Morgensol highlight, the negative stacked logo. Rendered statically at
// build time by next/og.

import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

// BRANDBOOK §1 — hex is fine here: Satori can't read the CSS variables.
const FJORD = '#1E3A4C';
const SNO = '#F7F5F0';
const SOL = '#F0B84A';
const FROST = '#9DBFCC';

async function loadLogo(): Promise<string> {
  const png = await readFile(join(process.cwd(), 'src/assets/brand/sekundaerlogo-negativ.png'));
  return `data:image/png;base64,${png.toString('base64')}`;
}

/** Fraunces for the headline, fetched from Google Fonts at build time. Falls
 *  back to Satori's default sans if the network isn't there — the build
 *  must never fail over a share image. */
async function loadHeadlineFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    ).then((r) => r.text());
    const url = css.match(/src: url\(([^)]+)\) format\('(?:woff|truetype|opentype)'\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export async function renderOgImage({
  title,
  highlight,
  tagline,
}: {
  title: string;
  /** Second headline line, in Morgensol. */
  highlight: string;
  tagline: string;
}) {
  const [logo, font] = await Promise.all([loadLogo(), loadHeadlineFont()]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '72px 80px',
          background: `radial-gradient(60% 70% at 15% 0%, rgba(157,191,204,0.35), transparent 70%), ${FJORD}`,
          color: SNO,
          fontFamily: font ? 'Fraunces' : 'sans-serif',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori needs a plain <img> */}
        <img src={logo} alt="" width={340} height={272} style={{ marginRight: 72 }} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 84, fontWeight: 600, lineHeight: 1.02, letterSpacing: -2 }}>
            <span>{title}</span>
            <span style={{ color: SOL }}>{highlight}</span>
          </div>
          <div style={{ marginTop: 32, fontSize: 32, color: 'rgba(247,245,240,0.78)', fontFamily: 'sans-serif', lineHeight: 1.3 }}>
            {tagline}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 44, fontSize: 24, color: FROST, fontFamily: 'sans-serif' }}>
            <div style={{ width: 12, height: 12, borderRadius: 999, background: SOL, marginRight: 12 }} />
            nooracare.no · Bergen og Oslo
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: font ? [{ name: 'Fraunces', data: font, style: 'normal', weight: 600 }] : undefined,
    }
  );
}
