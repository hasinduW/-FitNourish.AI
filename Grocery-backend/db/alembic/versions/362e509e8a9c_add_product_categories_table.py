"""add product_categories table

Revision ID: <PUT_NEW_REVISION_ID_HERE>
Revises: <PUT_PREVIOUS_REVISION_ID_HERE>
Create Date: 2025-12-25
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_categories",
        sa.Column("product_category_id", sa.BigInteger(), primary_key=True, autoincrement=True),

        sa.Column("clean_product_id", sa.BigInteger(), sa.ForeignKey("clean_products.clean_product_id", ondelete="CASCADE"), nullable=False),

        # taxonomy = your research categories version (v1, v2...). Keep stable so you can compare later.
        sa.Column("taxonomy_version", sa.String(length=50), nullable=False, server_default=sa.text("'v1'")),

        # method indicates how categories were generated
        # rules / ml
        sa.Column("method", sa.String(length=20), nullable=False),

        # model_version identifies a specific run/approach like rules_v1, ml_v1, ml_v2...
        sa.Column("model_version", sa.String(length=50), nullable=False),

        sa.Column("category_l1", sa.String(length=100), nullable=False),
        sa.Column("category_l2", sa.String(length=100), nullable=False),

        # confidence is mainly for ML (0..1). For rules you can store NULL.
        sa.Column("confidence", sa.Numeric(5, 4), nullable=True),

        # explain stores rule keyword matched OR ML top-features etc (good for thesis explainability)
        sa.Column("explain", sa.Text(), nullable=True),

        # is_active indicates which categorisation should be used downstream
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),

        # safe UTC default on Postgres
        sa.Column("created_at_utc", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("timezone('utc', now())")),
    )

    # Prevent duplicates per run/version
    op.create_unique_constraint(
        "uq_product_categories_clean_product_model_version",
        "product_categories",
        ["clean_product_id", "model_version"],
    )

    # Helpful indexes
    op.create_index("ix_product_categories_active", "product_categories", ["is_active"])
    op.create_index("ix_product_categories_method", "product_categories", ["method"])
    op.create_index("ix_product_categories_model_version", "product_categories", ["model_version"])
    op.create_index("ix_product_categories_clean_product_id", "product_categories", ["clean_product_id"])


def downgrade() -> None:
    op.drop_index("ix_product_categories_clean_product_id", table_name="product_categories")
    op.drop_index("ix_product_categories_model_version", table_name="product_categories")
    op.drop_index("ix_product_categories_method", table_name="product_categories")
    op.drop_index("ix_product_categories_active", table_name="product_categories")
    op.drop_constraint("uq_product_categories_clean_product_model_version", "product_categories", type_="unique")
    op.drop_table("product_categories")
