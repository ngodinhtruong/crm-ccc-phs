from django.urls import include, path
from rest_framework.routers import DefaultRouter
from apps.ekyc.views import EkycRecordViewSet

router = DefaultRouter()
router.register(r"records", EkycRecordViewSet, basename="ekyc-records")

urlpatterns = [
    path("", include(router.urls)),
]
