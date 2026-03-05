import httpx
from bs4 import BeautifulSoup
import urllib.parse
import logging
from typing import List, Dict, Optional, Tuple
from .ocr import SimpleOCREngine

# 设置基础日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SubtitleResult:
    def __init__(self, title: str, link: str, lang: List[str], rating: str):
        self.title = title
        self.link = link
        self.lang = lang
        self.rating = rating

    def __repr__(self):
        return f"<SubtitleResult {self.title} [{'/'.join(self.lang)}]>"

class ZimukuAgent:
    def __init__(self, base_url: str = "https://zimuku.org", proxy: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.search_url = f"{self.base_url}/search?q="
        
        # 仅在提供了代理时才传入 proxy 参数
        client_kwargs = {
            "headers": {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
            "timeout": 15.0,
            "follow_redirects": True
        }
        if proxy:
            client_kwargs["proxy"] = proxy
            
        self.client = httpx.AsyncClient(**client_kwargs)
        self.ocr = SimpleOCREngine()

    async def _get_page(self, url: str) -> str:
        """异步获取页面内容，自动处理验证码挑战"""
        response = await self.client.get(url)
        html = response.text
        
        # 检测是否触发验证码 (404 页面或 200 页面都可能包含验证码)
        if 'class="verifyimg"' in html:
            logger.info("检测到验证码挑战，正在尝试绕过...")
            if await self._solve_captcha(url, html):
                # 成功绕过后重试
                response = await self.client.get(url)
                return response.text
            else:
                logger.error("验证码挑战失败")
                return html
        return html

    async def _solve_captcha(self, url: str, html: str) -> bool:
        """识别验证码并提交请求获取权限 Cookie"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            img_tag = soup.find(attrs={'class': 'verifyimg'})
            if not img_tag:
                return False
                
            img_src = img_tag.get('src', '')
            # Zimuku 的验证码通常直接是 Base64 数据
            captcha_text = self.ocr.recognize(img_src)
            logger.info(f"识别到验证码文本: {captcha_text}")
            
            # 将识别出的文本转换为 16 进制字符串（参考 kodi 插件逻辑）
            hex_str = "".join([hex(ord(c)).replace('0x', '') for c in captcha_text])
            
            # 构建验证 URL
            sep = '&' if '?' in url else '?'
            verify_url = f"{url}{sep}security_verify_img={hex_str}"
            
            # 提交验证请求，这一步通常会设置 Cookie
            await self.client.get(verify_url)
            return True
        except Exception as e:
            logger.error(f"处理验证码时出错: {str(e)}")
            return False

    async def search(self, query: str) -> List[SubtitleResult]:
        """搜索字幕"""
        url = f"{self.search_url}{urllib.parse.quote(query)}"
        logger.info(f"正在搜索: {url}")
        
        html = await self._get_page(url)
        soup = BeautifulSoup(html, 'html.parser')
        
        results = []
        # 处理搜索结果列表页
        sub_items = soup.find_all('tr')
        if not sub_items:
            sub_items = soup.find_all("div", class_="item prel clearfix")
            
        for item in sub_items:
            try:
                link_tag = item.find('a')
                if not link_tag or '/detail/' not in link_tag.get('href', ''):
                    continue
                
                title = link_tag.text.strip()
                link = urllib.parse.urljoin(self.base_url, link_tag.get('href'))
                
                # 提取语言
                langs = []
                img_tags = item.find_all('img')
                for img in img_tags:
                    alt = img.get('alt', '') or img.get('title', '')
                    if '字幕' in alt:
                        langs.append(alt.replace('字幕', '').strip())
                
                if not langs:
                    # 尝试从文本提取
                    lang_td = item.find("td", class_="tac lang")
                    if lang_td:
                        langs = [img.get('title', '').replace('字幕', '').strip() for img in lang_td.find_all('img')]

                # 评分提取
                rating = "0"
                rating_star = item.find("i", class_="rating-star")
                if rating_star:
                    cls = "".join(rating_star.get('class', []))
                    if 'allstar' in cls:
                        # 提取最后两位数字并除以 10
                        import re
                        match = re.search(r'allstar(\d+)', cls)
                        if match:
                            rating = str(int(match.group(1)) // 10)

                results.append(SubtitleResult(title, link, langs, rating))
            except Exception as e:
                logger.warning(f"解析搜索条目出错: {str(e)}")
                continue
                
        return results

    async def get_download_page_links(self, detail_url: str) -> List[str]:
        """从详情页提取下载页面的真实下载链接"""
        # 通常下载链接在 dld/<id>.html 页面中
        dld_url = detail_url.replace('/detail/', '/dld/')
        logger.info(f"正在访问下载页面: {dld_url}")
        
        html = await self._get_page(dld_url)
        soup = BeautifulSoup(html, 'html.parser')
        
        download_links = []
        # Zimuku 下载页面中 class="clearfix" 的 div 内包含下载链接
        dld_div = soup.find("div", class_="clearfix")
        if dld_div:
            links = dld_div.find_all('a')
            for a in links:
                href = a.get('href', '')
                if href:
                    download_links.append(urllib.parse.urljoin(self.base_url, href))
        
        return download_links

    async def download_file(self, download_url: str, referer: str) -> Tuple[Optional[str], Optional[bytes]]:
        """下载字幕文件"""
        headers = {
            "Referer": referer,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        try:
            response = await self.client.get(download_url, headers=headers)
            response.raise_for_status()
            
            # 从 Content-Disposition 获取文件名
            content_disposition = response.headers.get("Content-Disposition", "")
            filename = None
            if "filename=" in content_disposition:
                import re
                match = re.search(r'filename=["\']?([^"\';]+)["\']?', content_disposition)
                if match:
                    filename = match.group(1)
            
            if not filename:
                # 备选：从 URL 中提取
                filename = download_url.split('/')[-1]
            
            if filename:
                filename = self.fix_filename(filename)
                
            return filename, response.content
        except Exception as e:
            logger.error(f"下载文件失败: {str(e)}")
            return None, None

    def fix_filename(self, filename: str) -> str:
        """修复下载文件名可能存在的乱码 (CP437 -> GBK)"""
        try:
            # 尝试修复 Zip 编码导致的乱码
            return filename.encode('cp437').decode('gbk')
        except Exception:
            # 尝试处理 URL 编码或其他情况
            try:
                return urllib.parse.unquote(filename)
            except Exception:
                return filename

    async def close(self):
        await self.client.aclose()
