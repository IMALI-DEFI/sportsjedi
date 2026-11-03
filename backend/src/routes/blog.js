import { Router } from "express";
import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import {
  basename,
  join,
} from "node:path";

const router = Router();

const OUTPUT_DIR =
  "/home/opc/sports-jedi/marketing/output";

const IMAGE_DIR =
  "/home/opc/sports-jedi/marketing/images";

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function articleFromCampaign(campaign) {
  const slug = slugify(
    `${campaign.league}-${campaign.matchup}-${campaign.campaign_id}`
  );

  const title =
    `${campaign.league} Pick: ${campaign.pick} — Sports Jedi Analysis`;

  const description =
    `${campaign.pick} is today’s ranked Sports Jedi signal with ` +
    `${campaign.confidence}% confidence and ` +
    `${campaign.market_agreement}% sportsbook agreement.`;

  const paragraphs = [
    `${campaign.matchup} is one of the strongest games on today’s Sports Jedi ranked board.`,
    `The current market-consensus pick is ${campaign.pick}. Sports Jedi assigned this signal a ${campaign.confidence}% confidence score after comparing ${campaign.books_analyzed} sportsbook sources.`,
    `Sportsbook agreement is ${campaign.market_agreement}%. ${campaign.summary}`,
    `Game time is ${new Date(campaign.game_time_et).toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    })}.`,
    `Review the complete ranked board at https://sportsjedi.com/signals.`,
    campaign.disclaimer,
  ];

  return {
    id: campaign.campaign_id,
    slug,
    title,
    description,
    league: campaign.league,
    matchup: campaign.matchup,
    awayTeam: campaign.away_team || "",
    homeTeam: campaign.home_team || "",
    awayBadge: campaign.away_badge || "",
    homeBadge: campaign.home_badge || "",
    awayFanart: campaign.away_fanart || "",
    homeFanart: campaign.home_fanart || "",
    pick: campaign.pick,
    confidence: campaign.confidence,
    marketAgreement: campaign.market_agreement,
    booksAnalyzed: campaign.books_analyzed,
    gameTime: campaign.game_time_et,
    createdAt: campaign.created_at,
    imageUrl:
      `/api/blog/images/${basename(campaign.image_file || "")}`,
    paragraphs,
  };
}

function loadArticles() {
  if (!existsSync(OUTPUT_DIR)) {
    return [];
  }

  return readdirSync(OUTPUT_DIR)
    .filter(
      (name) =>
        /^SJ_.*\.json$/i.test(name)
    )
    .map((name) => {
      try {
        const campaign = JSON.parse(
          readFileSync(
            join(OUTPUT_DIR, name),
            "utf8"
          )
        );

        return articleFromCampaign(campaign);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    );
}

router.get("/", (req, res) => {
  res.json({
    success: true,
    data: loadArticles().filter(article => article.awayBadge && article.homeBadge),
  });
});

router.get("/images/:filename", (req, res) => {
  const filename = basename(req.params.filename);

  if (!/^[A-Za-z0-9_-]+\.png$/.test(filename)) {
    return res.status(400).json({
      success: false,
      error: "Invalid image filename",
    });
  }

  const file = join(IMAGE_DIR, filename);

  if (!existsSync(file)) {
    return res.status(404).json({
      success: false,
      error: "Image not found",
    });
  }

  res.sendFile(file);
});

router.get("/:slug", (req, res) => {
  const article = loadArticles().find(
    (item) => item.slug === req.params.slug
  );

  if (!article) {
    return res.status(404).json({
      success: false,
      error: "Article not found",
    });
  }

  res.json({
    success: true,
    data: article,
  });
});

export default router;
