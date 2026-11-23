import unittest
from datetime import date

from appointment_date_utils import (
    is_valid_appointment_date,
    parse_appointment_date,
)


class AppointmentDateUtilsTests(unittest.TestCase):
    def setUp(self):
        self.today = date(2026, 11, 23)

    def test_parses_day_month_year_formats(self):
        expected = date(2026, 11, 25)

        self.assertEqual(
            parse_appointment_date("25-11-2026", self.today),
            expected,
        )
        self.assertEqual(
            parse_appointment_date("25/11/2026", self.today),
            expected,
        )

    def test_parses_month_and_day_without_year(self):
        self.assertEqual(
            parse_appointment_date("November 25", self.today),
            date(2026, 11, 25),
        )
        self.assertEqual(
            parse_appointment_date("25 November", self.today),
            date(2026, 11, 25),
        )

    def test_rejects_invalid_calendar_dates(self):
        self.assertIsNone(
            parse_appointment_date("31-11-2026", self.today)
        )
        self.assertIsNone(
            parse_appointment_date("February 30, 2026", self.today)
        )

    def test_same_day_is_rejected_for_bookings_by_default(self):
        self.assertEqual(
            parse_appointment_date("today", self.today),
            self.today,
        )
        self.assertFalse(
            is_valid_appointment_date(self.today, today=self.today)
        )
        self.assertTrue(
            is_valid_appointment_date(
                self.today,
                allow_today=True,
                today=self.today,
            )
        )

    def test_past_dates_are_rejected(self):
        self.assertFalse(
            is_valid_appointment_date(
                date(2026, 11, 22),
                allow_today=True,
                today=self.today,
            )
        )


if __name__ == "__main__":
    unittest.main()
