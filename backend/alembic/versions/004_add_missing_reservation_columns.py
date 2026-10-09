"""sync_missing_schema_columns

Revision ID: 004_reservation_cols
Revises: 003_dough_production_schema
Create Date: 2026-10-09 19:50:00.000000

Columns synchronized:
  - reservations: is_deposit_credited, credited_bill_id, cancellation_refund_amount, cancellation_refund_status
  - dining_sessions: reservation_id
  - bills: reservation_deposit_paid, reservation_credit, remainder_action, remainder_amount
  - verified_bank_credits: event_id, raw_event_payload, review_reason
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '004_reservation_cols'
down_revision: Union[str, None] = '003_dough_production_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    # 1. reservations
    conn.execute(sa.text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_deposit_credited BOOLEAN DEFAULT FALSE NOT NULL;"))
    conn.execute(sa.text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS credited_bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL;"))
    conn.execute(sa.text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_refund_amount NUMERIC(10, 2) DEFAULT 0.00;"))
    conn.execute(sa.text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_refund_status VARCHAR(30);"))

    # 2. dining_sessions
    conn.execute(sa.text("ALTER TABLE dining_sessions ADD COLUMN IF NOT EXISTS reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL;"))

    # 3. bills
    conn.execute(sa.text("ALTER TABLE bills ADD COLUMN IF NOT EXISTS reservation_deposit_paid NUMERIC(12, 2) DEFAULT 0.00 NOT NULL;"))
    conn.execute(sa.text("ALTER TABLE bills ADD COLUMN IF NOT EXISTS reservation_credit NUMERIC(12, 2) DEFAULT 0.00 NOT NULL;"))
    conn.execute(sa.text("ALTER TABLE bills ADD COLUMN IF NOT EXISTS remainder_action VARCHAR(30);"))
    conn.execute(sa.text("ALTER TABLE bills ADD COLUMN IF NOT EXISTS remainder_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL;"))

    # 4. verified_bank_credits
    conn.execute(sa.text("ALTER TABLE verified_bank_credits ADD COLUMN IF NOT EXISTS event_id VARCHAR(100);"))
    conn.execute(sa.text("ALTER TABLE verified_bank_credits ADD COLUMN IF NOT EXISTS raw_event_payload VARCHAR(500);"))
    conn.execute(sa.text("ALTER TABLE verified_bank_credits ADD COLUMN IF NOT EXISTS review_reason VARCHAR(200);"))


def downgrade() -> None:
    op.drop_column('verified_bank_credits', 'review_reason')
    op.drop_column('verified_bank_credits', 'raw_event_payload')
    op.drop_column('verified_bank_credits', 'event_id')
    op.drop_column('bills', 'remainder_amount')
    op.drop_column('bills', 'remainder_action')
    op.drop_column('bills', 'reservation_credit')
    op.drop_column('bills', 'reservation_deposit_paid')
    op.drop_column('dining_sessions', 'reservation_id')
    op.drop_column('reservations', 'cancellation_refund_status')
    op.drop_column('reservations', 'cancellation_refund_amount')
    op.drop_column('reservations', 'credited_bill_id')
    op.drop_column('reservations', 'is_deposit_credited')
