import asyncio
import os
import sys

# 将当前目录加入系统路径，确保可以导入 app 模块
sys.path.append(os.path.abspath(os.getcwd()))

from app.core.scraper import ZimukuAgent


async def main():
    # 从环境变量获取代理 (可选)
    proxy = os.getenv("HTTP_PROXY") or os.getenv("http_proxy")
    # 尝试使用备用域名 zmk.pw
    agent = ZimukuAgent(base_url="https://zmk.pw", proxy=proxy)
    try:
        query = "复仇者联盟"
        print(f"正在测试搜索: {query}...")
        results = await agent.search(query)

        print(f"找到 {len(results)} 个结果:")
        if results:
            first = results[0]
            print(f"测试下载第一个结果: {first.title}")
            print(f"详情链接: {first.link}")

            dld_links = await agent.get_download_page_links(first.link)
            print(f"找到 {len(dld_links)} 个下载链接:")
            for link in dld_links:
                print(f"  - {link}")

            if dld_links:
                print(f"正在尝试下载: {dld_links[0]}")
                filename, content = await agent.download_file(dld_links[0], first.link.replace("/detail/", "/dld/"))
                if filename and content:
                    print(f"成功下载文件: {filename}, 大小: {len(content)} 字节")
                    # 保存到 storage/tmp (确保目录存在)
                    os.makedirs("storage/tmp", exist_ok=True)
                    save_path = os.path.join("storage/tmp", filename)
                    with open(save_path, "wb") as f:
                        f.write(content)
                    print(f"文件已保存至: {save_path}")
                else:
                    print("下载文件失败")

        if len(results) == 0:
            print("警告: 未找到任何结果，可能是网页结构发生变化或由于网络原因拦截。")
    except Exception:
        import traceback

        traceback.print_exc()
    finally:
        await agent.close()


if __name__ == "__main__":
    asyncio.run(main())
