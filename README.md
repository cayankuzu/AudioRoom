# AudioRoom

Albüm kapaklarını tarayıcıda gezilebilir 3D evrenlere çeviren bir deneyim kütüphanesi.
Her evren bir kapağın içidir: plakları bulursun, gramofona takarsın, şarkı çaldıkça evren değişir.
Şarkılar resmi YouTube kaynaklarından (gömülü oynatıcı) çalar; ses dosyası barındırılmaz.

**TypeScript · Vite · three.js** (3D yazılar: ekstrüde typeface, `npm run fonts`)

| Evren | Sanatçı | Mekanik | Cihaz |
| --- | --- | --- | --- |
| Mükemmel Boşluk | Redd | **Hafifleme** — her plakla yerçekimi azalır, finalde figüre yükselirsin | Masaüstü + tablette demo (4 parça) · telefonda yalnız Sürüm 1 |
| Beni Büyüten Şarkılar Vol.1 | Hayko Cepkin | **Dokuz Ay** — anı kabarcıklarını patlat, bebek büyür, kalp hızlanır | Masaüstü |
| Kuantum Dolanıklık | Henry the Lee | **Dolanıklık** — plak odanın karşı noktasında seni yansıtır | Masaüstü |
| Klostrofobik Kaplumbağa | Henry the Lee | **Yavaş Olanın Masalı** — plağı kapan tavşanı havuçla yakala, kabuğuna çekil, tavşan deliklerinden tünellerde sürün | Masaüstü |

Plaklar sırasız bulunur ve istenen sırayla takılır; ilerleme tarayıcıda (`localStorage`) saklanır.

**Şarkı hikâyeleri:** Her şarkı, sözlerin senkron zaman damgalarına bağlı perdelerle ilerler (toplam 259 perde).
Şarkının saniyesi ilerledikçe sahne değişir. Sol altta "Hikâye" etiketli kısa bir satır o an olanı anlatır; bu satır şarkı sözü değildir.
Kodda şarkı sözü yoktur; yalnızca zamanlar ve özgün satırlar bulunur. Lisanslı senkron söz dosyaları `public/lyrics/<parça>.lrc` olarak eklenirse sözler sol altta satır satır görünür (bkz. `public/lyrics/README.md`).
**Kapak sadakati:** Her evrenin Kapak Noktası, kapaktan ölçülerek kurulan kadrajdır:
- Redd: dev figür, enso'lu başlık, yamaçta REDD.
- Hayko: profilden, arkadan aydınlanan bebek ve kapak yazıları.
- Kuantum: kapaktan ölçülmüş yüz ve ilmikli halat.
- Klostro: figür, süzülen iki kapsül ve sırtı dönük tavşan.
**Klipler:** Her şarkının bir 3D klibi vardır (23 şarkı). Şarkı yokken evren kapağın birebir hâlidir; şarkı başlayınca o şarkının sahnesi açılır ve sinema kamerası klibi çekim çekim anlatır (vinç, yörünge, alçak açı, yakın plan, uzun uçuş yolları; kesmeler sözlerin anlarına bağlı). Kamera bütün evreni dolaşır: Redd klipleri uzak sırttan açılır, kraterin kenarını, dibini ve merkezini gezip sırta döner; Hayko'da göbek bağı boyunca iniş ve zarın tepesi, Kuantum'da tavan köşeleri ve çatlak, Klostro'da kâğıdın kenarı ve tavşanın odası kadrajdadır. Her şarkının set parçaları kraterin her yerine yayılır (iskele ve kıyı ateşleri, yıldız ırmağı, kordon, mezarlık, adak mumu tarlası, neon pist, takip çanakları, uzak hayaletler). Klip kendi kendine de ilerler: gemiler gece tutuşur, mumlar her itirafta yanar.
- Yürüyünce ya da E ile serbest kalınır; **V** klibe geri döndürür.
- **K** ya da müzik kartındaki "Klibi kapat" klibi kapatır: müzik sürer, evren kapaktaki hâline döner. Ayarlarda "Şarkı klipleri" ve "Şarkı başlayınca sinema kamerası" seçenekleri vardır.
- Kuantum ve Klostro klipleri kapağın kadrajıyla açılır ve kapanır; Hayko'da bebeğin silueti önde, zardaki gölge oyunu arkadadır.

**Karakter:** Evrende bizim karakterimiz (yirmili yaşlarında, beyaz gömlekli, doğal açık tenli bir adam; CC0 Quaternius modeli) üçüncü kişi görünümde kameranın önünde yürür, plağı elinde taşır; **T** birinci ve üçüncü kişi arasında geçer (Ayarlar menüsünde de bulunur). Kliplerde aynı karakter filmin ana kişisidir; kadın karakter uzun koyu kahve saçlı, beyaz elbiselidir. Ayarlar menüsündeki "Ayarları sıfırla" bütün ayarları varsayılana döndürür (evren ilerlemesine dokunmaz).

**Klip dili:** Çekimlerin kendi renk paleti (gece, anı, ateş, noir, neon…), lensi (böcek gözü, eski film, mikroskop, eski TV) ve geçişi (kararma, beyaz, renkli flaş, parazit) vardır. Her klip dizelere kurgulanmıştır ve gizli mesajlar taşır: Kafakafka'nın aynasında durduğun yerde bir hamamböceği, Senden Vazgeçeli'de mors alfabesiyle yanıp sönen pencere, Tam Bi Delilik'te müze etiketi, Sextronot'ta "MT · 1969" yazılı kapsül… Ayrıntılar: `docs/AUDIOROOM_DENETIM_PROMPTU.md` §19.

**Sürümler:** "Evrene gir" sürüm seçiciyi açar. Sürüm 2 güncel evrendir; Sürüm 1, evrenlerin şarkılara özelleşmeden önceki ilk hâlidir (`depo/`) ve silinmeden oynanabilir. Her sürüm üç önizlemeyle gösterilir. Sürüm 1'de tarayıcı fare kilidini vermezse (gömülü tarayıcı paneli, Esc'den hemen sonra tıklama) oyun yine başlar: bakış sol tuş basılıyken sürüklenerek döner, canvas'a tıklayınca gerçek kilit yeniden denenir.

**Telefon:** Telefonda (dar dokunmatik ekran, kısa kenarı 600 px altı) yalnızca Mükemmel Boşluk'un Sürüm 1'i açılır. Sürüm 2 evrenleri ve öbür eski evrenler, adres doğrudan yazılsa bile bir kapı gösterir ve oraya yönlendirir. Bilgisayar ve tablet (geniş ekran) erişimi sürer; klavyesiz tablette Mükemmel Boşluk Sürüm 2 dokunmatik demoyla açılır.

**Plak kitaplığı:** Gramofonun yanında bir kitaplık durur. Bir kez çaldığın plak evren sıfırlanana kadar orada, kendi yuvasında kalır; raftan istediğini alıp gramofona takarsın. Bırakılan ya da gramofondan inen plak rafına döner.

**Karanlık sahneler:** Klipte görüntünün parlaklığı ölçülür; kare fazla karanlıksa gölgeler yumuşakça açılır (göz uyumu). Gece göğünde samanyolu ve bulutsular vardır.

**Hazır 3D modeller:** Mükemmel Boşluk'taki taranmış ay kayaları, Hollanda gemileri, ev eşyaları, koltuk, yatak, bidon ve bank Poly Haven'dan (CC0) alınıp sadeleştirildi; künye `public/models/props/CREDITS.txt`. Bir model yüklenemezse sahne elle modellenmiş hâline düşer.

**Taşınabilir gramofon:** **G** gramofonu sehpasından kucağa alır; müzik seninle gelir. Kucaktayken dokunulan plak doğrudan tablaya konur. G ile istenen yere konur (sehpaya yakınsa yerine oturur). Kuantum'un karşı noktası ve tasması, Klostro'nun tavşanı gramofonun yeni yerini izler.

**Katı nesneler:** Evrendeki ve şarkı sahnelerindeki nesnelerin içinden geçilmez. `colliders.solid(nesne)` nesnenin ayak izini sınır kutusundan çıkarır, her karede taşır; gizliyken ya da baş hizasının üstündeyken engellemez. Kalabalıklar (kıyıdakiler, askerler, mankenler) da katıdır; hayaletlerin içinden geçilir.

**Sınav kürsüsü ve klip nesneleri:** Evrenlerde kapak, plak kitaplığı, gramofon, Kapak Noktası ve klip nesneleri dışında yalnızca bir **sınav kürsüsü** vardır (okul sırası; E ile 10 soruluk şıklı sınav — sorular sahibin lisanslı `.lrc` dosyalarından söz tamamlama, yoksa evren bilgisi; 8/10 sırrı açar; yeri her girişte değişir). Gizli geçitler, kaşif sırları ve dünyaya dağılmış easter egg nesneleri kaldırıldı; sırlar artık yalnızca kliplerin içindeki nesnelerde yaşar (ör. Kalpsiz Romantik'in şişesi, Kuantum'un kadehi ve gamzesi). Oyuncu figürleri CC0 bir insansı rigi giyer (`public/models/characters/`, 46 animasyon); Redd'de klip çalarken kraterde hamam böceği sürüsü dolaşır.
"Evreni sıfırla" (oyun menüsü ya da albüm sayfası) plakları, finali ve keşifleri siler.

## Kurulum

Node 20+ gerekir.

```bash
npm install
npm run dev
```

Geliştirme sunucusu `http://localhost:5173/` adresinde açılır (aynı ağdaki telefondan LAN adresiyle erişilebilir).

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Vite geliştirme sunucusu |
| `npm run build` | `dist/` içine üretim derlemesi (hub + her evren ayrı sayfa) |
| `npm run preview` | Derlemeyi yerelde sunar |
| `npm run check` | TypeScript tip denetimi |
| `npm test` | Birim testleri (Vitest) |
| `npm run test:e2e` | Uçtan uca testler (Playwright, masaüstü + telefon) |
| `npm run models` | `assets-src/models` → `public/models` sıkıştırma hattı |
| `npm run fonts` | `assets-src/fonts` TTF → 3D yazı verisi (`public/fonts/*.typeface.json`) |

Playwright kendi Chromium'unu bulamazsa yolunu verin:
`PLAYWRIGHT_CHROMIUM_PATH=/yol/chrome npm run test:e2e`.

## Mimari

```
index.html, src/          Hub: kütüphane, albüm sayfaları, hash yönlendirme (#/album/<id>)
engine/                   Tüm evrenlerin paylaştığı motor
  boot.ts                 Evreni ayağa kaldırır: menü, oyuncu, plaklar, gramofon, müzik, final
  world.ts, album.ts      Evren sözleşmesi (WorldDefinition) ve saf albüm verisi (AlbumData)
  core/                   runtime (render + kalite), input, player, colliders, assets, storage…
  game/                   plak, gramofon (taşınabilir), etkileşim, Kapak Noktası, şarkı sahneleri (songStage),
                          zaman çizelgesi (timeline), klip yönetmeni (director), gizli keşifler (secrets)
  audio/                  YouTube müzik kontrolü, prosedürel efekt ve ortam sesleri
  fx/, ui/, styles/       Parçacıklar, arayüz bileşenleri, CSS token'ları
worlds/<id>/              Her evren kendi klasöründe
  album.ts                Parçalar, videoId'ler, hub metinleri (hub da bunu okur)
  world.ts                Sahneyi kurar ve mekaniği tanımlar
  songs/, memories.ts…    Şarkıya özel sahne ve etkileşimler (ör. Redd'de her parçanın kendi set parçası)
  story.ts                Şarkının zaman çizelgesi (Beat[]: saniye, kimlik, yorum satırı)
  explorers.ts            Haritanın uzak köşelerindeki kaşif sırları
  index.html, main.ts     Sayfa girişi (Vite otomatik bulur)
public/                   Kapaklar, sıkıştırılmış modeller, alt kümelenmiş fontlar, 404
tests/unit, tests/e2e     Vitest ve Playwright testleri
docs/                     Denetim promptu ve yol haritası
```

**Render hattı:** `RenderPass → (Bloom) → OutputPass → GradePass` (pozlama, kontrast, doygunluk, vinyet, gren).
Kalite kademeleri `low / medium / high / auto`. Otomatikte FPS düşerse önce çözünürlük, o da yetmezse kademe düşer.

**Müzik:** YouTube IFrame API (`youtube-nocookie`). YouTube kuralları gereği oynatıcı parça yüklüyken en az 200×200 görünür kalır.
Kartta her zaman "YouTube'da aç" bağlantısı bulunur. Tarayıcı otomatik sesi engellerse ▶ veya R ile başlatılır.

**Mobil:** Dokunmatik cihazlarda yalnızca Mükemmel Boşluk açılır. Sade grafikle, 1.5× çözünürlükle ve 4 parçalık bir demo olarak çalışır.
Redmi Note 9 Pro'da demo sahneleri 58–60 fps ölçüldü; yavaş cihazda dinamik çözünürlük kendiliğinden düşer. Diğer evrenler masaüstü uyarısı gösterir.

**Testler:** E2E testleri geliştirme sunucusundaki `window.__audioroom` kancasıyla oyunu sürer.
YouTube `fakeYouTube` ile taklit edilir ve `seek` ile şarkının saniyesi ayarlanır. Böylece hikâye çizelgeleri, keşifler ve sıfırlama ağ olmadan sınanır.

## Yeni bir evren eklemek

1. `worlds/<id>/` klasörünü açın. Başlamak için en sade örnek `worlds/kuantum-dolaniklik/`.
2. `album.ts`: `AlbumData` doldurun (meta, parçalar + YouTube `videoId`, `device`, hub metinleri).
3. `world.ts`: `WorldDefinition` döndürün. `build(ctx)` sahneyi kurar ve `WorldLogic` döndürür
   (`update`, `onTrack`, `onFound`, `onFinale`, isteğe bağlı `prompt`, `use` ve `coverPoint`).
   Şarkının saniyesi için `ctx.songTime()` ve `createTimeline(beats)` kullanılır. Gizli keşifler `ctx.secrets.reveal(id)` ile açılır; kimlikler `album.ts`'teki `secrets` listesinden gelir.
4. `index.html` + `main.ts`: mevcut bir evrenden kopyalayıp başlık ve og etiketlerini değiştirin.
5. `src/hub/albums.ts` içinde `ALBUM`'u içe aktarıp listeye ekleyin.
6. Kapağı `public/covers/`, modelleri `assets-src/models/` altına koyup `scripts/build-models.mjs` listesine ekleyin ve `npm run models` çalıştırın.
7. Yeni 3D metin fontu gerekiyorsa Türkçe glifleri koruyarak alt kümeleyin (`public/fonts/FONTS.md`).

## Dağıtım

`.github/workflows/ci.yml` her PR'da ve `main` dalında tip denetimi, birim, E2E ve derlemeyi çalıştırır.
`main` dalında `dist/` GitHub Pages'a yayınlanır. `base: "./"` olduğu için derleme herhangi bir alt dizinden de sunulabilir.

## Lisanslar

Fontlar SIL Open Font License altındadır (`public/fonts/FONTS.md`).
Kapaklar ve şarkılar sahiplerine aittir; şarkılar yalnızca resmi YouTube gömmeleriyle çalınır.
