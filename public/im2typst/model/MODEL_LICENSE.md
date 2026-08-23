# IBEM Semantic Length33 Phase 10 Model Weights License

The project contributors license the learned parameters identified by the
accompanying `browser-deployment-v1` `deployment.json` and `SHA256SUMS` under
the MIT License in [`LICENSE`](LICENSE). The grant covers the exported ONNX
encoder and cached-decoder graphs when their hashes match those manifests.

The training lineage began from project-seeded random parameters and later
continued only from checkpoints in that same IBEM lineage. It contains no
external pretrained model, teacher model, or third-party learned parameters.
Training supervision consists only of real formula crops from IBEM and
deterministic package-free Typst targets derived from IBEM `latex_norm`
transcripts. No Fusion, synthetic, teacher-generated, or fused training
samples were used.

IBEM is not included in the browser model bundle. The source dataset remains
under Creative Commons Attribution 4.0 (CC BY 4.0):

- IBEM Zenodo record: <https://zenodo.org/records/7963703>
- License: <https://creativecommons.org/licenses/by/4.0/>
- Dataset description: images and annotations from 600 scientific documents,
  published as the IBEM mathematical-expression dataset

Use of these model files does not relicense IBEM, MiTeX, Typst, ONNX Runtime,
or any other third-party component. Those works retain their respective
licenses. This file is a provenance and licensing notice, not legal advice.

