"""
Civix-Pulse — Seed Script for PostGIS Officers Table
=====================================================
Populates the officers table with 20 dummy field officers
scattered around Hyderabad for testing the dispatch engine.

Usage:
    python seed_officers.py
"""

import os
import random
import asyncio

import asyncpg
from dotenv import load_dotenv

load_dotenv()

POSTGRES_URL = os.environ.get(
    "POSTGRES_URL", "postgresql://civix:civix_dev@localhost:5432/civix_pulse"
)

# 20 dummy officers across Hyderabad
OFFICERS = [
    {"id": "OP-101", "name": "Arun Sharma", "skills": ["MUNICIPAL", "WATER"], "lat": 17.3850, "lng": 78.4867},
    {"id": "OP-102", "name": "Priya Reddy", "skills": ["TRAFFIC"], "lat": 17.4400, "lng": 78.3480},
    {"id": "OP-103", "name": "Vikram Singh", "skills": ["ELECTRICITY"], "lat": 17.4260, "lng": 78.4530},
    {"id": "OP-104", "name": "Meena Kumari", "skills": ["MUNICIPAL", "TRAFFIC"], "lat": 17.3610, "lng": 78.4740},
    {"id": "OP-105", "name": "Rajesh Patel", "skills": ["WATER"], "lat": 17.4950, "lng": 78.3910},
    {"id": "OP-201", "name": "Sunita Devi", "skills": ["MUNICIPAL"], "lat": 17.4100, "lng": 78.4100},
    {"id": "OP-202", "name": "Manoj Kumar", "skills": ["ELECTRICITY", "MUNICIPAL"], "lat": 17.4482, "lng": 78.3914},
    {"id": "OP-203", "name": "Fatima Begum", "skills": ["TRAFFIC", "MUNICIPAL"], "lat": 17.3960, "lng": 78.5020},
    {"id": "OP-204", "name": "Ravi Teja", "skills": ["WATER", "MUNICIPAL"], "lat": 17.4380, "lng": 78.4680},
    {"id": "OP-205", "name": "Anjali Nair", "skills": ["ELECTRICITY"], "lat": 17.3720, "lng": 78.4350},
    {"id": "OP-301", "name": "Suresh Babu", "skills": ["MUNICIPAL", "WATER"], "lat": 17.4560, "lng": 78.3630},
    {"id": "OP-302", "name": "Lakshmi Rao", "skills": ["TRAFFIC"], "lat": 17.4190, "lng": 78.5230},
    {"id": "OP-303", "name": "Kiran Reddy", "skills": ["MUNICIPAL"], "lat": 17.4820, "lng": 78.4100},
    {"id": "OP-304", "name": "Deepa Joshi", "skills": ["ELECTRICITY", "WATER"], "lat": 17.3530, "lng": 78.4960},
    {"id": "OP-305", "name": "Ramesh Yadav", "skills": ["TRAFFIC", "MUNICIPAL"], "lat": 17.4670, "lng": 78.3740},
    {"id": "OP-441", "name": "Raj Kumar", "skills": ["MUNICIPAL", "TRAFFIC", "WATER", "ELECTRICITY"], "lat": 17.4501, "lng": 78.3900},
    {"id": "OP-512", "name": "Sai Krishna", "skills": ["WATER"], "lat": 17.4030, "lng": 78.4570},
    {"id": "OP-227", "name": "Nandini Gupta", "skills": ["MUNICIPAL", "ELECTRICITY"], "lat": 17.4310, "lng": 78.3850},
    {"id": "OP-318", "name": "Arjun Mehta", "skills": ["TRAFFIC"], "lat": 17.3880, "lng": 78.4200},
    {"id": "OP-663", "name": "Pooja Sharma", "skills": ["MUNICIPAL", "WATER"], "lat": 17.4150, "lng": 78.5100},
]


async def seed() -> None:
    conn = await asyncpg.connect(POSTGRES_URL)
    try:
        for off in OFFICERS:
            await conn.execute(
                """
                INSERT INTO officers (officer_id, name, domain_skills, status, location, updated_at)
                VALUES ($1, $2, $3, 'AVAILABLE',
                        ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
                        NOW())
                ON CONFLICT (officer_id) DO UPDATE
                    SET name = EXCLUDED.name,
                        domain_skills = EXCLUDED.domain_skills,
                        location = EXCLUDED.location,
                        status = 'AVAILABLE',
                        updated_at = NOW()
                """,
                off["id"],
                off["name"],
                off["skills"],
                off["lng"],  # ST_MakePoint takes (lng, lat)
                off["lat"],
            )
            print(f"  ✓ {off['id']} — {off['name']} ({', '.join(off['skills'])})")

        count = await conn.fetchval("SELECT COUNT(*) FROM officers")
        print(f"\n✅ Seeded {count} officers into PostGIS database.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
