# Gereksinim Analizi — CS308 Team 29

Tarih: 2026-06-10 · Branch: `main` (güncel)

Kod tabanı 17 gereksinimin tamamı için tek tek incelendi. Aşağıda her gereksinimin durumu, kanıtı ve karşılanmayanlar için geliştirme planı var.

## Özet Tablo

| # | Gereksinim (ağırlık) | Durum | Not |
|---|----------------------|-------|-----|
| 1 | Kategorili ürünler + sepet | ✅ MET | — |
| 2 | Belirli ürün tipi mağaza | ✅ MET | CS kursları mağazası (puanlı değil) |
| 3 | Stok / durum takibi (10%) | ✅ MET | Atomik stok düşümü, teslimat paneli, OrderStepper |
| 4 | Login-sonrası ödeme + fatura + PDF mail (10%) | ✅ MET | Mail SMTP yoksa `skipped` işaretleniyor |
| 5 | Yorum + puan, yorum onayı (10%) | ✅ MET | Puan anında, yorum onaydan sonra görünür |
| 6 | Profesyonel GUI (5%) | ✅ MET | — |
| 7 | Arama + sıralama, stoksuz aranabilir/eklenemez (10%) | ✅ MET | — |
| 8 | Mağaza + admin arayüzü (10%) | ✅ MET | — |
| 9 | Ürün özellikleri | ✅ MET | warrantyStatus virtual alan |
| 10 | Üç rol | ✅ MET | customer / product_manager / sales_manager |
| 11 | Satış müdürü: fiyat/indirim/fatura/gelir grafiği (10%) | ✅ MET | Wishlist indirim bildirimi + chart var |
| 12 | Ürün müdürü: ürün/kategori/stok/teslimat/yorum onayı (10%) | ✅ MET | Tüm alt yetenekler mevcut |
| 13 | Müşteri yetenekleri + özellikleri (10%) | ✅ MET | taxId, homeAddress mevcut |
| 14 | Kredi kartı ile ödeme (3%) | ✅ MET | Sadece last4 saklanıyor |
| 15 | İade/geri ödeme (10%) | ✅ MET (düzeltildi) | İade artık **sales_manager** tarafından; iki-fazlı `pending→approved→received` akışı eklendi |
| 16 | Güvenlik / şifreleme (1%) | ⚠️ PARTIAL | Faturalar ve hesap PII'si uygulama seviyesinde şifrelenmemiş |
| 17 | Eşzamanlılık (1%) | ✅ MET | Atomik `$inc` + `$gte` guard, idempotency key, unique index |

**Sonuç: 16/17 tam, 1 kısmi (REQ 16 şifreleme eksiği). REQ 15 düzeltildi.**

---

## Karşılanmayan / Eksik Gereksinimler (Detay + Plan)

### REQ 15 — İade değerlendirmesi yanlış rolde ✅ ÇÖZÜLDÜ (`feature/returns-sales-manager-role`)

**Şartname:** "The **sales manager** will evaluate the refund request and upon receiving the product back to the store will authorize the refund."

**Önceki durum:** İade onayını `product_manager` yapıyordu; refund+restock tek adımdaydı.

**Yapılan değişiklikler:**
1. `backend/routes/returns.js` — GET `/` ve PATCH `/:id` rol guard'ı `product_manager` → `sales_manager`.
2. İki-fazlı akış: `pending → approved (talep kabul, ürün bekleniyor) → received (ürün geldi → refund + restock)`. `reject` ayrı. Refund/restock artık yalnız `receive` adımında.
3. `backend/models/Return.js` — `received` statüsü, `receivedAt` ve `refundStatus` alanları eklendi.
4. Frontend — `ReturnsPanel` ManagerPage'den (ürün müdürü) çıkarıldı, `SalesManagerPage`'e "Returns & Refunds" sekmesi olarak eklendi; "Approve" + "Mark Received & Refund" aksiyonları.

**İndirim-bilinçli iade** zaten doğru: sipariş kalemine satın alma anındaki indirimli fiyat yazılıyor (`orders.js:202-207`), `totalRefund` o fiyattan hesaplanıyor.

**Doğrulama:** backend 134 test ✅, frontend 30 test ✅, build ✅.

### REQ 16 — Hassas veri şifreleme eksik ⚠️

**Şartname:** Hassas bilgiler şifreli saklanmalı: parolalar, kredi kartı, **faturalar**, **kullanıcı hesapları**.

**Mevcut durum:**
- ✅ Parolalar bcrypt ile hash'leniyor (`User.js:24-27`).
- ✅ Kredi kartı numarası hiç saklanmıyor, yalnız `cardLast4` (`mockBank.js`, `Order.js:47`) — kabul edilebilir.
- ✅ Rol ayrımı net (`roleGuard.js` DB rolünü kontrol ediyor).
- ❌ Faturalar (Order dokümanları) düz metin Mongo'da.
- ❌ Hesap PII'si (taxId, homeAddress, email) düz metin.
- ❌ Savunmacı middleware yok: helmet, rate-limit, mongo-sanitize; `cors()` tamamen açık.

**Plan:**
1. Uygulama-seviyesi alan şifreleme: hassas alanlar (`taxId`, `homeAddress`) için AES-256-GCM ile şifrele/çöz (örn. `mongoose-field-encryption` veya custom getter/setter). Anahtar `.env`'den.
2. Faturalar zaten Order'dan türetiliyor; hassas alanlar şifrelenince fatura da korunur. Gerekirse PDF üretimini at-rest saklamadan on-demand tut (zaten öyle).
3. Güvenlik middleware ekle: `helmet`, `express-rate-limit` (özellikle `/login`, `/register`, `/payments`), `express-mongo-sanitize`.
4. `cors()`'u frontend origin'iyle sınırla.
5. (Not) MongoDB Atlas zaten at-rest/in-transit şifreleme sağlıyor; rapora bunu da yaz — ödevde "1%" ağırlık, app-seviyesi alan şifreleme + middleware yeterli.

---

## Küçük İyileştirmeler (puansız ama değerli)

- **REQ 2:** Mağaza tipini (CS kursları) README'ye açıkça yaz.
- **REQ 7:** Arama sonuçlarında stoksuz ürünleri görsel olarak işaretle/filtre toggle ekle (şu an gösteriliyor ama ayırt edilmiyor).
- **Product modeli:** Kullanılmayan `stock` alanı (`Product.js:34`, default null) ile `quantityInStock` ikiliği var; `stock` kaldırılabilir.
