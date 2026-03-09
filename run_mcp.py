import asyncio
import logging

from app.mcp import server

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(server.run())
