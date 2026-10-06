// Six-language strings for the engine-glass pilot. In production these become `ui` keys in assets/site-data.js (zh/en) plus
// entries in locales/{ja,ko,es,fr}.json; the data-ui attribute on each element is the key. Terms follow the wording the site
// already uses for the same ideas (continuous batching, prefix cache, kernel fusion, paged KV cache ...).
// ja/ko/es/fr below are drafts for proofreading, not reviewed copy.
export const LANGS = ['zh', 'en', 'ja', 'ko', 'es', 'fr'];
export const LOCALE = { zh: 'zh-CN', en: 'en', ja: 'ja', ko: 'ko', es: 'es-ES', fr: 'fr-FR' };

// key: [zh, en, ja, ko, es, fr]
const rows = {
  egTag: ['示意图', 'Illustrative', '概念図', '개념도', 'Esquema', 'Schéma'],
  egNoGl: [
    '此浏览器不支持 WebGL 2，无法显示示意图。',
    'This browser does not support WebGL 2, so the illustration cannot be shown.',
    'このブラウザーは WebGL 2 に対応していないため、概念図を表示できません。',
    '이 브라우저는 WebGL 2를 지원하지 않아 개념도를 표시할 수 없습니다.',
    'Este navegador no admite WebGL 2, por lo que no se puede mostrar el esquema.',
    'Ce navigateur ne prend pas en charge WebGL 2 : le schéma ne peut pas être affiché.'
  ],

  // scene 0: familiar ecosystem
  egL0P3T: ['模型与接口', 'Models and API', 'モデルと API', '모델과 API', 'Modelos y API', 'Modèles et API'],
  egL0P3S: ['Hugging Face · OpenAI 兼容', 'Hugging Face · OpenAI-compatible', 'Hugging Face · OpenAI 互換', 'Hugging Face · OpenAI 호환', 'Hugging Face · compatible con OpenAI', 'Hugging Face · compatible OpenAI'],
  egL0P2T: ['RMinte 推理层', 'RMinte inference layer', 'RMinte 推論レイヤー', 'RMinte 추론 계층', 'Capa de inferencia RMinte', 'Couche d’inférence RMinte'],
  egL0P2S: ['定制 vLLM · C++ 引擎', 'Custom vLLM · C++ engine', 'カスタム vLLM · C++ エンジン', '맞춤형 vLLM · C++ 엔진', 'vLLM personalizado · motor C++', 'vLLM personnalisé · moteur C++'],
  egL0P1T: ['NVIDIA CUDA', 'NVIDIA CUDA', 'NVIDIA CUDA', 'NVIDIA CUDA', 'NVIDIA CUDA', 'NVIDIA CUDA'],
  egL0P1S: ['计算平台', 'Compute platform', '計算基盤', '연산 플랫폼', 'Plataforma de cálculo', 'Plateforme de calcul'],

  // scene 1: longer context, more concurrency
  egL1P3T: ['并发请求', 'Concurrent requests', '同時リクエスト', '동시 요청', 'Solicitudes simultáneas', 'Requêtes simultanées'],
  egL1P3S: ['连续批处理', 'Continuous batching', '連続バッチ処理', '연속 배치 처리', 'Lotes continuos', 'Regroupement continu'],
  egL1P2T: ['分页 KV 缓存', 'Paged KV Cache', 'ページ化 KV キャッシュ', '페이지 단위 KV 캐시', 'Caché KV paginada', 'Cache KV paginé'],
  egL1P2S: ['前缀复用 · 递归状态', 'Prefix reuse · Recurrent state', 'プレフィックス再利用 · 再帰状態', '접두사 재사용 · 순환 상태', 'Reutilización de prefijos · Estado recurrente', 'Réutilisation des préfixes · États récurrents'],
  egL1P1T: ['显存 / 内存', 'VRAM / Memory', 'VRAM / メモリ', 'VRAM / 메모리', 'VRAM / Memoria', 'VRAM / Mémoire'],
  egL1P1S: ['上下文容量', 'Context capacity', 'コンテキスト容量', '컨텍스트 용량', 'Capacidad de contexto', 'Capacité de contexte'],
  egL1P0T: ['SSD', 'SSD', 'SSD', 'SSD', 'SSD', 'SSD'],
  egL1P0S: ['分层扩展上下文', 'Tiered context extension', 'コンテキストの階層拡張', '컨텍스트 계층형 확장', 'Contexto ampliado por niveles', 'Contexte étendu par niveaux'],

  // scene 2: a system shaped by inference
  egL2P3T: ['模型', 'Model', 'モデル', '모델', 'Modelo', 'Modèle'],
  egL2P3S: ['投影合并 · 算子融合', 'Merged projections · Kernel fusion', '射影の統合 · 演算融合', '투영 병합 · 연산 융합', 'Unión de proyecciones · Fusión de kernels', 'Combinaison des projections · Fusion des noyaux'],
  egL2P2T: ['融合算子', 'Fused kernel', '融合演算', '융합 연산', 'Kernel fusionado', 'Noyau fusionné'],
  egL2P2S: ['减少数据搬运', 'Less data movement', 'データ転送の削減', '데이터 이동 감소', 'Menos movimiento de datos', 'Moins de déplacements de données'],
  egL2P1T: ['GPU 算力', 'GPU compute', 'GPU 演算性能', 'GPU 연산 성능', 'Cómputo de GPU', 'Calcul GPU'],
  egL2P1S: ['带宽与缓存', 'Bandwidth and cache', '帯域とキャッシュ', '대역폭과 캐시', 'Ancho de banda y cachés', 'Bande passante et caches'],

  // accessible names of the figure, one per scene
  egAria0: [
    '推理软件与 CUDA 的分层示意：同一套接口，两条推理路线',
    'Layered view of inference software and CUDA: one interface, two inference paths',
    '推論ソフトウェアと CUDA の階層構成：共通のインターフェースと 2 つの推論ルート',
    '추론 소프트웨어와 CUDA의 계층 구조: 하나의 인터페이스, 두 가지 추론 경로',
    'Vista por capas del software de inferencia y CUDA: una misma interfaz, dos rutas de inferencia',
    'Vue en couches du logiciel d’inférence et de CUDA : une même interface, deux voies d’inférence'
  ],
  egAria1: [
    '分页 KV 缓存与 SSD 分层存储示意：多路并发共享缓存',
    'Paged KV cache and tiered SSD storage: concurrent requests share the cache',
    'ページ化 KV キャッシュと SSD の階層ストレージ：複数の同時リクエストがキャッシュを共有',
    '페이지 단위 KV 캐시와 SSD 계층형 저장: 여러 동시 요청이 캐시를 공유',
    'Caché KV paginada y almacenamiento SSD por niveles: las solicitudes simultáneas comparten la caché',
    'Cache KV paginé et stockage SSD par niveaux : les requêtes simultanées partagent le cache'
  ],
  egAria2: [
    '算子融合示意：三次读写合并为一次',
    'Kernel fusion: three reads and writes merged into one',
    '演算融合：3 回の読み書きを 1 回にまとめる',
    '연산 융합: 세 번의 읽기·쓰기를 한 번으로 합침',
    'Fusión de kernels: tres lecturas y escrituras se unen en una',
    'Fusion des noyaux : trois lectures-écritures regroupées en une seule'
  ]
};

export const UI = Object.fromEntries(LANGS.map((lang, i) => [lang, Object.fromEntries(Object.entries(rows).map(([key, row]) => [key, row[i]]))]));
