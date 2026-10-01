# Senkron şarkı sözleri (isteğe bağlı)

Bu klasöre `<parça-kimliği>.lrc` dosyası koyarsan, o parça çalarken sözler şarkının saniyesine göre
evrenin sol altında satır satır görünür. Hikâye satırı da sözlerin üstüne kayar. Dosya yoksa yalnızca
hikâye satırları görünür. Parça kimlikleri `worlds/<evren>/album.ts` içindeki `tracks[].id` değerleridir
(ör. `kaniyorduk.lrc`, `klostrofobik-kaplumbaga.lrc`).

Biçim, standart LRC:

```
[00:13.73] ilk satır
[00:20.10] ikinci satır
```

**Önemli:** Şarkı sözleri telif hakkıyla korunur. Proje hiçbir söz metni içermez. Sözleri yayımlamak için
yayıncıdan ya da lisanslı bir söz sağlayıcısından (ör. Musixmatch, LyricFind) görüntüleme izni alınmalıdır.
