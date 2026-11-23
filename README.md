# AI Voice Assistant Backend

FastAPI backend for small and medium-sized businesses. The receptionist uses
the locally hosted Ollama `phi3` model.

## PowerShell setup

```powershell
Set-Location "D:\AI voice Assistant\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Configure `backend\.env` with the MySQL `DB_HOST`, `DB_PORT`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME`, and JWT settings. Do not commit the `.env` file.

Start MySQL and Ollama, then download the model if needed:

```powershell
ollama pull phi3
python init_db.py
python -m uvicorn main:app --reload
```

The database initializer creates the business working-hours and holiday tables
and adds the missing `conversations.summary` column if it is not present.
The application writes rotating logs to `backend\logs\app.log`.

## Business profile

Authenticated business users can read their profile with
`GET /businesses/{business_id}` and update it with
`PUT /businesses/{business_id}`. The user can only access the business
associated with their account. The update body accepts any of these fields:
`business_name`, `business_type`, `phone_number`, `email`, and `address`;
omitted fields remain unchanged.

## Appointment availability

Configure open weekdays through authenticated `PUT /business/working-hours`.
Weekdays use `0` for Monday through `6` for Sunday; omitted weekdays are
closed. Each appointment occupies a 30-minute slot. Add or remove closed dates
with `POST /business/holidays` and `DELETE /business/holidays/{holiday_id}`.
Appointments use the server's local time zone.

Example `PUT /business/working-hours` body:

```json
{
  "working_hours": [
    {"weekday": 0, "open_time": "09:00", "close_time": "17:00"},
    {"weekday": 1, "open_time": "09:00", "close_time": "17:00"}
  ]
}
```

Example `POST /business/holidays` body:

```json
{
  "holiday_date": "2050-12-25",
  "name": "Holiday"
}
```

## Tests and API docs

```powershell
python -m unittest discover -v -p "test_*.py"
```

With the server running, open `http://127.0.0.1:8000/docs` to explore the
authenticated APIs.
