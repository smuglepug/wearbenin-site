/* ==========================================================================
   WearBenin v2 — curated editorial imagery (hero + category tiles)
   --------------------------------------------------------------------------
   Why this file exists: the API's listing photos are real vendor stock, but
   they are mixed-quality market snapshots and they do not always match the
   editorial hero copy. Editorial surfaces (home hero slides, category tiles)
   therefore use this curated, visually verified set instead of "whatever the
   first listing photo happens to be".

   Every image below was rendered into a contact sheet and inspected visually
   before being wired in (see docs/EVIDENCE-design.md, round 2):
     - hero womens-fashion  : full-length Nigerian woman in purple aso-ebi + gele
     - hero mens-fashion    : studio portrait, man in dark traditional agbada + fila
     - hero traditional     : bride & groom in white/gold Nigerian wedding attire
     - tile womens-fashion  : single-garment ankara peplum dress
     - tile mens-fashion    : man in lilac embroidered kaftan set + fila
     - tile traditional     : couple in traditional Nigerian celebration attire
     - tile footwear        : studio sneaker product shot
     - tile bags            : quilted crossbody handbag, clean e-commerce shot
     - tile kids-baby       : toddler in traditional Nigerian tunic + fila
   Sources are Pexels (free to use, no attribution required, hotlinkable) and
   Wikimedia Commons (CC). No API key is needed at runtime.

   If WearBenin/IMAGE_SET.json exists it wins: set window.WB_IMAGE_SET in a
   script tag (or paste its URLs here) and these maps will be ignored.
   ========================================================================== */

const PX = (path, w = 1600) => `https://images.pexels.com/photos/${path}?auto=compress&cs=tinysrgb&w=${w}`;

/* category id -> hero background photo */
export const HERO_IMAGES = {
  'womens-fashion': PX('37340982/pexels-photo-37340982/free-photo-of-nigerian-woman-in-traditional-purple-attire-outdoors.jpeg'),
  'mens-fashion': PX('6109289/pexels-photo-6109289.jpeg'),
  traditional: PX('32297009/pexels-photo-32297009/free-photo-of-traditional-african-wedding-attire-portrait.jpeg'),
  footwear: PX('1027130/pexels-photo-1027130.jpeg'),
  'bags-accessories': PX('5352628/pexels-photo-5352628.jpeg'),
  'kids-baby': PX('37427101/pexels-photo-37427101/free-photo-of-portrait-of-a-child-in-traditional-nigerian-attire.jpeg')
};

/* category id -> square-ish tile photo (portrait crop) */
export const CATEGORY_IMAGES = {
  'womens-fashion': PX('32289598/pexels-photo-32289598/free-photo-of-elegant-woman-in-vibrant-ankara-dress-indoors.jpeg', 900),
  'mens-fashion': PX('32562829/pexels-photo-32562829/free-photo-of-smiling-man-in-traditional-african-attire.jpeg', 900),
  traditional: PX('37036211/pexels-photo-37036211/free-photo-of-traditional-african-attire-celebration-portrait.jpeg', 900),
  footwear: PX('1027130/pexels-photo-1027130.jpeg', 900),
  'bags-accessories': PX('5352628/pexels-photo-5352628.jpeg', 900),
  'kids-baby': PX('37427101/pexels-photo-37427101/free-photo-of-portrait-of-a-child-in-traditional-nigerian-attire.jpeg', 900)
};

/* A verified visual image set (produced by the image pipeline) overrides the
   curated defaults above when it has been loaded into the page. */
function fromImageSet(kind, id) {
  const set = (typeof window !== 'undefined' && window.WB_IMAGE_SET) || null;
  if (!set) return '';
  const bag = set[kind];
  if (!bag) return '';
  const hit = Array.isArray(bag) ? bag.find(x => x && (x.id === id || x.category === id || x.slug === id)) : bag[id];
  if (!hit) return '';
  return typeof hit === 'string' ? hit : (hit.url || hit.image || '');
}

export function heroImage(id) { return fromImageSet('heroes', id) || HERO_IMAGES[id] || ''; }
export function categoryImage(id) { return fromImageSet('categories', id) || CATEGORY_IMAGES[id] || ''; }

/* --------------------------------------------------------------------------
   Gallery hygiene — only show extra photos that plausibly show the same
   garment type as the listing.

   The seeded catalogue pairs each listing with 1–2 photos; a handful of the
   second photos are a different garment entirely (verified visually in a
   contact sheet — see docs/EVIDENCE-design.md round 2). We therefore:
     1. always show the primary photo;
     2. drop photos on the verified mismatch list;
     3. drop photos whose filename clearly names a different garment family
        than the listing title does.
   -------------------------------------------------------------------------- */
const FAMILIES = [
  ['sneaker', /\b(sneaker|trainer|air ?force|running shoe|kick)/i],
  ['shoe', /\b(shoe|loafer|heel|sandal|slipper|boot|mule|footwear)/i],
  ['bag', /\b(bag|tote|handbag|purse|backpack|satchel|clutch)/i],
  ['trouser', /\b(trouser|chino|jean|denim|pant|skirt)/i],
  ['dress', /\b(dress|gown|abaya|kaftan|boubou|buba|jumpsuit)/i],
  ['headwear', /\b(gele|head ?tie|headtie|headwrap|cap|fila|hat|hijab)/i],
  ['fabric', /\b(fabric|lace|material|cloth|wrapper|george|ankara material|yard|brocade|damask)/i],
  ['jewellery', /\b(earring|necklace|bead|jewel|bracelet|watch|sunglass)/i],
  ['top', /\b(shirt|blouse|top|peplum|polo|jacket|blazer|agbada|senator|kaftan)/i]
];

function familyOf(text) {
  const t = String(text || '').replace(/[-_+%]/g, ' ');
  const hits = FAMILIES.filter(([, rx]) => rx.test(t)).map(([f]) => f);
  return hits;
}

/* listing slug -> secondary photo indexes verified as a different garment */
const IMAGE_MISMATCH = {
  'kids-school-sneakers': [1],
  'white-sneakers': [1],
  'airforce-sneakers': [1],
  'block-heels': [1],
  'pleated-midi-skirt': [1],
  'shoulder-handbag': [1],
  'denim-jacket': [1],
  'aso-ebi-lace-gown': [1]
};

/**
 * Photos worth showing in the PDP gallery for a listing.
 * @param {object} listing
 * @param {string[]} images  normalised image urls
 */
export function galleryImages(listing, images) {
  const imgs = (images || []).filter(Boolean);
  if (imgs.length < 2) return imgs;
  const blocked = new Set(IMAGE_MISMATCH[listing && listing.slug] || []);
  const titleFam = familyOf((listing && (listing.title + ' ' + (listing.subcategoryName || listing.subcategory || ''))) || '');
  const firstFam = familyOf(imgs[0]);
  const keep = [imgs[0]];
  imgs.forEach((src, i) => {
    if (i === 0 || blocked.has(i)) return;
    const fam = familyOf(src);
    if (!fam.length) { keep.push(src); return; }               // filename tells us nothing — keep it
    const sameAsTitle = fam.some(f => titleFam.includes(f));
    const sameAsFirst = fam.some(f => firstFam.includes(f));
    const clashesWithTitle = titleFam.length && !sameAsTitle;
    if (clashesWithTitle && !sameAsFirst) return;              // clearly a different garment — drop
    keep.push(src);
  });
  return keep;
}
