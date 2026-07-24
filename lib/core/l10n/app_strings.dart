/// Localization-ready user-facing strings (Turkish).
abstract final class AppStrings {
  static const appName = 'NEFES';
  static const appSubtitle = 'Alışkanlıklarını anla.';

  static const today = 'Bugün';
  static const iSmoked = 'Sigara İçtim';
  static const logNowSubtitle = 'Hemen kaydet';
  static const sinceLastCigarette = 'Son sigaradan beri';
  static const noCigaretteYet =
      'Henüz kayıt yok. İlk sigaranı işaretlediğinde süre burada başlar.';
  static const heroSupportLine = 'Nefesinle güçleniyorsun.';
  static const dailyTarget = 'Günlük sınır';
  static const dailyLimit = 'Günlük sınır';
  static const usedLabel = 'kullanıldı';
  static const remaining = 'Kalan';
  static const todayCigarettes = 'Bugünkü kayıtlar';
  static const viewAll = 'Tümünü Gör';
  static const metricTodayLabel = 'Bugün';
  static const emptyTodayHistory = 'Bugün henüz kayıt yok.';
  static const undoLast = 'Son kaydı geri al';
  static const undoConfirmTitle = 'Son kayıt geri alınsın mı?';
  static const undoConfirmBody =
      'Kazara eklediysen geri alabilirsin. Kayıt geçmişten silinmez; aktif sayaçlardan çıkarılır.';
  static const undoConfirmAction = 'Geri al';
  static const cancel = 'Vazgeç';
  static const smokedSaved = 'Kaydedildi';
  static const undoDone = 'Son kayıt geri alındı';
  static const smokeSaveFailed = 'Kaydedilemedi. Tekrar dene.';
  static const undoFailed = 'Geri alma başarısız. Tekrar dene.';
  static const loading = 'Yükleniyor…';
  static const targetExceeded = 'Bugünkü sınır aşıldı';
  static const limitExceeded = 'Bugünkü sınır aşıldı';
  static const editTarget = 'Sınırı düzenle';
  static const editLimit = 'Sınırı düzenle';
  static const save = 'Kaydet';
  static const delayHint = 'İsteği biraz ertele';
  static const cigarettesUnit = 'sigara';
  static const snapshotAverage = 'Ort. aralık';
  static const snapshotLongest = 'En uzun aralık';

  // Onboarding
  static const onboardingTitle = 'Sınırını belirle';
  static const onboardingAverageLabel = 'Günde ortalama kaç sigara içiyorsun?';
  static const onboardingTargetLabel = 'İlk günlük sınırın kaç olsun?';
  static const onboardingHint =
      'Sınır bir referanstır; her zaman kayıt ekleyebilirsin.';
  static const onboardingContinue = 'Başla';
  static const invalidNumber = 'Geçerli bir sayı gir';

  // M3 — triggers
  static const triggerQuestion = 'Bu sigarayı neden içtin?';
  static const triggerSkip = 'Geç';
  static const triggerHabit = 'Alışkanlık';
  static const triggerCraving = 'Gerçek istek';
  static const triggerStress = 'Stres';
  static const triggerCoffeeTea = 'Kahve / çay';
  static const triggerAfterMeal = 'Yemek sonrası';
  static const triggerSocial = 'Sosyal';
  static const triggerOther = 'Diğer';

  // M3 — delay / resist
  static const delayNow = 'Şimdi içmeyeceğim';
  static const delaying = 'Direniyorsun';
  static const delayCoachTitle = 'Direnç koçu';
  static const urgePassed = 'İstek geçti';
  static const cancelDelay = 'İptal';
  static const delayStartFailed = 'Başlatılamadı. Tekrar dene.';
  static const delayCompleteDone = 'Kaydedildi';
  static const delayCancelled = 'İptal edildi';

  static String remainingCount(int value) => '$value kaldı';
  static String todayProgress(int count, int target) => '$count / $target';
  static String limitShort(int limit) => 'Sınır $limit';
  static String sequenceLabel(int n) => '#$n';
  static String afterPrevious(String interval) => '$interval sonra';
  static String delayedMinutes(int minutes) => '$minutes dakika erteledin.';
  static String todayDelayCount(int count) => 'Bugün $count kez erteledin.';
  static String todayDelayTotalMinutes(int minutes) =>
      'Bugün toplam $minutes dakika erteledin.';
  static String smokeCountShort(int count) => '$count sigara';

  // Navigation
  static const navToday = 'Bugün';
  static const navHistory = 'Geçmiş';
  static const navInsights = 'İçgörüler';
  static const navSettings = 'Ayarlar';

  // History
  static const historyTitle = 'Geçmiş';
  static const historyList = 'Liste';
  static const historyCalendar = 'Takvim';
  static const emptyHistory = 'Henüz kayıt yok.';
  static const emptyHistoryHint =
      'Kayıtların burada gün gün görünecek.';
  static const averageIntervalLabel = 'Ort. aralık';
  static const longestIntervalLabel = 'En uzun';
  static const smokeCountLabel = 'Sigara';
  static const dayDetailTitle = 'Gün detayı';
  static const delayCountLabel = 'Erteleme';
  static const noSmokesThisDay = 'Bu gün için kayıt yok.';
  static const targetForDayLabel = 'Sınır';
  static const timelineTitle = 'Zaman çizelgesi';
  static const delayNotesTitle = 'Erteleme kayıtları';
  static const delayOutcomeSmoked = 'Sigara içildi';
  static const delayOutcomeCompleted = 'İstek geçti';
  static const delayOutcomeCancelled = 'İptal edildi';
  static const previousMonth = 'Önceki ay';
  static const nextMonth = 'Sonraki ay';
  static const smokeEventTitle = 'Sigara';

  // Insights
  static const insightsTitle = 'İçgörüler';
  static const period7Days = '7 Gün';
  static const period30Days = '30 Gün';
  static const periodThisMonth = 'Bu Ay';
  static const insightsEmpty = 'Henüz bir örüntü oluşmadı.';
  static const insightsEmptyHint =
      'İçgörüler, birkaç günlük kayıt sonrasında burada görünmeye başlayacak.';
  static const totalSmokesLabel = 'Toplam';
  static const dailyAverageLabel = 'Günlük ort.';
  static const delayAttemptsLabel = 'Erteleme';
  static const insightsListTitle = 'Gözlemler';
  static const dailyChartTitle = 'Günlük dağılım';

  // Settings
  static const settingsTitle = 'Ayarlar';
  static const habitSectionTitle = 'Alışkanlık';
  static const currentHabitLabel = 'Aktif alışkanlık';
  static const currentHabitValue = 'Sigara';
  static const dataSectionTitle = 'Veriler';
  static const editDailyTargetTitle = 'Günlük sınırı düzenle';
  static const averagePerDayLabel = 'Günlük ortalama';
  static const packPriceTitle = 'Paket fiyatı';
  static const packPriceSubtitle = 'Tasarruf hesabı için';
  static const packPriceDialogTitle = 'Sigara fiyatı';
  static const packPriceLabel = 'Paket fiyatı (₺)';
  static const cigarettePriceLabel = 'Tek sigara fiyatı (₺)';
  static const cigarettesPerPackLabel = 'Paketteki sigara';
  static const priceNotSet = 'Belirlenmedi';
  static String pricePerCigaretteLabel(String amount) =>
      'Sigara başı $amount';
  static const backupSectionTitle = 'Yedekleme';
  static const exportData = 'Verileri dışa aktar';
  static const exportDataDesc = 'Tüm kayıtlarını JSON olarak indir.';
  static const importData = 'Verileri içe aktar';
  static const importDataDesc = 'Bir yedek dosyasından geri yükle.';
  static const importConfirmTitle = 'Tüm veriler değiştirilsin mi?';
  static const importConfirmBody =
      'İçe aktarma, mevcut tüm kayıtların yerine yedekteki verileri koyar. Bu işlem geri alınamaz.';
  static const importConfirmAction = 'İçe aktar';
  static const importSuccess = 'Veriler içe aktarıldı.';
  static const importFailed = 'İçe aktarma başarısız. Dosyayı kontrol et.';
  static const exportSuccess = 'Dışa aktarma tamamlandı.';
  static const exportFailed = 'Dışa aktarma başarısız.';
  static const comingSoonHabitsTitle = 'Diğer alışkanlıklar';
  static const comingSoonHabits = 'Yeni alışkanlık türleri yakında';
  static const appInfoTitle = 'Uygulama';
  static const appAbout = 'NEFES hakkında';
  static const appVersionLabel = 'Sürüm';
  static const updateAvailable = 'Güncelleme mevcut';
  static const updateNow = 'Şimdi güncelle';

  // Capture-first / optional context
  static const whyOptional = 'Neden?';
  static const moreTriggers = 'Diğer';
  static const smokedEarlier = 'Daha önce içtim';
  static const pickEarlierTitle = 'Ne zaman içtin?';
  static const minutesAgo5 = '5 dk önce';
  static const minutesAgo10 = '10 dk önce';
  static const minutesAgo15 = '15 dk önce';
  static const minutesAgo30 = '30 dk önce';
  static const customTime = 'Saat seç';
  static const invalidPastTime = 'Gelecek bir zaman seçilemez.';

  // Delay durations
  static const pickDelayTitle = 'Ne kadar erteleyeceksin?';
  static const delayMinutes5 = '5 dakika';
  static const delayMinutes10 = '10 dakika';
  static const delayMinutes15 = '15 dakika';
  static const delayMinutes30 = '30 dakika';
  static const delayNoDuration = 'Süre seçmeden başla';
  static const delayTimeUp = 'Süre doldu';
  static const delayOutcomeSmoke = 'Sigara içtim';
  static String delayIntended(int minutes) => '$minutes dk hedef';

  // Event correction
  static const editEvent = 'Düzenle';
  static const editEventTime = 'Saati düzelt';
  static const editEventTrigger = 'Neden ekle / değiştir';
  static const clearTrigger = 'Nedeni kaldır';
  static const deleteEvent = 'Kaydı sil';
  static const deleteEventConfirmTitle = 'Kayıt silinsin mi?';
  static const deleteEventConfirmBody =
      'Kayıt geçmişten fiziksel olarak silinmez; aktif sayaçlardan çıkarılır.';
  static const deleteEventConfirmAction = 'Sil';
  static const eventUpdated = 'Kayıt güncellendi';
  static const eventDeleted = 'Kayıt silindi';

  // Contextual insights (factual, calm)
  static String insightBusyHour(int hour) =>
      'Bu saatlerde ($hour:00) genellikle daha sık kayıt yapıyorsun.';
  static String insightIntervalLonger(String delta) =>
      'Bugünkü ortalama aralığın son günlere göre $delta daha uzun.';
  static String insightIntervalShorter(String delta) =>
      'Bugünkü ortalama aralığın son günlere göre $delta daha kısa.';
  static String insightFewerThanYesterday(int n) =>
      'Bugün şu ana kadar dünkü aynı saate göre $n kayıt daha az.';
  static String insightMoreThanYesterday(int n) =>
      'Bugün şu ana kadar dünkü aynı saate göre $n kayıt daha fazla.';
  static String insightTriggerToday(String trigger) =>
      '$trigger kayıtların bugün daha sık.';
}
