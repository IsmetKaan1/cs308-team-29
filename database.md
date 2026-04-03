// ============================================================
// ONLINE KURS PLATFORMU - MongoDB ŞEMASI
// Üniversite Dersleri & Online Video Kursları
// ============================================================
// Çalıştırmak için: mongosh < this_file.js
// veya MongoDB Compass / Atlas üzerinden çalıştırabilirsiniz.
// ============================================================

use("online_kurs_platformu");


// ============================================================
// 1. KOLEKSİYONLAR & VALİDASYON KURALLARI
// ============================================================

// ---------- KATEGORİLER (Hiyerarşik: Fakülte → Bölüm → Alt Alan) ----------
db.createCollection("categories", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "slug"],
      properties: {
        name:        { bsonType: "string", description: "Kategori adı" },
        slug:        { bsonType: "string", description: "SEO dostu URL parçası" },
        parent_id:   { bsonType: ["objectId", "null"], description: "Üst kategori; null ise kök" },
        description: { bsonType: "string" },
        icon_url:    { bsonType: "string" },
        sort_order:  { bsonType: "int" },
        is_active:   { bsonType: "bool" },
        created_at:  { bsonType: "date" },
        updated_at:  { bsonType: "date" }
      }
    }
  }
});

db.categories.createIndex({ slug: 1 }, { unique: true });
db.categories.createIndex({ parent_id: 1 });
db.categories.createIndex({ is_active: 1 });


// ---------- EĞİTMENLER ----------
db.createCollection("instructors", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["first_name", "last_name", "email"],
      properties: {
        first_name:    { bsonType: "string" },
        last_name:     { bsonType: "string" },
        email:         { bsonType: "string" },
        phone:         { bsonType: "string" },
        title:         { bsonType: "string", description: "Prof. Dr., Doç. Dr. vb." },
        university:    { bsonType: "string" },
        department:    { bsonType: "string" },
        bio:           { bsonType: "string" },
        profile_photo: { bsonType: "string" },
        website_url:   { bsonType: "string" },
        is_active:     { bsonType: "bool" },
        created_at:    { bsonType: "date" },
        updated_at:    { bsonType: "date" }
      }
    }
  }
});

db.instructors.createIndex({ email: 1 }, { unique: true });


// ---------- KURSLAR (ANA ÜRÜN - Zengin Gömülü Doküman) ----------
db.createCollection("courses", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "slug", "instructor_id", "level", "price"],
      properties: {
        title:             { bsonType: "string" },
        slug:              { bsonType: "string" },
        subtitle:          { bsonType: "string" },
        description:       { bsonType: "string" },
        instructor_id:     { bsonType: "objectId" },
        // Sık okunan eğitmen bilgisi gömülü (denormalize)
        instructor_snapshot: {
          bsonType: "object",
          properties: {
            name:       { bsonType: "string" },
            title:      { bsonType: "string" },
            university: { bsonType: "string" },
            photo:      { bsonType: "string" }
          }
        },
        // Kategori referansları + gömülü bilgi
        categories: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              category_id: { bsonType: "objectId" },
              name:        { bsonType: "string" },
              slug:        { bsonType: "string" },
              is_primary:  { bsonType: "bool" }
            }
          }
        },
        tags: {
          bsonType: "array",
          items: { bsonType: "string" }
        },
        learning_outcomes: {
          bsonType: "array",
          items: { bsonType: "string" }
        },
        requirements: {
          bsonType: "array",
          items: { bsonType: "string" }
        },
        level: {
          bsonType: "string",
          enum: ["beginner", "intermediate", "advanced"]
        },
        language:    { bsonType: "string" },
        pricing: {
          bsonType: "object",
          properties: {
            price:          { bsonType: "double" },
            discount_price: { bsonType: ["double", "null"] },
            currency:       { bsonType: "string" }
          }
        },
        price: { bsonType: "double" },
        media: {
          bsonType: "object",
          properties: {
            thumbnail_url: { bsonType: "string" },
            preview_video: { bsonType: "string" }
          }
        },
        stats: {
          bsonType: "object",
          properties: {
            total_duration_minutes: { bsonType: "int" },
            total_lectures:         { bsonType: "int" },
            enrollment_count:       { bsonType: "int" },
            avg_rating:             { bsonType: "double" },
            review_count:           { bsonType: "int" }
          }
        },
        // -------- BÖLÜMLER & DERSLER (Gömülü) --------
        sections: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["title", "sort_order", "lectures"],
            properties: {
              _id:         { bsonType: "objectId" },
              title:       { bsonType: "string" },
              description: { bsonType: "string" },
              sort_order:  { bsonType: "int" },
              lectures: {
                bsonType: "array",
                items: {
                  bsonType: "object",
                  required: ["title", "sort_order"],
                  properties: {
                    _id:             { bsonType: "objectId" },
                    title:           { bsonType: "string" },
                    description:     { bsonType: "string" },
                    video_url:       { bsonType: "string" },
                    video_provider:  {
                      bsonType: "string",
                      enum: ["internal", "vimeo", "youtube", "bunny", "s3"]
                    },
                    duration_minutes: { bsonType: "int" },
                    is_free_preview:  { bsonType: "bool" },
                    sort_order:       { bsonType: "int" },
                    content_type: {
                      bsonType: "string",
                      enum: ["video", "article", "quiz", "assignment", "resource"]
                    },
                    attachments: {
                      bsonType: "array",
                      items: {
                        bsonType: "object",
                        properties: {
                          file_name:       { bsonType: "string" },
                          file_url:        { bsonType: "string" },
                          file_type:       { bsonType: "string" },
                          file_size_bytes: { bsonType: "long" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        is_published: { bsonType: "bool" },
        is_featured:  { bsonType: "bool" },
        published_at: { bsonType: "date" },
        created_at:   { bsonType: "date" },
        updated_at:   { bsonType: "date" }
      }
    }
  }
});

db.courses.createIndex({ slug: 1 }, { unique: true });
db.courses.createIndex({ instructor_id: 1 });
db.courses.createIndex({ "categories.category_id": 1 });
db.courses.createIndex({ tags: 1 });
db.courses.createIndex({ is_published: 1, published_at: -1 });
db.courses.createIndex({ price: 1 });
db.courses.createIndex({ level: 1 });
db.courses.createIndex({ "stats.avg_rating": -1 });
db.courses.createIndex({ "stats.enrollment_count": -1 });
// Metin arama indeksi
db.courses.createIndex(
  { title: "text", subtitle: "text", description: "text", tags: "text" },
  { weights: { title: 10, subtitle: 5, tags: 8, description: 2 }, name: "course_text_search" }
);


// ---------- KULLANICILAR (Genişletilmiş: Adres, Fatura Bilgisi, Sepet) ----------
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["first_name", "last_name", "email", "password_hash"],
      properties: {
        first_name:     { bsonType: "string" },
        last_name:      { bsonType: "string" },
        email:          { bsonType: "string" },
        password_hash:  { bsonType: "string" },
        phone:          { bsonType: "string" },
        university:     { bsonType: "string" },
        department:     { bsonType: "string" },
        profile_photo:  { bsonType: "string" },
        role: {
          bsonType: "string",
          enum: ["student", "admin", "moderator"]
        },
        // ---------- FATURA / KİMLİK BİLGİLERİ ----------
        billing_info: {
          bsonType: "object",
          description: "e-Fatura / e-Arşiv için gerekli bilgiler",
          properties: {
            type: {
              bsonType: "string",
              enum: ["individual", "corporate"],
              description: "individual=Bireysel, corporate=Kurumsal"
            },
            identity_number:  { bsonType: "string", description: "TC Kimlik No (bireysel)" },
            company_name:     { bsonType: "string", description: "Firma ünvanı (kurumsal)" },
            tax_office:       { bsonType: "string", description: "Vergi dairesi (kurumsal)" },
            tax_number:       { bsonType: "string", description: "Vergi no (kurumsal)" },
            billing_address: {
              bsonType: "object",
              properties: {
                full_name:   { bsonType: "string" },
                address_line: { bsonType: "string" },
                district:    { bsonType: "string", description: "İlçe" },
                city:        { bsonType: "string", description: "İl" },
                postal_code: { bsonType: "string" },
                country:     { bsonType: "string" }
              }
            }
          }
        },
        // ---------- SEPET (Gömülü - kullanıcı başına tek sepet) ----------
        cart: {
          bsonType: "object",
          description: "Aktif alışveriş sepeti",
          properties: {
            items: {
              bsonType: "array",
              items: {
                bsonType: "object",
                properties: {
                  course_id:     { bsonType: "objectId" },
                  course_title:  { bsonType: "string" },
                  thumbnail_url: { bsonType: "string" },
                  instructor:    { bsonType: "string" },
                  original_price:  { bsonType: "double" },
                  discount_price:  { bsonType: ["double", "null"] },
                  added_at:        { bsonType: "date" }
                }
              }
            },
            coupon_code:     { bsonType: ["string", "null"] },
            coupon_discount: { bsonType: "double" },
            updated_at:      { bsonType: "date" }
          }
        },
        // ---------- İSTEK LİSTESİ ----------
        wishlist: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              course_id:    { bsonType: "objectId" },
              course_title: { bsonType: "string" },
              added_at:     { bsonType: "date" }
            }
          }
        },
        is_active:       { bsonType: "bool" },
        email_verified:  { bsonType: "bool" },
        last_login_at:   { bsonType: "date" },
        created_at:      { bsonType: "date" },
        updated_at:      { bsonType: "date" }
      }
    }
  }
});

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ "cart.items.course_id": 1 });
db.users.createIndex({ "billing_info.identity_number": 1 }, { sparse: true });
db.users.createIndex({ "billing_info.tax_number": 1 }, { sparse: true });


// ---------- KAYITLAR (Enrollments) ----------
db.createCollection("enrollments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "course_id"],
      properties: {
        user_id:      { bsonType: "objectId" },
        course_id:    { bsonType: "objectId" },
        order_id:     { bsonType: "objectId" },
        // Kurs bilgisi snapshot (hızlı okuma için)
        course_snapshot: {
          bsonType: "object",
          properties: {
            title:         { bsonType: "string" },
            thumbnail_url: { bsonType: "string" },
            instructor:    { bsonType: "string" }
          }
        },
        enrolled_at:  { bsonType: "date" },
        expires_at:   { bsonType: ["date", "null"] },
        progress_pct: { bsonType: "double" },
        completed_at: { bsonType: ["date", "null"] },
        // Ders bazında ilerleme (gömülü)
        lecture_progress: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              lecture_id:      { bsonType: "objectId" },
              watched_seconds: { bsonType: "int" },
              total_seconds:   { bsonType: "int" },
              is_completed:    { bsonType: "bool" },
              last_position:   { bsonType: "int" },
              completed_at:    { bsonType: ["date", "null"] },
              updated_at:      { bsonType: "date" }
            }
          }
        }
      }
    }
  }
});

db.enrollments.createIndex({ user_id: 1, course_id: 1 }, { unique: true });
db.enrollments.createIndex({ course_id: 1 });
db.enrollments.createIndex({ user_id: 1, progress_pct: 1 });


// ---------- SİPARİŞLER ----------
db.createCollection("orders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "order_number", "net_amount"],
      properties: {
        user_id:      { bsonType: "objectId" },
        order_number: { bsonType: "string" },
        // Sipariş kalemleri gömülü
        items: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              course_id:      { bsonType: "objectId" },
              course_title:   { bsonType: "string" },
              price:          { bsonType: "double" },
              discount_amount:{ bsonType: "double" }
            }
          }
        },
        total_amount:    { bsonType: "double" },
        discount_amount: { bsonType: "double" },
        net_amount:      { bsonType: "double" },
        currency:        { bsonType: "string" },
        payment: {
          bsonType: "object",
          properties: {
            method:         { bsonType: "string" },
            status:         {
              bsonType: "string",
              enum: ["pending", "completed", "failed", "refunded"]
            },
            transaction_id: { bsonType: "string" },
            paid_at:        { bsonType: "date" }
          }
        },
        order_status: {
          bsonType: "string",
          enum: ["pending", "completed", "cancelled", "refunded"]
        },
        coupon_code: { bsonType: "string" },
        ip_address:  { bsonType: "string" },
        created_at:  { bsonType: "date" },
        updated_at:  { bsonType: "date" }
      }
    }
  }
});

db.orders.createIndex({ order_number: 1 }, { unique: true });
db.orders.createIndex({ user_id: 1, created_at: -1 });
db.orders.createIndex({ "payment.status": 1, order_status: 1 });
db.orders.createIndex({ created_at: -1 });


// ---------- FATURALAR (e-Arşiv / e-Fatura) ----------
db.createCollection("invoices", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["order_id", "user_id", "invoice_number", "invoice_type", "status"],
      properties: {
        order_id:       { bsonType: "objectId" },
        user_id:        { bsonType: "objectId" },
        invoice_number: { bsonType: "string", description: "FTR-2026-000001 formatında sıralı numara" },
        invoice_type: {
          bsonType: "string",
          enum: ["e_archive", "e_invoice"],
          description: "e_archive=e-Arşiv (bireysel), e_invoice=e-Fatura (kurumsal)"
        },
        invoice_date:   { bsonType: "date" },
        // Alıcı bilgileri (sipariş anındaki snapshot)
        buyer: {
          bsonType: "object",
          properties: {
            type:            { bsonType: "string", enum: ["individual", "corporate"] },
            full_name:       { bsonType: "string" },
            identity_number: { bsonType: "string" },
            company_name:    { bsonType: "string" },
            tax_office:      { bsonType: "string" },
            tax_number:      { bsonType: "string" },
            email:           { bsonType: "string" },
            phone:           { bsonType: "string" },
            address: {
              bsonType: "object",
              properties: {
                address_line: { bsonType: "string" },
                district:     { bsonType: "string" },
                city:         { bsonType: "string" },
                postal_code:  { bsonType: "string" },
                country:      { bsonType: "string" }
              }
            }
          }
        },
        // Satıcı bilgileri
        seller: {
          bsonType: "object",
          properties: {
            company_name: { bsonType: "string" },
            tax_office:   { bsonType: "string" },
            tax_number:   { bsonType: "string" },
            address:      { bsonType: "string" },
            email:        { bsonType: "string" },
            phone:        { bsonType: "string" }
          }
        },
        // Fatura kalemleri
        line_items: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              description:    { bsonType: "string", description: "Kurs adı" },
              course_id:      { bsonType: "objectId" },
              quantity:        { bsonType: "int" },
              unit_price:      { bsonType: "double", description: "KDV hariç birim fiyat" },
              discount_amount: { bsonType: "double" },
              vat_rate:        { bsonType: "double", description: "KDV oranı (ör: 20)" },
              vat_amount:      { bsonType: "double" },
              line_total:      { bsonType: "double", description: "KDV dahil satır toplamı" }
            }
          }
        },
        // Fatura toplamları
        totals: {
          bsonType: "object",
          properties: {
            subtotal:         { bsonType: "double", description: "KDV hariç toplam" },
            total_discount:   { bsonType: "double" },
            total_vat:        { bsonType: "double" },
            grand_total:      { bsonType: "double", description: "KDV dahil genel toplam" },
            currency:         { bsonType: "string" }
          }
        },
        // Durum & GİB entegrasyonu
        status: {
          bsonType: "string",
          enum: ["draft", "issued", "sent", "cancelled"],
          description: "draft=Taslak, issued=Kesildi, sent=Gönderildi, cancelled=İptal"
        },
        gib_uuid:       { bsonType: "string", description: "GİB evrensel tekil tanımlayıcı (ETTN)" },
        gib_response:   { bsonType: "string", description: "GİB dönüş mesajı" },
        pdf_url:        { bsonType: "string", description: "Fatura PDF indirme linki" },
        sent_to_email:  { bsonType: "bool" },
        notes:          { bsonType: "string", description: "Fatura notu" },
        created_at:     { bsonType: "date" },
        updated_at:     { bsonType: "date" }
      }
    }
  }
});

db.invoices.createIndex({ invoice_number: 1 }, { unique: true });
db.invoices.createIndex({ order_id: 1 }, { unique: true });
db.invoices.createIndex({ user_id: 1, invoice_date: -1 });
db.invoices.createIndex({ status: 1 });
db.invoices.createIndex({ invoice_date: -1 });
db.invoices.createIndex({ gib_uuid: 1 }, { sparse: true, unique: true });


// ---------- DEĞERLENDİRMELER ----------
db.createCollection("reviews", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "course_id", "rating"],
      properties: {
        user_id:   { bsonType: "objectId" },
        course_id: { bsonType: "objectId" },
        // Hızlı gösterim için gömülü
        user_snapshot: {
          bsonType: "object",
          properties: {
            name:  { bsonType: "string" },
            photo: { bsonType: "string" }
          }
        },
        rating:      { bsonType: "int", minimum: 1, maximum: 5 },
        comment:     { bsonType: "string" },
        is_approved: { bsonType: "bool" },
        created_at:  { bsonType: "date" },
        updated_at:  { bsonType: "date" }
      }
    }
  }
});

db.reviews.createIndex({ user_id: 1, course_id: 1 }, { unique: true });
db.reviews.createIndex({ course_id: 1, is_approved: 1, rating: -1 });


// ---------- KUPONLAR ----------
db.createCollection("coupons", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["code", "discount_type", "discount_value", "valid_from", "valid_until"],
      properties: {
        code:             { bsonType: "string" },
        discount_type:    { bsonType: "string", enum: ["percent", "fixed"] },
        discount_value:   { bsonType: "double" },
        min_order_amount: { bsonType: "double" },
        max_uses:         { bsonType: "int" },
        current_uses:     { bsonType: "int" },
        valid_from:       { bsonType: "date" },
        valid_until:      { bsonType: "date" },
        is_active:        { bsonType: "bool" },
        created_at:       { bsonType: "date" }
      }
    }
  }
});

db.coupons.createIndex({ code: 1 }, { unique: true });
db.coupons.createIndex({ is_active: 1, valid_from: 1, valid_until: 1 });


// ============================================================
// 2. ÖRNEK VERİLER
// ============================================================

// ---------- KATEGORİLER ----------
const catIds = {
  muhendislik:  ObjectId(),
  iibf:         ObjectId(),
  fenEdebiyat:  ObjectId(),
  hukuk:        ObjectId(),
  tipSaglik:    ObjectId(),
  bilgisayar:   ObjectId(),
  elektrik:     ObjectId(),
  makine:       ObjectId(),
  isletme:      ObjectId(),
  iktisat:      ObjectId(),
  matematik:    ObjectId(),
  fizik:        ObjectId()
};

db.categories.insertMany([
  // Kök kategoriler
  {
    _id: catIds.muhendislik, parent_id: null,
    name: "Mühendislik", slug: "muhendislik",
    description: "Mühendislik fakültesi dersleri",
    sort_order: 1, is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  {
    _id: catIds.iibf, parent_id: null,
    name: "İktisadi ve İdari Bilimler", slug: "iktisadi-idari",
    description: "İİBF dersleri",
    sort_order: 2, is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  {
    _id: catIds.fenEdebiyat, parent_id: null,
    name: "Fen-Edebiyat", slug: "fen-edebiyat",
    description: "Fen-Edebiyat fakültesi dersleri",
    sort_order: 3, is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  {
    _id: catIds.hukuk, parent_id: null,
    name: "Hukuk", slug: "hukuk",
    description: "Hukuk fakültesi dersleri",
    sort_order: 4, is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  {
    _id: catIds.tipSaglik, parent_id: null,
    name: "Tıp ve Sağlık", slug: "tip-saglik",
    description: "Tıp ve sağlık bilimleri dersleri",
    sort_order: 5, is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  // Alt kategoriler: Mühendislik
  {
    _id: catIds.bilgisayar, parent_id: catIds.muhendislik,
    name: "Bilgisayar Mühendisliği", slug: "bilgisayar-muhendisligi",
    description: "Yazılım, donanım, algoritmalar",
    sort_order: 1, is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  {
    _id: catIds.elektrik, parent_id: catIds.muhendislik,
    name: "Elektrik-Elektronik", slug: "elektrik-elektronik",
    description: "Devre, sinyal, güç sistemleri",
    sort_order: 2, is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  {
    _id: catIds.makine, parent_id: catIds.muhendislik,
    name: "Makine Mühendisliği", slug: "makine-muhendisligi",
    description: "Termodinamik, mekanik, tasarım",
    sort_order: 3, is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  // Alt kategoriler: İİBF
  {
    _id: catIds.isletme, parent_id: catIds.iibf,
    name: "İşletme", slug: "isletme",
    description: "Yönetim, pazarlama, finans",
    sort_order: 1, is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  {
    _id: catIds.iktisat, parent_id: catIds.iibf,
    name: "İktisat", slug: "iktisat",
    description: "Mikro/Makro iktisat, ekonometri",
    sort_order: 2, is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  // Alt kategoriler: Fen-Edebiyat
  {
    _id: catIds.matematik, parent_id: catIds.fenEdebiyat,
    name: "Matematik", slug: "matematik",
    description: "Analiz, cebir, istatistik",
    sort_order: 1, is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  {
    _id: catIds.fizik, parent_id: catIds.fenEdebiyat,
    name: "Fizik", slug: "fizik",
    description: "Mekanik, elektromanyetizma, optik",
    sort_order: 2, is_active: true,
    created_at: new Date(), updated_at: new Date()
  }
]);


// ---------- EĞİTMENLER ----------
const instrIds = {
  ahmet:  ObjectId(),
  elif:   ObjectId(),
  mehmet: ObjectId(),
  zeynep: ObjectId(),
  can:    ObjectId()
};

db.instructors.insertMany([
  {
    _id: instrIds.ahmet,
    first_name: "Ahmet", last_name: "Yılmaz",
    email: "ahmet.yilmaz@university.edu",
    title: "Prof. Dr.",
    university: "İstanbul Teknik Üniversitesi",
    department: "Bilgisayar Mühendisliği",
    bio: "20 yıllık akademik deneyime sahip, algoritma ve veri yapıları alanında uzman.",
    is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  {
    _id: instrIds.elif,
    first_name: "Elif", last_name: "Kaya",
    email: "elif.kaya@university.edu",
    title: "Doç. Dr.",
    university: "Boğaziçi Üniversitesi",
    department: "İktisat",
    bio: "Makroekonomi ve ekonometri alanlarında çok sayıda uluslararası yayına sahip.",
    is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  {
    _id: instrIds.mehmet,
    first_name: "Mehmet", last_name: "Demir",
    email: "mehmet.demir@university.edu",
    title: "Dr. Öğr. Üyesi",
    university: "ODTÜ",
    department: "Matematik",
    bio: "Diferansiyel denklemler ve lineer cebir alanında ödüllü eğitimci.",
    is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  {
    _id: instrIds.zeynep,
    first_name: "Zeynep", last_name: "Arslan",
    email: "zeynep.arslan@university.edu",
    title: "Prof. Dr.",
    university: "Ankara Üniversitesi",
    department: "Hukuk",
    bio: "Medeni hukuk ve borçlar hukuku alanında Türkiye'nin önde gelen isimlerinden.",
    is_active: true,
    created_at: new Date(), updated_at: new Date()
  },
  {
    _id: instrIds.can,
    first_name: "Can", last_name: "Öztürk",
    email: "can.ozturk@university.edu",
    title: "Doç. Dr.",
    university: "Hacettepe Üniversitesi",
    department: "Tıp - Anatomi",
    bio: "Anatomi eğitiminde 3D modelleme ve video içerik üreticisi.",
    is_active: true,
    created_at: new Date(), updated_at: new Date()
  }
]);


// ---------- KURSLAR (Gömülü bölüm & ders yapısıyla) ----------
const courseIds = {
  veriYapilari:   ObjectId(),
  makroekonomi:   ObjectId(),
  lineerCebir:    ObjectId(),
  borclarHukuku:  ObjectId(),
  anatomi:        ObjectId(),
  pythonOop:      ObjectId()
};

// Ders ID'leri (ilerleme takibi için referans)
const lectureIds = {
  ds001: ObjectId(), ds002: ObjectId(), ds003: ObjectId(), ds004: ObjectId(), ds005: ObjectId(),
  ds006: ObjectId(), ds007: ObjectId(), ds008: ObjectId(), ds009: ObjectId(), ds010: ObjectId(),
  eco001: ObjectId(), eco002: ObjectId()
};

db.courses.insertMany([
  // ---- KURS 1: Veri Yapıları ve Algoritmalar ----
  {
    _id: courseIds.veriYapilari,
    title: "Veri Yapıları ve Algoritmalar",
    slug: "veri-yapilari-algoritmalar",
    subtitle: "Sıfırdan ileri seviyeye algoritmik düşünme",
    description: "Bu kurs, bilgisayar mühendisliğinin temel taşı olan veri yapılarını ve algoritmaları kapsamlı şekilde ele alır. Diziler, bağlı listeler, ağaçlar, graf yapıları, sıralama ve arama algoritmalarını gerçek örneklerle öğreneceksiniz.",
    instructor_id: instrIds.ahmet,
    instructor_snapshot: {
      name: "Prof. Dr. Ahmet Yılmaz",
      title: "Prof. Dr.",
      university: "İstanbul Teknik Üniversitesi",
      photo: null
    },
    categories: [
      { category_id: catIds.bilgisayar, name: "Bilgisayar Mühendisliği", slug: "bilgisayar-muhendisligi", is_primary: true },
      { category_id: catIds.matematik,  name: "Matematik",               slug: "matematik",               is_primary: false }
    ],
    tags: ["algoritma", "veri-yapilari", "programlama", "bilgisayar"],
    learning_outcomes: [
      "Temel veri yapılarını anlama ve uygulama",
      "Algoritma karmaşıklık analizi (Big-O)",
      "Sıralama ve arama algoritmalarını kodlama",
      "Graf algoritmaları ile problem çözme"
    ],
    requirements: ["Temel programlama bilgisi (C veya Python önerilir)"],
    level: "intermediate",
    language: "tr",
    pricing: { price: 499.99, discount_price: 299.99, currency: "TRY" },
    price: 299.99,
    media: {
      thumbnail_url: "https://cdn.example.com/img/veri-yapilari-thumb.jpg",
      preview_video: "https://cdn.example.com/vids/ds-preview.mp4"
    },
    stats: {
      total_duration_minutes: 1840,
      total_lectures: 92,
      enrollment_count: 2,
      avg_rating: 5.0,
      review_count: 1
    },
    sections: [
      {
        _id: ObjectId(),
        title: "Giriş ve Temel Kavramlar",
        description: "Algoritma nedir, neden önemlidir?",
        sort_order: 1,
        lectures: [
          {
            _id: lectureIds.ds001,
            title: "Kursa Hoş Geldiniz",
            description: "Kursun içeriği ve hedefleri",
            video_url: "https://cdn.example.com/vids/ds-001.mp4",
            video_provider: "internal",
            duration_minutes: 8,
            is_free_preview: true,
            sort_order: 1,
            content_type: "video",
            attachments: []
          },
          {
            _id: lectureIds.ds002,
            title: "Algoritma Nedir?",
            description: "Algoritma tanımı ve günlük hayat örnekleri",
            video_url: "https://cdn.example.com/vids/ds-002.mp4",
            video_provider: "internal",
            duration_minutes: 22,
            is_free_preview: true,
            sort_order: 2,
            content_type: "video",
            attachments: []
          },
          {
            _id: lectureIds.ds003,
            title: "Big-O Notasyonu",
            description: "Zaman ve alan karmaşıklığı analizi",
            video_url: "https://cdn.example.com/vids/ds-003.mp4",
            video_provider: "internal",
            duration_minutes: 35,
            is_free_preview: false,
            sort_order: 3,
            content_type: "video",
            attachments: [
              { file_name: "BigO-Cheat-Sheet.pdf", file_url: "https://cdn.example.com/files/bigo-cheat.pdf", file_type: "pdf", file_size_bytes: NumberLong(524288) },
              { file_name: "Karmasiklik-Analizi-Slayt.pptx", file_url: "https://cdn.example.com/files/bigo-slides.pptx", file_type: "pptx", file_size_bytes: NumberLong(2097152) }
            ]
          },
          {
            _id: lectureIds.ds004,
            title: "Karmaşıklık Analizi Örnekleri",
            description: "O(1), O(n), O(n²), O(log n) örnekleri",
            video_url: "https://cdn.example.com/vids/ds-004.mp4",
            video_provider: "internal",
            duration_minutes: 28,
            is_free_preview: false,
            sort_order: 4,
            content_type: "video",
            attachments: []
          },
          {
            _id: lectureIds.ds005,
            title: "Bölüm 1 Quiz",
            description: "10 soruluk değerlendirme",
            video_url: null,
            video_provider: "internal",
            duration_minutes: 0,
            is_free_preview: false,
            sort_order: 5,
            content_type: "quiz",
            attachments: []
          }
        ]
      },
      {
        _id: ObjectId(),
        title: "Diziler ve Bağlı Listeler",
        description: "Statik ve dinamik veri yapıları",
        sort_order: 2,
        lectures: [
          {
            _id: lectureIds.ds006,
            title: "Dizi (Array) Temelleri",
            description: "Bellekte dizilerin yapısı",
            video_url: "https://cdn.example.com/vids/ds-006.mp4",
            video_provider: "internal",
            duration_minutes: 25,
            is_free_preview: false,
            sort_order: 1,
            content_type: "video",
            attachments: [
              { file_name: "Dizi-Ornekleri-Kod.zip", file_url: "https://cdn.example.com/files/array-code.zip", file_type: "zip", file_size_bytes: NumberLong(102400) }
            ]
          },
          {
            _id: lectureIds.ds007,
            title: "Dinamik Diziler",
            description: "ArrayList ve vektör yapıları",
            video_url: "https://cdn.example.com/vids/ds-007.mp4",
            video_provider: "internal",
            duration_minutes: 20,
            is_free_preview: false,
            sort_order: 2,
            content_type: "video",
            attachments: []
          },
          {
            _id: lectureIds.ds008,
            title: "Tek Yönlü Bağlı Liste",
            description: "Singly Linked List implementasyonu",
            video_url: "https://cdn.example.com/vids/ds-008.mp4",
            video_provider: "internal",
            duration_minutes: 30,
            is_free_preview: false,
            sort_order: 3,
            content_type: "video",
            attachments: []
          },
          {
            _id: lectureIds.ds009,
            title: "Çift Yönlü Bağlı Liste",
            description: "Doubly Linked List implementasyonu",
            video_url: "https://cdn.example.com/vids/ds-009.mp4",
            video_provider: "internal",
            duration_minutes: 28,
            is_free_preview: false,
            sort_order: 4,
            content_type: "video",
            attachments: []
          },
          {
            _id: lectureIds.ds010,
            title: "Bağlı Liste Problemleri",
            description: "LeetCode örnekleri ile pratik",
            video_url: "https://cdn.example.com/vids/ds-010.mp4",
            video_provider: "internal",
            duration_minutes: 40,
            is_free_preview: false,
            sort_order: 5,
            content_type: "video",
            attachments: []
          }
        ]
      },
      {
        _id: ObjectId(),
        title: "Yığın ve Kuyruk",
        description: "Stack ve Queue yapıları",
        sort_order: 3,
        lectures: []
      },
      {
        _id: ObjectId(),
        title: "Ağaç Yapıları",
        description: "BST, AVL, Heap",
        sort_order: 4,
        lectures: []
      },
      {
        _id: ObjectId(),
        title: "Graf Algoritmaları",
        description: "BFS, DFS, Dijkstra, Kruskal",
        sort_order: 5,
        lectures: []
      },
      {
        _id: ObjectId(),
        title: "Sıralama Algoritmaları",
        description: "Bubble, Merge, Quick, Heap Sort",
        sort_order: 6,
        lectures: []
      },
      {
        _id: ObjectId(),
        title: "Dinamik Programlama",
        description: "Memoization ve tabulasyon teknikleri",
        sort_order: 7,
        lectures: []
      }
    ],
    is_published: true,
    is_featured: true,
    published_at: new Date("2025-09-01"),
    created_at: new Date("2025-08-15"),
    updated_at: new Date()
  },

  // ---- KURS 2: Makroekonomi ----
  {
    _id: courseIds.makroekonomi,
    title: "Makroekonomi: Teori ve Uygulama",
    slug: "makroekonomi-teori-uygulama",
    subtitle: "Ekonomiyi büyük resimden anlayın",
    description: "Milli gelir, enflasyon, işsizlik, para politikası ve maliye politikası konularını güncel Türkiye örnekleriyle işleyen kapsamlı bir makroekonomi kursu.",
    instructor_id: instrIds.elif,
    instructor_snapshot: {
      name: "Doç. Dr. Elif Kaya",
      title: "Doç. Dr.",
      university: "Boğaziçi Üniversitesi",
      photo: null
    },
    categories: [
      { category_id: catIds.iktisat,  name: "İktisat",  slug: "iktisat",  is_primary: true },
      { category_id: catIds.isletme,  name: "İşletme",  slug: "isletme",  is_primary: false }
    ],
    tags: ["ekonomi", "finans", "makroekonomi"],
    learning_outcomes: [
      "Makroekonomik göstergeleri yorumlama",
      "IS-LM modeli analizi",
      "Para ve maliye politikası etkilerini anlama",
      "Dış ticaret ve döviz kuru dinamikleri"
    ],
    requirements: ["Mikro İktisat dersini almış olmak önerilir"],
    level: "intermediate",
    language: "tr",
    pricing: { price: 399.99, discount_price: null, currency: "TRY" },
    price: 399.99,
    media: {
      thumbnail_url: "https://cdn.example.com/img/makroekonomi-thumb.jpg",
      preview_video: "https://cdn.example.com/vids/eco-preview.mp4"
    },
    stats: {
      total_duration_minutes: 1260,
      total_lectures: 63,
      enrollment_count: 1,
      avg_rating: 4.0,
      review_count: 1
    },
    sections: [
      {
        _id: ObjectId(),
        title: "Makroekonomiye Giriş",
        description: "Temel kavramlar ve makroekonomik göstergeler",
        sort_order: 1,
        lectures: [
          {
            _id: lectureIds.eco001,
            title: "Makroekonomi Neden Önemli?",
            description: "Mikro vs Makro ayrımı",
            video_url: "https://cdn.example.com/vids/eco-001.mp4",
            video_provider: "internal",
            duration_minutes: 15,
            is_free_preview: true,
            sort_order: 1,
            content_type: "video",
            attachments: [
              { file_name: "Makroekonomi-Ders-Notlari.pdf", file_url: "https://cdn.example.com/files/macro-notes-w1.pdf", file_type: "pdf", file_size_bytes: NumberLong(1048576) }
            ]
          },
          {
            _id: lectureIds.eco002,
            title: "Temel Makroekonomik Değişkenler",
            description: "GSYİH, enflasyon, işsizlik tanımları",
            video_url: "https://cdn.example.com/vids/eco-002.mp4",
            video_provider: "internal",
            duration_minutes: 25,
            is_free_preview: false,
            sort_order: 2,
            content_type: "video",
            attachments: []
          }
        ]
      },
      {
        _id: ObjectId(),
        title: "Milli Gelir ve Büyüme",
        description: "GSYİH hesaplama yöntemleri",
        sort_order: 2,
        lectures: []
      },
      {
        _id: ObjectId(),
        title: "Para Politikası",
        description: "Merkez bankası araçları ve parasal aktarım mekanizması",
        sort_order: 3,
        lectures: []
      }
    ],
    is_published: true,
    is_featured: false,
    published_at: new Date("2025-10-15"),
    created_at: new Date("2025-10-01"),
    updated_at: new Date()
  },

  // ---- KURS 3: Lineer Cebir ----
  {
    _id: courseIds.lineerCebir,
    title: "Lineer Cebir",
    slug: "lineer-cebir",
    subtitle: "Mühendislik ve fen bilimleri için lineer cebir temelleri",
    description: "Matrisler, determinantlar, vektör uzayları, özdeğer-özvektör problemleri ve lineer dönüşümler konularını görsel anlatımlarla öğrenin.",
    instructor_id: instrIds.mehmet,
    instructor_snapshot: {
      name: "Dr. Öğr. Üyesi Mehmet Demir",
      title: "Dr. Öğr. Üyesi",
      university: "ODTÜ",
      photo: null
    },
    categories: [
      { category_id: catIds.matematik,  name: "Matematik",               slug: "matematik",               is_primary: true },
      { category_id: catIds.bilgisayar, name: "Bilgisayar Mühendisliği", slug: "bilgisayar-muhendisligi", is_primary: false },
      { category_id: catIds.elektrik,   name: "Elektrik-Elektronik",     slug: "elektrik-elektronik",     is_primary: false }
    ],
    tags: ["matematik", "lineer-cebir", "matris"],
    learning_outcomes: [
      "Matris işlemleri ve determinant hesaplama",
      "Vektör uzayları ve alt uzaylar",
      "Özdeğer ve özvektör problemlerini çözme",
      "Lineer dönüşümleri anlama"
    ],
    requirements: ["Lise matematiği bilgisi yeterlidir"],
    level: "beginner",
    language: "tr",
    pricing: { price: 349.99, discount_price: 249.99, currency: "TRY" },
    price: 249.99,
    media: {
      thumbnail_url: "https://cdn.example.com/img/lineer-cebir-thumb.jpg",
      preview_video: "https://cdn.example.com/vids/la-preview.mp4"
    },
    stats: {
      total_duration_minutes: 960,
      total_lectures: 48,
      enrollment_count: 2,
      avg_rating: 5.0,
      review_count: 1
    },
    sections: [],
    is_published: true,
    is_featured: false,
    published_at: new Date("2025-11-01"),
    created_at: new Date("2025-10-20"),
    updated_at: new Date()
  },

  // ---- KURS 4: Borçlar Hukuku ----
  {
    _id: courseIds.borclarHukuku,
    title: "Borçlar Hukuku Genel Hükümler",
    slug: "borclar-hukuku-genel",
    subtitle: "Hukuk fakültesi 2. sınıf temel dersi",
    description: "Borç ilişkisinin kaynakları, borçların ifası, ifa engelleri, haksız fiil ve sebepsiz zenginleşme konularını yargıtay kararları eşliğinde detaylı olarak işler.",
    instructor_id: instrIds.zeynep,
    instructor_snapshot: {
      name: "Prof. Dr. Zeynep Arslan",
      title: "Prof. Dr.",
      university: "Ankara Üniversitesi",
      photo: null
    },
    categories: [
      { category_id: catIds.hukuk, name: "Hukuk", slug: "hukuk", is_primary: true }
    ],
    tags: ["hukuk", "borclar-hukuku"],
    learning_outcomes: [
      "Borç ilişkisinin unsurlarını kavrama",
      "Sözleşme türlerini ayırt etme",
      "İfa engellerini analiz etme",
      "Haksız fiil şartlarını uygulama"
    ],
    requirements: ["Hukuka Giriş dersini tamamlamış olmak"],
    level: "intermediate",
    language: "tr",
    pricing: { price: 449.99, discount_price: null, currency: "TRY" },
    price: 449.99,
    media: {
      thumbnail_url: "https://cdn.example.com/img/borclar-hukuku-thumb.jpg",
      preview_video: "https://cdn.example.com/vids/law-preview.mp4"
    },
    stats: {
      total_duration_minutes: 1500,
      total_lectures: 75,
      enrollment_count: 1,
      avg_rating: 4.0,
      review_count: 1
    },
    sections: [],
    is_published: true,
    is_featured: false,
    published_at: new Date("2026-01-10"),
    created_at: new Date("2025-12-20"),
    updated_at: new Date()
  },

  // ---- KURS 5: İnsan Anatomisi ----
  {
    _id: courseIds.anatomi,
    title: "İnsan Anatomisi: Hareket Sistemi",
    slug: "insan-anatomisi-hareket-sistemi",
    subtitle: "3D modeller ve kadavra videolarıyla anatomi",
    description: "Kemikler, eklemler ve kasları 3D modeller, animasyonlar ve detaylı video anlatımlarla öğrenin. Tıp, diş hekimliği ve fizyoterapi öğrencileri için ideal.",
    instructor_id: instrIds.can,
    instructor_snapshot: {
      name: "Doç. Dr. Can Öztürk",
      title: "Doç. Dr.",
      university: "Hacettepe Üniversitesi",
      photo: null
    },
    categories: [
      { category_id: catIds.tipSaglik, name: "Tıp ve Sağlık", slug: "tip-saglik", is_primary: true }
    ],
    tags: ["tip", "anatomi", "saglik"],
    learning_outcomes: [
      "Kemik yapısını ve sınıflandırmayı bilme",
      "Eklem tiplerini ve hareketlerini anlama",
      "Kas gruplarını ve fonksiyonlarını öğrenme",
      "Klinik korelasyonları kavrama"
    ],
    requirements: ["Biyoloji temel bilgisi"],
    level: "beginner",
    language: "tr",
    pricing: { price: 549.99, discount_price: 399.99, currency: "TRY" },
    price: 399.99,
    media: {
      thumbnail_url: "https://cdn.example.com/img/anatomi-thumb.jpg",
      preview_video: "https://cdn.example.com/vids/anat-preview.mp4"
    },
    stats: {
      total_duration_minutes: 2100,
      total_lectures: 105,
      enrollment_count: 0,
      avg_rating: 0,
      review_count: 0
    },
    sections: [],
    is_published: true,
    is_featured: true,
    published_at: new Date("2026-02-01"),
    created_at: new Date("2026-01-15"),
    updated_at: new Date()
  },

  // ---- KURS 6: Python OOP (Yayınlanmamış) ----
  {
    _id: courseIds.pythonOop,
    title: "Python ile Nesne Yönelimli Programlama",
    slug: "python-oop",
    subtitle: "OOP prensiplerini Python ile uygulayın",
    description: "Sınıflar, nesneler, kalıtım, polimorfizm, enkapsülasyon ve soyutlama kavramlarını Python projeleriyle uygulayarak öğrenin.",
    instructor_id: instrIds.ahmet,
    instructor_snapshot: {
      name: "Prof. Dr. Ahmet Yılmaz",
      title: "Prof. Dr.",
      university: "İstanbul Teknik Üniversitesi",
      photo: null
    },
    categories: [
      { category_id: catIds.bilgisayar, name: "Bilgisayar Mühendisliği", slug: "bilgisayar-muhendisligi", is_primary: true }
    ],
    tags: ["python", "programlama", "oop"],
    learning_outcomes: [
      "OOP temel prensiplerini anlama",
      "Python sınıfları oluşturma",
      "Design pattern temelleri",
      "Gerçek dünya projesi geliştirme"
    ],
    requirements: ["Python temel bilgisi gereklidir"],
    level: "beginner",
    language: "tr",
    pricing: { price: 379.99, discount_price: 279.99, currency: "TRY" },
    price: 279.99,
    media: {
      thumbnail_url: "https://cdn.example.com/img/python-oop-thumb.jpg",
      preview_video: null
    },
    stats: {
      total_duration_minutes: 780,
      total_lectures: 39,
      enrollment_count: 0,
      avg_rating: 0,
      review_count: 0
    },
    sections: [],
    is_published: false,
    is_featured: false,
    published_at: null,
    created_at: new Date("2026-03-01"),
    updated_at: new Date()
  }
]);


// ---------- KULLANICILAR ----------
const userIds = {
  ali:   ObjectId(),
  seda:  ObjectId(),
  burak: ObjectId(),
  merve: ObjectId(),
  emre:  ObjectId()
};

db.users.insertMany([
  {
    _id: userIds.ali,
    first_name: "Ali", last_name: "Koç",
    email: "ali.koc@student.edu",
    password_hash: "$2b$12$examplehash1...",
    phone: "05321234567",
    university: "İTÜ", department: "Bilgisayar Müh.",
    role: "student", is_active: true, email_verified: true,
    billing_info: {
      type: "individual",
      identity_number: "12345678901",
      company_name: null, tax_office: null, tax_number: null,
      billing_address: {
        full_name: "Ali Koç",
        address_line: "Maslak Mah. İTÜ Ayazağa Kampüsü Yurt Blok No:3",
        district: "Sarıyer", city: "İstanbul",
        postal_code: "34469", country: "TR"
      }
    },
    cart: {
      items: [
        {
          course_id: courseIds.anatomi,
          course_title: "İnsan Anatomisi: Hareket Sistemi",
          thumbnail_url: "https://cdn.example.com/img/anatomi-thumb.jpg",
          instructor: "Doç. Dr. Can Öztürk",
          original_price: 549.99, discount_price: 399.99,
          added_at: new Date("2026-03-28T10:00:00")
        },
        {
          course_id: courseIds.pythonOop,
          course_title: "Python ile Nesne Yönelimli Programlama",
          thumbnail_url: "https://cdn.example.com/img/python-oop-thumb.jpg",
          instructor: "Prof. Dr. Ahmet Yılmaz",
          original_price: 379.99, discount_price: 279.99,
          added_at: new Date("2026-03-30T14:20:00")
        }
      ],
      coupon_code: "SINAV50",
      coupon_discount: 50.0,
      updated_at: new Date("2026-03-30T14:20:00")
    },
    wishlist: [],
    created_at: new Date("2025-12-01"), updated_at: new Date()
  },
  {
    _id: userIds.seda,
    first_name: "Seda", last_name: "Yıldız",
    email: "seda.yildiz@student.edu",
    password_hash: "$2b$12$examplehash2...",
    phone: "05339876543",
    university: "Boğaziçi", department: "İktisat",
    role: "student", is_active: true, email_verified: true,
    billing_info: {
      type: "individual",
      identity_number: "98765432109",
      company_name: null, tax_office: null, tax_number: null,
      billing_address: {
        full_name: "Seda Yıldız",
        address_line: "Bebek Mah. Rumelihisarı Cd. No:15 D:4",
        district: "Beşiktaş", city: "İstanbul",
        postal_code: "34342", country: "TR"
      }
    },
    cart: {
      items: [
        {
          course_id: courseIds.lineerCebir,
          course_title: "Lineer Cebir",
          thumbnail_url: "https://cdn.example.com/img/lineer-cebir-thumb.jpg",
          instructor: "Dr. Öğr. Üyesi Mehmet Demir",
          original_price: 349.99, discount_price: 249.99,
          added_at: new Date("2026-04-01T08:30:00")
        }
      ],
      coupon_code: null,
      coupon_discount: 0,
      updated_at: new Date("2026-04-01T08:30:00")
    },
    wishlist: [
      { course_id: courseIds.veriYapilari, course_title: "Veri Yapıları ve Algoritmalar", added_at: new Date("2026-02-10") }
    ],
    created_at: new Date("2025-12-15"), updated_at: new Date()
  },
  {
    _id: userIds.burak,
    first_name: "Burak", last_name: "Aydın",
    email: "burak.aydin@student.edu",
    password_hash: "$2b$12$examplehash3...",
    phone: "05411112233",
    university: "ODTÜ", department: "Elektrik-Elektr.",
    role: "student", is_active: true, email_verified: true,
    billing_info: {
      type: "individual",
      identity_number: "11223344556",
      company_name: null, tax_office: null, tax_number: null,
      billing_address: {
        full_name: "Burak Aydın",
        address_line: "Üniversiteler Mah. ODTÜ Yurt No:7 Oda:312",
        district: "Çankaya", city: "Ankara",
        postal_code: "06800", country: "TR"
      }
    },
    cart: { items: [], coupon_code: null, coupon_discount: 0, updated_at: new Date() },
    wishlist: [
      { course_id: courseIds.veriYapilari, course_title: "Veri Yapıları ve Algoritmalar", added_at: new Date("2026-01-20") }
    ],
    created_at: new Date("2026-01-05"), updated_at: new Date()
  },
  {
    _id: userIds.merve,
    first_name: "Merve", last_name: "Şahin",
    email: "merve.sahin@student.edu",
    password_hash: "$2b$12$examplehash4...",
    phone: "05367778899",
    university: "Ankara Üniv.", department: "Hukuk",
    role: "student", is_active: true, email_verified: true,
    billing_info: {
      type: "individual",
      identity_number: "55667788990",
      company_name: null, tax_office: null, tax_number: null,
      billing_address: {
        full_name: "Merve Şahin",
        address_line: "Cebeci Mah. Hukuk Fakültesi Cd. No:22 D:8",
        district: "Çankaya", city: "Ankara",
        postal_code: "06590", country: "TR"
      }
    },
    cart: { items: [], coupon_code: null, coupon_discount: 0, updated_at: new Date() },
    wishlist: [
      { course_id: courseIds.anatomi, course_title: "İnsan Anatomisi: Hareket Sistemi", added_at: new Date("2026-02-20") }
    ],
    created_at: new Date("2026-01-20"), updated_at: new Date()
  },
  {
    _id: userIds.emre,
    first_name: "Emre", last_name: "Çelik",
    email: "emre.celik@admin.edu",
    password_hash: "$2b$12$examplehash5...",
    phone: "05301010101",
    university: null, department: null,
    role: "admin", is_active: true, email_verified: true,
    billing_info: null,
    cart: { items: [], coupon_code: null, coupon_discount: 0, updated_at: new Date() },
    wishlist: [],
    created_at: new Date("2025-11-01"), updated_at: new Date()
  }
]);


// ---------- SİPARİŞLER ----------
const orderIds = {
  ord1: ObjectId(), ord2: ObjectId(), ord3: ObjectId(),
  ord4: ObjectId(), ord5: ObjectId()
};

db.orders.insertMany([
  {
    _id: orderIds.ord1,
    user_id: userIds.ali,
    order_number: "ORD-20260115-0001",
    items: [
      { course_id: courseIds.veriYapilari, course_title: "Veri Yapıları ve Algoritmalar", price: 499.99, discount_amount: 200.00 }
    ],
    total_amount: 499.99, discount_amount: 200.00, net_amount: 299.99, currency: "TRY",
    payment: { method: "credit_card", status: "completed", transaction_id: "TXN-001", paid_at: new Date("2026-01-15T14:30:00") },
    order_status: "completed",
    coupon_code: "HOSGELDIN",
    created_at: new Date("2026-01-15T14:30:00"), updated_at: new Date("2026-01-15T14:30:00")
  },
  {
    _id: orderIds.ord2,
    user_id: userIds.seda,
    order_number: "ORD-20260120-0002",
    items: [
      { course_id: courseIds.makroekonomi, course_title: "Makroekonomi: Teori ve Uygulama", price: 399.99, discount_amount: 0 }
    ],
    total_amount: 399.99, discount_amount: 0, net_amount: 399.99, currency: "TRY",
    payment: { method: "credit_card", status: "completed", transaction_id: "TXN-002", paid_at: new Date("2026-01-20T09:15:00") },
    order_status: "completed",
    coupon_code: null,
    created_at: new Date("2026-01-20T09:15:00"), updated_at: new Date("2026-01-20T09:15:00")
  },
  {
    _id: orderIds.ord3,
    user_id: userIds.ali,
    order_number: "ORD-20260201-0003",
    items: [
      { course_id: courseIds.lineerCebir, course_title: "Lineer Cebir", price: 349.99, discount_amount: 100.00 }
    ],
    total_amount: 349.99, discount_amount: 100.00, net_amount: 249.99, currency: "TRY",
    payment: { method: "bank_transfer", status: "completed", transaction_id: "TXN-003", paid_at: new Date("2026-02-01T11:00:00") },
    order_status: "completed",
    coupon_code: "SINAV50",
    created_at: new Date("2026-02-01T11:00:00"), updated_at: new Date("2026-02-01T11:00:00")
  },
  {
    _id: orderIds.ord4,
    user_id: userIds.burak,
    order_number: "ORD-20260210-0004",
    items: [
      { course_id: courseIds.lineerCebir, course_title: "Lineer Cebir", price: 349.99, discount_amount: 100.00 }
    ],
    total_amount: 349.99, discount_amount: 100.00, net_amount: 249.99, currency: "TRY",
    payment: { method: "credit_card", status: "completed", transaction_id: "TXN-004", paid_at: new Date("2026-02-10T16:45:00") },
    order_status: "completed",
    coupon_code: "SINAV50",
    created_at: new Date("2026-02-10T16:45:00"), updated_at: new Date("2026-02-10T16:45:00")
  },
  {
    _id: orderIds.ord5,
    user_id: userIds.merve,
    order_number: "ORD-20260215-0005",
    items: [
      { course_id: courseIds.borclarHukuku, course_title: "Borçlar Hukuku Genel Hükümler", price: 449.99, discount_amount: 0 }
    ],
    total_amount: 449.99, discount_amount: 0, net_amount: 449.99, currency: "TRY",
    payment: { method: "credit_card", status: "completed", transaction_id: "TXN-005", paid_at: new Date("2026-02-15T10:20:00") },
    order_status: "completed",
    coupon_code: null,
    created_at: new Date("2026-02-15T10:20:00"), updated_at: new Date("2026-02-15T10:20:00")
  }
]);


// ---------- KAYITLAR (Enrollments + Gömülü İlerleme) ----------
db.enrollments.insertMany([
  {
    user_id: userIds.ali,
    course_id: courseIds.veriYapilari,
    order_id: orderIds.ord1,
    course_snapshot: { title: "Veri Yapıları ve Algoritmalar", thumbnail_url: "https://cdn.example.com/img/veri-yapilari-thumb.jpg", instructor: "Prof. Dr. Ahmet Yılmaz" },
    enrolled_at: new Date("2026-01-15T14:31:00"),
    expires_at: null,
    progress_pct: 68.5,
    completed_at: null,
    lecture_progress: [
      { lecture_id: lectureIds.ds001, watched_seconds: 480,  total_seconds: 480,  is_completed: true,  last_position: 480,  completed_at: new Date("2026-01-15T15:00:00"), updated_at: new Date("2026-01-15T15:00:00") },
      { lecture_id: lectureIds.ds002, watched_seconds: 1320, total_seconds: 1320, is_completed: true,  last_position: 1320, completed_at: new Date("2026-01-15T15:30:00"), updated_at: new Date("2026-01-15T15:30:00") },
      { lecture_id: lectureIds.ds003, watched_seconds: 2100, total_seconds: 2100, is_completed: true,  last_position: 2100, completed_at: new Date("2026-01-16T10:00:00"), updated_at: new Date("2026-01-16T10:00:00") },
      { lecture_id: lectureIds.ds004, watched_seconds: 1680, total_seconds: 1680, is_completed: true,  last_position: 1680, completed_at: new Date("2026-01-16T11:00:00"), updated_at: new Date("2026-01-16T11:00:00") },
      { lecture_id: lectureIds.ds006, watched_seconds: 1500, total_seconds: 1500, is_completed: true,  last_position: 1500, completed_at: new Date("2026-01-17T09:00:00"), updated_at: new Date("2026-01-17T09:00:00") },
      { lecture_id: lectureIds.ds007, watched_seconds: 900,  total_seconds: 1200, is_completed: false, last_position: 900,  completed_at: null,                           updated_at: new Date("2026-01-17T10:00:00") }
    ]
  },
  {
    user_id: userIds.seda,
    course_id: courseIds.makroekonomi,
    order_id: orderIds.ord2,
    course_snapshot: { title: "Makroekonomi: Teori ve Uygulama", thumbnail_url: "https://cdn.example.com/img/makroekonomi-thumb.jpg", instructor: "Doç. Dr. Elif Kaya" },
    enrolled_at: new Date("2026-01-20T09:16:00"),
    expires_at: null,
    progress_pct: 42.0,
    completed_at: null,
    lecture_progress: [
      { lecture_id: lectureIds.eco001, watched_seconds: 900, total_seconds: 900,  is_completed: true,  last_position: 900, completed_at: new Date("2026-01-20T10:00:00"), updated_at: new Date("2026-01-20T10:00:00") },
      { lecture_id: lectureIds.eco002, watched_seconds: 800, total_seconds: 1500, is_completed: false, last_position: 800, completed_at: null,                           updated_at: new Date("2026-01-20T11:00:00") }
    ]
  },
  {
    user_id: userIds.ali,
    course_id: courseIds.lineerCebir,
    order_id: orderIds.ord3,
    course_snapshot: { title: "Lineer Cebir", thumbnail_url: "https://cdn.example.com/img/lineer-cebir-thumb.jpg", instructor: "Dr. Öğr. Üyesi Mehmet Demir" },
    enrolled_at: new Date("2026-02-01T11:01:00"),
    expires_at: null,
    progress_pct: 15.0,
    completed_at: null,
    lecture_progress: []
  },
  {
    user_id: userIds.burak,
    course_id: courseIds.lineerCebir,
    order_id: orderIds.ord4,
    course_snapshot: { title: "Lineer Cebir", thumbnail_url: "https://cdn.example.com/img/lineer-cebir-thumb.jpg", instructor: "Dr. Öğr. Üyesi Mehmet Demir" },
    enrolled_at: new Date("2026-02-10T16:46:00"),
    expires_at: null,
    progress_pct: 85.0,
    completed_at: null,
    lecture_progress: []
  },
  {
    user_id: userIds.merve,
    course_id: courseIds.borclarHukuku,
    order_id: orderIds.ord5,
    course_snapshot: { title: "Borçlar Hukuku Genel Hükümler", thumbnail_url: "https://cdn.example.com/img/borclar-hukuku-thumb.jpg", instructor: "Prof. Dr. Zeynep Arslan" },
    enrolled_at: new Date("2026-02-15T10:21:00"),
    expires_at: null,
    progress_pct: 30.0,
    completed_at: null,
    lecture_progress: []
  }
]);


// ---------- DEĞERLENDİRMELER ----------
db.reviews.insertMany([
  {
    user_id: userIds.ali, course_id: courseIds.veriYapilari,
    user_snapshot: { name: "Ali Koç", photo: null },
    rating: 5,
    comment: "Algoritma konusunu bu kadar anlaşılır anlatan başka bir kaynak bulamadım. Prof. Ahmet hocam harika anlatıyor.",
    is_approved: true,
    created_at: new Date("2026-02-01"), updated_at: new Date("2026-02-01")
  },
  {
    user_id: userIds.seda, course_id: courseIds.makroekonomi,
    user_snapshot: { name: "Seda Yıldız", photo: null },
    rating: 4,
    comment: "Makroekonomi konuları çok iyi işlenmiş. Türkiye örnekleri özellikle faydalı. Biraz daha pratik soru olabilirdi.",
    is_approved: true,
    created_at: new Date("2026-02-10"), updated_at: new Date("2026-02-10")
  },
  {
    user_id: userIds.burak, course_id: courseIds.lineerCebir,
    user_snapshot: { name: "Burak Aydın", photo: null },
    rating: 5,
    comment: "Lineer cebir korkumu yendim bu kursla. Görselleştirmeler muhteşem.",
    is_approved: true,
    created_at: new Date("2026-03-01"), updated_at: new Date("2026-03-01")
  },
  {
    user_id: userIds.merve, course_id: courseIds.borclarHukuku,
    user_snapshot: { name: "Merve Şahin", photo: null },
    rating: 4,
    comment: "Yargıtay kararları ile desteklenen anlatım çok değerli. Sınav döneminde hayat kurtarıcı.",
    is_approved: true,
    created_at: new Date("2026-03-10"), updated_at: new Date("2026-03-10")
  }
]);


// ---------- KUPONLAR ----------
db.coupons.insertMany([
  {
    code: "HOSGELDIN", discount_type: "percent", discount_value: 20.0,
    min_order_amount: 100.0, max_uses: 1000, current_uses: 245,
    valid_from: new Date("2026-01-01"), valid_until: new Date("2026-06-30"),
    is_active: true, created_at: new Date()
  },
  {
    code: "YAZ2026", discount_type: "percent", discount_value: 30.0,
    min_order_amount: 200.0, max_uses: 500, current_uses: 12,
    valid_from: new Date("2026-06-01"), valid_until: new Date("2026-09-01"),
    is_active: true, created_at: new Date()
  },
  {
    code: "SINAV50", discount_type: "fixed", discount_value: 50.0,
    min_order_amount: 150.0, max_uses: 2000, current_uses: 890,
    valid_from: new Date("2026-03-01"), valid_until: new Date("2026-06-15"),
    is_active: true, created_at: new Date()
  },
  {
    code: "OGRENCI100", discount_type: "fixed", discount_value: 100.0,
    min_order_amount: 300.0, max_uses: 300, current_uses: 67,
    valid_from: new Date("2026-01-01"), valid_until: new Date("2026-12-31"),
    is_active: true, created_at: new Date()
  }
]);


// ---------- FATURALAR ----------
const sellerInfo = {
  company_name: "Kurs Akademi Eğitim Teknolojileri A.Ş.",
  tax_office: "Büyük Mükellefler VD",
  tax_number: "1234567890",
  address: "Levent Mah. Teknoloji Cd. No:42 Beşiktaş/İstanbul",
  email: "muhasebe@kursakademi.com",
  phone: "02121234567"
};

db.invoices.insertMany([
  {
    order_id: orderIds.ord1,
    user_id: userIds.ali,
    invoice_number: "FTR-2026-000001",
    invoice_type: "e_archive",
    invoice_date: new Date("2026-01-15"),
    buyer: {
      type: "individual",
      full_name: "Ali Koç",
      identity_number: "12345678901",
      company_name: null, tax_office: null, tax_number: null,
      email: "ali.koc@student.edu", phone: "05321234567",
      address: {
        address_line: "Maslak Mah. İTÜ Ayazağa Kampüsü Yurt Blok No:3",
        district: "Sarıyer", city: "İstanbul",
        postal_code: "34469", country: "TR"
      }
    },
    seller: sellerInfo,
    line_items: [
      {
        description: "Veri Yapıları ve Algoritmalar - Online Video Kurs",
        course_id: courseIds.veriYapilari,
        quantity: 1,
        unit_price: 249.99,     // KDV hariç (299.99 / 1.20)
        discount_amount: 0,
        vat_rate: 20,
        vat_amount: 50.00,
        line_total: 299.99
      }
    ],
    totals: {
      subtotal: 249.99,
      total_discount: 0,
      total_vat: 50.00,
      grand_total: 299.99,
      currency: "TRY"
    },
    status: "sent",
    gib_uuid: "550e8400-e29b-41d4-a716-446655440001",
    gib_response: "Başarılı",
    pdf_url: "https://cdn.example.com/invoices/FTR-2026-000001.pdf",
    sent_to_email: true,
    notes: "Eğitim hizmeti - KDV %20 dahil",
    created_at: new Date("2026-01-15T14:35:00"),
    updated_at: new Date("2026-01-15T14:35:00")
  },
  {
    order_id: orderIds.ord2,
    user_id: userIds.seda,
    invoice_number: "FTR-2026-000002",
    invoice_type: "e_archive",
    invoice_date: new Date("2026-01-20"),
    buyer: {
      type: "individual",
      full_name: "Seda Yıldız",
      identity_number: "98765432109",
      company_name: null, tax_office: null, tax_number: null,
      email: "seda.yildiz@student.edu", phone: "05339876543",
      address: {
        address_line: "Bebek Mah. Rumelihisarı Cd. No:15 D:4",
        district: "Beşiktaş", city: "İstanbul",
        postal_code: "34342", country: "TR"
      }
    },
    seller: sellerInfo,
    line_items: [
      {
        description: "Makroekonomi: Teori ve Uygulama - Online Video Kurs",
        course_id: courseIds.makroekonomi,
        quantity: 1,
        unit_price: 333.33,
        discount_amount: 0,
        vat_rate: 20,
        vat_amount: 66.66,
        line_total: 399.99
      }
    ],
    totals: {
      subtotal: 333.33,
      total_discount: 0,
      total_vat: 66.66,
      grand_total: 399.99,
      currency: "TRY"
    },
    status: "sent",
    gib_uuid: "550e8400-e29b-41d4-a716-446655440002",
    gib_response: "Başarılı",
    pdf_url: "https://cdn.example.com/invoices/FTR-2026-000002.pdf",
    sent_to_email: true,
    notes: "Eğitim hizmeti - KDV %20 dahil",
    created_at: new Date("2026-01-20T09:20:00"),
    updated_at: new Date("2026-01-20T09:20:00")
  },
  {
    order_id: orderIds.ord5,
    user_id: userIds.merve,
    invoice_number: "FTR-2026-000005",
    invoice_type: "e_archive",
    invoice_date: new Date("2026-02-15"),
    buyer: {
      type: "individual",
      full_name: "Merve Şahin",
      identity_number: "55667788990",
      company_name: null, tax_office: null, tax_number: null,
      email: "merve.sahin@student.edu", phone: "05367778899",
      address: {
        address_line: "Cebeci Mah. Hukuk Fakültesi Cd. No:22 D:8",
        district: "Çankaya", city: "Ankara",
        postal_code: "06590", country: "TR"
      }
    },
    seller: sellerInfo,
    line_items: [
      {
        description: "Borçlar Hukuku Genel Hükümler - Online Video Kurs",
        course_id: courseIds.borclarHukuku,
        quantity: 1,
        unit_price: 374.99,
        discount_amount: 0,
        vat_rate: 20,
        vat_amount: 75.00,
        line_total: 449.99
      }
    ],
    totals: {
      subtotal: 374.99,
      total_discount: 0,
      total_vat: 75.00,
      grand_total: 449.99,
      currency: "TRY"
    },
    status: "sent",
    gib_uuid: "550e8400-e29b-41d4-a716-446655440005",
    gib_response: "Başarılı",
    pdf_url: "https://cdn.example.com/invoices/FTR-2026-000005.pdf",
    sent_to_email: true,
    notes: "Eğitim hizmeti - KDV %20 dahil",
    created_at: new Date("2026-02-15T10:25:00"),
    updated_at: new Date("2026-02-15T10:25:00")
  }
]);


// ============================================================
// 3. FAYDALI SORGULAR (Aggregation Pipeline Örnekleri)
// ============================================================

// --- En çok satan kurslar ---
// db.enrollments.aggregate([
//   { $group: { _id: "$course_id", count: { $sum: 1 } } },
//   { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" } },
//   { $unwind: "$course" },
//   { $project: { title: "$course.title", enrollments: "$count", price: "$course.price" } },
//   { $sort: { enrollments: -1 } }
// ]);

// --- Bir öğrencinin tüm kursları ve ilerlemesi ---
// db.enrollments.find(
//   { user_id: userIds.ali },
//   { "course_snapshot.title": 1, progress_pct: 1, enrolled_at: 1 }
// );

// --- Kategori bazlı kurs sayıları ---
// db.courses.aggregate([
//   { $unwind: "$categories" },
//   { $group: { _id: "$categories.name", count: { $sum: 1 } } },
//   { $sort: { count: -1 } }
// ]);

// --- Aylık gelir raporu ---
// db.orders.aggregate([
//   { $match: { "payment.status": "completed" } },
//   { $group: {
//       _id: { $dateToString: { format: "%Y-%m", date: "$created_at" } },
//       total_orders: { $sum: 1 },
//       total_revenue: { $sum: "$net_amount" }
//   }},
//   { $sort: { _id: -1 } }
// ]);

// --- Kurs arama (full-text search) ---
// db.courses.find(
//   { $text: { $search: "algoritma veri yapıları" } },
//   { score: { $meta: "textScore" } }
// ).sort({ score: { $meta: "textScore" } });

// --- Öğrencinin bir kurstaki video ilerleme detayı ---
// db.enrollments.aggregate([
//   { $match: { user_id: userIds.ali, course_id: courseIds.veriYapilari } },
//   { $unwind: "$lecture_progress" },
//   { $project: {
//       lecture_id: "$lecture_progress.lecture_id",
//       watched: "$lecture_progress.watched_seconds",
//       total: "$lecture_progress.total_seconds",
//       completed: "$lecture_progress.is_completed",
//       last_pos: "$lecture_progress.last_position"
//   }}
// ]);

print("✅ Veritabanı başarıyla oluşturuldu: online_kurs_platformu");


// ============================================================
// 4. SEPET & FATURA İŞLEM ÖRNEKLERİ
// ============================================================

// --- Sepete kurs ekleme ---
// db.users.updateOne(
//   { _id: userIds.seda },
//   {
//     $push: {
//       "cart.items": {
//         course_id: courseIds.veriYapilari,
//         course_title: "Veri Yapıları ve Algoritmalar",
//         thumbnail_url: "https://cdn.example.com/img/veri-yapilari-thumb.jpg",
//         instructor: "Prof. Dr. Ahmet Yılmaz",
//         original_price: 499.99,
//         discount_price: 299.99,
//         added_at: new Date()
//       }
//     },
//     $set: { "cart.updated_at": new Date() }
//   }
// );

// --- Sepetten kurs çıkarma ---
// db.users.updateOne(
//   { _id: userIds.ali },
//   {
//     $pull: { "cart.items": { course_id: courseIds.pythonOop } },
//     $set: { "cart.updated_at": new Date() }
//   }
// );

// --- Sepete kupon uygulama ---
// db.users.updateOne(
//   { _id: userIds.ali },
//   { $set: {
//       "cart.coupon_code": "HOSGELDIN",
//       "cart.coupon_discount": 135.99,
//       "cart.updated_at": new Date()
//   }}
// );

// --- Sepet toplamını hesaplama (aggregation) ---
// db.users.aggregate([
//   { $match: { _id: userIds.ali } },
//   { $unwind: "$cart.items" },
//   { $group: {
//       _id: "$_id",
//       item_count: { $sum: 1 },
//       subtotal: { $sum: { $ifNull: ["$cart.items.discount_price", "$cart.items.original_price"] } },
//       coupon: { $first: "$cart.coupon_discount" }
//   }},
//   { $addFields: {
//       grand_total: { $subtract: ["$subtotal", "$coupon"] }
//   }}
// ]);

// --- Checkout: Sepeti siparişe dönüştürme sonrası sepeti temizleme ---
// db.users.updateOne(
//   { _id: userIds.ali },
//   { $set: {
//       "cart.items": [],
//       "cart.coupon_code": null,
//       "cart.coupon_discount": 0,
//       "cart.updated_at": new Date()
//   }}
// );

// --- Kullanıcının tüm faturalarını getir ---
// db.invoices.find(
//   { user_id: userIds.ali },
//   { invoice_number: 1, invoice_date: 1, "totals.grand_total": 1, status: 1, pdf_url: 1 }
// ).sort({ invoice_date: -1 });

// --- Aylık KDV raporu ---
// db.invoices.aggregate([
//   { $match: { status: { $in: ["issued", "sent"] } } },
//   { $group: {
//       _id: { $dateToString: { format: "%Y-%m", date: "$invoice_date" } },
//       invoice_count: { $sum: 1 },
//       total_subtotal: { $sum: "$totals.subtotal" },
//       total_vat: { $sum: "$totals.total_vat" },
//       total_revenue: { $sum: "$totals.grand_total" }
//   }},
//   { $sort: { _id: -1 } }
// ]);

// --- Zaten satın alınmış kursu sepete eklemeyi engelleme kontrolü ---
// const userId = userIds.ali;
// const courseToAdd = courseIds.anatomi;
// const alreadyEnrolled = db.enrollments.findOne({ user_id: userId, course_id: courseToAdd });
// const alreadyInCart = db.users.findOne({ _id: userId, "cart.items.course_id": courseToAdd });
// if (!alreadyEnrolled && !alreadyInCart) {
//   print("Sepete eklenebilir");
// } else {
//   print("Bu kurs zaten satın alınmış veya sepette");
// }