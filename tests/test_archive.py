import os
import zipfile
import shutil
from app.core.archive import ArchiveManager

def test_zip_extraction_with_encoding():
    # 准备测试环境
    test_dir = "tests/tmp_archive"
    extract_to = "tests/tmp_extracted"
    os.makedirs(test_dir, exist_ok=True)
    if os.path.exists(extract_to):
        shutil.rmtree(extract_to)
    
    zip_path = os.path.join(test_dir, "test.zip")
    
    # 创建一个包含中文文件名的 ZIP
    # 在 Windows 上，zipfile 默认可能使用 cp437 编码存储文件名
    # 我们模拟这种情况
    chinese_filename = "测试字幕文件.srt"
    
    with zipfile.ZipFile(zip_path, "w") as z:
        # 模拟 cp437 编码的文件名写入 (这是 Zimuku 常见的乱码来源)
        # 注意：现代 zipfile 在某些情况下会自动处理，我们尽量模拟原始字节
        z.writestr(chinese_filename.encode('gbk').decode('cp437'), "subtitle content")
    
    # 使用 ArchiveManager 解压
    files = ArchiveManager.extract(zip_path, extract_to)
    
    assert len(files) > 0
    # 检查解压后的文件名是否正确修复
    expected_path = os.path.join(extract_to, chinese_filename)
    assert os.path.exists(expected_path)
    print(f"成功验证解压乱码修复: {chinese_filename}")
    
    # 清理
    shutil.rmtree(test_dir)
    shutil.rmtree(extract_to)

if __name__ == "__main__":
    test_zip_extraction_with_encoding()
