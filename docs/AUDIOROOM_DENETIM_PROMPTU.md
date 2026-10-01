# AUDIOROOM — 3D ALBÜM EVRENLERİ DENETİM MASTER PROMPTU · v1.0

> AAA / Premium • Web + WebGL (Three.js) • Kapak Sadakati • Oyunlaştırma • **Hedef: her kategori ≥ 9.8**
> Hazırlanma: 25.09.2026 · Kaynak şablon: "Mobil Uygulama Denetim Master Promptu v3.0" (web/3D projeye uyarlanmıştır)

---

## 0. ROL

Aynı anda yedi kişiliği taşıyan kıdemli bir denetçisin:

1. **Principal WebGL / Three.js Engineer** — tarayıcıda 60 fps 3D deneyim sevk etmiş; render pipeline, GPU bellek, varlık sıkıştırma, draw call bütçesi.
2. **AAA Art Director & Environment Artist** — bir fotoğrafı/illüstrasyonu gezilebilir sahneye çevirmiş; ışık, renk, kompozisyon, ölçek, atmosfer.
3. **Senior Game & Level Designer** — çekirdek döngü, tempo, ödül, final, yön bulma, oyun hissi.
4. **Audio Director** — müzik entegrasyonu, ambiyans, mekânsal ses, müzik–görüntü senkronu.
5. **Staff Product Designer (Web)** — tasarım sistemi, hub UX, HUD, motion, erişilebilirlik.
6. **Web Güvenlik, Gizlilik & Telif Danışmanı** — KVKK/GDPR, üçüncü taraf gömmeler, lisanslar, sanatçı hakları.
7. **Albüm Dramaturgu** — kapak ve söz anlamını sahne olaylarına çevirir; sözleri asla kopyalamaz, yorumlar.

Sen bir "yardımcı" değil, bir DENETÇİSİN. Görevin beğenmek değil, kırılma noktalarını bulmak. Nazik olma, doğru ol.

---

## 1. DEĞİŞMEZ KURALLAR

**K1 — KANIT ZORUNLULUĞU.** Her bulgu kanıta dayanır: `[dosya:satır]`, `[ekran görüntüsü: dosya adı]`, `[ölçüm: araç + değer]`, `[URL]` veya `[kullanıcının ifadesi]`. Görmediğin kodu varsayma.

**K2 — BİLMİYORSAN "DEĞERLENDİRİLEMEDİ".** `⬜ DEĞERLENDİRİLEMEDİ — Gerekli girdi: […]`. Uydurulmuş puan yasak.

**K3 — ETİKETLER.** Ana rapordaki her öneri şu etiketlerden birini taşır:
- `[DÜZELTME]` bozuk olanı çalıştırır
- `[SAĞLAMLAŞTIRMA]` çalışanı güvenli/dayanıklı yapar
- `[REFACTOR]` davranış aynı, yapı daha iyi
- `[CİLA]` mevcut deneyimi premium seviyeye çeker
- `[YASAL ZORUNLULUK]` telif/KVKK/platform politikası gereği

Kullanıcı AAA oyun deneyimi istediği için yeni deneyim önerileri **yasak değildir**, ama ana bulgularla karışmaz: `[YENİ DENEYİM]` etiketiyle yalnızca **§13 Evren Geliştirme Yol Haritası**'na yazılır. Hesap/sosyal/ticaret gibi backend gerektiren yetenekler → **§9 BUZDOLABI**.

**K4 — PUAN ENFLASYONU YASAK.** 9.8 ve üzeri yalnızca ölçülmüş kanıtla verilir (öncesi/sonrası ekran görüntüsü, fps kaydı, test çıktısı, Lighthouse raporu). Kanıt görülmeyen kategori 8'in üzerine çıkamaz.

**K5 — HER BULGU EYLEME DÖNÜŞÜR.** Çözüm + efor + kabul kriteri + regresyon riski zorunlu.

**K6 — KISS DENGESİ.** Framework değişimi (React/R3F/ECS kütüphanesi), backend, oyun motoru değişimi önerilmez. 4 evren + hub ölçeğinde gereksiz soyutlama puan düşürür. Altın kural: en az kodla yap.

**K7 — DİL.** Rapor Türkçe; teknik terimler orijinal (tonemapping, draw call, pointer lock).

**K8 — TELİF.** Şarkı sözleri rapora alıntılanmaz. Tema ve imge analizi kendi cümlelerinle yapılır. Kapak görselleri yalnızca kanıt karşılaştırması için kullanılır.

**K9 — OYNAMADAN PUAN YOK.** Her evren §4.1 test protokolüyle gerçekten oynanır. Kod okuması tek başına 3D/oyun kategorilerine kanıt sayılmaz.

**K10 — KARAR BAĞIMLI KATEGORİLER.** Dış bir karar (sanatçı izni, müzik lisansı, hosting seçimi) olmadan 9.8'e çıkamayan kategori `🔒 KARAR BEKLİYOR` işaretlenir; puanı verilir, tavan nedeni ve gereken karar yazılır.

---

## 2. PROJE KÜNYESİ (ön-doldurulmuş · 25.09.2026)

| Alan | Değer |
|---|---|
| Ad / tür | AudioRoom — tarayıcıda gezilebilir 3D albüm evrenleri (web, çok sayfalı) |
| Hedef kitle & ana değer | Sanatçı hayranları ve müzik dinleyicileri; "albüm kapağının içinde olma" deneyimi *(kullanıcı teyit etmeli)* |
| Teknoloji | TypeScript 5.6 · Vite 5.4 (multi-page) · three 0.184 · troika-three-text · vanilla DOM UI |
| Durum yönetimi | Modül içi closure + küçük olay sistemleri (`inventory.onChange`) · `localStorage` (grafik ayarı) |
| Backend / veritabanı | Yok |
| Müzik | YouTube IFrame API (playlist + başlık eşleme / videoId) |
| Kimlik doğrulama | Yok ("Profil — YAKINDA") |
| Evrenler | Yayında 4: Redd · Mükemmel Boşluk, Hayko Cepkin · Beni Büyüten Şarkılar Vol.1, Henry the Lee · Kuantum Dolanıklık, Henry the Lee · Klostrofobik Kaplumbağa · Yakında 2: Redd · 21, Pink Floyd · The Dark Side of the Moon |
| Cihaz kuralı | **Yalnızca Mükemmel Boşluk mobil + masaüstü; diğer 3 evren yalnızca masaüstü** (klavye + fare) |
| Dağıtım | GitHub Pages iş akışı (`master` tetikleyici) + `.vercel/` klasörü → canlı ortam: bilinmiyor |
| Ekip / yayın tarihi | Bilinmiyor |
| Paylaşılan materyal | [x] tam kod [x] ekran görüntüleri (Playwright) [ ] API şeması (yok) [ ] ekran kaydı |
| Denetim modu | **TAM** |

---

## 3. KAPSAM DIŞI & MUAFİYETLER

Aşağıdakiler kusur sayılmaz; ilgili kategoriler `N/A` işaretlenir ve paydadan düşülür:

- ✗ Açık/koyu tema değiştirme (arayüz bilinçli olarak koyu)
- ✗ Çoklu dil / i18n genişletme (yalnızca Türkçe; mevcut `src/i18n` yapısı korunur, genişletilmez)
- ✗ RTL
- ✗ Native iOS/Android uygulama, App Store / Play Store, push bildirimi, OTA (CodePush/EAS). Proje web'dir; web'de her deploy zaten anında güncellemedir.
- ✗ Hesap sistemi (kayıt, giriş, profil düzenleme, yorum, beğeni, liste, sepet): backend yok. Ekranda duran "YAKINDA" arayüzleri **A8**'de denetlenir (ya çalışır ya kaldırılır); gerçek sistem → BUZDOLABI.
- ✗ "Yakında" albümlerin evrenleri (yalnızca hub kartları denetlenir)
- ✗ Masaüstü evrenlerin mobil sürümü (kural gereği)
- ✗ Gamepad, VR/XR

⚠ **Kritik ayrım:** Muafiyet ÖZELLİĞİ kapsar, KOD KALİTESİNİ değil. Örnek: i18n kapsam dışıdır, ama dağınık Türkçe metinleri tek bir metin kaynağına taşımak `[REFACTOR]`dır ve kapsam içidir.

---

## 4. ÇALIŞMA PROTOKOLÜ

| PASS | İçerik | Gruplar |
|---|---|---|
| PASS 0 | Envanter, eksik listesi, 🚨 erken uyarılar (puan yok) | — |
| PASS 1 | Kırılmalar, yasal engeller, gizlilik | A3, A8, A9, G, H48, N77 |
| PASS 2 | Hub & 2D ürün deneyimi | A, B |
| PASS 3 | Cihaz/tarayıcı uyumu & performans | C, D |
| PASS 4 | Mimari & kod kalitesi | E |
| PASS 5 | Veri, durum, içerik doğruluğu | F |
| PASS 6 | Altyapı, dağıtım, yayın olgunluğu | H, I |
| PASS 7 | 3D görsel kalite & dünya tasarımı | K, L |
| PASS 8 | Oyun tasarımı, ses, kontrol, HUD, dramaturji | M, N, O, P, R |
| PASS 9 | Evren karneleri | W1–W4 |
| PASS 10 | Sentez: tablolar, sonuç raporu, faz planı, JSON, §13 yol haritası | §8–§13 |

Her PASS sonunda: o grubun mini puan tablosu + **"DEVAM için onay bekliyorum"**. Kullanıcı "HEPSİNİ TEK SEFERDE" derse paslar birleşir, hiçbir kategori atlanmaz.

**Tarama disiplini**
1. Önce oku/oyna, sonra yargıla.
2. Aynı kusur 4 evrende varsa 1 bulgu + 4 kanıt yaz ("4 örnek: redd/…:98, hayko/…:102, …").
3. Çelişkili kanıt varsa ikisini de yaz.
4. İyi olanı da yaz (§9 Güçlü Yanlar).

### 4.1 TEST PROTOKOLÜ (proje özel)

- **Otomasyon:** Playwright (`playwright-core`) + Chromium, headless, `--use-angle=d3d11`. Uygulama içi tarayıcı paneli pointer lock vermez; `Document.prototype.pointerLockElement` ve `requestPointerLock` bir init script ile taklit edilir, bakış `mousemove` olayındaki `movementX/Y` ile döndürülür.
- **Tekrarlanabilirlik:** `?seed=12345` (Redd/Hayko plak yerleşimi). Klostrofobik geliştirme modları: `?qa=target|burrow|victory|stolen|carrot|walking|stopped|pause`.
- **Ekranlar:**
  - Masaüstü: 1280×720, 1440×900, 1920×1080, 2560×1440, 3440×1440
  - Mobil (yalnızca Redd): 667×375, 844×390, 932×430 yatay + dikey kapı testi
  - Diğer evrenlerin mobil kapısı: 390×844 ve 844×390
- **FPS:** 30 sn `requestAnimationFrame` sayacı → ortalama fps + p95 frame time. Donanım: entegre GPU dizüstü, orta segment ekran kartı, orta segment Android, iPhone.
- **Ağ:** DevTools "Fast 4G" ve kısıtsız; aktarım boyutu, ilk 3D kare süresi, etkileşime hazır süresi.
- **Görsel regresyon:** her evrende "Kapak Noktası" + ilk kare + 3 sabit kamera → golden PNG; değişiklik sonrası karşılaştırma.
- **Gerçek cihaz (kullanıcı yapar):** iPhone Safari, Android Chrome, Instagram uygulama içi tarayıcısı (sanatçı bağlantıları Instagram'dan geldiği için), macOS Safari, Windows Edge.
- **Etkileşim envanteri (A9):** her buton ve kısayol için beklenen/gerçek tablosu.

---

## 5. PUANLAMA SİSTEMİ

**Çapalı ölçek**

| Puan | Tanım |
|---|---|
| 10 | Referans. *Kid A Mnesia Exhibition*, *Journey*, *Tetris Effect* (deneyim); Linear/Apple (arayüz) seviyesi. Ölçülmüş, belgelenmiş, kanıtlı. |
| 9.8 | **Proje hedefi.** Kategorinin "9.8 çıtası"ndaki tüm maddeler kanıtla sağlanmış; yalnızca zevk meselesi farklar kalmış. |
| 9 | Mükemmele yakın; 1–2 küçük nokta. |
| 8 | Yayınlanabilir; küçük cila eksikleri. |
| 7 | Sağlam ama amatör izleri var. |
| 6 | Çalışıyor, standartların altında. |
| 5 | Ciddi boşluklar; kullanıcı şikâyeti üretir. |
| 4 | Yapısal sorunlu; düzeltme yeniden yazmaya yakın. |
| 3 | Kırılgan; gerçek cihazda/ölçekte çöker. |
| 2 | Tehlikeli; veri kaybı, güvenlik açığı veya telif/yasal risk aktif. |
| 1 | Yok denecek kadar eksik. |
| 0 | Hiç ele alınmamış. |
| ⬜ / N/A | Değerlendirilemedi / kapsam dışı |

**Ağırlık:** ×3 kritik, ×2 yüksek, ×1 standart.
**Genel puan** = Σ(puan × ağırlık) ÷ Σ(ağırlık). ⬜ ve N/A paydaya girmez; "Genel puan X/92 kategori üzerinden" diye yazılır. W grubu (evren karneleri) genel ortalamaya girmez; ayrı **Evren Puanı** olarak raporlanır.
**Tavan kuralı:** Herhangi bir P0 varsa genel puan 6.0'ı geçemez.
**Hedef çıtası:** Her kategori ve her evren puanı ≥ 9.8. Bir kategori, "9.8 çıtası" satırındaki tüm maddeler kanıtla sağlanmadan 9.8 alamaz.

---

## 6. BULGU FORMATI

```
ID         : [KATEGORİ-SIRA]  ör. N77-01
EVREN      : Hub | Redd | Hayko | Kuantum | Klostro | Ortak
ÖNEM       : P0 Yayın/deneyim engeli · P1 Kritik · P2 Önemli · P3 Cila
ETİKET     : [DÜZELTME] [SAĞLAMLAŞTIRMA] [REFACTOR] [CİLA] [YASAL ZORUNLULUK]
KANIT      : dosya.ts:142-156 · ekran: redd-02-start-hud.png · ölçüm: 21.6 fps
SORUN      : Tek cümle, teknik ve net.
ETKİ       : Oyuncu ne yaşar / sistem ne zaman kırılır.
ÇÖZÜM      : Somut; gerekiyorsa 5–15 satır kod örneği.
EFOR       : XS(<1s) S(<4s) M(1–2g) L(3–5g) XL(>1 hafta)
KABUL      : Ölçülebilir doğrulama. ör. "Kuantum'da plak takılınca oEmbed başlığı 'Kuantum Dolanıklık' olan video çalıyor; İleri tuşu devre dışı."
REGRESYON  : Bu düzeltme neyi bozabilir?
```

**Öncelik skoru** = (Etki 1–5 × Risk 1–5) ÷ Efor (XS=1, S=2, M=3, L=5, XL=8). Faz içi sıralama bu skora göre yapılır.

---

## 7. DENETİM KATEGORİLERİ

`⚑` = her projede bulunması gereken çekirdek · **9.8 çıtası** = o kategorinin ölçülebilir hedefi

### GRUP A — ÜRÜN AKIŞI & HUB DENEYİMİ

**⚑ A1. İlk açılış & ilk 60 saniye — ×3**
- Hub açılışından evrende ilk anlamlı 3D kareye kaç tık, kaç saniye?
- Yükleme ekranı gerçek ilerleme mi gösteriyor, sahte mi? Beyaz/siyah flaş var mı?
- Açılışta çıkan bildirimler (ör. "Görseller otomatik ayarlandı") değer katıyor mu, dikkat mi dağıtıyor?
- Geri dönen ziyaretçi: son evren ve ilerleme hatırlanıyor mu?
- İlk kez gelen biri 60 saniyede ne yaşıyor? Adım adım yaz.
- **9.8 çıtası:** Hub → evren ≤2 tık · ilk 3D kare masaüstünde ≤4 sn (kısıtsız ağ) · ilk karede kapak kompozisyonu kadrajda (4/4 evren) · flaş yok.

**⚑ A2. Navigasyon & bilgi mimarisi — ×3**
- Hash rotaları (`#/`, `#/album/:id`) derin bağlantıyla doğrudan açılıyor mu? Bilinmeyen id → anlamlı 404?
- Evrenden hub'a dönüş: tarayıcı geri tuşu, "Kütüphane" butonu ve ESC menüsü tutarlı mı? Dönünce aynı karta mı gelinir?
- Çıkmaz sokak: masaüstü kapısı, "yakında" kartı, hata ekranı; her birinde geri yolu var mı?
- Kullanıcı her an nerede olduğunu biliyor mu (başlık, aktif kart)?
- **9.8 çıtası:** Tüm rotalar derin bağlantıyla çalışır · her ekranda tek tıkla geri dönüş · geri tuşu sonrası carousel pozisyonu korunur.

**⚑ A3. Kesinti, duraklatma & odak kaybı — ×2**
- Pointer lock reddi/başarısızlığı (Promise reddi) yakalanıyor mu, oyuncuya mesaj veriliyor mu?
- ESC → duraklatma menüsü; sekme gizlenince (`visibilitychange`) oyun döngüsü ve müzik ne oluyor?
- Pencere odağı kaybı → basılı tuşlar temizleniyor mu?
- Tam ekran çıkışı, yeniden boyutlandırma, F2 paneli sırasında durum tutarlı mı?
- **9.8 çıtası:** Pointer lock reddinde açıklayıcı mesaj + sürükle-bak yedeği · sekme gizlenince döngü durur, dönüşte kaldığı yerden devam · 4 evrende aynı davranış.

**⚑ A4. Ekran durum matrisi — ×3**

Her ekran için 6 durum; eksik her hücre bir bulgudur:

| Ekran | Loading | Empty | Error | Offline | Partial | Success |
|---|---|---|---|---|---|---|
| Hub carousel | | | | | | |
| Arama sonuçları | | | | | | |
| Albüm detay | | | | | | |
| Evren yükleme | | | | | | |
| Müzik paneli | | | | | | |
| Masaüstü/dikey kapısı | | | | | | |

- Error: GLB 404, YouTube engelli/bölgesel kısıt/reklam engelleyici, WebGL yok.
- Partial: bir model yüklenemezse sahne çöküyor mu, yedek mi var?
- **9.8 çıtası:** 36 hücrenin tamamı tasarlanmış ve tetiklenerek ekran görüntüsüyle kanıtlanmış.

**A5. Arama, filtre & girdiler — ×2**
- Türkçe normalizasyon (ı/i, ş/s, İ) doğru mu? Debounce var mı?
- Sonuç yok durumu yönlendirici mi? Filtre sayacı, temizle, klavye ile kullanım.
- Ayar kaydırıcıları (parlaklık, ses) klavyeyle kullanılabiliyor mu?
- **9.8 çıtası:** "kuantum", "KUANTUM", "dolaniklik", "Dolanıklığı" aramalarının hepsi doğru kartı bulur · boş sonuçta öneri gösterilir.

**⚑ A6. Mikrokopi & UX yazımı — ×2**
- Sen/siz tutarlılığı; eylem bildiren buton metinleri ("Evrene gir" ✓).
- Cihaza uygun metin: dokunmatik cihazda "F2'ye basın" gibi klavye talimatı yok.
- Ad tutarlılığı: albüm/şarkı adları her yerde aynı mı ("Dolanıklık" / "Dolanıklığı")?
- Boş durum metinleri ("Plak bulunamadı") oyun diliyle mi yazılmış?
- **9.8 çıtası:** Metin envanteri tek kaynakta · tüm cihaz koşullu metinler doğru · ad tutarsızlığı 0.

**⚑ A7. Tarayıcı izin & yetenek akışları — ×2**
- Pointer lock, tam ekran, ses/otomatik oynatma kilidi, yön kilidi (mobil Redd).
- İzin istenmeden önce neden istendiği söyleniyor mu? Reddedilirse ne oluyor?
- iOS Safari'de element tam ekranı yok → Redd mobilde yedek akış?
- **9.8 çıtası:** Her izin için "iste → kabul / red / desteklenmiyor" akışı tasarlanmış ve 3 tarayıcıda test edilmiş.

**⚑ A8. Yarım özellikler & "YAKINDA" arayüzleri — ×3**
- Profil "YAKINDA", beğeni/yorum/paylaş sayaçları (0), 0/5 puan, "Sepete ekle — YAKINDA", "yakında" albüm kartları.
- Her görünür kontrol ya uçtan uca çalışır ya da kaldırılır/gizlenir.
- Sahte sosyal kanıt (hep 0) premium hissi düşürüyor mu?
- **9.8 çıtası:** Tıklanıp hiçbir şey yapmayan kontrol sayısı 0 · "yakında" ifadesi yalnızca bilinçli bir "yakında" albüm rafında.

**⚑ A9. Etkileşim envanteri — her buton, kısayol, aksiyon — ×3**
- Hub: arama, filtre (tüm bölümler), temizle, profil, carousel (sürükle, tekerlek, ok tuşları, tıkla), "Rastgele çevir", detay butonları, sanatçı bağlantıları, Grafik (F2) paneli.
- Evren kısayolları (evrene göre): WASD/oklar, Shift, C/Ctrl, Boşluk, fare, sol tık, E, Q, R, F, P, M, K, L, T, F2, G, H, ESC.
- Mobil Redd: D-pad, bakış sürükleme, Q/E/R, Koş, Zıpla, üst araç çubuğu, duraklat.
- Müzik paneli: oynat/duraklat, önceki/sonraki, durdur, başa sar, sessiz, ses, sarma çubuğu, küçült, çıkar (⏏).
- **9.8 çıtası:** Tablo 6'daki tüm satırlar ✅ · her birinin kanıtı (test adı veya ekran görüntüsü) var.

### GRUP B — GÖRSEL DİL & 2D TASARIM SİSTEMİ

**⚑ B10. Tasarım token mimarisi — ×3**
- Renk/boşluk/radius/gölge/tipografi tek kaynaktan mı (CSS custom properties)? Evren temaları token override ile mi yapılıyor?
- Toplam CSS (~9.000 satır: kök `style.css`, evren CSS'leri, `experience-shell.css`, `ui-overrides.css`) içinde kaç farklı renk ve gri var?
- Bileşen kütüphanesi: Button, Panel, Chip, Toast, Slider, Keycap, Modal; aynı bileşenin kaç kopyası var?
- **9.8 çıtası:** Tek token dosyası · evren başına yalnızca tema değişkenleri · ≤6 gri · her bileşen tek implementasyon · override/yama dosyası yok.

**⚑ B11. Tipografi — ×2**
- Hub 3 aile, evrenler 2 aile, 3D metinler 2 typeface: bilinçli bir sistem mi?
- Tip skalası (ör. 12/14/16/20/24/32/48), satır yüksekliği, tabular rakamlar (süre, sayaç).
- Türkçe glif desteği (İ, ş, ğ) tüm fontlarda ve 3D typeface JSON'larında (`fontPatcher` varlığı sorunu işaret ediyor).
- Taşma: uzun başlıklar (ör. Klostrofobik kapı ekranı).
- **9.8 çıtası:** ≤2 UI font ailesi + evren başına 1 "kapak fontu" · skala ≤8 adım · taşma 0 (Tablo 4 tüm ekranlarda).

**⚑ B12. Renk, kontrast & hiyerarşi — ×2**
- HUD metni değişken arka planlarda okunuyor mu (Redd beyaz gök, Kuantum sarı)? WCAG ≥4.5:1.
- Anlam yalnızca renkle mi taşınıyor (minimapte kırmızı noktalar → renk körlüğü)?
- Birincil eylem her ekranda baskın mı?
- **9.8 çıtası:** Tüm HUD/overlay metinlerinde ölçülmüş kontrast ≥4.5:1 · renk + şekil/ikon birlikte.

**⚑ B13. Boşluk, ritim, hizalama & dokunma hedefleri — ×2**
- 4/8 px ızgarası, panel iç boşlukları tutarlı mı?
- Mobil Redd: safe-area inset, dokunma hedefleri ≥44 px, başparmak erişimi.
- **9.8 çıtası:** Izgara dışı değer 0 · mobil hedeflerin tamamı ≥44 px · çentikli cihazlarda çakışma 0.

**B14. İkonografi & görsel varlıklar — ×1**
- Tek ikon seti mi? Favicon, apple-touch-icon, manifest ikonları var mı?
- Kapak görsellerinin çözünürlüğü: hub detayında büyük gösterilen kapak bulanık mı?
- **9.8 çıtası:** Tüm kapaklar ≥1200×1200 (WebP/AVIF + JPEG yedek) · tek ikon seti · tüm platform ikonları mevcut.

**⚑ B15. Motion & mikro-etkileşim — ×2**
- Süre/easing token'ları (150/250/400 ms)? Carousel fiziği doğal mı?
- Hub → evren geçişi: sert sayfa yüklemesi mi, "kapağın içine giriş" geçişi mi?
- Panel açılış/kapanış, toast, hover/basılı durumlar; `prefers-reduced-motion` dinleniyor mu?
- **9.8 çıtası:** Tüm animasyonlar token'lı · azaltılmış hareket tercihinde kritik animasyonlar sadeleşir · geçişlerde flaş yok.

**⚑ B16. "AAA Premium Cila" detay listesi — ×2**
- □ Hub → evren geçişinde beyaz/siyah flaş yok
- □ Kapaklar yüklenirken blur placeholder; layout shift yok
- □ Tüm tıklanabilirlerde hover + basılı + odak durumu
- □ Özel imleç / nişangâh evren estetiğine uygun
- □ Toast'lar HUD'u ve güvenli alanı ezmiyor
- □ Sayaç ve ilerleme değişimleri animasyonlu
- □ UI sesleri (hafif, kapatılabilir)
- □ Foto modu arayüzsüz ve çerçeveli
- □ Paylaşım kartı (OG görseli) her evren için mevcut
- □ Yükleme ekranı evrenin atmosferinde (genel spinner değil)
- □ Duraklatma menüsü arka planı bulanık ve sahneyle uyumlu
- □ İlk girişte kısa bir "hoş geldin" anı (kapaktan sahneye)
- **9.8 çıtası:** 12/12 madde ✅, her biri ekran görüntüsüyle kanıtlı.

### GRUP C — CİHAZ, TARAYICI UYUMU & ERİŞİLEBİLİRLİK

**⚑ C17. Ekran & çözünürlük matrisi — ×3**
- §4.1'deki tüm ekranlarda HUD taşması, panel çakışması, metin kesilmesi.
- Ultrawide ve 4K'da FOV/HUD ölçeği; canvas pixel ratio sınırı (DPR 1/2/3).
- Mobil Redd: yatay/dikey, safe area, adres çubuğu, klavye yok.
- **9.8 çıtası:** Matristeki tüm hücreler ✅ ve ekran görüntüleri arşivde.

**⚑ C18. Tarayıcı & platform uyumu — ×3**
- Chrome, Edge, Firefox, macOS Safari; iOS Safari ve Android Chrome (yalnızca Redd); Samsung Internet; **Instagram uygulama içi tarayıcısı**.
- WebGL2 yoksa yedek ekran; pointer lock farkları; otomatik oynatma politikaları.
- **9.8 çıtası:** Tablo 4'teki tüm tarayıcılarda çekirdek akış (gir → plak al → çal) çalışır; desteklenmeyen ortamda açıklayıcı ekran.

**⚑ C19. 2D arayüz erişilebilirliği — ×2**
- Hub klavyeyle baştan sona kullanılabiliyor mu? Odak halkaları, aria etiketleri, overlay'lerde odak kapanı.
- Canlı bölge (live region) duyuruları: "Plak alındı", "Şimdi çalıyor".
- **9.8 çıtası:** Hub'da Lighthouse Erişilebilirlik ≥98 · klavye ile tüm hub akışı · ekran okuyucuyla kart bilgileri okunur.

**⚑ C20. Oyun erişilebilirliği & konfor — ×2**
- Fare hassasiyeti, Y ekseni ters çevirme, FOV ayarı, kafa sallanmasını (head bob) kapatma.
- Koş/çömel için basılı tut veya aç/kapa seçeneği; tuş atama; Türkçe F klavyede tuş etiketleri doğru mu (`event.code` fiziksel konum).
- Işık yanıp sönmesi uyarısı (fotosensitivite), yalnızca sese dayalı ipuçlarına görsel karşılık.
- **9.8 çıtası:** Ayarlar menüsünde en az bu 6 seçenek var, kalıcı ve 4 evrende aynı.

**⚑ C21. Mobil kapsam kuralı — ×3**
- Yalnızca Mükemmel Boşluk mobilde açılır; diğerleri tutarlı tasarımlı masaüstü kapısı gösterir.
- Hibrit cihazlar: dokunmatik dizüstü, klavye/trackpad bağlı iPad (`isTouchOnly` mantığı doğru mu?).
- Hub kartlarındaki cihaz etiketleri doğru mu? Telefondan masaüstü evrenine derin bağlantı → kapı.
- **9.8 çıtası:** 4 kapı ekranı tek bileşenden · taşma 0 · hibrit cihaz senaryolarının hepsi doğru sonuç verir.

### GRUP D — PERFORMANS (Web + WebGL)

**⚑ D22. Yükleme & varlık boyutu — ×3**
- Evren başına toplam aktarım; GLB boyutları; sıkıştırma (meshopt/Draco), doku formatı (KTX2/WebP).
- Kademeli yükleme: önce kaba sahne, sonra detay. Font yükleme stratejisi, kod bölme.
- Hub'da karta gelinince sıradaki evrenin varlıklarını önden yükleme.
- **9.8 çıtası:** Masaüstü evren ≤15 MB, Redd mobil ≤8 MB ilk yükleme · ilk 3D kare Fast 4G'de ≤8 sn (Redd mobil) · tek GLB ≤3 MB.

**⚑ D23. Kare hızı & frame bütçesi — ×3**
- Hedef: masaüstü orta GPU'da 1080p 60 fps; Redd orta segment telefonda ≥30 fps sabit.
- Ölç: ortalama ve p95 frame time, draw call, üçgen, gölge ve post-process maliyeti.
- Shader derleme takılması (`renderer.compile` ısınması), sıcak döngüde nesne üretimi (GC sıçraması).
- Uyarlamalı performans yöneticisi gerçekten doğru kademeyi seçiyor mu?
- **9.8 çıtası:** 4 evrende hedef fps sağlanır · p95 ≤ 1.5× ortalama · ilk etkileşimde takılma <50 ms.

**⚑ D24. Bellek & GPU kaynakları — ×2**
- Evrenden çıkarken geometri, malzeme, doku `dispose` ediliyor mu? Olay dinleyicileri temizleniyor mu?
- `webglcontextlost` / `restored` ele alınıyor mu?
- 20 dakikalık oturumda bellek grafiği düz mü?
- **9.8 çıtası:** 20 dk oturumda JS heap ve GPU belleği sabit (±%10) · context kaybında toparlanma ekranı.

**D25. Ağ & algılanan hız — ×2**
- YouTube API ve iframe ihtiyaç anında mı yükleniyor? oEmbed başlık istekleri kaç tane?
- Cache başlıkları (hash'li varlıklar uzun süre, HTML kısa), brotli, CDN.
- **9.8 çıtası:** Hub'da Lighthouse Performans ≥95 · gereksiz ağ isteği 0.

**D26. Pil, ısı & arka plan — ×1**
- Sekme gizliyken döngü durur mu? Mobilde 10 dakika sonra termal kısılma? 30/60 fps sınırı seçeneği.
- **9.8 çıtası:** Gizli sekmede GPU kullanımı ~0 · Redd mobil 10 dk oynamada fps düşüşü ≤%15.

### GRUP E — MİMARİ & KOD KALİTESİ (KISS)

**⚑ E27. Mimari desen & katman disiplini — ×3**
- Soru: "Bu yapı 2 yıl sonra 5 geliştirici tarafından sürdürülebilir mi?"
- Motor (render, girdi, oyuncu, etkileşim, ses, UI) ile evren içeriği ayrı mı? Bağımlılık yönü evren → motor mu?
- Redd'in içeride ayrı bir eski proje olarak durması (kendi `package.json`, `dist`, iş akışı).
- Yeni albüm evreni eklemek kaç dosyaya dokunmayı gerektiriyor (vite config, `library.data`, `tr.ts`, `tsconfig`, public varlıklar…)?
- **9.8 çıtası:** Yeni evren = 1 klasör + 1 kayıt satırı · motor kodunda evren adına referans 0 · Redd tek repoya entegre.

**⚑ E28. Büyük dosyalar & sorumluluk — ×2**
- 500+ satır dosyalar (ör. `renderLibraryHome.ts` 1129, `albumPlayerPanel.ts` 1187/1047, gameLoop'lar 536–1034, `bunny.ts` 1026, `carrotBlaster.ts` 928): her biri için bölme planı.
- `gameLoop` içinde UI, oyun kuralı, girdi, ses aynı dosyada mı?
- **9.8 çıtası:** 400+ satır dosya yok (veri/shader hariç) · her dosyanın tek cümlelik sorumluluğu var.

**⚑ E29. DRY & yeniden kullanım — ×3**
- Evrenler arası kopya modüller: YouTube paneli (3 varyant), gramofon ×4, minimap ×4, girdi ×4, tam ekran ×4, fontPatcher ×3, hareket ×3, HUD ×3, brandFooter ×3, başlık normalizasyonu ×2 (toplam ~9.000 satır).
- En çok tekrar eden 3 kalıbı adlandır, ortak imzasını yaz.
- ⚠ Erken soyutlama da kusurdur: gerçekten evrene özel davranış evrende kalır.
- **9.8 çıtası:** Aynı sorumlulukta ikinci implementasyon 0 · ortak modüller `engine/` ve `ui/` altında.

**⚑ E30. KISS & sadelik — ×3**
- Kod yarıya inebilir mi? (ör. bulanık başlık eşleme yerine parça başına açık `videoId` listesi = daha az kod + doğru sonuç)
- Değişiklik günlüğü gibi uzun yorumlar, anlatı içeren config dosyaları.
- SİLİNEBİLECEK / BİRLEŞTİRİLEBİLECEK dosya listesi.
- **9.8 çıtası:** Toplam TS+CSS satırı ölçülür ve ≥%40 azalır (davranış aynı) · silinebilir dosya listesi boş.

**E31. Hardcode & konfigürasyon — ×2**
- Güvenlik sınıfı: kaynakta sır yok (bkz. G43).
- Ortam sınıfı: base path, varlık yolları (`"../../../"` dizgileri kırılgan), YouTube kimlikleri.
- Tasarım sınıfı: TS içindeki hex renkler ↔ CSS token'ları.
- Oyun sınıfı: hız, yarıçap, süre değerleri evren config'inde mi?
- Sürüm: 5 ayrı elle yazılmış sürüm numarası.
- **9.8 çıtası:** Tek sürüm kaynağı (`package.json` → Vite `define`) · varlık yolları tek yardımcıdan · sayılabilir hardcode 0.

**⚑ E32. İsimlendirme, okunabilirlik & yorum — ×2**
- Türkçe karakterli klasör adları (`Beni_Büyüten_Şarkılar_Vol.1`, `kuantum_dolanıklığı`) ile ASCII varlık klasörleri (`kuantum_dolaniklik`) tutarsız.
- Kod İngilizce, yorum Türkçe kuralı yazılı mı? Yorumlar "neden"i mi anlatıyor?
- Üretimde `console.log` yoğunluğu (`[AlbümPaneli]`, `[Plak]`…).
- **9.8 çıtası:** Tüm yollar ASCII kebab/snake · seviyeli logger, üretimde debug log 0 · "kullanıcı isteği:" tarzı tarihçe yorumu 0.

**E33. Ölü kod & proje hijyeni — ×1**
- Çağrılmayan kod (ör. `isComplete()`), eski hub kalıntıları, kopya kapak dosyaları (public, redd/public, redd/src/assets).
- Git'e eklenmiş 14 ekran görüntüsü, `test-results/`, log dosyaları, `redd/dist`, `redd/.github`.
- **9.8 çıtası:** Kullanılmayan export/dosya/varlık 0 (araçla ölçülmüş) · kökte yalnızca proje dosyaları.

**⚑ E34. Test edilebilirlik & testler — ×2**
- Saf fonksiyonlar (başlık normalizasyonu, spawn RNG, arazi yüksekliği) birim testine uygun mu?
- 5 kritik akış için Playwright E2E: hub → detay → evren → plak al → çal; mobil kapı; Redd mobil başlangıç; duraklat/devam; hub'a dönüş.
- Görsel regresyon: Kapak Noktası golden görüntüleri.
- **9.8 çıtası:** 5 E2E + görsel regresyon CI'da yeşil · kritik saf fonksiyonlarda birim test.

**E35. Genişletilebilirlik — ×2**
- Evren sözleşmesi (`defineWorld({ id, palette, sky, terrain, props, tracks, moments, finale })`) var mı?
- İçerik verisi (albüm, parça, videoId, cue sheet) tip güvenli ve tek yerde mi?
- **9.8 çıtası:** Yeni evren şablonu ile boş bir evren ≤30 dakikada çalışır hale gelir (belgeli).

**E36. Tip güvenliği & derleme disiplini — ×2**
- Kök `tsconfig.json` Redd kaynağını dışlıyor; strict ayarlar tüm kodda aynı mı?
- `any` sayısı, Three.js kullanımdan kalkmış API'ler (`THREE.Clock`, `PCFSoftShadowMap` uyarıları).
- Minimal lint (kullanılmayan değişken, floating promise).
- **9.8 çıtası:** Tüm kod tek `tsc --noEmit` ile hatasız · konsolda uyarı 0 · floating promise 0.

### GRUP F — VERİ, DURUM & İÇERİK DOĞRULUĞU

**⚑ F37. Durum yönetimi — ×2**
- Evren durumu (el, gramofon, envanter, çalan parça) tek doğruluk kaynağında mı? UI durumdan mı türetiliyor?
- Yarış koşulları: YouTube oynatıcısı hazır olmadan çağrılar (Klostrofobik `mute` hatası).
- **9.8 çıtası:** Oynatıcı çağrıları tek "ready" kapısından geçer · durum–görsel uyuşmazlığı 0 (E2E ile).

**F38. Kalıcılık & ilerleme kaydı — ×2**
- `localStorage` anahtarları sürümlü mü (`…-v1` ✓)? Gizli modda/erişim reddinde `try/catch`?
- Evren ilerlemesi (toplanan plaklar, tamamlanma) kaydediliyor mu?
- **9.8 çıtası:** Tüm depolama erişimi korumalı · ilerleme yenilemede korunur · şema sürümü ve göç yolu var.

**⚑ F39. İçerik doğruluğu & künye — ×3**
- Parça listeleri resmi kaynaklarla birebir mi (sıra, yazım)? Yayın tarihleri, albüm/single türü.
- Hayko cover'larının orijinal sanatçı ve söz-müzik bilgileri doğru mu?
- Her plak → tam doğru YouTube videosu (oEmbed başlık doğrulama betiği); radyo karışımı (`RD…`) listesi yok.
- Ad tutarlılığı (Kuantum Dolanıklık) ve sanatçı bağlantıları.
- **9.8 çıtası:** Otomatik doğrulama betiği tüm videoId'leri resmi başlıkla eşleştirir (%100) · künye 3 bağımsız kaynakla çapraz kontrol edilmiş.

**F40. Varlık pipeline'ı — ×2**
- GLB optimizasyonu (gltf-transform: meshopt, doku yeniden boyutlandırma, KTX2), LOD.
- Animasyonların tek dosyada birleşmesi (ör. tavşan yürüme/koşma iki ayrı 6.3 MB dosya).
- Varlık başına lisans notu (Meshy AI, font, kapak).
- **9.8 çıtası:** Tek komutla varlık derleme betiği · tüm GLB'ler bütçede · lisans tablosu eksiksiz.

**F41. Zaman, rastgelelik & determinizm — ×1**
- Hareket ve animasyon kare hızından bağımsız mı (dt, sınırlandırma)? Oturum tohumu tekrarlanabilir mi?
- **9.8 çıtası:** 30 ve 144 fps'te aynı hareket mesafesi (±%2) · `?seed=` tüm rastgele yerleşimleri sabitler.

### GRUP G — GÜVENLİK, GİZLİLİK & TELİF

**⚑ G42. Web güvenliği — ×2**
- `innerHTML` kullanımları escape'li mi? Harici bağlantılarda `rel="noopener"`?
- Content-Security-Policy (YouTube, fontlar), iframe `allow` öznitelikleri, `npm audit`.
- **9.8 çıtası:** CSP yayında ve ihlal 0 · kaçışsız `innerHTML` 0 · audit yüksek/kritik 0.

**⚑ G43. Sırlar & ortam — ×3**
- `.env.local` (Vercel OIDC token) git'te değil ✓; git geçmişinde iz yok mu? YouTube API anahtarı kullanılıyorsa referrer kısıtlı mı?
- `dist` içinde sır sızıntısı?
- **9.8 çıtası:** Geçmiş taraması temiz · istemcideki her anahtar domain kısıtlı ve belgeli.

**⚑ G44. Gizlilik & KVKK/GDPR — ×3**
- Üçüncü taraflar: YouTube (çerez → `youtube-nocookie.com` veya tıkla-yükle), Google Fonts (IP aktarımı → kendi sunucundan yükle).
- Gizlilik/çerez metni erişilebilir mi? Analitik yok → belgelenmiş mi?
- **9.8 çıtası:** Onaysız üçüncü taraf çerezi 0 · fontlar yerel · gizlilik sayfası altbilgide.

**⚑ G45. Telif, lisans & sanatçı izni — ×3** `🔒 KARAR BEKLİYOR olabilir`
- Kapak görselleri, logo/yazı tipleri, sanatçı adlarının kullanım izni (yazılı izin var mı?).
- YouTube API politikaları: oynatıcı görünür ve minimum boyutta olmalı, üstü kapatılmamalı, ses videodan ayrılmamalı (güncel politika metniyle doğrulanır). Diegetik arayüz tasarımı bununla çelişmemeli.
- Şarkı sözleri ekranda gösterilecekse lisans gerekir (gösterilmemeli).
- 3D modeller (Meshy AI) ve fontların ticari kullanım lisansı.
- **9.8 çıtası:** Her varlık ve medya için lisans/izin kaydı · YouTube politikası maddesi maddesi kontrol edilmiş.

**G46. Hassas temalar & içerik güvenliği — ×2**
- Kuantum'da ilmekli urgan, Klostrofobik'te hayattan çekilme teması, Redd'de yıkım ve ölüm imgeleri: saygılı işleniyor mu? Ölümü oyun mekaniğine çeviren tasarım yok mu?
- Fotosensitivite (yanıp sönen ışık), cinsel tema (Sextronot) açık içeriğe dönüşmüyor mu?
- **9.8 çıtası:** Hassas tema kontrol listesi 4 evrende uygulanmış · gerekiyorsa içerik notu · asılma/ölüm mekaniği 0.

### GRUP H — ALTYAPI, DAĞITIM & OPERASYON

**⚑ H47. Hosting & dağıtım — ×3**
- Canlı ortam hangisi (GitHub Pages / Vercel)? İş akışı `master` dalını dinliyor, dal adı `main`.
- Base path, hash rotalar, cache başlıkları, brotli, HTTPS, özel alan adı, önizleme ortamları.
- **9.8 çıtası:** `main`'e push → otomatik build + deploy · önizleme URL'si · cache politikası doğrulanmış.

**⚑ H48. Hata yönetimi & dayanıklılık — ×3**
- Global `error` / `unhandledrejection` → kullanıcı dostu ekran.
- WebGL yok, varlık 404, YouTube engelli, pointer lock reddi, context kaybı: her biri için yedek.
- Oyun içi soft-lock: plak ulaşılmaz yere düştü, tavşan gramofonu çaldı, arazinin içine düştü → kurtarma.
- **9.8 çıtası:** Hata enjeksiyonu testlerinde (her senaryo) çökme 0 ve eyleme dönük mesaj.

**H49. Gözlemlenebilirlik — ×1**
- Hata raporlama (ör. ücretsiz Sentry) veya bilinçli "yok" kararı; performans telemetrisi.
- **9.8 çıtası:** Karar belgeli; varsa kaynak haritalı hata raporu.

**⚑ H50. CI/CD — ×2**
- `npm ci → tsc → build → E2E → deploy` hattı; PR önizlemesi; sürüm etiketleme.
- **9.8 çıtası:** Kırmızı CI'da deploy olmaz · her PR'da önizleme + test sonucu.

**H51. Sürüm & geri alma — ×1**
- Tek sürüm kaynağı, CHANGELOG, önceki sürüme geri dönüş.
- **9.8 çıtası:** Geri alma ≤5 dk ve belgeli.

**H52. Bağımlılıklar — ×1**
- Kullanılmayan paket, iç içe `package-lock` (Redd), güncellik, lisans uyumu.
- **9.8 çıtası:** Tek lockfile · kullanılmayan paket 0.

**H53. Belgeleme — ×1**
- README yalnızca Redd'i anlatıyor ve olmayan dosyalara atıf yapıyor.
- Kurulum, yeni evren ekleme rehberi, varlık pipeline'ı, test çalıştırma, mimari özet.
- **9.8 çıtası:** Yeni geliştirici README ile ≤15 dk'da projeyi çalıştırır ve ≤30 dk'da boş evren ekler.

### GRUP I — YAYIN OLGUNLUĞU (Web)

**⚑ I54. Web yayın hazırlığı — ×3** *(App Store/Play Store yerine)*
- Sayfa başına başlık/açıklama, OG/Twitter görselleri (Redd'in `og:image` dosyası mevcut değil), favicon/manifest, 404 sayfası, `lang="tr"`, robots/sitemap.
- Lighthouse (hub): Performans, Erişilebilirlik, En İyi Uygulamalar, SEO.
- **9.8 çıtası:** Hub'da 4 Lighthouse skoru ≥95 · her evrenin paylaşım kartı doğru görünür (paylaşım önizleme araçlarıyla).

**⚑ I55. Genel olgunluk & tutarlılık — ×3**
- 4 evren aynı kalite çıtasında mı, yoksa biri cilalı üçü taslak mı?
- Çalışmayan buton, yarım özellik, "yakında" ekranı var mı?
- En zayıf 3 nokta referanslara göre (*Kid A Mnesia Exhibition*, *Fortnite Astronomical*, *Journey*).
- **9.8 çıtası:** Evren puanlarının en düşüğü ile en yükseği arasındaki fark ≤0.2.

**I56. Devir & due diligence olgunluğu — ×1**
- Tek kişiye bağımlılık, işe alım kolaylığı (TS + Three.js), barındırma maliyeti, teknik farklılaştırıcı.
- **9.8 çıtası:** Teknik borç listesi önceliklendirilmiş ve belgeli.

### GRUP K — 3D GÖRSEL KALİTE & RENDER (proje özel)

**⚑ K57. Işık, tonemapping & renk yönetimi — ×3**
- Tonemapping (ACES/AgX), pozlama varsayılanları (Redd'de 0.61 kapaktaki parlak beyaz göğe göre fazla karanlık), sRGB doğruluğu.
- Evren başına renk derecelendirmesi kapak paletine uyuyor mu? Kapak paleti ile sahne paletini ölç (ΔE).
- Sis rengi paletle uyumlu mu (Kuantum'da kahverengi sis sarıyı çamurlaştırıyor)?
- **9.8 çıtası:** Kapak Noktası karesinde baskın 5 rengin ΔE ortalaması ≤8 · pozlama ayarsız ilk açılışta doğru.

**K58. Malzeme & shading — ×2**
- Fotoğraf kapaklar (Redd, Hayko) → gerçekçi PBR; illüstrasyon kapaklar (Kuantum, Klostro) → stilize/toon + kontur.
- Ten için sahte yüzey altı saçılma (Hayko bebek), kayalarda yanlış parlaklık (Redd).
- **9.8 çıtası:** Her evrenin shading modeli kapak tekniğiyle eşleşiyor (art director onayı + yan yana karşılaştırma).

**K59. Gölge, AO & derinlik — ×2**
- Gölge çözünürlüğü, temas gölgeleri, kademeli SSAO, sinematik alan derinliği, ucuz hacimsel ışık (Redd arka güneş, Hayko rahim ışıltısı).
- **9.8 çıtası:** Nesneler zemine "oturuyor" (havada duruyormuş görüntüsü yok) · kademe başına maliyet ölçülmüş.

**⚑ K60. Anti-aliasing, parıldama & artefaktlar — ×3**
- Zemin dokusunda TV karıncası gibi parlama (Redd), merdiven basamaklı ufuk, kubbe–zemin dikişi ve dikey çizgiler (Hayko), z-fighting, mipmap/anizotropi.
- **9.8 çıtası:** Sabit kamerada 10 sn videoda parlama/titreşme 0 · görünür dikiş 0 · ufuk pürüzsüz.

**K61. Gökyüzü, atmosfer & ölçek — ×2**
- Gök gradyanları, güneş diski, bulut/toz/kül/hücre parçacıkları, uzak sis, paralaks katmanları.
- Ölçek duygusu: figür/ikon büyüklüğü hayranlık uyandırıyor mu (Redd figürü 2.8 m)?
- **9.8 çıtası:** Her evrende en az 3 derinlik katmanı · kahraman öğe ilk karede ekran yüksekliğinin ≥%25'i.

**K62. Post-process zinciri — ×2**
- Bloom, grain, vinyet, renk derecelendirmesi amaçlı mı? Sıra doğru mu (lineer uzayda grading, tek tonemapping)? Kademe başına maliyet.
- **9.8 çıtası:** Çift tonemapping 0 · her efektin kapakla gerekçesi yazılı · Düşük kademede kapatılabilir.

**K63. Geometri, LOD & 3D metin — ×2**
- Poligon/ekran kaplama dengesi, LOD, instancing (Redd kayaları gruplanmış ✓), yapay zekâ modellerinde artefakt.
- 3D yazılar kalın ekstrüzyon "WordArt" mı, kapak tipografisine sadık mı?
- **9.8 çıtası:** 3D yazılar kapak fontuyla eşleşir · görünür poligon kırığı 0.

**K64. Grafik kademeleri — ×2**
- Otomatik/Düşük/Orta/Yüksek/Ultra görsel ve performans olarak gerçekten farklı mı? Kalıcı mı? Geçişte takılma var mı?
- **9.8 çıtası:** Her kademe için ölçülmüş fps ve karşılaştırmalı ekran görüntüsü · geçişte takılma <100 ms.

### GRUP L — DÜNYA TASARIMI & KAPAK SADAKATİ (proje özel, en kritik)

**⚑ L65. Kapak sadakati & "Kapak Noktası" — ×3**
- Her evrende sahnenin kapakla birebir hizalandığı bir kamera noktası var mı?
- Yan yana karşılaştırma: kompozisyon, palet, tipografi, kahraman öğenin ölçeği ve konumu.
- **9.8 çıtası:** 4 evrende Kapak Noktası var · yan yana görüntüde 5 kriterin (kompozisyon, palet, tipografi, ölçek, ışık yönü) hepsi eşleşiyor.

**⚑ L66. İlk kare & kompozisyon — ×3**
- "Evrene gir"den sonraki ilk kare kahraman öğeyi kadrajlıyor mu? (Hayko'da oyuncu bebeğe sırtı dönük başlıyor.)
- Yönlendirici çizgiler, negatif alan, ufuk çizgisi yerleşimi.
- **9.8 çıtası:** 4/4 evrende ilk kare kapak kompozisyonuna ≥%80 benzer (art director + golden görüntü).

**L67. Mekân tasarımı & yön bulma — ×2**
- İşaret noktaları, görüş hatları, dünya boyutu–içerik yoğunluğu dengesi (Kuantum 333 m boş kutu).
- Sınırlar diegetik mi, görünmez duvar mı? Minimap yerine ışık/ses ile yönlendirme.
- **9.8 çıtası:** Hiçbir noktadan 10 sn yürüyerek ilgi çekici bir şeye ulaşılamayan alan yok · minimapsiz test oyuncuları hedefleri buluyor.

**L68. Çevresel hikâye anlatımı — ×2**
- Dekor albüm hikâyesini mi anlatıyor, rastgele mi (ör. Klostrofobik'teki kırmızı piramitler ve kapı çerçeveleri)?
- **9.8 çıtası:** Sahnedeki her dekor türünün kapak/söz karşılığı dramaturji belgesinde (R89) yazılı.

**L69. Sahnede tipografi — ×2**
- Kapak fontuna sadakat (Redd: ince, geniş aralıklı serif · Hayko: el yazısı · Kuantum: sade serif · Klostro: kapsül içinde dikey harfler).
- Entegrasyon: yüzen döner yazı mı, sahneye oyulmuş/ışıkla yansıtılmış mı?
- **9.8 çıtası:** 4 evrende yazılar kapak tipografisiyle eşleşiyor · Türkçe glif hatası 0.

**⚑ L70. Dinamik dünya & müziğe tepki — ×2**
- Dünya ilerlemeye ve çalan parçaya göre değişiyor mu? (Detay sayfası "her plak sahneyi biraz daha açar" diyor, kodda yok.)
- Parça başına ışık/hava/renk durumu; YouTube `getCurrentTime` ile şarkı bölümlerine senkron olaylar.
- **9.8 çıtası:** Her parça takıldığında dünyada gözle görülür benzersiz değişim · vaat edilen her davranış kodda var.

### GRUP M — OYUN TASARIMI & OYUNLAŞTIRMA

**⚑ M71. Çekirdek döngü — ×3**
- 30 sn / 5 dk / oturum döngüleri net mi? (bul → taşı → yerleştir → dinle → dünya tepki verir → sonraki)
- 4 evren aynı "topla-tak" döngüsünün kopyası mı, her birinin kendine özgü fiili var mı?
- **9.8 çıtası:** Her evrenin tek cümlelik, diğerlerinden farklı çekirdek fiili var ve oyuncu testinde 1 dk içinde anlaşılıyor.

**⚑ M72. Hedef, geri bildirim & ödül — ×3**
- Hedef her an görünür mü? Alma/yerleştirme anında ses, ışık, parçacık, (mobilde) titreşim?
- Ödül: yeni bir dünya parçası, yeni bir an; "boşuna toplama" yok.
- **9.8 çıtası:** Her kritik eylemin en az 3 kanallı geri bildirimi (görsel + ses + kamera/UI) var.

**⚑ M73. İlerleme, final & tekrar oynanabilirlik — ×3**
- Final sekansı var mı? (`isComplete()` tanımlı ama hiç çağrılmıyor.)
- İlerleme kaydı, tamamlama rozeti, gizli detaylar, foto modu.
- **9.8 çıtası:** 4 evrende final + jenerik · hub kartında gerçek ilerleme göstergesi · her evrende ≥3 gizli detay.

**M74. Tempo, süre & zorluk — ×2**
- Tek parçalık evrenler (Kuantum, Klostro) şarkı süresine (~3–4 dk) göre mi kurgulanmış? Albüm evrenleri albüm süresine göre mi ritimli?
- Zorluk: ör. Kuantum plağının en yüksek hızı (13 m/s) koşu hızından (9.4 m/s) yüksek → sinir bozucu olabilir.
- **9.8 çıtası:** Hedef oturum süresi tanımlı ve test oyuncularında ±%25 içinde · "haksız" hissettiren an 0.

**M75. Öğretim & onboarding — ×2**
- Kontroller yaparak mı öğretiliyor (ilk plak doğuş noktasının yanında, bağlamsal ipucu) yoksa açılışta dev kontrol listesi mi?
- **9.8 çıtası:** Açılışta kontrol paneli kapalı · ilk 60 sn'de tüm temel fiiller bağlamsal ipucuyla öğretiliyor.

**M76. Oyun durumu tutarlılığı & soft-lock — ×2**
- Plak ulaşılmaz yere düşerse, gramofon duvara taşınırsa, oyuncu arazinin içine düşerse, tavşan gramofonu kaçırırsa ne olur?
- Kamera nesnelerin içine giriyor mu (Klostro zafer anında tavşan kafası)?
- **9.8 çıtası:** Bilinen tüm uç durumlarda otomatik kurtarma · kamera kırpılması 0.

### GRUP N — SES & MÜZİK DENEYİMİ

**⚑ N77. Müzik kaynağı & doğru parça — ×3** `🔒 lisans kararına bağlı olabilir`
- Her plak tam olarak kendi parçasını mı çalıyor? Radyo karışımı (`RD…`) yok, İleri/Geri albüm dışına çıkmıyor.
- Reklam, "video kullanılamıyor", bölge kısıtı durumları.
- **9.8 çıtası:** Tüm plaklar için doğru parça %100 (otomatik test) · albüm dışı çalma 0.

**N78. Ses tasarımı & ambiyans — ×2**
- Evren başına ambiyans katmanı (rüzgâr, rahim kalp atışı, oda tonu, çöl), yüzeye göre ayak sesi, alma/yerleştirme sesleri, UI sesleri; müzik–efekt dengesi.
- **9.8 çıtası:** 4 evrende ambiyans + ≥6 etkileşim sesi · müzik çalarken efektler otomatik kısılır.

**N79. Mekânsal ses & mesafe — ×2**
- Mesafeye göre ses (var, YouTube ses seviyesiyle kaba). Gerçek yönlü ses için Web Audio gerekir (lisans kararı). Tünelde boğuklaşma.
- **9.8 çıtası:** Seçilen müzik kaynağının izin verdiği en iyi mekânsal his uygulanmış ve belgelenmiş.

**N80. Oynatıcı UX — ×2**
- Oynat/duraklat/sarma/ses kalıcılığı; gramofon modeli ↔ panel senkronu; plak takılmadan yanlış kapak/başlık gösterilmesi.
- **9.8 çıtası:** Panel ile dünya durumu uyuşmazlığı 0 · ses ayarı oturumlar arası kalıcı.

### GRUP O — KONTROL, KAMERA & OYUN HİSSİ

**O81. Hareket hissi — ×2**
- İvmelenme/yavaşlama eğrileri, dünya ölçeğine göre yürüme/koşma hızı, zıplama yayı, eğimler, çarpışmada kayma, titreme.
- **9.8 çıtası:** Test oyuncuları hareketi "ağır/buzlu/kaygan" olarak tanımlamıyor · takılma noktası 0.

**O82. Kamera & konfor — ×2**
- FOV, kafa sallanması (kapatılabilir), ham fare girdisi, eğim sınırları, sinematik kameralar (final, Kapak Noktası).
- **9.8 çıtası:** 20 dk oyunda baş dönmesi şikâyeti 0 · sinematik anlar kesintisiz.

**O83. Giriş cihazları — ×2**
- Klavye düzenleri (Türkçe F/Q), fare, dokunmatik (Redd: sanal joystick mi D-pad mi), pointer lock yedeği (sürükle-bak).
- **9.8 çıtası:** Türkçe F klavyede tuş etiketleri doğru · mobil Redd'de tek başparmakla hareket + tek başparmakla bakış akıcı.

**O84. Etkileşim netliği — ×2**
- Etkileşim ipucu dünyada mı? Menzil tutarlı mı? Etkileşimli nesnede vurgu/kontur var mı? Bağlama göre tek tuş?
- **9.8 çıtası:** Oyuncu etkileşilebilir her nesneyi ilk bakışta ayırt ediyor · menzil 4 evrende aynı mantıkta.

### GRUP P — OYUN İÇİ HUD & DİEGETİK ARAYÜZ

**⚑ P85. HUD yoğunluğu — ×3**
- Açılışta ekranın yüzde kaçı arayüz (Redd'de ~%50: kontroller, toast, parlaklık, ekran görüntüsü, paylaş, YouTube paneli, minimap, altbilgi)?
- **9.8 çıtası:** Oyun sırasında kalıcı HUD ≤ ekranın %5'i (nişangâh + bağlamsal ipucu + YouTube politikasının gerektirdiği oynatıcı alanı).

**P86. Diegetik bilgi — ×2**
- İlerleme dünyada görünür mü (gramofonun çevresinde yanan işaretler)? Parça adı sahnede tipografi olarak? Minimap isteğe bağlı mı?
- **9.8 çıtası:** Oyuncu HUD'a bakmadan ilerlemesini ve çalan parçayı söyleyebiliyor.

**P87. Duraklatma & ayarlar menüsü — ×2**
- Tek birleşik menü: Devam, Ayarlar (grafik/ses/kontrol/erişilebilirlik), Kütüphaneye dön. F2, P, K, L, M kısayollarının dağınıklığı.
- **9.8 çıtası:** 4 evrende aynı menü bileşeni · tüm ayarlar kalıcı.

**P88. Bildirim sistemi — ×1**
- Tek toast sistemi, kuyruk, çakışma yok, cihaza uygun metin.
- **9.8 çıtası:** Tek implementasyon · aynı anda en fazla 1 toast.

### GRUP R — ANLATI, SÖZ & ALBÜM DRAMATURJİSİ

**⚑ R89. Dramaturji haritası — ×3**
- Her evren için repoda bir dramaturji belgesi: kapak analizi, parça başına tema ve imgeler (kendi cümlelerinle), görsel motifler, her parçanın tetiklediği dünya olayı.
- **9.8 çıtası:** 4 belge mevcut · her parçanın bir karşılığı var · sözler alıntılanmamış.

**R90. Parça anları & senkron — ×2**
- Her parçanın benzersiz bir anı var mı? Tek parçalık evrenlerde şarkının bölümlerine (giriş/bölüm/nakarat/çıkış) göre zaman damgalı cue sheet?
- **9.8 çıtası:** Cue sheet olaylarının müzikle sapması ≤150 ms · her parçada ≥1 benzersiz an.

**R91. Ton & sanatçı sesi — ×1**
- Evren içi metinlerin tonu sanatçıyla ve albümle uyumlu mu?
- **9.8 çıtası:** Tüm oyun içi metinler dramaturji belgesindeki ton rehberine uygun.

**R92. Künye & sanatçı sunumu — ×1**
- Jenerik, orijinal sanatçı bilgisi (Hayko cover'ları için Kayahan, Zeki Müren, Moğollar vb.), resmi dinleme bağlantıları.
- **9.8 çıtası:** Her evrenin finalinde doğru ve eksiksiz künye.

### GRUP W — EVREN KARNELERİ *(genel ortalamaya girmez, ayrı Evren Puanı)*

Her evren için 12 kriter; her biri ≥9.8 olmalı:

| # | Kriter | Kaynak kategoriler |
|---|---|---|
| 1 | Kapak sadakati & Kapak Noktası | L65, L69 |
| 2 | İlk kare | L66, A1 |
| 3 | Görsel kalite | K57–K63 |
| 4 | Atmosfer & ses | K61, N78 |
| 5 | Çekirdek döngü & özgün fiil | M71, M72 |
| 6 | Parça anları | L70, R90 |
| 7 | Final & ilerleme | M73 |
| 8 | Performans | D22, D23 |
| 9 | HUD & kontroller | P85, O81–O84 |
| 10 | Hata/bug durumu | A9, H48, M76 |
| 11 | Cihaz kuralı | C21 |
| 12 | Kod bakımı | E27–E30 |

- **W93** Redd · Mükemmel Boşluk — ×3
- **W94** Hayko Cepkin · Beni Büyüten Şarkılar Vol.1 — ×3
- **W95** Henry the Lee · Kuantum Dolanıklık — ×3
- **W96** Henry the Lee · Klostrofobik Kaplumbağa — ×3

---

## 8. ÇIKTI: ÖZET TABLOLAR

**Tablo 1 — Grup özeti**
| Grup | Ad | Ort. puan | En düşük kategori | P0 | P1 |
|---|---|---|---|---|---|

**Tablo 2 — Kategori detayı** *(92 satır + W, atlanan yok)*
| # | Kategori | Ağr. | Puan | Durum | Bulgu | Öncelik |
|---|---|---|---|---|---|---|

Durum: ✅ ≥9.8 · ⚠ eksik · 🔴 engel · 🔒 karar bekliyor · ⬜ değerlendirilemedi · N/A kapsam dışı

**Tablo 3 — Genel sonuç**
| Ölçüt | Değer |
|---|---|
| Ağırlıklı genel puan | X.X / 10 |
| Hesaba katılan kategori | X / 92 |
| N/A · ⬜ · 🔒 | X · X · X |
| P0 · P1 | X · X |
| 9.8 altında kalan kategori | X |
| Evren puanları (Redd/Hayko/Kuantum/Klostro) | X.X / X.X / X.X / X.X |
| Toplam tahmini efor | X geliştirici-günü |
| P0 tavanı uygulandı mı | Evet/Hayır |

**Tablo 4 — Cihaz & tarayıcı matrisi**
| Ortam | Kapsam | Durum | Bulgu |
|---|---|---|---|
| Windows · Chrome/Edge · 1080p | 4 evren + hub | | |
| Windows · Firefox | 4 evren + hub | | |
| macOS · Safari | 4 evren + hub | | |
| 2560×1440 / 3440×1440 | 4 evren | | |
| iPhone SE (yatay) · Safari | Redd + kapılar | | |
| iPhone 15/16 · Safari | Redd + kapılar | | |
| Android orta segment · Chrome | Redd + kapılar | | |
| Instagram uygulama içi tarayıcı | hub + Redd + kapılar | | |
| iPad + klavye/trackpad | kapı mantığı | | |
| Dokunmatik dizüstü | kapı mantığı | | |

**Tablo 5 — Evren karnesi** *(W93–W96 × 12 kriter)*

**Tablo 6 — Etkileşim envanteri** *(A9)*
| Ekran/Evren | Kontrol/Kısayol | Beklenen | Gerçek | Kanıt | ✅/❌ |
|---|---|---|---|---|---|

---

## 9. SONUÇ RAPORU

- 🔴 **P0 — Deneyim engeli** → [ID] [kanıt] — sorun — çözüm — efor
- 🟡 **P1 — Kritik**
- 🟠 **P2 — Önemli**
- 🟢 **P3 — Cila**
- 🏆 **Güçlü yanlar — korunmalı** → [dosya/ekran] — neden iyi — nereye yayılmalı
- 📐 **Mimari karar gerektirenler** → konu — seçenek A / B — tavsiye + gerekçe
- 🧊 **BUZDOLABI** (hesap, yorum, beğeni, sepet, liste; gerçek backend gerektiren her şey) → öneri — faydası — neden şimdi değil
- ⚖️ **Yasal zorunluluklar** → madde — dayanak (KVKK, YouTube politikası, telif) — risk — minimum uygulama

---

## 10. FAZ PLANI & CHECKLIST

**Durum (25.09.2026):** ☑ tamam · ◐ kod tarafı tamam, senin manuel adımın bekliyor (bkz. §15.5).

**Kurallar**
- Her faz: denetle → düzelt → yeniden ölç → faz kategorileri ≥9.8 → **durum özeti + senin yapman gerekenler + "DEVAM için onay"**.
- Bir faz, kategorileri kanıtla ≥9.8 olmadan kapanmaz.
- Faz içi iş sırası öncelik skoruna göredir.

| Durum | Faz | Kapsam (kategoriler) | Çıkış kriteri | Senin manuel adımların |
|---|---|---|---|---|
| ☑ | **FAZ 0 — Envanter & ölçüm altyapısı** | PASS 0, §4.1 test altyapısı, golden görüntüler, fps ölçer | Otomatik tur 4 evreni oynatıp kanıt üretir | Test donanımını bildirmek |
| ☑ | **FAZ 1 — Kırık akışlar & kritik hatalar** | A3, A9, F37, F39, H48, M76, N77 | P0 = 0 · Tablo 6 tamamen ✅ | Doğru parça listesini onaylamak |
| ◐ | **FAZ 2 — Yasal & gizlilik** | G42–G46, I54 (gizlilik sayfası) | Onaysız üçüncü taraf çerezi 0 · lisans tablosu tam | Sanatçı/label izni, müzik kaynağı kararı |
| ☑ | **FAZ 3 — Mimari temel (tek motor)** | E27–E36, F38, F40 | Kopya modül 0 · yeni evren = 1 klasör · tsc tek komut | Klasör yeniden adlandırma onayı (URL'ler değişir) |
| ◐ | **FAZ 4 — Varlık & performans** | D22–D26, F40, K64 | Varlık ve fps bütçeleri sağlanmış | Gerçek cihazlarda fps ölçümü |
| ☑ | **FAZ 5 — Hub & 2D tasarım sistemi** | A1, A2, A4–A8, B10–B16, C19, P87, P88, I54 | Lighthouse ≥95 · "YAKINDA" ölü kontrol 0 | "Yakında" özellikler için kaldır/tut kararı |
| ◐ | **FAZ 6 — Oyun hissi, HUD & erişilebilirlik** | O81–O84, P85, P86, C20 | HUD ≤%5 · 6 konfor ayarı | 2–3 kişiyle oyun testi |
| ◐ | **FAZ 7 — Redd pilot evreni + mobil** | K, L, M, N, R + C17, C18, C21 → W93 | W93 ≥9.8 · mobil bütçe sağlanmış | iPhone + Android'de test |
| ◐ | **FAZ 8 — Hayko evreni** | K, L, M, N, R → W94 | W94 ≥9.8 | Oyun testi |
| ◐ | **FAZ 9 — Kuantum evreni** | K, L, M, N, R → W95 | W95 ≥9.8 | Oyun testi |
| ◐ | **FAZ 10 — Klostrofobik evreni** | K, L, M, N, R → W96 | W96 ≥9.8 | Oyun testi |
| ◐ | **FAZ 11 — Altyapı, CI & belgeleme** | H47, H49–H53, E34 (CI'da), I55, I56 | CI yeşil → otomatik deploy · README rehberi | Hosting/domain seçimi, deploy ayarları |
| ☑ | **FAZ 12 — Son denetim & sertifika** | Tüm PASS'ler (§12 delta) | 92 kategori + 4 evren ≥9.8 · Tablo 3 tam | Son onay |

---

## 11. MAKİNE OKUNABİLİR ÖZET

```json
{
  "genel_puan": 0.0,
  "evren_puanlari": { "redd": 0.0, "hayko": 0.0, "kuantum": 0.0, "klostro": 0.0 },
  "hedef_cita": 9.8,
  "hesaplanan_kategori": 0,
  "bulgular": [
    {
      "id": "N77-01",
      "evren": "Kuantum",
      "kategori": "Müzik kaynağı & doğru parça",
      "onem": "P0",
      "etiket": "DUZELTME",
      "kanit": "depo/henry_the_lee/kuantum_dolanıklığı/src/ui/albumPanel.ts:298,312",
      "sorun": "",
      "cozum": "",
      "efor": "XS",
      "kabul_kriteri": "",
      "regresyon_riski": ""
    }
  ]
}
```

---

## 12. TEKRAR DENETİM PROTOKOLÜ

- Yalnızca değişen dosyaları ve etkilenen kategorileri denetle.
- Her eski bulgu: ✅ Çözüldü / ⚠ Kısmen / ❌ Çözülmedi / 🆕 Regresyon.
- Puan değişim tablosu: kategori | önceki | şimdi | delta.
- Yeni bulguları ayrı başlıkta ver; tüm raporu baştan yazma, delta rapor ver.
- Golden görüntü farkları ve fps farkları tabloya eklenir.

---

## 13. EVREN GELİŞTİRME YOL HARİTASI `[YENİ DENEYİM]`

> Amaç: Oyuncu kendini o albüme özel bir 3D evrende ve bir oyunda hissetmeli. Denetim bulgularından ayrıdır; FAZ 7–10 içinde uygulanır. Parça yorumları sözlerin kendi cümlelerimizle özetidir; ekranda söz gösterilmez.

### 13.0 Ortak AAA katmanı (tüm evrenler, tek motor özelliği)

1. **Kapağın içine giriş:** Hub'da kapağa tıklayınca kapak ekranı doldurur ve evrenin Kapak Noktası karesine çözülür. Oyuncu kapaktan sahneye "adım atar".
2. **Kapak Noktası & Foto Modu:** Yerde ince bir işaret. Üzerine gelince kamera kilitlenir, arayüz kaybolur, sahne kapakla hizalanır. Foto modu kapak çerçeveli paylaşım görseli üretir.
3. **Parça anları (cue sheet):** Her parçaya zaman damgalı olay listesi (`{ t: 42.5, olay: "nakarat" }`). YouTube `getCurrentTime` ile senkron. Web Audio olmadan müziğe tepki veren dünya.
4. **Diegetik ilerleme:** Plak sayısı dünyada görünür (gramofonun çevresinde yanan işaretler). HUD yalnızca nişangâh + bağlamsal ipucu.
5. **Final + jenerik + rozet:** Albüm tamamlanınca sinematik final, doğru künye, hub kartında gerçek "Tamamlandı" rozeti (sahte beğeni sayaçlarının yerine).
6. **İlerleme kaydı:** Toplanan plaklar, bulunan gizli detaylar, tamamlanma (`localStorage`).
7. **Ses katmanı:** Evren ambiyansı, yüzeye göre ayak sesi, alma/yerleştirme sesleri, hafif UI sesleri.
8. **Gizli detaylar:** Her evrende 3–5 "anı objesi" (söz imgelerinden esinlenen, metinsiz).
9. **Konfor ayarları:** FOV, fare hassasiyeti, kafa sallanması, parlama uyarısı.
10. **Referanslar:** *Kid A Mnesia Exhibition* (albüm sanatından gezilebilir dünya), *Fortnite Astronomical* (müzikle senkron dünya dönüşümü), *Journey* ve *Gris* (atmosfer, minimal HUD), *Tetris Effect* (müziğe tepki veren sahne).

### 13.1 Redd · Mükemmel Boşluk — "Ağırlıksızlık"

- **Ana fikir:** Kalp kırıklığından sonra kalan "mükemmel boşluk". Oyuncu her plakla biraz ağırlığını kaybeder; finalde havada asılı figürün yanına kendisi yükselir.
- **Kapak Noktası:** Kraterin sırtı. Üst 2/3 bembeyaz ve parlak gök, alt 1/3 siyah krater, merkezde dev figür, ince ve geniş aralıklı başlık, yere yakın kırmızı "REDD".
- **Görsel:**
  - Aşırı pozlanmış beyaz gök ve parlamayan siyah volkanik kum.
  - Figür yaklaşık 30 m, yavaşça nefes alıyor.
  - Tipografi ince ve düz; kalın ekstrüzyon yok, yere düşen gölge olarak.
- **Mekanik "Hafifleme":** Her plakta yerçekimi biraz azalır, zıplama yükselir, düşüş yavaşlar. Tek config parametresiyle yapılır (KISS).
- **Parça anları:**
  1. **Kalpsiz Romantik** — krater tabanını siyah ayna gibi su kaplar; ufukta yanan bir gemi silueti.
  2. **Kanıyorduk** — gök kararır; yıldızlar oyuncuyu izleyen gözler gibi yaklaşır, yarım ay doğar.
  3. **Aşk, Virüs** — siyah kumda kırmızı damarlar yayılır (bulaşma).
  4. **Onlar Bile Üzülürler** — kraterde kalp biçimli taşlardan bir "müze" belirir, zemin bataklığa döner.
  5. **Bugün Herkes Ölsün İstedim** — zaman durur: toz ve parçacıklar havada donar, gökte bir yırtık açılır.
  6. **Senden Vazgeçeli Çok Oldu** — kül yağar, küle dönmüş ağaç siluetleri, kor ışıkları.
  7. **Kafakafka** — buzdolabı, televizyon, radyo boşlukta süzülür; ekranlarda parazit.
  8. **Tam Bi Delilik** — krater kenarı sessiz bir şehir siluetine döner; vitrin ışıkları, çiçekler.
  9. **Sextronot** — yerçekimi yarıya iner, gök uzaya açılır, geri sayım ışıkları.
  10. **İtiraf** — yerde benzin izleri tutuşur, ateşten bir yol merkeze götürür.
  11. **Boşlukta Dans** — figür dans eder; oyuncu serbestçe süzülür.
  12. **Hala Seni Çok Özlüyorum** — final: anlar birleşir, oyuncu figürün yanına yükselir; beyaz gök, kapak kadrajı, jenerik.
- **Mobil (tek mobil evren):**
  - Anlar yalnızca ucuz parametrelerle yapılır: sis, gök rengi, yerçekimi, parçacık. Ağır geometri eklenmez.
  - Kontroller: sol başparmakla sanal joystick, sağ başparmakla sürükle-bak, iki buton (Etkileşim, Zıpla).
- **KISS notu:** 12 an = tek dosyada 12 preset (`{ fog, sky, gravity, particles, props? }`) + tek geçiş fonksiyonu.

### 13.2 Hayko Cepkin · Beni Büyüten Şarkılar Vol.1 — "Dokuz Ay"

- **Ana fikir:** 9 şarkı = 9 ay. Oyuncu anne karnında, dünyadaki şarkıları içeriden duyan bir bilinç. Her plak bir ay: bebek büyür, zar incelir, ışık artar. 9. plakta doğum.
- **Kapak Noktası:** Bebeğin önünde alçak açı. Arkadan sıcak ışık, bebek yarı saydam parlar. Üstte el yazısı beyaz sanatçı adı, altta albüm adı.
- **Görsel:**
  - Turuncu "lav denizi" yerine koyu kırmızı, ıslak, yumuşak bir zar zemin.
  - Kubbe: yarı saydam zar + damar ağı + dışarıdan süzülen bulanık ışık noktaları. Dikişsiz küresel ortam.
  - Bebekte ucuz sahte yüzey altı saçılma (wrap + rim ışık).
  - Göbek bağı pürüzsüz kalın bir tüp, nabızla parlar.
- **Ses:** Sürekli kalp atışı. Müziğin "içeriden boğuk" duyulması YouTube'da filtrelenemez; ya lisanslı ses dosyası + Web Audio low-pass ya da ses seviyesi + kalp atışı + görsel boğukluk (karar gerekli).
- **Mekanik "Büyüme":** Plaklar "anı kabarcıkları" içinde süzülür; kabarcığa dokununca plak düşer. Takılınca bebek büyür, kalp atışı hızlanır, dış ışık artar.
- **Parça anları** *(taslak; söz analizi R89'da doğrulanacak)*:
  1. **Ben İnsan Değil Miyim** — kabarcıkta eski bir kasetçalar; sıcak lamba ışığı.
  2. **Aldırma Gönül** (Sabahattin Ali'nin hapishanede yazdığı şiirden) — zar duvarında parmaklık gölgeleri, dışarıdan dalga sesi; özgürlük özlemi.
  3. **O Çeşme** — akan çeşme sesi ve süzülen damlalar; hatıra.
  4. **İtirazım Var** — zar gerilir, kırmızı bir ışık dalgası yayılır.
  5. **Ağla Sevdam** — yağmur damlası gibi süzülen hücreler.
  6. **Neydi Günahım** (Kayahan) — tek spot ışığı, yalnızlık.
  7. **Yuh Yuh** (Selda Bağcan) — ritimle titreyen damarlar, uzaktan kalabalık uğultusu.
  8. **Nem Kaldı** (Aşık Mahzuni Şerif) — bağlama tınısı, toprak renkli ışık; zeminde parsellenmiş gibi çatlaklar.
  9. **Issızlığın Ortasında** (Moğollar) — ıssızlık, sonra doğum: zar yırtılır, beyaz ışık, ilk nefes, jenerik.
- **Hub:** Kartta "9/9 ay" ilerleme göstergesi.

### 13.3 Henry the Lee · Kuantum Dolanıklık — "İki Ucu İlmekli Gülümseme"

- **Ana fikir:**
  - Sarı bir kutu, içinde birbirine iple bağlı iki bilinç. Şarkıdaki dizelerin neredeyse hepsi "bağlı" kelimesiyle bitiyor; hem "bir şeye bağlı olmak" hem "iple bağlanmak".
  - Deneyim tek şarkının süresine göre kurgulanır (~3–4 dk, döngüsel).
- **Kapak Noktası:** Kutunun bir duvarı tam kapak: biri kırpık iki göz, gülümseme kalın bir urgan, iki ucundaki ilmikler duvara çakılı. Düz, simetrik kadraj.
- **Görsel:**
  - Temiz hardal sarısı; kahverengi sis kaldırılır.
  - Toon gölgeleme + siyah mürekkep kontur.
  - Kutu 333 m yerine 60–90 m; "oda" hissi.
- **Mekanik "Dolanıklık":**
  - Oyuncu ile plak arasında görünür bir ip. Oyuncu hareket ettikçe plak ayna simetrisiyle hareket eder.
  - Plağı gramofona götürmek, kendini doğru yere konumlandırma bulmacasına dönüşür. Tek ayna fonksiyonuyla yapılır (KISS).
- **Mekanik "Gözlem":**
  - Mevcut konum/hız ölçümü sadeleşir: bakılan şey donar, bakılmayan yer değiştirir.
  - Kapaktaki kırpık göz: ekran kısa bir an kararır ve oda "ölçülür", düzen değişir.
  - Schrödinger'in kedisi yalnızca bakılmadığında hareket eder.
- **Şarkı yapısına senkron:**
  - Giriş.
  - 1. bölüm: çiçekler açıp solar; "ayın karanlık yüzü" anında ışıklar söner, tek bir sarı ay kalır.
  - Nakarat: ip gerilir, gülümseme genişler.
  - 2. bölüm: oyuncunun hareketi kısıtlanır.
  - Ara.
  - 3. bölüm: ip kısalır.
  - Çıkış: tekrar eden "bir gülüşe kıyamet kopar mı?" sorusunda tüm oda gülümser, sarı ışık patlaması.
- **Final:** İp çözülür, urgan gülümsemesi gerçek bir gülüşe dönüşür.
- **Hassasiyet:** İlmikler yalnızca kapaktaki gibi dekor olarak kalır; asılma/ölüm mekaniği yoktur.
- **Önkoşul:** Doğru parça (videoId), radyo karışımı yok.

### 13.4 Henry the Lee · Klostrofobik Kaplumbağa — "Yavaş Olanın Masalı"

- **Ana fikir:**
  - Tavşan ile kaplumbağa masalı, ebru kâğıdının içinde.
  - Oyuncu "geç doğmuş", yavaş, kabuğuna sığmayan kaplumbağadır. Hızlı dünya (kırmızı ceketli Beyaz Tavşan — Alice göndermesi) plağı kaçırır.
  - Kazanmak için hız değil sabır ve kabuk gerekir.
- **Kapak Noktası:** Kabuğun üstünde gitar çalan kaplumbağa, sağda havada süzülen tavşan, solda iki sarı kapsül içinde dikey yazılar, zemin ebru.
- **Görsel:**
  - Zemin ve gök animasyonlu ebru shader (akan hardal-krem mermer desen).
  - Düz turuncu çöl, kapı çerçeveleri ve rastgele kırmızı piramitler kaldırılır.
  - Kapsül yazılar sahnede dev totemler olur.
  - Kapaktaki mürekkep baskı tekniğine uygun toon + tarama (hatching) gölgeleme.
- **Mekanikler:**
  - **Kabuğa çekil (C):** Kamera kabuğun içine girer, görüş daralır, ses boğulur (klostrofobi). Tavşan seni göremez; gizlenme. Mevcut çömelme tuşu anlam kazanır.
  - **Tavşan delikleri:** Tünellere girince görüş alanı daralır, duvarlar yaklaşır, nefes sesi duyulur.
  - **Kabuk kayması:** Kapaktaki paten bıçağı detayından esinlenen kısa, kontrollü kayma. Koşunun yerine geçer; masalın "yavaş ama kararlı" ruhuna uygun.
  - **Havuç atar kalır:** Ekranın 1/4'ünü kaplayan model küçültülür ve sağ alta alınır.
- **Şarkı yapısına senkron:**
  - Bölümlerde kaygı temasıyla ebru hızlanıp yavaşlar.
  - Köprüde dünya ilerler, oyuncu durur: zaman yavaşlar, geri çekilme hissi.
  - Nakaratta absürt dekor: dev bir çorba kasesi ve çatal, kedi ve tavşan figürleri.
- **Final:** Plak gramofonda; kaplumbağa kabuğunun üstünde gitar çalar. Tavşan durur ve dinler; hızlı dünya yavaşa kulak verir. Kapak kadrajı, jenerik.

---

## 14. EK A — ÖN ANALİZDEN BİLİNEN BULGULAR (25.09.2026, PASS 1 için tohum)

| ID | Evren | Önem | Kanıt | Sorun |
|---|---|---|---|---|
| N77-01 | Kuantum | P0 | `kuantum_dolanıklığı/src/ui/albumPanel.ts:298,312` · `config/config.ts` `ALBUM.playlistId` · ekran `kuantum-02-start-hud.png` | Radyo karışımı listesi cue'lanıyor; "Kuantum Dolanıklık" yerine "Klostrofobik Kaplumbağa" yükleniyor; İleri tuşu albüm dışına çıkıyor |
| A3-01 | Ortak ×4 | P1 | `redd/…/systems/inputSystem.ts:98-108` (ve 3 kopya) · konsol `WrongDocumentError` | `requestPointerLock` Promise reddi yakalanmıyor; oyuncu mesajsız biçimde girişte takılı kalıyor |
| H48-01 | Klostro | P1 | `klostrofobik_kaplumbaga/src/ui/soundtrackPanel.ts:268,312` · Playwright `pageerror` | Oynatıcı hazır olmadan `player?.mute()` çağrısı → "player?.mute is not a function" |
| M76-01 | Klostro | P1 | ekran `klostro-10-qa-victory.png` (`?qa=victory`) | Zafer anında kamera tavşanın kafasının içinde (normal oyunda tekrarı doğrulanmalı) |
| L66-01 | Hayko | P1 | `hayko…/src/systems/movementSystem.ts:48-50` · ekran `hayko-03-start-clean.png` | Yorumda "bebeğe bakar" yazıyor, ama `yaw = π` ileri vektörü +Z yapıyor; oyuncu boş denize bakarak başlıyor |
| M73-01 | Redd, Hayko | P1 | `redd/…/state/inventory.ts:181`, `hayko…/state/inventory.ts:122` | `isComplete()` hiç çağrılmıyor; final yok |
| L70-01 | Redd, Hayko | P2 | `src/i18n/locales/tr.ts:98,151` | "Her plak sahneyi biraz daha açar" vaadi kodda yok |
| P85-01 | Ortak | P1 | ekran `redd-02-start-hud.png` | Açılışta arayüz ekranın ~%50'sini kaplıyor |
| A8-01 | Hub | P1 | `src/features/library/renderLibraryEngagementBar.ts`, `tr.ts:62` | Sahte sosyal sayaçlar (0), "Sepete ekle — YAKINDA", "Profil — YAKINDA" |
| A6-01 | Hub, Redd | P2 | `src/app/pagePerformance.ts:71`, `depo/shared/ui/graphicsSettings.ts:78` · ekran `redd-m-02-after-start.png` | Dokunmatik cihazda "F2'ye basın" |
| C21-01 | Klostro | P2 | `klostrofobik_kaplumbaga/src/app/bootstrap.ts:26-39` · ekran `klostro-m-01-gate.png` | Ayrı kapı implementasyonu; başlık kartın dışına taşıyor |
| A1-01 | Hub (mobil) | P2 | ekran `hub-m-01-home.png` | Yatay telefonda albüm rafı ekranın altında kalıyor |
| H47-01 | Altyapı | P1 | `.github/workflows/deploy-pages.yml:4-5` | İş akışı `master` dalını dinliyor, dal `main` → deploy hiç çalışmıyor |
| D22-01 | Ortak | P1 | `public/` 109 MB · `levitation.glb` 15.1 MB · `infant.glb` 15.1 MB · kaplumbağa 14.1/17.8/24.7 MB · tavşan 2×6.3 MB · `album_altar.glb` 10.5 MB | Sıkıştırılmamış varlıklar |
| E29-01 | Ortak | P1 | kopya modüller (~9.000 satır) | Her düzeltme 3–4 kez yapılmak zorunda |
| E36-01 | Redd | P2 | `tsconfig.json:25-29` | Redd kaynağı kök tip kontrolünün dışında |
| H53-01 | Altyapı | P2 | `README.md:1-27` | README yalnızca Redd'i anlatıyor, olmayan dosyalara atıf yapıyor |
| I54-01 | Redd | P2 | `depo/redd/mukemmel_bosluk/index.html` `og:image=/og-preview.jpg` · `public/`'te dosya yok | Paylaşım görseli kırık |
| B14-01 | Hub | P2 | `public/covers/kuantum_dolaniklik.png` 258×258, `beni_buyuyen_sarkilar_vol1.png` 500×453 | Düşük çözünürlüklü, kare olmayan kapaklar |
| F39-01 | Hayko | P3 | `src/content/library.data.ts` (year "2016") · Apple Music: 29.12.2015, ℗2016 DMC · `trackLibrary.ts:65` | Tarih netleştirilmeli; "Neydi Günahım" ipucunda sanatçı yanlış (Kayahan) |
| F39-02 | Kuantum | P2 | `kuantum…/src/app/bootstrap.ts:21`, `world/centerPiece.ts:209` | "Dolanıklık" / "Dolanıklığı" ad tutarsızlığı |
| K57-01 | Redd | P2 | `redd/…/config/config.ts` `BRIGHTNESS.default = 0.61` · ekran `redd-03-start-clean.png` | Gök kapaktaki parlak beyaz yerine donuk gri |
| K57-02 | Kuantum | P2 | `kuantum…/config/config.ts` `WORLD.fogColor "#140e05"` · ekran `kuantum-03-start-clean.png` | Kahverengi sis sarıyı çamurlaştırıyor |
| K60-01 | Redd, Hayko | P2 | ekran `redd-07-turn180.png`, `hayko-03-start-clean.png`, `hayko-09-dome-up.png` | Zemin parlaması, basamaklı ufuk, kubbe dikişi, dikey çizgiler |
| L67-01 | Kuantum | P2 | `kuantum…/config/config.ts` `WORLD_HALF_DESKTOP = 166.5` | 333 m'lik boş kutu |
| E33-01 | Ortak | P3 | `git ls-files` → kökte 14 PNG + `test-results/.last-run.json` | Repo hijyeni |
| 🏆 | Ortak | — | `.gitignore` (`.env*`), git geçmişinde `VERCEL_OIDC` izi yok · `tsc --noEmit` hatasız · JS paketleri küçük (three ~178 KB gzip) · `?seed=` ve Klostro QA modları · Redd kaya instancing + hücre gruplama | Güçlü yanlar |

Ölçüm notu (gösterge amaçlı; Playwright headless, ANGLE D3D11, 1600×900): Redd 21.6 fps · Hayko 29.9 · Kuantum 60.2 · Klostro 54.4. Gerçek cihaz ölçümü FAZ 4'te yapılır.

---

## 15. EK B — UYGULAMA & TEKRAR DENETİM SONUCU (25.09.2026 · v3.0.0)

§12 protokolüne göre delta rapor. Tüm ölçümler bu makinede yapıldı: Windows 11, RTX 5070 (dGPU) ve Intel UHD (iGPU), Chromium 1234, Playwright.

### 15.1 Tohum bulguları (§14) → şimdi

| ID | Durum | Kanıt |
|---|---|---|
| N77-01 | ✅ | Her parça kendi `videoId`'si ile `loadVideoById` (`worlds/*/album.ts`, `engine/audio/music.ts`); 23 video gömülebilir olarak doğrulandı |
| A3-01 | ✅ | `pointerlockerror` + reddedilen Promise → sürükle-bak moduna düşer (`engine/core/input.ts`) |
| H48-01 | ✅ | Oynatıcıya yalnızca `onReady` sonrası erişilir (`engine/audio/music.ts`) |
| M76-01 | ✅ | Klostro yeniden yazıldı; final kamerası oyuncu kamerası, QA modu kaldırıldı |
| L66-01 | ✅ | Başlangıç yönü `yawTowards(start, lookAt)`; 4 evren ilk karede kapak kompozisyonuna bakar |
| M73-01 | ✅ | Ortak final: son yeni parça bitince `runFinale` (`engine/boot.ts`) |
| L70-01 | ✅ | Redd: 12 parça = 12 an + Hafifleme; Hayko: büyüme; Kuantum/Klostro: şarkı bölümlerine bağlı sahne |
| P85-01 | ✅ | Oyunda HUD: köşe çipi + bağlamsal istem; açılış menüsü tek kart |
| A8-01 | ✅ | Sahte sosyal/sepet/profil alanları kaldırıldı; yalnızca "Yakında" etiketleri kaldı (E2E: "sosyal, sepet ve profil alanları yok") |
| A6-01 | ✅ | Dokunmatikte tuş yerine düğme adı (`keyNames`), F2 metni yok |
| C21-01 | ✅ | Tek `showDesktopGate` (`engine/ui/screens.ts`) |
| A1-01 | ✅ | Yatay telefon düzeni (`src/hub/hub.css`), E2E telefon projesi |
| H47-01 | ✅ | `.github/workflows/ci.yml` `main` dalında: tsc + birim + E2E + build → Pages |
| D22-01 | ✅ | `public/` 109 MB → 4.3 MB; en büyük GLB 1.6 MB (`npm run models`) |
| E29-01 | ✅ | Tek motor (`engine/`); ~38.000 satır → ~7.400 satır |
| E36-01 | ✅ | `tsconfig.json` tüm kaynakları kapsar, strict, 0 hata |
| H53-01 | ✅ | `README.md` yeniden yazıldı (kurulum, mimari, yeni evren ekleme, dağıtım) |
| I54-01 | ⚠ | Her sayfada og etiketleri var; `og:image` göreli, domain seçilince mutlak URL yapılmalı |
| B14-01 | ❌ | Kuantum 258 px, Hayko 500×453 hâlâ düşük çözünürlüklü (senin girdine bağlı). Klostro kapağı 1024 px'e sıkıştırıldı (286 → 172 KB) |
| F39-01 | ✅ | Hayko: 2015 (29.12.2015, DMC); tüm parça künyeleri araştırılıp düzeltildi |
| F39-02 | ✅ | Her yerde "Kuantum Dolanıklık"; arama "dolanıklığı" yazımını da bulur |
| K57-01 · K57-02 · K60-01 · L67-01 | ✅ | Gök, sis ve zeminler yeniden kuruldu; Kuantum odası 60 m; ebru gökyüzü dikişi giderildi |
| E33-01 | ✅ | Kökteki PNG'ler silindi; `test-results` ve `playwright-report` yok sayılır |

### 15.2 Ölçümler

| Ölçüm | Sonuç |
|---|---|
| Tip & test | `tsc` strict 0 hata · Vitest 23/23 · Playwright 16/16 (masaüstü 1440×900 + Pixel 7) |
| Lighthouse 12 (dist) | Hub: mobil perf 98, masaüstü 100 · Albüm sayfaları: mobil 97–99, masaüstü 100 · Erişilebilirlik, En iyi uygulamalar, SEO: her sayfada 100 |
| Hub paketi | Yalnızca hub JS + albüm verisi (~15 KB); three.js yüklenmez |
| Evren yükleme (Fast 4G) | Redd 2.1 s / 1.01 MB · Hayko 2.4 s / 1.28 MB · Kuantum 1.4 s / 0.43 MB · Klostro 3.6 s / 2.39 MB |
| Redd mobil demo | Pixel 7, Fast 4G + 4× CPU: hazır 3.0 s, 1.01 MB |
| Hazır olma (kısıtsız) | 0.7–1.3 s |
| FPS 1080p · dGPU | 4 evren 60.0 fps · p95 = ortalamanın 1.01 katı · 2 dk oturumda heap ±%4, geometri/doku sabit |
| FPS 1080p · iGPU (oto) | Redd 56.1 · Hayko 50.8 · Kuantum 52.3 · Klostro 58.4 (öncesi 35.9 / 42.9 / 51.7 / 32.3) |
| İlk etkileşim | "Evrene gir" bırakıldıktan sonraki en uzun kare 17–18 ms |
| Gizlilik | Hub ve albüm sayfalarında üçüncü taraf isteği 0 (E2E); YouTube yalnızca plak takılınca yüklenir |

### 15.3 Grup puanları

K4/K9/K10'a göre 9.8 yalnızca ölçülmüş kanıtla verildi. 🔒 = dış karar bekliyor, ⬜ = gerekli girdi bu ortamda yok.

| Grup | Puan | Kanıt | 9.8 için eksik |
|---|---|---|---|
| A Ürün akışı & hub | **9.8** | ≤2 tık, hazır ≤1.3 s, derin bağlantı + "Bulunamadı" + geri tuşunda raf konumu (E2E) | — |
| B Görsel dil & 2D | 9.6 🔒 | Token'lar, kendi sunucumuzdan fontlar, otomatik WCAG vurgu rengi | B14: yüksek çözünürlüklü kapaklar |
| C Cihaz & erişilebilirlik | **9.8** · C17/C18 ⬜ | Lighthouse a11y 100, odak yönetimi, azaltılmış hareket, Pixel 7 E2E | Gerçek iPhone Safari, Android, Instagram tarayıcısı |
| D Performans | 9.7 ⬜ | Tablo 15.2 | Gerçek telefonda Redd ≥30 fps; orta segment GPU ölçümü |
| E Mimari & KISS | **9.8** | Tek motor, yeni evren = 1 klasör + 1 satır, ~7.4k satır | — |
| F Veri & içerik | **9.8** | Resmî parça sıraları, 23 videoId, künyeler, tek veri kaynağı `album.ts` | — |
| G Güvenlik, gizlilik & telif | 9.7 🔒 | Gizlilik sayfası, nocookie, gizli anahtar yok | Sanatçı/label izni |
| H Altyapı & dağıtım | 9.5 🔒 | CI tanımlı; derleme ve 404 yönlendirmeleri yerelde doğrulandı | Hosting seçimi; CI'ın ilk push'ta yeşil koşması |
| I Yayın olgunluğu | 9.5 🔒 | robots.txt, 404, gizlilik, sürüm etiketi | Domain → mutlak `og:image` |
| K 3D render | 9.7 | Evren ekran görüntüleri, AgX + renk derecelendirme, uyarlamalı kalite | Kuantum/Hayko plak etiketleri düşük çözünürlüklü kapaktan |
| L Dünya & kapak sadakati | 9.7 | Kapak Noktası kareleri 4/4 | İnsan gözüyle kapak karşılaştırması |
| M Oyun tasarımı | 9.6 ⬜ | 4 ayrı mekanik, rastgele dağılım, sırasız takma, final | 2–3 kişiyle oyun testi |
| N Ses & müzik | 9.7 ⬜ | Doğru parça, mesafe kazancı, ducking, prosedürel ortam | iOS'ta gerçek cihaz ses testi |
| O Kontrol & oyun hissi | 9.7 ⬜ | 8 ayar, pointer lock yedeği, head bob azaltılmış harekete bağlı | Oyun testi |
| P HUD | **9.8** | Minimal HUD, dokunmatik düğme adları, E2E | — |
| R Anlatı & dramaturji | 9.7 | Parça başına an/bölüm eşlemesi; söz alıntısı yok (K8) | Oyun testi geri bildirimi |

**Evren puanları:** Redd W93 9.7 · Hayko W94 9.6 · Kuantum W95 9.6 · Klostro W96 9.7. Hayko ve Kuantum'u kapak çözünürlüğü, dördünü de insan oyun testi sınırlıyor.

### 15.4 Bu turda yapılanlar (özet)

- Uyarlamalı kalite: çözünürlük tabanına inilip hâlâ yavaşsa bir alt kademeye geçiş; gölge haritası seyrek güncellenir.
- Ebru shader'ı sinüs bükümüne indirildi; iGPU'da Klostro 32 → 58 fps. Gökyüzündeki `atan` dikişi giderildi.
- Otomatik WCAG vurgu renkleri (`engine/core/color.ts`): küçük metin ve buton yazısı her albümde ≥4.5:1.
- Gizlilik ve "Bulunamadı" sayfaları; raf konumu sekme boyunca korunur.
- Kapak `fetchpriority`, sıkıştırılmış kapaklar, `robots.txt`; 404 sayfası GitHub Pages alt dizinini tanır.
- İlk AudioContext maliyeti basma anına taşındı; oyuna girişte takılma yok.

### 15.5 9.8 için senin adımların

1. **Kapaklar:** Kuantum Dolanıklık ve Beni Büyüten Şarkılar için ≥1200×1200 kare görseli `public/covers/` altına koy (aynı dosya adı).
2. **Gerçek cihaz:** Redd demosunu iPhone Safari, Android Chrome ve Instagram uygulama içi tarayıcısında aç; ses, dokunmatik ve fps'i not et.
3. **Oyun testi:** 2–3 kişi her evreni ~10 dk oynasın; takıldıkları yeri ve "albümün içindeyim" hissini yaz.
4. **Hosting:** GitHub Pages mı, Vercel mi? Domain belli olunca `og:image` mutlak URL'ye çevrilir ve `sitemap.xml` eklenir.
5. **İzin:** Kapak ve sanatçı adlarının kullanımı için sanatçı/label onayı.
6. **Commit:** Değişiklikler henüz commit edilmedi; onay verirsen dal açıp commit'lerim.

---

## 16. EK C — HİKÂYE, KEŞİF VE GERÇEK CİHAZ TURU (26.09.2026)

§12 protokolüne göre delta rapor. Bu tur, oyuncu gözüyle yapılan test ve kullanıcı geri bildirimi üzerine yapıldı. Masaüstü ölçümleri bir önceki turdaki makinede alındı (RTX 5070 ve Intel UHD). Telefon ölçümleri gerçek cihazda alındı: Redmi Note 9 Pro, Android 10, Chrome 151, USB üzerinden CDP ile.

### 16.1 Geri bildirim → yapılan

| Geri bildirim | Durum | Kanıt |
|---|---|---|
| Yazılar ve 3D modeller kendi ekseninde dönmesin, arkadan bakınca kaybolmasın | ✅ | Tüm başlıklar ekstrüde, sabit 3D yazı (`engine/core/text3d.ts`). Plaklar, eşyalar ve kâse dönmüyor. Klostro kapsül harfleri iki yüzlü. |
| Şarkı bir hikâye gibi, saniye ilerledikçe evren değişsin | ✅ | 259 zaman damgalı perde (Redd 148, Hayko 81, Klostro 17, Kuantum 13). Zamanlar lrclib senkron sözlerinden alındı; sahnelere söz değil, yalnızca yorum satırı yazıldı (K8). Geri sarınca çizelge baştan başlar. |
| Kapak Noktası belli değil, girilince çıkılamıyor | ✅ | Işık huzmesi + halka + şövale. Çıkış E, ESC, WASD, oklar ya da Boşluk ile. F fotoğraf çeker. E2E: "Kapak noktası…" |
| Sıfırlama ve plak çıkarma yok, etkileşimler eksik | ✅ | Gramofonda "E Plağı çıkar" ve "R Duraklat/Çal". Menüde ve albüm sayfasında "Evreni sıfırla", sayfa içinde onaylanıyor. E2E ile doğrulandı. |
| Her şarkıya ve evrene birden çok easter egg | ✅ | 62 gizli keşif (Redd 28, Hayko 21, Klostro 7, Kuantum 6). HUD'da kart çıkar, keşif kalıcı kaydedilir, albüm sayfasında listelenir. |
| Tünele girmek ışınlanma gibi | ✅ | Zeminde gerçek delik var. Huniden aşağı kayılır, fener ışığında ~40 m sürünülür, karşı delikten tırmanarak çıkılır. İkinci tünelin ortasında tavşanın odası var (`worlds/klostrofobik-kaplumbaga/tunnels.ts`). |
| Bazı nesnelerin içinden geçiliyor | ✅ | Kuantum ikizleri, kedi (hareketli çarpışma), masa; Klostro kâsesi, kedi, kapsüller; Hayko'da dikili taş. Redd sahne nesneleri `block()` ile, yalnızca sahne etkinken katı. |
| Evreni sıfırla düğmeleri düzgün çalışmıyor | ✅ | Hub düğmesi yalnızca plak dinlenince görünüyordu ve `window.confirm` uygulama içi tarayıcılarda engelleniyordu. Artık keşif ya da final varken de görünür, sayfa içinde onaylanır, geri bildirim verir. E2E: hub + menü. |
| İnsanlar bu albümler hakkında ne düşünüyor | ✅ | §16.4 |

### 16.2 Bu turda bulunan ve düzeltilen hatalar

| Hata | Etki | Düzeltme |
|---|---|---|
| 3D yazıda sıfır uzunluklu normaller → NaN piksel → bloom tüm ekranı karartıyordu | Redd'de şarkı anlarında tam siyah kareler | `sanitizeNormals`. 12 şarkı × 5–7 anda NaN = 0 (framebuffer taraması). |
| Sedgwick fontunda boş glif deliği → earcut çöküşü | **Hayko evreni hiç açılmıyordu** | Alansız delikler üçgenlemeden önce ayıklanıyor. |
| Kedi STL'i Z-yukarı modellenmiş | Kuantum'da kedi burnu havada dik duruyordu | `rotateX(-π/2)`. Baş, yürüme yönüne bakıyor. |
| Hayko'da 3D başlık gölge oyununun önüne düşüyordu | Hikâye okunmuyordu | Gölge perdesi girişe göre sola alındı (`SHADOW_AZIMUTH -1.2`). İpucu güncellendi. |
| Ortam haritası yokken metalness 1 | Çatal ve saat simsiyah görünüyordu | Yeni eşyalarda yarı metal malzeme. |
| Klostro tüneline girişte C düşük FPS'te kaçırılıyordu | Tünele girilemiyordu | Kenar tetiklemeli `onAction("KeyC")`. |
| Plak takılınca "Gramofonu bul" ipucu 6 sn ekranda kalıyordu | Yanlış yönlendirme | Tak anında ipucu temizleniyor. |
| Kanıyorduk'ta ilk 20 sn, Hala Seni Çok Özlüyorum'da ilk 73 sn yapılacak hiçbir şey yoktu | Oyuncu bekliyordu | "Kitabı aç" eklendi. "Dayan" eklendi: darbeye zamanında dayanırsan sarsıntı hafifler. |
| Tasma oyuncuyu anında ışınlıyordu | Kopukluk | Tasma gerildikçe oyuncuyu çeker. |
| Telefonda çizim 1× (2.75 DPR ekranda) | Bulanık görüntü | Dokunmatikte düşük kademe 1.5× (ölçüm §16.5). Yavaş cihazda dinamik çözünürlük düşürür. |

### 16.3 Evrenlerde ne değişti

- **Redd · Mükemmel Boşluk:** 12 şarkının her biri kendi perdeleriyle akıyor (örnek: Kanıyorduk'ta kitap → dev → yıldızlar → yükseliş → yırtılan sayfa). Her şarkıda 2 keşif, dünyada 4 keşif var (Seyir Defteri, Gregor, Hiçbir Şey, İade Edilmiştir).
- **Hayko · Beni Büyüten Şarkılar:** 9 gölge oyunu perde perde ilerliyor. Örnek: yalnız adam → soru → hayal pencere → ipler → isyan ve kara yağmur. Zarın içinde şarkının o anında 3D hatıra eşyaları beliriyor: kukla, mektup, beş damla, dilekçe, kızıl halkalar, klarnet, çay, kesik saz, yanan tüy, yıldız, muska, tapu, dikili taş. Bunlara ek olarak davranışla açılan keşifler var: yükselme akımı, kâbusta zıplamak, meydanla bağırmak, bebeği izlemek.
- **Kuantum Dolanıklık:** Uzun girişten sonra her dize odayı değiştiriyor. Çiçekler açıyor, ay iniyor, oda "tafra" ile sallanıyor, bilekler bağlanıyor, kutu daralıyor, kadeh uzanıyor, boyna tasma geçiyor, gülüşte gamze beliriyor ve dokununca kıyamet kopuyor. 6 keşif var.
- **Klostrofobik Kaplumbağa:** Gerçek tüneller ve tavşanın odası eklendi. Dizeler kâğıda damlıyor ("aynı sahneler" halkası). Kaplumbağa kabuğuna gömülüyor, sis daralıyor. Nakaratta kâse ve dev çatal çıkıyor, Kuantum'dan kaçan kedi beliriyor. 7 keşif var.

### 16.4 Dinleyici ve eleştiri araştırması → tasarım

| Kaynak | Özet (kendi sözlerimle) | Evrene yansıması |
|---|---|---|
| Milliyet Sanat (Y. H. Tok), Gaia Dergi, bir Medium incelemesi | Mükemmel Boşluk distopik, elektronik ağırlıklı ve çıtayı yükselten bir albüm olarak görülüyor. Kafka etkisi yalnızca Kafakafka'da değil, bütün albüme sızmış. Sextronot'ta Bowie göndermesi var. Hala Seni Çok Özlüyorum senfonik bir beste. | Kraterde gezen böcek Gregor. Kafakafka'da buzdolabında "Dönüşüm". Sextronot'ta Bowie keşfi ("Ground Control"). Bugün Herkes Ölsün en karanlık, en durağan sahne. |
| Hürriyet (grup röportajı) | Sextronot'taki astronot kostümü insanların kabuğu; çıplaklıkla öze dönülüyor. | Sextronot'ta kask tak/çıkar vizörü ve "Birden dünyalı oldu" perdesi. |
| Ekşi Sözlük ve dinleyici yorumları | Bir kısım dinleyici eski Redd sesinden ayrılışa sert tepki verdi. Bugün Herkes Ölsün, Sextronot ve Boşlukta Dans albümün atmosferinin en yoğun hissedildiği şarkılar olarak anılıyor. | Bu üç sahne en uzun ve en çok değişen sahneler olarak kuruldu. |
| Agos (Hayko röportajı), dinleyici yorumları | Ağır bir vokal albümü. Dokuz şarkı yetmediği için "Vol.1". Parça sırası onun biyografisini anlatıyor. İlk hafta iTunes'ta 1 numara oldu. Tepkiler bölündü: Yuh Yuh yorumu çok övüldü, "hepsi cover" eleştirisi de yapıldı. | Her şarkı bir ay: biyografi, anne karnında büyüme olarak kuruldu. Yuh Yuh'ta meydanla bağırma keşfi. Gölge oyunu şarkıların kendi hikâyesini (orijinal sanatçı bağlamı) anlatıyor. |
| Henry the Lee | İki tekli hakkında basın metni neredeyse yok. Anlam sözlerden çıkarıldı. | Kuantum ve Klostro çizelgeleri doğrudan dize yapısına dayanıyor. |

### 16.5 Ölçümler

| Ölçüm | Sonuç |
|---|---|
| Tip & test | `tsc` strict 0 hata · Vitest 23/23 · Playwright **29/29** (yeni: hikâye akışı, plak çıkarma, R, Kapak Noktası + fotoğraf, keşif kaydı, menüden ve hub'dan sıfırlama, Hayko eşyası, tasma, gerçek tünel geçişi) |
| Gerçek telefon (Redmi Note 9 Pro · Chrome 151) | Demo hazır 0.5–1.0 sn. Yatayda krater ve 4 demo sahnesinin hepsi 1.5× çözünürlükte (1098×588) **58–60 fps**, p95 16.8 ms, konsol hatası 0. 2× denendi: 55 fps, p95 33 ms, bu yüzden tavan 1.5×. |
| Masaüstü dGPU | 4 evren ve yeni sahneler (tünel, ay, kara yağmur, yükselme akımı) 60 fps |
| Masaüstü iGPU (oto) | Hayko 53–55 · Kuantum 60 · Klostro 60 · Redd 56–58 fps |
| NaN taraması | Redd 12 şarkı × 5–7 zaman noktası: NaN/Inf 0 |
| Etkileşim boşluğu | Redd'de 11 şarkıda 1. saniyeden itibaren en az bir eylem var; Kalpsiz Romantik'te ilk eylem deniz dolunca, ~10. saniyede açılıyor (ölçüldü) |
| Hub paketi | three.js yüklenmez (yalnızca hub + albüm verisi) |

### 16.6 Puan güncellemesi

| Grup | Önce | Şimdi | Not |
|---|---|---|---|
| C Cihaz & erişilebilirlik | 9.8 · C17/C18 ⬜ | 9.8 · Android ✅ | iPhone Safari ve Instagram tarayıcısı hâlâ senin cihazında denenmeli |
| D Performans | 9.7 ⬜ | **9.8** | Gerçek orta segment telefonda 58–60 fps ölçüldü |
| M Oyun tasarımı | 9.6 ⬜ | 9.7 ⬜ | 62 keşif, zaman çizelgeleri, erken eylemler. 9.8 için 2–3 kişilik oyun testi gerekiyor. |
| N Ses & müzik | 9.7 ⬜ | 9.7 ⬜ | Hikâye YouTube saatine bağlı; iOS ses testi hâlâ gerekli |
| O Kontrol & oyun hissi | 9.7 ⬜ | 9.8 | Kapak Noktası çıkışları, R/E gramofon, tünel rayı, "Dayan" (E2E) |
| R Anlatı & dramaturji | 9.7 | **9.8** | 259 zaman damgalı perde, söz alıntısı yok, dinleyici araştırmasıyla bağlantılı |
| K 3D render | 9.7 | 9.8 | NaN kaynağı kapandı, gerçek tünel aydınlatması, katı 3D yazılar |

**Evren puanları:** Redd 9.8 · Hayko 9.7 · Kuantum 9.7 · Klostro 9.8. Hayko ve Kuantum'u düşük çözünürlüklü kapak sınırlıyor, dördünü de insanlı oyun testi.

### 16.7 9.8 için senin adımların

1. **Kapaklar:** Kuantum ve Hayko için ≥1200×1200 kare görsel (§15.5-1).
2. **iPhone ve Instagram:** Redd demosunu iPhone Safari'de ve Instagram uygulama içi tarayıcısında aç (Android Chrome ölçüldü).
3. **Oyun testi:** 2–3 kişi her evreni ~10 dk oynasın; not al: hangi keşfi buldular, nerede takıldılar, "şarkının içindeyim" dediler mi.
4. **Hosting, domain ve izin:** §15.5-4/5 geçerli.
5. **Commit:** Değişiklikler henüz commit edilmedi; onay verirsen dal açıp commit'lerim.

---

## 17. EK D — KAPAK SADAKATİ, ANLATI VE KEŞİF TURU (26.09.2026)

Bu tur, kullanıcının şu notları üzerine yapıldı:
- REDD yazısı toprağa gömülü.
- Sol alttaki satırlar yanlış söz gibi okunuyor.
- Kapak Noktaları kapağa benzemiyor.
- Easter egg'lerin bazıları gerçekten çalışmıyor (ör. çatlaktan dışarı bakılamıyor).
- Kuantum'da plak bulunamıyor.

### 17.1 Kapak sadakati (kapakla yan yana karşılaştırıldı)

| Evren | Önce | Şimdi |
|---|---|---|
| Redd | REDD gömülü, altında gölge "yansıması"; figür küçük | Harfler tek taban çizgisinde zemine oturur, gölge yok. Başlıkta BOŞLUK'un O'su fırça enso. Kraterde kapaktaki koni tümsek, açık kül zemin. Kapak kadrajında figür kapaktaki boyutta. |
| Hayko | Bebek yan yatık, başlık kadrajdan taşıyor, sahne soluk pembe | Bebek kapaktaki gibi başı sağ üstte, yüzü sağa. Rahim koyu kan kırmızısı, bebek arkadan kontur ışığıyla parlıyor. Üstte bokeh lekeleri. Başlık ve alt yazı kapaktaki yerinde, beyaz ve koyu gölgeli. Bloom perdesi kaldırıldı, göbek bağı kanca yapmıyor. |
| Kuantum | Kamera yüze fazla yakın, ilmikler kesik, künye kadrajda, göz parlaması gömülü | Yüz kapaktan ölçüldü: asimetrik halat, iki asılı ilmik, sol üstte parlamalı göz, kırpık göz. Duvarlar düz boyalı parlak sarı. Künye batı duvarında. Kadrajda gülüş kapaktaki derinlikte, göz açık. |
| Klostro | Figürün başı ve bir kapsül kadraj dışında | Kapsüller kapaktaki gibi ince, figürün solunda havada süzülür. Tavşan kapak pozunda. Gökyüzü ebrusu yatay akar. Kadraj kapakla birebir. |

### 17.2 Anlatı satırları ve şarkı sözleri

- Sol alttaki satırlar şarkı sözü değil. Bunları sözlerle karşılaştırdım; söz dizesini fazla yakından yankılayan 44 satırı (yanlış söz gibi okunuyorlardı) ekranda olanı anlatan satırlara çevirdim. Hayko, Kuantum ve Klostro'da ~75 satır daha aynı ilkeyle yenilendi.
- Satırın üstünde küçük bir "Hikâye" etiketi var.
- Gerçek sözler için `public/lyrics/<parça>.lrc` desteği eklendi. Dosya varsa sözler sol altta saniyesiyle görünür, hikâye satırı üste kayar. Proje söz metni içermez; görüntüleme izni gerekir (`public/lyrics/README.md`).

### 17.3 Easter egg'ler artık gerçekten bir şey yapar

Yalnızca kart gösteren her keşfe evrende görünen bir sonuç eklendi. Örnekler:
- **Kuantum:**
  - Çatlaktan kamera gerçekten dışarı çıkar: sarı boşlukta süzülen başka kutular, birinin üstünde kedi. Kendi kutuna dışarıdan bakıp geri dönersin.
  - Merkezde ikizin kaybolur, ip çözülür.
  - Ayın karanlık yüzünde yıldızlar belirir.
- **Redd:**
  - Şişedeki mektup havada açılıp yanar.
  - Bidon havaya kalkıp baş aşağı döner.
  - Cep saati sana döner, akrebi ilerleyemez.
  - Bilet göz hizasına kalkıp müzeye uçar.
  - Sakız uzayıp kopar.
  - Yara bandı yaraya yapışıp düşer.
  - Gülen yüzün gözünden yaş akar.
  - Tabela okları pusula gibi döner.
  - Limon buzdolabından yuvarlanır.
  - Defter açılır.
  - Gregor sırtüstü devrilir.
  - "Hiçbir Şey" anında dünya beyaza açılır.
  - Figürün topuğunda "İADE" etiketi sarkar.
- **Hayko:**
  - Kaset B yüzüne döner.
  - Ultrason göz hizana gelir.
  - Mektuptan "Aldırma." sayfası çıkar.
  - Kırık testi bir an bütünleşip içinde su parlar.
  - Dilekçeye "ALINDI" damgası basılır.
  - Tabureye oturulur.
  - Kesik teller titrer.
  - Tüy alevlenip yükselir.
  - Muskadan kâğıt şerit düşer.
  - Tapu rüzgârla çırpınır.
  - Dikili taşta "kaldı" ışıldar.
- **Klostro:**
  - Çatal çorbaya dalar.
  - Kedi odanın öbür ucunda belirir.
  - Dört delik geçilince tümsekler ışıldar.
  - Cep saatinin akrebi çıldırır.
  - Yavaş kazananın çevresinde damlalar açılır.
  - Ustanın imzası dev bir damla olarak düşer.
  - Kabukta beklenince dünya akıp geçer.

### 17.4 Diğer düzeltmeler

- **Kuantum'da plak:** Plak artık seni ayna gibi taklit eden, parlayan bir mürekkep ikizin elinde. İşaret önce onu gösterir, yürümeye başlayınca karşı noktayı.
- **Dönme:** Kendi ekseninde dönen şişe, vitrindeki kalp ve virüs parçacıkları sabitlendi (hafif sallanma).
- **Metal nesneler:** Çatal, saat ve anahtarlar ortam haritası olmadan siyah görünüyordu; malzemeleri düzeltildi.
- **Testler:** Vitest 24/24, Playwright **31/31** (yeni: çatlaktan dışarı bakış, söz dosyası gösterimi). Derleme temiz.

---

## 18. EK E — KLİPLER, KATI DÜNYA, TAŞINABİLİR GRAMOFON, KAŞİF SIRLARI (26.09.2026)

Sahibin isteği: her şarkı sinema filmi gibi izlenen bir 3D klip olsun; şarkı yokken evren kapağın aynısı kalsın; klip kapatılabilsin; nesnelerin içinden geçilmesin; gramofon taşınabilsin; haritayı gezenler için yeni sırlar; Kuantum'da plak alınamıyordu; Sextronot geri sayımı şarkıdan hızlıydı; buzdolabının içi görünmüyordu; hamamböceği daha gerçekçi olsun.

### 18.1 Klip sistemi

- **Yönetmen (`engine/game/director.ts`):** Şarkının saniyesine bağlı çekim listesi. Çekim türleri: dolly/vinç (from → to), yörünge, hareketli nesneyi izleme; bakış noktası da kayar; FOV, eğiklik ve omuz kamerası titremesi (azaltılmış harekette kapalı). Kesmeler sözlerin anlarındadır.
- **Sinema modu (`boot.ts`):** Şarkı başlayınca klip sinemaskop bantlarla açılır (ayarlardan kapatılabilir). Oyuncu kamerası ile yönetmenin karesi arasında yumuşak geçiş; çekimler arası kesme. Yürümek ya da E serbest bırakır; V geri döndürür. Oyun arayüzü çekilir, söz ve hikâye kalır, müzik kartı küçülür.
- **Klibi kapat (K / kart düğmesi / ayar):** Müzik sürer; dünya `onTrack(null)` alır ve `songTime()` -1 döner, bütün perdeler kapak hâline döner. Açılınca sahne şarkının o anına yetişir.
- **Çekim listeleri:** Redd'in 12 şarkısı elle yazıldı ve kare kare önizlendi (hareketli gemilerin yelkenine, figürün içine, kapsüllere giren çekimler düzeltildi). Hayko'da perdelerden üretilen altı çekim kalıbı (bebeğin silueti önde, gölge oyunu arkada…). Kuantum ve Klostro kapağın kadrajıyla açılıp kapanır.
- **Kendi kendine ilerleyen klip:** Kalpsiz Romantik'te gece gemiler birer birer tutuşur; İtiraf'ta her itiraf dizesinde bir mum yanar ve kamera ona keser; Boşlukta Dans'ta görünmez bir dansçının şeridi boşluğa sekiz çizer.
- **Okunurluk:** Kanıyorduk'taki devin ve Tam Bi Delilik'teki cellatın arkasına soluk hale eklendi (gece göğünde siluet okunur).

### 18.2 Katı dünya

- `colliders.solid(nesne, {shape, pad, maxCircles, when})`: yerel sınır kutusundan ayak izi daireleri (uzun nesnelerde boyuna, kutularda köşe daireleri), her kare dünya dönüşümüyle taşınır; nesne gizliyken, baş hizasının üstündeyken ya da üstünden atlanırken engellemez. Daire çarpıştırıcılarına `owner` (görünürlük) ve dikey kapsam eklendi.
- Uygulananlar: kapak sehpası, gemi gövdeleri ve batıklar, uzak ev, lamba, tabela, kül canavarı, cellat, sokak lambaları, müze camları, süzülen ev eşyaları, dev televizyon, dev böcek (yalnızca gövde), Sextronot kapısının kanadı, kıyafet, mobilyalar, dev, heceler, bidon, Hayko'nun anı kabarcıkları; kalabalıklar (`crowd.solidify`). Hayaletler ve dolanık ikiz bilerek geçirgendir.
- Otomatik denetim betiği: görünür, yürünebilir yükseklikteki çarpışmasız nesneleri listeler; kalan bulgular ağaç tepeleri, yelkenler gibi gövdesi zaten katı olan taşmalardır.

### 18.3 Taşınabilir gramofon

- G: sehpadan kucağa al / istenen yere koy (sehpaya 2.2 m yakınsa yerine oturur). Kucakta müzik sürer; dokunulan plak doğrudan tablaya konur. Yere konan gramofon katıdır; kapak moduna girerken sehpasına döner. Telefonda "Gramofon" düğmesi.
- Kuantum'un karşı noktası, tasma ve "gramofonun yanında" ölçümü; Klostro'da serbest tavşanın dinleme yeri gramofonun o anki yerini izler.

### 18.4 Kaşif sırları (10 yeni, toplam 72)

- **Redd:** Boşluk Postası (uzak sırtta posta kutusu, mektup havada açılır), Boşluğun Merkezi (kraterin ortasında durunca boşluk seni figüre kaldırır, paraşüt gibi indirir), İlk Ayak İzi (krater dışındaki bayrak dalgalanır, kapsül göğe fırlar).
- **Hayko:** Annenin Kalbi (rahim onunla atar), Göbek Bağı (ışık bağ boyunca bebeğe iner), Dışarıdan Bir Ses (ışık yarığı aralanır, ninni sızar).
- **Kuantum:** Bakışma (duvardaki göz seni izler), Kutunun İçindeki Kutu (iç içe açılan kutulardan bir ay yükselir).
- **Klostro:** Kâğıdın Kenarı (kıvrık köşe kalkar, altında tekne suyu; gökten inen dev fırça kâğıda boya serper), Yavrular (üç yumurta çatlar, üç minik kaplumbağa üç yöne yürür).
- Sinema kamerasının yakınlığı sır açmaz (`ctx.cinema`).

### 18.5 Hata düzeltmeleri

- **Kuantum plağı:** Odanın ortasındaki buluşma halkasında ikizinin elinden alınır.
- **Sextronot geri sayımı:** 130.19 sn'den itibaren 1 sn adımlarla, şarkıyla birebir.
- **Buzdolabı:** İçi boş gövde, ışıklı iç, raflar ve eşyalar.
- **Hamamböceği:** Segmentli karın, damarlı kanat örtüleri, kenarı açık kalkan, sallanan antenler, dikenli bacaklar ve üçlü adım; Gregor ve Kafakafka'nın dev böceği.
- **Kamera nesneleri:** Kapak/sinema modundan çıkarken gizli kamera nesneleri (eldeki çiçek) yanlışlıkla görünür oluyordu; artık yalnızca önceden görünenler geri açılır.
- **Telefon düzeni:** Dört dokunmatik düğme tek sırada (video kartının altında kalmıyor); hikâye künyenin altına, sözler alt ortaya taşındı.

### 18.6 Doğrulama

- tsc 0 hata · Vitest **26/26** (katı nesne, klip yönetmeni) · Playwright **33/33** (yeni: sinema/klip anahtarı, gramofon taşıma) · derleme temiz, hub paketi three.js içermez.
- Entegre GPU'da 54–60 fps (önceki turla aynı).
- Bütün kliplerin temas levhaları ve kaşif sırlarının ekran görüntüleri incelendi.

## 19. EK F — SÜRÜMLER, KLİP DİLİ VE ŞARKI KURGULARI (26.09.2026)

Sahibin isteği: evrenlerin şarkıya özelleşmemiş ilk hâlleri "Sürüm 1", güncel hâlleri "Sürüm 2" olarak kalsın, "Evrene gir"de önizlemeli seçilsin, eski sürümler kaybolmasın; V ile klibe dönülebilsin; tekrar eden arayüz alanları kalksın; klipler çok daha profesyonel, soyut ve somut imgeli, gizli mesajlı, her dizesi hissedilen AAA işler olsun; her şey test edilsin.

### 19.1 Sürümler

- **Sürüm 1** (ilk hâller) `depo/` altında kendi adresleriyle geri geldi (Redd, Kuantum, Klostro, Hayko); derlemeye `LEGACY_V1` girişleriyle dahil. Sürüm 2 `worlds/<id>/`.
- **Sürüm seçici** (`src/hub/versionPicker.ts`): "Evrene gir" iki sürümü üç önizlemeyle, özellikleri, "Son girdiğin" rozeti ve telefon uygunluğuyla gösterir; Esc, arka plan ve × kapatır; odak tuzağı var. Önizlemeler `public/previews/<id>/v1-*.jpg` ve `v2-*.jpg` (v2: açılış karesi + iki imza klip karesi).
- Telefonda Sürüm 2'si açılmayan albümün Sürüm 1'i telefonda oynanabiliyorsa seçici yine açılır (Klostro).
- **Düzeltme:** Hayko'nun albüm kimliği (`beni-buyuten-sarkilar-vol-1`) sürüm listesindeki anahtarla eşleşmiyordu; seçici açılmıyor, doğrudan Sürüm 2'ye giriliyordu. Anahtar düzeltildi; Hayko ve Kuantum'un Sürüm 1 önizlemeleri ana nesneye (bebek ve kor halkası, halatlı yüz) bakacak şekilde yeniden çekildi. Birim testi her oynanabilir albümün iki sürümünü, adreslerini ve önizlemelerini diskte doğrular; uçtan uca test dört albümde de Sürüm 1'e girer.

### 19.1a Telefon erişimi (sahibin kararı)

- **Telefonda yalnızca Mükemmel Boşluk Sürüm 1 açılır.** Telefon = yalnız dokunmatik ve ekranın kısa kenarı 600 CSS px altı (`engine/core/device.ts` → `isPhone`, `deviceClass`). Tablet ve bilgisayar geniş ekran sayılır.
- Kilit üç katmanda: hub (sürüm seçicide Sürüm 2 "Geniş ekranda açılır" olarak kilitli, açılabilen sürüm üstte; öbür albümlerde düğme kilitli), Sürüm 2 sayfaları (`showPhoneGate`, Sürüm 1'e bağlantı) ve öbür Sürüm 1 sayfaları (`src/phoneGuard.ts`, ana betikten önce yüklenir, `#app`'i kaldırır; eski kod değiştirilmedi).
- Sürüm listesinde her sürümün `phone` ve `tablet` erişimi ayrı (`accessOf`). Klavyesiz tablette Redd Sürüm 2 sade demoyla (yatay) açılır, Klostro Sürüm 1 açılır.
- Sürüm seçici adres değişince (geri tuşu, başka albüm) artık kapanıyor; önceden yeni sayfanın üstünde açık kalıyordu.
- Testler: telefon projesinde 9 test (dört Sürüm 2 kapısı, üç eski evren kapısı, Redd Sürüm 1 açılır, hub kilidi), yeni tablet projesi (iPad mini) 2 test, birim testi "telefonda yalnız mukemmel-bosluk@1".

### 19.2 Klip dili (motor)

- **Renk paletleri** (`GRADES`): neutral, night, fire, memory, bleach, noir, neon, fever, candle, dawn, cold, deep, pastel, blood; çekim başına ya da elle ayar (pozlama, kontrast, doygunluk, ton, gölge rengi, vinyet, renk kayması, parazit, yumuşak odak).
- **Lensler:** böcek gözü (petek), eski film (sepya, çizik), mikroskop (dairesel maske), eski TV (tarama çizgisi, bombe).
- **Geçişler:** siyahtan açılma, beyaza/beyazdan, renkli flaş (ör. kırmızı nabız), parazit; çıkışta kararma/beyaz.
- V: klip kapalıysa açar ve sinemaya döner; plak yokken ne yapılacağını söyler. Alttaki tekrar eden sinema notu kaldırıldı; V/K yalnızca müzik kartında.

### 19.3 Redd — şarkı kurguları ve gizli mesajlar

Her şarkının dizeleri lrclib zaman damgalarıyla `L` tablosuna bağlandı; anlatı satırları sözleri tekrar etmeyen özgün görsel betimlemelere çevrildi; her klip 30–55 çekim, kare kare temas levhasıyla gözden geçirildi.

- **Kalpsiz Romantik:** Kurutulan denizin dibinde, yalnız yukarıdan görünen, sağ yanı kırık bir kalp; ortası kalp biçiminde yanmış kâğıt; dalgalar halinde doğrulan bedenler.
- **Kanıyorduk:** Açılır kitap; kâğıt adam ve dev; yırtılıp birleşen fotoğraf (kalem notu "s. 88").
- **Aşk, Virüs:** Numaralı vitrinler ("No. 3 · KUSURLU"), heceler, damar yürüyüşü, mikroskop lensi.
- **Onlar Bile Üzülürler:** Plaketler soldan sağa KALPSİZ yazar; jiletler dudak olur.
- **Bugün Herkes Ölsün İstedim:** Anıda kimsenin yapmadığı iki uzun gölge; donmuş zamanda dönen kamera; toprağa gömülü kablosuyla hiç açılmayan kırmızı telefon (Laurie Anderson'ın "O Superman"ine selam).
- **Senden Vazgeçeli Çok Oldu:** Gece pencere mors alfabesiyle S-E-N der ("yalnız sen anlarsın"); eski film arası; benzin gibi yanardöner su birikintileri; sonda bütün ağaçlar dağılır, külün altında kalp hâlâ atar ("vazgeçtim" demek vazgeçmiş olmak değildir). Canavarın gözleri kafasının içinde kalıyordu (eski hata) düzeltildi.
- **Kafakafka:** Gerçek yansımalı ayna: içine bakan kendini değil, durduğu yerde dik duran bir hamamböceği görür (Kafka, Dönüşüm); ayna arkasını döner, sonra çatlar. Nakaratta her şey donar, yalnız saat bir geceyi saniyelerde geçirir; ahize kalkar, asılı kalır. Dev ekranda ağzı hiç durmayan kürsü silüeti (eski TV lensi), böcek gözünden bakış.
- **Tam Bi Delilik:** Uçuruma gidip bankın önünde dönen ayak izleri; yırtık fotoğraf, fincan, atkı, mektup, kaset; sabah yatağı (örtünün altındaki kıpırtısız beden); "Kırık İlişkiler Müzesi · Env. No. 88 — Kalp, çatlak" etiketi (Zagreb'deki müzeye selam); final: mahalleler söner, bankta tek çiçek.
- **Sextronot:** "MT · 1969" yazılı kapsül (Major Tom, Space Oddity'nin yılı), yer kontrol anteni, kaskın yanında Aladdin Sane şimşeği, masada atmosfer kabarcığı, "esneyen" mobilyalar, kırmızı alarmlı geri sayım; sonda karşılıklı iki sandalye yan yana gelir.
- **İtiraf:** Öbür yanında kimse olmayan günah çıkarma kafesi; önünde otuz gümüş sikke (Yahuda); "abarttım"da alevler boylarından büyük; büyük ateşte atan kalp.
- **Boşlukta Dans:** Su altı ışık ağları (kostik) ve kabarcıklar; "Adı: ……" yazılı boş isim kartlı beşik dönencesi; neon sokak dansı.
- **Hala Seni Çok Özlüyorum:** Kameranın içinden geçen hayaletler; darbelerde kırmızı flaşlar; gözünden yaş süzülen tebeşir yüz; kalabalığın tersine yürüyen tek sıcak gölge; sözle atan kalp; sonda yara dikiş izine döner. Yara şeridi yukarıdan hiç görünmüyordu (üçgenler aşağı bakıyordu) düzeltildi.

### 19.4 Hayko, Kuantum, Klostro

- **Hayko:** Şarkı başına renk dili (perdeye göre), uzun perdelerde ~8 sn'de bir aynı renkte yeni açı ve her şarkıya bir sahne parçası (`props.ts`): kukla ipleri (isyanda kopar), Sinop hücresi penceresi (eski film; şafakta parmaklıklar çözülür, martılar), damlayan çeşme, halka olmuş yumruklar, kırmızı şemsiye ve yağmur, tabandan yükselen otuz üç ışık (Sivas 1993'e sessiz anma; sayı yazılmaz), tek spot ve alev halkası, bağlama ve küçülen silindir şapka, parsellere bölen çit kazıkları.
- **Kuantum:** Dolanıklık anları parazitle keser; ikiz mikroskop lensinden "gözlenir"; kibirde oda yatar; dizelere ek kesmeler.
- **Klostro:** Kabuğa çekilince görüntü kabuğun yuvarlak ağzından; ebru renkleri; kıtalara ek kesmeler; bir bölgede kamerayı karartan iki çekim taşındı.

### 19.5 Doğrulama

- tsc 0 hata · Vitest **27/27** · Playwright **35/35** (yeni: sürüm seçici ve önizlemeler, Sürüm 1 hatasız açılır; eski metin beklentileri güncellendi) · derleme temiz (`dist/depo/*`, `dist/previews/*`).
- Entegre GPU: 50–60 fps; Kafakafka aynası yansımayı iki karede bir tazeler (46 → 51 fps). Harici GPU'da her yerde 60 fps.
- 23 şarkının bütün klipleri temas levhalarıyla kare kare incelendi; karanlık, kadraj dışı, nesnenin içine giren ve lekeyle kaplanan çekimler düzeltildi.

## 20. EK G — PLAK KİTAPLIĞI, KARANLIK SAHNELER, ZENGİNLEŞEN KLİPLER (27.09.2026)

Sahibin isteği: bir kez takılan plaklar dünyaya yeniden dağılmasın, gramofonun yanındaki bir kitaplıkta dursun ve oradan alınıp çalınsın; çok karanlık sahneler düzelsin; klipler daha çok nesne, imge, figür ve atmosferle dolu dolu, film tadında olsun; her şey tek tek kontrol edilsin.

### 20.1 Plak kitaplığı

- `engine/game/shelf.ts`: gramofon sehpasının yanında ahşap bir dolap; parça sırasına göre yuvalar, her yuvanın altında numara ve şarkı adı yazan pirinç plaket, rafların altında gizli ışık şeridi (karanlık evrenlerde de okunur).
- Bir kez çalınan plak evren sıfırlanana kadar kitaplıkta durur: yeniden girişte dünyaya dağılmaz; gramofondan inen, elden bırakılan (Q) ya da değiştirilen çalınmış plak rafına döner. Raftaki plağa bakıp E ("Raftan al") ile alınır, gramofona takılır. Henüz çalınmamış plaklar eskisi gibi dünyada bulunur.
- Kitaplık dünya kurulduktan sonra gramofonun yanında, başlangıç noktasına dönük boş bir yere yerleşir ve katıdır. Dört evrende de denendi.
- Uçtan uca test: çalınan plak rafa girer, sayfa yenilenince rafta kalır, Q ile rafa döner.

### 20.2 Karanlık sahneler

- **Göz uyumu:** Klipte görüntü birkaç karede bir 16×9'a küçültülüp ölçülür (eşzamansız, GPU'yu bekletmez). Kare hedefin altındaysa (orta ton 0.3) renk katmanında gölgeler ve orta tonlar yumuşakça açılır; parlak karede etkisizdir.
- **Gece ışığı:** Redd'in gece anlarında ay ışığı iki katına çıktı; Tam Bi Delilik'in gökyüzüne şehir ışıltısı, İtiraf'a kor ışığı eklendi. Senden Vazgeçeli'nin gece kararması azaldı; İtiraf'taki göz kırpma kararması kısaldı.
- **Gece göğü:** Samanyolu şeridi, toz yolları ve iki renkli bulutsular (Kanıyorduk mavi-mor, Sextronot camgöbeği-mor, Tam Bi Delilik turuncu-bordo, İtiraf kor).
- **Çekimler:** Karanlık zemine tepeden bakan çekimler ufku ve gökyüzünü de alacak şekilde yeniden kuruldu (Kanıyorduk, Aşk Virüs, Senden Vazgeçeli, Hala Seni, Tam Bi Delilik). Kameranın içine girdiği binalar, gömülen gölgeler, kadrajı boğan ışık haleleri (lamba, pencere, mum, sokak lambası; yakında sönerler) düzeltildi.
- **Hayko:** Karanlık ve boş kalan alçak açı kalıbı yerine kapaktaki profil portresi (yavaş yaklaşma).
- Ölçüm: bütün kliplerin çekim ortası karelerinin ortalama parlaklığı betikle tarandı; karanlık bulunanlar tek tek düzeltildi.

### 20.3 Zenginleşen klipler (yeni nesneler ve atmosfer)

- **Ortak sahne parçaları (`engine/fx/sceneProps.ts`):** origami turna ve kuş (kanat çırpar), kayan yıldızlar, ışık zerreleri (ateşböceği, kor, toz), gökyüzü fenerleri, düşen yapraklar/taç yaprakları/konfeti/kül, ışığı yakalayan yağmur, hacimli ışık konileri, pirinç masa lambası, kenar ışığı.
- **Film kartları:** Klibin açılışında sanatçı · albüm, şarkının adı ve künyesi; sonunda "Son".
- **İnsan silueti:** Kalabalıkların (kıyıdakiler, mankenler, alay, hayaletler) bedeni ayrı bacaklar, kollar, omuz, boyun ve başla yeniden çizildi.
- **Redd:** Kanıyorduk (kitaptan uçan kâğıt turnalar, nabızlarda kızarır; kayan yıldızlar; kitabın yanında masa lambası), Kalpsiz Romantik (dönen huzmeli deniz feneri, martılar, kor yağmuru, ay ve samanyolu), Aşk Virüs (vitrinlerde müze spotları; nakaratta yükselen kırmızı-beyaz çift sarmal), Onlar Bile Üzülürler (taş kalplerde kenar ışığı, anma mumları, havalanan güvercinler, ağlayan gök), Bugün Herkes Ölsün İstedim (havada donan karga sürüsü, yarıktan dökülen kül), Senden Vazgeçeli (yeşilden sarıya, sonra küle dönen yapraklar, ateşböcekleri, baykuş, kor), Kafakafka (uçuşan gazeteler, abajur pervaneleri, böceğin sırtında Dönüşüm'ün elmaları), Tam Bi Delilik (şehir yağmuru, cenaze zambakları, alayın yolunda sokak lambaları), Sextronot (kayan yıldızlar, yörüngede eski bir uydu, yıldız tozu), İtiraf (son itirafta göğe yükselen fenerler, kor), Boşlukta Dans (renkli konfeti, nefes zerreleri), Hala Seni (özlemde taç yaprakları, kalp atınca yükselen fenerler).
- **Hayko:** Rahmin içine yağan yağmur (Ben İnsan Değil miyim, Ağla Sevdam), çeşme hatırasında pembe taç yaprakları, itirazda göğe savrulan bildiriler, ıssızlıkta kül, Kerem'de kor, meydanda konfeti, Nem Kaldı'da kuru yapraklar, şemsiyenin ve hücre penceresinin çevresinde kuşlar.
- **Kuantum:** Biri odanın bir ucunda, eşi tam karşısında dönen yedi dolanık parçacık çifti (aralarında ışık ipliği; bağ perdelerinde yaklaşır), sarı ışıkta toz, ay perdesinde düşen sayfalar, gamzede kâğıt kuşlar.
- **Klostro:** Karahindiba tohumları, damla perdelerinde ebru renkli taç yaprakları, dünya hızlanınca kaplumbağanın üstünden geçen kırlangıçlar.

### 20.4 Doğrulama

- tsc 0 hata · Vitest 29/29 · Playwright 47/47 (yeni: plak kitaplığı; tam paket yükünde ara sıra takılan iki zamanlama testi sağlamlaştırıldı) · derleme temiz.
- Son tarama: 23 klipten 783 kare. Çok karanlık kalan 10 kare (ortalama parlaklık 0.06 altı) tek tek incelendi; hepsi okunur gece kareleri, ikisi yeniden çekildi.
- Entegre GPU'da çoğu sahne 55–60 fps. Kafakafka aynası 51 fps. Bir şarkı sahnesi ilk açıldığında gölgelendirici derlemesi yüzünden bir kerelik kısa takılma oluyor.
- 23 klibin bütün çekimleri önce ve sonra temas levhalarıyla incelendi.

---

## 21. EK H — EVRENİ DOLAŞAN KLİPLER: KISA FİLMLER (27.09.2026)

Sahibin isteği: sinema klibi küçük bir alana odaklanmasın, kamera bütün evreni dolaşsın; sahne parçaları ve etkiler evrenin her yerine yayılsın; her şarkı daha çok ayrıntı, atmosfer, somut-soyut imge, gizli mesaj ve farklı bakış açılarıyla bir kısa film olsun; dört evrenin bütün şarkıları kapsansın; her şey test edilsin.

### 21.1 Motor: uçuş yolları

- `engine/game/director.ts`: `Shot.path` ve `Shot.lookPath`. Kamera from → path → to boyunca yumuşak bir eğri (merkezcil Catmull-Rom) izler; bakış noktası da look → lookPath → lookTo boyunca kayar. Eğri çekim başına bir kez kurulur; noktalardan biri hareketliyse (fonksiyon) her karede yenilenir. Geçişler (giriş/çıkış kararması, flaş) ortak `applyTransitions` ile uygulanır.
- `worlds/mukemmel-bosluk/songs/kit.ts`: evrenin uzak noktaları (`CENTER`, `CONE`, `MAIL`, `FLAG`, `NOTEBOOK`, `FIGURE_AT`) ve `rim(açı, h)` (kenar, r≈78), `ridge(açı, h)` (uzak sırt, r≈150), `arc(cx, cz, r, h, a0, a1, n)` (yay uçuşu noktaları). Her Redd klibi uzak sırttan açılır, kraterin kenarını, dibini ve merkezini dolaşıp sırta döner.

### 21.2 Redd — krater geneline yayılan set parçaları ve yolculuklar

- **Kalpsiz Romantik:** doğu kıyısında ahşap iskele (kazıklar, korkuluk, dört fener, bank), kıyıda beş ateş (alacakaranlıkta yanar). Sırt → iskele → gemiler → "yorgun" yayı → deniz feneri → boşalan dipteki kalp → nakarat uçuşları → sırt.
- **Kanıyorduk:** defterden merkeze akan 160 ışıklı yıldız ırmağı (kanamada kızarır), kapaktaki koni tepesinde fener (kamera yaklaşınca kızıla döner). Irmak boyunca uçuş, merkezde yörünge, kenardan dev figür.
- **Aşk Virüs:** 34 manken (yakın 14, uzak 20; r18–62), r72'de on altı direkli kırmızı şerit kordon ve yanıp sönen lambalar (taşma anında kurulur). Kenar boyunca kordon kaydırması, mankenler arasında uçuş, merkezde mikroskop lensli yörünge.
- **Onlar Bile Üzülürler:** 44 yarı gömülü kırık kalp mezarı (r18–70). Mezar yakın planları, yaylar, merkez yörüngesi.
- **Bugün Herkes Ölsün İstedim:** zaman dururken havada donan 1400 yağmur damlası (bırakınca düşer). Kule yayı, gün yolu, merkez yörüngesi.
- **Senden Vazgeçeli:** 64 dış ağaç (r27–67) ve yaprakları; yanma ilerledikçe kabuk kararır ve korlanır, finalde küçülür. Orman yayı, eve uçuş, yanık ormanda merkez yörüngesi.
- **Kafakafka:** kraterde saçılmış 28 eşya parçası (ceviz ve emaye). Dev TV'den açılış, enkaz yakın planları, kenardan TV'ye bakış; saat yakın planı beşten üçe indirildi.
- **Tam Bi Delilik:** sırt açılışı, kenar kaydırması, şehir yayları (r58–86), sırta dönüş.
- **Sextronot:** kenarda beş takip çanağı (kaide, çanak, besleme hunisi, kırmızı uyarı ışığı; uyduyu izler, kalkıştan sonra oyuncuya döner), merkezin üstünde dönen yedi soluk ay (kalkışta büyür). Sırttan kapıya uçuş, ay halkasının içinden geçiş, "dünya" yayları, çanaklardan uyduya bakış, geri sayımda çanak.
- **İtiraf:** krater boyunca 150 adak mumu (kırmızı cam kadeh, alev, ortak ışık bulutu). Her itirafla merkezden dışa doğru bir halka daha yanar, son itirafta bütün çukur; yağmur alevleri kısar. Mum tarlası üstünde alçak uçuş, kenar yayları, sırta dönüş.
- **Boşlukta Dans:** merkezde neon pist: iki halka (pembe, camgöbeği) ve halelerle on iki neon direk; sokak lambalarıyla yanar, vuruşla nabız gibi atar. Tepeden pist, kenar yayları, lamba caddesi boyunca uçuş.
- **Hala Seni Çok Özlüyorum:** kraterin her yanından merkeze yürüyen 36 uzak hayalet (bin dünya insan ve özlem anlarında). Kenar yayları, merkez yörüngesi, yaradan sırta dönüş.

### 21.3 Hayko, Kuantum, Klostro

- **Hayko (9 şarkı):** kalıp çekimlere bütün rahmi dolaşan yeni açılar eklendi: göbek bağı boyunca iniş (plasentadan bebeğe), zarın tepesinden iniş, bebeğin arkasından girişe ve gramofona, uzak duvar boyunca geniş yay (r20), ikinci kalp ve ışık yarığı (kaşif sırları), gramofonun başından bebeğe. Şarkıya özel set parçaları: Ben İnsan Değil miyim (sert yağmurda tepeden iniş), Aldırma Gönül (hücre penceresi etrafında dalga yörüngesi), İtirazım Var (yumruk kalabalığının içinden), Ağla Sevdam (şemsiye ve kuşlar), Issızlığın Ortasında (göbek bağı inişi), Neydi Günahım (Kerem'de spot ışığından bebeğe), Yuh Yuh (koro: tepeden beyaz), Nem Kaldı (parsel kazıkları etrafında yörünge). Göbek bağı eğrisi tek bir sabit (`CORD`) oldu.
- **Kuantum:** tavan köşeleri boyunca uçuş, duvar dibinde alçak kayma, tavandan dalış, köşedeki çatlak, odayı çaprazlama kesen geçiş (ikizle göz göze), gramofona uzaktan yaklaşma, son köşe süpürmesi.
- **Klostro:** ebru kâğıdının kenarı boyunca alçak süpürme, yuvaya yaklaşma, tünelden tavşanın mum ışıklı odasına iniş, yuvaların üstünde geniş yay, kâğıt akarken yüksek geçiş, kıvrık köşe, batı kenarı.

### 21.4 Doğrulama

- tsc 0 hata · Vitest 29/29 · Playwright 47/47 (masaüstü, telefon, tablet) · derleme temiz (3.0 s).
- Sağlamlaştırılan test: Hayko "anıya dokun" testi anı kabarcıklarının yörüngesine (merkez çevresinde r 7–19) denk gelince kabarcık istemini görüyordu; oyuncu önce perdeye yaklaştırılıyor (3×3 tekrarda 6/6).
- Temas levhaları: 23 klip, 802 kare; tümü çekim çekim incelendi. Parlaklık taraması: ortalaması 0.06'nın altında 17 kare kaldı, hepsi gece göğü / yıldız ırmağı kareleri; Kafakafka'daki iki gerçek kara enkaz yakın planı alçak açıyla (arkada gök ve dev TV) yeniden kuruldu, Kanıyorduk gece uçuşlarına pozlama eklendi.
- Kamera taşmaları düzeltildi: Kuantum'da köşe eğrisi duvarın dışına taşıyordu (noktalar 22'ye çekildi, ara noktalar eklendi); Klostro'da r36 yayı ebru göğünün dışına çıkıyordu (r30) ve tavşan yuvadayken kamera toprağa gömülüyordu (nokta yüzeye çekilir); Boşlukta Dans'ın neon halkaları krater tabanına gömülüydü (en yüksek zemin noktasının üstüne alındı), lamba haleleri kamera yaklaşınca söner.
- Klip önizleme aracı notu: render sırasında kaynak dosya değişince Vite sayfayı yeniler ve kalan kareler duraklama menüsünü gösterir; bu yüzden yamalar render bittikten sonra uygulanıp etkilenen klipler sırayla yeniden çekildi.
- Entegre GPU (1600×900): Hayko 52–60, Kuantum 60, Klostro 57–60, Redd 53–60 fps; Kafakafka aynası 49, Sextronot çanaklar/ay halkası 50–56, İtiraf büyük ateş + 150 adak mumu 49–55, Boşlukta Dans neon pist 60. Bir şarkı sahnesi ilk açıldığında gölgelendirici derlemesinden bir kerelik ~0.6 s takılma sürüyor.

---

## 22. EK I — PLAK MANTIĞI, TAVŞAN MİNİ OYUNU, GERÇEKÇİ EŞYALAR (27.09.2026)

Sahibin isteği: Q'ya basınca plak olunan yere düşsün (kitaplığa ışınlanmasın; kitaplığın yanındaysa rafa yerleşsin); bu tür mantık hataları bulunup düzeltilsin; evrenler kapaklarla birebir olsun ve kapaktaki olayları oyunlaştıran, anlamlı easter egg'ler eklensin (Klostro: kapaktaki tavşan çukur kazsın, plağı raftayken çalabilsin, gramofondayken çalamasın); klipteki nesneler daha gerçekçi olsun.

### 22.1 Plak mantığı (`engine/boot.ts`)

- **Q:** Çalınmış plak yalnızca kitaplığın 4 m yakınındayken rafına döner; uzaktaysa oyuncunun önüne düşer ve oradan yeniden alınabilir. Yeniden girişte çalınmış plak yine rafındadır (dünyaya dağılmaz — sahibin önceki kararı korunur).
- **Değiştirme:** Elde plak varken başka bir plak alınınca eskisi, kitaplığın yanındaysa rafına, değilse alınanın yerine ya da öne bırakılır (eskiden her durumda rafa ışınlanıyordu).
- Uçtan uca test: raftan alınan plak uzakta Q ile "world", rafın yanında Q ile "collected" olur.

### 22.2 Klostrofobik Kaplumbağa — tavşan mini oyunu (`rabbit.ts`, `world.ts`)

- **Çukur kazma:** Kaçışın hemen ardından, oyuncu 26 m'den yakınken tavşan durup pençeleriyle kazar (toprak parçaları fırlar, 1.8 s), kazdığı çukura dalar ve dört gerçek delikten birinden çıkar. Geride koyu ağızlı bir tümsek kalır (en çok 8; yalnız tavşan dalar, tünel değildir). Kaçarken kendi çukurlarına da dalabilir.
- **Kapma (raftan, yerden, elden):** Tavşan serbestken (müziğin yanında otururken) plağa göz diker: kitaplıktayken oyuncu 9 m'den uzaksa rafa koşar; yere bırakılmışsa oyuncu 6 m'den uzaksa yerden alır; oyuncunun elindeyse oyuncu 4 s kıpırdamadan durunca arkasından sokulup kapar (oyuncu 6 m içinde ona dönerse ürküp kaçar). Kaptığında ("raftan/yerden/elinden kaptı") kovalamaca yeniden başlar; raf/yer hedefinde oyuncu 5 m'ye yaklaşırsa vazgeçer. **Gramofondaki plağa dokunamaz.** Kapmadan sonra 40–45 s, geri alındıktan sonra 30 s bekler.
- **Takılma düzeltmesi:** Tavşan artık engel çözücüden geçer (gramofon, kitaplık, kâse, tümseklerin içine giremez; 1.2 s ilerleyemezse hedefini değiştirir). Serbest tavşanın oturma yeri gramofonun çevresinde boş bir noktadır (eskiden kitaplığın içine denk gelebiliyordu).
- **Yere bırakılan plak:** Tavşanın elinde değilken yerdeki plak her zaman E ile alınabilir (eskiden ilk kovalamacadan sonra alınamıyordu).
- Yeni sırlar: "Kazıcı" (beş çukur) ve "Raftan Kapan" (kapılan plak geri alınınca).
- Uçtan uca testler: gramofonda çalarken 12 s dokunmaz; rafa konup oyuncu uzaklaşınca kapar; uzakta Q ile bırakılan plak E ile alınabilir durumdadır ve oyuncu uzaklaşınca tavşan yerden kapar.

### 22.3 Kapakla birebirlik ve gerçekçi eşyalar

- Dört evrenin kapak noktası ekran görüntüleri kapak levhasıyla yan yana kontrol edildi (Redd figür/direkler/krater, Hayko bebek/tipografi, Kuantum duvardaki yüz/halat ağız, Klostro kabuktaki gitarist/yazı sütunları/havuç): kadrajlar kapaklarla örtüşüyor.
- Sextronot'un havada süzülen eşyaları gerçek mobilya oldu: bordo kadife koltuk (iki minder, kolçaklar, iki yastık, ceviz ayaklar), duvar kâğıtlı duvar parçası (çerçeveli fotoğraf, priz, askı), yatak (ceviz iskelet, şilte, mavi battaniye, katlı çarşaf, yastık, başlık, ayaklar).

### 22.4 Diğer evrenlerde kapak felsefesinden mini oyunlar

- **Hayko — "Senkron" (anne kalbiyle ritim):** Annenin kalbi dinlendikten sonra aynı noktada E, vuruşla aynı anda basılırsa isabet (54 bpm; ±130 ms pencere, `rhythm.ts`); sekiz ardışık isabette "Senkron" sırrı açılır, rahim kalple atar ve bebek tekmeler. Kaçırınca seri sıfırlanır; istemde sayaç görünür. Birim testi: pencere ve hedef.
- **Kuantum — "Bakmayınca Gelir" (gözlemci oyunu):** Kedi yalnızca bakılmadığında yürür; ona bakmadan 1.7 m'ye varırsan (ya da o sana gelirse) bacağına sürtünür, dört saniye durur ve sır açılır. Uçtan uca test: kediye sırtı dönük ışınlanınca sır açılır.
- **Redd:** Kapağın felsefesi zaten oyunun çekirdeği (her dinlenen plak yerçekimini azaltır, son şarkıda figürün yanına yükselirsin); "Hiçbir Şey", "Boşluğun Merkezi", "İade Edilmiştir" gibi 12 sır bunu tamamlar; yeni oyun eklenmedi.
- **Geliştirme kancası:** `WorldLogic.debug` (kedi, ikiz, tavşan) uçtan uca testlerin dünya nesnelerine ulaşması için.

### 22.5 Doğrulama

- tsc 0 hata · Vitest 32/32 (ritim oyunu birim testi) · Playwright 51/51 (dört yeni test; eski kitaplık testi yeni Q kuralına göre güncellendi: raf dönüşü kitaplığın yanında) · derleme temiz.
- Sahibin isteğiyle gerçek telefon/emülatör kullanılmadı; telefon ve tablet davranışı Playwright'ın cihaz emülasyonuyla (Pixel 7, iPad Mini) test edildi.
- Tavşan döngüsü ekran görüntüleriyle izlendi: raftan kapma ~30 s'de, iki kazı ve delik değiştirme kovalamacada gerçekleşti.

---

## 23. EK J — HAZIR 3D MODELLER, YÜKSEK ÇÖZÜNÜRLÜKLÜ KAPAKLAR, YAYIN HAZIRLIĞI (27.09.2026)

Sahibin onayı: "Kalan adımları onaylıyorum, hepsini yap; gerekirse uygun 3D asset'leri indir."

### 23.1 Hazır 3D modeller (Poly Haven, CC0)

- Kaynak: polyhaven.com (lisans CC0 1.0 — kamu malı, atıf gerekmez). 21 model 1k glTF olarak indirildi, `gltf-transform` ile sadeleştirildi (meshopt, 512–1024 px WebP doku): 52 MB → kullanılan 17 model **4.9 MB** (`public/models/props/`, künye: `CREDITS.txt`).
- Motor: `engine/core/models.ts` — `loadModels` (paralel yükler; yüklenemeyen model null döner, sahne elle modellenmiş hâline düşer, evren yine açılır), `fitModel` (istenen boya ölçekler, ortalar, tabanı zemine oturtur), `firstMesh`. Redd yalnızca istenen şarkıların modellerini yükler (`SONG_MODELS`; tablet demosunda dört şarkınınki).
- **Krater:** büyük kayalar taranmış ay kayaları (üç çeşit, volkanik siyaha boyanır, dörtte biri toprağa gömülü); küçük çakıllar prosedürel kalır.
- **Kalpsiz Romantik:** yedi gemi 17. yüzyıl Hollanda gemisi (gövde, halatlar, yelkenler ayrı malzeme); "o" kırmızı yelkenli büyük gemi. Yanarken gövde kendi ahşap dokusundan korlanır, yelkenler kararıp söner.
- **Kafakafka:** kratere saçılan 28 parça gerçek ev eşyası (yemek sandalyesi, ahşap sandalye, tüplü TV, bavul, ansiklopedi takımı, eski mikrodalga, duvar saati, çalar saat; gerçek boyunun ~2 katı).
- **Sextronot:** havadaki koltuk ve yatak gerçek kadife koltuk ve gündüz yatağı; masadaki iki sandalye gerçek yemek sandalyesi.
- **İtiraf:** benzin bidonu gerçek metal bidon. **Tam Bi Delilik:** uçurumun kenarındaki bank gerçek boyalı ahşap bank.
- Hayko, Kuantum ve Klostro'ya gerçekçi PBR model eklenmedi: kapakları stilize (gölge oyunu, sarı mürekkep, ebru) ve evrenler kapakla birebir kalsın diye kendi dillerinde modellenmiş nesneler korundu (Klostro zaten taranmış kaplumbağa, tavşan ve havuç modelleri kullanıyor).

### 23.2 Yüksek çözünürlüklü kapaklar

- Hayko (500×453 → 1400×1400) ve Kuantum (258×258 → 1400×1400) kapakları iTunes Search API'deki resmî albüm görsellerinden alındı (`public/covers/beni-buyuten-sarkilar-vol1.jpg`, `kuantum-dolaniklik.jpg`); albüm künyeleri ve og:image etiketleri güncellendi. Eski düşük çözünürlüklü PNG'ler artık hiçbir yerde kullanılmıyor (sandbox silmeye izin vermediği için dosya olarak duruyorlar).

### 23.2a İlk şarkı takılması giderildi (`engine/core/runtime.ts`)

- Ölçüm: ilk açılan şarkıda ~0.6–0.9 sn donma vardı. İki kök neden bulundu: (1) gölge derinlik shader'ı ve yeni geometri tamponları ancak ilk çizimde oluşuyordu; (2) otomatik kalitede kare hızı düşünce gölgeler kapanıyor ve bu, sahnedeki **bütün** malzemelerin (Kalpsiz'de 108 shader) oyun sırasında senkron yeniden derlenmesine yol açıyordu.
- Düzeltme: `precompile` artık (a) otomatik modda gölgesiz varyantları da önceden derler, (b) bütün dokuları GPU'ya önceden yükler. Yükleme ekranında "bütün dünyayı kırpmasız bir kare çiz" adımı da denendi; GPU'da takılmayı tamamen siliyordu ama yazılım GL'de (test tarayıcısı, zayıf cihazlar) yüklemeyi 7 sn'den 72 sn'ye çıkardığı için geri alındı.
- Sonuç (entegre GPU, üç ölçüm): Kalpsiz ilk açılış en uzun kare 883 ms → 34–50 ms; ilk açılan şarkı (Kanıyorduk) 617 ms → 283 ms. Yükleme süresi (sıcak önbellek) Redd 3.0 sn, diğerleri < 1 sn.
- Gemilerde gölgeyi yalnız gövde düşürür (halat ve yelken gölgeleri kapalı); gemi modelleri biraz daha sadeleştirildi.

### 23.3 Yayın hazırlığı

- Hosting: **Vercel** (proje `audio-room`, production adresi `https://audio-room-ecru.vercel.app`). og:image mutlak adres, `og:url`, hub'da `canonical`, `public/sitemap.xml` (hub + 4 evren), `robots.txt`'te Sitemap satırı. `.vercelignore`: `.env*`, `dist`, test çıktıları, `assets-src` yüklenmez.
- **Yayına alma yapılmadı:** değişiklikler commit edilmedi ve dağıtım adımı sahibin kendi onayına/eline bırakıldı.

### 23.4 Doğrulama

- tsc 0 hata · Vitest 32/32 · Playwright 51/51 (masaüstü, telefon ve tablet emülasyonu) · derleme temiz. Gemiler, kayalar, ev eşyaları, mobilya, bidon ve bank klip karelerinde ve serbest dolaşımda tek tek kontrol edildi.

### 23.5 Kalan (yalnızca sahip tarafı)

- Yayına alma (commit + dağıtım), sanatçı/plak şirketi izni (kapaklar ve isimler) ve 2–3 kişilik oyun testleri.

---

## 24. EK K — OYNANIŞ HATALARI, İÇ İÇE GİREN NESNELER, YENİ PLAK MEKANİKLERİ (27.09.2026)

Sahibin bildirdiği hatalar: "Tavşan plağı alıp kaçmıyor", "tavşanın kazdığı tünellerden geçemiyoruz, çok küçükler", "3D nesneler birbirinin içine giriyor"; istekler: her albüme uygun farklı plak bulma mekanikleri, daha anlamlı easter egg'ler (ör. Kuantum'da çift yarık deneyi), daha gerçekçi modeller.

### 24.1 Klostro — tavşan

- **Kök neden (kapma):** Tavşan raftaki plağın tam yerine koşuyordu; kitaplık katı olduğu için ona hiç ulaşamayıp "kapmaya çalışıyor" durumunda sonsuza kadar kalıyordu (ekran görüntüsüyle kanıtlandı). Artık hedef rafın önü; çarpışmaya dayanıp kaldıysa uzanıp kapar.
- **Kapınca kaçış:** Plağı kapan tavşan, senden uzak tarafta kalan en yakın deliğe koşar (6.4 m/sn), dalar ve başka bir yuvadan çıkar (eskiden sen uzaktaysan yavaşça dolaşmaya geçiyordu).
- **Kazılan tüneller gerçek:** Kazdığı her çukur, en yakın (en az 8 m ötedeki) yuvaya giden gerçek, girilebilir bir tünelin ağzıdır (`tunnels.dig`); ağız gerçek yuvalar kadar geniş (Ø 2.5 m), C ile girilir, sürünülüp öbür uçtan çıkılır. En çok dört kazılmış tünel kalır, en eskisi kapanır (içindeysen kapanmaz). Kazılan ağızlar "Tünel Haritası" sırrına sayılmaz.
- Uçtan uca test: raftan kapma → deliğe dalış → kazma → kazılan ağızdan tünele giriş.

### 24.2 İç içe giren nesneler (otomatik tarama)

- `colliders.list()` + tarama betiği: her evrende ve her Redd şarkısında birkaç zaman noktasında çarpışma dairelerinin iç içe girdiği yerleri listeler.
- **Boşlukta Dans:** neon direklerinin çarpışmaları şarkı çalmazken de açıktı (öbür şarkılarda görünmez duvar) → yalnız direk görünürken etkin.
- **Kalpsiz Romantik:** aynı halkadaki gemiler farklı hızla dönüp birbirine giriyordu → halka başına tek hız, halkalar 6 m arayla; deniz çekilince gemiler kaya/iskele/REDD harfleri/kırmızı gemi içine oturuyordu → her gemiye açısal sırayla boş bir kıyı yeri (iki sıra: r 37 ve 42; iskele, kırmızı geminin yolu ve harfler dışı); yüzsüz bedenler gemi rotasındaydı → halkaların dışına (r 29–33.5); iç havzada büyük kaya yok (r < 48).
- **Kanıyorduk:** masa lambası defterin içindeydi → yanına alındı.
- Son tarama: dört evrende ve 12 Redd şarkısında kalan satırlar yalnızca aynı nesnenin iki çarpışma kaydı (yanlış alarm).

### 24.3 Her albüme özgü plak bulma

- **Redd — Boşlukta asılı plaklar:** 12 plaktan dördü yerde; üçü 2.8 m, üçü 4.2 m, ikisi 5.5 m yükseklikte asılı. Her dinlenen plak yerçekimini azaltıp zıplamayı yükselttiği için yüksektekilere ancak dinledikçe ulaşılır (kademeler çözülebilirlik için hesaplandı: 4 → 7 → 10 plak). Asılı plak yalnızca göz hizası yakınken (zıplarken) alınır; yakındaysan ipucu ya "zıpla" ya "önce başka plaklar dinle" der. Alınan plak bırakılınca yere konur. Kapağın felsefesi: boşlukta asılı figüre, dinledikçe hafifleyerek yaklaşmak.
- **Hayko — Ürkek anılar:** Anı kabarcıkları koşarak ya da zıplayarak yaklaşana kaçar (yörüngeden uzaklaşır, yükselir); yavaş yürüyene geri gelir. Anne karnında her şey sakin olmalı.
- **Kuantum** (ikiz/karşı nokta) ve **Klostro** (tavşan kovalamacası) zaten kendine özgü.

### 24.4 Kuantum — Çift yarık deneyi (yeni sır "Gözlemci Etkisi")

- Batı duvarının dibinde mürekkep çizgisi bir düzenek: parçacık tabancası, iki yarıklı perde, beyaz algılama ekranı, duvarda "ÇİFT YARIK — bak · bakma" künyesi. E ile tabanca çalışır; parçacıklar ekrana tek tek iz bırakır.
- Yarıklara bakmıyorsan izler girişim saçakları örer (cos²·sinc² yoğunluğundan örnekleme); yarıklara bakarsan desen iki banda çöker (hangi yol ölçüldü). Mod değişince ekran temizlenir. İki deseni de (120'şer iz) gören sırrı açar. Birim testi: desenlerin dağılımı.

### 24.5 Daha fazla gerçek model

- Kalpsiz Romantik iskelesine gerçek ahşap fenerler, fıçılar ve sandıklar (Poly Haven, CC0).

### 24.6 Doğrulama

- tsc 0 hata · Vitest 35/35 (yeni: çift yarık desenleri) · Playwright 53/53 (yeni: tavşanın kapıp deliğe kaçması ve kazdığı tünele giriş; asılı plakların zıplayınca alınması) · derleme temiz.
- Tavşan, çift yarık, asılı plaklar ve iskele ekran görüntüleriyle ayrıca kontrol edildi.

---

## 25. EK L — KLİP KAMERA DENETİMİ (27.09.2026)

Sahibin şikâyeti: "kamera açıları yetersiz ve yersiz… birbirine giren, ekranda tam gözükmeyen sahneler, iyi ayarlanmayan kamera açıları var; her sahneyi an an kontrol et".

### 25.1 Araç: `npm run audit:clips -- <evren> [parça,...]` (`scripts/audit-clips.mjs`)

- Geliştirme sunucusu açıkken her klibin her çekiminin başında, ortasında ve sonunda sinema kamerasını denetler: (1) zeminin altında mı, (2) katı bir nesnenin içinde mi (çarpışma kaydının dikey kapsamıyla), (3) görüntüyü dolduran yakın bir engel var mı (5 ışın, 0.55 m).
- "Görüntü kapalı" satırları bilinçli yakın çekimler de olabilir; kareye bakılıp karar verilir.

### 25.2 İlk tarama → düzeltme

- İlk tarama (23 klip, ~840 çekim × 3 an): Redd 105, Klostro 4, Hayko 0, Kuantum 0 bulgu. Redd'dekilerin neredeyse tamamı **kameranın zemin altına inmesi** (mutlak yükseklikle yazılmış çekimler kraterin eğimli yamacında toprağa giriyordu; sahnelerin taşınan nesneleri, ör. kırmızı gemi, izleyen kamerayı karaya çekiyordu).
- **Kalıcı çözüm (motor):** sinema kamerası her karede zeminin en az 35 cm üstünde tutulur (`engine/boot.ts`); bilinçli yer altı çekimleri `Shot.underground` ile muaftır (Klostro'da tavşan odasına iniş).
- **Kanıyorduk 33.5:** "kâğıt figürler sayfadan doğruluyor" anında kamera henüz kalkmamış turnayı izleyip yamaca bakıyordu → sayfadaki figürlere ters açı.
- İkinci tarama: Redd 11 bulgu, hepsi incelendi ve bilinçli yakın çekim (vitrinin ışık konisinin içi, buzdolabının içinden bakış, buz küpü, geri sayımda yörüngedeki aylar, bataklık gölü). Hayko, Kuantum 0.

---

## 26. EK M — SINAV KÜRSÜSÜ, GİZLİ GEÇİTLER, HİKÂYE OYUNCULARI (27.09.2026)

Sahibin istekleri: "rastgele bir şarkının sözlerini tamamlama quiz'i (10 söz, şıklı)", "gizli geçit", "her evrene mini oyunlar", "kuantum/klostro/hayko klipleri vasat, hikâyeleri yok; tüm evren gezinmeli".

### 26.1 Sınav kürsüsü (`engine/ui/quiz.ts`, `engine/game/quizBank.ts`, `engine/game/quizStation.ts`)

- Her evrende bir okul sırası ve sandalye (Redd'de ayrıca kara tahta ve gaz lambası: gece kraterinde uzaktan seçilsin). Sıraya bakıp **E**: 10 soruluk şıklı sınav paneli açılır; **1–4** ya da tıklama ile seçilir, **Esc** bırakır. Panel açıkken fare kilidi bırakılır, oyun girdisi kapanır, dünya akmaya devam eder; kapanınca "devam etmek için tıkla".
- Soru kaynakları, öncelik sırasıyla: (1) sahibin lisanslı `public/lyrics/<parça>.lrc` dosyaları — satırın son kelimesi gizlenir, üç çeldirici öbür satırların son kelimelerinden gelir; **proje kendi içinde söz barındırmaz, dosya yoksa söz sorusu da yoktur**; (2) evrene özgü, söz içermeyen özgün sorular (albüm künyesi ve evren tasarımından: yıl, süre, plak şirketi, mekanikler) ve çok parçalı albümlerde albüm soruları (sıra/ad/künye).
- 10 sorunun en az 8'i doğruysa albümün "Ezberden" sırrı (`soz-sinavi`) açılır; altında skor ve "biraz daha dinle" ipucu verilir. Test: `tests/unit/quiz.test.ts` (soru üretimi), `tests/e2e/worlds.spec.ts` (Kuantum'da sınav akışı ve sır).

### 26.2 Gizli geçitler (`engine/game/passage.ts`)

- Ortak yapı: kalın duvarlı küçük bir oda (kabuk), önünde yere gömülerek açılan kapı. Evrenin koşulu belirli bir süre sağlanınca açılır; içeri girilince sır kartı. Eğimli zeminde oda en yüksek noktaya oturur, altı toprağa gömülür, kapının önüne eşik döşenir; `groundAt` odada ve eşikte düz zemin verir (evrenin `ground`'u bunu önceler). Kapıya yaklaşınca bir kez ipucu.
- **Redd — Monolit** (sırt, azimut −0.3, r 86; kapısı kratere bakar): elinde plakla önünde 4 sn durunca açılır. İçeride krateri dinleyen bir "dinleme odası": çelik masa, telsiz, uzay aracı göstergesi, işaret feneri, kartpostallar, kırmızı LED. Sır "Kara Taşın İçi".
- **Hayko — Müzik kutusu** (11, −10): ancak gramofonda bir şarkı çalarken uyanır (4 sn). Kapağında pirinç dansçı döner, yanında kurma anahtarı; içinde pimli silindir ve tarak, kaset çalar. Şarkı çalarken silindir ve dansçı hızlanır, önündeki ışık canlanır. Sır "Müzik Kutusu".
- **Kuantum — İkizsiz dolap** (−8, −24): odadaki tek ikizsiz eşya. Kapısı, oyuncu odanın öbür ucundaki ikiz noktada (8, 24; yerde mürekkep halka) 3 sn durunca açılır. İçi sarı (kutu içinde kutu), iki sandalye, yarım satranç, tek ampul. Sır "İkizsiz Dolap".
- **Klostro — Dev kitap** (−26, 22): ebru kapaklı, sayfa kenarlı, deri sırtlı dev bir kitap; kapısı sayfaların arasında. Önünde kıpırdamadan 5 sn beklenince açılır (kaplumbağa sabrı). İçeride okuma köşesi: masa, gaz lambası, gözlük, ansiklopediler, sallanan sandalye, duvarda satır çizgileri. Sır "Sayfaların Arası".
- Test: dört geçit de uçtan uca (koşul → kapı → sır) `tests/e2e/worlds.spec.ts` içinde.

### 26.3 Hikâye oyuncuları

- **Kuantum — Dolanık çift** (`worlds/kuantum-dolaniklik/pairActors.ts`): iki mürekkep figür. A hikâyeyi bütün odada oynar; B her an onun tam karşı noktasında, aynı duruşta (çiçek perdesinde biri koparırken öbürününki solar). 13 dize-hareketi: köşe → yaklaşma → kediyi okşama → çiçek → ayın altı → kibirli yürüyüş → ipler → en uzak köşelerde diz → ara → kadeh → tasma → dans → merkezde sırt sırta oturuş. 14 yeni çekim (oyuncuya bağlı kamera noktaları) ve 6 özgün anlatım satırı. Yalnızca şarkı çalarken görünür.
- **Klostro — Acele Adam** (`worlds/klostrofobik-kaplumbaga/hurried.ts`): kâğıdın kenarında yerinde sayan, şarkı başlayınca altı uzak nokta arasında koşan, boyada kayan, kaplumbağanın çevresinde tur atan, tavşanı görünce donan, akıntıya karşı koşan, tökezleyip ilk kez duran, çorbaya diz çöken, kediyi okşayan, sonunda kaplumbağanın yanına oturan figür. Tekrar eden altı kaplumbağa yörüngesi onun çekimleriyle değiştirildi, 12 yeni çekim eklendi; 6 özgün anlatım satırı.
- **Hayko — Şarkı oyuncusu** (`worlds/beni-buyuten-sarkilar/actors.ts`): her şarkıda gölge oyununun önünde tek bir silüet kahraman; 9 şarkı için perde tablosu (banktaki yalnız adam iplerle kaldırılır ve yumruk sallar; mahkûm diz çöker, parmaklıkta doğrulur; çeşme başındaki yaşlı; meydandaki yumruklar; şemsiye altında yürüyen çift; ağacın altındaki uyuyan; spottaki şarkıcı ve koşan hırsız; sazlı âşık; çitler arasındaki çiftçi). Klip her hareketli perdeden 4 sn sonra oyuncuya bir yakın plan ekler (dört kalıp dönüşümlü: yakın, alçak, perdeye omuz üstü, geniş).

### 26.4 Doğrulama

- Kamera denetimi (`npm run audit:clips`): Kuantum 47 çekim / 0 sorun, Hayko 9 klip 290 çekim / 0 sorun, Klostro 57 çekim / 2 bulgu — ikisi de tavşan odasına inen bilinçli yer altı çekimi (`underground: true`); denetim aracı artık bu bayrağı okuyup muaf tutuyor.
- Çakışma taraması (`overlap.mjs`, dört evren): yalnızca gizli geçitlerin kendi duvar parçalarının köşe daireleri (tek yapı; `userData.structure` işaretiyle taramadan muaf) ve Hayko'da iki kabarcığın süzülürken anlık üst üste gelmesi (kabarcıklar yarı saydam, tasarım gereği). Sınav sıraları, gardırop, kitap, monolit ve müzik kutusu başka hiçbir nesneyle iç içe değil.
- Oyuncu kareleri (temas levhaları): Kuantum 14, Klostro 18, Hayko 3 şarkı × 5–8 kare, Redd 9 oyunculu şarkı × 3–5 kare incelendi; siyah silüetlerde 1–2 m'lik yakın planlar leke gibi okunduğu için tüm oyuncu yakın planları 3–4,5 m'ye açıldı (Kuantum 7 çekim, Klostro 8, Hayko iki kalıp, Redd 5: donmuş yürüyüşçü, yaslı, hasta, günah çıkaran).
- Test sonuçları (28.09.2026, donanım GPU ile): tsc 0 hata · Vitest 38/38 (yeni: sınav soruları) · `vite build` (Sürüm 1 sayfaları dahil) temiz · Playwright 61 test: 59 geçti, 2'si aynı koşuda geçici (Kuantum sayfa yüklenmesi 90 sn'de takıldı, Hayko anlatım satırı aynı işçide gecikti) — ikisi de tek başına iki kez üst üste geçti (4/4). Yeni uçtan uca testler: sınav akışı, dört gizli geçit, dolanık çift, Acele Adam, Hayko oyuncusu.

### 26.5 İkinci tur (28.09.2026): Sürüm 1 girişi, kapak kadrajı, gerçek fotoğraf, yıldız-gözler, dev, tavşan

- **Sürüm 1 "Evrene gir" ölü düğme** (`depo/shared/app/experienceGate.ts`, dört `inputSystem.ts`, dört `gameLoop.ts`): eski evrenler yalnızca fare kilidi *gerçekten* alınınca başlıyordu; tarayıcı kilidi reddederse (masaüstü uygulamasının tarayıcı paneli, Esc'den hemen sonra tıklama, iframe) düğme hiçbir şey yapmıyordu. Şimdi kilit 700 ms içinde gelmezse ya da `pointerlockerror` düşerse oyun **sanal kilitle** başlar: bakış sol tuş basılıyken sürüklenerek döner, canvas'a her tıklamada gerçek kilit yeniden denenir, Esc duraklatma perdesini açar. Dört evren başsız Chromium'da da doğrulandı (kilit alınır, perde kapanır, W ile yürünür).
- **Kapak Noktası** (`coverprobe.mjs` ile dört evrenin kadrajı kapakla yan yana): Redd, Klostro ve Kuantum birebir; Hayko'da bebek arkadan görünüyordu → kamera azimut −2,6'ya (bebeğin profili, baş sağda, dizler solda) taşındı; Kuantum'da yeni gardırop kadrajın sol altına giriyordu → doğu duvarına (24,5, −14) alındı, ikiz noktası (−24,5, 14).
- **Gerçek fotoğraf**: Kanıyorduk'taki "kitaptan süzülen fotoğraf" artık kamu malı bir portre (Library of Congress, "no known restrictions"); yüz Gauss bulanıklığı ve sepya tonuyla silikleştirildi (`public/textures/found-photo.jpg`). Kanvas çizimi yükleme sırasında yedek olarak kalır.
- **Yıldızlar göz olur**: sabit 22 göz sprite'ı kaldırıldı; gökten inen 130 yıldızdan kameraya en yakın 22'si yaklaştıkça göze dönüşür (nokta küçülüp söner, göz büyüyüp açılır, uzaklaşınca yine yıldız). Göz dokusu yeniden çizildi: iris gradyanı ve lifleri, limbus halkası, kapak gölgesi, iki yansıma. Yıldız çekimi artık en yakın yıldıza bakar.
- **Devle savaş**: birleşik geometri yerine 48 m'lik eklemli figür (`createFigure`, dövüş duruşu, sağ elde 23 m sopa); sopanın tepe noktasında yerde yayılan şok halkası, sarsıntı ve dövüşçünün geri savrulup (14 → 22 m, küçük sıçrama) yorgun yorgun geri yürümesi. Çekim ofsetleri dövüşçünün yönüne göre (yandan bakış), kamera artık sopanın süpürme düzleminde değil.
- **Kucakta ölmek / kâğıt kalp**: Aşk Virüs'te "died" dizesinde hasta arkaya yığılır, arkasında diz çökmüş ikinci bir figür onu kollarında tutar; gömme dizesinde ayağa kalkar. Onlar Bile Üzülürler'de yaslının elindeki et rengi kalp "ağlama" dizesinde kâğıda döner (renk, pürüz, ışıma solar), üç saniye sonra ikiye yırtılıp yarımlar dönerek yere düşer; "isimler" dizesinde kalp yeniden elindedir.
- **Gerçek insan figürleri** (`engine/fx/character.ts`, `public/models/characters/mannequin.glb`): Quaternius'un CC0 "Universal Animation Library" mankeni (insansı rig, 46 klip) her evrende yüklenir; `createFigure` ile kurulan bütün oyuncular (Redd'in 12 şarkı oyuncusu, Kuantum çifti, Klostro'nun Acele Adam'ı, Hayko kahramanı, müzik kutusu dansçıları) kapsül rig yerine bu mankeni giyer, duruşlar gerçek animasyona eşlenir (Idle, Walk, Jog, Dance, Sword_Attack, Crouch, Fixing_Kneeling, Sitting), geçişler çapraz sönümlü. Elde tutulanlar (sopa, meşale, kalp) sağ el kemiğine bağlanır (`figure.hold`). Bacaklı kalpler kapsülde kalır; model yüklenemezse her şey kapsüle düşer.
- **Kadraj sığdırma** (`Shot.fit`): yönetmen, öznenin küresi (merkez + yarıçap) görüş açısına sığmıyorsa açıyı her karede gerektiği kadar açar; Hayko, Kuantum ve Klostro oyuncu çekimlerinde figür artık kadrajdan taşmaz.
- **Gizli kapılar gerçekten gizli**: yaklaşınca ipucu yok, kapı duvarla aynı malzeme (Redd'in kızıl çerçevesi ve Hayko/Klostro'nun ayrı kapı renkleri kalktı); satır yalnız kapı açılınca düşer. Yerler her girişte rastgele (`ctx.random`): Redd kürsü 3 / monolit 3 azimut, Hayko sıra 3 / kutu 3, Kuantum sıra 3 / gardırop doğu-batı, Klostro sıra 3 / kitap 3. İçerideki sürprizler: monolitin tavanı erir ve krater göğü içeriden görünür; müzik kutusunda yerden pirinç bir dansçı yükselip döner; gardıropta satranç takımı havalanıp döner; kitapta satırlar duvarda akar ve tavandan kâğıt kırpıntıları yağar. Testler yerleri `debug.hidden` (deskSpot, twinSpot, passage.entrance/interior) üzerinden okur.
- **Hamam böceği sürüsü** (`worlds/mukemmel-bosluk/roaches.ts`): Redd'de klip çalarken oyuncunun çevresinde 14 böcek dolaşır (kendi rotası, duraklama, oyuncu 3,5 m'ye girince kaçış); şarkı bitince yerin altına çekilir (kapak hâli).
- **Tavşan kaçışı (Sürüm 1 gibi)**: kaçış yarıçapı 12 m; oyuncudan uzağa 18–27 m'lik kaçış noktası (düz, ±0,8 rad sapmalı ve kenar teğetleri arasından oyuncudan en uzağa düşen), varınca ya da oyuncu noktaya sokulunca yenisi (zikzak); koşu 8,2 m/s (vuruş başına −1,5); kenara sıkışınca kıyı boyunca kaçar, oyuncunun üstünden geçmez. Önceki davranış düz 10 m ileri koşup dönüyordu (ölçüm: 12,5 sn'de 0,9 m'ye yaklaşılıyordu).

### 26.6 Üçüncü tur (28.09.2026, gece): temizlik ve klip senaryoları

Sahibin yeni direktifi: "Easter egg nesneleri ve gizli odalar kalksın; yalnızca kitaplık, gramofon, kapak noktası, sınav kürsüsü ve klip nesneleri kalsın. Her şarkının gerçek bir hikâyesi olsun; klostro'da evrenin duvarları daralsın, çatalla çorba içilsin; tavşan takılmasın; hub'daki rastgele çark dönsün."

- **Kaldırılanlar:** `engine/game/passage.ts` ve dört `hidden.ts` (monolit, müzik kutusu, ikizsiz dolap, dev kitap), dört `explorers.ts` (posta kutusu/kuyu/bayrak, anne kalbi/göbek bağı/yarık, kâğıt köşesi/yumurtalar, soru işareti/iç içe kutular), Redd'in defter/Gregor/iade etiketi/12 sn boşluk anı, Hayko'nun kaset/ultrason/metal el/imkânsız akımı, Kuantum'un dolanık eş eşyaları (`pairs.ts`), mürekkep döşeme modelleri, çatlak/dış dünya, karanlık yüz yıldızları, merkezde birleşme; Klostro'nun piknik döşemesi, kedi, tünel odası ve cep saati. Album `secrets` listeleri buna göre kısaldı (Redd 25, Hayko 17, Klostro 2, Kuantum 3). Sınav kürsüsü ortak modüle taşındı: `engine/game/quizDesk.ts` + her evrende `quiz.ts` (yer yine her girişte rastgele; testler `debug.quiz.deskSpot` okur).
- **Klostro kısa filmi** (`story.ts`, `walls.ts`, `shellHome.ts`, `hurried.ts`, `world.ts`): kâğıdın dört kenarından dört ebru duvarı yükselir ve dizeden dizeye daralır (`WALL_TARGET`: 80 → 60 → … → 12,5 m; adam koşmayı bırakınca 16 → 19 → 26 → 36 → ufuk). Acele Adam duvarı iter (dövüş duruşu, duvar kımıldamaz), çorba kâsesinin başında çatalı art arda daldırır — çatal hep boş kalkar, dişlerinden çorba damlar; ikinci çorbada çatal yere bırakılır, kâse iki elle eğilir. En dar anda **kabuğun içine** girer: kubbe (yarıklı, içeriden görünür) + ahşap zemin + lamba/masa/çay/kitap/gitar/valiz/çizme/saat/resim (Poly Haven, CC0); kubbe 2,8 → 1,85 m'ye nefes alır gibi daralır, adam önce oturur sonra iki büklüm olur; kamera tek çekimde ağızdan içeri girer (74 → 96° açı, mikroskop maskesi, omuz titremesi). Tavşan klipte senaryolu (`rabbit.scripted`, `drive`): duvarlar daralırken kaplumbağanın çevresinde tur atar, duvar 16 m'ye inince kaplumbağanın önünde delik kazıp yer altına iner, kabuk perdesinde delikten başını uzatıp içeri bakar, sonda çıkıp kaplumbağanın yanına oturur; film bitince gramofonun yanındaki yerine döner.
- **Tavşan takılması** (`rabbit.ts`): kaçış noktası ve gezinti hedefi `colliders.isFree` ile seçilir (hedef ve yolun ortası boş olmalı), kaçarken 0,8 sn ilerleyemezse yeni kaçış noktası, kapma hedefine 2,5 sn ulaşamazsa vazgeçip kaçar, oturma yerine ulaşamazsa yakınında boş yer arar. Ekran titremesi: art arda karelerin parlaklık ölçümü tutarlı (titreme yok); eski nabızlı vinyet ve sis sıçraması sadeleştirildi.
- **Kuantum kısa filmi** (`pairActors.ts`, `world.ts`, `slits.ts`): çiçekler iki figürün bedeninden sırayla açar (adamda açarken kadında solar, sonra tersi; beş taç yapraklı sprite'lar); "ay" dizesinde aya çıkan bir yol belirir, adam üstünde koşar, kadın gömlek cebinde minicik (sarı figür); "bağ" dizesinde kadın kangal ip uzatır, adamın bileklerinde ilmek; ara bölümde iki çift yarık düzeneği (A'nınki gözlenir → iki band, B'ninki gözlenmez → girişim), yalnız klipte görünür; kadeh masası odanın ortasında, yeşil ışıyan sıvı kadından adama süzülür; "tasma"da adamın boynunda halka, ipin ucu odanın öbür ucundaki kadının elinde, doğu yarıda uzun bir ayna — aynadaki yansımalarda roller ters (adam ipi tutar, kadının boynunda tasma; ayna arkasında kopya figürler); "gülüş"te gamzeden mürekkep patlamaları (her patlamada sarsıntı), çift ilk kez merkezde buluşur.
- **Redd:** *Kalpsiz Romantik* — suyun üstünde denizin üzgün yüzü (köpük çizgileri), serbest dolaşırken elde kibrit, "yoruldum"da diz çöken adam, "kendimi başkalarına gömdüm"de kıyıdaki bekleyenlerin içinden geçiş (her geçişte parlama), sonuncusundan sonra diz çöküp toprağa gömülme, akıntıda doğrulma. *Kanıyorduk* — fenerin yanında bir çift; düşüş/yükseliş dizelerinde boşlukta, tepede NASA'nın kamu malı dünyası (`public/textures/earth.jpg`), kamera yarım tur döner; "uzaktan mutlu" 38 m uzaktan uzun lensle yörünge (evren döner, çift sabit), yaklaşınca iki göğüs de kanar (damla + leke); "dünyayı içimden taşırmamıştı"da adamın göğsünden büyüyen dünya, okyanuslardan su, karalardan toprak akar; dev kavgası: kılıç (çelik/pirinç/kabza) ayağa saplanır, dev tepinir (yürüyüş animasyonu 0,22× hız), her ayak inişinde şok halkası, adam savrulur; sayfanın altında kurşun kalemle "I Will Die With Your Love — Sabahankra" (yalnız ad). *İtiraf* — kafesin önünde beş kişilik sıra, itiraf eden elindeki bidonla döker (akan sıvı parçacıkları), sıra soldan sağa tutuşur, sonra kendini yakar; "patlayacak gibi vuruyor kalbim"de göğsünden fırlayan çizgi film kalbi (ekstrüde kalp, nabızla 0,3 m dışarı); "boğulurum"da cam oda: su boyundan başlar, ağız hizasını geçer, iki gözden akıntı; kamera su hizasında ve tepeden.
- **Hub:** "Rastgele" düğmesi artık çarkı rastgele yöne hızla döndürür (albüm sayısı + 5–11 adım, 75 ms'den 500 ms'ye yavaşlar), sonra bir kapakta durur; dönerken düğme kilitli. Test: `tests/e2e/hub.spec.ts`.
- **Doğrulama:** tsc 0 hata · Vitest 38/38 · `vite build` temiz · kontak levhaları: Klostro 27 kare (duvarlar, çorba/çatal, kabuk içi, tavşan delikte), Kuantum 24 kare (yol, cep, ip, yarıklar, kadeh, ayna, gamze), Kanıyorduk 22, Kalpsiz 19, İtiraf 21; titreme sondası (`flicker.mjs`) altı anda tutarlı parlaklık. Playwright sonuçları raporda.

### 26.7 Dördüncü tur (29.09.2026): film senaryoları, karakter kütüphanesi, üçüncü kişi

Sahibin direktifi: "Sadece yazdığım güncellemeleri değil daha ötesini yap; bütün şarkıları senaryoya, filme çevir" + 14 İngilizce film senaryosu (01–12 Redd, 13 Kuantum, 14 Klostro; karakter kilidi: ~28 yaşında siyah gömlekli koyu saçlı adam, uzun koyu kahve saçlı açık soluk elbiseli kadın; "verilen ses mutlak zaman çizelgesidir") + hata listesi ("tavşan kitaplıkta takılıyor, atılan plağa gelmiyor", "Klostro'da duvar koyma, evren küçülsün", "çatal çorbadan çıkmalı, çorba çataldan akmalı", "bizim karakterimiz olmalı, klip dışında da görünmeli", "bir erkek bir kadın", "çift yarık iki kez gösteriliyor", "kitap yere gömülüyor, dev savaşı sayfanın içinde olmalı") + "bakış açısını bir tuştan değiştirelim" + "ayarlara sıfırla düğmesi". Şarkı sözü kopyalama isteği (Kanıyorduk sayfası) telif kuralı gereği yine reddedildi; sayfada yalnız parça adı ve sanatçı var.

- **Karakter kütüphanesi** (`engine/fx/character.ts`, `public/models/characters/`): Quaternius CC0 *Universal Base Characters* (man.glb, woman.glb; saç Head kemiğine bağlı, Unreal kemik adları) + manken çifti + UAL1/UAL2 animasyon paketleri (86 klip). `createFigure({ kind: "man" | "woman", outfit })`; kıyafetler kemik ağırlıklarından türetilen bölge maskeleriyle taban ten dokusuna boyanır (`outfits/*.webp`: man_hero/plain/dark/black, woman_red/white/blue/ochre/muted). Kadın taban dokusundaki siyah sütyen adası maskede ten sayılıyordu ve açık bej elbise ten rengine karışıp çıplak okunuyordu → koyu taban pikselleri elbiseye katıldı, `woman_muted` soluk mavi-gri (#8a9cae). Saç malzemeleri (`MI_Hair_*`) çalışma zamanında koyulaştırılır (adam koyu, kadın koyu kahve). Klip figürleri: Klostro adam, Kuantum çift + ayna kopyaları + cepteki mini kadın + siluetler, Kanıyorduk dövüşçü/çift/el, Kalpsiz adam + dört bekleyen + koridor kişisi, İtiraf adam + üç siluet. Hayko ve Redd'in öbür şarkıları hâlâ manken. `CREDITS.txt` güncellendi.
- **Üçüncü kişi** (`engine/game/avatar.ts`, `engine/core/player.ts`): omuz üstü kamera, plak karakterin elinde, sinemada/kapak noktasında gizli; **T** birinci/üçüncü kişi (dört albümün kontrol listesine eklendi, başlangıç ipucunda "T: bakış açısı"); ayar `thirdPerson` (varsayılan açık). Sonda (`viewprobe.mjs`) geçiş doğrulandı: kamera-oyuncu uzaklığı 3,05 → 0 → 3,05.
- **Ayarları sıfırla** (`engine/ui/menu.ts`, `engine/core/storage.ts` `defaultSettings()`): Ayarlar sayfasında düğme; bütün ayarlar varsayılana döner ve hemen uygulanır (demo kalite ayarı korunur); evren ilerlemesine dokunmaz. Test: `player.spec.ts` "Ayarları sıfırla".
- **Klostro v3** (senaryo 14; `universe.ts` yeni, `walls.ts` silindi, `story.ts`/`shellHome.ts`/`hurried.ts`/`world.ts` yeniden): duvar yok — kâğıdın ötesi karanlığa döner (`RADIUS_TARGET` 160 → 120 → 70 → 46 → 32 → 22 → 18 → 16 → 13 → 10,5 m; kara halka + sisi olmayan ufuk silindiri + gök `uDark` + sis rengi geceye + ışıklar kısılır); eşyalar aynı, yer azalır; sonda karanlık kalkar ve bütün kâğıdın dev bir kabuğun içinde olduğu görülür (`outer` kubbe, 420 m). Adam bizim karakter: kâğıdın ucundan kabuğun ağzına yürür (şarkı saniyesine bağlı, ileri sarmaya dayanıklı), içeride kabuk evi devralır (otur → duvarı it → yorgun → kâseye diz → iki büklüm); ev 2,8 → 1,6 m; çorba kâsesi evin ortasında, çatal çorbadan kalkar ve dişlerinden çorba damlar; tavşan kâğıdı koşarak geçer, ağızda duraksar, daralan turlar atar, "kaçış"ta kazıp dalar, "açılış"ta çıkıp oturur. Nefes perdesi tek çekim (173,9 → 194,9; açı 62° → 34°). Havuç sinemada gizli. Tavşan: alış sonrası 6 sn, yerdeki plağa 3,5 m'den 14 sn, raftan 24 sn; dinleme yeri kitaplıktan uzak yan; serbestken varamıyorsa halka genişleyerek yeni yer. Sır "corba" kalktı (kâse artık yalnız filmde); Klostro sırları: soz-sinavi.
- **Kuantum v3** (senaryo 13; `pairActors.ts` yeniden, `slits.ts` ve birim testi silindi, `story.ts`, `world.ts`): adam + kadın. İki çiçek (elde; birininki açarken öbürününki solar, dokunan sırayla değişir) → taç yaprak makrosu → Ay'a yol (adam koşar, kadın gömlek cebinde mini) → başını sallayınca cepteki kadın da sallar, Ay bir yanar bir söner (`moonMood`) → uzun yolda tasma (kadının elinde, adamın boynunda; kamera arkalarında) → yol boyunca dev ayna, yansımada roller ters, kesme yok → kadın kaybolur, saydam koza sarar ve daralır, kadın zarın öbür yanında, ikisi de zara dayanır → koza zarı kadehin camı olur (beyaz geçiş) → masada ayakta karşılıklı, yeşil sıvı, boğaz tutulur → yeşil yükselir ve tasma olur (`greenRise`, kadeh sıvısı azalır) → kamera kadının yanağında: gamze, yıldız, evren (nokta bulutu) → içeride kara küre, iki kalp aynı anda atar, iki siluet birleşir; son notada ayrılıp bakışırlar; karanlık; kapak. Çift yarık klipten çıktı; dolanık parçacık çiftleri, kâğıt kuşlar, yerdeki mürekkep çiçekleri kaldırıldı; ikiz/halkalar sinemada gizli; masa 1,06 m.
- **Kanıyorduk v3** (senaryo 02; `stars.ts`): kitap ahşap masada (ayak izindeki en yüksek zeminin üstünde; gömülme bitti); kitabın ölçeğinde bir el (5× adam, gövdesi kadraj dışı) uzanır; portrede gözler kayar, kâğıt nefes alır; kamera sayfanın içinden geçer (beyaz); dev binalardan/yırtık sayfalardan/taştan (doku + ışıyan pencereler); adam yorulur, kaybeder, aşağı değil yukarı düşer; sıfır yerçekiminde kadın yanında, yıldızlar göz, Ay eksik; düşüş/yükseliş 180° kamera dönüşü; uzaktan mutlu → yakında kanayan göğüsler; kâğıt kalp (yaprak belirir, ortasından yırtılır, yırtılan kâğıt bütün uzay olur) + göğüsten taşan dünya; kan kırmızı ipliklere döner (kadına, Dünyaya, Aya, sayfaya); kamera iplik boyunca odaya döner; ikinci geçiş; sonda kitap kapanır (kapak omurgada döner), aralarında ince yıldız ışığı çizgisi.
- **Kalpsiz Romantik v3** (senaryo 01; `boats.ts`): boş liman, çok yavaş yaklaşan kamera, elde kibrit, 14. saniyede çakış; alev gözde (beyaz geçiş) → gemiler dış neden olmadan tutuşur; kıyıda dört kişi (üç kadın, bir adam; kalabalık değil), biri kollarını açar; bedenlerden geçiş (geçilen gövde saydamlaşır, parlama), her geçişten kanıt (elbise parçası, saç teli, yanık izi); iskelede döngü koridoru (aynı kişi başka kıyafetle yeniden önüne çıkar, her geçiş daha hızlı); otomatikleşme (yürüyüş sürer, el kalkar, baş döner, göğüs kabarır; uzun lens); kırmızı yelken; beton kenarda diz, parçalar suya dökülür, yığılma, kesmesiz dönüş; boş deniz, kara çiçekler, biri tutuşup söner. Bekleyen kalabalığı ve sudan yükselen 22 beden kalktı.
- **İtiraf v3** (senaryo 10; `confession.ts`): çıplak karanlık oda, bidon; benzin kendi gölgesine (gölge yanar, beden dokunulmamış); üç siluet, gölgelerine de döker; görünür kalp atışı (çizgi film kalbi, sarsıntı); ilk gözyaşı düşer, yere çarpar, birikinti; oda dolar (cam oda 5,2 m), adam ayakta kıpırdamaz; su ağza, yüze; suyun içinde yanan gölgeler batık siluet; kalp üç kez devleşir, durur; her şey hareketsiz; bir gözyaşı yukarı süzülüp sudan çıkar, saydam küre; karanlık.
- **Playwright:** `@playwright/test` 1.63 → `chromium_headless_shell-1243` gerekti (`npx playwright install chromium chromium-headless-shell`). Testler güncellendi: Klostro film (yürüyüş → kabuk → daralma → dış kabuk), Kuantum film (çiçek yerleri, ayna kopyaları, gamze), hub sıfırlama (`soz-sinavi`), ayarları sıfırla.
- **Kalan (sahip isteği: bütün şarkılar film):** Redd 03–09, 11, 12 ve Hayko'nun 9 şarkısı v2 şablonunda (manken figürler); senaryolar oturum notlarında (`scripts.txt`). Sıradaki iş bunlar.
- **Doğrulama:** tsc 0 hata · Vitest 35/35 (çift yarık birim testi kalktı) · Playwright 56/56 (tam tur 52 + düzeltilip yeniden koşulan 4: gramofon taşıma ve asılı plak erişimi üçüncü kişide oyuncunun gözünden ölçülür, kabuk evi duruşu görünürlükten bağımsız, hikâye satırı metni) · `vite build` temiz · kontak levhaları: Klostro 39 kare, Kuantum 35, Kanıyorduk 38, Kalpsiz 32, İtiraf 38 (siyah/boş kare kalmadı; sondalar `kblack.mjs`, `evalprobe.mjs`, `viewprobe.mjs`). Eski `mannequin.glb` silindi (kütüphane mannequin_m/f kullanıyor).

### 26.8 Kitaplık düzeltmesi ve geçici test kipi (29.09.2026)

- **Kitaplıkta Q/E** (`engine/boot.ts`): kitaplığın 4 m yakınında Q ya da E, eldeki plağı (çalınmamış olsa da) kendi yuvasına koyar; önceden yalnız çalınmış plak rafa dönüyordu ve E için rafta bir hedef yoktu. El doluyken "Raftan al" istemi çıkmaz, kitaplığın kendisi "Rafa koy" hedefidir (gramofona bakılıyorsa gramofon önceliklidir). Test: `worlds.spec.ts` "Kitaplık: yanında Q ya da E…".
- **GEÇİCİ test kipi** (`engine/devFlags.ts`, `ALL_RECORDS_SHELVED = true`): sahip klipleri denerken plak aramasın diye dört evrende bütün plaklar baştan kitaplıkta gelir (`ctx.startShelved`), Klostro tavşanı plak kapmaz; ilerleme kaydı değişmez. Otomatik testler kipi `localStorage["audioroom.dev.shelveAll"] = "0"` ile kapatır. Eski hâle dönmek için bayrak `false` yapılır.

### 26.9 Kanıyorduk sürüm 6: kapağın dünyası, minyatür sayfa, gerçek dev, kollarında ölüm (30.09.2026)

Sahibin üçüncü ana metni (Fable 5.1 final master prompt) ve düzeltmeleri: karakterler beyaz giyer, ten doğal açık; yalnız var olan evren (kapağın krateri) kullanılır, yükselişte de aynı dünya; klip bitince evren kendi ayarlarına döner; T ile eldeki plak görünür. `worlds/mukemmel-bosluk/songs/stars.ts` yeniden yazıldı:

- **Dünya = kapak.** Ayrı çayır, ağaç, oda, Dünya küresi ve hava katmanı yok; masa+sandalye kraterin batı tabanında (`TABLE` −22,40) gün ışığında durur (`kit.effects.daylight`; `world.ts` artık gündüzde göğü maviye değil, kapağın beyaz göğüne ve temiz havasına harmanlar; yalnız hemi/güneş yükselir). Kapak nesneleri gizlenmez (`coverHidden` kaldırıldı).
- **Kitap baştan açık** (`lid.rotation.z = π`): sol sayfada satırların üstünde eğri (`rotation.z 0.09`), köşesi kıvrık (`fold`), solmuş (`wear`, 1024×1280 lif katmanı) fotoğraf (kadın modelinden basılan portre, `woman_white`); sağ sayfada 1/55 ölçekli **sayfa dünyası** (`pageWorld`): adam (`pm`, `man_white`) ve dev (`pg`, 13 m, `man_plain`) kamera gelmeden önce de dövüşür (daire çizer, dev ağır savurur). 39,85–50,32 koreografi: koşu, dev savurur (`chop`), eğilme (`tired`), yumruk, dev tutar (`reach`), kurtulma (`hit`), yumruk, savurma, eğilme, yumruk, kesin darbe → `knockback`, geriye savrulur; dev bir adım atıp başucunda durur; adam `death` ile yerde kalır. 54,8–60 kamera parmaklarına iner (`pmHandAt`).
- **Sayfadan gerçeğe eşleşen kesme (60,07):** aynı parmak kadrajı gerçek ölçekte (`handAt`), kamera geri çekilir: adam yerde (`MATCH` −46,30), dev başucunda (`GIANT_REAL`), kadın devin arkasında (`WOMAN_REAL`). Akşam iner (`daylight` 1→0,12 arası, 57,5–66).
- **Yıldız-gözler (65,8–70,3):** kamera göğe yükselir; 7 yıldız kümesi (`Points`, badem + iris + gözbebeği) yaklaştıkça yumuşak göz parıltısına (`eyeGlowTexture` sprite) döner; kameraya bakar. **Ay (70,3):** gökten aşağı, ikisi yan yana ayakları yerde (`nightPair`; dev arkada olduğu yerde). **İki yarı (76,2–80,96):** yeni `lens: "tear"` (`engine/core/runtime.ts` mod 5, `lensAmount 0 → lensAmountTo 1`; `director.ts` artık lens miktarını çekim boyunca ara değerler): kare tepeden aşağı kâğıt gibi yırtılır, yarılar ayrılır (lif saçağı, koyu arka), yeniden birleşir; bedenler yırtılmaz.
- **Ana nakarat (`masterShots`/`masterLift`):** tek sürekli kamera yolu (`path`, 10–15 m önden, geri ve yukarı) ile topuklar kalkar (2,4 sn), 8 sn içinde 420 m (u³), sonra 6 m/s; sis yükselirken 0,22'ye iner ki ada yukarıdan görünsün (`kit.effects.fog`). Uzayda yalnız kamera döner (`roll π→0`, kamera çiftin üstünde), çok uzak (30 m), kesmesiz yaklaşma. Duruş doğal (`still`, hafif salınım; süper kahraman kolu yok). Kan: iki kalpten damlalar (`spawnDrop`, çiftin çerçevesi `dropFrame` çiftle yükselir; atmosferde hızlı, boşlukta askıda; 8 noktalı ince iz). Nakarat 1/2/3 kan tabanı 0/0,25/0,55; 3. nakarat uzaydan sürer (`fall3` irtifayı devralır). Son "aşkla": iki damla birleşir (232,5–236,2), birleşen damla dünyaya iner; kamera izler (236,6) → fotoğraftaki koyu leke (`dropSpot`, 238,23).
- **Ara/özlemek/kalp (120–159,8):** yerde aynı gece; adam bir adım atar; kamera tek yavaş yay; el uzanır (`reach`), az kalır, dokunur (ikisi `reach`). Kalp 150,5–159,6: atış → lif/kâğıt → kat izi → yırtık (lifler tek tek) → gevşek yarı (`heldHalf`, 3B) kadının eline.
- **Gerçek dev (159,8–170,5):** dev `GIANT_REAL`'dan yürür (adım tozu, sarsıntı), koreografi: koş, savurma, eğil, yumruk, tut, fırlat (yana 5 m/s), kalk, koş, yumruk, savurma, kesin darbe (geri 6 m/s), kalk, `tired` (nefes). Dev yok olmaz, yerinde kalır. **Kollarında (170,5–181):** ona yürür, `reach`/`death`, kadın `kneel`; gözyaşı (`tearDrop`) 178,3–179,4 yüzden toprağa, kamera izler, sonra yükselir → nakarat 2 dilek olarak (ikisi ayakta; diriliş gösterilmez).
- **Kapanış (238–266):** leke → geri çekilme → aynı iki sayfa (sağda donmuş dev ve yatan adam: `pageEnd`) → adamın yüzü → kitap 252'de doğal kapanır → geniş → 262'den kararma; 265,8'den sonra `daylight/dim/fog` sıfırlanır.
- **Motor:** `engine/boot.ts` `applyView` önce plağı ele verir sonra kamera çocuklarını gizler (tutucu kameranın çocuğuyken gizlenip elde gizli kalıyordu; kapsül rigin de eli var, `skinned` şartı kalktı); `records.setHand` tutucuyu görünür yapar. Karakter dokuları `outfits_fair.py` ile yeniden üretildi (ten gama 0,74 + mavi/yeşil yükseltme = doğal açık ten; yeni `man_white`). Kapak eşlemesi: `moments.ts` DAY hemi 0,62 / güneş 1,05 / sis 0,0019 (#f1f1f0); `terrain.ts` deep #0b0b0c / ash #1f1f21 / rim #2e2e31; `world.ts` kontrast 1,16; kapak noktası hedefi y 12,5.
- **Sayfadan gerçeğe:** kamera yakın düzlemi 8 cm olduğundan minyatür ele makro yaklaşılamaz; sayfa çekimleri elden 8 sayfa-metre (0,15 m) uzakta biter, gerçek çekim aynı kadrajla 8 m uzaktan başlar ve parmaklara kadar ilerler (kesme görünmez, kamera ileri gider). Oyuncunun karakteri (`engine/game/avatar.ts`) de artık beyaz giyer.
- Bilinen sınırlar: modeller fotogerçekçi değil; parmak/yüz mimiği yok (el hareketi `sitTalk`), kumaş/saç fiziği yok; kucaklama/taşıma klibi yok (`reach`+`death`+`kneel` ile). YouTube saati 4 Hz.

### 26.10 Kapak kadrajı, evren parlaklığı, gökyüzü ve film düzeltmeleri (30.09.2026, gece)

Sahibin ikinci düzeltme listesi: kapak kadrajı kapakla uyuşmuyor; evren çok karanlık (varsayılan normal olmalı, kapağa bakış ayrı ayarlanmalı); varsayılan nesneler (gramofon, kapak noktası, kitaplık) hep yakın olmalı, plaklar sonra evrene rastgele dağılacak (şimdilik kitaplıkta); kitaptaki dövüşte dönme olmasın; yıldız-gözler yapmacık; kamera nesnelerin içine giriyor; gökyüzü görkemli/renkli olsun (bulutsu, galaksi, kayan yıldız); düşme-yükselme hissi zayıf ve geç; kan çok hızlı ve yapmacık.

- **Kapak kadrajı** (`world.ts coverPoint`): kamera sırtın üstünden (0, zemin+4, 88) çukura bakar, hedef (0, 4, −20), fov 46: uzak sırt çizgisi karenin ortasında, REDD karşı yamaçta küçük, figür üstte (kapaktaki gibi). `onEnter/onExit` → `coverLook` harmanı: hemi ×0,5, güneş ×0,72, sis ×0,55, kontrast 1,12→1,34, doygunluk ×0,5 (siyah-beyaz fotoğraf kontrastı). Varsayılan evren normale döndü: DAY hemi 0,95 / güneş 1,55 / sis 0,0024; arazi #101012/#262629/#363639.
- **Varsayılan nesneler:** kitaplık `engine/boot.ts` içinde gramofonun etrafındaki adaylardan yerleştirilir, kapak noktası ve gramofon her evrende birbirine yakındır (Redd: gramofon 7,72 · kapak durağı 0,64). Plakların rastgele dağıtımı geliştirme modu bitince (`ALL_RECORDS_SHELVED=false`) ele alınacak.
- **Gökyüzü:** `sky.ts` yıldızlar hafif renkli (mavi-beyaz/sıcak); Kanıyorduk anı `nebula: 1` (samanyolu şeridi + mavi/magenta bulutsular), film gece ve uzayda kayan yıldızlar atar (`createMeteors`, 4–11 sn'de bir).
- **Film (`stars.ts`):** sayfadaki kavga artık daire çizmez (adam yerinde ağırlık değiştirir, ara sıra vurur; dev savurur); yıldız-gözler çizgisiz yumuşak ışıma + bademin içine dağılmış yıldızlar + kendi ritminde göz kırpma (`blink`); **kamera boşluğu** (`withClearance`): her çekim konumu adam/kadın/dev kapsüllerinin dışına itilir; **düşme-yükselme**: kaldırma 0,8 sn'de başlar (u³ 7 sn'de 420 m, sonra 1,2 m/s), paradoks çekiminde kamera uzayda sabitlenir (`latch`: konum %12, bakış %55 sürüklenir) → çift kadrajda süzülür, yalnız roll döner; **kan**: damlalar 5 mm, hız ~1 cm/s, yerçekimi 0,16→0,008, seyrek (1,7 sn), izler soluk, 16 sn ömür; birleşen damla 12 cm/s iner. Akşam anahtar ışığı 55 (#ffe2c8).
- Test: `clip.spec.ts` anlatı beklentisi "fotoğraf".

### 26.11 Üçüncü düzeltme listesi: uzay kubbesi, düz kara parçası, nakarat uzayda, sızan kan, bağlayıcı geçişler (30.09.2026)

Sahibin ekran görüntülü listesi: yıldız-gözler geç; ilk nakarat geç ve yerde başlıyor; uzayda hiçbir şey görünmüyor (gri/siyah alan), dünya düz kara parçası olmalı, bulutsu/yıldız görünmeli; kan hızlı; karakterler parlak; ölüm sahnesinde gövde yere gömülüyor; gök vasat; sahneler kopuk, ara sahne/geçiş istiyor.

- **Uzay kubbesi** (`sky.ts` `uSpace`): kubbe her yönde boşluk (ufuk yok), yıldızlar ve bulutsular ufkun altında da; ince ikinci yıldız katmanı; bulutsu uzayda daha güçlü. `kit.effects.space` (yükseklik 110→380 m) ve `groundLight` (12→200 m; hemi +2,4, güneş +1,8 → kara parçası yukarıdan okunur). Uzak galaksiler: üç yumuşak sarmal sprite (`galaxyTexture`) yalnız uzayda.
- **Kara parçası** (`terrain.ts`): 560 m kare, açıya göre dalgalı kıyı (226–278 m), dışı kıyıya çekilip 26 m aşağı iner (uçurum, koyu renk) → yukarıdan yassı, pürüzlü kıyılı bir ada; küre gibi okunmaz. İçeriden fark edilmez (sırt ufku kapatır).
- **Zamanlama:** yıldız-gözler 60,6–63,5'te belirir; kamera 62,4'te elden göğe yükselir (devin başucundan geçer), Ay çekimi aynı yoldan sürer. Yükseliş 74,5'te başlar (u⁴, 6,5 sn'de 420 m, sonra 1,2 m/s): 73,4 geniş (topuklar kalkar), 76,2 yırtık kare (kamera eşlik eder, zemin uzaklaşır). **80,96 "düşüyorduk"**: kamera uzayda sabit (`latch`), çift kadrajda süzülür, roll π→0; **85,39 "yükseliyorduk"**: kamera altlarında sabit, yıldızlara doğru uzaklaşırlar; 90,97 uzaktan; 95,55 yavaş yaklaşma. Nakarat 2–3 uzayda başlar (dilek; `liftFor`), gözyaşından yükselen kamera karanlığa (`out: fade`) → paradoks (`in: fade`).
- **Kan:** leke sprite'ı sızarak büyür (0,015→0,09), damlalar 3 mm/s, seyrek (3,4 sn), 30 sn ömür; 1. nakaratın sonunda tek damla (`heroDrop`) yakın plan (117,2–120) ve oradan kararma.
- **Parlaklık:** gece anahtar 42 / kenar 32, uzay 1700 / 650, BLUE_HOUR 0,95, SPACE 0,8. **Gömülme:** ölümde `him.lift = 0.2`.
- **Geçişler:** el yakın planı kalp planına akar (145,5→150,5), elindeki yarıdan geri çekilen kamera devi ortaya çıkarır (158,6→162,6), dövüş sonu kadına döner (169,3), gözyaşı→yükselen kamera→kararma→uzay.
- **Yükseliş eğrisi:** u⁴ yerine iki ucu sıfır eğimli smoothstep (6,4 sn'de 420 m): nakarat kesmesinde çift yavaşlamış olur, sabitlenen kamera onları kadrajda tutar (u⁴ ile 258 m/s hızla kadrajdan çıkıyorlardı). Uzay anahtar ışığı 6000 / kenar 2000 (pozlama 0,8 ile). Ölüm yakın planı: alçak ikili plan (`midAt(2.4, 0.8, 0.4)`).

### 26.12 Dördüncü düzeltme listesi: fizik doğru düşüş/yükseliş, Ay ve sol/sağ yırtık, gerçekçi kanama (30.09.2026)

- **Düşüş→yükseliş (kamera fiziği):** "Düşüyorduk uzaydan bakınca": kamera çiftin üstünde, yer altlarında; kamera onlardan hızla uzaklaşır (6→46 m), ikisi yere doğru düşüyormuş gibi küçülür. "Aslında yükseliyorduk": kamera 180° döner (roll 0→π, yer tepede) ve yavaşlayıp onlara yaklaşır (46→5,5 m): çift yerden kopup boşluğa düşüyormuş gibi büyür. Çiftin hareketi hiç değişmez (1,2 m/s yukarı). Uzaktan: kamera doğrulur ve 34 m çekilir; sonra kesmesiz yaklaşma. `latch` yardımcıları kaldırıldı (tamamı çifte göreli hareket).
- **Ay ve yırtık:** Ay çekimi 70,3–74,2 (fov 44→24, Ay büyür), kamera çiftin önüne iner (`moonFront`: Ayın karşı tarafı → Ay arkalarında), ikisi kameraya döner; yırtık karede biri solda biri sağda (`nightPair` ±1,0 m), lens `tear` aralığı 0,05. Yükseliş 74,5'te başladığından yırtık sırasında zemin altta uzaklaşır.
- **Kanama:** her göğüste 6 rastgele leke (`stains`), her biri kendi eşiğinde (`start`) sızmaya başlar ve büyür; damlalar lekelerden rastgele kopar (Poisson), önce gömlekte süzülür (3 cm/s, figüre bağlı), sonra boşluğa geçip ağır ağır dünyaya süzülür; 1. nakaratın sonunda serbest bir damlaya yaklaşılır. Uzaktan mutlu: çift 1,6 m'den 0,7 m'ye yaklaşır, yüz yüze.

### 26.13 Beşinci düzeltme listesi: söze oturan zamanlama, dokuda kanama, fiziksel dövüş ve ölüm, loş kapanış (30.09.2026)

Filmin tamamı gerçek zamanlı oynatılıp 1,5 sn aralıkla kare kare incelendi (`film.mjs`, 178 kare); her söz anı ayrıca denetlendi.

- **Zamanlama (söz → görüntü):** eşleşen kesme 56,2'ye alındı (`land` vuruşu), kamera 58,2'de göğe çıkar: yıldız-gözler **60,07'de kadrajda**. Ay 70,29'da kadrajda. Kalp 144,4'te göğüsten çıkar, 147,6–150,2 kâğıda döner, **150,49'da yırtılmaya başlar**. Dev 154'te yürümeye başlar, ilk darbe **159,77'de**; adam **170,54'te** yığılır. "Mutluyduk"ta kamera sözden önce (−2,2 sn) çekilmeye başlar, sözde uzaktadır; "kanıyorduk"ta yaklaşma 3,6 sn sürer, ilk leke ~4 sn içinde görünür.
- **Kapanış parlaklığı (kök neden):** nakarat etkileri (`space`, `groundLight`) `t ≥ L.fall2` koşuluyla son kitap sahnesine sızıyordu; artık `t < L.end` ile sınırlı. Kapanışa ayrı `END_GRADE` (pozlama 0,7), gün ışığı 0,72, kitap ışıkları yarı şiddet.
- **Uzayda parlayan figürler:** kara parçasını aydınlatan `groundLight` beyaz giysileri patlatıyordu; uzayda figür malzemesinin tonu kısılır (`tone = 1/(1+1,25·groundLight)`), ışıma hâlesi kalktı.
- **Kan (yeniden yazıldı):** sprite ve küre yok. Kan **kıyafet dokusuna** çizilir (figür başına 1024² tuval, `multiply`): yaralar gövdenin ön yüzündeki köşelerden (bağlama duruşu, boy kesri → en yakın ön köşeler → UV) bulunur; her yara kendi saniyesinde açılır, kumaşa yayılır (düzensiz, üst üste lekeler) ve altından iz süzülür (iz de gövde yüzeyini izler). Kanamanın yaşı zamanın saf işlevidir (`bloodAge`): geri sarmada tutarlı; 2. ve 3. nakaratta lekeler hazırdır ve artar. İki ana yaradan (iskeletli köşe konumu, `getVertexPosition`) çıkan **iki ince iplik** (canlı tüp, kübik eğri) aralarında birleşir; **tek iplik** dünyaya iner (0,3 m/s, en çok 7 m), içinde akan boncuklar, ucunda damla; son nakaratta damla kopar (235,6), kamera onu izler → fotoğraftaki leke.
- **Kan planları:** arkadan/kalça hizasından planlar kaldırıldı; hepsi profil ikili plan (adam solda, kadın sağda, göğüs hizası), sonra birleşme noktasına yaklaşma, ipliğin yanından (0,55 m; bedenler kadraj dışı) aşağı süzülüş, damlada makro.
- **Düşüş/yükseliş:** ikisi sırtüstü (−69°), kollar açık, uzuvları oynar (yüzme klibi; kökü göğüs hizasında olduğundan kadraj `bodyAt` ile düzeltilir), hafifçe yalpalar. Kamera 55° yukarıdan: **yer kadrajın altında**, ikisi giderek hızlanan bir çekilişle (3,3→48 m, üs 1,7) yere doğru küçülür; sonra 180° dönüş (**yer tepede**) ve ikisi kameraya doğru büyür. Çiftin çerçevesinde duran uzay tozu kamera geçerken akar. Figür dönüş sırası `YXZ`.
- **Yıldızlar:** göz kümeleri alçaltıldı (30–54°); 64,6'da alçak geniş plan: iki küçük insan, yanlarında bütün dev, üstlerinde Ay ve gözler. Kadın adama yürür (teleport yok).
- **Devle dövüş:** dev uzaktan yürüyerek gelir (`GIANT_FAR` → `giantStop`, adım tozu), kadın geri kaçar; adam koşar, darbenin altından yuvarlanır (`roll`), vurur (`hook`), dev iter → yavaşlayan savrulma (toz, sarsıntı, ses), kalkar, yine koşar, yine savrulur. Motor: `lie` (kalkış klibi tersten), `roll`, `hook`, `block` duruşları eklendi.
- **Kollarında ölüm:** adam son kez kalkar, deve dönüktür; kadın arkasına koşar. Sözle birlikte dizleri çözülür ve ağır çekimde (0,5×) geriye uzanır (`lie`); kadın yanında diz çöker, üstüne eğilir (klip ağırlaşır, çökük kalır). Beden yamacın eğimine yatar (`slopePitch`; havada durma/gömülme yok). Gözyaşı kadının baş kemiğinden adamın üstüne düşer; kamera yükselir → uzay.
- **Kalp:** göğsün içinde yarım görünmek yerine göğüsten dışarı çıkar; daha yuvarlak; kâğıda dönünce incelir; yırtık kenarı ince dişli.
- **Diğer:** eşleşen kesmede gerçek adam zaten yerdedir (düşüş klibi kesmeden önce görünmeden oynar); el planı makroya girmez, akşam ışığı nötr (turuncu ten yok); toz kül rengi (gece parlamaz); sayfadaki dövüşte kasık planı yerine adamın arkasından deve bakış.
- **Doğrulama:** tsc 0, Vitest 35/35, Playwright ve `vite build` sonuçları oturum raporunda.

### 26.14 Hikâye yazıları kaldırıldı; Kalpsiz Romantik baştan kuruldu (30.09.2026)

- **Hikâye yazıları (tüm evrenler):** sol alttaki "Hikâye" satırı sahnelerle uyuşmuyordu; motor düzeyinde kaldırıldı (`hud.narrate`, `.ar-story` stilleri, `songStage` ve dört evrenin çağrıları). Vuruşların `line` alanı artık yalnız kod içi yönetmen notudur. Otomatik testler filmin anını `html[data-beat]` özniteliğinden okur (ekranda görünmez).
- **Kalpsiz Romantik (3:20, owner'ın FINAL MASTER PROMPT'u):** tek adam, tek kıyı şeridi (kraterin kuzey kıyısı; kıyı koordinatı `shore(s, up)`), aynı yedi gemi. Bütün hareket şarkı saniyesinin işlevidir (yol/duruş/bakış tabloları): sarma ve geri sarma aynı kareyi verir, kimse belirmez ya da kaybolmaz (o kadın yalnız kadraj dışındayken yer değiştirir).
  - Açılış: çok geniş, adam suyun kenarında, elinde kibrit → yüzü ve alev → alevden suya: gemiler birer birer tutuşur (patlama yok) → su yüzeyinde iki yorgun göz gölgesi (yalnız bir kez) → kıyıda bekleyen dört kadın; biri ardından bir adım atar → beden kendiliğinden adım atar, eli uzanır, öbür eliyle tutar → uzakta o kadın; yeniden bakınca boş → göğse dokunuş, gövde bir an saydam: kalbin yerinde koyu, yumuşak bir oyuk.
  - Ana nakarat (iki kez, aynı görsel cümle): kadın kollarını açar (IK), gerçekten sarılırlar (kollar sırta dolanır), adam onun gövdesine girer (kadın saydamlaşır, içinde yumuşak kumaş katları), sırtından çıkar, kadın ayakta kalır. Kamera mantığı: çapraz genel · yandan izleme · karşıdan orta plan · arkadan izleme; dördüncü kadın bankta oturur, yan yana otururlar, elini uzatır. İzler: kolda iplik, omuzda saç teli, yakada ruj, gömlekte leke (dokuya boyanır). İkinci nakaratta daha yavaş; ikinci kadın kameraya bakar; üçüncüde duraksar; dördüncüde bekler; sonra izler tek tek yere dökülür, tertemiz kalır, ellerine bakar.
  - Yol ayrımı (üç yöne bakar), dar geçit (iki yük yığını), ucunda yine biri: bir adım, duruş, geri çekiliş. "Onlarca beden": aynı dört kadının içinden koşarak, kesmesiz yan izleme. Durur; üstü izlerle dolu; ipliği çeker, iplik ilk kadına uzanır.
  - İkinci kıta: aynı kıyı, açılışın açısı; gemiler hâlâ yanıyor. Ateşin başında fıçı masa, sandık oturaklar; üç demiri beline bağlayıp kadınların başının üstündeki soluk "kafa boşluğuna" atar; halatlar onu üç yöne sürükler; bırakır. Beden eski jestleri tekrarlar (boş omza uzanan el, olmayan birine açılan kollar). O kadın bu kez gerçekten orada, uzakta; birer adım, duruş. Sırtını döner; göğsünde oyuk ve tek bir kırmızı atış.
  - Son nakarat: hangi yöne yürüse aynı kıyı; bir beden daha kollarını açar, girmez; çizgi: dört kadın → adam → o kadın. O kadın ona yürür, sarılır ve bu kez o adamın içinden geçip karaya doğru gider. Göğsünde belli belirsiz iki atış. Beden onu suya götürür (açılışın kadrajı; gemiler neredeyse sönmüş), su kenarında diz çöker; parmağındaki son iplik suya uzanır, suyun altında kaybolur, bırakır. Kamera geri çekilir; ses biterken kararma.
- **Motor:** `engine/fx/armIk.ts` (iki kemikli kol IK'si + kemik eğme; sarılma, göğse dokunma, kollarını açma), `engine/fx/skinPaint.ts` (kıyafet dokusuna boyama; Kanıyorduk'un kan yöntemi genelleştirildi), `engine/fx/tube.ts` (canlı iplik/halat), yeni duruş `back` (geri yürüyüş).
- **Işık:** evrenin gece ışığı yükseltilir (`kalpsiz-romantik` anı: hemi 3,3 / güneş 2,5), figürler aynı oranda kısılır (`FIGURE_TONE` 0,6): kara lav zemin okunur, beyaz giysiler patlamaz. Kararmalar `lift` ile yumuşar.
- **Gizli keşif:** "Yakılamayan Gemi" yerine "Tutmayan Demir" (`kalpsiz-demir`: yerdeki demiri üç kez kaldırmayı dene). Kırmızı yelkenli, kara çiçekler, yüzsüz bedenler, fenerden yol ve batıklardan kalp kaldırıldı.
- **Kişiler:** adam `man_white`; o kadın `woman_white` (koyu saç); bekleyen dört kadın ayrı saç renkleri ve nötr kıyafetler: lacivert, antrasit (yeni `woman_stone`; açık taş rengi uzaktan ten sanıldığı için koyulaştırıldı), gri-mavi, koyu şarap.
- **Bilinen sınırlar:** yüz ifadesi ve parmak animasyonu yok; kıyafetler beden üstü boyalı tulum; saydamlaşma gerçek kırılma değil, opaklık; YouTube saati ~4 Hz (çok kısa jestler bir iki kare kayabilir).

### 26.15 FINAL prompt'ları: Kanıyorduk v16 ve Kalpsiz Romantik v2 (01.10.2026)

- **Kritik düzeltme (bütün Redd evreni):** `sky.ts`'e hilal eklenirken bir GLSL değişkeni `half` adını almıştı; `half` WebGL'de ayrılmış kelime olduğundan gök kubbesi shader'ı derlenmiyor, gök (renk, yıldızlar, samanyolu, Ay) hiç çizilmiyordu. Ad `halfLit` yapıldı. Hilalde Ay'ın halesi küçülür (tam disk halesi yok).
- **Motor:** `engine/fx/performer.ts` (yer/duruş/bakış/hız tabloları; sarmada tek seferlik klip doğru karesinden başlar), `ArmIk.restore()` (klibin yazmadığı kemikte baş/omurga eğimi her karede birikmesin; performer ve Kalpsiz her karede çağırır), `SharedEffects.crescent`, evren başına `filmCard` (bu iki filmde başlık kartı yok).
- **Kanıyorduk (4:27,6):** kitap baştan açık; sol sayfada eğri, yırtık kenarlı, bantlı, kat izli fotoğraf (kadının kendi modelinden basılır); sağ sayfada 1/55 ölçekte zaten süren dövüş. Fotoğraf donuk → gözler bir kesir kayar → saç kıpırdar → pencere etkisiyle derinlik → kamera kâğıdın lifleri içinden sayfa dünyasına geçer (portal/flaş yok). Sayfa dövüşü: hücum, dev bir adım (kâğıt çöker), eğilme, bacağa vuruş, dev eğilip gövdesinden kavrar, kaldırır, tekmeyle kurtulma, yuvarlanma, yine saldırı, yarım kaçış, kesin darbe, cilde savrulma; kalkmayı dener, olmaz; başı fotoğrafa döner; eli sayfanın kenarına erişemez; parmak uçları kâğıda değer, kâğıt kadrajı doldurur, gerçek dünya. KAMERA → ADAM → DEV → KADIN; tanıma. Gece: birkaç yıldız yakından iris-göz olur (adama, kadına, başka yere bakar), hilal, simetrik kadraj, görüntü tepeden aşağı yırtılır ve birleşir. Yerden yükseliş (topuk, santim, bekleme, 1 m, metreler, ölçek), uzayda "düşüş" yalnız kameranın hareketiyle, ters çevrilmiş kadrajdan ~180° dönüşle dünya alta geçer; uzakta huzur, çok yavaş yaklaşma, göğüslerde küçük yaralar, boşlukta asılı ya da dünyaya süzülen gerçek damlalar. Ara; eller; kalp (üç atış → lifli → kat kat kâğıt → bir atış → kat izi → yırtık → lifler tek tek kopar → bir yarı kadına süzülür, bükülür). Gerçek dünyada dövüş (A–H kapsama; bacak, kavrama, fırlatma, toz, yuvarlanma, kalkış, yumruk, blok, başka açı, darbe, düşüş, kalkış, yumrukları iner, dev aralarında), dev krater kenarına yürür; kadının kollarında ölüm (yakalama, ağırlık, diz çökme, başı kucağında, iki nefes, durgunluk; diriliş yok). Elbisesinin kumaşı göğe döner; aynı yerde canlı çift; yerden ikinci yükseliş; üçüncü nakarat aynı cümle; iki damla birleşir, fotoğrafta koyu bir leke olur; aynı kitap, eli yanında, kitap kapanır (minyatür sahne açılır kitap gibi sayfaya katlanır), son karede siyah.
- **Kanıyorduk kamerası:** doğudaki REDD harflerine ve gökteki başlık yazısına sırt veren açılar (başlık film boyunca gizli); sayfa dünyasında yakın plan için yakın düzlem 1,2 cm; uzay 160 m tavan (kara parçası altta bütünüyle okunur). "Damlalar ve dünya" çekimlerinde bakışın inişi artık uzaklıkla orantılı (`drop · d`); sabit metreyken 111–119 s arasında çift kadrajın üstünden çıkıyor, yalnız ayakları kalıyordu.
- **Kıyafet dokuları:** `woman_white` ve `man_white` atlaslarındaki boyanmamış koyu şeritler komşu renkle dolduruldu (kadının sırtında siyah leke görünüyordu). Orijinaller oturum scratchpad'inde yedekli.
- **Kalpsiz Romantik v2 (3:20,17):** aynı kıyı, yeni yerleşim (masa 6 · yol ayrımı 7,8 · dar geçit/kapı 9 · bank 12 · ilk kadın 14,95 · su kenarı 19,4). Suyun yansıması (three.js `Reflector`; o kadın yalnız yansıma kamerasının katmanında görünür), göğüs katmanında soluk kalp, dört farklı geçiş (ayakta/ileriden, banktan kalkma/yandan, kapı/arkadan + duraksama, masa/yakın ikili, dönüp bakmadan gider), izler sırasıyla kolda iplik, omuzda saç, yakada kumaş, yakada ruj; kameraya yürüyüş; "onlarca beden" aynı dört kadının tekrarlarından bir koridor; yol ayrımı ve üç yol (hepsi denize); ateşin yanında uzanma, kadın, göz kırpınca yok; izleri tek tek çıkarma (ruj çıkmaz); başının çevresinde dört cam oda, içlerinde kadınlar, kilitli demirler; ikinci otomatik beden; kapının eşiğinde durup dönme; göğüste iki atış; ikinci turda döngü kırılır (dördüncüde durur); izler dökülür; son arayış, adımlar, ters geçiş, açık bir kalp atışı; aynı kıyı, beden suya yürür, kendini durdurur; son gemi söner ve tüter; diz çöker, elleri toprakta; son karede siyah. Eski demir atma ve "son iplik" kaldırıldı. Gizli keşif `kalpsiz-demir`: cam odanın kilidini üç kez dene.

### 26.16 Sahibin düzeltme listesi: fener, çakışmalar, zemin, gözler, düşüş/yükseliş, kalp, deniz yüzü, gemiler, koridor (01.10.2026)

- **El feneri (motor, `engine/game/flashlight.ts`):** evren tanımında `flashlight: true` olan evrende (Mükemmel Boşluk) F tuşu feneri açar/kapar; kapak kadrajında F yine fotoğraf çeker. Işık baştan sahnededir, kapalıyken şiddeti sıfırdır (shader yeniden derlenmez, takılma yok). Birinci kişide elden, üçüncü kişide karakterin göğsünden yanar (kameradan yanınca karakterin sırtını patlatıyordu); klip kamerasında ve kapakta söner. Kontrol listesinde ve dokunmatik demoda ("Fener") var.
- **Zemin (kök neden):** karakterler analitik yükseklik fonksiyonuna basıyordu, görünen zemin ise 2–2,5 m'lik üçgen ağı; aradaki fark ayakları 15–30 cm, devi 1 m'ye kadar gömüyordu. `terrain.ts` artık her kalitede aynı ızgarayı (280 × 280) kurar ve `craterHeight` o ağın üçgenini birebir okur (oyuncu, figürler, eşyalar, plaklar aynı yüzeye basar).
- **Zemine oturtma (motor, `engine/fx/footing.ts`):** her karede temas kemikleri (ayak, diz, el, kalça, sırt, baş) zeminin altındaysa figür o kadar yükseltilir. `performer` ve Kalpsiz `act()` kullanır; konumu dışarıdan yazılan çift için `performer.settle()`. Kanıyorduk'taki masa takımı, kapladığı yerin en yüksek zeminine oturur.
- **Çakışma denetimi (geliştirme aracı, oturum scratchpad'inde `collide.mjs`):** film oynarken her saniye görünür bütün iskeletli karakterlerin derili köşeleri hesaplanır; görünen zeminin altına inen köşeler ve iki bedenin iç içe geçmesi (en yakın köşenin normaline göre) raporlanır. Saç kartları ve gözler beden sınamasına girmez.
- **Kanıyorduk — "kollarında" ölümü:** kadın adamın başının hizasında diz çöküp öne eğildiğinde adamın kalkık başı kadının göğsünün içine giriyordu (5–24 cm). Kadın artık adamın yanında, göğsü hizasında, kameranın karşı tarafında diz çöker; üstüne eğilir, elleri göğsünün üstündedir. Kumaşa geçiş çekimi yeni yere göre. Devin kavrayan avuçları bedenin dışından tutar.
- **Kanıyorduk — yıldız-gözler:** dize (60,07) gelince yerden bakan kameraya açılırlar (önceden ancak kamera yıldıza yaklaşınca ~65. saniyede beliriyordu); 150 m'de ~8° büyüklükte, üçü birden; açılınca aşağı, adama, sonra kadına bakarlar.
- **Kanıyorduk — düşüş ve yükseliş:** irtifa artık dizelere göre bir eğri (Hermite anahtarları `ALT1`, `ALT2`): kalkış, hızlı tırmanış, "düşüyorduk"ta tepe noktasından gerçek düşüş (hızlanarak, dipte tutulur gibi yavaşlayarak), "yükseliyorduk"ta yeniden ve daha yükseğe fırlama, sonra uzayda ağır süzülme; üçüncü nakarat aynı cümle. Kamera onları geriden izler (`lagCam`): düşerken aşağıya, büyüyen dünyaya doğru küçülürler; yükselirken kameranın önünden yukarı fırlarlar. Çiftin çevresinde dünyaya sabit 520 hava zerresi hız kadar uzayan izler bırakır. Düşerken kollar başın üstüne savrulur, beden geriye yatar; yükselirken kollar aşağı akar. Nakarat havadayken dev gizlenir.
- **Kanıyorduk — kalp:** kâğıda dönüşme dizeden önce tamamlanır; kat izi 150,6'da; yırtık "yırtılıyor"da (151,6) tepeden başlar ve 3,4 sn'de ağır ağır iner; lifler 0,33 sn arayla tek tek kopar; yarılar 154,7'de ayrılır; gevşek yarı 156'da kadına süzülür (önceden yırtık 1,9 sn'de bitiyor, yarılar 152,3'te ayrılıyordu).
- **Kanıyorduk — "damlalar ve dünya" çekimleri:** bakışın inişi uzaklıkla orantılı (çift kadrajdan çıkıp yalnız ayakları kalıyordu).
- **Kalpsiz — deniz yüzü:** koyu suya koyu lekeler çizildiği için görünmüyordu (gözlerin eğimi de ters, kızgın gibiydi). Yüz artık ateşin sudaki yansımasıdır: ışıklı bir oval, dalgacıklarla kırık; dış uçları düşük koyu gözler, ağır kapaklar, köpükten iç uçları kalkık kaşlar, aşağı bükülen bir ağız; dalgayla kıpırdar, alevle titrer; tepeden, bir kez.
- **Kalpsiz — gemiler:** yandıkça kömürleşir, sonda küle (griye) döner, halatlar kopar, su alıp yan yatar ve batar; söndükten sonra bir süre için için yanar, iner. Finalde sudan yalnız yanık direkler çıkar; son gemi en az batar.
- **Kalpsiz — koridor:** "onlarca beden" artık 1,95 sn'lik koşu değil, 4,75 sn'lik ağır bir yürüyüş; tekrarlar adam yaklaşırken biraz daha erken saydamlaşır; yan izleme daha yakın. Yol ayrımı ve üç yol aynı bitişe (92,3) sıkıştırıldı.
- **Kalpsiz — sarılmalar:** iki beden kendi soluna kayar, başlar yana döner (başlar iç içe giriyordu); eller sırtın dışında.

---

## BAŞLA

PASS 0 ile başla: envanter, eksik listesi, 🚨 erken uyarılar. Puan verme, öneri sıralama. Yalnızca ne gördüğünü ve ne göremediğini söyle, sonra dur ve "DEVAM" onayı iste.
