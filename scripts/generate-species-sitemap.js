#!/usr/bin/env node
/* Generate sitemap for species pages including image entries */
const fs = require('fs');
const path = require('path');
const { getSupabaseServerClient } = require('../lib/supabase/serverClient');

async function run() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from('species').select('slug,image_url,updated_at').limit(2000);
    if (error) throw error;

    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fishfindr.eu').replace(/\/$/, '');
    const urls = (data || []).map(s => {
      const loc = `${site}/findr/species/${s.slug}`;
      const lastmod = s.updated_at ? new Date(s.updated_at).toISOString() : null;
      const image = s.image_url ? (s.image_url.startsWith('http') ? s.image_url : site + s.image_url) : null;
      return { loc, lastmod, image };
    });

    const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'];
    for (const u of urls) {
      xml.push('  <url>');
      xml.push(`    <loc>${u.loc}</loc>`);
      if (u.lastmod) xml.push(`    <lastmod>${u.lastmod}</lastmod>`);
      if (u.image) {
        xml.push('    <image:image>');
        xml.push(`      <image:loc>${u.image}</image:loc>`);
        xml.push('    </image:image>');
      }
      xml.push('  </url>');
    }
    xml.push('</urlset>');

    const out = path.resolve(process.cwd(), 'public', 'sitemap-species.xml');
    fs.writeFileSync(out, xml.join('\n'));
    console.log('Wrote', out);
  } catch (err) {
    console.error('Failed to generate species sitemap', err.message || err);
    process.exit(1);
  }
}

run();
