from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.home, name='home'),
    path('api/search/', views.search_music, name='search_music'),
    path('api/download/', views.download_music, name='download_music'),
    path('api/status/<str:task_id>/', views.download_status, name='download_status'),
    path('download/<path:file_name>/', views.serve_download, name='serve_download'),
]
