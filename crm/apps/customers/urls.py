from rest_framework.routers import DefaultRouter

from apps.customers.views import (
    CompanyViewSet,
    CustomerAccountViewSet,
    CustomerEmployeeAssignmentViewSet,
    CustomerRatingViewSet,
    CustomerSourceViewSet,
    CustomerTypeViewSet,
    CustomerViewSet,
    MembershipTierViewSet,
)


router = DefaultRouter()

router.register("customer-types", CustomerTypeViewSet, basename="customer-type")
router.register("companies", CompanyViewSet, basename="company")
router.register("customer-sources", CustomerSourceViewSet, basename="customer-source")
router.register("customer-ratings", CustomerRatingViewSet, basename="customer-rating")
router.register("membership-tiers", MembershipTierViewSet, basename="membership-tier")
router.register("customers", CustomerViewSet, basename="customer")
router.register("customer-accounts", CustomerAccountViewSet, basename="customer-account")
router.register("customer-employee-assignments", CustomerEmployeeAssignmentViewSet, basename="customer-employee-assignment")

urlpatterns = router.urls