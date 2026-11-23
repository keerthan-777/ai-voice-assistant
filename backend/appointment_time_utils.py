import re
from datetime import time


_TWELVE_HOUR_TIME = re.compile(
    r"(?<!\d)(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b",
    re.IGNORECASE
)
_TWENTY_FOUR_HOUR_TIME = re.compile(
    r"(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?!\d)"
)


def parse_appointment_time(value: str | time, search: bool = False):
    if isinstance(value, time):
        return value.replace(tzinfo=None)

    text = str(value).strip()
    matcher = _TWELVE_HOUR_TIME.search if search else _TWELVE_HOUR_TIME.fullmatch
    match = matcher(text)

    if match:
        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
        period = match.group(3).upper()

        if hour < 1 or hour > 12 or minute > 59:
            return None

        if period == "PM" and hour != 12:
            hour += 12
        elif period == "AM" and hour == 12:
            hour = 0

        return time(hour, minute)

    matcher = _TWENTY_FOUR_HOUR_TIME.search if search else _TWENTY_FOUR_HOUR_TIME.fullmatch
    match = matcher(text)

    if not match:
        return None

    return time(int(match.group(1)), int(match.group(2)))
