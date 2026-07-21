from django.core.management.base import BaseCommand
from django.db import transaction

from apps.customers.models import (
    CustomerRating,
    CustomerSource,
    CustomerType,
    MembershipTier,
)


CUSTOMER_TYPES = [
    {
        "type_code": "CONTACT_PERSON",
        "type_name": "Người liên hệ",
    },
    {
        "type_code": "INDIVIDUAL",
        "type_name": "Khách hàng cá nhân",
    },
    {
        "type_code": "ORGANIZATION",
        "type_name": "Khách hàng tổ chức",
    },
    {
        "type_code": "OTHER",
        "type_name": "Khác",
    },
]


CUSTOMER_SOURCES = [
    {
        "source_code": "HOTLINE",
        "source_name": "Hotline",
    },
    {
        "source_code": "EMAIL",
        "source_name": "Email",
    },
    {
        "source_code": "WEBSITE",
        "source_name": "Website",
    },
    {
        "source_code": "ZALO",
        "source_name": "Zalo",
    },
    {
        "source_code": "FACEBOOK_FANPAGE",
        "source_name": "Facebook (fanpage)",
    },
]


CUSTOMER_RATINGS = [
    {
        "rating_code": "HIGH",
        "rating_name": "Cao",
        "score": 3,
    },
    {
        "rating_code": "LOW",
        "rating_name": "Thấp",
        "score": 1,
    },
    {
        "rating_code": "MEDIUM",
        "rating_name": "Trung bình",
        "score": 2,
    },
]


MEMBERSHIP_TIERS = [
    {
        "tier_code": "VIP_SILVER",
        "tier_name": "VIP Silver",
        "description": "Hạng thành viên VIP Silver",
    },
    {
        "tier_code": "VIP_GOLD",
        "tier_name": "VIP Gold",
        "description": "Hạng thành viên VIP Gold",
    },
]


class Command(BaseCommand):
    help = "Seed dữ liệu danh mục mặc định của khách hàng"

    @transaction.atomic
    def handle(self, *args, **options):
        self.seed_customer_types()
        self.seed_customer_sources()
        self.seed_customer_ratings()
        self.seed_membership_tiers()

        self.stdout.write(
            self.style.SUCCESS(
                "Seed danh mục khách hàng thành công."
            )
        )

    def seed_customer_types(self):
        self.stdout.write("\nĐang seed loại khách hàng...")

        for item in CUSTOMER_TYPES:
            obj, created = CustomerType.objects.update_or_create(
                type_code=item["type_code"],
                defaults={
                    "type_name": item["type_name"],
                    "is_active": True,
                },
            )

            self.print_result(
                group="Loại khách hàng",
                name=obj.type_name,
                created=created,
            )

    def seed_customer_sources(self):
        self.stdout.write("\nĐang seed nguồn khách hàng...")

        for item in CUSTOMER_SOURCES:
            obj, created = CustomerSource.objects.update_or_create(
                source_code=item["source_code"],
                defaults={
                    "source_name": item["source_name"],
                    "is_active": True,
                },
            )

            self.print_result(
                group="Nguồn khách hàng",
                name=obj.source_name,
                created=created,
            )

    def seed_customer_ratings(self):
        self.stdout.write("\nĐang seed đánh giá khách hàng...")

        for item in CUSTOMER_RATINGS:
            obj, created = CustomerRating.objects.update_or_create(
                rating_code=item["rating_code"],
                defaults={
                    "rating_name": item["rating_name"],
                    "score": item["score"],
                    "is_active": True,
                },
            )

            self.print_result(
                group="Đánh giá khách hàng",
                name=obj.rating_name,
                created=created,
            )

    def seed_membership_tiers(self):
        self.stdout.write("\nĐang seed hạng thành viên...")

        for item in MEMBERSHIP_TIERS:
            obj, created = MembershipTier.objects.update_or_create(
                tier_code=item["tier_code"],
                defaults={
                    "tier_name": item["tier_name"],
                    "description": item["description"],
                    "is_active": True,
                },
            )

            self.print_result(
                group="Hạng thành viên",
                name=obj.tier_name,
                created=created,
            )

    def print_result(self, group, name, created):
        action = "Tạo mới" if created else "Cập nhật"

        self.stdout.write(
            f"[{group}] {action}: {name}"
        )