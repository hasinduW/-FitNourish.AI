from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "clean_products",
        sa.Column("canonical_group_id", sa.BigInteger(), nullable=True),
        schema="public",
    )

    op.create_foreign_key(
        "fk_clean_products_canonical_groups",
        source_table="clean_products",
        referent_table="canonical_groups",
        local_cols=["canonical_group_id"],
        remote_cols=["canonical_group_id"],
        source_schema="public",
        referent_schema="public",
        ondelete="SET NULL",
    )

    op.create_index(
        "ix_clean_products_canonical_group_id",
        "clean_products",
        ["canonical_group_id"],
        unique=False,
        schema="public",
    )


def downgrade() -> None:
    op.drop_index("ix_clean_products_canonical_group_id", table_name="clean_products", schema="public")
    op.drop_constraint("fk_clean_products_canonical_groups", "clean_products", type_="foreignkey", schema="public")
    op.drop_column("clean_products", "canonical_group_id", schema="public")