from django.core.management.base import BaseCommand
from django.db import transaction

from apps.sale_admin.models import (
    SaCallResult,
    SaIcpGroup,
    SaIcpRule,
    SaInterestLevel,
)


CALL_RESULTS = [
    (
        "ANSWERED",
        "Nghe máy – trao đổi",
        1,
    ),
    (
        "NO_ANSWER",
        "Không nghe máy / không bắt máy",
        2,
    ),
    (
        "INVALID_PHONE",
        "Thuê bao / số không tồn tại",
        3,
    ),
    (
        "NO_CONTACT_INFO",
        "Không có thông tin liên hệ",
        4,
    ),
    (
        "DIRECT",
        "Trực tiếp",
        5,
    ),
]


INTEREST_LEVELS = [
    (
        "VERY_INTERESTED",
        "Rất quan tâm – muốn giao dịch ngay",
        4,
        1,
    ),
    (
        "INTERESTED",
        "Quan tâm – cần follow thêm",
        3,
        2,
    ),
    (
        "NO_CURRENT_NEED",
        "Nghe nhưng chưa có nhu cầu",
        2,
        3,
    ),
    (
        "NOT_INTERESTED",
        "Không quan tâm",
        1,
        4,
    ),
]


ICP_GROUPS = [
    {
        "icp_code": "A",
        "icp_name": "Rất tiềm năng",
        "icp_type": SaIcpGroup.TYPE_POTENTIAL,
        "description": (
            "Khách hàng có mức độ quan tâm cao, "
            "có khả năng giao dịch trong thời gian gần."
        ),
        "follow_up_days": 1,
        "is_potential": True,
        "sort_order": 1,
    },
    {
        "icp_code": "B",
        "icp_name": "Tiềm năng",
        "icp_type": SaIcpGroup.TYPE_POTENTIAL,
        "description": (
            "Khách hàng có nhu cầu hoặc quan tâm, "
            "cần tiếp tục theo dõi và tư vấn."
        ),
        "follow_up_days": 3,
        "is_potential": True,
        "sort_order": 2,
    },
    {
        "icp_code": "C",
        "icp_name": "Nuôi dưỡng",
        "icp_type": SaIcpGroup.TYPE_NURTURE,
        "description": (
            "Khách hàng đã nghe tư vấn nhưng hiện tại "
            "chưa phát sinh nhu cầu rõ ràng."
        ),
        "follow_up_days": 7,
        "is_potential": True,
        "sort_order": 3,
    },
    {
        "icp_code": "D",
        "icp_name": "Không tiềm năng",
        "icp_type": SaIcpGroup.TYPE_NON_POTENTIAL,
        "description": (
            "Khách hàng không quan tâm hoặc không có "
            "khả năng phát sinh giao dịch."
        ),
        "follow_up_days": None,
        "is_potential": False,
        "sort_order": 4,
    },
    {
        "icp_code": "E",
        "icp_name": "Không nghe máy",
        "icp_type": SaIcpGroup.TYPE_INVALID,
        "description": (
            "Đã thực hiện cuộc gọi nhưng khách hàng "
            "không nghe máy hoặc không bắt máy."
        ),
        "follow_up_days": 1,
        "is_potential": False,
        "sort_order": 5,
    },
    {
        "icp_code": "F",
        "icp_name": "SĐT không hợp lệ",
        "icp_type": SaIcpGroup.TYPE_INVALID,
        "description": (
            "Số điện thoại không tồn tại, không đúng "
            "định dạng hoặc không thể liên lạc."
        ),
        "follow_up_days": None,
        "is_potential": False,
        "sort_order": 6,
    },
    {
        "icp_code": "G",
        "icp_name": "Không có SĐT",
        "icp_type": SaIcpGroup.TYPE_INVALID,
        "description": (
            "Hồ sơ khách hàng không có thông tin "
            "số điện thoại để thực hiện cuộc gọi."
        ),
        "follow_up_days": None,
        "is_potential": False,
        "sort_order": 7,
    },
    {
        "icp_code": "H",
        "icp_name": "Tài khoản ảo",
        "icp_type": SaIcpGroup.TYPE_INVALID,
        "description": (
            "Tài khoản không có thông tin khách hàng "
            "hợp lệ hoặc được xác định là tài khoản ảo."
        ),
        "follow_up_days": None,
        "is_potential": False,
        "sort_order": 8,
    },
]


DEFAULT_ICP_RULES = [
    ("ANSWERED", "VERY_INTERESTED", "A", 1, "Nghe máy – trao đổi + Rất quan tâm -> A – Rất tiềm năng"),
    ("DIRECT", "VERY_INTERESTED", "A", 2, "Trực tiếp + Rất quan tâm -> A – Rất tiềm năng"),
    ("ANSWERED", "INTERESTED", "B", 3, "Nghe máy – trao đổi + Quan tâm -> B – Tiềm năng"),
    ("DIRECT", "INTERESTED", "B", 4, "Trực tiếp + Quan tâm -> B – Tiềm năng"),
    ("ANSWERED", "NO_CURRENT_NEED", "C", 5, "Nghe máy – trao đổi + Chưa có nhu cầu -> C – Nuôi dưỡng"),
    ("DIRECT", "NO_CURRENT_NEED", "C", 6, "Trực tiếp + Chưa có nhu cầu -> C – Nuôi dưỡng"),
    ("ANSWERED", "NOT_INTERESTED", "D", 7, "Nghe máy – trao đổi + Không quan tâm -> D – Không tiềm năng"),
    ("DIRECT", "NOT_INTERESTED", "D", 8, "Trực tiếp + Không quan tâm -> D – Không tiềm năng"),
    ("NO_ANSWER", None, "E", 9, "Không nghe máy / không bắt máy -> E – Không nghe máy"),
    ("INVALID_PHONE", None, "F", 10, "Thuê bao / số không tồn tại -> F – SĐT không hợp lệ"),
    ("NO_CONTACT_INFO", None, "H", 11, "Không có thông tin liên hệ -> H – Tài khoản ảo"),
]


class Command(BaseCommand):
    help = (
        "Seed danh mục Sale Admin gồm kết quả cuộc gọi, "
        "mức độ quan tâm và nhóm khách hàng ICP"
    )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Bat dau seed danh muc Sale Admin...")

        self.seed_call_results()
        self.seed_interest_levels()
        self.seed_icp_groups()
        self.seed_icp_rules()

        self.stdout.write(
            self.style.SUCCESS("Seed danh muc Sale Admin thanh cong.")
        )

    def seed_call_results(self):
        self.stdout.write("\nSeed ket qua cuoc goi...")

        for code, name, sort_order in CALL_RESULTS:
            obj, created = SaCallResult.objects.update_or_create(
                result_code=code,
                defaults={
                    "result_name": name,
                    "is_active": True,
                    "sort_order": sort_order,
                },
            )

            self.print_result("Ket qua cuoc goi", obj.result_code, created)

    def seed_interest_levels(self):
        self.stdout.write("\nSeed muc do quan tam...")

        for code, name, score, sort_order in INTEREST_LEVELS:
            obj, created = (
                SaInterestLevel.objects.update_or_create(
                    level_code=code,
                    defaults={
                        "level_name": name,
                        "score": score,
                        "is_active": True,
                        "sort_order": sort_order,
                    },
                )
            )

            self.print_result("Muc do quan tam", obj.level_code, created)

    def seed_icp_groups(self):
        self.stdout.write("\nSeed nhom khach hang ICP...")

        for item in ICP_GROUPS:
            obj, created = SaIcpGroup.objects.update_or_create(
                icp_code=item["icp_code"],
                defaults={
                    "icp_name": item["icp_name"],
                    "icp_type": item["icp_type"],
                    "description": item["description"],
                    "follow_up_days": item["follow_up_days"],
                    "is_potential": item["is_potential"],
                    "is_active": True,
                    "sort_order": item["sort_order"],
                },
            )

            self.print_result("Nhom ICP", obj.icp_code, created)

    def seed_icp_rules(self):
        self.stdout.write("\nSeed quy tac gan ICP tu dong...")

        for cr_code, il_code, icp_code, priority, desc in DEFAULT_ICP_RULES:
            call_result = SaCallResult.objects.filter(result_code=cr_code).first()
            interest_level = SaInterestLevel.objects.filter(level_code=il_code).first() if il_code else None
            icp_group = SaIcpGroup.objects.filter(icp_code=icp_code).first()

            if not icp_group:
                continue

            obj, created = SaIcpRule.objects.update_or_create(
                call_result=call_result,
                interest_level=interest_level,
                defaults={
                    "icp_group": icp_group,
                    "priority": priority,
                    "is_active": True,
                    "description": desc,
                },
            )

            self.print_result("Quy tac ICP", f"Rule {priority}", created)

    def print_result(self, group, name, created):
        action = "Tao moi" if created else "Cap nhat"
        self.stdout.write(f"[{group}] {action}: {name}")