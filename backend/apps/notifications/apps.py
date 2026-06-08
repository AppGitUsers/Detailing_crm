import os
import sys

from django.apps import AppConfig

# Management commands that start Django but should NOT run the scheduler
_EXCLUDED_COMMANDS = {
    'migrate', 'makemigrations', 'collectstatic', 'shell', 'shell_plus',
    'test', 'createsuperuser', 'run_auto_absent', 'run_notification_jobs',
    'dbshell', 'showmigrations', 'sqlmigrate',
}


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notifications'

    def ready(self):
        # Always register signals regardless of how Django was started
        import apps.notifications.signals  # noqa: F401

        # Skip scheduler for management commands that don't serve HTTP requests
        if set(sys.argv) & _EXCLUDED_COMMANDS:
            return

        # Django dev server (runserver) spawns two processes:
        #   parent watcher  → RUN_MAIN is not set
        #   child server    → RUN_MAIN = 'true'
        # Only start the scheduler in the child (or in production where RUN_MAIN is never set).
        if 'runserver' in sys.argv and os.environ.get('RUN_MAIN') != 'true':
            return

        from apps.notifications import scheduler
        scheduler.start()
