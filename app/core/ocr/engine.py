import base64
from abc import ABC, abstractmethod
from typing import List, Tuple


class OCRIface(ABC):
    """OCR 引擎统一接口"""

    @abstractmethod
    def recognize(self, b64_string: str) -> str:
        pass


class SimpleOCREngine(OCRIface):
    """
    基于像素采样模板匹配的轻量级 OCR 引擎
    (移植自 zimuku_for_kodi 项目的 BmpOcr 逻辑)
    """

    IMG_WIDTH = 100
    IMG_HEIGHT = 27
    CHAR_WIDTH = 20
    NUM_CHARS = 5
    PIXEL_DATA_OFFSET = 54  # 24-bit BMP header offset

    # 用于区分数字 0-9 的采样点坐标 (x, y)
    SAMPLE_POINTS = [
        (10, 7),  # P0: Top-center
        (7, 8),  # P1: Top-left
        (12, 8),  # P2: Top-right
        (10, 13),  # P3: Center
        (7, 19),  # P4: Bottom-left
        (12, 19),  # P5: Bottom-right
        (10, 20),  # P6: Bottom-center
        (6, 13),  # P7: Middle-left
        (14, 13),  # P8: Middle-right
    ]

    # 数字 0-9 的特征向量模板
    DIGIT_TEMPLATES = {
        "0": [1, 1, 1, 1, 1, 1, 1, 1, 0],
        "1": [0, 1, 0, 0, 0, 0, 1, 0, 0],
        "2": [1, 0, 1, 0, 1, 0, 1, 0, 0],
        "3": [1, 0, 1, 1, 0, 1, 1, 0, 0],
        "4": [0, 0, 1, 0, 0, 1, 0, 0, 0],
        "5": [1, 1, 0, 0, 0, 1, 1, 0, 0],
        "6": [1, 0, 1, 1, 1, 1, 1, 1, 0],
        "7": [1, 0, 1, 0, 0, 0, 0, 0, 0],
        "8": [1, 1, 1, 1, 1, 1, 1, 0, 0],
        "9": [1, 1, 1, 0, 1, 0, 1, 0, 0],
    }

    def _get_pixel(self, data: bytes, x: int, y: int, row_stride: int) -> Tuple[int, int, int]:
        # BMP 行是自下而上存储的
        bmp_y = self.IMG_HEIGHT - 1 - y
        offset = self.PIXEL_DATA_OFFSET + (bmp_y * row_stride) + (x * 3)
        b, g, r = data[offset : offset + 3]
        return b, g, r

    def _is_foreground(self, data: bytes, x: int, y: int, row_stride: int, threshold: int = 70) -> bool:
        b, g, r = self._get_pixel(data, x, y, row_stride)
        return (r + g + b) / 3 < threshold

    def _match_digit(self, feature_vector: List[int]) -> str:
        min_diff = float("inf")
        found_digit = "?"
        for digit_char, template_vector in self.DIGIT_TEMPLATES.items():
            diff = sum(v1 != v2 for v1, v2 in zip(feature_vector, template_vector))
            if diff < min_diff:
                min_diff = diff
                found_digit = digit_char
            if min_diff == 0:
                break
        return found_digit

    def recognize(self, b64_string: str) -> str:
        if not b64_string:
            return ""

        # 处理可能带有 Data URI 前缀的情况
        if "base64," in b64_string:
            b64_string = b64_string.split("base64,")[1]

        try:
            image_data = base64.b64decode(b64_string)
        except Exception:
            return ""

        if len(image_data) < self.PIXEL_DATA_OFFSET or image_data[0:2] != b"BM":
            return ""

        # 计算每行的字节偏移 (对齐到 4 字节)
        row_stride = (self.IMG_WIDTH * 3 + 3) & ~3

        result = []
        one_offset = 0
        for i in range(self.NUM_CHARS):
            char_x_offset = i * self.CHAR_WIDTH
            feature_vector = [
                1 if self._is_foreground(image_data, char_x_offset + px - one_offset, py, row_stride) else 0
                for px, py in self.SAMPLE_POINTS
            ]

            recognized_char = self._match_digit(feature_vector)
            if recognized_char == "1":
                one_offset += 1
            elif recognized_char == "4":
                one_offset -= 1
            result.append(recognized_char)

        return "".join(result)
