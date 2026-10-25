# Watches Store Backend

Node.js 18+, Express 4 aur MongoDB Atlas par bana watches store API. Tamam API routes `/api` ke neeche hain.

## Setup

1. Node.js 18 ya us se naya aur MongoDB Atlas database tayyar karein.
2. `.env.example` ko `.env` ke naam se copy karein. `MONGODB_URI`, kam az kam 32 characters ka `JWT_SECRET`, `ADMIN_EMAIL` aur `ADMIN_PASSWORD` set karein. `CLIENT_URL` mein frontend origins comma se alag likhein.
3. Dependencies install karein: `npm install`
4. Admin aur sample data banayein: `npm run seed`
5. Development server chalayein: `npm run dev`
6. Health check: `http://localhost:5000/api/health`; products: `http://localhost:5000/api/products`

Production mein `npm start` chalayein. Seed command dobara chalane par admin ya sample products duplicate nahi honge. Passwords bcrypt se hash hote hain aur checkout ki prices database se li jati hain.

## API

| Method | Path | Access | Kaam |
|---|---|---|---|
| GET | `/api/health` | Public | API health check |
| POST | `/api/auth/register` | Public | Customer account aur token |
| POST | `/api/auth/login` | Public | Login aur token |
| GET | `/api/auth/me` | Customer | Apna account |
| GET | `/api/products` | Public | Filters aur paging ke sath products |
| GET | `/api/products/:slug` | Public | Product, approved reviews aur related items |
| POST | `/api/products/:id/reviews` | Customer | Delivered order par review |
| GET | `/api/brands`, `/api/categories` | Public | Catalog lists |
| GET | `/api/settings` | Public | Store aur shipping settings |
| POST | `/api/orders` | Guest/customer | Checkout |
| GET | `/api/orders/track?orderNumber=&phone=` | Public | Phone se order tracking |
| GET | `/api/orders/my` | Customer | Apne orders |
| GET | `/api/orders/:id` | Owner/staff/admin | Order detail |
| PATCH | `/api/orders/:id/cancel` | Customer | Apna pending order cancel |
| PUT | `/api/account/profile` | Customer | Profile update |
| POST | `/api/account/change-password` | Customer | Password update |
| POST/DELETE | `/api/account/addresses` | Customer | Address add/remove |
| GET | `/api/account/wishlist` | Customer | Wishlist |
| POST | `/api/account/wishlist/:productId` | Customer | Wishlist toggle |
| GET | `/api/admin/dashboard` | Staff/admin | Sales, orders aur stock summary |
| GET/POST/PUT/DELETE | `/api/admin/products` | Staff/admin; delete admin | Product management |
| POST/PUT/DELETE | `/api/admin/brands`, `/api/admin/categories` | Staff/admin; delete admin | Catalog management |
| GET/PATCH | `/api/admin/orders` | Staff/admin | Orders list, status aur payment |
| GET | `/api/admin/customers` | Staff/admin | Customers aur spending |
| GET/POST/PUT/DELETE | `/api/admin/coupons` | Staff/admin | Coupon management |
| GET/PATCH/DELETE | `/api/admin/reviews` | Staff/admin | Reviews aur approval |
| PATCH | `/api/admin/users/:id/role` | Admin | Role update |
| GET/PUT | `/api/admin/settings/shipping` | Admin | Shipping settings |

Protected routes par `Authorization: Bearer <token>` bhejein. Product filters mein `brand`, `category`, `gender`, `movement`, `strap`, `minPrice`, `maxPrice`, `q`, `featured`, `sort`, `page` aur `limit` shamil hain.