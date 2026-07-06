from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.branches.models import Branch, Employee
from apps.customers.models import (
    Customer,
    CustomerType,
    Company,
    CustomerSource,
    CustomerRating,
    MembershipTier,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Seed test data for User and Customer"

    def handle(self, *args, **options):
        now = timezone.now()

        self.seed_customer_types(now)
        self.seed_companies(now)
        self.seed_customer_sources(now)
        self.seed_customer_ratings(now)
        self.seed_membership_tiers(now)
        self.seed_employees_and_users(now)
        self.seed_customers(now)

        self.stdout.write(self.style.SUCCESS("Seed test data completed."))

    def seed_customer_types(self, now):
        """Seed customer types"""
        types = [
            ("INDIVIDUAL", "Cá nhân"),
            ("COMPANY", "Công ty"),
            ("VIP", "VIP"),
        ]

        for code, name in types:
            CustomerType.objects.update_or_create(
                type_code=code,
                defaults={"type_name": name, "is_active": True},
            )
        self.stdout.write(f"Created {len(types)} customer types")

    def seed_companies(self, now):
        """Seed sample companies"""
        companies = [
            {
                "company_code": "COMP001",
                "company_name": "Công ty Cổ phần ABC",
                "tax_code": "0123456789",
                "phone": "0234567890",
                "email": "info@abc.com",
                "address": "123 Nguyễn Huệ, TP. Hồ Chí Minh",
            },
            {
                "company_code": "COMP002",
                "company_name": "Công ty Cổ phần XYZ",
                "tax_code": "9876543210",
                "phone": "0234567891",
                "email": "info@xyz.com",
                "address": "456 Trần Hưng Đạo, Hà Nội",
            },
            {
                "company_code": "COMP003",
                "company_name": "Công ty Cổ phần DEF",
                "tax_code": "1122334455",
                "phone": "0234567892",
                "email": "info@def.com",
                "address": "789 Lê Lợi, Đà Nẵng",
            },
        ]

        for comp in companies:
            Company.objects.update_or_create(
                company_code=comp["company_code"],
                defaults={
                    "company_name": comp["company_name"],
                    "tax_code": comp["tax_code"],
                    "phone": comp["phone"],
                    "email": comp["email"],
                    "address": comp["address"],
                    "status": "ACTIVE",
                },
            )
        self.stdout.write(f"Created {len(companies)} companies")

    def seed_customer_sources(self, now):
        """Seed customer sources"""
        sources = [
            ("WEBSITE", "Website"),
            ("PHONE", "Điện thoại"),
            ("FACEBOOK", "Facebook"),
            ("EMAIL", "Email"),
            ("REFERRAL", "Giới thiệu"),
        ]

        for code, name in sources:
            CustomerSource.objects.update_or_create(
                source_code=code,
                defaults={"source_name": name, "is_active": True},
            )
        self.stdout.write(f"Created {len(sources)} customer sources")

    def seed_customer_ratings(self, now):
        """Seed customer ratings"""
        ratings = [
            ("HOT", "Hot", 5),
            ("WARM", "Warm", 3),
            ("COLD", "Cold", 1),
        ]

        for code, name, score in ratings:
            CustomerRating.objects.update_or_create(
                rating_code=code,
                defaults={"rating_name": name, "score": score, "is_active": True},
            )
        self.stdout.write(f"Created {len(ratings)} customer ratings")

    def seed_membership_tiers(self, now):
        """Seed membership tiers"""
        tiers = [
            ("GOLD", "Gold Member", "Thành viên vàng - Lợi ích cao nhất"),
            ("SILVER", "Silver Member", "Thành viên bạc - Lợi ích trung bình"),
            ("BRONZE", "Bronze Member", "Thành viên đồng - Lợi ích cơ bản"),
        ]

        for code, name, description in tiers:
            MembershipTier.objects.update_or_create(
                tier_code=code,
                defaults={
                    "tier_name": name,
                    "description": description,
                    "is_active": True,
                },
            )
        self.stdout.write(f"Created {len(tiers)} membership tiers")

    def seed_employees_and_users(self, now):
        """Seed employees and related users"""
        branch = Branch.objects.get_or_create(
            branch_code="HO",
            defaults={"branch_name": "Hội sở", "status": "ACTIVE"},
        )[0]

        employees_data = [
            {
                "employee_code": "EMP001",
                "full_name": "Nguyễn Văn A",
                "email": "nguyenvana@crm.com",
                "phone": "0901234567",
                "department": "Sales",
                "position": "Sales Manager",
            },
            {
                "employee_code": "EMP002",
                "full_name": "Trần Thị B",
                "email": "tranthib@crm.com",
                "phone": "0901234568",
                "department": "Customer Service",
                "position": "CS Supervisor",
            },
            {
                "employee_code": "EMP003",
                "full_name": "Phạm Văn C",
                "email": "phamvanc@crm.com",
                "phone": "0901234569",
                "department": "Customer Service",
                "position": "CS Staff",
            },
            {
                "employee_code": "EMP004",
                "full_name": "Vũ Thị D",
                "email": "vuthid@crm.com",
                "phone": "0901234570",
                "department": "Sales",
                "position": "Sales Staff",
            },
        ]

        for emp_data in employees_data:
            employee, created = Employee.objects.update_or_create(
                employee_code=emp_data["employee_code"],
                defaults={
                    "full_name": emp_data["full_name"],
                    "email": emp_data["email"],
                    "phone": emp_data["phone"],
                    "branch": branch,
                    "department": emp_data["department"],
                    "position": emp_data["position"],
                    "status": "ACTIVE",
                },
            )

            # Create user for employee
            User.objects.update_or_create(
                username=emp_data["employee_code"].lower(),
                defaults={
                    "email": emp_data["email"],
                    "first_name": emp_data["full_name"].split()[1],
                    "last_name": emp_data["full_name"].split()[0],
                    "employee": employee,
                    "status": "ACTIVE",
                },
            )

        self.stdout.write(f"Created {len(employees_data)} employees and users")

    def seed_customers(self, now):
        """Seed sample customers"""
        branch = Branch.objects.get(branch_code="HO")
        individual_type = CustomerType.objects.get(type_code="INDIVIDUAL")
        company_type = CustomerType.objects.get(type_code="COMPANY")
        website_source = CustomerSource.objects.get(source_code="WEBSITE")
        hot_rating = CustomerRating.objects.get(rating_code="HOT")
        gold_tier = MembershipTier.objects.get(tier_code="GOLD")
        comp001 = Company.objects.get(company_code="COMP001")
        creator_user = User.objects.first()

        customers = [
            {
                "customer_code": "CUST001",
                "full_name": "Lê Quang Huy",
                "email": "huy.le@email.com",
                "phone": "0908123456",
                "customer_type": individual_type,
                "gender": "M",
                "date_of_birth": "1990-05-15",
                "identity_number": "123456789012",
                "address": "12 Nguyễn Huệ, TP. HCM",
                "country": "Việt Nam",
                "province": "TP. Hồ Chí Minh",
                "district": "Quận 1",
                "ward": "Phường Bến Nghé",
                "company": comp001,
                "source": website_source,
                "rating": hot_rating,
                "membership_tier": gold_tier,
                "description": "Khách hàng VIP, liên hệ thường xuyên",
            },
            {
                "customer_code": "CUST002",
                "full_name": "Nguyễn Thị Mỹ Linh",
                "email": "mylinh.nguyen@email.com",
                "phone": "0908123457",
                "customer_type": individual_type,
                "gender": "F",
                "date_of_birth": "1995-08-20",
                "identity_number": "123456789013",
                "address": "45 Trần Hưng Đạo, Hà Nội",
                "country": "Việt Nam",
                "province": "Hà Nội",
                "district": "Hoàn Kiếm",
                "ward": "Phường Hàng Bạc",
                "source": website_source,
                "rating": hot_rating,
                "membership_tier": gold_tier,
                "description": "Khách hàng tiềm năng cao",
            },
            {
                "customer_code": "CUST003",
                "full_name": "Trần Thái Sơn",
                "email": "sonthai@email.com",
                "phone": "0908123458",
                "customer_type": individual_type,
                "gender": "M",
                "date_of_birth": "1988-03-10",
                "identity_number": "123456789014",
                "address": "78 Lê Lợi, Đà Nẵng",
                "country": "Việt Nam",
                "province": "Đà Nẵng",
                "district": "Hải Châu",
                "ward": "Phường Thạch Thang",
                "source": website_source,
                "description": "Khách hàng mới",
            },
            {
                "customer_code": "CUST004",
                "full_name": "Phạm Minh Tuấn - Công ty ABC",
                "email": "minhtuan@abc.com",
                "phone": "0908123459",
                "customer_type": company_type,
                "company": comp001,
                "address": "123 Nguyễn Huệ, TP. HCM",
                "country": "Việt Nam",
                "province": "TP. Hồ Chí Minh",
                "district": "Quận 1",
                "ward": "Phường Bến Nghé",
                "source": website_source,
                "rating": hot_rating,
                "membership_tier": gold_tier,
                "description": "Liên hệ công ty",
            },
            {
                "customer_code": "CUST005",
                "full_name": "Đỗ Quang Minh",
                "email": "quangminh@email.com",
                "phone": "0908123460",
                "customer_type": individual_type,
                "gender": "M",
                "date_of_birth": "1992-12-25",
                "identity_number": "123456789015",
                "address": "101 Lý Tự Trọng, TP. HCM",
                "country": "Việt Nam",
                "province": "TP. Hồ Chí Minh",
                "district": "Quận 5",
                "ward": "Phường 1",
                "source": website_source,
                "description": "Khách hàng trung bình",
            },
        ]

        for cust in customers:
            Customer.objects.update_or_create(
                customer_code=cust["customer_code"],
                defaults={
                    "full_name": cust["full_name"],
                    "email": cust.get("email"),
                    "phone": cust.get("phone"),
                    "customer_type": cust["customer_type"],
                    "gender": cust.get("gender"),
                    "date_of_birth": cust.get("date_of_birth"),
                    "identity_number": cust.get("identity_number"),
                    "address": cust.get("address"),
                    "country": cust.get("country"),
                    "province": cust.get("province"),
                    "district": cust.get("district"),
                    "ward": cust.get("ward"),
                    "branch": branch,
                    "company": cust.get("company"),
                    "source": cust.get("source"),
                    "rating": cust.get("rating"),
                    "membership_tier": cust.get("membership_tier"),
                    "description": cust.get("description"),
                    "status": "ACTIVE",
                    "created_by_user": creator_user,
                },
            )

        self.stdout.write(f"Created {len(customers)} customers")
