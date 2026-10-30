"""Optional CPU OCR with text boxes and confidence; no paid API is involved."""
import importlib.util
import io
import threading
import time

ENGINE_NAME = 'RapidOCR · PP-OCRv6 Tiny'


class VisionOCR:
    def __init__(self):
        self.available = all(importlib.util.find_spec(name) is not None for name in ('rapidocr', 'onnxruntime'))
        self.lock = threading.Lock()
        self.engine = None

    def recognize(self, raw):
        if not self.available:
            raise RuntimeError('快速 OCR 尚未安装')
        # One inference at a time keeps the two-core VPS responsive to searches and LLM streams.
        if not self.lock.acquire(timeout=1):
            raise RuntimeError('快速 OCR 正忙')
        try:
            from PIL import Image
            with Image.open(io.BytesIO(raw)) as image:
                if image.width * image.height > 16_000_000:
                    raise ValueError('图片尺寸过大，请缩小后重试')
                image.load()
                image = image.convert('RGB')
            if self.engine is None:
                from rapidocr import RapidOCR, ModelType
                self.engine = RapidOCR(params={
                    'Global.log_level': 'warning', 'Global.text_score': 0.45,
                    'Global.max_side_len': 2400,
                    'Det.limit_type': 'max', 'Det.limit_side_len': 1280,
                    'Det.model_type': ModelType.TINY, 'Rec.model_type': ModelType.TINY,
                    'EngineConfig.onnxruntime.intra_op_num_threads': 2,
                    'EngineConfig.onnxruntime.inter_op_num_threads': 1,
                })
            # Keep small letters legible in side-by-side pages without upscaling short crops.
            limit = 1920 if image.width > image.height * 1.3 else 1280
            self.engine.cfg.Det.limit_side_len = limit
            if self.engine.text_det is not None:
                self.engine.text_det.limit_side_len = limit
            started = time.monotonic()
            result = self.engine(image)
            lines = []
            if result.txts:
                for text, confidence, box in zip(result.txts, result.scores, result.boxes):
                    lines.append({'text': text, 'confidence': round(float(confidence), 4),
                                  'box': [[round(float(x), 1), round(float(y), 1)] for x, y in box]})
            return {'text': '\n'.join(line['text'] for line in lines), 'lines': lines,
                    'width': image.width, 'height': image.height,
                    'engine': ENGINE_NAME, 'seconds': round(time.monotonic() - started, 3)}
        finally:
            self.lock.release()
