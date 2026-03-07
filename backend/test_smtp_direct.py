#!/usr/bin/env python
"""
Direct test of SMTP connection endpoint without relative imports
Run this from the backend directory: python test_smtp_direct.py
"""

import sys
import asyncio
import json
from pathlib import Path

# Add parent directory to path to handle imports
sys.path.insert(0, str(Path(__file__).parent))

import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Direct SMTP test without FastAPI
import ssl
import aiosmtplib

async def test_smtp_connection(host: str, port: int, username: str, password: str, use_tls: bool) -> dict:
    """Test SMTP connection directly"""
    logger.info(f"🔍 Testing SMTP connection to {host}:{port} (TLS: {use_tls})")
    logger.info(f"   Username: {username}")
    
    try:
        context = ssl.create_default_context() if use_tls else None
        logger.info(f"   SSL Context: {'created' if context else 'not created'}")
        
        logger.info(f"   Creating SMTP connection...")
        async with aiosmtplib.SMTP(
            hostname=host,
            port=port,
            use_tls=use_tls,
            tls_context=context
        ) as smtp:
            logger.info(f"   SMTP connection established")
            logger.info(f"   Attempting login with username: {username}")
            await smtp.login(username, password)
            logger.info(f"✅ SMTP login successful for {username}@{host}")
            return {"success": True, "message": "SMTP connection successful"}
    except Exception as e:
        error_msg = f"Connection failed: {str(e)}"
        logger.error(f"❌ {error_msg}", exc_info=True)
        return {"success": False, "message": error_msg}

async def main():
    print("\n" + "="*60)
    print("SMTP Connection Tests")
    print("="*60 + "\n")
    
    test_cases = [
        {
            "name": "Test 1: Invalid host (should fail - DNS error)",
            "host": "invalid-smtp-server-12345.example.com",
            "port": 587,
            "username": "test@example.com",
            "password": "password",
            "use_tls": True
        },
        {
            "name": "Test 2: Fake Gmail (should fail - auth error)",
            "host": "smtp.gmail.com",
            "port": 587,
            "username": "nonexistent.user.12345@gmail.com",
            "password": "fakepassword123456",
            "use_tls": True
        },
        {
            "name": "Test 3: Localhost port 25 (should fail - connection refused)",
            "host": "localhost",
            "port": 25,
            "username": "test",
            "password": "test",
            "use_tls": False
        },
        {
            "name": "Test 4: Mailtrap test service (may work or fail based on availability)",
            "host": "sandbox.smtp.mailtrap.io",
            "port": 2525,
            "username": "api",
            "password": "api",
            "use_tls": True
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{test_case['name']}")
        print("-" * 60)
        
        result = await test_smtp_connection(
            test_case["host"],
            test_case["port"],
            test_case["username"],
            test_case["password"],
            test_case["use_tls"]
        )
        
        print(f"Result: {json.dumps(result, indent=2)}")
        print()
    
    print("="*60)
    print("Testing complete!")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
