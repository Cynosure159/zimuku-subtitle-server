import logging
import os
import zipfile
from pathlib import Path
from typing import List

import py7zr

logger = logging.getLogger(__name__)


class ArchiveManager:
    """压缩包管理器，支持解压并修复文件名乱码"""

    SUPPORTED_ARCHIVE_EXTENSIONS = (".zip", ".7z")

    @staticmethod
    def _resolve_safe_target(base_dir: str, relative_name: str) -> Path:
        target_root = Path(base_dir).resolve()
        target_path = (target_root / relative_name).resolve(strict=False)
        try:
            target_path.relative_to(target_root)
        except ValueError as exc:
            raise ValueError(f"Unsafe archive entry: {relative_name}") from exc
        return target_path

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
                if info.is_dir():
                    continue

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

                normalized = Path(filename)
                safe_parts = [part for part in normalized.parts if part not in {"", "."}]
                if any(part == ".." for part in safe_parts) or not safe_parts:
                    continue

                relative_name = Path(*safe_parts)
                target_path = ArchiveManager._resolve_safe_target(extract_to, str(relative_name))
                target_path.parent.mkdir(parents=True, exist_ok=True)
                with open(target_path, "wb") as f:
                    f.write(z.read(info.filename))

                extracted_files.append(str(target_path))
                logger.info(f"Extracted: {relative_name}")

        return extracted_files

    @staticmethod
    def _extract_7z(file_path: str, extract_to: str) -> List[str]:
        extracted_files = []
        with py7zr.SevenZipFile(file_path, mode="r") as sz:
            sz.extractall(path=extract_to)
            # 7z 通常使用 UTF-16 编码，乱码较少，但我们仍记录文件
            for name in sz.getnames():
                full_path = ArchiveManager._resolve_safe_target(extract_to, name)
                if os.path.isfile(full_path):
                    extracted_files.append(str(full_path))
                    logger.info(f"Extracted (7z): {name}")

        return extracted_files

    @staticmethod
    def is_archive(file_path: str) -> bool:
        """判断是否为支持的压缩包格式"""
        return file_path.lower().endswith(ArchiveManager.SUPPORTED_ARCHIVE_EXTENSIONS)
