"""create raw_products table

Revision ID: 4aae5f4001bb
Revises: 
Create Date: 2025-12-23 11:04:31.810642

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "raw_products",
        sa.Column("id", sa.BigInteger, primary_key=True),

        sa.Column("store", sa.Text, nullable=False),
        sa.Column("outlet_code", sa.Text, nullable=False),
        sa.Column("scraped_at_utc", sa.TIMESTAMP(timezone=True), nullable=False),

        sa.Column("item_id", sa.BigInteger),
        sa.Column("item_code", sa.Text),
        sa.Column("name", sa.Text),
        sa.Column("long_description", sa.Text),
        sa.Column("uom", sa.Text),

        sa.Column("price", sa.Numeric(12, 2)),
        sa.Column("is_promo", sa.Boolean),
        sa.Column("promo_percent", sa.Numeric(6, 2)),
        sa.Column("promo_type_id", sa.Integer),
        sa.Column("promo_header_id", sa.Integer),
        sa.Column("final_price", sa.Numeric(12, 2)),

        sa.Column("stock_in_hand", sa.Numeric(12, 2)),
        sa.Column("is_available", sa.Boolean),
        sa.Column("is_selling_today", sa.Boolean),
        sa.Column("min_qty", sa.Numeric(12, 2)),
        sa.Column("max_qty", sa.Numeric(12, 2)),

        sa.Column("department_code", sa.Text),
        sa.Column("sub_department_code", sa.Text),
        sa.Column("category_code", sa.Text),

        sa.Column("image_url", sa.Text),
    )

    op.create_index(
        "uq_raw_products_snapshot",
        "raw_products",
        ["store", "outlet_code", "item_code", "scraped_at_utc"],
        unique=True,
    )


def downgrade():
    op.drop_index("uq_raw_products_snapshot", table_name="raw_products")
    op.drop_table("raw_products")