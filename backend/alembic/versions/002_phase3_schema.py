"""phase3_schema

Revision ID: 002_phase3_schema
Revises: 001_initial_schema
Create Date: 2026-09-24 02:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_phase3_schema'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add celery_task_id to reservations
    op.add_column(
        'reservations',
        sa.Column('celery_task_id', sa.String(length=64), nullable=True)
    )

    # 2. Add partial unique index for active dining sessions per table
    op.create_index(
        'idx_unique_active_dining_session_per_table',
        'dining_sessions',
        ['table_id'],
        unique=True,
        postgresql_where=sa.text("status IN ('OPENED', 'ACTIVE', 'CHECKOUT')")
    )


def downgrade() -> None:
    op.drop_index(
        'idx_unique_active_dining_session_per_table',
        table_name='dining_sessions',
        postgresql_where=sa.text("status IN ('OPENED', 'ACTIVE', 'CHECKOUT')")
    )
    op.drop_column('reservations', 'celery_task_id')
