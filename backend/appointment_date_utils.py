import re
from datetime import date, datetime, timedelta


MONTH_NAMES = (
    "january|february|march|april|may|june|july|august|september|"
    "october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|"
    "sept|oct|nov|dec"
)


def parse_appointment_date(message: str, today: date | None = None):
    current_date = today or date.today()
    text = message.lower().strip()

    if re.search(r"\btomorrow\b", text):
        return current_date + timedelta(days=1)

    if re.search(r"\btoday\b", text):
        return current_date

    date_match = re.search(r"\b\d{4}-\d{1,2}-\d{1,2}\b", text)
    if date_match:
        try:
            return datetime.strptime(date_match.group(), "%Y-%m-%d").date()
        except ValueError:
            return None

    date_match = re.search(r"\b\d{1,2}([./-])\d{1,2}\1\d{4}\b", text)
    if date_match:
        value = date_match.group()
        for date_format in ("%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y"):
            try:
                return datetime.strptime(value, date_format).date()
            except ValueError:
                continue
        return None

    month_first = re.search(
        rf"\b({MONTH_NAMES})\s+(\d{{1,2}})(?:st|nd|rd|th)?"
        r"(?:,?\s+(\d{4}))?\b",
        text,
    )
    day_first = re.search(
        rf"\b(\d{{1,2}})(?:st|nd|rd|th)?\s+({MONTH_NAMES})"
        r"(?:\s+(\d{4}))?\b",
        text,
    )

    match = month_first or day_first
    if not match:
        return None

    if match is month_first:
        month_name, day_text, year_text = match.groups()
    else:
        day_text, month_name, year_text = match.groups()

    for month_format in ("%B", "%b"):
        try:
            month = datetime.strptime(month_name, month_format).month
            return date(
                int(year_text) if year_text else current_date.year,
                month,
                int(day_text),
            )
        except ValueError:
            continue

    return None


def is_valid_appointment_date(
    appointment_date: date | None,
    allow_today: bool = False,
    today: date | None = None,
) -> bool:
    if appointment_date is None:
        return False

    current_date = today or date.today()
    if allow_today:
        return appointment_date >= current_date
    return appointment_date > current_date
