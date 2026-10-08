"""dough_production_schema

Revision ID: 003_dough_production_schema
Revises: 002_phase3_schema
Create Date: 2026-09-29 02:00:00.000000

Tables created:
  - daily_production_rules   (dough pool per branch per day)
  - reservation_dough_allocations  (per-reservation protected capacity)

Column added:
  - reservations.expected_pizza_count

INVARIANT: daily_production_rules.total_allocated_dough tracks ONLY actual dough
consumed by accepted pizza orders. Protected reservation dough is tracked
separately in reservation_dough_allocations and is NOT counted in
total_allocated_dough.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_dough_production_schema'
down_revision: Union[str, None] = '002_phase3_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. daily_production_rules
    op.create_table(
        'daily_production_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('production_date', sa.Date(), nullable=False),
        sa.Column('total_dough_limit', sa.Integer(), nullable=False, server_default='70'),
        sa.Column(
            'total_allocated_dough',
            sa.Integer(),
            nullable=False,
            server_default='0',
            comment='ONLY actual dough consumed by accepted pizza orders. '
                    'Protected reservation dough is NOT included.',
        ),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('branch_id', 'production_date', name='uq_daily_production_branch_date'),
        sa.CheckConstraint('total_dough_limit >= 0', name='check_daily_dough_limit_non_negative'),
        sa.CheckConstraint('total_allocated_dough >= 0', name='check_daily_allocated_dough_non_negative'),
    )
    op.create_index('ix_daily_production_rules_id', 'daily_production_rules', ['id'])
    op.create_index('ix_daily_production_rules_production_date', 'daily_production_rules', ['production_date'])

    # 2. reservation_dough_allocations
    op.create_table(
        'reservation_dough_allocations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reservation_id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('production_date', sa.Date(), nullable=False),
        sa.Column('initial_protected_qty', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('consumed_qty', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('released_qty', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reservation_id'], ['reservations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('reservation_id', name='uq_res_dough_alloc_reservation_id'),
        sa.CheckConstraint('initial_protected_qty >= 0', name='check_res_dough_initial_non_negative'),
        sa.CheckConstraint('consumed_qty >= 0', name='check_res_dough_consumed_non_negative'),
        sa.CheckConstraint('released_qty >= 0', name='check_res_dough_released_non_negative'),
        sa.CheckConstraint('consumed_qty <= initial_protected_qty', name='check_res_dough_consumed_lte_initial'),
        sa.CheckConstraint(
            'released_qty <= (initial_protected_qty - consumed_qty)',
            name='check_res_dough_released_lte_unused',
        ),
        sa.CheckConstraint(
            "status IN ('ACTIVE', 'RELEASED', 'EXHAUSTED')",
            name='check_res_dough_status_valid',
        ),
    )
    op.create_index('ix_reservation_dough_allocations_id', 'reservation_dough_allocations', ['id'])
    op.create_index('ix_reservation_dough_allocations_production_date', 'reservation_dough_allocations', ['production_date'])
    op.create_index(
        'idx_res_dough_alloc_branch_date',
        'reservation_dough_allocations',
        ['branch_id', 'production_date'],
    )

    # 3. reservations.expected_pizza_count (nullable; None means use default ratio)
    op.add_column(
        'reservations',
        sa.Column('expected_pizza_count', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('reservations', 'expected_pizza_count')
    op.drop_index('idx_res_dough_alloc_branch_date', table_name='reservation_dough_allocations')
    op.drop_index('ix_reservation_dough_allocations_production_date', table_name='reservation_dough_allocations')
    op.drop_index('ix_reservation_dough_allocations_id', table_name='reservation_dough_allocations')
    op.drop_table('reservation_dough_allocations')
    op.drop_index('ix_daily_production_rules_production_date', table_name='daily_production_rules')
    op.drop_index('ix_daily_production_rules_id', table_name='daily_production_rules')
    op.drop_table('daily_production_rules')
