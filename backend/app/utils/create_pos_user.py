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
        # 1. Ensure 'pos:access' and 'admin:access' permissions exist
        perms_to_create = [
            ("pos:access", "Full POS & KOT Operations Access"),
            ("admin:access", "Full Owner & Admin Portal Access"),
            ("analytics:read", "View Sales & Financial Analytics"),
            ("menu:write", "Edit Menu Pricing and Availability"),
        ]
        for code, desc in perms_to_create:
            perm_res = await db.execute(select(Permission).where(Permission.code == code))
            perm = perm_res.scalar_one_or_none()
            if not perm:
                perm = Permission(code=code, description=desc)
                db.add(perm)
                await db.flush()

        # 2. Ensure Roles exist (Cashier, Admin, Owner)
        for r_name in ["Cashier", "Admin", "Owner", "Manager"]:
            role_res = await db.execute(select(Role).where(Role.name == r_name))
            if not role_res.scalar_one_or_none():
                db.add(Role(name=r_name))
                await db.flush()

        # 3. Attach permissions to Cashier
        cashier_role = (await db.execute(select(Role).where(Role.name == "Cashier"))).scalar_one()
        pos_perm = (await db.execute(select(Permission).where(Permission.code == "pos:access"))).scalar_one()
        rp_res = await db.execute(
            select(RolePermission).where(
                RolePermission.role_id == cashier_role.id,
                RolePermission.permission_id == pos_perm.id,
            )
        )
        if not rp_res.scalar_one_or_none():
            db.add(RolePermission(role_id=cashier_role.id, permission_id=pos_perm.id))
            await db.flush()

        # 4. Attach all permissions to Admin
        admin_role = (await db.execute(select(Role).where(Role.name == "Admin"))).scalar_one()
        all_perms = (await db.execute(select(Permission))).scalars().all()
        for p in all_perms:
            rp_check = await db.execute(
                select(RolePermission).where(
                    RolePermission.role_id == admin_role.id,
                    RolePermission.permission_id == p.id,
                )
            )
            if not rp_check.scalar_one_or_none():
                db.add(RolePermission(role_id=admin_role.id, permission_id=p.id))
                await db.flush()

        # 5. Create or update target user
        user_res = await db.execute(select(User).where(User.username == username))
        user = user_res.scalar_one_or_none()
        hashed = hash_password(password)
        target_role = (await db.execute(select(Role).where(Role.name == role_name))).scalar_one_or_none() or cashier_role

        if not user:
            user = User(
                username=username,
                email=email,
                hashed_password=hashed,
                role_id=target_role.id,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            print(f"[✓] Successfully created user '{username}' (role={role_name}, email={email})")
        else:
            user.hashed_password = hashed
            user.role_id = target_role.id
            user.is_active = True
            await db.commit()
            print(f"[✓] Successfully updated credentials for user '{username}' (role={role_name})")


async def ensure_default_users():
    """Ensures both Cashier POS user and Owner Admin user (admin:admin12) exist."""
    # 1. POS Cashier user
    await create_pos_user(username="Jaadoo", password="Jaadoo_123", email="jaadoo@jaadoo.local", role_name="Cashier")
    # 2. Owner Admin user
    await create_pos_user(username="admin", password="admin12", email="admin@jaadoo.local", role_name="Admin")


def main():
    parser = argparse.ArgumentParser(description="Securely create or update a POS / Admin user.")
    parser.add_argument("--username", default="admin", help="Username")
    parser.add_argument("--password", default="admin12", help="Password")
    parser.add_argument("--email", default="admin@jaadoo.local", help="Email")
    parser.add_argument("--role", default="Admin", help="Role (Admin/Cashier/Manager)")

    args = parser.parse_args()
    asyncio.run(create_pos_user(args.username, args.password, args.email, args.role))


if __name__ == "__main__":
    main()

