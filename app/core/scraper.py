import logging
import re
import urllib.parse
from typing import List, Optional, Tuple

import httpx
from bs4 import BeautifulSoup, Tag

from .ocr import SimpleOCREngine

# 设置基础日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 中文数字映射表，用于按季匹配（最多到第十五季）
_CHINESE_NUMBERS = (
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
    "七",
    "八",
    "九",
    "十",
    "十一",
    "十二",
    "十三",
    "十四",
    "十五",
)

# 下载文件最小有效大小（字节），低于此阈值视为下载失败
FILE_MIN_SIZE = 1024


class SubtitleResult:
    def __init__(
        self,
        title: str,
        link: str,
        lang: List[str],
        rating: str,
        format: Optional[str] = None,
        fps: Optional[str] = None,
    ):
        self.title = title
        self.link = link
        self.lang = lang
        self.rating = rating
        self.format = format
        self.fps = fps

    def to_dict(self):
        return {
            "title": self.title,
            "link": self.link,
            "lang": self.lang,
            "rating": self.rating,
            "format": self.format,
            "fps": self.fps,
        }

    @classmethod
    def from_dict(cls, data: dict):
        return cls(
            title=data.get("title", ""),
            link=data.get("link", ""),
            lang=data.get("lang", []),
            rating=data.get("rating", "0"),
            format=data.get("format"),
            fps=data.get("fps"),
        )

    def __repr__(self):
        return f"<SubtitleResult {self.title} [{'/'.join(self.lang)}]>"


class ZimukuAgent:
    def __init__(self, base_url: Optional[str] = None, proxy: Optional[str] = None):
        # 延迟导入以避免循环依赖
        from .config import get_base_url, get_proxy

        self.base_url = (base_url or get_base_url()).rstrip("/")
        self.search_url = f"{self.base_url}/search?q="

        actual_proxy = proxy or get_proxy()

        ua = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
        client_kwargs = {
            "headers": {"User-Agent": ua},
            "timeout": 15.0,
            "follow_redirects": True,
        }
        if actual_proxy:
            client_kwargs["proxy"] = actual_proxy

        self.client = httpx.AsyncClient(**client_kwargs)
        self.ocr = SimpleOCREngine()

    async def _get_page(self, url: str) -> str:
        """异步获取页面内容，自动处理验证码挑战，并支持代理重试"""
        try:
            response = await self.client.get(url)
            html = response.text
        except (httpx.ConnectError, httpx.ProxyError) as e:
            logger.warning(f"使用代理访问 {url} 失败: {e}，尝试直连...")
            # 创建一个临时无代理客户端进行重试
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as direct_client:
                response = await direct_client.get(url)
                html = response.text

        # 检测是否触发验证码
        if 'class="verifyimg"' in html:
            logger.info("检测到验证码挑战，正在尝试绕过...")
            if await self._solve_captcha(url, html):
                response = await self.client.get(url)
                return response.text
            else:
                logger.error("验证码挑战失败")
                return html
        return html

    async def _solve_captcha(self, url: str, html: str) -> bool:
        """识别验证码并提交请求获取权限 Cookie"""
        try:
            soup = BeautifulSoup(html, "html.parser")
            img_tag = soup.find(attrs={"class": "verifyimg"})
            if not img_tag:
                return False

            img_src = img_tag.get("src", "")
            captcha_text = self.ocr.recognize(img_src)
            logger.info(f"识别到验证码文本: {captcha_text}")

            # 将识别出的文本转换为 16 进制字符串（参考 kodi 插件逻辑）
            hex_str = "".join([hex(ord(c)).replace("0x", "") for c in captcha_text])

            # 构建验证 URL
            sep = "&" if "?" in url else "?"
            verify_url = f"{url}{sep}security_verify_img={hex_str}"

            await self.client.get(verify_url)
            return True
        except Exception as e:
            logger.error(f"处理验证码时出错: {str(e)}")
            return False

    # ==================== 字幕信息提取方法 ====================

    def _extract_sub_from_search_page(self, item: Tag) -> Optional[SubtitleResult]:
        """从搜索结果页的 <tr> 标签中提取字幕信息（lang_info_mode=1）

        搜索结果页的语言信息通常在 <img> 的 alt 属性中，
        格式如: "&nbsp;简体中文字幕&nbsp;English字幕&nbsp;双语字幕"
        """
        try:
            link_tag = item.find("a")
            if not link_tag or "/detail/" not in link_tag.get("href", ""):
                return None

            title = link_tag.text.strip()
            link = urllib.parse.urljoin(self.base_url, link_tag.get("href"))

            # 从 img 的 alt 属性读取语言信息
            langs = []
            img_tags = item.find_all("img")
            for img in img_tags:
                alt = img.get("alt", "") or img.get("title", "")
                if "字幕" in alt:
                    # alt 可能是 "&nbsp;简体中文字幕&nbsp;English字幕&nbsp;双语字幕"
                    parts = alt.split("\xa0")
                    for part in parts:
                        part = part.strip()
                        if part:
                            langs.append(part.rstrip("字幕"))

            # 提取评分
            rating = self._extract_rating(item)
            # 提取格式和帧率
            fmt = self._extract_format(item)
            fps = self._extract_fps(item)
            return SubtitleResult(title, link, langs, rating, format=fmt, fps=fps)
        except Exception as e:
            logger.warning(f"从搜索页提取字幕信息出错: {e}")
            return None

    def _extract_sub_from_detail_page(self, item: Tag) -> Optional[SubtitleResult]:
        """从季详情页的字幕表格 <tr> 中提取字幕信息（lang_info_mode=2）

        详情页的语言信息在 <td class="tac lang"> 下的 <img> 的 title 属性中。
        """
        try:
            link_tag = item.find("a")
            if not link_tag:
                return None

            href = link_tag.get("href", "")
            if not href:
                return None

            title = link_tag.text.strip()
            link = urllib.parse.urljoin(self.base_url, href)

            # 从 td.tac.lang 下的 img 的 title 属性读取语言
            langs = []
            lang_td = item.find("td", class_="tac lang")
            if lang_td:
                langs = [
                    img.get("title", "").rstrip("字幕").strip() for img in lang_td.find_all("img") if img.get("title")
                ]

            if not langs:
                langs = ["未知"]

            # 提取评分
            rating = self._extract_rating(item)
            # 提取格式和帧率
            fmt = self._extract_format(item)
            fps = self._extract_fps(item)
            return SubtitleResult(title, link, langs, rating, format=fmt, fps=fps)
        except Exception as e:
            logger.warning(f"从详情页提取字幕信息出错: {e}")
            return None

    def _extract_rating(self, item: Tag) -> str:
        """提取评分信息，从 <i class="rating-star allstarXX"> 中解析"""
        try:
            rating_star = item.find("i", class_="rating-star")
            if rating_star:
                cls = " ".join(rating_star.get("class", []))
                match = re.search(r"allstar(\d+)", cls)
                if match:
                    return str(int(match.group(1)) // 10)
        except Exception:
            pass
        return "0"

    def _extract_format(self, item: Tag) -> Optional[str]:
        """提取字幕格式信息，查找常见的字幕格式标识（SRT, ASS, SSA, SUB）"""
        try:
            # 查找包含格式信息的元素，可能在 td class="first" 或其他地方
            first_td = item.find("td", class_="first")
            if first_td:
                text = first_td.get_text().strip()
                # 匹配常见字幕格式，直接返回匹配到的格式关键字
                format_patterns = [r"ASS", r"SRT", r"SSA", r"SUB", r"蓝光原盘", r"WEB-?DL"]
                for pattern in format_patterns:
                    if re.search(pattern, text, re.IGNORECASE):
                        return pattern.upper()
            # 也尝试从整个 item 文本中查找
            text = item.get_text()
            for fmt in ["ASS", "SRT", "SSA", "SUB"]:
                if fmt in text.upper():
                    return fmt
        except Exception:
            pass
        return None

    def _extract_fps(self, item: Tag) -> Optional[str]:
        """提取帧率信息，查找常见的 FPS 标识"""
        try:
            # 查找包含 FPS 信息的元素
            text = item.get_text()
            # 匹配 FPS 模式: 24fps, 23.976fps, 25fps 等
            fps_match = re.search(r"(\d+\.?\d*)\s*fps", text, re.IGNORECASE)
            if fps_match:
                return f"{fps_match.group(1)}fps"
        except Exception:
            pass
        return None

    # ==================== 核心搜索逻辑（三层递进） ====================

    def _is_matching_season(self, season: int, title: str) -> bool:
        """判定该影视块标题是否属于目标季"""
        # 如果是>1季，标题通常包含"第X季"或"Season X"
        season_name_chn = _CHINESE_NUMBERS[season - 1] if 1 <= season <= len(_CHINESE_NUMBERS) else str(season)
        patterns = [
            f"第{season_name_chn}季",
            f"第{season}季",
            f"Season {season}",
            f"Season{season}",
            f"S{season:02d}",
        ]

        upper_title = title.upper()
        for p in patterns:
            if p.upper() in upper_title:
                return True

        # 对于第一季，通常标题中不包含"第X季"或"Season X"等字样
        if season == 1:
            if "季" not in title and "SEASON" not in upper_title:
                return True

        return False

    async def search(
        self,
        query: str,
        season: Optional[int] = None,
        episode: Optional[int] = None,
    ) -> List[SubtitleResult]:
        """搜索字幕，支持按季/集精确匹配

        采用三层递进匹配策略（参考 zimuku_for_kodi 逻辑）：
          第 1 层：直接在搜索结果页匹配指定集（S01E02 / 第1季第2集）
          第 2 层：进入匹配季的详情页，在字幕表格中匹配指定集
          第 3 层（兜底）：返回所有搜索到的字幕

        Args:
            query: 搜索关键词（影视名称）
            season: 季数（可选）
            episode: 集数（可选）
        """
        url = f"{self.search_url}{urllib.parse.quote(query)}"
        logger.info(f"正在搜索: {url}")

        html = await self._get_page(url)
        soup = BeautifulSoup(html, "html.parser")

        # 构造匹配关键字
        has_episode_info = season is not None and episode is not None
        s_e = ""  # 英文格式: S01E02
        s_e_cn = ""  # 中文格式: 第1季第2集
        if has_episode_info:
            s_e = f"S{season:02d}E{episode:02d}"
            s_e_cn = f"第{season}季第{episode}集"
            logger.info(f"将按季集匹配: {s_e} / {s_e_cn}")

        # ========== 第 1 层：直接在搜索结果中匹配指定集 (已弃用) ==========
        # 由于外层列表的 <tr> 有可能混杂不同季的单集字幕（如既有 S01E01 又有 S02E01 的外漏）
        # 且第一层的 <tr> 无法准确判断季号，直接匹配容易跨季串台。
        # 因此，为了保证季号绝对准确，我们直接进入第 2 层匹配，根据季的标识块来精确匹配。

        # ========== 第 2 层：进入匹配季的详情页搜索 ==========
        if has_episode_info:
            # 获取所有 "item prel clearfix" 块（每个代表一部影视作品）
            season_list = soup.find_all("div", class_="item prel clearfix")

            # 支持翻页搜索，最多处理 3 页
            page_list = soup.find("div", class_="pagination")
            if page_list:
                pages = page_list.find_all("a", class_="num")
                if len(pages) > 3:
                    logger.warning(f"搜索结果页数过多({len(pages)})，仅处理前 3 页")
                    pages = pages[:3]
                for page in pages:
                    page_url = urllib.parse.urljoin(self.base_url, page.get("href"))
                    try:
                        page_html = await self._get_page(page_url)
                        page_soup = BeautifulSoup(page_html, "html.parser")
                        season_list.extend(page_soup.find_all("div", class_="item prel clearfix"))
                    except Exception:
                        logger.error(f"获取分页 {page_url} 失败")

            for s in season_list:
                try:
                    b_tag = s.find("b")
                    if not b_tag:
                        continue
                    season_name = b_tag.text

                    if not self._is_matching_season(season, season_name):
                        continue

                    # 找到匹配季的块，进入其详情页
                    title_div = s.find("div", class_="title")
                    if not title_div or not title_div.a:
                        continue
                    detail_url = urllib.parse.urljoin(self.base_url, title_div.a.get("href"))
                    logger.info(f"进入季详情页搜索: {detail_url}")

                    detail_html = await self._get_page(detail_url)
                    detail_soup = BeautifulSoup(detail_html, "html.parser")
                    subs_box = detail_soup.find("div", class_="subs box clearfix")

                    if not subs_box or not subs_box.find("tbody"):
                        continue

                    subs = subs_box.find("tbody").find_all("tr")
                    subtitle_list = []
                    for sub in reversed(subs):
                        link_tag = sub.find("a")
                        if not link_tag:
                            continue
                        sub_name = link_tag.text.strip()
                        # 如果标题中包含对应该集的标识，说明单集字幕存在
                        if s_e in sub_name.upper() or s_e_cn in sub_name:
                            result = self._extract_sub_from_detail_page(sub)
                            if result:
                                subtitle_list.append(result)

                    if subtitle_list:
                        # 找到了单集的字幕，直接返回
                        logger.info(f"第 2 层匹配到季，并且找到了 {len(subtitle_list)} 条精确集的结果")
                        return self._double_filter(subtitle_list, season, episode)

                    # 如果匹配到了对应的季，但是其详情页内没有专门的单集字幕（比如只有全季打包）
                    # 那么我们将该季页面的*所有*字幕提取出来，交给后续打分逻辑（打分逻辑能识别季包）
                    logger.info("第 2 层匹配到季，但未找到精确集，提取该季下所有字幕作为候补季包")
                    for sub in reversed(subs):
                        result = self._extract_sub_from_detail_page(sub)
                        if result:
                            subtitle_list.append(result)

                    return self._double_filter(subtitle_list, season, episode)
                except Exception as e:
                    logger.error(f"处理季详情页时出错: {e}")
                    continue

        # ========== 第 3 层（兜底）：返回所有搜索到的字幕 ==========
        logger.info("未匹配到指定季集，执行兜底策略返回所有结果")
        results = []

        # 优先从搜索结果页的 <tr> 表格提取
        sub_items = soup.find_all("tr")
        for item in sub_items:
            result = self._extract_sub_from_search_page(item)
            if result:
                results.append(result)

        # 如果 <tr> 表格为空，尝试从 "item prel clearfix" 块中进入详情页提取
        if not results:
            season_list = soup.find_all("div", class_="item prel clearfix")
            for s in reversed(season_list):
                try:
                    title_div = s.find("div", class_="title")
                    if not title_div or not title_div.a:
                        continue
                    detail_url = urllib.parse.urljoin(self.base_url, title_div.a.get("href"))
                    detail_html = await self._get_page(detail_url)
                    detail_soup = BeautifulSoup(detail_html, "html.parser")
                    subs_box = detail_soup.find("div", class_="subs box clearfix")
                    if not subs_box or not subs_box.find("tbody"):
                        continue
                    subs = subs_box.find("tbody").find_all("tr")
                    for sub in reversed(subs):
                        result = self._extract_sub_from_detail_page(sub)
                        if result:
                            results.append(result)
                except Exception as e:
                    logger.error(f"兜底提取详情页字幕时出错: {e}")
                    continue

        return self._double_filter(results, season, episode)

    def _double_filter(
        self,
        subtitle_list: List[SubtitleResult],
        season: Optional[int],
        episode: Optional[int],
    ) -> List[SubtitleResult]:
        """二次过滤：用季集关键字再次筛选结果

        如果筛选后有结果则返回筛选结果，否则返回原列表（避免过滤过度导致无结果）。
        """
        if not subtitle_list:
            return subtitle_list

        # 构造过滤关键字
        filters = []
        if season is not None and episode is not None:
            filters.append(f"S{season:02d}E{episode:02d}")
        elif episode is not None:
            filters.append(f"E{episode:02d}")

        if not filters:
            return subtitle_list

        filtered = []
        for s in subtitle_list:
            title_upper = s.title.upper()
            if any(f in title_upper for f in filters):
                filtered.append(s)

        if filtered:
            logger.info(f"二次过滤 (keywords: {filters}) 后保留 {len(filtered)}/{len(subtitle_list)} 条结果")
            return filtered
        return subtitle_list

    # ==================== 下载相关方法 ====================

    async def get_download_page_links(self, detail_url: str) -> List[str]:
        """从详情页提取下载页面的真实下载链接

        参考 Kodi 插件逻辑：先进入详情页找到 <li class="dlsub"> 的链接，
        再进入下载列表页提取所有下载镜像链接。
        """
        logger.info(f"正在访问详情页: {detail_url}")
        html = await self._get_page(detail_url)
        soup = BeautifulSoup(html, "html.parser")

        # 从详情页提取下载列表页的 URL
        dld_li = soup.find("li", class_="dlsub")
        if dld_li and dld_li.a:
            dld_page_url = dld_li.a.get("href", "")
            if not dld_page_url.startswith(("http://", "https://")):
                dld_page_url = urllib.parse.urljoin(self.base_url, dld_page_url)
        else:
            # 备选方案：直接构造 /dld/ URL
            dld_page_url = detail_url.replace("/detail/", "/dld/")

        logger.info(f"正在访问下载列表页: {dld_page_url}")
        dld_html = await self._get_page(dld_page_url)
        dld_soup = BeautifulSoup(dld_html, "html.parser")

        download_links = []
        dld_div = dld_soup.find("div", class_="clearfix")
        if dld_div:
            links = dld_div.find_all("a")
            for a in links:
                href = a.get("href", "")
                if href:
                    full_url = urllib.parse.urljoin(self.base_url, href)
                    download_links.append(full_url)

        return download_links

    async def download_file(self, download_links: List[str], referer: str) -> Tuple[Optional[str], Optional[bytes]]:
        """多链接轮询下载字幕文件，带文件大小校验

        Zimuku 通常提供多个下载镜像，本方法逐个尝试直到成功。
        文件大小需超过 FILE_MIN_SIZE 阈值，除非两次下载得到相同大小（确认文件确实很小）。

        Args:
            download_links: 下载镜像链接列表
            referer: 引用页 URL，用于设置 Referer 头
        """
        ua = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
        headers = {
            "Referer": referer,
            "User-Agent": ua,
        }

        filename = None
        data = None
        small_size_confirmed = False
        last_data_size = -1

        for link in download_links:
            try:
                logger.info(f"正在下载字幕: {link}")
                response = await self.client.get(link, headers=headers)
                response.raise_for_status()

                # 从 Content-Disposition 获取文件名
                content_disposition = response.headers.get("Content-Disposition", "")
                if "filename=" in content_disposition:
                    match = re.search(r"filename=[\"']?([^\"';]+)[\"']?", content_disposition)
                    if match:
                        filename = match.group(1)

                if not filename:
                    filename = link.split("/")[-1]

                data = response.content
                # 检查文件大小：如果两次下载大小一致，说明文件确实很小（合理）
                small_size_confirmed = last_data_size == len(data)

                if len(data) > FILE_MIN_SIZE or small_size_confirmed:
                    # 修复文件名乱码
                    filename = self.fix_filename(filename)
                    logger.info(f"下载成功: {filename} ({len(data)} bytes)")
                    return filename, data
                else:
                    logger.warning(f"文件过小 ({len(data)} bytes < {FILE_MIN_SIZE})，尝试下一个镜像...")
                    last_data_size = len(data)

            except Exception as e:
                logger.warning(f"从 {link} 下载失败: {e}")
                filename = None

        # 所有链接都尝试过了
        if filename and data:
            if len(data) > FILE_MIN_SIZE or small_size_confirmed:
                filename = self.fix_filename(filename)
                return filename, data
            else:
                logger.error(f"文件已下载但太小: {filename} ({len(data)} bytes)")
                return None, None
        else:
            logger.error(f"所有下载链接均失败，referer: {referer}")
            return None, None

    def fix_filename(self, filename: str) -> str:
        """修复下载文件名可能存在的乱码 (CP437 -> GBK)"""
        try:
            return filename.encode("cp437").decode("gbk")
        except Exception:
            try:
                return urllib.parse.unquote(filename)
            except Exception:
                return filename

    async def close(self):
        await self.client.aclose()
