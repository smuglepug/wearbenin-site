/* ==========================================================================
   WearBenin v2 — OFFLINE FALLBACK ONLY.
   This file exists solely so the shell does not look broken when
   /api/health is unreachable. It contains a deliberately tiny sample and the
   UI shows an explicit "offline demo data" banner whenever it is used.
   NOTHING in the normal path reads from here.  (spec §2 / §1)
   ========================================================================== */

export const FALLBACK = {
  __fallback: true,
  meta: {
    categories: [
      { id: 'womens-fashion', name: "Women's Fashion", icon: 'chevronRight', count: 2, subs: [{ id: 'dresses-gowns', name: 'Dresses & Gowns' }, { id: 'blouses-tops', name: 'Blouses & Tops' }] },
      { id: 'mens-fashion', name: "Men's Fashion", icon: 'chevronRight', count: 2, subs: [{ id: 'shirts', name: 'Shirts' }, { id: 'trousers', name: 'Trousers' }] },
      { id: 'traditional', name: 'Traditional & Aso-Ebi', icon: 'sparkle', count: 2, subs: [{ id: 'agbada', name: 'Agbada' }, { id: 'iro-buba-w', name: 'Iro & Buba' }] },
      { id: 'footwear', name: 'Footwear', icon: 'chevronRight', count: 1, subs: [{ id: 'sneakers', name: 'Sneakers' }] },
      { id: 'bags-accessories', name: 'Bags & Accessories', icon: 'bag', count: 1, subs: [{ id: 'handbags', name: 'Handbags' }] },
      { id: 'kids-baby', name: 'Kids & Baby', icon: 'chevronRight', count: 0, subs: [{ id: 'girls', name: 'Girls' }] }
    ],
    areas: [
      { name: 'Oba Market', count: 1 }, { name: 'New Benin', count: 1 }, { name: 'Ring Road', count: 1 },
      { name: 'GRA', count: 1 }, { name: 'Uselu', count: 1 }, { name: 'Ekiosa', count: 1 },
      { name: 'Sapele Road', count: 1 }, { name: 'Aduwawa', count: 1 }
    ],
    popularSearches: ['agbada', 'ankara dress', 'gele', 'sneakers', 'iro and buba', 'lace fabric'],
    stats: { listings: 8, vendors: 3, newToday: 2 }
  },
  listings: [
    { id: 1, slug: 'aso-ebi-lace-gown', title: 'Aso-Ebi Lace Gown — Off-Shoulder (Multicolour)', category: 'womens-fashion', subcategory: 'dresses-gowns', condition: 'Brand New', price: 45000, negotiable: 1, area: 'Oba Market', hot: 1, featured: 1, status: 'active', views: 128, vendor_name: "Mama Vero's Ankara", vendor_slug: 'mama-veros-ankara', vendor_verified: 1, vendor_whatsapp: '2348031234501', vendor_avatar: null, published_at: new Date(Date.now() - 2 * 864e5).toISOString(), images: '["https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/A_BEAUTIFUL_Ankara_dress.jpg/960px-A_BEAUTIFUL_Ankara_dress.jpg"]', sizes: 'M,L,XL', colors: 'Multicolour' },
    { id: 2, slug: 'ankara-flare-dress', title: 'Ankara Flare Dress, Size M', category: 'womens-fashion', subcategory: 'dresses-gowns', condition: 'Brand New', price: 18500, negotiable: 0, area: 'New Benin', hot: 0, featured: 1, status: 'active', views: 74, vendor_name: "Aunty Efe's Boutique", vendor_slug: 'aunty-efes-boutique', vendor_verified: 1, vendor_whatsapp: '2348031234502', vendor_avatar: null, published_at: new Date(Date.now() - 5 * 864e5).toISOString(), images: '["https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/A_Nigerian_lady_in_Ankara_clothing.jpg/960px-A_Nigerian_lady_in_Ankara_clothing.jpg"]', sizes: 'M', colors: 'Green' },
    { id: 3, slug: 'iro-buba-george', title: 'Iro & Buba — Premium George Fabric Set', category: 'traditional', subcategory: 'iro-buba-w', condition: 'Brand New', price: 28000, negotiable: 1, area: 'Ring Road', hot: 0, featured: 0, status: 'active', views: 61, vendor_name: 'Uwa Fashion House', vendor_slug: 'uwa-fashion-house', vendor_verified: 0, vendor_whatsapp: '2348135792402', vendor_avatar: null, published_at: new Date(Date.now() - 6 * 864e5).toISOString(), images: '["https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Mofeboyo-iro-and-buba-2023.jpg/960px-Mofeboyo-iro-and-buba-2023.jpg"]', sizes: 'Free', colors: 'Gold' },
    { id: 4, slug: 'senegalese-kaftan', title: 'Senegalese Kaftan — Coral Pink', category: 'traditional', subcategory: 'kaftan', condition: 'Brand New', price: 35000, negotiable: 0, area: 'Uselu', hot: 1, featured: 0, status: 'active', views: 92, vendor_name: 'DeGreat Fabrics', vendor_slug: 'degreat-fabrics', vendor_verified: 0, vendor_whatsapp: '2347012781503', vendor_avatar: null, published_at: new Date(Date.now() - 4 * 864e5).toISOString(), images: '["https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Red_kaftan_detail.jpg/960px-Red_kaftan_detail.jpg"]', sizes: 'L,XL', colors: 'Coral Pink' },
    { id: 5, slug: 'agbada-3piece', title: '3-Piece Agbada Set with Embroidery', category: 'traditional', subcategory: 'agbada', condition: 'Brand New', price: 68000, negotiable: 1, area: 'New Benin', hot: 1, featured: 1, status: 'active', views: 210, vendor_name: 'Prince Uyi Agbada House', vendor_slug: 'prince-uyi-agbada-house', vendor_verified: 1, vendor_whatsapp: '2348128765406', vendor_avatar: null, published_at: new Date(Date.now() - 1 * 864e5).toISOString(), images: '["https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Boubou_homme.jpg/960px-Boubou_homme.jpg"]', sizes: 'XL,2XL', colors: 'White' },
    { id: 6, slug: 'white-sneakers', title: 'White Leather Sneakers (Brand New)', category: 'footwear', subcategory: 'sneakers', condition: 'Brand New', price: 22000, negotiable: 1, area: 'Aduwawa', hot: 0, featured: 0, status: 'active', views: 55, vendor_name: 'Empire Kicks', vendor_slug: 'empire-kicks', vendor_verified: 0, vendor_whatsapp: '2348055123458', vendor_avatar: null, published_at: new Date(Date.now() - 3 * 864e5).toISOString(), images: '["https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800"]', sizes: '41,42,43', colors: 'White' },
    { id: 7, slug: 'shoulder-handbag', title: 'Structured Shoulder Handbag — Tan', category: 'bags-accessories', subcategory: 'handbags', condition: 'Brand New', price: 26500, negotiable: 0, area: 'GRA', hot: 0, featured: 1, status: 'active', views: 44, vendor_name: "Tricia's Closet", vendor_slug: 'tricias-closet', vendor_verified: 1, vendor_whatsapp: '2348035181705', vendor_avatar: null, published_at: new Date(Date.now() - 7 * 864e5).toISOString(), images: '["https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=800"]', sizes: null, colors: 'Tan' },
    { id: 8, slug: 'gele-headwrap', title: 'Premium Gele Headwrap — Royal Print', category: 'traditional', subcategory: 'gele-headwear', condition: 'Brand New', price: 9500, negotiable: 1, area: 'Oba Market', hot: 0, featured: 0, status: 'active', views: 38, vendor_name: "Ada's Gele & Accessories", vendor_slug: 'adas-gele-accessories', vendor_verified: 0, vendor_whatsapp: '2349057643108', vendor_avatar: null, published_at: new Date(Date.now() - 2 * 864e5).toISOString(), images: '["https://thumb.wikimedia.org/wikipedia/commons/thumb/1/11/A_Royal_Couple.jpg/960px-A_Royal_Couple.jpg"]', sizes: null, colors: 'Gold' }
  ],
  vendors: [
    { id: 1, slug: 'mama-veros-ankara', name: "Mama Vero's Ankara", area: 'Oba Market', verified: 1, rating_avg: 4.8, rating_count: 34, since: 2018, bio: 'Ankara, lace and aso-ebi sets sewn in Oba Market since 2018.', response_minutes: 12, logo: null, instagram: 'mamaverosankara', whatsapp: '2348031234501' },
    { id: 2, slug: 'uwa-fashion-house', name: 'Uwa Fashion House', area: 'Ring Road', verified: 0, rating_avg: 4.5, rating_count: 19, since: 2022, bio: 'George fabric and traditional sets, Ring Road.', response_minutes: 25, logo: null, instagram: 'uwafashionhouse', whatsapp: '2348135792402' },
    { id: 3, slug: 'empire-kicks', name: 'Empire Kicks', area: 'Aduwawa', verified: 0, rating_avg: 4.3, rating_count: 27, since: 2021, bio: 'Sneakers and footwear, Aduwawa.', response_minutes: 40, logo: null, instagram: 'empirekicks', whatsapp: '2348055123458' }
  ]
};

export default FALLBACK;
