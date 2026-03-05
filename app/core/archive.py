import logging
import os
import zipfile
from typing import List

import py7zr

logger = logging.getLogger(__name__)


class ArchiveManager:
    """压缩包管理器，支持解压并修复文件名乱码"""

    @staticmethod
    def extract(file_path: str, extract_to: str) -> List[str]:
        """解压文件并返回解压后的文件列表"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        os.makedirs(extract_to, exist_ok=True)

        if file_path.lower().endswith(".zip"):
            return ArchiveManager._extract_zip(file_path, extract_to)
        elif file_path.lower().endswith(".7z"):
            return ArchiveManager._extract_7z(file_path, extract_to)
        else:
            logger.warning(f"Unsupported archive format: {file_path}")
            return []

    @staticmethod
    def _extract_zip(file_path: str, extract_to: str) -> List[str]:
        extracted_files = []
        with zipfile.ZipFile(file_path, "r") as z:
            for info in z.infolist():
                # 修复 ZIP 文件名乱码 (CP437 -> GBK/UTF-8)
                try:
                    # 尝试将原始编码 cp437 转换为 gbk
                    filename = info.filename.encode("cp437").decode("gbk")
                except Exception:
                    try:
                        # 备选：如果不是 gbk，尝试 utf-8
                        filename = info.filename.encode("cp437").decode("utf-8")
                    except Exception:
                        filename = info.filename

                # 确保路径安全，防止目录遍历攻击
                filename = os.path.basename(filename)
                if not filename:
                    continue

                target_path = os.path.join(extract_to, filename)
                with open(target_path, "wb") as f:
                    f.write(z.read(info.filename))

                extracted_files.append(target_path)
                logger.info(f"Extracted: {filename}")

        return extracted_files

    @staticmethod
    def _extract_7z(file_path: str, extract_to: str) -> List[str]:
        extracted_files = []
        with py7zr.SevenZipFile(file_path, mode="r") as sz:
            sz.extractall(path=extract_to)
            # 7z 通常使用 UTF-16 编码，乱码较少，但我们仍记录文件
            for name in sz.getnames():
                # py7zr 提取后的文件名通常是正确的
                full_path = os.path.join(extract_to, name)
                if os.path.isfile(full_path):
                    extracted_files.append(full_path)
                    logger.info(f"Extracted (7z): {name}")

        return extracted_files

    @staticmethod
    def is_archive(file_path: str) -> bool:
        """判断是否为支持的压缩包格式"""
        ext = file_path.lower()
        return ext.endswith(".zip") or ext.endswith(".7z")
