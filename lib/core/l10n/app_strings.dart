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
}
