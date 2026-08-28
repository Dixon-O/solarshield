# IBM Model IDs — Verified

## Cloud Narration (watsonx.ai)

**Model ID used:** `ibm/granite-3-3-8b-instruct`

Based on IBM's current watsonx.ai documentation (https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html), the active Granite instruction-tuned models include:
- `ibm/granite-3-3-8b-instruct` — Granite 3.3 8B Instruct (primary narrator)
- `ibm/granite-3-3-2b-instruct` — Granite 3.3 2B Instruct (lighter alternative)

**Model ID used for Granite Guardian:** `ibm/granite-guardian-3-8b`

Per IBM documentation, Granite Guardian 3.0 8B is the current generation:
- `ibm/granite-guardian-3-8b` — safety and grounding gate

## On-Device Narration (Granite Nano via transformers.js)

**Model ID used:** `ibm-granite/granite-3.0-2b-instruct`

Verified available on Hugging Face at: https://huggingface.co/ibm-granite/granite-3.0-2b-instruct
Compatible with transformers.js WebGPU inference as a text-generation model.

> Note: These IDs should be re-verified at M3/M4 implementation time by making a real API call
> to the watsonx.ai models endpoint, as IBM updates available models regularly.
