from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.failed_ekyc.views import FailedEkycRecordViewSet

router = DefaultRouter()
router.register(r"records", FailedEkycRecordViewSet, basename="failed-ekyc-records")

urlpatterns = [path("", include(router.urls))]
