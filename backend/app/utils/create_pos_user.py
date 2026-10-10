import asyncio
import argparse
import logging
from sqlalchemy import select
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, Role, Permission, RolePermission

logger = logging.getLogger("cafe_piza.users")

# Local-development fallbacks only; never used when APP_ENV != "development".
DEV_DEFAULT_PASSWORDS = {"admin": "admin12", "Jaadoo": "Jaadoo_123"}


async def create_pos_user(
    username: str,
    password: str,
    email: str,
    role_name: str = "Cashier",
    update_existing: bool = True,
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

        # 5. Create the target user, or update it only when explicitly allowed
        user_res = await db.execute(select(User).where(User.username == username))
        user = user_res.scalar_one_or_none()
        if user and not update_existing:
            await db.commit()  # keep the roles/permissions ensured above
            return

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
    """Create the default POS cashier and owner admin accounts if they are missing.

    Existing accounts are never modified, so passwords changed in production survive restarts.
    Passwords come from DEFAULT_POS_PASSWORD / DEFAULT_ADMIN_PASSWORD; the hardcoded
    fallbacks apply only when APP_ENV == "development".
    """
    is_dev = settings.APP_ENV == "development"
    defaults = [
        ("Jaadoo", settings.DEFAULT_POS_PASSWORD, "jaadoo@jaadoo.local", "Cashier"),
        ("admin", settings.DEFAULT_ADMIN_PASSWORD, "admin@jaadoo.local", "Admin"),
    ]
    for username, password, email, role in defaults:
        password = password or (DEV_DEFAULT_PASSWORDS[username] if is_dev else None)
        if not password:
            logger.warning(f"No default password configured for '{username}'; it will not be auto-created.")
            continue
        await create_pos_user(username, password, email, role, update_existing=False)


def main():
    parser = argparse.ArgumentParser(description="Securely create or update a POS / Admin user.")
    parser.add_argument("--username", required=True, help="Username")
    parser.add_argument("--password", required=True, help="Password (updates the user if it already exists)")
    parser.add_argument("--email", default="admin@jaadoo.local", help="Email")
    parser.add_argument("--role", default="Admin", help="Role (Admin/Cashier/Manager)")

    args = parser.parse_args()
    asyncio.run(create_pos_user(args.username, args.password, args.email, args.role))


if __name__ == "__main__":
    main()
