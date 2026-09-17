# License and attribution

## Released weights and metadata

TypLens-V1 is a fine-tuned derivative of Pix2Text-MFR-1.5, not the original
random-initialized IBEM-im2typst Phase10 model. The FP32 and INT8 exports are
variants of the same fine-tuned checkpoint. Copyright (c) 2026 dbcccc.

The project contributions to these weights and metadata are licensed under the
MIT License, to the extent the contributors hold applicable licensable rights.
Upstream rights and notices are retained. Keep LICENSE, this notice, and the
licenses directory with redistributed model files. The MIT grant does not
require publication of training code. No training source is included.

## Pretrained parameters

- Pix2Text-MFR-1.5 by BreezeDeus: [model card](https://huggingface.co/breezedeus/pix2text-mfr-1.5),
  [pinned source revision](https://huggingface.co/breezedeus/pix2text-mfr-1.5/tree/1cef9f0bdcd6a4c63df7de1311fb0894593340cc).
  The pinned model metadata declares MIT. The associated project's notice is
  Copyright (c) 2022 BreezeDeus; retained in licenses/PIX2TEXT-MIT.txt.
  [Upstream license](https://github.com/breezedeus/Pix2Text/blob/main/LICENSE).
- The upstream model card attributes its initialization and architecture to
  Microsoft's TrOCR. The corresponding Microsoft MIT notice is retained in
  licenses/TROCR-MIT.txt.
  [TrOCR project](https://github.com/microsoft/unilm/tree/master/trocr),
  [license](https://github.com/microsoft/unilm/blob/master/LICENSE).

Changes include native Typst output targets and vocabulary, fine-tuning, screenshot
augmentation, a cached ONNX decoder export, and an optional INT8 weight export.

## Training-data attribution (datasets are not redistributed)

- **IBEM**, Dan Anitei, Joan Andreu Sanchez, and Jose Miguel Benedi:
  [Zenodo record 7963703](https://zenodo.org/records/7963703),
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  Formula crops and annotations were used to derive native Typst supervision.
- **UniMER Dataset**, Bin Wang, Zhuangcheng Gu, Chao Xu, Bo Zhang, Botian Shi,
  and Conghui He: [dataset card](https://huggingface.co/datasets/wanderkid/UniMER_Dataset),
  source revision 2343ddd963290469da36ca83e3a56c66e068add9.
  The dataset card declares Apache-2.0 and identifies component sources including
  Pix2tex, arXiv, CROHME and HME100K. It also gives a separate copyright-related
  download instruction for HME100K. The selected training images were not all
  traced to component-level rights. This release does not represent that every
  component image has a uniform license or provide a separate commercial-rights
  clearance for those source materials.

No dataset images, original annotations, or source PDFs are included. The model
license does not relicense those materials. Runtime libraries, Typst, MiTeX, and
ONNX Runtime binaries are also not included and retain their own licenses.
