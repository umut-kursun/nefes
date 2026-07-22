/// Localization-ready user-facing strings (Turkish).
abstract final class AppStrings {
  static const appName = 'NEFES';
  static const appSubtitle = 'Alışkanlıklarını anla.';

  static const today = 'Bugün';
  static const iSmoked = 'Sigara İçtim';
  static const sinceLastCigarette = 'Son sigaradan beri';
  static const noCigaretteYet =
      'Henüz kayıt yok. İlk sigaranı işaretlediğinde süre burada başlar.';
  static const dailyTarget = 'Günlük hedef';
  static const remaining = 'Kalan';
  static const todayCigarettes = 'Bugünkü sigaralar';
  static const emptyTodayHistory = 'Henüz bugün kayıt yok';
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
  static const targetExceeded = 'Bugünkü hedef aşıldı';
  static const editTarget = 'Hedefi düzenle';
  static const save = 'Kaydet';

  // Onboarding
  static const onboardingTitle = 'Hedefini belirle';
  static const onboardingAverageLabel = 'Günde ortalama kaç sigara içiyorsun?';
  static const onboardingTargetLabel = 'İlk günlük hedefin kaç olsun?';
  static const onboardingHint =
      'Hedef bir rehberdir; her zaman kayıt ekleyebilirsin.';
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
  static const urgePassed = 'İstek geçti';
  static const cancelDelay = 'İptal';
  static const delayStartFailed = 'Başlatılamadı. Tekrar dene.';
  static const delayCompleteDone = 'Kaydedildi';
  static const delayCancelled = 'İptal edildi';

  static String remainingCount(int value) => 'Kalan: $value';
  static String todayProgress(int count, int target) => '$count / $target';
  static String sequenceLabel(int n) => '#$n';
  static String afterPrevious(String interval) => '$interval sonra';
  static String delayedMinutes(int minutes) => '$minutes dakika erteledin.';
  static String todayDelayCount(int count) => 'Bugün $count kez erteledin.';
  static String todayDelayTotalMinutes(int minutes) =>
      'Bugün toplam $minutes dakika erteledin.';

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
      'Sigara kaydettikçe geçmişin burada görünecek.';
  static const averageIntervalLabel = 'Ortalama aralık';
  static const longestIntervalLabel = 'En uzun aralık';
  static const smokeCountLabel = 'Sigara sayısı';
  static const dayDetailTitle = 'Gün detayı';
  static const delayCountLabel = 'Erteleme';
  static const noSmokesThisDay = 'Bu gün için kayıt yok.';
  static const targetForDayLabel = 'O günkü hedef';
  static const timelineTitle = 'Zaman çizelgesi';
  static const delayNotesTitle = 'Erteleme kayıtları';
  static const delayOutcomeSmoked = 'Sigara içildi';
  static const delayOutcomeCompleted = 'İstek geçti';
  static const delayOutcomeCancelled = 'İptal edildi';
  static const previousMonth = 'Önceki ay';
  static const nextMonth = 'Sonraki ay';

  // Insights
  static const insightsTitle = 'İçgörüler';
  static const period7Days = '7 Gün';
  static const period30Days = '30 Gün';
  static const periodThisMonth = 'Bu Ay';
  static const insightsEmpty = 'Bu dönemde henüz veri yok.';
  static const insightsEmptyHint =
      'Kayıt eklemeye başladığında burada içgörüler görünecek.';
  static const totalSmokesLabel = 'Toplam sigara';
  static const dailyAverageLabel = 'Günlük ortalama';
  static const delayAttemptsLabel = 'Erteleme denemesi';
  static const insightsListTitle = 'Gözlemler';
  static const dailyChartTitle = 'Günlük dağılım';

  // Settings
  static const settingsTitle = 'Ayarlar';
  static const currentHabitLabel = 'Aktif alışkanlık';
  static const currentHabitValue = 'Sigara';
  static const editDailyTargetTitle = 'Günlük hedefi düzenle';
  static const averagePerDayLabel = 'Günlük ortalama';
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
  static const appInfoTitle = 'Uygulama bilgisi';
  static const appVersionLabel = 'Sürüm';
  static const updateAvailable = 'Güncelleme mevcut';
  static const updateNow = 'Şimdi güncelle';
}
