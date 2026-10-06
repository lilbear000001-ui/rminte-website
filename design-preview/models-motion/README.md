# 模型页动效原型（仅参考，未写入 website/）

- engine-stack-motion.html：专用引擎（三层玻璃叠层 + 光块穿层 + 2 MB 计数 + C++/vLLM 切换）
- dense-sparse-motion.html：稠密/稀疏（线上底图 + 流光 / 方块明灭 / 更顺的展开），图片引用 ../../website/models/model-glass-a.png
- 交接说明见 Claude Design 画布 22、23 号板。
- 注意：原型中「2 MB」用等宽字体兜底，落地需换站内 Geist Pixel；动效未在真机 GPU 验证。
