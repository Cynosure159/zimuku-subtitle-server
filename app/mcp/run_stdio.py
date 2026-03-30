import asyncio
import logging

from . import server

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(server.run())
