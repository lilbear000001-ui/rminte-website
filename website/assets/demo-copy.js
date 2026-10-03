(function () {
  const translations = {
    ja: {
      'View interface demo': '画面デモを見る',
      'TianshanOS interface demo': 'TianshanOS 画面デモ',
      'This is a TianshanOS interface demo. All data is illustrative and does not represent a real device.': 'これは TianshanOS の画面デモです。表示データはすべて例示であり、実際のデバイスの状態を示すものではありません。',
      'Please use a computer to view the full demo.': 'デモの全画面表示にはパソコンをご利用ください。',
      'TianshanOS interface preview': 'TianshanOS 画面プレビュー',
      'Close demo': 'デモを閉じる'
    },
    ko: {
      'View interface demo': '화면 데모 보기',
      'TianshanOS interface demo': 'TianshanOS 화면 데모',
      'This is a TianshanOS interface demo. All data is illustrative and does not represent a real device.': '아래는 TianshanOS 화면 데모입니다. 모든 데이터는 예시이며 실제 장치 상태를 나타내지 않습니다.',
      'Please use a computer to view the full demo.': '전체 데모는 컴퓨터에서 확인해 주세요.',
      'TianshanOS interface preview': 'TianshanOS 화면 미리보기',
      'Close demo': '데모 닫기'
    },
    es: {
      'View interface demo': 'Ver demostración de la interfaz',
      'TianshanOS interface demo': 'Demostración de la interfaz de TianshanOS',
      'This is a TianshanOS interface demo. All data is illustrative and does not represent a real device.': 'Esta es una demostración de la interfaz de TianshanOS. Todos los datos son ilustrativos y no representan el estado de un dispositivo real.',
      'Please use a computer to view the full demo.': 'Usa un ordenador para ver la demostración completa.',
      'TianshanOS interface preview': 'Vista previa de la interfaz de TianshanOS',
      'Close demo': 'Cerrar demostración'
    },
    fr: {
      'View interface demo': 'Voir la démonstration de l’interface',
      'TianshanOS interface demo': 'Démonstration de l’interface TianshanOS',
      'This is a TianshanOS interface demo. All data is illustrative and does not represent a real device.': 'Voici une démonstration de l’interface TianshanOS. Toutes les données sont des exemples et ne représentent pas l’état d’un appareil réel.',
      'Please use a computer to view the full demo.': 'Utilisez un ordinateur pour voir la démonstration complète.',
      'TianshanOS interface preview': 'Aperçu de l’interface TianshanOS',
      'Close demo': 'Fermer la démonstration'
    }
  };
  // Catalogs load per language: merge into the one already present, and let i18n.js merge the rest when it loads them.
  window.RM_TRANSLATION_EXTRAS = translations;
  for (const [lang, entries] of Object.entries(translations)) {
    if (window.RM_TRANSLATIONS?.[lang]) Object.assign(window.RM_TRANSLATIONS[lang], entries);
  }
})();
