import asyncio
import argparse
import sys
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, Role, Permission, RolePermission


async def create_pos_user(
    username: str = "Jaadoo",
    password: str = "Jaadoo_123",
    email: str = "jaadoo@jaadoo.local",
    role_name: str = "Cashier",
):
    async with AsyncSessionLocal() as db:
        # 1. Ensure 'pos:access' permission exists
        perm_res = await db.execute(select(Permission).where(Permission.code == "pos:access"))
        perm = perm_res.scalar_one_or_none()
        if not perm:
            perm = Permission(code="pos:access", description="Full POS & KOT Operations Access")
            db.add(perm)
            await db.flush()
            print(f"[+] Created permission 'pos:access' (id={perm.id})")

        # 2. Ensure Role exists
        role_res = await db.execute(select(Role).where(Role.name == role_name))
        role = role_res.scalar_one_or_none()
        if not role:
            role = Role(name=role_name)
            db.add(role)
            await db.flush()
            print(f"[+] Created role '{role_name}' (id={role.id})")

        # 3. Ensure Role has 'pos:access' permission
        rp_res = await db.execute(
            select(RolePermission).where(
                RolePermission.role_id == role.id,
                RolePermission.permission_id == perm.id,
            )
        )
        if not rp_res.scalar_one_or_none():
            rp = RolePermission(role_id=role.id, permission_id=perm.id)
            db.add(rp)
            await db.flush()
            print(f"[+] Attached permission 'pos:access' to role '{role_name}'")

        # 4. Create or update User
        user_res = await db.execute(select(User).where(User.username == username))
        user = user_res.scalar_one_or_none()
        hashed = hash_password(password)

        if not user:
            user = User(
                username=username,
                email=email,
                hashed_password=hashed,
                role_id=role.id,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            print(f"[✓] Successfully created POS user '{username}' (role={role_name}, email={email})")
        else:
            user.hashed_password = hashed
            user.role_id = role.id
            user.is_active = True
            await db.commit()
            print(f"[✓] Successfully updated credentials for POS user '{username}' (role={role_name})")


def main():
    parser = argparse.ArgumentParser(description="Securely create or update a POS user.")
    parser.add_argument("--username", default="Jaadoo", help="Username for POS login")
    parser.add_argument("--password", default="Jaadoo_123", help="Password for POS login")
    parser.add_argument("--email", default="jaadoo@jaadoo.local", help="Staff email")
    parser.add_argument("--role", default="Cashier", help="Staff role (Cashier/POS/Manager/Admin)")

    args = parser.parse_args()
    asyncio.run(create_pos_user(args.username, args.password, args.email, args.role))


if __name__ == "__main__":
    main()
