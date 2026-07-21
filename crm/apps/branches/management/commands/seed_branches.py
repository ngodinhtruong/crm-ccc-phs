from django.core.management.base import BaseCommand
from django.db import transaction

from apps.branches.models import (
    Branch,
    Employee,
    ProcessingUnit,
    ProcessingUnitMember,
)


class Command(BaseCommand):
    help = "Seed branches and employees"

    BRANCHS = [
        {
            "code": "HS_Q7",
            "name": "Hội sở Quận 7",
            "address": "Quận 7, TP.HCM",
        },
        {
            "code": "CN_Q1",
            "name": "Chi nhánh Quận 1",
            "address": "Quận 1, TP.HCM",
        },
        {
            "code": "CN_Q3",
            "name": "Chi nhánh Quận 3",
            "address": "Quận 3, TP.HCM",
        },
        {
            "code": "CN_TB",
            "name": "Chi nhánh Tân Bình",
            "address": "Quận Tân Bình, TP.HCM",
        },
        {
            "code": "CN_TX",
            "name": "Chi nhánh Thanh Xuân",
            "address": "Thanh Xuân, Hà Nội",
        },
        {
            "code": "CN_HN",
            "name": "Chi nhánh Hà Nội",
            "address": "Cầu Giấy, Hà Nội",
        },
        {
            "code": "CN_HP",
            "name": "Chi nhánh Hải Phòng",
            "address": "Lê Chân, Hải Phòng",
        },
    ]

    POSITIONS = [
        "Manager",
        "Supervisor",
        "Staff",
        "Staff",
        "Staff",
    ]

    DEPARTMENT = "CCC"

    @transaction.atomic
    def handle(self, *args, **options):

        self.stdout.write("Seeding branches...")

        processing_unit = None

        for branch_data in self.BRANCHS:

            branch, _ = Branch.objects.get_or_create(
                branch_code=branch_data["code"],
                defaults={
                    "branch_name": branch_data["name"],
                    "address": branch_data["address"],
                    "status": "ACTIVE",
                },
            )

            if processing_unit is None:
                processing_unit, _ = ProcessingUnit.objects.get_or_create(
                    unit_code="CCC",
                    defaults={
                        "unit_name": "Trung tâm Chăm sóc khách hàng",
                        "default_branch": branch,
                        "is_active": True,
                    },
                )

            for i in range(5):

                employee_code = (
                    f"{branch.branch_code}-EMP-{i+1:03}"
                )

                employee, _ = Employee.objects.get_or_create(
                    employee_code=employee_code,
                    defaults={
                        "full_name": f"Nhân viên {branch.branch_name} {i+1}",
                        "email": employee_code.lower().replace("-", "") + "@phs.vn",
                        "phone": f"090000{i+1:04}",
                        "branch": branch,
                        "department": self.DEPARTMENT,
                        "position": self.POSITIONS[i],
                        "status": "ACTIVE",
                    },
                )

                role = "STAFF"

                if i == 0:
                    role = "HEAD"
                elif i == 1:
                    role = "SUPERVISOR"

                ProcessingUnitMember.objects.get_or_create(
                    processing_unit=processing_unit,
                    employee=employee,
                    defaults={
                        "unit_role": role,
                        "is_active": True,
                    },
                )

        self.stdout.write(
            self.style.SUCCESS(
                "Done seeding branches, employees and processing unit."
            )
        )