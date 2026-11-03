import { Router } from "express";
import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";

const router = Router();

const OUTPUT_DIR =
  "/home/opc/sports-jedi/marketing/output";

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

router.get("/", (req, res) => {
  const urls = [
    {
      loc: "https://sportsjedi.com/",
      lastmod: new Date().toISOString(),
    },
    {
      loc: "https://sportsjedi.com/signals",
      lastmod: new Date().toISOString(),
    },
    {
      loc: "https://sportsjedi.com/pricing",
      lastmod: new Date().toISOString(),
    },
    {
      loc: "https://sportsjedi.com/blog",
      lastmod: new Date().toISOString(),
    },
  ];

  const latestByMatchup = new Map();
  if (existsSync(OUTPUT_DIR)) {
    for (const name of readdirSync(OUTPUT_DIR)) {
      if (!/^SJ_.*\.json$/i.test(name)) {
        continue;
      }

      try {
        const campaign = JSON.parse(
          readFileSync(
            join(OUTPUT_DIR, name),
            "utf8"
          )
        );

        // Only index recent, complete pick analyses. Old campaign archives remain
        // accessible by direct URL but are not promoted as fresh editorial pages.
        const published = new Date(campaign.created_at || '');
        const ageMs = Date.now() - published.getTime();
        if (!Number.isFinite(ageMs) || ageMs < 0 ||
            ageMs > 3 * 86400 * 1000 ||
            !campaign.league || !campaign.matchup || !campaign.pick ||
            !campaign.summary || !campaign.disclaimer ||
            !campaign.away_badge || !campaign.home_badge) {
          continue;
        }

        const slug = slugify(
          `${campaign.league}-${campaign.matchup}-${campaign.campaign_id}`
        );

        // Sitemap should recommend one current analysis per game, not
        // dozens of similar daily campaign snapshots.
        const matchKey = slugify(`${campaign.league}-${campaign.matchup}`);
        const candidate = {
          loc: `https://sportsjedi.com/blog/${slug}`,
          lastmod: campaign.created_at,
        };
        const prior = latestByMatchup.get(matchKey);
        if (!prior || new Date(candidate.lastmod) > new Date(prior.lastmod))
          latestByMatchup.set(matchKey, candidate);
      } catch {
        // Skip malformed campaign files.
      }
    }
  }

  urls.push(...latestByMatchup.values());

  const entries = urls
    .map(
      ({ loc, lastmod }) =>
        `  <url>\n` +
        `    <loc>${escapeXml(loc)}</loc>\n` +
        `    <lastmod>${escapeXml(lastmod)}</lastmod>\n` +
        `  </url>`
    )
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${entries}\n` +
    `</urlset>\n`;

  res
    .type("application/xml")
    .send(xml);
});

export default router;
