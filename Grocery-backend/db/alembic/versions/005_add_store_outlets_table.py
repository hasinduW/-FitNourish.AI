from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "store_outlets",
        sa.Column("outlet_id", sa.BigInteger(), primary_key=True, autoincrement=True),

        sa.Column("store", sa.String(length=50), nullable=False),  # keells / cargills / spar...
        sa.Column("outlet_code", sa.String(length=50), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),

        sa.Column("lat", sa.Numeric(10, 7), nullable=False),
        sa.Column("lng", sa.Numeric(10, 7), nullable=False),

        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at_utc", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("timezone('utc', now())")),
    )

    op.create_index("ix_store_outlets_store", "store_outlets", ["store"])
    op.create_index("ix_store_outlets_active", "store_outlets", ["is_active"])
    op.create_index("ix_store_outlets_store_active", "store_outlets", ["store", "is_active"])


def downgrade() -> None:
    op.drop_index("ix_store_outlets_store_active", table_name="store_outlets")
    op.drop_index("ix_store_outlets_active", table_name="store_outlets")
    op.drop_index("ix_store_outlets_store", table_name="store_outlets")
    op.drop_table("store_outlets")