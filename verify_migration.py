#!/usr/bin/env python3
"""
Comprehensive Production Database Verification Suite (Render -> Neon)
Read-Only Deep Semantic & Deterministic Content Comparison
"""
import asyncio
import hashlib
import sys
from typing import Dict, List, Set, Any
import asyncpg


async def get_db_metadata(conn: asyncpg.Connection) -> Dict[str, Any]:
    metadata = {}
    
    # 1. Version
    metadata["version"] = await conn.fetchval("SELECT version();")
    
    # 2. Extensions
    exts = await conn.fetch("SELECT extname, extversion FROM pg_extension ORDER BY extname;")
    metadata["extensions"] = {r["extname"]: r["extversion"] for r in exts}
    
    # 3. Alembic Version
    try:
        metadata["alembic_version"] = await conn.fetchval("SELECT version_num FROM alembic_version;")
    except Exception:
        metadata["alembic_version"] = None

    # 4. Public Base Tables
    tables_rows = await conn.fetch("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    tables = [r["table_name"] for r in tables_rows]
    metadata["tables"] = set(tables)

    # 5. Columns & Data Types per Table
    columns_rows = await conn.fetch("""
        SELECT table_name, column_name, ordinal_position, is_nullable, data_type, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
    """)
    cols_map = {}
    for r in columns_rows:
        t = r["table_name"]
        if t not in cols_map:
            cols_map[t] = {}
        cols_map[t][r["column_name"]] = {
            "position": r["ordinal_position"],
            "nullable": r["is_nullable"],
            "type": r["data_type"],
            "default": r["column_default"],
        }
    metadata["columns"] = cols_map

    # 6. Sequences & Properties
    seqs_rows = await conn.fetch("""
        SELECT sequence_name, data_type, start_value, minimum_value, maximum_value, increment
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
        ORDER BY sequence_name;
    """)
    seq_map = {}
    for r in seqs_rows:
        sname = r["sequence_name"]
        try:
            last_val = await conn.fetchval(f'SELECT last_value FROM "{sname}";')
        except Exception:
            last_val = None
        seq_map[sname] = {
            "type": r["data_type"],
            "start": r["start_value"],
            "increment": r["increment"],
            "last_value": last_val
        }
    metadata["sequences"] = seq_map

    # 7. Semantic Constraints (PK, FK, Unique, Check)
    constraints_rows = await conn.fetch("""
        SELECT 
            tc.table_name,
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            cc.check_clause
        FROM information_schema.table_constraints AS tc
        LEFT JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        LEFT JOIN information_schema.check_constraints AS cc
          ON cc.constraint_name = tc.constraint_name
          AND cc.constraint_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;
    """)
    c_map = {}
    for r in constraints_rows:
        t = r["table_name"]
        cname = r["constraint_name"]
        ctype = r["constraint_type"]
        if t not in c_map:
            c_map[t] = {}
        if cname not in c_map[t]:
            c_map[t][cname] = {
                "type": ctype,
                "columns": [],
                "foreign_table": r["foreign_table_name"],
                "foreign_columns": [],
                "check_clause": r["check_clause"]
            }
        if r["column_name"] and r["column_name"] not in c_map[t][cname]["columns"]:
            c_map[t][cname]["columns"].append(r["column_name"])
        if r["foreign_column_name"] and r["foreign_column_name"] not in c_map[t][cname]["foreign_columns"]:
            c_map[t][cname]["foreign_columns"].append(r["foreign_column_name"])
    metadata["constraints"] = c_map

    # 8. Indexes (Method, Unique, Columns, Predicates)
    idx_rows = await conn.fetch("""
        SELECT 
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
    """)
    idx_map = {}
    for r in idx_rows:
        t = r["tablename"]
        iname = r["indexname"]
        if t not in idx_map:
            idx_map[t] = {}
        idx_map[t][iname] = r["indexdef"]
    metadata["indexes"] = idx_map

    # 9. Deterministic Content Hashes & Primary Key Mapping
    hashes = {}
    counts = {}
    pk_sets = {}

    for t in tables:
        cnt = await conn.fetchval(f'SELECT COUNT(*) FROM "{t}";')
        counts[t] = cnt

        # Find primary key column(s)
        pks = []
        if t in c_map:
            for cname, cinfo in c_map[t].items():
                if cinfo["type"] == "PRIMARY KEY":
                    pks = cinfo["columns"]
                    break

        if pks:
            pk_cols = ", ".join([f'"{pk}"' for pk in pks])
            pk_rows = await conn.fetch(f'SELECT {pk_cols} FROM "{t}" ORDER BY {pk_cols};')
            pk_sets[t] = set(tuple(r.values()) if len(pks) > 1 else r[pks[0]] for r in pk_rows)

            # Deterministic hash of table rows ordered by PK
            all_cols = sorted(cols_map.get(t, {}).keys())
            cols_select = ", ".join([f'"{c}"' for c in all_cols])
            rows = await conn.fetch(f'SELECT md5(to_jsonb(t_sub)::text) FROM (SELECT {cols_select} FROM "{t}" ORDER BY {pk_cols}) t_sub;')
            table_hash = hashlib.md5("".join([r[0] or "" for r in rows]).encode("utf-8")).hexdigest()
            hashes[t] = table_hash
        else:
            pk_sets[t] = set()
            all_cols = sorted(cols_map.get(t, {}).keys())
            if all_cols:
                cols_select = ", ".join([f'"{c}"' for c in all_cols])
                rows = await conn.fetch(f'SELECT md5(to_jsonb(t_sub)::text) FROM (SELECT {cols_select} FROM "{t}" ORDER BY {cols_select}) t_sub;')
                sorted_hashes = sorted([r[0] or "" for r in rows])
                table_hash = hashlib.md5("".join(sorted_hashes).encode("utf-8")).hexdigest()
                hashes[t] = table_hash
            else:
                hashes[t] = hashlib.md5(b"").hexdigest()

    metadata["row_counts"] = counts
    metadata["pk_sets"] = pk_sets
    metadata["content_hashes"] = hashes

    return metadata


async def run_deep_verification(render_dsn: str, neon_dsn: str):
    print("===================================================================")
    print("🔍 RUNNING HARDENED READ-ONLY DEEP DATABASE VERIFICATION")
    print("===================================================================\n")

    r_conn = await asyncpg.connect(render_dsn)
    n_conn = await asyncpg.connect(neon_dsn)

    try:
        r_meta = await get_db_metadata(r_conn)
        n_meta = await get_db_metadata(n_conn)

        failures = 0

        # A. Alembic Version
        print(f"--- 1. ALEMBIC MIGRATION REVISION ---")
        if r_meta["alembic_version"] == n_meta["alembic_version"]:
            print(f"  [PASS] Render: {r_meta['alembic_version']} == Neon: {n_meta['alembic_version']}")
        else:
            print(f"  [FAIL] Render: {r_meta['alembic_version']} != Neon: {n_meta['alembic_version']}")
            failures += 1

        # B. Extensions
        print(f"\n--- 2. EXTENSIONS AUDIT ---")
        r_ext = r_meta["extensions"]
        n_ext = n_meta["extensions"]
        for ext, ver in r_ext.items():
            if ext in n_ext and n_ext[ext] == ver:
                print(f"  [PASS] {ext} (v{ver}) matches.")
            else:
                print(f"  [FAIL] Extension {ext}: Render v{ver} vs Neon v{n_ext.get(ext)}")
                failures += 1
        extra_exts = set(n_ext.keys()) - set(r_ext.keys())
        if extra_exts:
            print(f"  [INFO] Extra extensions on Neon (Not on Render): {extra_exts}")

        # C. Table Set Comparison (Bidirectional)
        print(f"\n--- 3. TABLE SET COMPARISON (BIDIRECTIONAL) ---")
        r_tables = r_meta["tables"]
        n_tables = n_meta["tables"]
        missing_on_neon = r_tables - n_tables
        extra_on_neon = n_tables - r_tables
        print(f"  Render Base Tables Count: {len(r_tables)}")
        print(f"  Neon Base Tables Count:   {len(n_tables)}")
        
        if missing_on_neon:
            print(f"  [FAIL] Missing on Neon: {missing_on_neon}")
            failures += 1
        if extra_on_neon:
            print(f"  [FAIL] Extra on Neon: {extra_on_neon}")
            failures += 1
        if not missing_on_neon and not extra_on_neon:
            print(f"  [PASS] Both environments have identical {len(r_tables)} base tables.")

        # D. Columns & Data Types
        print(f"\n--- 4. COLUMN & DATA TYPE VERIFICATION ---")
        col_diffs = 0
        for t in sorted(r_tables.intersection(n_tables)):
            r_cols = r_meta["columns"].get(t, {})
            n_cols = n_meta["columns"].get(t, {})
            if r_cols != n_cols:
                print(f"  [FAIL] Table '{t}' column mismatch!")
                col_diffs += 1
                failures += 1
        if col_diffs == 0:
            print(f"  [PASS] All column names, positions, types, and defaults match 1-to-1.")

        # E. Sequences Comparison
        print(f"\n--- 5. SEQUENCES & CURRENT VALUES ---")
        r_seqs = r_meta["sequences"]
        n_seqs = n_meta["sequences"]
        if set(r_seqs.keys()) != set(n_seqs.keys()):
            print(f"  [FAIL] Sequence name mismatch! Missing: {set(r_seqs.keys()) - set(n_seqs.keys())}")
            failures += 1
        else:
            seq_fails = 0
            for sname, sinfo in r_seqs.items():
                ninfo = n_seqs.get(sname, {})
                if sinfo != ninfo:
                    print(f"  [FAIL] Sequence '{sname}': Render {sinfo} vs Neon {ninfo}")
                    seq_fails += 1
                    failures += 1
            if seq_fails == 0:
                print(f"  [PASS] All {len(r_seqs)} sequences and last_value positions match 1-to-1.")

        # F. Semantic Constraints Comparison
        print(f"\n--- 6. SEMANTIC CONSTRAINTS (PK, FK, UNIQUE, CHECK) ---")
        c_fails = 0
        for t in sorted(r_tables.intersection(n_tables)):
            r_c = r_meta["constraints"].get(t, {})
            n_c = n_meta["constraints"].get(t, {})
            if r_c != n_c:
                print(f"  [FAIL] Table '{t}' constraint semantic mismatch!")
                c_fails += 1
                failures += 1
        if c_fails == 0:
            print(f"  [PASS] All Primary Keys, Foreign Keys, Unique & Check constraints match semantically.")

        # G. Indexes Comparison
        print(f"\n--- 7. INDEX DEFINITIONS & PARTIAL PREDICATES ---")
        idx_fails = 0
        for t in sorted(r_tables.intersection(n_tables)):
            r_idx = r_meta["indexes"].get(t, {})
            n_idx = n_meta["indexes"].get(t, {})
            if r_idx != n_idx:
                print(f"  [FAIL] Table '{t}' index definitions mismatch!")
                idx_fails += 1
                failures += 1
        if idx_fails == 0:
            print(f"  [PASS] All index definitions (methods, unique, expressions, partial predicates) match.")

        # H. Row Counts & Deterministic Content Hash Comparison
        print(f"\n--- 8. DETERMINISTIC ROW-CONTENT & HASH COMPARISON ---")
        hash_fails = 0
        for t in sorted(r_tables.intersection(n_tables)):
            rc = r_meta["row_counts"][t]
            nc = n_meta["row_counts"][t]
            rh = r_meta["content_hashes"][t]
            nh = n_meta["content_hashes"][t]

            if rc != nc or rh != nh:
                print(f"  [FAIL] Table '{t}': Render ({rc} rows, hash {rh}) vs Neon ({nc} rows, hash {nh})")
                hash_fails += 1
                failures += 1
            else:
                print(f"  [PASS] Table '{t}': {rc} rows verified. Hash: {rh}")

        print("\n===================================================================")
        if failures == 0:
            print("🟢 RESULT: PASS — 100% IDENTICAL SCHEMAS, CONSTRAINTS & DATA CONTENT")
        else:
            print(f"🔴 RESULT: FAIL — {failures} INCONSISTENCIES DETECTED")
        print("===================================================================")
        return failures

    finally:
        await r_conn.close()
        await n_conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python verify_migration.py <SOURCE_DSN> <NEON_DSN>")
        sys.exit(1)
    failure_count = asyncio.run(run_deep_verification(sys.argv[1], sys.argv[2]))
    sys.exit(0 if (failure_count is None or failure_count == 0) else 1)
