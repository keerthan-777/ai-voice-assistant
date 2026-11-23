import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


_HANDLER_MARKER = "_ai_voice_assistant_configured"
logger = logging.getLogger("ai_voice_assistant")


def configure_logging():
    root_logger = logging.getLogger()
    if any(
        getattr(handler, _HANDLER_MARKER, False)
        for handler in root_logger.handlers
    ):
        return

    log_directory = Path(__file__).with_name("logs")
    log_directory.mkdir(exist_ok=True)

    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    file_handler = RotatingFileHandler(
        log_directory / "app.log",
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8"
    )
    stream_handler = logging.StreamHandler()

    for handler in (file_handler, stream_handler):
        handler.setFormatter(formatter)
        setattr(handler, _HANDLER_MARKER, True)
        root_logger.addHandler(handler)

    root_logger.setLevel(logging.INFO)


configure_logging()
