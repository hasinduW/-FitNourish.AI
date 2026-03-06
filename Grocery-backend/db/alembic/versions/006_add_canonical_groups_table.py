from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "canonical_groups",
        sa.Column("canonical_group_id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("canonical_label", sa.String(length=255), nullable=False, unique=True),
        sa.Column(
            "created_at_utc",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        schema="public",
    )


def downgrade() -> None:
    op.drop_table("canonical_groups", schema="public")