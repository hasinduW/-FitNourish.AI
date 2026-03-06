from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) reference nutrition values per 100g (category-level)
    op.create_table(
        "nutrition_reference",
        sa.Column("nutrition_ref_id", sa.BigInteger(), primary_key=True, autoincrement=True),

        sa.Column("taxonomy_version", sa.String(length=50), nullable=False),
        sa.Column("category_l1", sa.String(length=100), nullable=False),
        sa.Column("category_l2", sa.String(length=100), nullable=False),

        # per 100g standard
        sa.Column("energy_kcal_per_100g", sa.Numeric(10, 3), nullable=True),
        sa.Column("protein_g_per_100g", sa.Numeric(10, 3), nullable=True),
        sa.Column("fat_g_per_100g", sa.Numeric(10, 3), nullable=True),
        sa.Column("carbs_g_per_100g", sa.Numeric(10, 3), nullable=True),
        sa.Column("fiber_g_per_100g", sa.Numeric(10, 3), nullable=True),
        sa.Column("sugar_g_per_100g", sa.Numeric(10, 3), nullable=True),
        sa.Column("sodium_mg_per_100g", sa.Numeric(12, 3), nullable=True),

        # research-friendly metadata
        sa.Column("is_food", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("source_name", sa.String(length=255), nullable=True),
        sa.Column("source_notes", sa.Text(), nullable=True),

        sa.Column("created_at_utc", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("timezone('utc', now())")),
    )

    op.create_unique_constraint(
        "uq_nutrition_reference_tax_cat",
        "nutrition_reference",
        ["taxonomy_version", "category_l2"],
    )

    op.create_index("ix_nutrition_reference_category_l2", "nutrition_reference", ["category_l2"])
    op.create_index("ix_nutrition_reference_is_food", "nutrition_reference", ["is_food"])

    # 2) product-level nutrition mapping (derived from category + active categorisation)
    op.create_table(
        "product_nutrition",
        sa.Column("product_nutrition_id", sa.BigInteger(), primary_key=True, autoincrement=True),

        sa.Column("clean_product_id", sa.BigInteger(), sa.ForeignKey("clean_products.clean_product_id", ondelete="CASCADE"), nullable=False),

        # which categorisation produced this mapping
        sa.Column("taxonomy_version", sa.String(length=50), nullable=False),
        sa.Column("model_version", sa.String(length=50), nullable=False),  # e.g. rules_v1, ml_v1

        sa.Column("category_l1", sa.String(length=100), nullable=False),
        sa.Column("category_l2", sa.String(length=100), nullable=False),

        # copied from nutrition_reference (per 100g)
        sa.Column("energy_kcal_per_100g", sa.Numeric(10, 3), nullable=True),
        sa.Column("protein_g_per_100g", sa.Numeric(10, 3), nullable=True),
        sa.Column("fat_g_per_100g", sa.Numeric(10, 3), nullable=True),
        sa.Column("carbs_g_per_100g", sa.Numeric(10, 3), nullable=True),
        sa.Column("fiber_g_per_100g", sa.Numeric(10, 3), nullable=True),
        sa.Column("sugar_g_per_100g", sa.Numeric(10, 3), nullable=True),
        sa.Column("sodium_mg_per_100g", sa.Numeric(12, 3), nullable=True),

        sa.Column("confidence", sa.Numeric(5, 4), nullable=True),  # ML fills this later, rules can be NULL
        sa.Column("created_at_utc", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("timezone('utc', now())")),
    )

    op.create_unique_constraint(
        "uq_product_nutrition_clean_product_model_version",
        "product_nutrition",
        ["clean_product_id", "model_version"],
    )

    op.create_index("ix_product_nutrition_clean_product_id", "product_nutrition", ["clean_product_id"])
    op.create_index("ix_product_nutrition_model_version", "product_nutrition", ["model_version"])
    op.create_index("ix_product_nutrition_category_l2", "product_nutrition", ["category_l2"])


def downgrade() -> None:
    op.drop_index("ix_product_nutrition_category_l2", table_name="product_nutrition")
    op.drop_index("ix_product_nutrition_model_version", table_name="product_nutrition")
    op.drop_index("ix_product_nutrition_clean_product_id", table_name="product_nutrition")
    op.drop_constraint("uq_product_nutrition_clean_product_model_version", "product_nutrition", type_="unique")
    op.drop_table("product_nutrition")

    op.drop_index("ix_nutrition_reference_is_food", table_name="nutrition_reference")
    op.drop_index("ix_nutrition_reference_category_l2", table_name="nutrition_reference")
    op.drop_constraint("uq_nutrition_reference_tax_cat", "nutrition_reference", type_="unique")
    op.drop_table("nutrition_reference")
