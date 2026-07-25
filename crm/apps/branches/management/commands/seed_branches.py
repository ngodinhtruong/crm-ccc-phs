from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.branches.models import (
    Branch,
    Employee,
    EmployeeOrganizationMembership,
    OrganizationUnit,
    OrganizationUnitType,
)


class Command(BaseCommand):
    help = "Seed chi nhánh, cây đơn vị tổ chức và nhân viên mẫu."

    BRANCHES = [
        ("HS_Q7", "Hội sở Quận 7", "Quận 7, TP.HCM"),
        ("CN_Q1", "Chi nhánh Quận 1", "Quận 1, TP.HCM"),
        ("CN_Q3", "Chi nhánh Quận 3", "Quận 3, TP.HCM"),
        ("CN_TB", "Chi nhánh Tân Bình", "Quận Tân Bình, TP.HCM"),
        ("CN_TX", "Chi nhánh Thanh Xuân", "Thanh Xuân, Hà Nội"),
        ("CN_HN", "Chi nhánh Hà Nội", "Cầu Giấy, Hà Nội"),
        ("CN_HP", "Chi nhánh Hải Phòng", "Lê Chân, Hải Phòng"),
    ]

    @transaction.atomic
    def handle(self, *args, **options):
        root, _ = OrganizationUnit.objects.update_or_create(
            unit_code="PHS",
            defaults={
                "unit_name": "Công ty Cổ phần Chứng khoán Phú Hưng",
                "unit_type": OrganizationUnitType.COMPANY,
                "parent": None,
                "branch": None,
                "is_ticket_assignable": False,
                "is_active": True,
                "sort_order": 0,
            },
        )
        ccc_root, _ = OrganizationUnit.objects.update_or_create(
            unit_code="CCC",
            defaults={
                "unit_name": "Customer Care Center",
                "unit_type": OrganizationUnitType.CENTER,
                "parent": root,
                "branch": None,
                "is_ticket_assignable": True,
                "is_active": True,
                "sort_order": 10,
            },
        )
        sa_root, _ = OrganizationUnit.objects.update_or_create(
            unit_code="SALE_ADMIN",
            defaults={
                "unit_name": "Sale Admin",
                "unit_type": OrganizationUnitType.DEPARTMENT,
                "parent": root,
                "branch": None,
                "is_ticket_assignable": True,
                "is_active": True,
                "sort_order": 20,
            },
        )

        for branch_code, branch_name, address in self.BRANCHES:
            branch, _ = Branch.objects.update_or_create(
                branch_code=branch_code,
                defaults={
                    "branch_name": branch_name,
                    "address": address,
                    "status": "ACTIVE",
                },
            )
            ccc_unit, _ = OrganizationUnit.objects.update_or_create(
                unit_code=f"CCC_{branch_code}",
                defaults={
                    "unit_name": f"CCC - {branch_name}",
                    "unit_type": OrganizationUnitType.TEAM,
                    "parent": ccc_root,
                    "branch": branch,
                    "is_ticket_assignable": True,
                    "is_active": True,
                    "sort_order": 10,
                },
            )
            OrganizationUnit.objects.update_or_create(
                unit_code=f"SALE_ADMIN_{branch_code}",
                defaults={
                    "unit_name": f"Sale Admin - {branch_name}",
                    "unit_type": OrganizationUnitType.TEAM,
                    "parent": sa_root,
                    "branch": branch,
                    "is_ticket_assignable": True,
                    "is_active": True,
                    "sort_order": 20,
                },
            )

            for index, position in enumerate(["Manager", "Supervisor", "Staff", "Staff", "Staff"], 1):
                employee_code = f"{branch_code}-EMP-{index:03}"
                employee, _ = Employee.objects.update_or_create(
                    employee_code=employee_code,
                    defaults={
                        "full_name": f"Nhân viên {branch_name} {index}",
                        "email": employee_code.lower().replace("-", "") + "@phs.vn",
                        "phone": f"090000{index:04}",
                        "branch": branch,
                        "position": position,
                        "status": "ACTIVE",
                    },
                )
                responsibility = "HEAD" if index == 1 else ("SUPERVISOR" if index == 2 else "STAFF")
                EmployeeOrganizationMembership.objects.filter(
                    employee=employee,
                    is_active=True,
                    is_primary=True,
                ).exclude(organization_unit=ccc_unit).update(is_primary=False)

                EmployeeOrganizationMembership.objects.update_or_create(
                    employee=employee,
                    organization_unit=ccc_unit,
                    defaults={
                        "responsibility": responsibility,
                        "is_primary": True,
                        "is_active": True,
                        "joined_at": timezone.now(),
                        "left_at": None,
                    },
                )

        self.stdout.write(self.style.SUCCESS("Đã seed chi nhánh và cây đơn vị tổ chức."))
