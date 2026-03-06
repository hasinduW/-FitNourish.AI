from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade():
    # -----------------------------
    # clean_products table
    # -----------------------------
    op.create_table(
        "clean_products",
        sa.Column("clean_product_id", sa.BigInteger, primary_key=True),
        sa.Column("store", sa.String(length=50), nullable=False),
        sa.Column("brand", sa.String(length=100), nullable=True),
        sa.Column("canonical_name", sa.String(length=255), nullable=False),
        sa.Column("normalized_name", sa.String(length=255), nullable=False),
        sa.Column("size_value", sa.Numeric(10, 3), nullable=True),
        sa.Column("size_unit", sa.String(length=20), nullable=True),
        sa.Column("category_l1", sa.String(length=100), nullable=True),
        sa.Column("category_l2", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at_utc",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "store",
            "normalized_name",
            "size_value",
            "size_unit",
            name="uq_clean_products_identity",
        ),
    )

    op.create_index(
        "ix_clean_products_store",
        "clean_products",
        ["store"],
    )

    # -----------------------------
    # product_price_facts table
    # -----------------------------
    op.create_table(
        "product_price_facts",
        sa.Column("price_fact_id", sa.BigInteger, primary_key=True),
        sa.Column(
            "clean_product_id",
            sa.BigInteger,
            sa.ForeignKey("clean_products.clean_product_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "scraped_at_utc",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
        ),
        sa.Column("outlet_code", sa.String(length=20), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=True),
        sa.Column("final_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("price_per_unit", sa.Numeric(12, 4), nullable=True),
        sa.Column("is_promo", sa.Boolean, nullable=True),
        sa.UniqueConstraint(
            "clean_product_id",
            "scraped_at_utc",
            "outlet_code",
            name="uq_price_fact_snapshot",
        ),
    )

    op.create_index(
        "ix_price_facts_clean_product",
        "product_price_facts",
        ["clean_product_id"],
    )

    op.create_index(
        "ix_price_facts_scraped_at",
        "product_price_facts",
        ["scraped_at_utc"],
    )


def downgrade():
    op.drop_index("ix_price_facts_scraped_at", table_name="product_price_facts")
    op.drop_index("ix_price_facts_clean_product", table_name="product_price_facts")
    op.drop_table("product_price_facts")

    op.drop_index("ix_clean_products_store", table_name="clean_products")
    op.drop_table("clean_products")
