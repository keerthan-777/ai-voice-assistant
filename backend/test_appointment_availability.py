import unittest
from datetime import date, datetime, time

from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from appointment_schemas import AppointmentCreate, AppointmentUpdate
from appointment_time_utils import parse_appointment_time
from availability_schemas import WorkingHourInput, WorkingHoursUpdate
from availability_service import (
    add_business_holiday,
    replace_working_hours,
    validate_appointment_slot,
)
from models import (
    Appointment,
    Base,
    Business,
    BusinessWorkingHour,
    Customer,
)


class AppointmentAvailabilityTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.business = Business(business_name="Test Business")
        self.db.add(self.business)
        self.db.flush()
        self.customer = Customer(
            name="Test Customer",
            phone_number="9876543210",
            business_id=self.business.id
        )
        self.db.add(self.customer)
        self.db.commit()

        self.today = date(2026, 11, 23)
        self.now = datetime(2026, 11, 23, 9, 0)
        replace_working_hours(
            self.db,
            self.business.id,
            [
                WorkingHourInput(
                    weekday=0,
                    open_time=time(9, 0),
                    close_time=time(17, 0)
                ),
                WorkingHourInput(
                    weekday=1,
                    open_time=time(9, 0),
                    close_time=time(17, 0)
                )
            ]
        )
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def validate(self, appointment_date, appointment_time, exclude_id=None):
        return validate_appointment_slot(
            db=self.db,
            business_id=self.business.id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            exclude_appointment_id=exclude_id,
            now=self.now
        )

    def add_appointment(self, appointment_date, appointment_time):
        appointment = Appointment(
            customer_id=self.customer.id,
            business_id=self.business.id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            status="confirmed"
        )
        self.db.add(appointment)
        self.db.commit()
        return appointment

    def test_parses_valid_12_and_24_hour_times(self):
        self.assertEqual(parse_appointment_time("10:30 AM"), time(10, 30))
        self.assertEqual(parse_appointment_time("2:00 PM"), time(14, 0))
        self.assertEqual(parse_appointment_time("10:30"), time(10, 30))
        self.assertEqual(parse_appointment_time("14:00"), time(14, 0))
        self.assertEqual(
            parse_appointment_time("Please come at 14:00", search=True),
            time(14, 0)
        )

    def test_rejects_invalid_time_formats(self):
        for value in ("25:00", "10:60 AM", "13:15 PM", "not a time"):
            with self.subTest(value=value):
                self.assertIsNone(parse_appointment_time(value))

        with self.assertRaises(ValidationError):
            AppointmentCreate(
                customer_id=self.customer.id,
                appointment_date="2026-11-25",
                appointment_time="25:00"
            )

    def test_direct_appointment_schemas_accept_requested_formats(self):
        appointment = AppointmentCreate(
            customer_id=self.customer.id,
            appointment_date="25-11-2026",
            appointment_time="2:00 PM"
        )
        self.assertEqual(appointment.appointment_date, date(2026, 11, 25))
        self.assertEqual(appointment.appointment_time, time(14, 0))

        update = AppointmentUpdate(
            appointment_date="25/11/2026",
            appointment_time="14:00"
        )
        self.assertEqual(update.appointment_date, date(2026, 11, 25))
        self.assertEqual(update.appointment_time, time(14, 0))

    def test_rejects_past_date_and_time_but_allows_future_today(self):
        self.assertIn(
            "date cannot be in the past",
            self.validate(date(2026, 11, 22), time(10, 0))
        )
        self.assertIn(
            "time must be in the future",
            self.validate(self.today, time(8, 59))
        )
        self.assertIsNone(self.validate(self.today, time(10, 0)))

    def test_rejects_closed_days_holidays_and_out_of_hours(self):
        self.assertIn(
            "closed on that day",
            self.validate(date(2026, 11, 25), time(10, 0))
        )

        add_business_holiday(
            self.db,
            self.business.id,
            date(2026, 11, 24),
            "Holiday"
        )
        self.db.commit()
        self.assertIn(
            "closed on that holiday",
            self.validate(date(2026, 11, 24), time(10, 0))
        )

        self.assertIn(
            "working hours",
            self.validate(self.today, time(16, 45))
        )
        self.assertIsNone(self.validate(self.today, time(16, 30)))

    def test_rejects_overlaps_but_allows_adjacent_slots(self):
        self.add_appointment(self.today, time(10, 0))

        self.assertIn(
            "overlaps",
            self.validate(self.today, time(10, 15))
        )
        self.assertIsNone(self.validate(self.today, time(10, 30)))
        self.assertIsNone(self.validate(self.today, time(9, 30)))

    def test_reschedule_can_exclude_its_own_appointment(self):
        appointment = self.add_appointment(self.today, time(10, 0))

        self.assertIsNone(
            self.validate(
                self.today,
                time(10, 0),
                exclude_id=appointment.id
            )
        )

    def test_working_hours_require_unique_days_and_valid_ranges(self):
        with self.assertRaises(ValidationError):
            WorkingHoursUpdate(working_hours=[
                {"weekday": 0, "open_time": "09:00", "close_time": "17:00"},
                {"weekday": 0, "open_time": "10:00", "close_time": "18:00"}
            ])

        with self.assertRaises(ValidationError):
            WorkingHourInput(
                weekday=0,
                open_time=time(17, 0),
                close_time=time(9, 0)
            )

        self.assertEqual(
            self.db.query(BusinessWorkingHour).filter_by(
                business_id=self.business.id
            ).count(),
            2
        )


if __name__ == "__main__":
    unittest.main()
