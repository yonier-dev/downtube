from django.db import models


class DownloadTask(models.Model):
    """Registro de tareas de descarga de audio."""
    task_id = models.CharField(max_length=100, unique=True, db_index=True)
    query = models.CharField(max_length=500)
    video_url = models.URLField(blank=True, null=True)
    title = models.CharField(max_length=500, blank=True, null=True)
    status = models.CharField(
        max_length=20,
        default='pending',  # pending, processing, completed, failed
    )
    file_path = models.CharField(max_length=1000, blank=True, null=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.task_id} - {self.query} ({self.status})'
