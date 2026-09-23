import datetime


def utc_now() -> datetime.datetime:
    """Returns naive UTC datetime for SQLAlchemy DateTime compatibility without deprecation warnings."""
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
