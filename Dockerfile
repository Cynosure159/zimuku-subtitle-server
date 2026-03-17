# Build stage for dependencies
FROM python:3.12-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libxml2-dev \
    libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (exclude dev-only packages)
RUN pip install --no-cache-dir \
    fastapi \
    uvicicorn \
    httpx \
    beautifulsoup4 \
    lxml \
    sqlmodel \
    python-multipart \
    pyyaml \
    py7zr \
    mcp

# Production stage
FROM python:3.12-slim

# Create non-root user
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
WORKDIR /app
COPY app/ app/
COPY storage/ storage/
COPY pyproject.toml .
COPY requirements.txt .
COPY run_mcp.py .

# Create storage directory with correct permissions
RUN mkdir -p /app/storage && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Run uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
