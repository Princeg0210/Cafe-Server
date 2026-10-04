#!/usr/bin/env python3
"""
Comprehensive Production Database Verification Suite (Render -> Neon)
Read-Only Deep Semantic & Deterministic Content Comparison

Intentional migration-003 awareness:
  - Neon has alembic_version = 003_dough_production_schema; Render has no
    alembic_version table.  This is expected and does NOT count as a failure.
  - alembic_version is excluded from the application table-set comparison.
  - Two CHECK constraints added by migration 003 exist only on Neon:
      daily_production_rules.check_daily_dough_limit_non_negative
      daily_production_rules.check_daily_allocated_dough_non_negative
    These are accepted as intentional and do NOT count as failures.
  - PostgreSQL may render logically-equivalent CHECK expressions differently
    (cast formatting).  Expressions are normalised before comparison.
"""
import asyncio
import hashlib
import re
import sys
from typing import Dict, Set, Any
import asyncpg

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NEON_EXPECTED_ALEMBIC = "003_dough_production_schema"
ALEMBIC_TABLE = "alembic_version"

# (table, constraint_name) pairs that are intentionally only on Neon
MIGRATION_003_NEON_ONLY_CONSTRAINTS: Set[tuple] = {
    ("daily_production_rules", "check_daily_dough_limit_non_negative"),
    ("daily_production_rules", "check_daily_allocated_dough_non_negative"),
}


# ---------------------------------------------------------------------------
# CHECK-clause normaliser
# ---------------------------------------------------------------------------

def _normalize_check(expr: str | None) -> str | None:
    """
    Strip PostgreSQL parser-only cast/parenthesis differences so that
    logically-equivalent CHECK expressions compare equal.

    Handles:
      'FOO'::character varying        -> 'FOO'
      ('FOO'::character varying)::text -> 'FOO'
      'FOO'::text                     -> 'FOO'
      ARRAY[...]::text[]              -> ARRAY[...]
      ANY ((ARRAY[...]))              -> ANY (ARRAY[...])   [PG16 vs PG18]
    Then collapses whitespace and strips redundant outer double-parens.
    """
    if expr is None:
        return None
    s = expr

    # Remove trailing ::text[] on ARRAY literals
    s = re.sub(r"::\s*text\[\]", "", s)

    # ('FOO'::character varying)::text  ->  'FOO'
    s = re.sub(
        r"\(\s*('[^']*')\s*::\s*(?:character varying|varchar|text)\s*\)\s*::\s*text",
        r"\1",
        s,
    )
    # 'FOO'::character varying  ->  'FOO'
    s = re.sub(r"('[^']*')\s*::\s*(?:character varying|varchar|text)", r"\1", s)

    # Collapse whitespace
    s = re.sub(r"\s+", " ", s).strip()

    # Collapse inner double-parens: ((expr)) -> (expr) where expr has no parens.
    # Handles differences like ANY ((ARRAY[...])) vs ANY (ARRAY[...]) between
    # PostgreSQL 16 and 18. Apply iteratively until stable.
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"\(\(([^()]*)\)\)", r"(\1)", s)

    # Strip redundant outer double-parens: ((expr)) -> (expr), repeatedly
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"^\(\s*\((.+)\)\s*\)$", r"(\1)", s)

    return s


# ---------------------------------------------------------------------------
# Metadata collector
# ---------------------------------------------------------------------------

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
    # Application tables exclude alembic_version (absent on legacy Render)
    metadata["app_tables"] = metadata["tables"] - {ALEMBIC_TABLE}

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
                # Normalise CHECK expressions to remove formatting-only differences
                "check_clause": _normalize_check(r["check_clause"]),
            }
        if r["column_name"] and r["column_name"] not in c_map[t][cname]["columns"]:
            c_map[t][cname]["columns"].append(r["column_name"])
        if r["foreign_column_name"] and r["foreign_column_name"] not in c_map[t][cname]["foreign_columns"]:
            c_map[t][cname]["foreign_columns"].append(r["foreign_column_name"])
    # Sort foreign_columns for deterministic comparison — constraint_column_usage
    # does not guarantee ordering, and for UNIQUE/CHECK the order is irrelevant.
    for t in c_map:
        for cname in c_map[t]:
            c_map[t][cname]["foreign_columns"].sort()
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


def _constraints_equal_with_migration003_tolerance(
    table: str,
    r_constraints: Dict,
    n_constraints: Dict,
) -> tuple[bool, str]:
    """
    Compare constraint dicts for one table.
    Tolerances (do NOT count as failures):
      - Neon has extra constraints listed in MIGRATION_003_NEON_ONLY_CONSTRAINTS.
      - CHECK expressions are already normalised by _normalize_check().
    All other differences are failures.
    Returns (ok, detail_string).
    """
    r_names = set(r_constraints.keys())
    n_names = set(n_constraints.keys())

    # Extra on Neon: only allowed if in migration-003 allowlist
    extra_on_neon = n_names - r_names
    unexpected_extra = {
        cname for cname in extra_on_neon
        if (table, cname) not in MIGRATION_003_NEON_ONLY_CONSTRAINTS
    }
    if unexpected_extra:
        return False, f"unexpected extra constraints on Neon: {unexpected_extra}"

    # Missing on Neon: never tolerated
    missing_on_neon = r_names - n_names
    if missing_on_neon:
        return False, f"constraints missing on Neon: {missing_on_neon}"

    # Compare shared constraints
    for cname in r_names & n_names:
        rc = r_constraints[cname]
        nc = n_constraints[cname]
        if rc != nc:
            return False, f"constraint '{cname}' differs: Source={rc} Neon={nc}"

    return True, ""


async def run_deep_verification(source_dsn: str, neon_dsn: str) -> int:
    print("===================================================================")
    print("🔍 RUNNING HARDENED READ-ONLY DEEP DATABASE VERIFICATION")
    print("===================================================================\n")

    r_conn = await asyncpg.connect(source_dsn)
    n_conn = await asyncpg.connect(neon_dsn)

    try:
        r_meta = await get_db_metadata(r_conn)
        n_meta = await get_db_metadata(n_conn)

        failures = 0

        # ── 1. ALEMBIC ──────────────────────────────────────────────────────
        print("--- 1. ALEMBIC MIGRATION REVISION ---")
        r_alembic = r_meta["alembic_version"]
        n_alembic = n_meta["alembic_version"]
        if r_alembic is None and n_alembic == NEON_EXPECTED_ALEMBIC:
            print(
                f"  [PASS] Neon Alembic metadata is intentionally stamped at "
                f"{NEON_EXPECTED_ALEMBIC}. "
                f"Legacy Render database had no Alembic tracking (expected)."
            )
        elif r_alembic == n_alembic:
            print(f"  [PASS] Both at revision: {r_alembic}")
        else:
            print(f"  [FAIL] Source: {r_alembic} != Neon: {n_alembic}")
            failures += 1

        # ── 2. EXTENSIONS ───────────────────────────────────────────────────
        print("\n--- 2. EXTENSIONS AUDIT ---")
        r_ext = r_meta["extensions"]
        n_ext = n_meta["extensions"]
        ext_fails = 0
        for ext, ver in r_ext.items():
            if ext in n_ext and n_ext[ext] == ver:
                print(f"  [PASS] {ext} (v{ver}) matches.")
            else:
                print(f"  [FAIL] Extension '{ext}': Source v{ver} vs Neon v{n_ext.get(ext)}")
                ext_fails += 1
                failures += 1
        extra_exts = set(n_ext.keys()) - set(r_ext.keys())
        if extra_exts:
            print(f"  [INFO] Extra extensions on Neon only (informational): {extra_exts}")
        if ext_fails == 0:
            print("  [PASS] All required extensions match.")

        # ── 3. TABLE SET (application tables only) ──────────────────────────
        print("\n--- 3. TABLE SET COMPARISON (APPLICATION TABLES, BIDIRECTIONAL) ---")
        r_app = r_meta["app_tables"]
        n_app = n_meta["app_tables"]
        missing_on_neon = r_app - n_app
        extra_on_neon = n_app - r_app
        print(f"  Source Application Tables: {len(r_app)}")
        print(f"  Neon   Application Tables: {len(n_app)}")
        print(
            f"  (alembic_version excluded from comparison — "
            f"intentionally absent on source, present on Neon)"
        )
        if missing_on_neon:
            print(f"  [FAIL] Missing on Neon: {missing_on_neon}")
            failures += 1
        if extra_on_neon:
            print(f"  [FAIL] Unexpected extra tables on Neon: {extra_on_neon}")
            failures += 1
        if not missing_on_neon and not extra_on_neon:
            print(f"  [PASS] Both environments have identical {len(r_app)} application tables.")

        # Shared application tables for downstream checks
        shared = sorted(r_app & n_app)

        # ── 4. COLUMNS & DATA TYPES ─────────────────────────────────────────
        print("\n--- 4. COLUMN & DATA TYPE VERIFICATION ---")
        col_fails = 0
        for t in shared:
            r_cols = r_meta["columns"].get(t, {})
            n_cols = n_meta["columns"].get(t, {})
            if r_cols != n_cols:
                print(f"  [FAIL] Table '{t}' column mismatch!")
                col_fails += 1
                failures += 1
        if col_fails == 0:
            print("  [PASS] All column names, positions, types, and defaults match 1-to-1.")

        # ── 5. SEQUENCES ────────────────────────────────────────────────────
        print("\n--- 5. SEQUENCES & CURRENT VALUES ---")
        r_seqs = r_meta["sequences"]
        n_seqs = n_meta["sequences"]
        if set(r_seqs.keys()) != set(n_seqs.keys()):
            missing_seq = set(r_seqs.keys()) - set(n_seqs.keys())
            extra_seq   = set(n_seqs.keys()) - set(r_seqs.keys())
            if missing_seq:
                print(f"  [FAIL] Sequences missing on Neon: {missing_seq}")
            if extra_seq:
                print(f"  [FAIL] Unexpected extra sequences on Neon: {extra_seq}")
            failures += 1
        else:
            seq_fails = 0
            for sname, sinfo in r_seqs.items():
                ninfo = n_seqs.get(sname, {})
                if sinfo != ninfo:
                    print(f"  [FAIL] Sequence '{sname}': Source {sinfo} vs Neon {ninfo}")
                    seq_fails += 1
                    failures += 1
            if seq_fails == 0:
                print(f"  [PASS] All {len(r_seqs)} sequences and last_value positions match 1-to-1.")

        # ── 6. SEMANTIC CONSTRAINTS ─────────────────────────────────────────
        print("\n--- 6. SEMANTIC CONSTRAINTS (PK, FK, UNIQUE, CHECK) ---")
        c_fails = 0
        for t in shared:
            r_c = r_meta["constraints"].get(t, {})
            n_c = n_meta["constraints"].get(t, {})
            ok, detail = _constraints_equal_with_migration003_tolerance(t, r_c, n_c)
            if not ok:
                print(f"  [FAIL] Table '{t}' constraint mismatch — {detail}")
                c_fails += 1
                failures += 1
        if c_fails == 0:
            print(
                "  [PASS] All PKs, FKs, UNIQUE & CHECK constraints match "
                "(migration-003 additions on Neon accepted as intentional)."
            )

        # ── 7. INDEXES ──────────────────────────────────────────────────────
        print("\n--- 7. INDEX DEFINITIONS & PARTIAL PREDICATES ---")
        idx_fails = 0
        for t in shared:
            r_idx = r_meta["indexes"].get(t, {})
            n_idx = n_meta["indexes"].get(t, {})
            if r_idx != n_idx:
                print(f"  [FAIL] Table '{t}' index definitions mismatch!")
                idx_fails += 1
                failures += 1
        if idx_fails == 0:
            print("  [PASS] All index definitions (methods, unique, expressions, partial predicates) match.")

        # ── 8. ROW COUNTS & DETERMINISTIC HASHES ───────────────────────────
        print("\n--- 8. DETERMINISTIC ROW-CONTENT & HASH COMPARISON ---")
        hash_fails = 0
        for t in shared:
            rc = r_meta["row_counts"][t]
            nc = n_meta["row_counts"][t]
            rh = r_meta["content_hashes"][t]
            nh = n_meta["content_hashes"][t]
            if rc != nc or rh != nh:
                print(
                    f"  [FAIL] Table '{t}': "
                    f"Source ({rc} rows, hash {rh}) vs Neon ({nc} rows, hash {nh})"
                )
                hash_fails += 1
                failures += 1
            else:
                print(f"  [PASS] Table '{t}': {rc} rows verified. Hash: {rh}")

        # ── FINAL RESULT ────────────────────────────────────────────────────
        print("\n===================================================================")
        if failures == 0:
            print("🟢 RESULT: PASS — Render and Neon are consistent")
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
