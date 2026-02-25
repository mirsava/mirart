import dotenv from 'dotenv';

dotenv.config();

const siteUrl = (process.env.SITE_URL || process.env.FRONTEND_URL || 'https://artzyla.com').replace(/\/$/, '');
const backendUrl = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');

const sitemapPaths = ['/sitemap.xml', '/sitemap-static.xml', '/sitemap-listings.xml'];

const buildCandidates = (path) => {
  const candidates = [
    `${siteUrl}${path}`,
    `${backendUrl}${path}`,
    `${backendUrl}/api${path}`,
  ];
  return [...new Set(candidates)];
};

const checkUrl = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'ArtZyla-SEO-Ping/1.0' },
    });
    if (!response.ok) {
      throw new Error(`${url} returned ${response.status}`);
    }
  } catch (error) {
    throw new Error(`${url} failed (${error?.cause?.code || error.message})`);
  }
};

const pingBing = async (sitemapUrl) => {
  const pingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  const response = await fetch(pingUrl, {
    method: 'GET',
    headers: { 'User-Agent': 'ArtZyla-SEO-Ping/1.0' },
  });
  if (!response.ok) {
    return { ok: false, status: response.status };
  }
  return { ok: true, status: response.status };
};

const run = async () => {
  console.log(`Using site URL: ${siteUrl}`);
  console.log(`Using backend URL: ${backendUrl}`);

  const resolved = {};

  for (const path of sitemapPaths) {
    const candidates = buildCandidates(path);
    let successUrl = '';
    const failures = [];

    for (const candidate of candidates) {
      try {
        await checkUrl(candidate);
        successUrl = candidate;
        console.log(`OK ${candidate}`);
        break;
      } catch (error) {
        failures.push(error.message);
      }
    }

    if (!successUrl) {
      throw new Error(`No reachable endpoint for ${path}\n${failures.join('\n')}`);
    }

    resolved[path] = successUrl;
  }

  const bingPing = await pingBing(resolved['/sitemap.xml']);
  if (bingPing.ok) {
    console.log(`Pinged Bing with ${resolved['/sitemap.xml']}`);
  } else {
    console.warn(`Bing ping skipped (${bingPing.status}). Search engines can still discover your sitemap by crawling and Search Console submission.`);
  }
  console.log('Submit sitemap.xml in Google Search Console after deployment.');
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
