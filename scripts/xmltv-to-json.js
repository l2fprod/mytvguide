const fs = require('fs').promises;
const path = require('path');
const { parseStringPromise } = require('xml2js');
const yaml = require('js-yaml');
const unzipper = require('unzipper');
const { pipeline } = require('stream/promises');

function safeFilename(id) {
  return (id || '').toLowerCase().replace(/[^a-z0-9._-]/g, '_');
}

function textOf(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join(' / ');
  if (typeof node === 'object') {
    if ('_' in node) return node._;
    // sometimes xml2js yields objects with #text or value keys
    if ('#text' in node) return node['#text'];
    // otherwise try first string child
    for (const k of Object.keys(node)) {
      if (typeof node[k] === 'string') return node[k];
      if (Array.isArray(node[k]) && typeof node[k][0] === 'string') return node[k][0];
    }
  }
  return '';
}

function collectCategories(programs, limit = 3) {
  // count occurrences and remember first-seen order
  const counts = new Map();
  const firstSeen = new Map();
  let idx = 0;
  for (const prog of programs || []) {
    const pcs = prog && prog.categories ? prog.categories : [];
    for (const c of pcs) {
      if (!c) continue;
      counts.set(c, (counts.get(c) || 0) + 1);
      if (!firstSeen.has(c)) firstSeen.set(c, idx++);
    }
  }
  if (counts.size === 0) return [];
  // sort by count desc, then by first seen
  const sorted = Array.from(counts.entries()).sort((a, b) => {
    const diff = b[1] - a[1];
    if (diff !== 0) return diff;
    return (firstSeen.get(a[0]) || 0) - (firstSeen.get(b[0]) || 0);
  });
  return sorted.slice(0, limit).map(e => e[0]);
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const outDir = path.join(repoRoot, 'public', 'data');
  const channelOutDir = path.join(repoRoot, 'public', 'data', 'channels');
  const inputPath = path.join(outDir, 'xmltv.xml');
  const zipUrl = 'https://xmltvfr.fr/xmltv/xmltv.zip';
  const zipPath = path.join(outDir, 'xmltv.zip');

  try {
    // ensure outDir exists
    await fs.mkdir(channelOutDir, { recursive: true });

    console.log('Downloading', zipUrl);
    await fs.writeFile(zipPath, await (await fetch(zipUrl)).bytes());

    await pipeline(
      fs.readFile(zipPath),
      unzipper.Extract({ path: outDir })
    );

    console.log('Downloaded and decompressed to', inputPath);
    const xml = await fs.readFile(inputPath, 'utf8');
    const parsed = await parseStringPromise(xml, { explicitArray: false, attrkey: '$' });

    const tv = parsed && parsed.tv ? parsed.tv : {};
    let channels = tv.channel || [];
    let programmes = tv.programme || [];

    if (!Array.isArray(channels)) channels = [channels].filter(Boolean);
    if (!Array.isArray(programmes)) programmes = [programmes].filter(Boolean);

    const channelsList = channels.map(ch => {
      const id = (ch.$ && ch.$.id) || ch.id || '';
      const displayName = textOf(ch['display-name'] || ch['display_name'] || ch.name);
      const icon = ch.icon && ch.icon.$ && ch.icon.$.src ? ch.icon.$.src : (ch['icon'] && ch['icon'].$ && ch['icon'].$.src) || '';
      return { id, displayName, icon };
    });

    // load category mapping
    const catsYamlPath = path.join(__dirname, 'categories.yaml');
    let categoryMap = new Map();
    let missingCategories = new Set();
    try {
      const catsYaml = await fs.readFile(catsYamlPath, 'utf8');
      const parsedCats = yaml.load(catsYaml) || {};
      const catGroups = parsedCats.categories || {};
      for (const [meta, list] of Object.entries(catGroups)) {
        if (!Array.isArray(list)) continue;
        for (const c of list) {
          if (typeof c === 'string' && c.trim()) categoryMap.set(c.trim(), meta);
        }
      }
    } catch (err) {
      console.warn('Could not load categories.yaml:', err && err.message ? err.message : err);
    }

    // write channels list
    const channelsOut = path.join(outDir, 'channels.json');
    await fs.writeFile(channelsOut, JSON.stringify(channelsList, null, 2), 'utf8');
    console.log('Wrote', channelsOut);

    // group programmes by channel
    const byChannel = {};
    for (const p of programmes) {
      const attrs = (p.$) || {};
      const channelId = attrs.channel || '';
      const item = {
        title: textOf(p.title),
        subTitle: textOf(p['sub-title'] || p.subtitle),
        desc: textOf(p.desc || p.description),
        start: attrs.start || '',
        stop: attrs.stop || '',
        categories: (() => {
          const c = p.category || [];
          let raw = [];
          if (!c) raw = [];
          else if (Array.isArray(c)) raw = c.map(textOf);
          else raw = [textOf(c)];
          // map to meta categories using categoryMap; fallback to original
          const mapped = raw.map(r => {
            const key = (r || '').trim();
            if (!key) return null;
            if (categoryMap.has(key)) return categoryMap.get(key);
            if (key && !missingCategories.has(key)) {
              console.info('Unmapped category:', key);
              missingCategories.add(key);
            }
            // fallback to 'Other' for unmapped categories
            return 'Other';
          }).filter(Boolean);
          // dedupe preserving order
          const seen = new Set();
          return mapped.filter(m => (seen.has(m) ? false : seen.add(m)));
        })(),
        icon: (p.icon && p.icon.$ && p.icon.$.src) || '',
        episodeNum: textOf(p['episode-num'] || p['episode_number'] || '')
      };
      if (!byChannel[channelId]) byChannel[channelId] = [];
      byChannel[channelId].push(item);
    }

    // compute and attach channel-level categories, then write channels list
    try {
      for (const ch of channelsList) {
        const id = ch.id;
        const programs = byChannel[id] || [];
        ch.categories = collectCategories(programs);
      }
      const channelsOut = path.join(outDir, 'channels.json');
      await fs.writeFile(channelsOut, JSON.stringify(channelsList, null, 2), 'utf8');
      console.log('Wrote', channelsOut);
    } catch (err) {
      console.warn('Failed to write channels list with categories:', err && err.message ? err.message : err);
    }

    // write per-channel files
    for (const ch of channelsList) {
      const id = ch.id;
      const safe = safeFilename(id || 'unknown');
      const programs = byChannel[id] || [];
      const outPath = path.join(outDir, `channels/channel-${safe}.json`);
      const outObj = {
        id,
        displayName: ch.displayName,
        icon: ch.icon,
        categories: collectCategories(programs),
        programmes: programs
      };
      await fs.writeFile(outPath, JSON.stringify(outObj, null, 2), 'utf8');
      console.log('Wrote', outPath);
    }

    await fs.rm(zipPath).catch(() => { });
    await fs.rm(inputPath).catch(() => { });

    console.log('Done: generated', Object.keys(byChannel).length, 'channel schedules');
  } catch (err) {
    if (err && err.stack) console.error(err.stack);
    else console.error('Error:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
