import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { query, getPool, closePool } from './db.js';

const img = {
  a: 'https://i.pinimg.com/736x/01/d6/17/01d61719d4fc1decd6902c72dc83bee9.jpg',
  b: 'https://i.pinimg.com/1200x/51/4a/5c/514a5cbf686ae9d2b76addd595707f99.jpg',
  c: 'https://i.pinimg.com/1200x/27/04/64/270464e0f0755532b2e8d1cffad91a4c.jpg',
  d: 'https://i.pinimg.com/736x/39/37/b7/3937b7a8cca92b69cc81e46ac1e6af5b.jpg',
};

async function seed() {
  // Clear existing data (order matters for FKs)
  await query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of ['wishlist', 'reviews', 'orders', 'products', 'categories', 'messages', 'coupons', 'users']) {
    await query(`TRUNCATE TABLE ${t}`);
  }
  await query('SET FOREIGN_KEY_CHECKS = 1');

  const cats = [
    ['T-Shirts', 'tshirts', 1],
    ['Shirts', 'shirts', 2],
    ['Trousers', 'trousers', 3],
    ['Outerwear', 'outerwear', 4],
    ['Knitwear', 'knitwear', 5],
    ['Accessories', 'accessories', 6],
  ];
  for (const [name, slug, sort] of cats) {
    await query(
      'INSERT INTO categories (name, slug, description, sort_order, active) VALUES (?, ?, NULL, ?, 1)',
      [name, slug, sort]
    );
  }

  const catRows = await query('SELECT id, slug FROM categories');
  const catMap = Object.fromEntries(catRows.map((c) => [c.slug, c.id]));

  const products = [
    ['Classic White Tee', 'Crafted from long-staple Egyptian cotton, this tee drapes beautifully and holds its shape wash after wash.', ['100% Egyptian cotton', 'Pre-shrunk and garment-dyed', 'Made in Portugal'], 49, 'tshirts', 'White', ['S', 'M', 'L', 'XL'], 25, 1, img.a],
    ['Essential Black Tee', 'The perfect black tee — deep, matte, and endlessly versatile. Cut for a relaxed but considered fit.', ['100% organic cotton', 'Relaxed but considered fit', 'Made in Portugal'], 49, 'tshirts', 'Black', ['S', 'M', 'L', 'XL'], 30, 1, img.b],
    ['Heritage Stripe Tee', 'A modern take on a classic Breton stripe. Midweight cotton with a soft hand-feel.', ['100% cotton', 'Yarn-dyed stripes', 'Made in Portugal'], 59, 'tshirts', 'Navy / White', ['S', 'M', 'L', 'XL'], 18, 0, img.c],
    ['Everyday Crew Tee', 'Your new daily uniform. Pre-shrunk, garment-dyed, and built to last.', ['100% cotton', 'Garment-dyed', 'Made in Portugal'], 45, 'tshirts', 'Stone', ['S', 'M', 'L', 'XL'], 40, 0, img.d],
    ['Oxford Button-Down', 'A refined oxford shirt with a soft collar and clean silhouette for everyday wear.', ['100% cotton oxford', 'Mother-of-pearl buttons', 'Made in Portugal'], 98, 'shirts', 'Sky Blue', ['S', 'M', 'L', 'XL'], 20, 1, img.a],
    ['Linen Camp Collar', 'Breathable linen shirt with a relaxed camp collar — ideal for warmer days.', ['100% linen', 'Camp collar', 'Made in Portugal'], 110, 'shirts', 'Natural', ['S', 'M', 'L', 'XL'], 15, 0, img.b],
    ['Tailored Wool Trousers', 'Clean-cut wool trousers with a modern tapered leg and refined drape.', ['Wool blend', 'Tapered fit', 'Made in Italy'], 165, 'trousers', 'Charcoal', ['30', '32', '34', '36'], 12, 1, img.c],
    ['Relaxed Chino', 'Soft stretch chinos with a comfortable rise and versatile neutral tone.', ['Cotton stretch', 'Garment-washed', 'Made in Portugal'], 89, 'trousers', 'Khaki', ['30', '32', '34', '36'], 22, 0, img.d],
    ['Wool Overcoat', 'A timeless single-breasted overcoat in heavyweight wool for cooler months.', ['100% wool', 'Fully lined', 'Made in Italy'], 320, 'outerwear', 'Camel', ['S', 'M', 'L', 'XL'], 8, 1, img.a],
    ['Merino Crew Sweater', 'Fine-gauge merino sweater with a clean crew neck and soft hand-feel.', ['100% merino wool', 'Fine gauge', 'Made in Scotland'], 145, 'knitwear', 'Navy', ['S', 'M', 'L', 'XL'], 16, 1, img.b],
    ['Cashmere Beanie', 'Soft cashmere beanie for everyday cold-weather comfort.', ['100% cashmere', 'Rib knit', 'Made in Italy'], 75, 'accessories', 'Grey', ['One Size'], 35, 0, img.d],
    ['Leather Belt', 'Vegetable-tanned leather belt with a minimal brushed-metal buckle.', ['Full-grain leather', 'Brushed metal buckle', 'Made in Italy'], 85, 'accessories', 'Black', ['S', 'M', 'L'], 28, 0, img.c],
  ];

  for (const [name, description, details, price, category, color, sizes, stock, featured, image] of products) {
    await query(
      `INSERT INTO products
        (name, description, details, price, category, category_id, color, sizes, stock, featured, is_active, image, images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        name,
        description,
        JSON.stringify(details),
        price,
        category,
        catMap[category] || null,
        color,
        JSON.stringify(sizes),
        stock,
        featured,
        image,
        JSON.stringify([image]),
      ]
    );
  }

  await query(
    `INSERT INTO users (name, email, password, is_admin, phone, addresses)
     VALUES (?, ?, ?, 1, '', ?), (?, ?, ?, 0, '', ?)`,
    [
      'Admin',
      'admin@atelierluxe.com',
      bcrypt.hashSync('admin123', 10),
      JSON.stringify([]),
      'Demo Customer',
      'demo@atelierluxe.com',
      bcrypt.hashSync('password123', 10),
      JSON.stringify([]),
    ]
  );

  await query(
    `INSERT INTO coupons (code, type, value, min_order, max_uses, used_count, active, expires_at)
     VALUES
       ('WELCOME10', 'percent', 10, 50, 1000, 0, 1, NULL),
       ('LUXE25', 'fixed', 25, 150, 100, 0, 1, NULL)`
  );

  const counts = await query(
    `SELECT
       (SELECT COUNT(*) FROM categories) AS categories,
       (SELECT COUNT(*) FROM products) AS products,
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM coupons) AS coupons`
  );

  console.log('Seed complete:');
  console.log(`  ${counts[0].categories} categories`);
  console.log(`  ${counts[0].products} products`);
  console.log(`  ${counts[0].users} users`);
  console.log(`  ${counts[0].coupons} coupons`);
  console.log('  Admin: admin@atelierluxe.com / admin123');
  console.log('  Customer: demo@atelierluxe.com / password123');

  await closePool();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  console.error('Make sure MySQL is running and you have run: npm run migrate');
  process.exit(1);
});
