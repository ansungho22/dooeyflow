"""add social login fields

Revision ID: a1b2c3d4e5f6
Revises: f30fe2a4c440
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f30fe2a4c440'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 소셜 로그인 필드 추가
    op.add_column('users', sa.Column('auth_provider', sa.String(20), nullable=True))
    op.add_column('users', sa.Column('auth_provider_id', sa.String(255), nullable=True))

    # 비밀번호 필드를 nullable로 변경 (소셜 로그인 사용자는 비밀번호 없음)
    op.alter_column('users', 'hashed_password',
                    existing_type=sa.String(255),
                    nullable=True)

    # 소셜 로그인 provider+id 유니크 제약
    op.create_unique_constraint('uq_users_provider', 'users', ['auth_provider', 'auth_provider_id'])


def downgrade() -> None:
    op.drop_constraint('uq_users_provider', 'users', type_='unique')
    op.alter_column('users', 'hashed_password',
                    existing_type=sa.String(255),
                    nullable=False)
    op.drop_column('users', 'auth_provider_id')
    op.drop_column('users', 'auth_provider')
