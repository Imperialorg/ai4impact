"""
Civix-Pulse — Pinecone + PostgreSQL Connectivity Test
=====================================================
Tests real connectivity to external services.
"""

import os
import sys
import asyncio

from dotenv import load_dotenv
load_dotenv()

PASS = "  ✅"
FAIL = "  ❌"


def test_pinecone():
    print("=" * 60)
    print("  PINECONE CONNECTIVITY TEST")
    print("=" * 60)

    api_key = os.environ.get("PINECONE_API_KEY", "")
    index_name = os.environ.get("PINECONE_INDEX_NAME", "")

    key_display = api_key[:8] + "..." if len(api_key) > 8 else "(not set)"
    print(f"  API Key:    {key_display}")
    print(f"  Index Name: {index_name or '(not set)'}")

    if not api_key:
        print(f"{FAIL} PINECONE_API_KEY not set in .env")
        return False

    try:
        from pinecone import Pinecone
        pc = Pinecone(api_key=api_key)
        indexes = pc.list_indexes()
        names = [idx.name for idx in indexes]
        print(f"{PASS} Connected to Pinecone")
        print(f"  Indexes:    {names}")

        if not index_name:
            print(f"{FAIL} PINECONE_INDEX_NAME not set")
            return False

        if index_name in names:
            idx = pc.Index(index_name)
            stats = idx.describe_index_stats()
            print(f"{PASS} Index '{index_name}' exists")
            print(f"  Vectors:    {stats.total_vector_count}")
            print(f"  Dimension:  {stats.dimension}")

            # Test a query with a dummy vector
            dim = stats.dimension or 1536
            dummy_vec = [0.0] * dim
            result = idx.query(vector=dummy_vec, top_k=1)
            print(f"{PASS} Query works (returned {len(result.matches)} matches)")
            return True
        else:
            print(f"{FAIL} Index '{index_name}' not found. Available: {names}")
            return False

    except Exception as e:
        print(f"{FAIL} Pinecone error: {e}")
        return False


def test_postgres():
    print()
    print("=" * 60)
    print("  POSTGRESQL CONNECTIVITY TEST")
    print("=" * 60)

    pg_url = os.environ.get("POSTGRES_URL", "")
    if not pg_url:
        print(f"  POSTGRES_URL: (not set)")
        print(f"{FAIL} PostgreSQL not configured in .env")
        print(f"  Note: schema.sql is ready at backend/database/schema.sql")
        print(f"  Install PostgreSQL + PostGIS, then add POSTGRES_URL to .env")
        return False

    display = pg_url.split("@")[-1] if "@" in pg_url else pg_url[:40]
    print(f"  POSTGRES_URL: ...@{display}")

    try:
        import asyncpg

        async def check():
            conn = await asyncpg.connect(pg_url)
            version = await conn.fetchval("SELECT version()")
            print(f"{PASS} Connected to PostgreSQL")
            print(f"  Version: {version[:60]}")

            # Check PostGIS
            try:
                postgis = await conn.fetchval("SELECT PostGIS_Version()")
                print(f"{PASS} PostGIS enabled: {postgis}")
            except Exception:
                print(f"{FAIL} PostGIS extension not installed")

            # Check if schema is applied
            tables = await conn.fetch(
                "SELECT tablename FROM pg_tables WHERE schemaname='public'"
            )
            table_names = [t["tablename"] for t in tables]
            print(f"  Tables: {table_names}")

            expected = ["officers", "pulse_events", "dispatch_log"]
            missing = [t for t in expected if t not in table_names]
            if missing:
                print(f"{FAIL} Missing tables: {missing}")
                print(f"  Run: psql $POSTGRES_URL -f backend/database/schema.sql")
            else:
                print(f"{PASS} All schema tables present")

                # Check officer count
                count = await conn.fetchval("SELECT COUNT(*) FROM officers")
                print(f"  Officers: {count}")
                if count == 0:
                    print(f"  Note: Run seed_officers.py to populate test data")

            await conn.close()
            return len(missing) == 0

        return asyncio.run(check())

    except Exception as e:
        print(f"{FAIL} PostgreSQL error: {e}")
        return False


if __name__ == "__main__":
    print()
    pc_ok = test_pinecone()
    pg_ok = test_postgres()

    print()
    print("=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    print(f"  Pinecone:   {'✅ CONNECTED' if pc_ok else '❌ NOT READY'}")
    print(f"  PostgreSQL: {'✅ CONNECTED' if pg_ok else '❌ NOT READY'}")
    print("=" * 60)
    print()

    sys.exit(0 if (pc_ok and pg_ok) else 1)
